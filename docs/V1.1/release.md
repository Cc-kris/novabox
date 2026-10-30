# V1.1.0 发布记录

- 日期：2026-10-30
- 仓库：https://github.com/Cc-kris/novabox
- 版本：1.1.0
- 提交：f9c369a

## 本次发布内容

- macOS 安装包：`Novabox-1.1.0.dmg`、`Novabox-1.1.0.pkg`、`Novabox-1.1.0-macOS.zip`（Apple Silicon，ad-hoc 签名）
- Windows 安装包：`Novabox-1.1.0-Windows-Setup.exe`（Electron + 内置 Node 24 x64，NSIS 安装）
- 新增 Windows Electron 壳，数据目录 `%APPDATA%\Novabox`
- 更新源默认指向 `Cc-kris/novabox`；macOS 自动更新使用 Release 中的 `Novabox-*.zip`
- Windows 版仅支持检查更新，需手动下载安装包

## Windows 构建流程

GitHub Actions 工作流：`.github/workflows/windows-build.yml`

1. 下载 Node 24.22.2 win-x64 到 `windows/node/`
2. 用该 Node 启动 `app/server.mjs`，检查 `/api/health`
3. `npm ci --prefix windows`
4. `npm run dist --prefix windows`
5. 上传 `windows/release/*.exe`

## 已知限制

- 安装包未做代码签名：macOS 首次需右键打开，Windows SmartScreen 需选择“更多信息 → 仍要运行”。
- macOS 构建为 arm64，未提供 Intel 版本。
- Windows 自动更新暂未启用。
- 应用数据、数据库、运行日志均未提交到仓库。
