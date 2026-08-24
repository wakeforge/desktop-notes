# AGENTS.md — 桌面便签（desktop-notes）

> 面向 AI 协作者的项目说明。描述当前实现的架构、模块职责、数据模型与构建方式。
> 最后更新：2026-08-23（配置 UI 重构：主窗卡片化 + 便签详情弹窗 + 全局配置弹窗 + 主题，见第 3.1 节）。

## 1. 项目概述

- **形态**：Windows 桌面便签应用。笔记以「桌面挂件窗口」常驻显示，默认透明、置顶、点击穿透，只能由配套配置窗口增删改。
- **技术栈**：Electron 32 + 原生 HTML/CSS/JS（无前端框架）。宿主壳用 Electron，未来考虑跨平台。
- **进程模型**：经典「主进程 + 渲染进程」。
  - 主进程（Node.js）：`src/main/*`，负责托盘、窗口管理、存储、原生 API、IPC 路由。
  - 渲染进程（Chromium）：两套独立 HTML——`src/renderer/config/config.html`（配置窗口）和 `src/renderer/note/note.html`（每笔记一个窗口，URL 带 `?id=`）。
  - 桥接：`src/preload/*` 用 `contextBridge` 把受限 API 暴露给渲染层（`contextIsolation: true`、`nodeIntegration: false`）。所有通信走 `ipcRenderer.invoke` ↔ `ipcMain.handle`。

## 2. 主进程模块（`src/main/`）

| 文件 | 职责 |
|---|---|
| `main.js` | 入口。单实例锁（`requestSingleInstanceLock`）、`applyLaunchOnStartup`、就绪后恢复笔记+建托盘、全部 IPC 处理器（`data:*`、`notes:*`、`note:*`、`settings:*`、`displays:*`、`config:open`）。 |
| `windowManager.js` | 创建/销毁/重载笔记窗口与配置窗口；锁态切换（`setIgnoreMouseEvents`）；多屏定位 `clampToScreen`（按虚拟桌面绝对坐标 absX/absY 落位，越界兜底主屏）。 |
| `store.js` | 数据层。读写 `notes.json`（位于 `app.getPath('userData')`），内存缓存 + 落盘。 |
| `tray.js` | 系统托盘图标 + 右键菜单（新建 / 打开配置 / 全部锁定 / 全部解锁 / 全部显示 / 全部隐藏 / 退出）。 |

## 3. 窗口与「笔记挂件」模型

- **笔记窗口（每笔记一个 `BrowserWindow`）**：`frame:false`、`transparent:true`、`alwaysOnTop:true`、`skipTaskbar:true`、`resizable/movable:false`。
  - 锁定态：`setIgnoreMouseEvents(true,{forward:true})` → 点击穿透、只读（`note.js` 里 `content.contentEditable=false`）。
  - 解锁态：恢复可交互，可拖动/缩放/改内容；输入 500ms 防抖 `saveLive` 回写；`mouseup`/`resize` 时 `reportBounds` 回写屏幕坐标。
- **配置主窗口**：普通窗口，只做「管理」不做「内容」。2026-08-23 重构为**卡片网格视图**：顶部栏（校准 / 全局配置齿轮）、工具栏（+新建便签下拉[文本/网页] / 搜索 / 排序）、便签卡片网格（彩色顶条 / 标题 / 预览 / 元数据 / ⋯菜单）。点击卡片打开「配置便签」详情弹窗；新建后自动弹出详情弹窗。**不含富文本编辑**——内容编辑只在解锁后的便签窗口进行。
- **托盘**：常驻。`window-all-closed` 不退出（只关窗口不退出进程）。批量操作（全部显示/隐藏/锁定/解锁）**仅保留在托盘菜单**，主窗不再提供。

### 3.1 配置 UI 弹窗体系（2026-08-23 新增）

