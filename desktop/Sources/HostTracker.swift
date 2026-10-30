import AppKit
import ApplicationServices
import CoreGraphics

protocol HostTrackerDelegate: AnyObject {
    func hostTracker(didUpdate frame: NSRect, name: String)
    func hostTrackerDidLoseHost()
}

final class HostTracker {
    weak var delegate: HostTrackerDelegate?
    var isEnabled = true
    private var timer: Timer?
    private var resizedHost: (element: AXUIElement, originalSize: CGSize, pid: pid_t)?
    private var lastHostPID: pid_t?

    private struct WindowSnapshot {
        let pid: pid_t
        let app: NSRunningApplication
        let frame: NSRect
    }

    private struct HostWindow {
        let app: NSRunningApplication
        let frame: NSRect
    }

    private let excludedBundleIDs: Set<String> = [
        "com.apple.finder",
        "com.apple.dock",
        "com.apple.loginwindow",
        "com.apple.systemuiserver",
        "com.apple.controlcenter",
        "com.apple.notificationcenterui",
        "com.novabox.desktop"
    ]

    func start() {
        timer?.invalidate()
        let next = Timer(timeInterval: 0.4, repeats: true) { [weak self] _ in
            self?.tick()
        }
        RunLoop.main.add(next, forMode: .common)
        timer = next
        tick()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        restoreResizedHost()
    }

