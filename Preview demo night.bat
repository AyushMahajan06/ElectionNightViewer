@echo off
rem Opens the viewer in DEMO mode: fake results pour in every 30 s so you can preview the whole night
rem (map fills, panels rotate, every Democratic call fires one of the animations). Alt+F4 quits.
set "F=%~dp0index.html"
where chrome >nul 2>nul && (start "" chrome --kiosk "file:///%F%#demo" & exit /b)
start "" msedge --kiosk "file:///%F%#demo" --edge-kiosk-type=fullscreen
