@echo off
title BankIA Starter
color 0A
echo =====================================================================
echo                     BankIA - Project Starter
echo =====================================================================
echo.

:: Ensure we are running from the script's directory
cd /d "%~dp0"

:: Check folders
if not exist "backend" (
    echo [ERROR] backend directory not found!
    goto error
)

if not exist "frontend" (
    echo [ERROR] frontend directory not found!
    goto error
)

:: Detect venv
set VENV_DIR=.mivenv
if not exist "backend\.mivenv" (
    if exist "backend\.venv" (
        set VENV_DIR=.venv
    ) else (
        set VENV_DIR=none
    )
)

echo [1/2] Launching Backend Server...
if "%VENV_DIR%"=="none" (
    echo [WARNING] No virtual environment (.mivenv or .venv) found.
    echo Attempting to launch backend with global python environment...
    start "BankIA Backend" /d "%~dp0" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"
) else (
    echo [INFO] Using virtual environment: backend\%VENV_DIR%
    start "BankIA Backend" /d "%~dp0" cmd /k "cd backend && call %VENV_DIR%\Scripts\activate && uvicorn app.main:app --reload --port 8000"
)

echo [2/2] Launching Frontend Server...
start "BankIA Frontend" /d "%~dp0" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo Success: Both backend and frontend are starting!
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:5173
echo =====================================================================
echo.
pause
exit

:error
echo.
echo [ERROR] Launch failed. Please run this script from the root
echo directory of the BankIA project.
echo.
pause
