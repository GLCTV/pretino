@echo off
chcp 65001 >nul
title Pretino
rem Pornește programul Pretino din folderul în care se află (proiect independent). Instalează Git și Bun doar dacă lipsesc.
set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul || winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
where bun >nul 2>nul || powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
where bun >nul 2>nul || (echo Nu am putut instala Bun. Vezi https://bun.sh & pause & exit /b 1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gui\Pretino.ps1"
