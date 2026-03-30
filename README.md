# GreenClaw（绿建龙虾）

GreenClaw 是面向建筑设计与咨询场景的产品级绿建计算智能体。项目参考 [OpenClaw](https://github.com/openclaw/openclaw) 的理念（Gateway + Agent Loop + 持久记忆 + 心跳调度），并聚焦中国本地化绿建流程：GB/T 50378 评价、能耗/碳排计算、优化建议和报告导出。

## 核心能力

- 多用户认证与项目隔离（JWT + owner 归属控制）
- Web UI 工作台（仪表盘、项目详情、计算中心、优化助手、报告页）
- Agent 配置（`SOUL.md`、`AGENTS.md`、`HEARTBEAT.md`、工具契约）
- Python 计算引擎（FastAPI，占位可扩展 pyBuildingEnergy / EnergyPlus）
- Docker Compose 一键启动（frontend + backend + calc-engine + redis + nginx）

## 快速开始

```bash
cp .env.example .env
docker compose -f infra/compose/docker-compose.yml --env-file .env --profile edge up -d
```

启用 Nginx 统一入口（可选）：

```bash
docker compose -f infra/compose/docker-compose.yml --env-file .env --profile edge up -d
```

访问（通过 Nginx 统一入口）：

- 工作台：`http://localhost`（启用 edge profile）
- Landing Page：`http://localhost/landing`（启用 edge profile）
- 后端健康检查：`http://localhost/api/health`（启用 edge profile）
- 计算服务健康检查：`http://localhost:8000/health`

也可直接访问开发端口：

- 前端（Next dev）：`http://localhost:3000`
- 后端（Node API）：`http://localhost:4000`

> 使用 edge profile 前，请准备证书文件：`infra/nginx/certs/fullchain.pem` 与 `infra/nginx/certs/privkey.pem`。

## 用户认证与项目隔离（当前实现）

后端提供基础认证与隔离 API（`apps/backend/src/index.js`）：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id/params`

隔离原则：项目数据保存 `ownerId`，查询与修改均强制按当前登录用户过滤。

## 项目结构

```text
apps/
  frontend/          # Next.js 14 前端
  backend/           # Node.js 网关（认证 + 项目 API）
packages/
  calculation/       # FastAPI 计算服务
  agent/             # Agent 配置与工具契约
infra/compose/
  docker-compose.yml # 一键部署编排
docs/
  deployment.md      # 本地 + VPS 部署说明
  security-best-practices.md
```

## 文档导航

- 部署文档：`docs/deployment.md`
- 安全最佳实践：`docs/security-best-practices.md`
- Agent 配置：
  - `packages/agent/SOUL.md`
  - `packages/agent/AGENTS.md`
  - `packages/agent/HEARTBEAT.md`
  - `packages/agent/tools/greenclaw-tools.yaml`

## 生产建议

- 修改 `.env` 中默认密钥（尤其 `JWT_SECRET`）
- 使用 `infra/nginx/conf.d/default.conf` 作为反向代理模板（`/` -> frontend，`/api` -> backend）
- 前置 HTTPS（80/443，可配合 Let's Encrypt）
- 将 backend/calc-engine 放在内网，前端或网关作为唯一公网入口
- 定期备份 `data/` 目录
