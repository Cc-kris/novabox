import AppKit
import WebKit
import ApplicationServices

final class NovaboxWindow: NSWindow {
    // 无边框窗口默认不能成为 key/main，网页输入和按钮都会失效。
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate,
    WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, HostTrackerDelegate {

    private var window: NSWindow!
    private var webView: WKWebView!
    private let server = ServerManager()
    private let hostTracker = HostTracker()
    private var followHost = true
    private var followMenuItem: NSMenuItem?
    private var hostStatusItem: NSMenuItem?
    private var statusLogURL: URL!

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        prepareStatusLog()
        hostTracker.delegate = self
        createWindow()
        showLoading()

        do {
            try server.prepare()
            try server.start()
            loadWorkbench()
        } catch {
            showFatal(error)
        }

        hostTracker.start()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ notification: Notification) {
        hostTracker.stop()
        server.stop()
    }

    private func prepareStatusLog() {
        let fm = FileManager.default
        guard let logs = try? fm.url(for: .libraryDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("Logs/Novabox", isDirectory: true) else { return }
        try? fm.createDirectory(at: logs, withIntermediateDirectories: true)
        statusLogURL = logs.appendingPathComponent("ui-state.jsonl")
        if !fm.fileExists(atPath: statusLogURL.path) {
            fm.createFile(atPath: statusLogURL.path, contents: nil)
        }
    }

    private func createWindow() {
        window = NovaboxWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1180, height: 820),
            styleMask: [.borderless, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Novabox"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        // 页面始终是浅色；强制窗口也用浅色外观，避免深色系统下原生窗框形成一圈黑边。
        window.appearance = NSAppearance(named: .aqua)
        window.isMovableByWindowBackground = true
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = true
        window.minSize = NSSize(width: 480, height: 560)
        window.delegate = self
        window.collectionBehavior.insert(.fullScreenPrimary)
        window.center()
        window.setFrameAutosaveName("NovaboxMainWindow")

        let controller = WKUserContentController()
        controller.add(self, name: "novaboxState")
        controller.add(self, name: "novaboxReveal")
        controller.addUserScript(WKUserScript(
            source: """
            (function () {
              function mark() {
                if (document.documentElement) {
                  document.documentElement.classList.add('novabox-desktop');
                }
              }
              try { mark(); } catch (e) {}
              document.addEventListener('DOMContentLoaded', mark, { once: true });
            })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()

        let container = NSView(frame: window.contentView?.bounds ?? NSRect(x: 0, y: 0, width: 480, height: 899))
        container.autoresizingMask = [.width, .height]
        container.wantsLayer = true
        container.layer?.cornerRadius = 18
        container.layer?.masksToBounds = true
        container.layer?.backgroundColor = NSColor.clear.cgColor
        let web = WKWebView(frame: container.bounds, configuration: configuration)
        web.autoresizingMask = [.width, .height]
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsMagnification = true
        if #available(macOS 12.0, *) {
            web.underPageBackgroundColor = NSColor(calibratedRed: 0.95, green: 0.97, blue: 0.95, alpha: 1)
        }
        webView = web
        container.addSubview(web)
        window.contentView = container
        window.invalidateShadow()
        addTrafficLights(to: container)
        let buttons = container.subviews.compactMap { $0 as? NSButton }
        let frames = buttons.map { NSStringFromRect($0.frame) }.joined(separator: " | ")
        NSLog("%@", "NOVABOX_RUNTIME borderless=\(window.styleMask.contains(.borderless)) style=\(window.styleMask.rawValue) buttons=\(buttons.count) frames=\(frames)")
        window.makeKeyAndOrderFront(nil)
    }

    private func addTrafficLights(to view: NSView) {
        let size: CGFloat = 14
        let gap: CGFloat = 9
        let colors: [NSColor] = [
            NSColor(calibratedRed: 1.00, green: 0.37, blue: 0.34, alpha: 1),
            NSColor(calibratedRed: 1.00, green: 0.74, blue: 0.18, alpha: 1),
            NSColor(calibratedRed: 0.16, green: 0.79, blue: 0.25, alpha: 1),
        ]
        let actions: [Selector] = [
            #selector(closeWindowAction),
            #selector(miniaturizeWindowAction),
            #selector(zoomWindowAction),
        ]
        let tips = ["关闭", "最小化", "缩放"]
        for index in 0..<3 {
            let button = NSButton(frame: NSRect(
                x: 9 + CGFloat(index) * (size + gap),
                y: view.bounds.height - size - 9,
                width: size,
                height: size
            ))
            button.isBordered = false
            button.setButtonType(.momentaryPushIn)
            button.title = ""
            button.focusRingType = .none
            button.target = self
            button.action = actions[index]
            button.toolTip = tips[index]
            button.wantsLayer = true
            button.layer?.cornerRadius = size / 2
            button.layer?.backgroundColor = colors[index].cgColor
            button.layer?.borderWidth = 0.5
            button.layer?.borderColor = NSColor.black.withAlphaComponent(0.12).cgColor
            button.autoresizingMask = [.minYMargin, .maxXMargin]
            view.addSubview(button)
        }
    }

    @objc private func closeWindowAction() {
        window.performClose(nil)
    }

    @objc private func miniaturizeWindowAction() {
        window.performMiniaturize(nil)
    }

    @objc private func zoomWindowAction() {
        window.performZoom(nil)
    }

    private func showLoading() {
        let html = """
        <!doctype html><html><head><meta charset="utf-8">
        <style>
        html,body{height:100%;margin:0;background:#f4f7f2;color:#17362c;font:14px -apple-system,BlinkMacSystemFont,sans-serif}
        body{display:grid;place-items:center}
        .box{text-align:center}.mark{width:52px;height:52px;margin:0 auto 16px;border-radius:16px;
        display:grid;place-items:center;background:#0f7a5f;color:#fff;font-weight:800;font-size:25px}
        h1{font-size:22px;margin:0 0 6px}p{margin:0;color:#6a7d73}
        </style></head><body><div class="box"><div class="mark">N</div>
        <h1>Novabox</h1><p>本地工具内核启动中…</p></div></body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    private func loadWorkbench() {
        guard let url = URL(string: "http://127.0.0.1:8787/?desktop=1") else { return }
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        webView.load(request)
    }

    private func showFatal(_ error: Error) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "Novabox 无法启动"
        alert.informativeText = error.localizedDescription
        alert.addButton(withTitle: "退出")
        alert.runModal()
        NSApp.terminate(nil)
    }

    private func buildMenu() {
        let mainMenu = NSMenu()
        NSApp.mainMenu = mainMenu

        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu(title: "Novabox")
        appItem.submenu = appMenu
        add(appMenu, "关于 Novabox", #selector(showAbout))
        appMenu.addItem(.separator())
        add(appMenu, "安装 Codex MCP 配置…", #selector(installCodexMCP))
        add(appMenu, "打开数据目录", #selector(openDataFolder))
        add(appMenu, "打开服务日志", #selector(openServerLog))
        add(appMenu, "打开界面状态日志", #selector(openStateLog))
        appMenu.addItem(.separator())
        let quit = NSMenuItem(title: "退出 Novabox", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        quit.target = NSApp
        appMenu.addItem(quit)

        let editItem = NSMenuItem()
        mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "编辑")
        editItem.submenu = editMenu
        editMenu.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "重做", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(.separator())
        editMenu.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "复制", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        let viewItem = NSMenuItem()
        mainMenu.addItem(viewItem)
        let viewMenu = NSMenu(title: "窗口")
        viewItem.submenu = viewMenu
        let follow = add(viewMenu, "贴靠宿主窗口", #selector(toggleFollow), "t")
        follow.state = .on
        followMenuItem = follow
        add(viewMenu, "切换为独立窗口", #selector(useFloatingWindow))
        viewMenu.addItem(.separator())
        add(viewMenu, "重新载入工作台", #selector(reloadWorkbench), "r")
        add(viewMenu, "辅助功能权限（可选）…", #selector(requestAccessibility))
        hostStatusItem = NSMenuItem(title: "正在寻找宿主窗口", action: nil, keyEquivalent: "")
        hostStatusItem?.isEnabled = false
        viewMenu.addItem(.separator())
        if let hostStatusItem = hostStatusItem { viewMenu.addItem(hostStatusItem) }

        let windowItem = NSMenuItem()
        mainMenu.addItem(windowItem)
        let windowMenu = NSMenu(title: "系统窗口")
        windowItem.submenu = windowMenu
        windowMenu.addItem(withTitle: "最小化", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "缩放", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        NSApp.windowsMenu = windowMenu
    }

    @discardableResult
    private func add(_ menu: NSMenu, _ title: String, _ action: Selector, _ key: String = "") -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.target = self
        menu.addItem(item)
        return item
    }
}

extension AppDelegate {
    @objc private func showAbout() {
        let credits = NSAttributedString(string: "本地工具工作台\nNovabox 1.0.0")
        NSApp.orderFrontStandardAboutPanel(options: [.credits: credits])
    }

    @objc private func installCodexMCP() {
        guard server.dataDir != nil else {
            let alert = NSAlert()
            alert.messageText = "本地内核尚未准备好"
            alert.informativeText = "请等待工作台启动后再安装 Codex MCP 配置。"
            alert.runModal()
            return
        }
        let result = CodexInstaller().install(server: server)
        let alert = NSAlert()
        alert.alertStyle = result.ok ? .informational : .warning
        alert.messageText = result.ok ? "Codex MCP 已安装" : "Codex MCP 安装失败"
        var text = result.message
        if !result.detail.isEmpty {
            text += "\n\n" + String(result.detail.suffix(1400))
        }
        alert.informativeText = text
        alert.addButton(withTitle: "好")
        alert.runModal()
    }

    @objc private func openDataFolder() {
        guard let dir = server.dataDir else { return }
        NSWorkspace.shared.open(dir)
    }

    @objc private func openServerLog() {
        guard let log = server.logURL else { return }
        NSWorkspace.shared.open(log)
    }

    @objc private func openStateLog() {
        guard let log = statusLogURL else { return }
        NSWorkspace.shared.open(log)
    }

    @objc private func toggleFollow() {
        setFollow(followMenuItem?.state != .on)
    }

    @objc private func useFloatingWindow() {
        setFollow(false)
    }

    private func setFollow(_ enabled: Bool) {
        followHost = enabled
        followMenuItem?.state = enabled ? .on : .off
        hostTracker.isEnabled = enabled
        if enabled {
            // Docking itself is CGWindow-based and needs no Accessibility
            // permission. Do not prompt on every rebuild/enable.
            hostStatusItem?.title = "正在寻找宿主窗口"
        } else {
            hostStatusItem?.title = "独立窗口"
        }
    }

    @objc private func requestAccessibility() {
        hostTracker.requestPermission()
        let alert = NSAlert()
        alert.messageText = "辅助功能权限（可选）"
        alert.informativeText = "普通贴靠不需要辅助功能权限。只有希望在宿主窗口过宽时自动缩窄宿主，才需要允许 Novabox；不授权时会改为贴屏幕边缘。"
        alert.addButton(withTitle: "打开系统设置")
        alert.addButton(withTitle: "稍后")
        if alert.runModal() == .alertFirstButtonReturn {
            if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") {
                NSWorkspace.shared.open(url)
            }
        }
    }

    @objc private func reloadWorkbench() {
        loadWorkbench()
    }

    func hostTracker(didUpdate frame: NSRect, name: String) {
        hostStatusItem?.title = "已贴靠：\(name)"
        followLog("tick follow=\(followHost) target=\(frame) current=\(window.frame) min=\(window.minSize)")
        guard followHost else { return }
        var target = frame
        if let screen = NSScreen.screens.first(where: { $0.frame.intersects(target) }) {
            target.size.width = min(target.width, screen.visibleFrame.width)
            target.size.height = min(target.height, screen.visibleFrame.height)
        }
        window.setFrame(target, display: true, animate: false)
        followLog("applied=\(window.frame)")
    }

    func hostTrackerDidLoseHost() {
        followLog("loseHost front=\(NSWorkspace.shared.frontmostApplication?.localizedName ?? "nil")")
        hostStatusItem?.title = followHost ? "等待宿主窗口" : "独立窗口"
    }

    private func followLog(_ message: String) {
        let fm = FileManager.default
        guard let logs = try? fm.url(for: .libraryDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("Logs/Novabox", isDirectory: true) else { return }
        try? fm.createDirectory(at: logs, withIntermediateDirectories: true)
        let url = logs.appendingPathComponent("follow.log")
        if !fm.fileExists(atPath: url.path) {
            fm.createFile(atPath: url.path, contents: nil)
        }
        guard let handle = try? FileHandle(forWritingTo: url) else { return }
        handle.seekToEndOfFile()
        let line = "\(ISO8601DateFormatter().string(from: Date())) \(message)\n"
        if let data = line.data(using: .utf8) { handle.write(data) }
        handle.closeFile()
    }

    private func appendState(_ body: [String: Any]) {
        guard let url = statusLogURL else { return }
        let fm = FileManager.default
        if !fm.fileExists(atPath: url.path) {
            fm.createFile(atPath: url.path, contents: nil)
        }
        guard let handle = try? FileHandle(forWritingTo: url) else { return }
        handle.seekToEndOfFile()
        var record = body
        record["ts"] = ISO8601DateFormatter().string(from: Date())
        if let data = try? JSONSerialization.data(withJSONObject: record, options: [.sortedKeys]) {
            handle.write(data)
            if let newline = "\n".data(using: .utf8) { handle.write(newline) }
        }
        handle.closeFile()
    }
}

extension AppDelegate {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "novaboxReveal" {
            if window.isMiniaturized { window.deminiaturize(nil) }
            window.orderFrontRegardless()
            return
        }
        guard message.name == "novaboxState", let body = message.body as? [String: Any] else { return }
        if let tool = body["toolName"] as? String, !tool.isEmpty {
            window.title = "Novabox · \(tool)"
        } else {
            window.title = "Novabox"
        }
        appendState(body)
    }

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        if url.scheme == "about" || url.host == "127.0.0.1" || url.host == "localhost" {
            decisionHandler(.allow)
        } else {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        appendState(["event": "didFinish"])
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        appendState(["event": "didFail", "message": error.localizedDescription])
    }

    func webView(_ webView: WKWebView,
                 didFailProvisionalNavigation navigation: WKNavigation!,
                 withError error: Error) {
        appendState(["event": "didFailProvisional", "message": error.localizedDescription])
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        appendState(["event": "webContentTerminated"])
        webView.reload()
    }

    func webView(_ webView: WKWebView,
                 runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = "Novabox"
        alert.informativeText = message
        alert.addButton(withTitle: "好")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView,
                 runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = "Novabox"
        alert.informativeText = message
        alert.addButton(withTitle: "确定")
        alert.addButton(withTitle: "取消")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView,
                 runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = "Novabox"
        alert.informativeText = prompt
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 320, height: 24))
        field.stringValue = defaultText ?? ""
        alert.accessoryView = field
        alert.addButton(withTitle: "确定")
        alert.addButton(withTitle: "取消")
        completionHandler(alert.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
    }

    func windowWillClose(_ notification: Notification) {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "novaboxState")
        hostTracker.stop()
    }
}
