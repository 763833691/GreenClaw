Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\..\packages\calculation"

if (-not (Test-Path ".venv")) {
  Write-Host "Creating Python virtual environment ..."
  python -m venv .venv
}

if (Test-Path ".venv\Scripts\Activate.ps1") {
  . ".venv\Scripts\Activate.ps1"
} else {
  throw "Python virtual environment activation script not found."
}

python -m pip install --upgrade pip
pip install -r requirements.txt

Write-Host "Starting python-calculator on http://localhost:8000 ..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
