import Cocoa
import CoreGraphics
import Foundation
import Vision

struct NovaScreenHelper {
    static func main() {
        let args = CommandLine.arguments
        guard args.count > 1 else {
            printUsage()
            exit(1)
        }

        let command = args[1]
        switch command {
        case "check-permission":
            checkPermission()
        case "request-permission":
            requestPermission()
        case "list-displays":
            listDisplays()
        case "list-windows":
            listWindows()
        case "ocr":
            if args.count > 2 {
                performOCR(imagePath: args[2])
            } else {
                print("[]")
            }
        default:
            printUsage()
            exit(1)
        }
    }

    static func printUsage() {
        let usage = """
        Usage: nova-screen-helper <command> [args]
        Commands:
          check-permission     Check if Screen Recording permission is granted
          request-permission   Prompt system for Screen Recording permission
          list-displays        List active displays
          list-windows         List on-screen application windows
          ocr <image_path>     Extract text via Apple Vision
        """
        print(usage)
    }

    static func checkPermission() {
        let hasAccess = CGPreflightScreenCaptureAccess()
        let result: [String: Any] = ["has_permission": hasAccess]
        outputJSON(result)
    }

    static func requestPermission() {
        let hasAccess = CGPreflightScreenCaptureAccess()
        if !hasAccess {
            let requested = CGRequestScreenCaptureAccess()
            if !requested {
                if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
                    NSWorkspace.shared.open(url)
                }
            }
        }
        let finalStatus = CGPreflightScreenCaptureAccess()
        let result: [String: Any] = [
            "has_permission": finalStatus,
            "prompted": !hasAccess
        ]
        outputJSON(result)
    }

    static func listDisplays() {
        var displayCount: UInt32 = 0
        CGGetActiveDisplayList(0, nil, &displayCount)
        var displayIDs = [CGDirectDisplayID](repeating: 0, count: Int(displayCount))
        CGGetActiveDisplayList(displayCount, &displayIDs, &displayCount)

        let mainDisplayID = CGMainDisplayID()
        var displays: [[String: Any]] = []

        for (index, id) in displayIDs.enumerated() {
            let width = CGDisplayPixelsWide(id)
            let height = CGDisplayPixelsHigh(id)
            let isMain = id == mainDisplayID
            let name = isMain ? "Main Display" : "Display \(index + 1)"
            displays.append([
                "id": Int(id),
                "index": index + 1,
                "name": name,
                "is_main": isMain,
                "width": width,
                "height": height
            ])
        }

        outputJSON(displays)
    }

    static func listWindows() {
        let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
        var results: [[String: Any]] = []

        for w in windowList {
            let layer = w[kCGWindowLayer as String] as? Int ?? -1
            guard layer == 0 else { continue }
            let ownerName = w[kCGWindowOwnerName as String] as? String ?? ""
            let windowName = w[kCGWindowName as String] as? String ?? ""
            let windowId = w[kCGWindowNumber as String] as? Int ?? 0
            let pid = w[kCGWindowOwnerPID as String] as? Int ?? 0
            let bounds = w[kCGWindowBounds as String] as? [String: Any] ?? [:]
            let width = bounds["Width"] as? Double ?? 0
            let height = bounds["Height"] as? Double ?? 0
            guard width > 80 && height > 80 else { continue }

            // Filter out system shell processes
            if ownerName == "Dock" || ownerName == "Window Server" || ownerName == "Control Center" || ownerName == "SystemUIServer" {
                continue
            }

            results.append([
                "id": windowId,
                "app_name": ownerName,
                "title": windowName.isEmpty ? ownerName : windowName,
                "pid": pid,
                "width": width,
                "height": height
            ])
        }

        outputJSON(results)
    }

    static func performOCR(imagePath: String) {
        guard let nsImage = NSImage(contentsOfFile: imagePath),
              let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            print("[]")
            return
        }

        var recognizedItems: [[String: Any]] = []
        let request = VNRecognizeTextRequest { (request, error) in
            guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
            for observation in observations {
                guard let topCandidate = observation.topCandidates(1).first else { continue }
                let bbox = observation.boundingBox
                recognizedItems.append([
                    "text": topCandidate.string,
                    "confidence": topCandidate.confidence,
                    "x": bbox.origin.x,
                    "y": bbox.origin.y,
                    "width": bbox.size.width,
                    "height": bbox.size.height
                ])
            }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])

        outputJSON(recognizedItems)
    }

    static func outputJSON(_ object: Any) {
        if let data = try? JSONSerialization.data(withJSONObject: object, options: .prettyPrinted),
           let str = String(data: data, encoding: .utf8) {
            print(str)
        } else {
            print("{}")
        }
    }
}

NovaScreenHelper.main()