    /// Optional enhancement only: when the host fills the usable width, AX lets
    /// us shrink the host instead of overlaying it. Normal docking never needs it.
    func requestPermission() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(options)
    }

    private func tick() {
        guard isEnabled else { return }
        guard let target = hostWindow() else {
            delegate?.hostTrackerDidLoseHost()
            return
        }
        if let resized = resizedHost, resized.pid != target.app.processIdentifier {
            restoreResizedHost()
        }
        let follow = followFrame(for: target.frame, app: target.app)
        delegate?.hostTracker(didUpdate: follow, name: target.app.localizedName ?? "宿主窗口")
    }

    // MARK: - Host selection (no Accessibility required)

    private func hostWindow() -> HostWindow? {
        let windows = visibleWindows()
        let front = NSWorkspace.shared.frontmostApplication

        // Switching to another coding host is an explicit host change.
        if let front,
           front.activationPolicy == .regular,
           front.processIdentifier != getpid(),
           !front.isTerminated,
           isCodingHost(front),
           let window = bestWindow(for: front.processIdentifier, in: windows) {
            lastHostPID = front.processIdentifier
            return HostWindow(app: front, frame: window.frame)
        }

        // Stay with the last host even when Chrome, Finder, or the panel itself
        // is frontmost. Do not jump to an unrelated full-width window.
        if let pid = lastHostPID {
            guard let app = NSRunningApplication(processIdentifier: pid), !app.isTerminated else {
                lastHostPID = nil
                return firstHost(in: windows)
            }
            if let window = bestWindow(for: pid, in: windows) {
                return HostWindow(app: app, frame: window.frame)
            }
            // Host still exists but is minimized or on another Space. Wait for
            // it instead of attaching to an unrelated app.
            return nil
        }

        return firstHost(in: windows)
    }

    private func firstHost(in windows: [WindowSnapshot]) -> HostWindow? {
        for window in windows where isCodingHost(window.app) {
            if let best = bestWindow(for: window.pid, in: windows) {
                lastHostPID = best.pid
                return HostWindow(app: best.app, frame: best.frame)
            }
        }
        guard let first = windows.first,
              let best = bestWindow(for: first.pid, in: windows) else {
            return nil
        }
        lastHostPID = best.pid
        return HostWindow(app: best.app, frame: best.frame)
    }

    private func visibleWindows() -> [WindowSnapshot] {
        guard let list = CGWindowListCopyWindowInfo(
            [.optionOnScreenOnly, .excludeDesktopElements],
            kCGNullWindowID
        ) as? [[String: Any]] else {
            return []
        }

        var result: [WindowSnapshot] = []
        for info in list {
            guard let layer = info[kCGWindowLayer as String] as? Int, layer == 0,
                  let alpha = info[kCGWindowAlpha as String] as? Double, alpha > 0.1,
                  let pid = info[kCGWindowOwnerPID as String] as? pid_t, pid != getpid(),
                  let app = NSRunningApplication(processIdentifier: pid),
                  app.activationPolicy == .regular,
                  !app.isTerminated,
                  !excludedBundleIDs.contains(app.bundleIdentifier ?? ""),
                  let boundsDict = info[kCGWindowBounds as String] as? NSDictionary,
                  let bounds = CGRect(dictionaryRepresentation: boundsDict),
                  bounds.width >= 160, bounds.height >= 120 else {
                continue
            }
            let frame = appKitFrame(fromCG: bounds)
            result.append(WindowSnapshot(
                pid: pid,
                app: app,
                frame: frame
            ))
        }
        return result
    }

    private func bestWindow(for pid: pid_t, in windows: [WindowSnapshot]) -> WindowSnapshot? {
        // CGWindowListCopyWindowInfo is front-to-back. Prefer the app's
        // frontmost real window so a small main window still docks correctly.
        return windows.first { $0.pid == pid }
    }

    // MARK: - Geometry

    /// CGWindowBounds is top-left based; NSWindow.setFrame is bottom-left based.
    private func appKitFrame(fromCG bounds: CGRect) -> NSRect {
        let point = CGPoint(x: bounds.minX, y: bounds.minY)
        guard let info = screen(forCGPoint: point) else {
            let maxY = NSScreen.screens.first?.frame.maxY ?? 0
            return NSRect(x: bounds.minX, y: maxY - bounds.minY - bounds.height,
                          width: bounds.width, height: bounds.height)
        }
        let x = info.screen.frame.minX + (bounds.minX - info.cgBounds.minX)
        let y = info.screen.frame.maxY - (bounds.minY - info.cgBounds.minY) - bounds.height
        return NSRect(x: x, y: y, width: bounds.width, height: bounds.height)
    }

    private func screen(forCGPoint point: CGPoint) -> (screen: NSScreen, cgBounds: CGRect)? {
        for screen in NSScreen.screens {
            guard let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else {
                continue
            }
            let displayID = CGDirectDisplayID(number.uint32Value)
            let cgBounds = CGDisplayBounds(displayID)
            if cgBounds.contains(point) {
                return (screen, cgBounds)
            }
        }
        return nil
    }

    private func followFrame(for host: NSRect, app: NSRunningApplication) -> NSRect {
        let screen = NSScreen.screens.first(where: { $0.frame.intersects(host) }) ?? NSScreen.main!
        let visible = screen.visibleFrame
        let width = min(max(440, visible.width * 0.26), 480)
        let gap: CGFloat = 8
        var hostFrame = host
        var x: CGFloat

        let rightX = hostFrame.maxX + gap
        let leftX = hostFrame.minX - gap - width
        let available = visible.maxX - width - gap - hostFrame.minX

        if rightX + width <= visible.maxX {
            // Any host width: sit immediately to its right.
            x = rightX
        } else if leftX >= visible.minX {
            // Right side is off-screen, but there is room on the left.
            x = leftX
        } else if isCodingHost(app), AXIsProcessTrusted(), available >= 720,
                  let element = windowInfo(for: app, preferredFrame: hostFrame)?.element,
                  resizeWindow(element, from: hostFrame.size, toWidth: available, pid: app.processIdentifier) {
            // Optional AX enhancement: coding host fills the usable width, so
            // shrink it by the panel width and stay adjacent on the right.
            if let updated = frame(of: element) {
                hostFrame = updated
            } else {
                hostFrame.size.width = available
            }
            x = hostFrame.maxX + gap
        } else {
            // No Accessibility permission (or no safe resize): keep following
            // the host by floating at the screen edge.
            x = visible.maxX - width
        }

        var y = hostFrame.minY
        var height = hostFrame.height
        if height > visible.height {
            height = visible.height
            y = visible.minY
        }
        if y < visible.minY { y = visible.minY }
        if y + height > visible.maxY { y = visible.maxY - height }
        return NSRect(x: x.rounded(), y: y.rounded(), width: width.rounded(), height: height.rounded())
    }

    private func isCodingHost(_ app: NSRunningApplication) -> Bool {
        let id = (app.bundleIdentifier ?? "").lowercased()
        let name = (app.localizedName ?? "").lowercased()
        return id.contains("openai") || id.contains("anthropic")
            || name.contains("codex") || name.contains("chatgpt") || name.contains("claude")
    }

    // MARK: - Optional AX helpers (only used when permission already exists)

    private func windowInfo(for app: NSRunningApplication, preferredFrame: NSRect) -> (element: AXUIElement, frame: NSRect)? {
        let element = AXUIElementCreateApplication(app.processIdentifier)

        func validFrame(_ window: AXUIElement) -> NSRect? {
            var minimizedRef: CFTypeRef?
            if AXUIElementCopyAttributeValue(window, kAXMinimizedAttribute as CFString, &minimizedRef) == .success,
               let minimized = minimizedRef as? Bool, minimized {
                return nil
            }
            guard let frame = frame(of: window), frame.width >= 320, frame.height >= 220 else {
                return nil
            }
            return frame
        }

        func score(_ frame: NSRect) -> CGFloat {
            return abs(frame.minX - preferredFrame.minX) + abs(frame.minY - preferredFrame.minY)
                + abs(frame.width - preferredFrame.width) + abs(frame.height - preferredFrame.height)
        }

        for attribute in [kAXFocusedWindowAttribute, kAXMainWindowAttribute] {
            guard let window = windowAttribute(element, attribute) else { continue }
            guard let frame = validFrame(window), score(frame) <= 12 else { continue }
            return (window, frame)
        }

        var windowsRef: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXWindowsAttribute as CFString, &windowsRef) == .success,
              let windows = windowsRef as? [AXUIElement] else {
            return nil
        }
        var best: (element: AXUIElement, frame: NSRect, score: CGFloat)?
        for window in windows {
            guard let frame = validFrame(window) else { continue }
            let delta = score(frame)
            if best == nil || delta < best!.score {
                best = (window, frame, delta)
            }
        }
        guard let result = best, result.score <= 24 else { return nil }
        return (result.element, result.frame)
    }

    private func windowAttribute(_ element: AXUIElement, _ attribute: String) -> AXUIElement? {
        var ref: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, attribute as CFString, &ref) == .success,
              let value = ref,
              CFGetTypeID(value) == AXUIElementGetTypeID() else {
            return nil
        }
        return (value as! AXUIElement)
    }

    private func frame(of element: AXUIElement) -> NSRect? {
        var positionRef: CFTypeRef?
        var sizeRef: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXPositionAttribute as CFString, &positionRef) == .success,
              AXUIElementCopyAttributeValue(element, kAXSizeAttribute as CFString, &sizeRef) == .success,
              positionRef != nil, sizeRef != nil else {
            return nil
        }
        let positionValue = positionRef as! AXValue
        let sizeValue = sizeRef as! AXValue
        var point = CGPoint.zero
        var size = CGSize.zero
        AXValueGetValue(positionValue, .cgPoint, &point)
        AXValueGetValue(sizeValue, .cgSize, &size)
        guard size.width > 0, size.height > 0 else { return nil }
        return appKitFrame(fromCG: CGRect(origin: point, size: size))
    }

    private func resizeWindow(_ element: AXUIElement, from original: CGSize, toWidth width: CGFloat, pid: pid_t) -> Bool {
        var size = original
        size.width = width
        guard let value = AXValueCreate(.cgSize, &size) else { return false }
        guard AXUIElementSetAttributeValue(element, kAXSizeAttribute as CFString, value) == .success else {
            return false
        }
        if resizedHost == nil {
            resizedHost = (element, original, pid)
        }
        return true
    }

    private func restoreResizedHost() {
        guard let resized = resizedHost else { return }
        var size = resized.originalSize
        if let value = AXValueCreate(.cgSize, &size) {
            _ = AXUIElementSetAttributeValue(resized.element, kAXSizeAttribute as CFString, value)
        }
        resizedHost = nil
    }
}
