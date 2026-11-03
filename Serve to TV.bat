@echo off
rem Serves this folder on your home network so a TV browser can open it.
rem On the TV, open:  http://<this PC's IP>:8000/   (your IPs are listed below)
cd /d "%~dp0"
echo.
echo  Open one of these on the TV browser:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo    http://%%a:8000/
echo.
python -m http.server 8000 2>nul || py -m http.server 8000
