@echo off
echo Starting Smart College Timetable Generator...
echo.

echo Starting Backend Server on port 5001...
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
echo Backend API:  http://localhost:5001
echo Frontend App: http://localhost:5174
echo API Health:   http://localhost:5001/health
echo.
echo Default Credentials:
echo Email: admin@example.com
echo Password: password
echo.
echo Press any key to open the application...
pause > nul
start http://localhost:5174
echo.