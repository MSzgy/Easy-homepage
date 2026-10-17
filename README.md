# Easy-homepage

Mosu 的个人主页（https://mosuyang.org）。主线是"学 → 做 → 跑"：博客笔记、项目和线上服务连成一张图。

页面有两种浏览模式，右上角可以切换，也可以在网址后加 `?mode=story` 或 `?mode=geek` 直接打开某一种：

- **故事模式**（默认，面向所有人）：全屏的动态等高线地图。从 Mosu 出发，每条路通向一个博客方向，路上的地点就是在这个方向上做出来的作品。文字尽量少，点击地点会看到一句大白话介绍。
- **极客模式**（面向技术读者），包含以下区块：

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

## 数据自动更新

- **服务器端每小时同步**：`easy-homepage-sync.timer` 每小时运行一次 `scripts/sync-live.mjs`，从 Halo 拉取博客文章，从 GitHub 拉取公开仓库的更新时间，写入 `/var/lib/easy-homepage/live.json`。页面加载时会读取这份文件，所以发了新文章不需要重新部署。
  - 同步任务以临时的无权限用户运行，只能写自己的数据目录，不需要任何密钥或 token。
  - 私有仓库的数据仍然手写在 `graph.js` 里。
- **打包时的兜底数据**：`npm run build` 之前会先运行 `scripts/fetch-blog.mjs`，把博客数据写进 `src/data/blog.json`，作为 `live.json` 读不到时的备用数据。
- Halo 的接口不允许浏览器跨域访问，所以只能在服务器端或打包时拉取。

手动触发一次同步：`sudo systemctl start easy-homepage-sync.service`，查看日志：`journalctl -u easy-homepage-sync`。

## Deploy

```bash
./deploy/deploy.sh
```

服务器地址等配置放在 `deploy/.env`（不提交）。部署方式见 `deploy/` 目录。
