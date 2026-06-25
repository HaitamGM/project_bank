# BankIA Project Starter for PowerShell
$host.ui.RawUI.WindowTitle = "BankIA Starter"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                    BankIA - Project Starter" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we are running from the script's directory
if ($PSScriptRoot) {
    Set-Location $PSScriptRoot
}

# Verify folders
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "[ERROR] Directory structure incorrect. Please run from the root of the project." -ForegroundColor Red
    Exit
}

# Detect virtual environment
$venvName = ".mivenv"
if (-not (Test-Path "backend\.mivenv")) {
    if (Test-Path "backend\.venv") {
        $venvName = ".venv"
    } else {
        $venvName = $null
    }
}

Write-Host "[1/2] Launching Backend Server in a new PowerShell window..." -ForegroundColor Yellow
if ($venvName) {
    Write-Host "  Using virtual environment: backend\$venvName" -ForegroundColor Gray
    # Run in a new PowerShell window, bypass execution policy, and activate the environment
    Start-Process powershell -WorkingDirectory $PSScriptRoot -ArgumentList "-ExecutionPolicy Bypass", "-NoExit", "-Command", "cd backend; & .\$venvName\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
} else {
    Write-Host "  [WARNING] No virtual environment found. Running globally..." -ForegroundColor DarkYellow
    Start-Process powershell -WorkingDirectory $PSScriptRoot -ArgumentList "-NoExit", "-Command", "cd backend; uvicorn app.main:app --reload --port 8000"
}

Write-Host "[2/2] Launching Frontend Server in a new PowerShell window..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory $PSScriptRoot -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "Success: Both backend and frontend have been launched in new windows!" -ForegroundColor Green
Write-Host " - Backend: http://localhost:8000" -ForegroundColor Green
Write-Host " - Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
