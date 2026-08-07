@echo off
echo 🚀 Starting backend server...

:: Load environment variables from backend\.env file if it exists
if exist backend\.env (
    for /f "usebackq delims=" %%x in (backend\.env) do (
        echo %%x | findstr /r "^#" >nul
        if errorlevel 1 (
            set %%x
        )
    )
)

cd backend
call npm run dev
