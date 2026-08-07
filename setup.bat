@echo off
echo 📦 Setting up Quotation Management System...

:: 1. Setup backend dependencies
echo 📂 Setting up Backend...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install backend dependencies.
    cd ..
    exit /b %ERRORLEVEL%
)
echo ⚙️ Generating Prisma client...
call npm run prisma:generate
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to generate Prisma client.
    cd ..
    exit /b %ERRORLEVEL%
)

:: 2. Setup frontend dependencies
echo 📂 Setting up Frontend...
cd ../frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install frontend dependencies.
    cd ..
    exit /b %ERRORLEVEL%
)

cd ..
echo.
echo ✅ Dependencies and client generated successfully!
echo 👉 Make sure you copy backend/.env.example to backend/.env and configure it with your database URL.
echo 👉 Also copy frontend/.env.example to frontend/.env if you wish to change the API URL.
echo 👉 Then, to initialize the database schema and seed data, run:
echo    cd backend ^&^& npm run prisma:push ^&^& npm run prisma:seed
