# Actualizeaza programul Pretino (butonul "Actualizeaza programul"): trece pe main si aduce ultima versiune de pe GitHub.
# Modificarile locale necomise se salveaza intai (git stash) si se pun la loc dupa actualizare; daca nu se mai potrivesc, raman salvate in stash.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)
git fetch -q origin main
if ($LASTEXITCODE -ne 0) { Write-Output 'EROARE: nu pot contacta GitHub (verifica internetul).'; exit 1 }
$br = (git rev-parse --abbrev-ref HEAD).Trim()
$mod = git status --porcelain --untracked-files=no
$stash = $false
if ($mod) {
  git stash push -q -m ("auto-actualizare " + (Get-Date -Format 'yyyyMMdd-HHmm'))
  if ($LASTEXITCODE -eq 0) { $stash = $true; Write-Output 'Modificarile locale au fost salvate temporar.' }
}
if ($br -ne 'main') {
  Write-Output "Trec de pe ramura $br pe main."
  git checkout -q main
  if ($LASTEXITCODE -ne 0) { git checkout -q -B main origin/main }
}
git pull -q --rebase origin main
if ($LASTEXITCODE -ne 0) {
  git rebase --abort 2>$null
  Write-Output 'EROARE: actualizarea nu s-a putut face automat. Trimite acest jurnal lui Claude.'
  if ($stash) { git stash pop -q }
  exit 1
}
if ($stash) {
  git stash pop -q 2>$null
  if ($LASTEXITCODE -ne 0) {
    git reset -q --hard HEAD
    Write-Output 'Modificarile locale vechi nu se mai potrivesc cu versiunea noua: am pastrat versiunea noua, iar cele vechi au ramas salvate (git stash list).'
  } else { Write-Output 'Modificarile locale au fost puse la loc.' }
}
$v = Get-Content 'versiune-program.txt' -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Output "Program actualizat: v$v, ramura main, ultima modificare: $(git log -1 --format='%s')"
exit 0
