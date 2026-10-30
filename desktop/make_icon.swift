import AppKit

let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon_1024.png"
let pixels = 1024
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: pixels,
    pixelsHigh: pixels,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else { exit(1) }

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
let canvas = NSRect(x: 0, y: 0, width: pixels, height: pixels)

let outer = NSBezierPath(roundedRect: canvas.insetBy(dx: 64, dy: 64), xRadius: 210, yRadius: 210)
let gradient = NSGradient(colors: [
    NSColor(calibratedRed: 0.04, green: 0.55, blue: 0.40, alpha: 1),
    NSColor(calibratedRed: 0.18, green: 0.82, blue: 0.60, alpha: 1),
    NSColor(calibratedRed: 1.00, green: 0.45, blue: 0.35, alpha: 1)
])!
gradient.draw(in: outer, angle: -35)

let inner = NSBezierPath(roundedRect: canvas.insetBy(dx: 122, dy: 122), xRadius: 162, yRadius: 162)
NSColor(calibratedWhite: 1.0, alpha: 0.985).setFill()
inner.fill()

let ink = NSColor(calibratedRed: 0.035, green: 0.37, blue: 0.28, alpha: 1)
ink.setFill()
NSBezierPath(roundedRect: NSRect(x: 322, y: 286, width: 92, height: 452), xRadius: 26, yRadius: 26).fill()

let mark = NSBezierPath()
mark.move(to: NSPoint(x: 454, y: 738))
mark.line(to: NSPoint(x: 616, y: 738))
mark.line(to: NSPoint(x: 742, y: 512))
mark.line(to: NSPoint(x: 616, y: 286))
mark.line(to: NSPoint(x: 454, y: 286))
mark.line(to: NSPoint(x: 580, y: 512))
mark.close()
mark.fill()

NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: output))
