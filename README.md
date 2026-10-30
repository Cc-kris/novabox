# Novabox

Novabox 是一个本地优先的小工具工作台：内置 7 个常用工具（JSON 格式化、正则测试、时间戳转换、Base64、单位换算、汇率换算、文本整理），也可以描述需求，让本机 Codex 生成新的小工具。

所有数据、数据库和生成物都留在本机，不上传服务器。

## 下载

到 [Releases](https://github.com/Cc-kris/novabox/releases/latest) 下载：

| 平台 | 文件 | 说明 |
| --- | --- | --- |
| macOS 13+（Apple Silicon） | `Novabox-1.1.0.dmg` | 推荐；也可用 `.pkg` |
| Windows 10/11（x64） | `Novabox-1.1.0-Windows-Setup.exe` | 安装版，自带 Node 运行时 |

安装包未做代码签名：macOS 首次打开需右键「打开」；Windows SmartScreen 提示时选「更多信息 → 仍要运行」。

macOS 的自动更新读取 GitHub Release 里的 `Novabox-*.zip`；Windows 版目前只支持检查更新，新版本请从 Release 手动下载覆盖安装。

## 从源码运行

需要 Node.js 22.5+（使用内置 `node:sqlite`）。

```bash
cd app
node server.mjs
```

打开 http://127.0.0.1:8787 。

数据默认写在 `app/data/`；桌面版会改写到系统用户目录：

- macOS：`~/Library/Application Support/Novabox/`
- Windows：`%APPDATA%\Novabox\`

## 从源码构建

### macOS

需要 macOS、Xcode Command Line Tools、Node.js。

```bash
zsh desktop/build.sh
```

产物在 `dist/`：`.app`、`.dmg`、`.pkg`、`.zip`。脚本默认使用 `/usr/local/bin/node`，可用 `NODE_BIN=/path/to/node` 覆盖。当前构建为 Apple Silicon（arm64）。

### Windows

Windows 壳在 `windows/`，使用 Electron，并随包携带 Node 24 x64 运行 `app/server.mjs`。

本地构建需要 Windows x64、Node.js 24：

```powershell
cd windows
npm ci
npm run dist
```

把 Node 24 的 `node.exe` 放到 `windows/node/`（CI 会自动下载）。产物是 `windows/release/Novabox-1.1.0-Windows-Setup.exe`。

也可以直接运行 GitHub Actions 的 `Windows build` 工作流，下载 artifact。

## 目录

```text
app/         本地服务端、前端页面、内置工具
desktop/     macOS Swift 桌面壳
windows/     Windows Electron 桌面壳
docs/        设计与实现记录
codex-plugin/ Codex 工具生成插件
```

## 说明

- 服务只监听 `127.0.0.1`，不对局域网开放。
- Windows 安装包内置 Node，不依赖用户机器上的 Node.js。
- 安装包未签名；正式分发前建议配置 Apple Developer ID 与 Windows 代码签名证书。
