# Easy-homepage

Mosu 的个人主页（https://mosuyang.org）。主线是"学 → 做 → 跑"：博客笔记、项目和线上服务连成一张图。

- **首屏**：身份、`学 / 做 / 跑` 三个数字、联系方式，以及合并博客和项目的动态日志
- **星图**：项目、博客分类和服务器之间的真实关系，可以悬停、点击、拖动
- **流水线**：写小说 → 拆分镜 → 生成素材 → 剪成片
- **博客**：打包时从 Halo 拉取最新文章，并标出关联的项目
- **时间线**：博客和项目两条轨道，用弧线连起"学了什么、多久后做出来"
- 按 `` ` `` 打开终端：`ls`、`open <项目>`、`visit <项目>`、`blog`……

## Run

```bash
npm install
npm run dev
```

## 加一个项目

只需要改 `src/data/graph.js`：在 `PROJECTS` 里加一项，再到 `EDGES` 或 `POST_LINKS` 里写清楚它和谁有关。星图、时间线和终端都会自动更新。私有仓库把 `repo` 设为 `null`，页面上就不会出现代码链接。

## 博客数据

`npm run build` 之前会先运行 `scripts/fetch-blog.mjs`，从 halo.mosuyang.org 拉取文章，写入 `src/data/blog.json`。拉取失败时沿用上一次的数据。Halo 的接口不允许浏览器跨域访问，所以只能在打包时拉。

## Deploy

```bash
./deploy/deploy.sh
```

服务器地址等配置放在 `deploy/.env`（不提交）。部署方式见 `deploy/` 目录。
