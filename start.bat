@echo off

cd /d "E:\programming\post\cargo-manager"

start "React Server" cmd /k "npm run start"

timeout /t 3 /nobreak >nul

start chrome "http://localhost:3090"

exit