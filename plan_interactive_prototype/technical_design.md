# Novabox 原型技术设计

- 节点评分：2/2
- 技术栈：HTML5 + CSS3 + 原生ES2020 JavaScript；Python `http.server`；零npm/外部CDN。

## 架构变更分析

首次研发，无旧模块/API/数据库。新增 `prototype/` 静态单页原型，不修改既有产品文档。无网络API、无DB、无外部依赖；后续接入Tauri/MCP时替换内存store，不影响本次纯展示交付。

## 文件与职责

| 文件 | 职责 |
|---|---|
| `prototype/index.html` | 语义化应用骨架、dialog、SVG symbol、资源入口 |
| `prototype/styles.css` | tokens、主题、布局、组件、状态、动效、响应式 |
| `prototype/app.js` | 数据、Schema渲染、store、router、交互与模拟运行 |
| `prototype/README.md` | 启动、功能、原型边界 |

## 状态契约

`state = { view: tools|tool|drafts|history|settings, theme, width, host, query, filter, favorites, selectedTool, form, runStatus, result, history, draftStatus }`。动作经事件委托更新state并局部/整体render；所有动态文本使用`textContent`/escape，不拼接不可信HTML。

工具定义：`{id,name,description,category,icon,fields:[{key,label,type,required,placeholder,options}],version,source}`。运行记录：`{id,toolId,origin,inputs,outputs,status,createdAt}`。

## 关键流程

- 搜索：name/description/category大小写不敏感；无结果显示空态与清空动作。
- 校验：空必填和非法数值阻止运行并关联错误；运行模拟异步，按钮防重入。
- Agent：预置结构化参数写入表单，显示origin标记并执行；不宣称真实MCP。
- 发布：校验通过草稿才可确认；确认dialog返回焦点；发布后入库并可打开。
- 历史：保存成功/失败快照；复用输入回工具页；复制使用clipboard并提供toast。
- 设置：主题更新`data-theme`，宽度360/400/480，宿主断开展示warning且本地工具仍可用。

## 安全/回滚/兼容

无密钥、无持久化敏感数据、无外部请求。静态server仅绑定127.0.0.1。回滚删除新增`prototype/`，不影响方案文档。现代Chrome/Edge；不做IE。
