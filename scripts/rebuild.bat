@echo off
echo ===================================================
echo               Rebuilding IRON Frontend
echo ===================================================
echo.
:: Move to project frontend folder
cd /d "%~dp0..\frontend"
call npm run build
echo.
echo Rebuild complete. Double-click the IRON shortcut on your Desktop to run the updated front end.
echo.
pause
