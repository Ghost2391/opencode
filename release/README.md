# Opencode Windows 7 移植版

基于 Opencode 官方版本，修改后可在 **Windows 7 SP1** 上通过 Node.js 18 运行。

> 官方 Opencode 的 TUI 和 CLI 交互模式依赖 Bun 运行时，而 Bun 不支持 Windows 7（Bun 要求 Windows 10 1809+，且底层 Zig 编译器使用了 Windows 8+ 的 API）。本移植版使用 Node.js 18 替代 Bun，保留了 `web` 和 `run` 两个核心子命令。

---

## 修改内容

### 1. 打包方式：esbuild 单文件 ESM 打包

官方版使用 Bun 打包，本移植版使用 **esbuild** 将全部代码（含 Web UI 前端）打包为单个 `index.mjs`（约 41 MB），配合 `node_modules/` 中的 native 模块运行时加载。

### 2. Node.js 18 兼容性补丁

Bun 打包产物中包含部分仅 Bun 支持的 API，在 Node.js 18 下无法运行，逐一修复：

#### 2.1 `better-sqlite3` 的 boolean 参数

`better-sqlite3` v9.6.0 的 `getBooleanOption()` 使用 `key in options` 检查参数是否存在。Bun 打包时自动处理了类型，但在 Node.js 下直接传递 `{ readonly: undefined }` 会导致启动崩溃。

**修复**：将 `readonly` 和 `fileMustExist` 参数用 `!!` 强制转为 boolean 类型。

#### 2.2 SQL 执行兼容性

Bun 的 `better-sqlite3` 封装中，对不返回数据的 SQL 语句调用 `.all()` 会抛出 `does not return data` 错误。

**修复**：在 SQL 执行函数中添加 try/catch 回退 —— 如果 `.all()` 抛出指定错误，则改用 `.run()` 并返回空数组。

#### 2.3 PRAGMA 语句直接执行

SQLite 的 PRAGMA 语句在 Bun 下自动走 native 优化路径，Node.js 的 `better-sqlite3` 需要通过 `native.pragma()` 调用。

**修复**：检测语句前缀，PRAGMA 语句走 `native.pragma()` 路径。

#### 2.4 Worker Thread 的 `postMessage` / `onmessage` 全局对象

Bun 的 Worker Thread 自动提供 `postMessage` 和 `onmessage` 全局对象，Node.js 18 需要在 Worker 内部通过 `parentPort` 获取。

**修复**：在 `worker.mjs` 顶部将 `parentPort` 的 `postMessage` 和 `onmessage` 挂载为全局对象；在主线程 `index.mjs` 顶部添加空实现。

### 3. 循环依赖补丁（Critical）

Bun 打包产物中存在多个模块间的异步循环依赖（`await init_A()` → 内部又 `await init_B()` → 内部又回到 `await init_A()`），导致启动时死锁（exit code 13）。

**修复**：识别并处理了以下循环依赖链：

| 模块 | 依赖 | 处理方式 |
|------|------|---------|
| `init_agent6` / `init_agent7` | `init_internal7` | 跳过 await，调用但不等待 |
| `init_command6` / `init_command7` | `init_internal7` | 同上 |
| `init_external3` | `init_internal7` | 同上 |
| `init_provider6` | `init_internal7` | 同上 |
| `init_reference4` | `init_internal7` | 同上 |
| `init_skill3` / `init_skill4` | `init_internal7` | 同上 |
| `init_models_dev3` | `init_internal7` | 同上 |
| `init_variant` | `init_internal7` | 同上 |
| 20+ provider 模块 | 相互循环引用 | 跳过 provider 间循环 |
| `init_plugin5` ↔ `init_host` | 双向循环 | `init_host()` 改为 fire-and-forget |

### 4. Layer 节点 null 安全处理

循环依赖补丁导致 Effect 的 Layer 依赖树中出现 `undefined` 节点，在 Layer 编译阶段触发 `Cannot read properties of undefined (reading 'name' / 'kind')` 错误。

