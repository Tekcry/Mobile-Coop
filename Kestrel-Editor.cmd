@echo off
rem Starts the Kestrel level editor (dev only). Double-click this file, or run it from Windows PowerShell.
rem Needs Node.js. The first run installs packages. Close this window to stop the editor.
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run editor
pause