- **便签详情弹窗**（`src/renderer/note-config/`）：独立模态 BrowserWindow（parent=主窗，URL 带 `?id=`），每便签一个、复用聚焦。配置项：类型（文本/网页）、所在屏幕、坐标 X·Y·宽·高、背景/文字色、字号、透明度、隐藏/置顶/锁定开关；操作：显示位置（闪烁定位）/ 重置 / 删除 / 立即设置全屏。改动防抖 250ms 经 `note:update` 等既有 IPC 回写。
- **全局配置弹窗**（`src/renderer/global-config/`）：单例模态 BrowserWindow。配置项：开机启动、主题、默认字号、默认透明度、默认背景/文字色。即时保存（`settings:update`）。
- **主题**：`settings.theme` ∈ 'light' | 'dark' | 'system'（默认 system）。主进程 `nativeTheme.themeSource` 驱动，渲染层监听 `matchMedia('prefers-color-scheme')` 切换 `html[data-theme]`，CSS 变量整体换肤，所有配置窗口即时生效。便签窗口本体不参与主题（颜色由每条便签的 bgColor/textColor 决定）。

## 4. 渲染层关键文件

- `src/renderer/note/note.js`：`sanitize()` 白名单净化富文本（P/B/I/U/UL/OL/LI/A/SPAN/DIV/FONT，禁 `javascript:` 协议）；`scheduleSave` 防抖保存；`reportBounds` 上报坐标；锁态 UI 切换。
- `src/renderer/config/config.js`：卡片网格渲染、搜索/排序、卡片右键菜单（配置/复制/隐藏/锁定/删除）、新建下拉、全局配置与详情弹窗入口。
- `src/renderer/note-config/note-config.js`：便签详情弹窗逻辑（表单填充 + 防抖保存，坐标用「屏幕下拉 + 屏内相对 X·Y」换算虚拟桌面绝对坐标 absX/absY）。
- `src/renderer/global-config/global-config.js`：全局配置弹窗逻辑（即时保存）。
- `src/preload/config-preload.js` / `note-preload.js` / `note-config-preload.js` / `global-config-preload.js`：`contextBridge` 暴露 `configAPI` / `noteAPI` / `noteConfigAPI` / `globalConfigAPI`，内部全部走 `ipcRenderer.invoke` / `ipcRenderer.on`。

## 5. 数据模型（`notes.json`，位于 `%APPDATA%/desktop-notes/notes.json`）

```jsonc
{
  "version": 1,
  "settings": {
    "launchOnStartup": false,
    "defaultBgColor": "#FFF7B2",
    "defaultTextColor": "#222222",
    "defaultFontSize": 14,
    "defaultOpacity": 0.95,
    "theme": "system"
  },
  "notes": [
    {
      "id": "a1b2c3d4",
      "contentHtml": "<p>...</p>",
      "displayId": 2779098405,        // 冗余：仅用于配置窗"所在屏幕"反查展示
      "absX": 2560, "absY": 240,      // 虚拟桌面绝对坐标（多屏拼接后的完整桌面原点）
      "width": 240, "height": 160,
      "bgColor": "#FFF7B2",
      "textColor": "#222222",
      "fontSize": 14,
      "opacity": 0.95,
      "locked": true,
      "hidden": false,                 // 是否隐藏（true=桌面不显示，仅数据保留、配置窗可编辑）
      "alwaysOnTop": true,
      "createdAt": "2026-07-21T20:00:00+08:00",
      "updatedAt": "2026-07-21T20:00:00+08:00"
    }
  ]
}
```

- 坐标用「虚拟桌面绝对坐标 `absX`/`absY`」存储（多屏拼接后的完整桌面原点），启动时直接 `setBounds` 落位，不依赖 `display.id`，彻底规避 Windows 多屏重启后 `Display.id` 漂移导致笔记归位主屏的问题（2026-08-14 修复）。旧数据（`displayId`+相对 `x`/`y`）由 `store.js` 的 `migratePositions` 在加载时一次性迁移为绝对坐标。`displayId` 仅作配置窗"所在屏幕"反查展示的冗余字段。
- `settings.launchOnStartup` 一旦为 `true` 会被持久化，重装程序不会自动清除。

