@echo off
title Cargo Manager - Network Host
set CARGO_PORT=3090
echo.
echo Cargo Manager is starting on this computer and the local network...
echo Open locally: http://localhost:3090
echo Other computers: use the IP shown inside Cargo Manager.
echo.
call npm run dev
pause
