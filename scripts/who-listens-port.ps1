# List processes listening on a TCP port (default 4000). ASCII-only for Windows PowerShell encoding safety.
param(
    [int]$Port = 4000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

$rows = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $rows) {
    Write-Host "No LISTEN process on port $Port (or run as Admin to see more)."
    exit 0
}

Write-Host "Processes listening on port $Port :"
$rows | Select-Object -Property LocalAddress, LocalPort, OwningProcess -Unique | ForEach-Object {
    $procId = $_.OwningProcess
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    $name = if ($p) { $p.ProcessName } else { "?" }
    Write-Host ("  PID=" + $procId + "  Name=" + $name)
}

Write-Host ""
Write-Host "To stop one process (only if you know it is safe):"
Write-Host '  Stop-Process -Id YOUR_PID -Force'
