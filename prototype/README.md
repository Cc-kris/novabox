# Novabox 可交互原型

> **原型边界声明**：这是一个纯前端静态演示原型，用于验证 Novabox 的核心交互流程和视觉设计。不包含真实的窗口追随、MCP 通信、代码执行等后端能力。

## 快速启动

```bash
cd /Users/mac/Documents/Dev/Novabox/prototype
python3 -m http.server 8765
```

在浏览器打开：`http://127.0.0.1:8765/index.html`

## 功能清单

### ✅ 已实现

- **工具库**：搜索、分类筛选、收藏管理
- **工具运行**：动态表单渲染、必填校验、数值校验、异步模拟执行
- **模拟 Agent 调用**：自动填充参数并标注来源（Codex 模拟）
- **草稿管理**：查看测试状态、权限信息、确认发布流程
- **历史记录**：运行快照、输入复用、状态标记
- **设置面板**：深色/浅色主题切换、侧栏宽度调整（360/400/480px）、宿主连接模拟
- **交互反馈**：Toast 提示、Dialog 确认、加载状态、空态提示
- **无障碍**：语义化 HTML、ARIA 标注、键盘导航、focus-visible、Esc 关闭

### 🔧 示例工具

1. **文本整理**：去重、排序、统计
2. **JSON 转换**：格式化、压缩、转 CSV
3. **单位换算**：长度、重量单位互转
4. **正则校验**：测试正则表达式
5. **时间戳转换**：时间戳与日期互转

### ⚠️ 原型限制

- **无真实后端**：所有数据存储在内存中，刷新页面会重置
- **无 MCP 通信**：Agent 调用为模拟填充，不发起真实请求
- **无窗口追随**：侧窗宽度调整仅改变页面容器，不操作系统窗口
- **无文件上传**：表单不支持文件类型字段
- **模拟运行**：工具执行结果为前端模拟，不执行真实代码

## 技术栈

- **HTML5**：语义化标签 + ARIA
- **CSS3**：Design Tokens + CSS Variables + Responsive
- **ES2020 JavaScript**：原生 DOM 操作，无框架/库依赖
- **零外部依赖**：无 npm、CDN、字体文件，内联 SVG 图标

## 设计规范

遵循 `docs/V1.0/V1.0_ui_brand_design_20261028_V1.md` 品牌与界面规范：

- **Graphite & Mint** 配色体系
- **深色默认**，浅色可切，无渐变/玻璃/光斑
- **内联 SVG** 图标，不使用 emoji
- **320px 最小视口**验收，360px 默认，760px+ 桌面展示
- **reduced-motion** 支持

## 验证方式

### 静态检查
```bash
# HTML 语法检查（需要 HTML Tidy 或在线工具）
# CSS 语法检查
grep -n "{{" prototype/styles.css  # 不应有模板占位符

# JS 语法检查
node -c prototype/app.js
```

### 浏览器测试
1. 打开开发者工具，检查控制台无报错
2. 测试 320px / 360px / 760px 断点无横向滚动
3. 使用 Tab 键测试焦点可见性
4. 测试工具搜索、收藏、运行、历史、草稿发布流程
5. 点击"模拟 Agent 调用"验证自动填参

### Debug API
```javascript
// 浏览器控制台
window.novaboxDebug.getState()  // 查看当前状态
window.novaboxDebug.demoSimulateAgent()  // 触发 Agent 模拟
```

## 文件结构

```
prototype/
├── index.html       # 应用骨架与语义结构
├── styles.css       # Design Tokens + 组件样式
├── app.js           # 状态管理 + 路由 + 交互逻辑
└── README.md        # 本文件
```

## 下一步

- 接入真实 Tauri 窗口 API
- 集成 MCP 通信协议
- 实现工具代码沙箱执行
- 添加工具版本管理与回滚
- 支持自定义主题配色

---

**项目根目录**：`/Users/mac/Documents/Dev/Novabox`  
**设计文档**：`docs/V1.0/V1.0_ui_brand_design_20261028_V1.md`  
**原型状态**：可交互演示 ✓
