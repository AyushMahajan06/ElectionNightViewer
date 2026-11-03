@echo off
cd /d "%~dp0"
set "ADB=%~dp0platform-tools\adb.exe"
"%ADB%" connect 192.168.8.152:5555 >nul
"%ADB%" exec-out screencap -p > tv.png
"%ADB%" shell wm size
"%ADB%" shell wm density
echo Saved tv.png
