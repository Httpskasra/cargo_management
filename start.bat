@echo off

cd /d "D:\cargoManager\cargo_management"

start "React Server" cmd /k "npm run start"

timeout /t 3 /nobreak >nul

start chrome "http://localhost:3090"

exit