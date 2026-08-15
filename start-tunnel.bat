@echo off
rem Cloudflare 隧道自愈启动器（双击运行即可，Ctrl+C 退出）
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start-tunnel.ps1"
pause
