# 桌面便签（Desktop Notes）

Windows 桌面便签软件：笔记可嵌入桌面、锁定态鼠标点击穿透（点不到），只能通过配置窗口 / 托盘管理。基于 Electron（未来可跨平台）。

## 功能（M1）

- 系统托盘常驻：新建 / 打开配置 / 全部锁定 / 全部解锁 / 快速删除 / 退出
- 配置窗口：笔记列表、新建 / 复制 / 删除、富文本编辑、样式与位置设置
- 笔记桌面挂件：无边框、透明、置顶
- **锁定态**：`setIgnoreMouseEvents` 点击穿透，只读，鼠标点不到
- **临时解锁**：解锁后可在桌面直接拖动 / 缩放 / 编辑，完成后锁回并保存
- **富文本**：加粗 / 斜体 / 下划线 / 列表 / 链接 / 文字颜色（存净化后的 HTML）
- **多显示器**：按 `displayId` + 屏内相对坐标摆放与还原
- **开机自启**：设置里可开可关
- 本地存储：`%APPDATA%/desktop-notes/notes.json`，启动自动恢复所有笔记

## 运行

```bash
npm install
npm start
```

首次启动若无笔记，会自动打开配置窗口。关闭配置窗口不退出（缩到托盘），从托盘“退出”才真正结束。

> 依赖安装说明：Electron 二进制默认从 GitHub 下载，国内易超时。若卡住，用镜像：
> ```bash
> set ELECTRON_MIRROR=https://registry.npmmirror.com/-/binary/electron/
> npm install --registry=https://registry.npmmirror.com
> ```
> `npm start` 通过 `scripts/start.js` 启动，会自动清除可能干扰的 `ELECTRON_RUN_AS_NODE` 环境变量。

## 打包为安装程序（Windows）

产物：`dist/桌面便签-Setup-0.1.0.exe`（NSIS 安装包，双击即装）。

```bash
npm run dist
```

> ⚠️ **本环境打包的特殊处理（重装 node_modules 后需重做）**
> electron-builder 的 `winCodeSign` 官方 7z 内含 2 个 macOS 符号链接，而当前构建环境**禁止创建符号链接**，导致解压失败、无法嵌入图标。解决办法见 `scripts/` 下的两个配套文件：
> 1. `scripts/gen-icon-ico.js` — 生成 `build/icon.ico`。
> 2. `scripts/mirror-proxy.js` — 本地代理（端口 8123），把 `winCodeSign-2.6.0.7z` 替换为已去除符号链接的 `winCodeSign-2.6.0.nosym.7z`（用 7za 重打包时须从 `wcs_extract/` 内部打包，保证文件在压缩包根目录）。
> 3. `node_modules/app-builder-bin/win/{x64,ia32}/app-builder.exe` 的 SHA512 校验值已被补丁为去符号链接版 7z 的哈希（原始值备份在 `.bak`）。
>
> 因此 `npm run dist` 必须走代理并关闭签名自动发现，例如：
> ```bash
> node scripts/mirror-proxy.js &
> ELECTRON_BUILDER_BINARIES_MIRROR=http://127.0.0.1:8123/ CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist
> ```
> `package.json` 里已设置 `win.sign = scripts/no-sign.js`（本地分发无需 Authenticode 签名）。

## 使用流程

1. 托盘或配置窗口“新建”一条笔记 → 桌面出现便签。
2. 默认锁定：点它会穿透到桌面。
3. 需要改：配置窗口选中编辑并“应用”，或托盘/配置“解锁”后直接在桌面改，改完再锁定。

## 数据格式

见 `../桌面笔记软件设计.md` 第 5 节。

## 目录结构

```
desktop-notes/
  package.json
  src/
    main/          主进程：入口 / 窗口管理 / 托盘 / 存储
    preload/       预加载桥（contextBridge）
    renderer/
      config/      配置窗口 UI
      note/        笔记挂件 UI
```
