@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
echo =============================================
echo  Pokretanje lokalnog CRM-a
echo =============================================
echo.

echo [1/2] Pokretanje backend servera (port 3003)...
start "CRM Backend" cmd /k "cd /d "%~dp0server" && node index.js"

timeout /t 2 >nul

echo [2/2] Pokretanje frontend servera (port 3002)...
start "CRM Frontend" cmd /k "cd /d "%~dp0client" && node node_modules\vite\bin\vite.js"

timeout /t 4 >nul

echo.
echo =============================================
echo  CRM je spreman!
echo  Otvori: http://localhost:3002
echo =============================================
echo.
start http://localhost:3002
