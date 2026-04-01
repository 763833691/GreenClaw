Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\..\apps\frontend"

if (-not (Test-Path ".env.local") -and (Test-Path ".env.local.example")) {
  Copy-Item ".env.local.example" ".env.local"
  Write-Host "Created apps/frontend/.env.local from .env.local.example"
}

$env:NEXT_PUBLIC_API_BASE = "http://localhost:4000"
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000"
$env:NEXT_PUBLIC_GATEWAY_URL = "http://localhost:4000"

Write-Host "Starting frontend on http://127.0.0.1:3000 (also http://localhost:3000) ..."
Write-Host "若 Cursor 内置页提示「无效响应」，请用系统 Chrome/Edge 打开上述地址，并确认地址栏是 http 而非 https。"
pnpm dev
