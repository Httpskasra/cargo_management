@echo off
title Cargo Manager Setup
call npm install
if errorlevel 1 goto :error
call npx prisma generate
if errorlevel 1 goto :error
call npx prisma db push
if errorlevel 1 goto :error
call npm run db:seed
if errorlevel 1 goto :error
echo.
echo Setup completed successfully.
pause
exit /b 0
:error
echo.
echo Setup failed. Make sure Node.js 22 LTS and internet are available for the first installation.
pause
exit /b 1
