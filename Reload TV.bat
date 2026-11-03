@echo off
cd /d "%~dp0"
set "ADB=%~dp0platform-tools\adb.exe"
"%ADB%" connect 192.168.8.152:5555 >nul
"%ADB%" reverse tcp:8000 tcp:8000 >nul 2>nul
"%ADB%" shell am force-stop com.phlox.tvwebbrowser
timeout /t 2 >nul
"%ADB%" shell am start -a android.intent.action.VIEW -d "http://127.0.0.1:8000/index.html?r=%RANDOM%"
timeout /t 14 >nul
"%ADB%" exec-out screencap -p > tv.png
echo Reloaded; tv.png saved
