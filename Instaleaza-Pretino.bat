@echo off
chcp 65001 >nul
title Instalare Pretino
rem Leaga E:\Claude\Pretino de repo-ul GitHub glctv/pretino (ramura main), sterge fisierul ramas si ruleaza testele.
rem NU publica nimic si NU atinge main sau alt proiect.
set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%PATH%"
cd /d "E:\Claude\Pretino" || (echo Folderul E:\Claude\Pretino lipseste & pause & exit /b 1)
where git >nul 2>nul || winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
where bun >nul 2>nul || powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%PATH%"
if exist wrangler.jsonc del wrangler.jsonc
if not exist .git git init -b main
git remote get-url origin >nul 2>nul || git remote add origin https://github.com/glctv/pretino
git fetch origin main || (echo Nu pot lua repo-ul. Logheaza-te in GitHub si porneste din nou. & pause & exit /b 1)
git checkout -B main origin/main -f
git status --short
echo.
echo === Teste ===
bun scripts/test.js
echo.
echo === Gata. Poti inchide fereastra. ===
pause
