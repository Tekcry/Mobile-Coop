@echo off
rem Starts the Kestrel level editor for the home network: phones and tablets on the same Wi-Fi can open it AND save.
rem Only devices on the home network can save (never the internet). Close this window to stop it.
cd /d "%~dp0"
if not exist node_modules call npm install
set KESTREL_EDITOR_LAN=1
echo.
echo On your phone, open the Network address printed below with editor.html on the end,
echo for example  http://192.168.1.20:5199/editor.html
echo.
call npx vite --port 5199 --host
pause
