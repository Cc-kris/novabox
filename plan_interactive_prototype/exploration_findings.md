# Novabox 高保真原型实施探索报告

> 探索日期：2026-10-28  
> 项目根目录：`/Users/mac/Documents/Dev/Novabox`  
> 证据目录：`plan_interactive_prototype/evidence/`

---

## 一、环境现状

### 1.1 项目结构

- **项目根**：`/Users/mac/Documents/Dev/Novabox`
- **V1.0 方案文档**：
  - `docs/V1.0/V1.0_product_solution_20261028_V1.md` (787行，产品与技术完整方案)
  - `docs/V1.0/V1.0_ui_brand_design_20261028_V1.md` (529行，品牌、界面与交互设计规范)
- **现有前端代码**：**无**
  - 已搜索 `*.html / *.vue / *.jsx / *.tsx / package.json / vite.config.* / webpack.config.*`，均未找到
  - 项目处于方案阶段，尚未进入开发

### 1.2 可用运行时

| 工具 | 路径 | 版本 | 可用性 |
|------|------|------|--------|
| Python 3 | `/Applications/Galley-0.6.4-prev.app/Contents/Resources/python/bin/python3` | Python 3.12+ | ✓ 已验证 |
| http.server | `python3 -m http.server` | 内置 | ✓ 可用于静态托管 |
| Node / npm | — | — | ✗ preflight 未提供 |
| ripgrep | `/opt/homebrew/bin/rg` | — | ✓ 可用于搜索 |

**静态服务命令**：
```bash
/Applications/Galley-0.6.4-prev.app/Contents/Resources/python/bin/python3 -m http.server 8000
```

### 1.3 验收路径

- **浏览器工具**：`web_execute_js` / `web_scan` 可用
- **截图限制**：macOS 无屏幕录制权限，验收依赖 **DOM 证据**（元素存在性、样式计算值、交互状态）而非截图
- **推荐方式**：启动静态服务 → 打开页面 → 执行 JS 提取 DOM 结构、品牌色值、布局参数

---

## 二、关键发现

### 2.1 产品方案核心要点

从 `V1.0_product_solution_20261028_V1.md` 提取的关键实现边界：

1. **窗口形态**：侧窗（320–480px 宽）+ 独立窗口（720px+）
2. **核心闭环**：会话生成工具草稿 → 校验测试 → 用户发布 → 手动/Agent 调用
3. **V1.0 范围（P0）**：
   - 工具库、搜索、收藏、最近使用
   - Schema 驱动的通用工具页面
   - 草稿、预览、发布流程
   - MCP 接口（搜索、读取、运行、创建）
   - 深色/浅色界面及完整交互状态
4. **明确不做**：
   - 不注入宿主代码
   - 不执行任意生成脚本
   - 不做多用户协作和公开市场
   - 不做 BPM/定时任务/RPA

### 2.2 UI/品牌设计核心约束

从 `V1.0_ui_brand_design_20261028_V1.md` 提取的强制要求：

#### 品牌视觉方向：**石墨与薄荷 (Graphite & Mint)**

- **深色主题（默认）**：
  - 背景 `#111312` / `#171A18` / `#1E221F`
  - 主文字 `#F2F5F3`（对比度 16.99:1）
  - 薄荷绿主强调 `#78E0B4`（对比度 10.96:1）
  - 信息蓝 `#7DB7E8`，警告黄 `#E7B66A`，错误红 `#F28B82`
- **浅色主题**：
  - 背景 `#F4F5F2` / `#FFFFFF`
  - 主文字 `#1A201C`（对比度 15.14:1）
  - 主操作绿 `#147A55`

#### 去 AI 化硬约束（禁止）

- 紫蓝粉渐变、漂浮光斑、星空背景
- 多层玻璃拟态、装饰 emoji、超大 Hero
- 同尺寸浮起卡片海洋、无意义光晕
- 机器人或魔法图标

#### 排版与间距

