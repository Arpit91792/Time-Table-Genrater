Write-Host "Starting Smart College Timetable Generator..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Backend Server on port 5001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server on port 5174..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Application Started Successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API:  http://localhost:5001" -ForegroundColor White
Write-Host "Frontend App: http://localhost:5174" -ForegroundColor White
Write-Host "API Health:   http://localhost:5001/health" -ForegroundColor White
Write-Host ""
Write-Host "Default Credentials:" -ForegroundColor Yellow
Write-Host "Email: admin@example.com" -ForegroundColor Gray
Write-Host "Password: password" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to open the application..." -ForegroundColor Magenta
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "http://localhost:5174"