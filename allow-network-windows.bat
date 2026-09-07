@echo off
title Cargo Manager - Allow Local Network
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Please right-click this file and choose "Run as administrator".
  pause
  exit /b 1
)
netsh advfirewall firewall delete rule name="Cargo Manager LAN" >nul 2>&1
netsh advfirewall firewall add rule name="Cargo Manager LAN" dir=in action=allow protocol=TCP localport=3090 profile=private
if %errorlevel% equ 0 (
  echo.
  echo Cargo Manager port 3090 is allowed on Private networks.
) else (
  echo Could not create the Windows Firewall rule.
)
pause
