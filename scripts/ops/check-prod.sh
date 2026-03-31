#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  echo "✅ $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "❌ $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

section() {
  echo
  echo "== $1 =="
}

check_file_exists() {
  local file="$1"
  if [[ -f "$file" ]]; then
    pass "文件存在: $file"
  else
    fail "文件缺失: $file"
  fi
}

check_env_var() {
  local key="$1"
  if grep -Eq "^${key}=.+$" .env; then
    pass "环境变量存在: $key"
  else
    fail "环境变量缺失或为空: $key"
  fi
}

section "基础文件检查"
check_file_exists ".env"
check_file_exists "docker-compose.yml"
check_file_exists "docker-compose.prod.yml"
check_file_exists "infra/nginx/nginx.prod.conf"
check_file_exists "infra/nginx/certs/fullchain.pem"
check_file_exists "infra/nginx/certs/privkey.pem"

if ! command -v docker >/dev/null 2>&1; then
  fail "未检测到 docker 命令"
  echo
  echo "检查结束：✅ ${PASS_COUNT} / ❌ ${FAIL_COUNT}"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  fail "未检测到 docker compose 子命令"
  echo
  echo "检查结束：✅ ${PASS_COUNT} / ❌ ${FAIL_COUNT}"
  exit 1
fi

section "关键环境变量检查"
for key in JWT_SECRET REDIS_PASSWORD OPENAI_API_KEY FRONTEND_ORIGIN NEXT_PUBLIC_API_BASE_URL; do
  check_env_var "$key"
done

section "容器与健康状态检查"
if docker compose ps >/dev/null 2>&1; then
  pass "docker compose 可用"
else
  fail "docker compose 不可用"
fi

for svc in greenclaw-gateway greenclaw-frontend python-calculator redis nginx; do
  cid="$(docker compose ps -q "$svc" 2>/dev/null || true)"
  if [[ -z "${cid}" ]]; then
    fail "服务未运行: $svc"
    continue
  fi

  state="$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || true)"
  health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || true)"
  if [[ "$state" == "running" ]]; then
    pass "服务运行中: $svc (health=$health)"
  else
    fail "服务状态异常: $svc (state=$state, health=$health)"
  fi
done

section "端口监听检查"
for port in 80 443 18789; do
  if docker compose port nginx "$port" >/dev/null 2>&1; then
    pass "Nginx 端口已映射: $port"
  else
    if [[ "$port" == "18789" ]]; then
      if docker compose port greenclaw-gateway 18789 >/dev/null 2>&1; then
        pass "Gateway 本地端口已映射: 127.0.0.1:18789"
      else
        fail "Gateway 端口未映射: 127.0.0.1:18789"
      fi
    else
      fail "Nginx 端口未映射: $port"
    fi
  fi
done

section "Nginx 配置语法检查"
if docker compose exec -T nginx nginx -t >/dev/null 2>&1; then
  pass "Nginx 配置语法正确"
else
  fail "Nginx 配置语法检查失败"
fi

section "卷挂载检查"
for volume in greenclaw_redis_data greenclaw_gateway_data; do
  if docker volume inspect "$volume" >/dev/null 2>&1; then
    pass "卷存在: $volume"
  else
    fail "卷不存在: $volume"
  fi
done

echo
echo "检查结束：✅ ${PASS_COUNT} / ❌ ${FAIL_COUNT}"
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
