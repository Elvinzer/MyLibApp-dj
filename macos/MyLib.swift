import AppKit
import Foundation

@MainActor
final class MyLibDelegate: NSObject, NSApplicationDelegate {
    private var launcher: Process?
    private var logHandle: FileHandle?
    private var project: URL?
    private var isQuitting = false
    private var didCheckUpdates = false
    private var isCheckingUpdate = false
    private var isUpdating = false
    private var progressWindow: NSPanel?
    private var updateProcess: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let applicationMenu = NSMenu()
        applicationMenu.addItem(withTitle: "Ouvrir MyLib", action: #selector(openLibrary), keyEquivalent: "o").target = self
        applicationMenu.addItem(NSMenuItem.separator())
        applicationMenu.addItem(withTitle: "Quitter MyLib", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let item = NSMenuItem()
        item.submenu = applicationMenu
        menu.addItem(item)
        NSApplication.shared.mainMenu = menu
        openLibrary()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !isUpdating && !isCheckingUpdate { didCheckUpdates = false }
        openLibrary()
        return false
    }

    @objc func openLibrary() {
        guard !isUpdating && !isCheckingUpdate else { return }
        guard !didCheckUpdates else { launchLibrary(); return }
        didCheckUpdates = true
        isCheckingUpdate = true
        runUpdater(apply: false) { [weak self] success, result in
            guard let self else { return }
            defer { self.isCheckingUpdate = false }
            if success && result["available"] as? Bool == true {
                NSApplication.shared.activate(ignoringOtherApps: true)
                let alert = NSAlert()
                alert.messageText = "Une mise à jour de MyLib est disponible"
                alert.informativeText = "Les dernières modifications sont prêtes à être installées. Vos morceaux et vos playlists seront conservés."
                alert.addButton(withTitle: "Mettre à jour et ouvrir")
                alert.addButton(withTitle: "Plus tard")
                if alert.runModal() == .alertFirstButtonReturn { self.installUpdate() }
                else { self.launchLibrary() }
            } else { self.launchLibrary() }
        }
    }

    private func runUpdater(apply: Bool, completion: @escaping (Bool, [String: Any]) -> Void) {
        guard let resources = Bundle.main.resourceURL,
              let source = try? String(contentsOf: resources.appendingPathComponent("source-path.txt"), encoding: .utf8),
              let runtime = try? String(contentsOf: resources.appendingPathComponent("project-path.txt"), encoding: .utf8) else {
            completion(false, [:]); return
        }
        let runtimePath = runtime.trimmingCharacters(in: .whitespacesAndNewlines)
        let process = Process()
        process.executableURL = URL(fileURLWithPath: runtimePath + "/.venv/bin/python")
        process.arguments = [resources.appendingPathComponent("updater.py").path,
                             "--source", source.trimmingCharacters(in: .whitespacesAndNewlines),
                             "--runtime", runtimePath, "--app", Bundle.main.bundleURL.path] + (apply ? ["--apply"] : [])
        var environment = ProcessInfo.processInfo.environment
        environment["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        process.environment = environment
        process.standardInput = FileHandle.nullDevice
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice
        process.terminationHandler = { process in
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            DispatchQueue.main.async { completion(process.terminationStatus == 0, result) }
        }
        updateProcess = process
        do { try process.run() } catch { completion(false, [:]) }
    }

    private func installUpdate() {
        isUpdating = true
        let panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 420, height: 145), styleMask: [.titled], backing: .buffered, defer: false)
        panel.title = "Mise à jour de MyLib"
        let label = NSTextField(labelWithString: "Installation en cours…")
        label.font = .systemFont(ofSize: 17, weight: .semibold)
        label.frame = NSRect(x: 65, y: 82, width: 330, height: 25)
        let detail = NSTextField(wrappingLabelWithString: "La préparation peut prendre quelques minutes. Votre bibliothèque reste conservée.")
        detail.frame = NSRect(x: 65, y: 28, width: 325, height: 43)
        detail.textColor = .secondaryLabelColor
        let spinner = NSProgressIndicator(frame: NSRect(x: 22, y: 80, width: 26, height: 26))
        spinner.style = .spinning
        spinner.startAnimation(nil)
        panel.contentView?.addSubview(label)
        panel.contentView?.addSubview(detail)
        panel.contentView?.addSubview(spinner)
        panel.center(); panel.makeKeyAndOrderFront(nil)
        progressWindow = panel
        runUpdater(apply: true) { [weak self] success, result in
            guard let self else { return }
            self.progressWindow?.close(); self.progressWindow = nil
            if success {
                // Reopen the newly installed binary after the old process exits.
                let reopen = Process()
                reopen.executableURL = URL(fileURLWithPath: "/bin/sh")
                reopen.arguments = ["-c", "sleep 1; /usr/bin/open \"$1\"", "mylib-reopen", Bundle.main.bundleURL.path]
                reopen.standardOutput = FileHandle.nullDevice
                reopen.standardError = FileHandle.nullDevice
                try? reopen.run()
                self.isUpdating = false
                NSApplication.shared.terminate(nil)
            } else {
                self.isUpdating = false
                self.showError("La mise à jour n’a pas abouti. La version précédente a été conservée et va s’ouvrir. Vous pourrez réessayer au prochain lancement.")
                self.launchLibrary()
            }
        }
    }

