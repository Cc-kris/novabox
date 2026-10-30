import Foundation
import Darwin

final class ServerManager {
    let port: Int = 8787
    private let fm = FileManager.default
    private(set) var dataDir: URL!
    private(set) var toolsDir: URL!
    private(set) var nodeURL: URL!
    private(set) var serverScript: URL!
    private(set) var mcpScript: URL!
    private(set) var appRoot: URL!
    private(set) var logURL: URL!
    private(set) var isExternal = false
    private var process: Process?
    private var logHandle: FileHandle?

    var baseURL: URL { URL(string: "http://127.0.0.1:\(port)")! }

    private var expectedVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
    }

    func prepare() throws {
        guard let resources = Bundle.main.resourceURL else {
            throw NSError(domain: "Novabox", code: 1, userInfo: [NSLocalizedDescriptionKey: "找不到应用资源目录"])
        }
        appRoot = resources.appendingPathComponent("app", isDirectory: true)
        serverScript = appRoot.appendingPathComponent("server.mjs")
        mcpScript = appRoot.appendingPathComponent("mcp-server.mjs")

        let bundledNode = resources.appendingPathComponent("node/bin/node")
        if fm.isExecutableFile(atPath: bundledNode.path) {
            nodeURL = bundledNode
        } else if fm.isExecutableFile(atPath: "/usr/local/bin/node") {
            nodeURL = URL(fileURLWithPath: "/usr/local/bin/node")
        } else if fm.isExecutableFile(atPath: "/opt/homebrew/bin/node") {
            nodeURL = URL(fileURLWithPath: "/opt/homebrew/bin/node")
        } else {
            throw NSError(domain: "Novabox", code: 2, userInfo: [NSLocalizedDescriptionKey: "找不到 Node.js 运行时"])
        }

        let supportRoot = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("Novabox", isDirectory: true)
        dataDir = supportRoot.appendingPathComponent("data", isDirectory: true)
        toolsDir = supportRoot.appendingPathComponent("tools", isDirectory: true)
        try fm.createDirectory(at: dataDir, withIntermediateDirectories: true)
        try fm.createDirectory(at: toolsDir, withIntermediateDirectories: true)

        let logsRoot = try fm.url(for: .libraryDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("Logs/Novabox", isDirectory: true)
        try fm.createDirectory(at: logsRoot, withIntermediateDirectories: true)
        logURL = logsRoot.appendingPathComponent("server.log")

        try seedTools()
    }

    private func seedTools() throws {
        let source = appRoot.appendingPathComponent("tools", isDirectory: true)
        guard fm.fileExists(atPath: source.path) else { return }
        let entries = try fm.contentsOfDirectory(at: source, includingPropertiesForKeys: [.isDirectoryKey], options: [.skipsHiddenFiles])
        for entry in entries {
            let values = try entry.resourceValues(forKeys: [.isDirectoryKey])
            guard values.isDirectory == true else { continue }
            let dest = toolsDir.appendingPathComponent(entry.lastPathComponent, isDirectory: true)
            if !fm.fileExists(atPath: dest.path) {
                try fm.copyItem(at: entry, to: dest)
            }
        }
        try fm.createDirectory(at: toolsDir.appendingPathComponent("user", isDirectory: true), withIntermediateDirectories: true)
    }

    func start() throws {
        if healthOK() {
            isExternal = true
            return
        }
        terminateStaleServers()
        guard fm.fileExists(atPath: serverScript.path) else {
            throw NSError(domain: "Novabox", code: 3, userInfo: [NSLocalizedDescriptionKey: "安装包缺少 server.mjs"])
        }

        let p = Process()
        p.executableURL = nodeURL
        p.arguments = [serverScript.path]
        var env = ProcessInfo.processInfo.environment
        env["NOVABOX_DATA_DIR"] = dataDir.path
        env["NOVABOX_TOOLS_DIR"] = toolsDir.path
        env["NOVABOX_PORT"] = String(port)
        env["NOVABOX_HOST"] = "127.0.0.1"
        p.environment = env
        p.currentDirectoryURL = appRoot
        logHandle = try openLog()
        p.standardOutput = logHandle
        p.standardError = logHandle
        try p.run()
        process = p

        for _ in 0..<120 {
            if healthOK() { return }
            if !p.isRunning {
                throw NSError(domain: "Novabox", code: 4, userInfo: [NSLocalizedDescriptionKey: "本地内核启动失败，请查看日志：\(logURL.path)"])
            }
            Thread.sleep(forTimeInterval: 0.1)
        }
        throw NSError(domain: "Novabox", code: 5, userInfo: [NSLocalizedDescriptionKey: "本地内核启动超时，请查看日志：\(logURL.path)"])
    }

    private func openLog() throws -> FileHandle {
        if !fm.fileExists(atPath: logURL.path) {
            fm.createFile(atPath: logURL.path, contents: nil)
        }
        let handle = try FileHandle(forWritingTo: logURL)
        handle.seekToEndOfFile()
        let header = "\n=== Novabox launch \(ISO8601DateFormatter().string(from: Date())) ===\n"
        if let data = header.data(using: .utf8) { handle.write(data) }
        return handle
    }

    private func healthOK() -> Bool {
        let semaphore = DispatchSemaphore(value: 0)
        var healthy = false
        var request = URLRequest(url: baseURL.appendingPathComponent("api/health"))
        request.timeoutInterval = 0.8
        request.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: request) { data, response, _ in
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data),
               let object = json as? [String: Any],
               (response as? HTTPURLResponse)?.statusCode == 200,
               (object["name"] as? String) == "Novabox",
               self.expectedVersion.isEmpty || (object["version"] as? String) == self.expectedVersion {
                healthy = true
            }
            semaphore.signal()
        }.resume()
        _ = semaphore.wait(timeout: .now() + 1.2)
        return healthy
    }

    private func listeningPIDs() -> [Int32] {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
        p.arguments = ["-tiTCP:\(port)", "-sTCP:LISTEN"]
        let pipe = Pipe()
        p.standardOutput = pipe
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return [] }
        p.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return (String(data: data, encoding: .utf8) ?? "")
            .split(whereSeparator: { $0 == "\n" || $0 == " " })
            .compactMap { Int32($0) }
    }

    private func commandLine(for pid: Int32) -> String {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/ps")
        p.arguments = ["-p", String(pid), "-o", "command="]
        let pipe = Pipe()
        p.standardOutput = pipe
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return "" }
        p.waitUntilExit()
        return String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
    }

    /// A previous Novabox build may still own 8787 after an in-place update.
    /// Only terminate listeners that are clearly this app's own node server.
    private func terminateStaleServers() {
        let stale = listeningPIDs().filter {
            let command = commandLine(for: $0)
            return command.contains("Novabox") && command.contains("server.mjs")
        }
        guard !stale.isEmpty else { return }
        for pid in stale { kill(pid, SIGTERM) }
        for _ in 0..<40 {
            if listeningPIDs().isEmpty { return }
            usleep(100_000)
        }
        for pid in stale { kill(pid, SIGKILL) }
    }

    func stop() {
        if let p = process, p.isRunning {
            p.terminate()
            p.waitUntilExit()
        }
        process = nil
        logHandle?.closeFile()
        logHandle = nil
    }
}