- 字体：`Inter`, `SF Pro Text`, `PingFang SC`；代码用 `SF Mono` / `JetBrains Mono`
- 字号：页面主标题 18px/26px，正文 13px/20px，辅助 12px/18px
- 间距基础单位：4px，常用 `4/8/12/16/20/24/32`
- 圆角：控件 6px，卡片 10px，胶囊状态 999px
- 按钮高度：36px（主按钮），28/32px（图标按钮）

#### 参考来源

- Radix UI Primitives（弹窗、菜单、焦点管理）
- shadcn/ui（低噪声表单、空态）
- Apple HIG（桌面窗口、用户掌控）
- Tremor（紧凑指标、数据层级）

**重要**：第 5、6 节的 ASCII 线框图是布局参考，实现后须真实 DOM 验收，线框不代替最终视觉。

### 2.3 推荐原型结构

**零构建方案**（无 npm/webpack/vite）：

```
Novabox/
├── prototype/
│   ├── index.html          # 工具库主页（顶栏/导航/列表/搜索）
│   ├── tool_detail.html    # 工具详情/运行页（Schema表单/结果）
│   ├── draft_preview.html  # 草稿预览（测试结果/发布确认）
│   ├── styles.css          # Design Tokens + 组件样式
│   ├── app.js              # 导航/状态/模拟数据加载
│   └── mock_data.json      # 示例工具定义（含Schema）
└── plan_interactive_prototype/
    └── evidence/           # 本次探索证据
```

**启动与验收流程**：

1. `cd /Users/mac/Documents/Dev/Novabox/prototype`
2. `/Applications/Galley-0.6.4-prev.app/Contents/Resources/python/bin/python3 -m http.server 8000`
3. 浏览器访问 `http://localhost:8000/index.html`
4. 用 `web_execute_js` 提取 DOM 证据验证品牌色、布局、状态

---

## 三、风险与不确定点

### 3.1 设计实现复杂度

- **对比度校验**：文档提供了目标组合（如深色主文字/canvas 16.99:1），但实现时需对**全部语义组合**重新检测，包含不同背景、叠加状态、小字号场景。
- **动效参数**：文档给出了时长和缓动类型（如 Hover 120ms Fade），但未提供 `--ease-out` / `--ease-drawer` 的具体贝塞尔曲线值，需自行定义或参考 Radix/shadcn 实现。
- **辅助功能**：强调"焦点管理""状态不能只依赖颜色"，需在原型中体现键盘导航、focus-visible 样式、aria 属性（至少在主交互路径）。

### 3.2 Schema 驱动表单渲染

- **工具 Schema 格式未定义**：产品方案提及"Schema 驱动的通用工具页面"，但未给出 JSON Schema 示例、字段类型白名单、组件映射规则。
- **原型模拟策略**：建议在 `mock_data.json` 中设计 2–3 个不同类型工具示例（如文本输入、数值、选择、文件上传），在 `tool_detail.html` 中用 vanilla JS 动态渲染表单，验证布局适应性。

### 3.3 窗口追随功能

- **原型不涉及桌面窗口追随**：高保真原型仅验证 UI 页面，不包含 Electron/Tauri 级别的窗口管理和宿主窗口监听。
- **独立测试路径**：窗口追随功能需单独开发 PoC（Accessibility API / SetWinEventHook），与本次原型并行。

### 3.4 MCP 接口交互

- **原型仅模拟 UI 侧**：`mock_data.json` 模拟工具数据，`app.js` 模拟前端状态，无需实现真实 MCP 通信。
- **后续集成风险**：Agent 调用后"自动打开 UI、填参、显示结果"需要明确的 IPC 协议（如 WebSocket / IPC 事件），原型阶段用 URL query params 或 localStorage 模拟即可。

### 3.5 空态与极端情况

- **必须覆盖的状态**：
  - 空工具库（"还没有工具，从一次有效的方法开始"）
  - 搜索无结果
  - 工具运行中 / 成功 / 失败 / 超时
  - 草稿校验失败、测试失败
- **320px 最小宽度**：需验证卡片、表单、按钮在 320px 侧窗下不发生水平溢出或截断关键信息。

---

## 四、零构建原型最小文件建议

### 4.1 `prototype/index.html`（工具库主页）

**必须包含**：

