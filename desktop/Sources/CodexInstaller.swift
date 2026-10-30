import Foundation

struct CodexInstallResult {
    let ok: Bool
    let message: String
    let detail: String
}

final class CodexInstaller {
    private let fm = FileManager.default

    func findCodex() -> String? {
        let candidates = [
            "/opt/homebrew/bin/codex",
            "/usr/local/bin/codex",
            NSHomeDirectory() + "/.local/bin/codex",
            NSHomeDirectory() + "/bin/codex"
        ]
        return candidates.first(where: { fm.isExecutableFile(atPath: $0) })
    }

    func install(server: ServerManager) -> CodexInstallResult {
        guard let codex = findCodex() else {
            return CodexInstallResult(ok: false, message: "未找到 codex 命令。请先安装 Codex CLI，或从终端运行本应用后重试。", detail: "")
        }
        let backup = backupConfig()

        _ = run(codex, ["mcp", "remove", "novabox"])
        let add = run(codex, [
            "mcp", "add", "novabox",
            "--env", "NOVABOX_DATA_DIR=\(server.dataDir.path)",
            "--env", "NOVABOX_TOOLS_DIR=\(server.toolsDir.path)",
            "--", server.nodeURL.path, server.mcpScript.path
        ])
        guard add.status == 0 else {
            return CodexInstallResult(ok: false, message: "写入 Codex MCP 配置失败。", detail: add.output)
        }

        let list = run(codex, ["mcp", "list"])
        let verified = list.output.contains("novabox")
        var message = verified ? "已写入 Codex MCP 配置，并确认 novabox 已注册。" : "命令已执行，但未在 codex mcp list 中确认到 novabox。"
        if let backup = backup {
            message += "\n配置备份：\(backup)"
        }
        message += "\n请重启 Codex 会话后使用。"
        return CodexInstallResult(ok: verified, message: message, detail: list.output)
    }

    private func backupConfig() -> String? {
        let config = URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent(".codex/config.toml")
        guard fm.fileExists(atPath: config.path) else { return nil }
        let stamp = ISO8601DateFormatter().string(from: Date())
            .replacingOccurrences(of: ":", with: "-")
        let backup = config.deletingLastPathComponent()
            .appendingPathComponent("config.toml.novabox-backup-\(stamp)")
        do {
            try fm.copyItem(at: config, to: backup)
            return backup.path
        } catch {
            return nil
        }
    }

    private func run(_ executable: String, _ arguments: [String]) -> (status: Int32, output: String) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        do {
            try process.run()
        } catch {
            return (-1, error.localizedDescription)
        }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        return (process.terminationStatus, String(data: data, encoding: .utf8) ?? "")
    }
}
