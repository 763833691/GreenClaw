# GreenClaw 部署文档

## 1. 本地部署（推荐）

### 1.1 前置要求

- Docker Desktop（含 Docker Compose）
- 可访问模型服务（如 OpenAI 兼容接口，或本地模型网关）

### 1.2 启动步骤

1. 在项目根目录复制环境文件：

```bash
cp .env.example .env
```

2. 修改关键变量：

- `JWT_SECRET`：必须替换为强随机值
- `OPENAI_API_KEY`：如需云模型
- 端口冲突时修改 `FRONTEND_PORT/BACKEND_PORT/CALC_ENGINE_PORT`
- 如使用 Nginx 入口，确认：
  - `NGINX_HTTP_PORT`（默认 80）
  - `NGINX_HTTPS_PORT`（默认 443）
  - `FRONTEND_ORIGIN`（默认 `http://localhost:3000`）

3. 启动全部服务：

```bash
docker compose -f infra/compose/docker-compose.yml --env-file .env --profile edge up -d
```

如需启用 Nginx 统一入口（edge profile）：

```bash
docker compose -f infra/compose/docker-compose.yml --env-file .env --profile edge up -d
```

首次启用 HTTPS 前，在 `infra/nginx/certs/` 放入证书文件：

- `fullchain.pem`
- `privkey.pem`

本地可先用自签名证书（示例）：

```bash
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout infra/nginx/certs/privkey.pem \
  -out infra/nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```

4. 访问地址（推荐走 Nginx 统一入口）：

- 前端：`https://localhost`
- Landing：`https://localhost/landing`
- 后端健康检查：`https://localhost/api/health`
- 计算引擎健康检查：`http://localhost:8000/health`

如需直连调试：

- 前端 Dev：`http://localhost:3000`
- 后端 API：`http://localhost:4000`

### 1.3 停止与重启

```bash
docker compose -f infra/compose/docker-compose.yml down
docker compose -f infra/compose/docker-compose.yml --env-file .env --profile edge up -d
```

## 2. VPS 部署（Ubuntu 示例）

## 2.1 服务器准备

- 建议配置：2C4G 起步（团队试用建议 4C8G）
- 开放端口：`80/443`（公网），`22`（SSH）
- 安装 Docker 与 Compose Plugin

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

## 2.2 拉取代码并配置

```bash
git clone <your-repo-url> greenclaw
cd greenclaw
cp .env.example .env
```

建议至少修改：

- `JWT_SECRET`
- `OPENAI_API_KEY`
- 各服务端口（若与系统已有服务冲突）

## 2.3 启动服务

```bash
docker compose -f infra/compose/docker-compose.yml --env-file .env --profile edge up -d
```

## 2.4 反向代理（Nginx）

仓库已提供配置：`infra/nginx/conf.d/default.conf`，规则如下：

- `/` -> `frontend:3000`
- `/api/*` -> `backend:4000`

生产环境建议配置 Let's Encrypt（Certbot）或 Cloudflare 证书，并开启 80 -> 443 跳转。

## 3. 运维注意事项

- 不要将 `.env`、`data/` 上传公开仓库。
- 升级前先备份 `data/`（包含项目和用户数据）。
- 定期轮换 `JWT_SECRET`（需配套会话失效策略）。
- 生产环境建议增加：
  - 限流（Nginx/网关层）
  - 请求日志与审计日志
  - 异常告警（如 Sentry/Prometheus + Alertmanager）
