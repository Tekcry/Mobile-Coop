@echo off
rem Starts the Kestrel level editor for the home network: phones and tablets on the same Wi-Fi can open it AND save.
rem It uses https with the editor's own certificate (iOS allows controllers only on secure pages).
rem Only devices on the home network can save (never the internet). Close this window to stop it.
cd /d "%~dp0"
if not exist node_modules call npm install
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\kestrel\editor-cert.ps1
set KESTREL_EDITOR_LAN=1
set KESTREL_EDITOR_HTTPS=1
echo.
echo On your phone open the Network address printed below with editor.html on the end,
echo for example  https://192.168.1.249:5199/editor.html
echo First time only: install the certificate from  https://<that address>/__editor/cert.crt  (see docs\kestrel\editor.md)
echo.
call npx vite --port 5199 --host
pause
