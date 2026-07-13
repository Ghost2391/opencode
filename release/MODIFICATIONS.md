# opencode Win7 离线移植修改说明

## 目标
使 opencode 在 Windows 7 (Chrome 109) 完全离线可用，无需代理到 app.opencode.ai。

## 修改清单

### 1. `release/index.mjs` — 核心运行时修改

#### 1.1 嵌入式 UI 本地回退 (`embeddedUI`, 行 784063)
- 新增：当 `import("opencode-web-ui.gen.ts")` 失败时，扫描 `web-ui/` 目录并构建文件映射
- 支持递归扫描子目录，按相对路径索引
- 避免了对远程服务器的依赖

#### 1.2 响应处理 (`embeddedUIResponse`, 行 784083)
- 为 HTML 响应注入 `Content-Security-Policy`
- 移除 HTML 中的 `crossorigin` 属性（Chrome 109 不支持跨域模块加载）

#### 1.3 ES2023 Polyfill (`POLYFILL_JS`, 行 784094)
- 内联 polyfill 了 `Array.prototype.toReversed/toSorted/toSpliced/with`
- 在 `serveEmbeddedUIEffect` 中将 polyfill 前置注入到 `index-DR-rkusp.js` 响应体
- 解决了 Chrome 109 打开 Settings 二次崩溃的问题

#### 1.4 UI 请求路由 (`serveEmbeddedUIEffect`, 行 784095)
- 优先精确匹配文件路径（如 `assets/xxx.js`）
- 对 `index-DR-rkusp.js` 特殊处理：在响应开头注入 polyfill
- 缺失的 `.js` 文件返回空模块 `export {};` 而非 404
- 兜底返回 `index.html`（SPA fallback）
- 所有文件读取失败时返回 404 而非崩溃

#### 1.5 WASM 路径解析修复 (行 546385)
- 修复：`require.resolve()` 返回字符串，直接赋值而非解构 `{ default: }`
- 涉及 `tree-sitter.wasm`、`tree-sitter-bash.wasm`、`tree-sitter-powershell.wasm`
- 修复后 Shell 工具 (bash/ps) 的语法解析功能正常工作

### 2. `release/opencode.bat` — 启动脚本

```
OPENCODE_DISABLE_MODELS_FETCH=true
OPENCODE_MODELS_PATH=%DIR%\web-ui\models.json
```

- 禁用每次启动时拉取模型列表
- 使用本地的 `models.json`（预先从 models.dev 下载）

### 3. `release/web-ui/` — 静态资源

- 完整下载了 app.opencode.ai 的 Web UI 资源 (~550 个文件, ~20 MB)
- `models.json` — 预下载的模型元数据
- `assets/mcp-CJZWqTiv.js` — 手动创建的 MCP 交互桩（解决缺失导出 u）
- `assets/*.css` — 缺失的 CSS 空文件占位（防止 404）

## 已知问题

| 问题 | 影响 | 状态 |
|------|------|------|
| ripgrep 缺失 | glob/grep 工具不可用 | 需手动下载 `rg.exe` 到 `bin/` 目录 |
| Markdown 渲染 Worker 错误 | Markdown 预览功能异常 | 原因未明 |
| 4 个 CSS 文件为空占位 | 部分 UI 元素样式缺失 | 不影响功能 |
| Firefox 滚动异常 | 滚动行为不自然 | 用户确认忽略 |
