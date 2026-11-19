@echo off
title SatyaShield / SENTINEL-ID - 1-Click Launch Terminal
color 0B
cls

echo ===============================================================================
echo                SATYASHIELD / SENTINEL-ID - 1-CLICK LAUNCHER                   
echo         AI-Powered Document Screening and Identity Forensics Command Center    
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [*] Checking Node.js environment...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [!] ERROR: Node.js is not installed or not found in system PATH.
    echo [*] Please install Node.js (v18+) from https://nodejs.org
    pause
    exit /b 1
)

echo [v] Node.js environment ready.
echo [*] Freeing up operational ports (5000, 3000)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [*] Initializing SatyaShield full-stack system...
echo [*] Backend API:      http://localhost:5000
echo [*] Frontend Web App: http://localhost:3000
echo [*] Opening default web browser in a few seconds...
echo.

npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [!] System exited with code %errorlevel%.
    pause
)
