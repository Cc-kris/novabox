# 原型任务清单

- 节点评分：2/2；采用单一vertical slice，因为共享store和样式拆分会造成不可独立验收的碎片。

| 字段 | TASK-001 |
|---|---|
| 对应REQ | REQ-001~007 |
| 任务描述 | 实现零依赖Novabox单页高保真原型及完整交互 |
| 影响文件 | `prototype/index.html`, `prototype/styles.css`, `prototype/app.js`, `prototype/README.md` |
| 预估代码量 | 1400行（UI密集原型，需架构师规模复核） |
| 前置任务 | 全部门禁文档PASS |
| 验收标准 | TC-001~012、AC-001~007 |
| 估时 | 4小时 |
| 回滚 | 删除prototype目录，不动docs |

实施边界：单页内存状态，不引入框架/CDN/后端；动态内容转义；所有主按钮有行为；窗口追随和MCP明确为模拟。完成后进行独立code review与真实浏览器验收。
