# Bug Break Loop: 隐藏浮层造成黑幕与搜索框遮挡

- Category: Cross-Layer Contract（HTML hidden 与 CSS display 冲突）
- Symptom: 首屏发黑，命令搜索框悬浮遮挡。实测两个浮层均 hidden=true，却 display:flex、覆盖全屏，各带 rgba(0,0,0,.6)。
- Root Cause: `.dialog-overlay` 与 `.command-menu` 的 display:flex 覆盖浏览器 `[hidden]{display:none}` UA规则。
- Failed Attempts: 普通刷新仍读取缓存旧CSS；线上CSS已含修复但document.styleSheets无新规则。
- Correct Fix: `styles.css` 增加 `[hidden]{display:none!important}`；`index.html` 为CSS/JS增加 `v=20261028-fix1` 版本参数。
- Verification: 缓存穿透加载后，两层 display:none；页面中心命中tool-header/tool-item；命令按钮打开为flex，Esc关闭恢复none。
- Prevention: 浮层显隐统一保留全局hidden规则；原型静态资源变更必须版本化，验收包含hidden浮层计算样式和命中测试。
