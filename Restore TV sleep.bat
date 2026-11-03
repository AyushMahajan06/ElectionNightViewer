@echo off
rem Puts the TV's screensaver and display-sleep settings back to normal after election night.
cd /d "%~dp0"
set "ADB=%~dp0platform-tools\adb.exe"
"%ADB%" connect 192.168.8.152:5555 >nul
"%ADB%" shell settings put secure screensaver_enabled 1
"%ADB%" shell settings put system screen_off_timeout 600000
"%ADB%" shell svc power stayon false
echo Restored: screensaver on, display sleeps after 10 minutes.
pause