    private func launchLibrary() {
        if let launcher, launcher.isRunning {
            if let project,
               let data = try? Data(contentsOf: project.appendingPathComponent(".runtime/instance.json")),
               let instance = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let address = instance["url"] as? String, let url = URL(string: address) {
                NSWorkspace.shared.open(url)
            }
            return
        }
        guard let config = Bundle.main.url(forResource: "project-path", withExtension: "txt"),
              let contents = try? String(contentsOf: config, encoding: .utf8) else {
            showError("La configuration de MyLib est absente. Recréez l’application avec npm run package:mac.")
            return
        }
        let project = URL(fileURLWithPath: contents.trimmingCharacters(in: .whitespacesAndNewlines))
        self.project = project
        let script = project.appendingPathComponent("scripts/launch.mjs")
        guard FileManager.default.fileExists(atPath: script.path) else {
            showError("Le dossier MyLibApp a été déplacé ou supprimé. Remettez-le à son emplacement ou recréez l’application depuis son nouveau dossier.")
            return
        }
        let paths = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"]
        guard let node = paths.map({ $0 + "/node" }).first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            showError("Node.js est absent. Installez Node.js puis relancez MyLib.")
            return
        }
        do {
            let logs = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/MyLibApp/logs")
            try FileManager.default.createDirectory(at: logs, withIntermediateDirectories: true)
            let log = logs.appendingPathComponent("launcher.log")
            if let size = try? log.resourceValues(forKeys: [.fileSizeKey]).fileSize, size > 1_000_000 {
                let previous = logs.appendingPathComponent("launcher.previous.log")
                try? FileManager.default.removeItem(at: previous)
                try FileManager.default.moveItem(at: log, to: previous)
            }
            if !FileManager.default.fileExists(atPath: log.path) { FileManager.default.createFile(atPath: log.path, contents: nil) }
            let handle = try FileHandle(forWritingTo: log)
            handle.seekToEndOfFile()
            logHandle = handle
            let process = Process()
            process.executableURL = URL(fileURLWithPath: node)
            process.arguments = [script.path]
            process.currentDirectoryURL = project
            var environment = ProcessInfo.processInfo.environment
            environment["PATH"] = paths.joined(separator: ":")
            process.environment = environment
            process.standardOutput = handle
            process.standardError = handle
            process.standardInput = FileHandle.nullDevice
            process.terminationHandler = { [weak self] process in
                let status = process.terminationStatus
                DispatchQueue.main.async {
                    guard let self else { return }
                    self.launcher = nil
                    try? self.logHandle?.close()
                    self.logHandle = nil
                    if status != 0 && !self.isQuitting && !self.isUpdating {
                        self.showError("MyLib n’a pas pu démarrer. Consultez Library/Application Support/MyLibApp/logs/launcher.log ou relancez Installer.command dans le dossier du projet.")
                    }
                }
            }
            launcher = process
            try process.run()
        } catch {
            launcher = nil
            showError("Impossible de lancer MyLib : \(error.localizedDescription)")
        }
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        return isUpdating ? .terminateCancel : .terminateNow
    }

    func applicationWillTerminate(_ notification: Notification) {
        isQuitting = true
        // Only stop a server started by this app, never an existing external instance.
        if let launcher, launcher.isRunning { launcher.terminate() }
    }

    private func showError(_ message: String) {
        NSApplication.shared.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "MyLib"
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Fermer")
        alert.runModal()
    }
}

@main
struct MyLibMain {
    @MainActor
    static func main() {
        let app = NSApplication.shared
        let delegate = MyLibDelegate()
        app.delegate = delegate
        app.setActivationPolicy(.regular)
        withExtendedLifetime(delegate) { app.run() }
    }
}
