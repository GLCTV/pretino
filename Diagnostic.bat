@echo off
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%PATH%"
mkdir logs 2>nul
(echo === PS version === & powershell -NoProfile -Command "$PSVersionTable.PSVersion.ToString()" & echo === bun === & where bun & bun --version & echo === git === & where git & echo === Pretino.ps1 === & powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gui\Pretino.ps1" & echo === exit %%errorlevel%% ===) > logs\diag.txt 2>&1
echo Gata. Spune-i lui Claude: diagnostic gata.
pause
