# GreenClaw（OpenClaw Gateway + Agent）

GreenClaw 是面向建筑设计与咨询场景的绿建计算智能体。  
本项目已经从 Vercel Serverless 方案迁移到 **Docker Compose 常驻服务部署**，用于稳定支撑 OpenClaw Gateway 与 Agent 的长连接、轮询与持久运行能力。

## 部署方式说明

- 当前唯一推荐部署入口：根目录 `docker-compose.yml`
- `infra/compose/` 下旧版编排已废弃，请勿继续使用
- 团队脚本、运维文档和 CI/CD 请统一指向根目录 Compose 文件

## 开发与部署流程

本地开发命令：

```bash
pnpm install
pnpm --filter backend dev
pnpm --filter frontend dev
cd packages/calculation && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Git 推送后前端自动部署（Vercel）：

1. 前端项目在 Vercel 绑定 `apps/frontend` 目录  
2. 推送到 GitHub 对应分支后自动触发构建  
3. 在 Vercel 配置 `NEXT_PUBLIC_API_BASE` 指向后端网关域名

后端生产部署（Docker Compose）：

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose ps
```

## 生产环境部署

一键启动（生产模式）：

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

HTTPS 启用步骤：

1. 准备证书文件：`infra/nginx/certs/fullchain.pem` 和 `infra/nginx/certs/privkey.pem`
2. 在 `.env` 中配置生产域名与关键变量（`DOMAIN`、`FRONTEND_ORIGIN`、`JWT_SECRET`、`REDIS_PASSWORD`）
3. 使用生产覆盖编排启动并检查 `nginx` 健康状态

安全注意事项：

- 必须替换默认密钥（`JWT_SECRET`、`REDIS_PASSWORD`）
- 仅暴露 `nginx` 的 80/443 端口，其他服务走内网
- 使用 HTTPS 并启用 HSTS，避免明文会话
- 关注限流命中与 429/5xx 错误日志，及时扩容或调参

常用运维命令：

```bash
# 查看服务与健康状态
docker compose ps

# 查看实时日志
docker compose logs -f nginx
docker compose logs -f greenclaw-gateway

# 重启单个服务
docker compose restart nginx

# 备份 Redis 卷
docker run --rm -v greenclaw_redis_data:/data -v $(pwd)/backups:/backup alpine sh -c "tar czf /backup/redis_data_$(date +%F_%H%M%S).tar.gz -C /data ."

# 备份 Gateway 数据卷
docker run --rm -v greenclaw_gateway_data:/data -v $(pwd)/backups:/backup alpine sh -c "tar czf /backup/gateway_data_$(date +%F_%H%M%S).tar.gz -C /data ."
```

## 远程调试 / 内测

前端远程调试（前后端分离）建议使用 `NEXT_PUBLIC_API_BASE`（兼容 `NEXT_PUBLIC_GATEWAY_URL`）：

```bash
# apps/frontend/.env.local
NEXT_PUBLIC_API_BASE=http://localhost:18789
# 生产示例
# NEXT_PUBLIC_API_BASE=https://api.your-domain.com
```

Vercel 部署步骤（前端）：

1. 在 Vercel 连接 GitHub 仓库并选择 `apps/frontend` 作为 Root Directory  
2. 在项目环境变量中设置：`NEXT_PUBLIC_API_BASE=https://你的后端域名`  
3. 执行部署（可用 `pnpm --filter frontend build:verbose` 本地预检构建日志）  
4. 部署后验证登录态、跨域 Cookie 与 API 可达性

测试 Checklist：

- 登录后能正常拉取项目列表（`GET /api/projects`）
- 计算中心可触发任务并轮询到 `completed`
- 优化助手可调用 `POST /api/agent/chat` 并返回 Agent Loop 步骤
- 未登录访问受保护页面会被中间件重定向到登录页

## 服务架构（Docker Compose）

根目录 `docker-compose.yml` 包含以下服务：

