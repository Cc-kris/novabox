# Novabox V1.1 UI/功能改造进度

日期：2026-10-29
入口：/Users/mac/Documents/Dev/Novabox

## 已完成（代码已改，未构建）
- `app/public/index.html`：头部改为三行：品牌+连接状态 / 工具列表+运行历史+设置下拉（设置、运行诊断、重新扫描工具）/ 搜索+只看收藏。
- `app/public/styles.css`：桌面满窗 18px 圆角；头部三行；480 宽双列紧凑卡片；卡片图标+标题横排；收藏按钮 `z-index:4`；详情页图标 `flex:0 0 46px`；删掉桌面布局的 0 圆角覆盖。
- `app/public/app.js`：新增 `iconArtFor()` 与 `/icons/3d/*.png` 的 3D 图标映射（失败回退 SVG）；卡片新 markup；工具页删除重复搜索栏和「每个工具都带输入约束…」句。

## 待办（按顺序）
1. app.js：`updateFooter` 已删 `#draft-count` 引用；`closeMenu` 仍在引用已删的 `#app-menu`，会报 null，必须改成关闭 `#settings-menu`。
2. app.js：`render()` 调 `updateHeader()` 同步搜索值与收藏按钮；点击事件加 `toggle-settings-menu`，删除 `toggle-menu/menu-nav`；全局 `input` 监听 `#tool-search`；⌘K 聚焦。
3. app.js：结果文案加标签（利润计算器→`利润：xxx`，并让复制按钮复制带标签文本）；boolean 必填标记。
4. app.js：设置页加 GitHub 更新卡片（检查更新/更新按钮 + 进度条 + 状态），删除旧设置说明里的目标句。
5. 后端：默认仅显示 `text-format`、`unit-convert`、`currency-convert`；新增汇率工具和 `currency_convert` transform（离线参考汇率并明确日期/免责声明）。
6. 后端：GitHub Release 检查/下载/安装接口（repo 可配置，项目当前无仓库地址，不能猜）；前端 SSE 或轮询进度。
7. 桌面：Swift 透明窗口 + WKWebView 18px 圆角裁剪；HostTracker 跟随 Codex 时 `NSApp.activate` + `orderFrontRegardless`。
8. 图标：按 image2 SOP 生成 3D 拟物 PNG 放 `app/public/icons/3d/`。
9. 验证：`node server.mjs` + 浏览器 DOM（480×899 双列、收藏点击、搜索、结果标签），再 build/install。

## 关键约束
- 项目不是 git 仓库，没有 remote。
- 当前数据库只有 6 个内置工具，无汇率工具。
- 更新仓库地址未知，不能虚构；需要用户提供或写可配置项。
