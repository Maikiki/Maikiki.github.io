# 个人博客重构方案：Hexo 旧站 → Astro 现代静态博客

## 一、仓库调研结论

### 现状
- 仓库 `Maikiki.github.io` 是 GitHub Pages 用户站，CNAME 绑定自有域名 **zhouxiao9.top**（保留不动）。
- 当前文件是 **Hexo 3.8.0 + Hux（子岚）主题**的编译产物，仓库内**没有 Hexo 源码**（无 `_config.yml`、`source/_posts`、`themes/`、`package.json`），历史提交全部为 `Site updated: ...` 的整体覆盖式部署，最后更新 2019-06-19。
- 实际内容极少：
  - 小说《肖洱的船》2 章：`/2019/06/14/xiaoerdechuan-0/`（楔子）、`/2019/06/14/xiaoerdechuan-01/`（第一章）
  - 分类：小说 / 肖洱的船；标签：言情；关于页 1 个
  - 正文为 `<p>` + `<br><br>` 硬排版 HTML，段首用全角空格缩进
- 旧技术：jQuery + Bootstrap 3、Font Awesome 4.5 CDN、fancybox、needsharebutton、toc.js、gitment 评论（服务已死，OAuth client_id 暴露在页面）、打赏二维码（图床位于 github.com/Maikiki/picturebed）、rocket 动画、手写签名图。
- SEO 资产：google/baidu 站点验证 meta、`sitemap.xml` 等多套 sitemap、`atom.xml`、`robots.txt`、`baidu_urls.txt`。
- 本地资源：`img/`（头图、签名、头像、404 图、微信图标）、`css/`、`js/`、`fonts/`、`lib/`（fancybox 等）。

### 痛点
1. 没有源码工程，无法维护、无法在新环境复现构建。
2. 发文章依赖本地装好 Hexo 的旧环境 + `hexo deploy`，门槛高。
3. jQuery/Bootstrap3/gitment 等依赖全面过时，评论已失效，页面冗余 CSS/JS 多。
4. 小说连载没有"书籍"概念，无章节目录、无上下章导航，不适合长期连载。

## 二、目标架构（已确认选型）

- **框架**：Astro 5（最新稳定版）+ TypeScript，纯静态输出 `dist/`，继续部署在 GitHub Pages。
- **样式**：不引入 Bootstrap/Tailwind，手写现代 CSS（CSS 变量 + 响应式 + 亮/暗/护眼三主题），长文阅读排版优先，默认零 JS 框架开销，交互部分用少量原生 JS（Astro 组件内 `<script>`，自动打包）。
- **写作**：Markdown（GFM）+ frontmatter，内容存在仓库 `src/content/` 中；**在 GitHub 网页端"Add file → Upload/Edit"即可发文**，手机浏览器也行；push 到 `main` 后 GitHub Actions 自动构建发布，本地零环境。
- **部署**：GitHub Actions 官方 Pages Action（`configure-pages` → `upload-pages-artifact` → `deploy-pages`），Pages Source 切换为 "GitHub Actions"；`public/CNAME` 保留域名。
- **评论**：Giscus（基于 GitHub Discussions），封装为一个 Astro 组件，按文章路径映射 discussion。
- **搜索**：Pagefind，构建后对 `dist/` 建静态索引，离线可用、无服务器；验证中文分词检索效果，若不理想则降级为 MiniSearch + `segmentit` 中文分词索引。
- **订阅/SEO**：`@astrojs/rss` 生成 RSS 2.0；`@astrojs/sitemap` 自动生成 sitemap；模板内 canonical、Open Graph、Twitter Card、JSON-LD（BlogPosting/Book）；保留 google/baidu 验证 meta（写入站点配置）。

