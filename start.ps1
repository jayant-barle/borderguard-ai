Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "               SATYASHIELD / SENTINEL-ID - 1-CLICK LAUNCHER                   " -ForegroundColor Cyan
Write-Host "        AI-Powered Document Screening and Identity Forensics Command Center    " -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

Write-Host "[*] Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] ERROR: Node.js is not installed or not in system PATH." -ForegroundColor Red
    Write-Host "[*] Please install Node.js (v18+) from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "[v] Node.js found." -ForegroundColor Green
Write-Host ""
Write-Host "[*] Launching SatyaShield Full-Stack Application..." -ForegroundColor Yellow
Write-Host "[*] Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "[*] Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

npm run dev
