@echo off
REM ŞefPOS VDS API — sürekli döngü (ONSTART görevi). Dakikalık watchdog yedek.
cd /d C:\sefpos-deploy\vds-api
:loop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\sefpos-deploy\vds-api\vds-api-watchdog.ps1"
timeout /t 30 /nobreak >nul
goto loop
