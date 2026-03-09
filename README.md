# SnapLab

网页助手插件，包含图片预览、缩放、旋转等图片处理相关功能。一个极简且强大的浏览器扩展。

A web assistant browser extension with image preview, zoom, rotate and other image processing features.

## 功能特点 / Features

- **极简设计**：无需复杂配置，开箱即用
- **图片预览**：悬浮图片显示操作工具栏，支持滚轮缩放、鼠标拖拽、旋转、水平/垂直翻转
- **图片美化**：一键美化导出，支持背景、圆角、内边距、阴影等参数调整，可复制或下载 PNG
- **EXIF 查看**：读取并展示图片 EXIF 元数据（相机、镜头、GPS 等）
- **本地图片**：支持打开本地图片进行预览 / 美化 / EXIF 查看（含 newtab 页面兼容）
- **中英双语**：支持中文 / English 手动切换
- **跨浏览器**：支持 Chrome、Edge 等主流浏览器

## 安装与开发

本项目使用 [WXT](https://wxt.dev/) 框架 + Vue 3 开发。

### 开发
```bash
pnpm install
pnpm dev
```

开发模式会自动打开浏览器并导航到百度图片用于测试。

### 打包与发布
项目使用 [Task](https://taskfile.dev/) 进行任务管理。
```bash
# 仅打包
task build

# 打包 + 发布到 Chrome / Edge 商店
task publish
```

## 项目结构

```
entrypoints/
  ├── background.ts      # 后台脚本
  ├── content.ts          # 内容脚本（图片悬浮工具栏、预览、美化入口）
  ├── popup/              # Popup 弹出页面（开关、语言切换、打开本地图片）
  └── preview/            # 独立预览页面（newtab 等场景的 fallback）
components/
  ├── ImagePreview.vue    # 图片预览组件
  ├── ImageBeautify.vue   # 图片美化组件
  ├── ImageExifPanel.vue  # EXIF 信息面板
  └── ImageHoverToolbar.vue # 悬浮工具栏
utils/
  └── i18n.ts             # 自定义国际化工具（支持运行时中英文切换）
public/
  └── _locales/           # Chrome i18n 翻译文件（zh_CN / en）
```

## TODO / 思考

- [ ] **市场研究**：调研 Imagus 和 Hover Zoom 的用户群体及核心诉求
- [ ] **功能深挖**：专注于图片功能，将其做到最强：
    - [ ] 快速缩小/裁剪
    - [ ] 格式转换

## Changelog

### v0.0.4 (2026-03-09)

- ✨ 新增中英文手动切换功能，在 popup 底部可一键切换语言
- ✨ 新增独立预览页面，修复在 newtab 页面打开本地图片无效的问题
- 🌐 全局国际化：所有 UI 文本支持中文 / English
- 🔧 开发模式自动打开百度图片页面用于测试

### v0.0.3 (2026-03-06)

- ✨ 图片美化功能（背景、圆角、内边距、阴影 + 复制/下载）
- ✨ EXIF 信息查看面板
- ✨ 打开本地图片功能
- 🎨 悬浮工具栏重构（预览 + 美化按钮独立控制）

### v0.0.2

- ✨ 图片预览功能（缩放、旋转、翻转、拖拽）
- 🎨 Popup 开关控制

### v0.0.1

- 🎉 项目初始化
