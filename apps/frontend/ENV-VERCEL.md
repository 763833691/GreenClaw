# Vercel 环境变量清单（复制到控制台）

## 完整部署步骤

1. **准备公网后端**（二选一或同时）：用 ngrok/云主机暴露 `apps/backend`；可选再暴露 Python 计算服务。记录 **HTTPS 根地址**（无路径后缀）。  
2. **后端环境**：设置 `FRONTEND_ORIGIN=https://<你的>.vercel.app`、`COOKIE_SECURE=true`、强随机 `JWT_SECRET`。  
3. **登录 [Vercel](https://vercel.com)** → **Add New Project** → 导入本 Git 仓库。  
4. **Root Directory**：填 **`apps/frontend`**（不要选仓库根目录）。  
5. **Framework Preset**：应自动识别 Next.js；**Build Command** `pnpm run build`，**Install Command** `pnpm install`（`vercel.json` 已写）。  
6. **Environment Variables**：按下文 **方案 A** 或 **方案 B** 粘贴变量（同一方案内不要混用）。  
7. **Deploy**。首次成功后打开 **Domains** 下的 URL。  
8. **验证**：见文末「部署后验证」；接口失败时检查后端日志与 CORS。

---

在 Vercel → Project → **Settings** → **Environment Variables** 中新增。  
**Production / Preview** 建议勾选一致（演示阶段）；敏感项仅 Production。

---

## 方案 A：同源转发（推荐，避免浏览器跨域）

前端请求 `https://你的应用.vercel.app/api/...`，由 Next.js **rewrite** 转到公网后端。

| Name | Value 示例 | Environment | 说明 |
|------|----------------|-------------|------|
| `VERCEL_BACKEND_ORIGIN` | `https://xxxx.ngrok-free.app` | Production, Preview | **必填**。无尾斜杠。ngrok/云主机上 **apps/backend** 的根 URL。 |
| `NEXT_PUBLIC_API_BASE` | 留空或 `same-origin` | Production, Preview | 走同源 `/api`，与上项配合。 |

可选：用 `BACKEND_PROXY_URL` 代替 `VERCEL_BACKEND_ORIGIN`（二选一即可，代码等价）。

**后端（非 Vercel）必须配置：**

| Name | 说明 |
|------|------|
| `FRONTEND_ORIGIN` | `https://你的项目.vercel.app`（含 Preview 时需加 `*.vercel.app` 或多条） |
| `COOKIE_SECURE` | `true` |
| `JWT_SECRET` | 长随机串，与本地分离 |

---

## 方案 B：浏览器直连后端（跨域）

不设 `VERCEL_BACKEND_ORIGIN`，由浏览器直接请求 ngrok/云 API。

| Name | Value 示例 | Environment | 说明 |
|------|----------------|-------------|------|
| `NEXT_PUBLIC_API_BASE` | `https://xxxx.ngrok-free.app` | Production, Preview | 与下面两项保持一致 |
| `NEXT_PUBLIC_API_BASE_URL` | 同上 | Production, Preview | 与 `api-client` 兼容 |
| `NEXT_PUBLIC_GATEWAY_URL` | 同上 | Production, Preview | 与上面一致 |

**后端 CORS** 必须允许：`https://*.vercel.app` 或你的固定预览域名。

---

## 计算服务（可选，供后续直连或文档）

| Name | Value 示例 | 说明 |
|------|----------------|------|
| `NEXT_PUBLIC_CALC_API_BASE_URL` | `https://yyyy.ngrok-free.app` | 当前前端未强依赖；预留 Python `/calculate` 公网地址 |

---

## 仅文档 / 无需填 Vercel（在后端进程或云主机上配置）

| Name | 说明 |
|------|------|
| `JWT_SECRET` | 后端签发 JWT；与 Vercel 无关，写在后端环境 |
| `JWT_EXPIRES_IN` | 如 `15m` |
| `JWT_REFRESH_EXPIRES_IN` | 如 `30d` |
| `ACCESS_COOKIE_NAME` | 默认 `gc_access` |
| `REFRESH_COOKIE_NAME` | 默认 `gc_refresh` |
| `CALC_ENGINE_URL` | 后端调 Python 时用，如 `https://python-ngrok/...` |
| `FRONTEND_ORIGIN` | **必须**为前端 Vercel URL |

---

## 部署后验证（勾选）

1. 打开 `https://<project>.vercel.app`  
2. 首页「后端连通」为绿色或 `/api/health` 可达  
3. 注册/登录 → 新建项目 → 计算中心「快速测试」或带 projectId 计算  
4. 优化助手、报告中心可打开  

---

## 说明

- Vercel **构建时**会注入 `NEXT_PUBLIC_*`；改完后需 **Redeploy**。  
- `VERCEL_BACKEND_ORIGIN` 在 **next.config.mjs** 中参与 rewrites，同样需重新部署生效。  
- 演示账号由后端在非 production 创建；生产环境请关闭或改用真实账号体系。
