@echo off
SET PATH=C:\Program Files\nodejs;%PATH%

echo =============================================
echo  2Forge CRM -- Lokalna mreza
echo =============================================
echo.

echo Gradim React (production)...
cd /d "%~dp0client"
node node_modules\vite\bin\vite.js build

echo.
echo Pokrecam server na svim sucelima (port 3003)...
cd /d "%~dp0server"

echo.
echo =============================================
echo  CRM je spreman za cijelu mrezu!
echo  Tvoj link:   http://localhost:3003
echo  Kolegama:    http://192.168.31.98:3003
echo =============================================
echo.

start "" http://192.168.31.98:3003
node index.js
