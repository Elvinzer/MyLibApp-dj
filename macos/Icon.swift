import AppKit
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
NSColor(calibratedRed: 0.369, green: 0.878, blue: 0.690, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 48, y: 48, width: 928, height: 928), xRadius: 215, yRadius: 215).fill()
let line = NSBezierPath()
line.move(to: NSPoint(x: 190, y: 510))
line.line(to: NSPoint(x: 345, y: 510))
line.line(to: NSPoint(x: 435, y: 755))
line.line(to: NSPoint(x: 580, y: 265))
line.line(to: NSPoint(x: 685, y: 510))
line.line(to: NSPoint(x: 835, y: 510))
line.lineWidth = 44
line.lineCapStyle = .round
line.lineJoinStyle = .round
NSColor(calibratedRed: 0.063, green: 0.137, blue: 0.102, alpha: 1).setStroke()
line.stroke()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
