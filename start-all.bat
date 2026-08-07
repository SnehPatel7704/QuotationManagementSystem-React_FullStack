@echo off
echo 🚀 Starting both backend and frontend servers...

echo Starting backend...
start "Backend Server" cmd /c "start-backend.bat"

echo Starting frontend...
start "Frontend Server" cmd /c "start-frontend.bat"

echo.
echo Both servers are starting in separate console windows.
echo To stop them, close their respective windows or press Ctrl+C here.
