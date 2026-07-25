@echo off
echo Starting Smart College Timetable Generator...
echo.

echo Starting Backend Server on port 5004...
start cmd /k "cd server && npm run dev"
timeout /t 3 /nobreak > nul

echo Starting Frontend Server on port 5174...
start cmd /k "cd client && npm run dev"
timeout /t 5 /nobreak > nul

echo.
echo ============================================
echo  Application Started Successfully!
echo ============================================
echo.
echo Frontend Dashboard: http://localhost:5174
echo Backend API:       http://localhost:5004
echo API Health Check:  http://localhost:5004/api/health
echo.
echo Features Available:
echo - Multi-step timetable wizard
echo - Excel-like interfaces
echo - Intelligent scheduling
echo - PDF/Excel export
echo.
echo Press any key to open the dashboard...
pause > nul
start http://localhost:5174
echo.