### 目录结构（新）
```
Maikiki.github.io/
├─ .github/workflows/deploy.yml      # 构建 + 部署 Pages
├─ public/
│  ├─ CNAME                          # zhouxiao9.top（沿用）
│  ├─ robots.txt
│  └─ img/                           # 迁移现有本地图片
├─ src/
│  ├─ content/
│  │  ├─ posts/                      # 所有文章/章节，一篇一个 .md
│  │  │  ├─ xiaoerdechuan-0.md
│  │  │  └─ xiaoerdechuan-01.md
│  │  ├─ books/                      # 书籍元数据（一个作品一个 yml）
│  │  │  └─ xiaoer-de-chuan.yml
│  │  └─ config.ts                   # 内容集合 schema（zod 校验）
│  ├─ components/                    # BaseHead / Header / Footer / ThemeToggle
│  │                                 # PostCard / Toc / Giscus / Donate / Share / Pager / Search
│  ├─ layouts/                       # BaseLayout / PostLayout / BookLayout
│  ├─ pages/
│  │  ├─ index.astro                 # 首页：文章流 + 书籍推荐
│  │  ├─ about.astro
│  │  ├─ archive.astro               # 归档（按年/月）
│  │  ├─ categories/[...slug].astro  # 分类
│  │  ├─ tags/[...slug].astro        # 标签
│  │  ├─ books/index.astro           # 作品总览
│  │  ├─ books/[slug].astro          # 书籍详情 + 章节目录
│  │  ├─ posts/[...slug].astro       # 文章/章节详情
│  │  ├─ search.astro                # Pagefind 搜索页
│  │  ├─ rss.xml.js                  # RSS
│  │  └─ 404.astro
│  ├─ styles/global.css
│  └─ consts.ts                      # 站名、描述、导航、站长验证、社交链接
├─ scripts/migrate-html.mjs          # 一次性 HTML→Markdown 迁移脚本（turndown）
├─ content-template.md               # 新文章模板（发文时复制）
├─ 写作指南.md                        # 网页端发文图文步骤（放在仓库根目录）
├─ astro.config.mjs
├─ tsconfig.json
└─ package.json
```

### Frontmatter 设计
```yaml
---
title: 第一章 广袤的大地，也只是隔绝的孤岛
date: 2019-06-14
book: xiaoer-de-chuan        # 所属作品（普通日志/散文留空）
chapter: 1                    # 章节序号，决定目录与上下章顺序（楔子用 0）
categories: [小说, 肖洱的船]
tags: [言情]
cover: https://github.com/Maikiki/picturebed/raw/master/novel/xiaoerdechuan/xiaoer_0.jpeg
description: 本章摘要……      # OG/列表用，留空自动取正文前 140 字
draft: false                  # true 时不发布
---
```

## 三、内容与资源迁移

1. **旧站备份**：创建 `legacy-site` 分支保存当前全部文件；`main` 清空旧编译产物后重建工程（旧文件永远可从分支/历史找回）。
2. **正文迁移**：用一次性脚本 `scripts/migrate-html.mjs`（turndown + 自定义规则）解析两篇文章和关于页：
   - `<br><br>` 分段 → Markdown 段落；去掉段首全角空格，改由 CSS `text-indent: 2em` 统一缩进；
   - 自动生成上面格式的 frontmatter（标题、日期、分类、标签、book/chapter）；
   - 人工逐段比对原文校验（只有 2 章 + 关于页，成本低）。
3. **图片**：本地 `img/` 全部迁入 `public/img/`；GitHub 图床的头图与打赏码先保留原 URL（在国内访问可能慢，列为后续可选项：下载到 `public/img/pay/` 自托管）。
4. **关于页**内容转为 `src/content/page/about.md` 或直接写入 `about.astro`。
5. **favicon**：沿用 `cat-icon-512.png`。
6. **旧 URL 兼容**：两篇旧文在 `astro.config` 的 `redirects` 中做 301 风格静态跳转：
   - `/2019/06/14/xiaoerdechuan-0/` → `/posts/xiaoerdechuan-0/`
   - `/2019/06/14/xiaoerdechuan-01/` → `/posts/xiaoerdechuan-01/`
   - 旧分类/标签路径同样跳转到新路径；新文章统一使用干净的 `/posts/[slug]/`。

## 四、功能清单

### 页面与阅读（整洁优先）
- 首页：简洁文章列表（封面缩略 + 标题 + 摘要 + 日期 + 标签），顶部展示连载作品卡片。
- 文章页：移动端优先的长文排版（舒适字号、行高、段首缩进）、自动目录 TOC、阅读进度条、字数/预计阅读时长。
- **三主题切换**：亮色 / 暗色 / 护眼（米色），记忆选择；**字号 ± 调节**（对小说读者尤其有用）。
- **连载增强**：作品总览页、书籍页（封面/简介/状态：连载中·完结/全部章节目录）、章节页底部"上一章/下一章 + 返回目录"。
- 归档（时间线）、分类、标签、关于、自定义 404。

### 好用功能
- **全站搜索**：Pagefind 静态搜索页，支持中文（构建后实测检索"肖洱"等词）。
- **Giscus 评论**：文章页底部，开关配置化。
- **打赏升级保留**：微信/支付宝二维码折叠展示，链接改自托管/可配置。
- **分享升级**：优先调用系统原生 Web Share（手机），桌面端提供"复制链接"。
- **RSS 订阅** + 每页底部订阅入口。
- **SEO**：自动 sitemap、canonical、OG 卡片、JSON-LD、保留站长验证 meta。
- 回到顶部（替代旧 rocket，样式简化）。