**修复**：在 `walk()` 函数中添加 null 安全检查，`flatten9()` 函数中跳过 null 节点，`compile()` 函数中过滤 undefined 依赖项。

### 5. Shell 工具错误处理

- **tree-sitter-powershell WASM 缺失**：编译产物缺少 `tree-sitter-powershell/tree-sitter-powershell.wasm` 文件，导致解析 PowerShell 命令时崩溃。**修复**：从项目根目录复制该 WASM 文件到 bundle 的 `node_modules` 中。
- **null 文本安全**：Shell 工具的参数解析函数（`pathArgs`、`home2`、`dynamic`、`prefix4`、`resolveWasm`）增加了对 `undefined` 或 `null` 输入的防御性检查。

### 6. `.ts` 工具文件导入

项目 `.opencode/tool/` 目录下的 `.ts` 文件在 Node.js 18 中无法直接通过 `import()` 加载。

**修复**：在工具加载循环中，对动态 `import()` 添加 `.catch(() => void 0)`，跳过无法加载的文件。

---

## 项目结构

```
release/
├── bin/
│   └── node.exe          — Node.js 18.20.8 运行时（约 67 MB）
├── config/               — 用户配置目录（可自定义）
│   └── openencode.json    — 配置文件
├── node_modules/          — 运行时依赖（约 77 MB）
├── index.mjs             — 主程序（约 42 MB，esbuild 单文件打包）
├── opencode.bat          — 入口脚本
└── README.md
```

---

## 使用方法

### Web 模式（推荐）

```batch
opencode.bat web
```

浏览器打开 `http://127.0.0.1:4096/` 即可使用完整的 Web UI。

### 命令行单次对话

```batch
opencode.bat run "你的问题"
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `opencode.bat web` | 启动 Web 服务 |
| `opencode.bat run <消息>` | 单次对话 |
| `opencode.bat models` | 列出可用模型 |
| `opencode.bat --help` | 查看全部命令 |

---

## 配置

配置文件位置（按优先级从低到高）：

1. **全局配置**：`config\opencode.json` 或 `config\opencode.jsonc`（和 opencode.bat 同目录）
2. **项目配置**：当前工作目录下的 `.opencode\opencode.json` 或 `opencode.jsonc`

可通过环境变量 `OPENCODE_CONFIG_DIR` 自定义配置目录路径。

### 配置示例

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "deepseek": {
      "options": { "apiKey": "sk-..." }
    }
  }
}
```

内置的 `opencode/deepseek-v4-flash-free` 等免费模型零配置即可使用。

---

## 已知限制（与官方版对比）

| 功能 | 官方版（Bun） | 本移植版（Node.js 18） |
|------|--------------|----------------------|
| Web UI | ✅ | ✅ |
| CLI `run` | ✅ | ✅ |
| `models` 等命令 | ✅ | ✅ |
| TUI 交互界面 | ✅ | ❌（需 Bun） |
| `--mini` 最小界面 | ✅ | ❌（需 Bun） |
| `attach` 附加模式 | ✅ | ❌（需 Bun） |
| 终端 PTY | ✅ | ❌（需 node-pty + Bun） |

---

## 离线部署

将 `release/` 目录直接复制到目标机器即可。无需联网、无需安装。

```batch
your-app/
├── bin/node.exe
├── index.mjs
├── node_modules/
├── opencode.bat
└── config/         ← 用户配置（可选）
```

建议用 7-Zip 打包（185 MB → 约 60-70 MB）。

---

## 技术栈

- **运行时**：Node.js 18.20.8（x64）
- **打包**：esbuild 单文件 ESM
- **数据库**：SQLite（better-sqlite3 v9.6.0 native 模块）
- **Shell 解析**：tree-sitter（bash + PowerShell grammar）
- **AI 协议**：AISDK / OpenAI 兼容
