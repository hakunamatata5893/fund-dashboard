@echo off
setlocal
cd /d "%~dp0"
title Fund Dashboard

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-fund-dashboard.ps1"
if errorlevel 1 goto :failed

endlocal
exit /b 0

:failed
echo.
echo [ERROR] Fund Dashboard failed to start. Review the message above.
pause
endlocal
exit /b 1