### 发文流程（更简单）
1. GitHub 仓库网页端进入 `src/content/posts/` → Add file → Create new file（或直接复制 `content-template.md`）。
2. 命名 `作品名-章节号.md`，粘贴正文（可用任意 Markdown 编辑器先写好）。
3. Commit 到 `main` → Actions 约 1 分钟自动上线；`draft: true` 的文章不发布。
4. 仓库根目录提供 `写作指南.md`，含 frontmatter 各字段说明、如何给小说加新章节、如何插图（上传 `public/img/` 或贴图床）。
5. 备用：本地 `npm run new <slug>` 脚手架脚本（可选，非必需）。

## 五、实施步骤（依赖顺序）

1. 建 `legacy-site` 备份分支；在 `main` 初始化 Astro 工程（astro、@astrojs/rss、@astrojs/sitemap、pagefind、typescript）。
2. 配置 `astro.config.mjs`（site=https://zhouxiao9.top、sitemap、redirects、Pagefind 构建钩子）、`consts.ts`、全局样式与三主题变量。
3. 定义 content collections schema（posts / books），写迁移脚本并产出 2 篇文章 + 书籍 yml + 关于页，逐段校对。
4. 搭建布局与公共组件：BaseHead（SEO/meta/canonical/OG/JSON-LD）、Header/Footer、ThemeToggle、PostCard、Toc、Pager、Donate、Share。
5. 实现页面：首页、posts 详情（含阅读进度/字号/目录/上下章/打赏/分享/Giscus）、books 列表与书籍页、archive、categories、tags、about、404。
6. 接入 Pagefind 搜索页与 RSS（`rss.xml.js`）；迁移 robots.txt、CNAME、favicon、本地图片。
7. 编写 GitHub Actions 部署工作流；仓库 Settings → Pages → Source 改为 "GitHub Actions"。
8. 编写 `写作指南.md` 与 `content-template.md`；清理旧文件。
9. 本地 `npm run build && npm run preview` 全量验证后推送上线。

## 六、依赖与注意事项

- 运行时依赖仅：`astro`、`@astrojs/rss`、`@astrojs/sitemap`、`pagefind`（构建期）；迁移脚本用 `turndown`（devDependencies，一次性）。
- Giscus 上线前需要在 GitHub 仓库一次性操作：Settings → General → 勾选 **Discussions**；安装 [giscus app](https://github.com/apps/giscus)；获取 `repo id / category id` 填入 `consts.ts`。在配置完成前评论区自动隐藏，不阻塞上线。
- 自有域名：`public/CNAME` 内容仍为 `zhouxiao9.top`；DNS 无需改动；首次用 Actions 部署后需确认域名勾选未掉（必要时重新勾选 Enforce HTTPS）。
- 旧 gitment 页面中暴露的 OAuth client_id 随旧站一并废弃，不迁移。
- Node 版本：Actions 用 Node 20 LTS；本地仅在想用脚本时才需要 Node。

## 七、验证

- `npm run build` 无报错；`npm run preview` 逐页检查：首页、2 篇旧文、书籍页/目录、分类、标签、归档、关于、404、搜索、RSS、sitemap。
- 功能手测：三主题切换与持久化、字号调节、TOC 锚点、上下章跳转、阅读进度、复制链接、打赏展开、Giscus 加载、移动端 375px 视口排版。
- 搜索实测中文词："肖洱""孤岛"等能命中文档。
- 旧链接 `/2019/06/14/xiaoerdechuan-0(-01)/` 正确 301 到新 URL。
- 线上确认 `https://zhouxiao9.top` 可访问、HTTPS 正常、RSS（`/rss.xml`）和 sitemap（`/sitemap-index.xml`）可打开。

## 八、风险与应对

- **Giscus 未配置 → 评论缺失**：组件按配置自动隐藏，后续补 ID 即可，不影响其他功能。
- **Pagefind 中文分词不理想**：降级为 MiniSearch + segmentit 本地索引方案，页面入口不变。
- **GitHub 图床国内加载慢**：头图/打赏码支持改为本地 `/img/` 路径，随时可切换（frontmatter/配置里改 URL）。
- **Actions 首次部署域名异常**：保留 CNAME 文件并在 Pages 设置中复查自定义域名与 HTTPS 勾选；旧产物在 `legacy-site` 分支，可秒级回滚。
- **文章量增长后的维护**：内容即文件，标签/分类/目录/搜索全部自动生成，无需手写任何页面。