## 6. 启动行为（关键链路）

```
app.whenReady()
  → applyLaunchOnStartup(settings.launchOnStartup)   // app.setLoginItemSettings({openAtLogin})
  → wm.restoreAllNotes()                              // 有笔记则逐个建桌面窗口
  → trayModule.createTray()
  → if store.getNotes().length === 0: wm.showConfigWindow()   // 空笔记时弹配置窗
```

- 单实例锁：重复启动只触发 `second-instance` 聚焦配置窗。
- **已知现象**：若 `launchOnStartup` 为 `true`，Windows 会把它注册成登录启动项，每次开机自动拉起；无笔记时即弹出配置窗（用户感知为「未启动却弹框」）。关闭方式：配置窗取消「开机自启」，或 Windows 设置→应用→启动里关掉。待优化：被登录启动拉起时应静默启动、不弹配置窗。

## 7. 打包与构建（`package.json` → electron-builder）

- `npm run dist` → `electron-builder --win --x64`，产物 NSIS：`dist/desktop-notes-Setup-1.0.1.exe`。
- NSIS 配置：`oneClick:false`、`perMachine:false`（当前用户安装）、可选安装目录、桌面+开始菜单快捷方式、`shortcutName: desktop-notes`。
- 不签名：`win.sign: scripts/no-sign.js`（无代码签名，个别杀软可能误报）。
- `electron`/`electron-builder` 为 devDependencies；`files` 仅打包 `src/`、`assets/`、`package.json`。

## 8. 范围与里程碑（来自设计文档）

- **M1（已交付）**：托盘 + 配置窗 + 新建/删除/复制/编辑；每笔记透明置顶窗口；点击穿透；临时解锁编辑；富文本（加粗/颜色/列表/链接）；多显示器；开机自启（可关）；JSON 存储。
- **M2（待做→部分已交付 2026-08-22）**：富文本插图片（已交付）、可视化摆位预览、模板/标签、打包签名与自动更新。
- **M3（可选）**：真·嵌入桌面（`WorkerW` `SetParent` 原生模块，沉到图标层）；跨平台（macOS/Linux）；云同步。

## 8.1 2026-08-22 新增能力（图片 + 网页便签）

- **数据模型**：`notes[]` 每项新增 `type`('text'|'web'，默认 'text') 与 `url`(网页便签地址，默认 '')。旧数据无 `type` 一律按文本处理。`store.createNote` 已加默认值；`duplicateNote` 经 `{...src}` 自动继承这两字段。
- **图片**：落盘到 `app.getPath('userData')/note-imgs/<noteId>/`，`contentHtml` 内仅存 `<img src="noteimg://<id>/<file>">`。主进程 `protocol.registerFileProtocol('noteimg', …)` 映射到该目录，并做路径穿越防护（必须落在 `noteimg` 根下）。删除笔记时 `removeNoteImages` 清理对应目录。
  - 三个插入入口（均在 `note.js`）：工具栏「🖼️」按钮 → `note:pick-image`（文件框）；拖拽图片到正文 → `note:add-image-from-path`；粘贴图片 → `note:paste-image`（主进程读剪贴板 `clipboard.readImage()`）。
  - `sanitize()` 已放开 `IMG`，但 `src` 仅允许 `noteimg:` / `data:image/`，杜绝外链与 `javascript:` 等。
  - CSP（`note.html`）：`img-src 'self' noteimg: data:`。
- **网页便签**：`type==='web'` 时笔记窗隐藏富文本区，改挂 `<webview src=url allowpopups>` 占满内容区；工具栏换成地址栏 + 前往 + 刷新。`note:save-live({url})` 写回地址。锁定语义沿用文本便签（锁定=点击穿透，网页不可交互；解锁后可操作、地址栏可见）。
  - 配置窗：侧栏「+ 新建」旁加「类型」下拉（文本/网页）；编辑区加「类型」选择 + 「网址」输入行（仅网页类型显示）。
  - CSP：`frame-src https: http:` 与 `child-src https: http:`（允许 webview 加载外站）。
  - `windowManager` 笔记窗 `webPreferences.webviewTag:true`。
