# Novabox V1.0 实施状态

> 更新时间：2026-10-29  
> 代码目录：`/Users/mac/Documents/Dev/Novabox/app`

## 已完成

- 6 个内置工具包，带输入 schema、输出 schema、示例与自动测试；核心测试 14/14 通过。
- 本地 HTTP 服务 `server.mjs`：静态界面、工具 CRUD、运行、历史、草稿校验/测试/发布、设置、诊断、SSE 事件流。
- MCP stdio 适配器 `mcp-server.mjs`：initialize、tools/list、tools/call、工具检索、打开工具页等 8 个接口。
- 工作台前端：工具库、工具运行页、历史、草稿、设置、诊断六个视图，白色基底与三边流光外壳。
- MCP 调用与 UI 共用 `NovaboxService`；MCP 运行后通过 SSE 自动展开工具页并填入输入。
- SQLite 持久化：工具、运行历史、草稿、设置、事件。

## 当前验证

- `node --check` 通过：`server.mjs`、`mcp-server.mjs`、`public/app.js`。
- `curl /api/health`：6 tools / 3 runs。
- 真实 Chrome 首屏：6 张工具卡，无横向溢出，CSS/JS 资源无加载失败。
- 已修：schema `enum` 被误渲染为文本框；对象级 `required` 数组未显示必填；`x-ui.widget=textarea` 未生效。

## 待完成

- 完整浏览器回归：工具运行、结果值、历史写入、草稿校验与发布、设置开关、诊断页。
- 窄屏与窗口缩放检查。
- MCP 端到端回归（从 Codex/Claude Code 侧触发并确认 UI 自动展开）。
- 启动脚本与 README（安装、MCP 配置、安全边界）。

## 运行

```bash
cd /Users/mac/Documents/Dev/Novabox/app
node server.mjs
# http://127.0.0.1:8787
```