- `greenclaw-gateway`：Node.js Gateway + Agent
- `greenclaw-frontend`：Next.js 前端
- `python-calculator`：FastAPI 计算引擎
- `redis`：队列/缓存/记忆支持
- `nginx`：统一入口反向代理（附 HTTPS 模板）

## 本地开发（不走 Docker）

1) 安装依赖

```bash
pnpm install
```

2) 启动后端（Gateway）

```bash
pnpm --filter backend dev
```

3) 启动前端

```bash
pnpm --filter frontend dev
```

4) 启动 Python 计算引擎

```bash
cd packages/calculation
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker 一键部署（推荐）

1) 准备环境变量

```bash
cp .env.example .env
```

2) 启动全部服务

```bash
docker compose up -d
```

生产覆盖（启用 HTTPS、Redis 密码、更严格配置）：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

3) 查看服务状态

```bash
docker compose ps
docker compose logs -f greenclaw-gateway
```

## VPS 部署说明（Railway / Render / 腾讯云 / 阿里云）

- **Railway / Render**
  - 创建新服务，选择 Docker Compose 或分别部署 5 个服务
  - 导入 `.env` 中的关键变量（尤其 `JWT_SECRET`、`OPENAI_API_KEY`）
  - 暴露 `nginx` 的 80/443 端口，其他服务仅内网访问
- **腾讯云 / 阿里云（云服务器）**
  - 安装 Docker 与 Docker Compose
  - 拉取仓库并配置 `.env`
  - 执行 `docker compose up -d`
  - 用安全组放行 80/443（可选 22）
  - 建议用 Nginx + 证书（Let's Encrypt）启用 HTTPS

## 访问方式

- 统一入口：`http://localhost`
- 前端（直连）：`http://localhost:3000`
- 后端健康检查：`http://localhost/api/health`
- Python 计算引擎健康检查：`http://localhost:8000/health`

## HTTPS 模板

`infra/nginx/nginx.conf` 已启用 HTTPS、安全头和限流。  
生产环境建议使用 `infra/nginx/nginx.prod.conf`（由 `docker-compose.prod.yml` 挂载）：

1. 将证书文件放到 `infra/nginx/certs/fullchain.pem` 和 `infra/nginx/certs/privkey.pem`  
2. 使用生产覆盖 compose 启动  
3. 重启容器（如已运行）：

```bash
docker compose restart nginx
```

## 生产环境最佳实践（已落地）

- 安全强化：`nginx` 已配置 Security Headers、HTTPS 重定向、请求方法限制、敏感文件访问拦截、`/api` 限流
- 健康检查：`gateway`、`frontend`、`python-calculator`、`redis`、`nginx` 均配置 `healthcheck`
- 可观测性：所有服务统一 `json-file` 日志驱动，包含日志滚动策略（`10m` / `3` 文件）
- 持久化：`redis_data`、`gateway_data` 为持久卷，避免容器重建后数据丢失
- 生产分离：新增 `docker-compose.prod.yml` 覆盖生产专用配置

## 备份建议（数据库/重要卷）

备份 Redis 卷：

```bash
docker run --rm -v greenclaw_redis_data:/data -v $(pwd)/backups:/backup alpine \
  sh -c "tar czf /backup/redis_data_$(date +%F_%H%M%S).tar.gz -C /data ."
```

备份 Gateway 应用数据卷（SQLite / 记忆）：

```bash
docker run --rm -v greenclaw_gateway_data:/data -v $(pwd)/backups:/backup alpine \
  sh -c "tar czf /backup/gateway_data_$(date +%F_%H%M%S).tar.gz -C /data ."
```

建议在 VPS 上用 `crontab` 每日执行，并将 `backups/` 同步到对象存储。

## 生产建议

- 必须替换 `.env` 里的默认密钥（特别是 `JWT_SECRET`）
- 不要把 `greenclaw-gateway`、`python-calculator`、`redis` 直接暴露公网
- 定期备份 `data` 目录与 Redis 持久化数据
