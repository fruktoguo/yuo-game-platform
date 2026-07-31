@echo off
setlocal
title PROJECT GSS0 Balance Editor

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0balance-editor-server.ps1"
if errorlevel 1 (
  echo.
  echo Failed to start the PROJECT GSS0 balance editor.
  pause
)
