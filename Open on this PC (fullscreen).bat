@echo off
rem Opens the election viewer full-screen in Chrome (press Alt+F4 to quit). Falls back to Edge.
set "F=%~dp0index.html"
where chrome >nul 2>nul && (start "" chrome --kiosk --autoplay-policy=no-user-gesture-required "file:///%F%" & exit /b)
start "" msedge --kiosk "file:///%F%" --edge-kiosk-type=fullscreen
