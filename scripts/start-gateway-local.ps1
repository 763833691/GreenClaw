Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\.."

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.local.example") {
    Copy-Item ".env.local.example" ".env"
    Write-Host "Created .env from .env.local.example"
  } elseif (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
  } else {
    Write-Warning ".env not found. Please create it before running gateway."
  }
}

$env:PORT = "4000"
$env:FRONTEND_ORIGIN = "http://localhost:3000"

Write-Host "Starting greenclaw-backend on http://localhost:4000 ..."
pnpm --filter backend dev
