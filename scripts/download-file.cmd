@echo off
where pwsh >nul 2>nul
if errorlevel 1 (
    echo PowerShell 7.2 or later ^(pwsh^) is required but was not found on PATH. 1>&2
    exit /b 127
)

pwsh -NoLogo -NoProfile -File "%~dp0download-file.ps1" %*
exit /b %errorlevel%
