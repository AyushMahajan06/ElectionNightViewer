@echo off
cd /d "%~dp0"
title Election Night - connect TV
set "TV_IP=192.168.8.152"
set "PAIR_CODE=348896"
rem Optional: pass the PC address the TV should use, e.g.   "Connect TV.bat" 172.16.0.2
set "PC_IP=%~1"

rem ---- 1. current platform-tools next to this file (downloaded once from dl.google.com) ----
set "ADB=%~dp0platform-tools\adb.exe"
if not exist "%ADB%" (
  echo Downloading Google platform-tools ...
  powershell -NoProfile -Command "Invoke-WebRequest https://dl.google.com/android/repository/platform-tools-latest-windows.zip -OutFile pt.zip; Expand-Archive pt.zip -DestinationPath . -Force; Remove-Item pt.zip"
)
"%ADB%" --version | findstr /i "version"
"%ADB%" kill-server >nul 2>nul
"%ADB%" start-server >nul 2>nul

rem ---- 2. discover the TV's ports over mDNS ----
set "PAIR_ADDR=" & set "CONN_ADDR="
"%ADB%" mdns services > "%TEMP%\adb_mdns.txt" 2>nul
type "%TEMP%\adb_mdns.txt"
for /f "tokens=3" %%a in ('findstr /i "_adb-tls-pairing" "%TEMP%\adb_mdns.txt"') do set "PAIR_ADDR=%%a"
for /f "tokens=3" %%a in ('findstr /i "_adb-tls-connect" "%TEMP%\adb_mdns.txt"') do set "CONN_ADDR=%%a"

rem ---- 3. try plain network debugging first (port 5555, no pairing needed), then pair+connect ----
echo.
echo Trying %TV_IP%:5555 ...
"%ADB%" connect %TV_IP%:5555 | findstr /i "connected" && goto :connected
if defined PAIR_ADDR (
  echo Pairing with %PAIR_ADDR% using code %PAIR_CODE% ...
  "%ADB%" pair %PAIR_ADDR% %PAIR_CODE%
) else (
  echo No pairing service advertised. Open "Pair device with pairing code" on the TV and run this again.
)
if not defined CONN_ADDR set "CONN_ADDR=%TV_IP%:40003"
echo Connecting to %CONN_ADDR% ...
"%ADB%" connect %CONN_ADDR%
:connected
"%ADB%" devices

rem ---- 3b. keep the TV awake: no screensaver, no display sleep while the viewer runs ----
"%ADB%" shell settings put secure screensaver_enabled 0
"%ADB%" shell settings put system screen_off_timeout 2147483647
"%ADB%" shell svc power stayon true
echo Screensaver off, display sleep disabled on the TV.

rem ---- 4. browser on the TV? install TV Bro (open source, github.com/truefedex/tv-bro) if none ----
set "BROWSER="
"%ADB%" shell pm list packages > "%TEMP%\adb_pkgs.txt" 2>nul
for /f "delims=" %%a in ('findstr /i "chrome tvwebbrowser silk firefox puffin" "%TEMP%\adb_pkgs.txt"') do set "BROWSER=%%a"
echo Browser on TV: %BROWSER%
if not defined BROWSER (
  if not exist tvbro.apk echo Downloading TV Bro from its GitHub releases ...
  if not exist tvbro.apk powershell -NoProfile -Command "$r=Invoke-RestMethod https://api.github.com/repos/truefedex/tv-bro/releases/latest; $a=$r.assets | Where-Object { $_.name -like '*.apk' -and $_.name -notlike '*x86*' } | Select-Object -First 1; Invoke-WebRequest $a.browser_download_url -OutFile tvbro.apk; Write-Host ('Got ' + $a.name)"
  "%ADB%" install -r tvbro.apk
)

rem ---- 5. serve this folder on the LAN and open it on the TV ----
echo.
echo This PC's addresses:
ipconfig | findstr /c:"IPv4"
if not defined PC_IP for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr "192.168."') do if not defined PC_IP set "PC_IP=%%a"
if not defined PC_IP for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do if not defined PC_IP set "PC_IP=%%a"
set "PC_IP=%PC_IP: =%"
echo.
echo LAN address for the server: %PC_IP%   ^(default: ADB tunnel; "Connect TV.bat" lan  or  "Connect TV.bat" 172.16.0.2  to use a LAN/VPN address^)
tasklist /fi "WINDOWTITLE eq Election Night server*" | findstr /i "cmd.exe" >nul || start "Election Night server" /min cmd /c "python -m http.server 8000 || py -m http.server 8000"
echo.
rem Tunnel the TV's port 8000 to this PC over the ADB connection, so the TV loads the page from its own localhost
rem (works even when the firewall or a VPN blocks direct LAN access). Pass "lan" as the argument to use the LAN address instead.
set "URL=http://127.0.0.1:8000/index.html"
if /i "%~1"=="lan" set "URL=http://%PC_IP%:8000/index.html"
if /i not "%~1"=="" if /i not "%~1"=="lan" set "URL=http://%PC_IP%:8000/index.html"
"%ADB%" reverse tcp:8000 tcp:8000 >nul 2>nul && echo ADB tunnel: TV localhost:8000 -^> this PC:8000
timeout /t 2 >nul
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/index.html -TimeoutSec 5).StatusCode } catch { 'Local server NOT responding: ' + $_.Exception.Message }"
echo Opening %URL% on the TV ...
"%ADB%" shell am force-stop com.phlox.tvwebbrowser >nul 2>nul
"%ADB%" shell am start -a android.intent.action.VIEW -d "%URL%"
echo.
echo Done. If the TV asks which app to open with, pick TV Bro and choose Always.
pause