- 顶栏：Novabox 标志 + 字标，连接状态（● Codex），主题切换，更多菜单
- 导航标签：工具 / 草稿 / 历史（默认选中"工具"）
- 搜索栏：带 Lucide 搜索图标，placeholder "搜索工具名称、标签或描述…"
- 工具列表：至少 3 个卡片，展示工具名称、描述、标签、最近使用时间
- 空态：无工具时显示空态提示
- 状态：至少 1 个工具卡片有 hover 效果、1 个有"运行中"状态图标

### 4.2 `prototype/tool_detail.html`（工具运行页）

**必须包含**：

- 顶栏：返回按钮 + 工具名称
- 工具元信息：描述、来源、版本、标签
- 输入区：Schema 驱动表单（至少 2 种字段类型：text、select）
- 主按钮："运行"（薄荷绿 `#78E0B4`），36px 高
- 结果区：运行后展示结构化输出、来源链接、运行时间
- 错误态：模拟一个失败场景，红色错误提示 + 错误详情

### 4.3 `prototype/draft_preview.html`（草稿预览）

**必须包含**：

- 顶栏：草稿标题，"草稿"状态标签（警告黄 `#E7B66A`）
- 草稿信息：创建自、来源会话
- 测试结果区：通过/失败状态，至少 1 个测试用例展示
- 操作区：主按钮"确认发布"（薄荷绿），次要按钮"删除草稿"（边框）

### 4.4 `prototype/styles.css`（Design Tokens + 组件）

**必须包含**：

- CSS 变量定义深色/浅色主题全部 token（见上文 §4.1、§4.2）
- 主题切换逻辑（`:root[data-theme="light"]`）
- 按钮样式：主按钮（薄荷绿背景 + 深色文字）、次要按钮（边框 + 透明背景）、图标按钮
- 卡片样式：10px 圆角、边框、hover 效果
- 输入框样式：6px 圆角、36px 高、focus 状态
- 状态标签：胶囊形（999px 圆角）、颜色语义（信息/警告/错误）
- 排版基础：字体栈、字号、行高、字重

### 4.5 `prototype/app.js`（前端逻辑）

**必须包含**：

- 从 `mock_data.json` 加载工具数据
- 主题切换逻辑（读取 `localStorage`，切换 `data-theme` 属性）
- 工具列表渲染（含空态判断）
- 搜索过滤逻辑（匹配名称、标签、描述）
- 工具卡片点击 → 跳转到 `tool_detail.html?id=xxx`
- 工具运行模拟（点击"运行" → 延迟 1–2s → 显示结果或错误）

### 4.6 `prototype/mock_data.json`（示例数据）

**必须包含**：

- 至少 3 个工具定义：
  1. 简单文本转换工具（如"URL 安全编码"）
  2. 多字段表单工具（如"Markdown 转 HTML"，含选项配置）
  3. 只读查询工具（如"域名 WHOIS 查询"）
- 每个工具包含：
  - `id`, `name`, `description`, `tags`, `version`, `source`, `lastUsed`
  - `inputSchema`（字段类型、label、placeholder、required）
  - `outputExample`（结构化结果示例）
- 至少 1 个草稿示例（含测试用例和状态）

---

## 五、下一步行动建议

1. **创建 `prototype/` 目录**，按上述最小清单实现三个核心页面。
2. **优先实现深色主题**，浅色主题可留待后续迭代。
3. **验收重点**：
   - 品牌色值精确匹配（用 `getComputedStyle` 提取 CSS 变量）
   - 关键对比度组合（用 Web Content Accessibility Guidelines 公式验证）
   - 320px / 360px / 480px 三种侧窗宽度下布局不破坏
   - 键盘导航和焦点可见性（Tab / Enter / Esc）
4. **不做项目文件修改**，原型独立于后续开发，仅用于设计验证和演示。
5. **启动静态服务后，用 `web_execute_js` 读取 DOM 证据**，验证品牌、布局、交互状态，输出验收报告。

---

**探索完成时间**：2026-10-28  
**证据文件**：
- `evidence/evidence_01_paths.json`
- `evidence/evidence_02_runtime.json`
- `evidence/evidence_03_entrypoints.json`
