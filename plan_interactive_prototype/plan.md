# Novabox 高保真可交互原型执行计划

## 探索发现

项目只有V1.0方案，无既有前端；Node不在PATH；Python http.server可用。采用零依赖单页HTML/CSS/JS，避免多页路由和构建链。真实窗口追随/MCP不属于本次原型，只能模拟。截图权限可能受限，DOM trace可记录但不得代替视觉PASS。

## 执行步骤

1. [✓] 只读探索、环境预检与证据落盘。
2. [✓] 编写PRD/UI Brief/技术设计/测试/验收/任务清单。
3. [✓] 文档角色审核与架构规模复核，R1全部PASS，见document_review.md。
4. [D] 实现TASK-001：`prototype/index.html`、`styles.css`、`app.js`、`README.md`。
   依赖：2,3；SOP：project_development_sop.md。
5. [ ] 启动本地静态服务，运行主路径、异常路径、断点、键盘和资源测试。
   依赖：4；SOP：verify_sop.md。
6. [ ] 独立Code Review并修复发现，重跑相关测试。
7. [VERIFY] 启动独立验证worker，读取证据并给出VERDICT；失败则修复重验。
8. [ ] 更新架构/验收记录，关闭自开浏览器标签，交付入口和模拟边界。

## 交付边界

工具库、工具运行、Agent模拟、草稿发布、历史、设置均可交互；零外部资源。若环境无法取得真实截图，明确标PARTIAL，不宣称视觉验收通过。
