# 中美经济政策追踪（Economic Policy Tracker）

聚合中美财政、货币等政策相关公开信息：后端定时从 RSS 与网页采集，写入本地 SQLite；前端提供列表、时间线、货币政策工具与数据管理界面。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18、Vite 5 |
| 后端 | Node.js、Express |
| 存储 | sql.js（SQLite 文件：`backend/data/policies.db`） |
| 采集 | rss-parser、cheerio、axios、node-cron |

## 目录结构

```
news/
├── backend/
│   ├── src/
│   │   ├── index.js              # 入口：Express + 定时任务
│   │   ├── database.js             # 数据库初始化、查询、种子数据
│   │   ├── routes/api.js         # REST API
│   │   └── collectors/           # RSS、爬虫、调度、数据源配置
│   └── data/policies.db          # 运行时生成（首次启动创建）
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/           # Dashboard、筛选、卡片、时间线、工具、数据管理
│   │   └── services/api.js       # 前端 API 调用
│   └── vite.config.js            # 开发代理 /api → localhost:3001
├── start.bat                     # Windows 启动脚本（见下文说明）
└── README.md
```

## 快速开始

### 前置条件

- Node.js（建议 LTS）
- 分别在 `backend`、`frontend` 执行过一次 `npm install`

### 开发模式（推荐）

1. 终端一 — 后端（默认端口 **3001**）：

   ```bash
   cd backend
   npm run dev
   ```

2. 终端二 — 前端（默认端口 **5173**，`/api` 由 Vite 代理到后端）：

   ```bash
   cd frontend
   npm run dev
   ```

3. 浏览器打开：<http://localhost:5173>

### 生产构建（前端）

```bash
cd frontend
npm run build
```

产物在 `frontend/dist/`，需由静态服务器托管，并将 `/api` 反向代理到后端。

### `start.bat` 说明

脚本顺序执行：先进入 `backend` 运行 `npm run dev`。`node --watch` 会持续占用当前窗口，**不会自动执行后面的前端命令**。若需一键双开，请使用两个终端分别启动前后端，或将后端改为在新窗口中启动。

## 环境变量

- `PORT`：后端监听端口，默认 `3001`。

## API 摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/policies` | 分页查询；查询参数：`country`、`source`、`category`、`q`、`page`、`limit` |
| GET | `/api/stats` | 按国家/来源/分类统计 |
| POST | `/api/collect` | 手动触发采集；Body 可选 `{ "month": "YYYY-MM" }` |
| GET | `/api/sources` | 已配置数据源列表 |
| GET | `/api/tools/operations/:toolId` | 货币政策工具操作记录 |
| POST | `/api/tools/operations` | 录入工具操作（去重逻辑见 `database.js`） |

## 数据模型（概要）

### `policies`

- `title`、`summary`、`url`（唯一）、`source`
- `country`：`cn` | `us`
- `category`：`finance` | `policy` | `fiscal` | `monetary`
- `publish_date`、`collected_at`

### `tool_operations`

按 `tool_id` 记录公开市场等工具操作（金额、利率、期限、方向等）；首次空库时会写入内置种子数据。

## 定时采集

服务启动后：

- 立即执行一次全量采集；
- 之后按 cron **`0 */6 * * *`**（约每 6 小时）重复执行。

逻辑见 `backend/src/collectors/scheduler.js` 与 `backend/src/index.js`。

## 注意事项

- 采集依赖目标网站可访问性及页面结构；网络或站点改版可能导致条目缺失或解析失败。
- 若使用 Git，建议在 `.gitignore` 中排除 `node_modules/`、`backend/data/*.db`（按需保留示例库除外）。

## 许可证

未在仓库中声明时，以项目所有者约定为准。
