@echo off
chcp 65001 >nul
title Pretino
rem Porneste programul Pretino din folderul in care se afla (proiect independent). Instaleaza Git si Bun doar daca lipsesc.
set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul || winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
where bun >nul 2>nul || powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
where bun >nul 2>nul || (echo Nu am putut instala Bun. Vezi https://bun.sh & pause & exit /b 1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gui\Pretino.ps1"
if errorlevel 1 (echo. & echo Programul s-a oprit cu eroare - trimite captura acestei ferestre. & pause)