- **可见性（2026-08-22 新增）**：每条笔记新增布尔字段 `hidden`（默认 `false`=显示）。`hidden===true` 时该笔记窗口在桌面不显示（`win.hide()`），但数据保留、配置窗仍可编辑、可重新显示。与 `locked`（点击穿透）是独立的两套状态。
  - 入口：托盘右键顶层「全部显示 / 全部隐藏」；配置窗编辑区「隐藏」开关 + 侧栏「全部显示 / 全部隐藏」按钮。列表以 🚫 标识隐藏态。
  - 主进程：新增 `note:set-hidden` 与 `notes:set-all-hidden` IPC；`windowManager` 新增 `applyHiddenState(id, hidden)` 与 `setAllHidden(hidden)`，`createNoteWindow`/`reloadNote` 创建或刷新时尊重 `hidden`。`store.createNote` 已加默认值，`duplicateNote` 经 `{...src}` 自动继承。
- **待真机验证**：`transparent:true` 窗口内嵌 `<webview>` 的渲染表现（沙箱无显示器，未跑 GUI 冒烟）。

## 9. 给协作者的提示

- 改主进程逻辑优先在 `src/main/main.js` 的 IPC 处理器处接线，渲染层通过 preload 暴露的 API 调用，不要直接开 `nodeIntegration`。
- 富文本改动必须保持 `note.js` 的 `sanitize()` 白名单与 XSS 防护。
- 新增窗口属性/笔记字段时，同步更新 `store.js` 的 `createNote` 默认值与 `notes.json` 结构说明。
- 涉及开机自启的改动，注意 `applyLaunchOnStartup` 与 Windows 注册表启动项的联动。

## 10. GIT 工作流规则（强制）

项目使用**本地 GIT** 做版本管理（已配置远程 `origin`，日常以本地提交为主，远程仅作备份/同步）。所有代码与文档修改**必须遵守**以下规则，AI 协作者每次动手前先核对本节：

### 10.1 每次修改前，先建分支

- 任何「修改 / 调整」动手前，先从 `main` 切出新分支：`git checkout -b <branch>`。
- **禁止在 `main` 上直接开发**；`main` 只接收已完成、已验证的合并。
- 分支命名必须**准确描述本次改动内容**，采用 `类型/简述` 形式（全小写、连字符分词）：

  | 前缀 | 用途 | 示例 |
  |---|---|---|
  | `feat/` | 新功能 | `feat/note-image-webview` |
  | `fix/` | 修 bug | `fix/config-window-crash` |
  | `chore/` | 杂务/配置/规则 | `chore/git-workflow-rules` |
  | `docs/` | 文档 | `docs/readme-update` |
  | `refactor/` | 重构 | `refactor/store-module` |
  | `test/` | 测试 | `test/window-manager` |

- 一个分支聚焦**一件事**的完整改动；不相关的修改拆成不同分支/提交。

### 10.2 提交与推送时输出简洁汇总

- Commit message 结构（中文）：
  - 标题：`类型: 一句话总结`（如 `chore: 新增 GIT 工作流规则`）。
  - 正文（可选）：用 `-` 列出本次要点，保持精简。
- 每次 `commit` / `push` **之前**，先在回复中向用户**汇总本次更新内容**（简洁描述，不啰嗦）。
- 推送：`git push -u origin <branch>`；完成并验证后合并回 `main`（`git checkout main && git merge <branch>`），再 `git push origin main`。
- 合并后清理已合并的分支（本地 + 远程）以保持仓库整洁。

### 10.3 提交粒度与质量

- 提交要「小而完整」：一个提交解决一个明确问题，便于回滚与审阅。
- 提交前确认改动范围符合分支意图，避免把无关文件混进来（依赖 `node_modules/`、`dist/` 等已在 `.gitignore`）。
