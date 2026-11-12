# Copie de siguranta Pretino pe Google Drive (dupa PUBLICA LIVE): zip cu sursa, datele, panoul, documentatia si setarile locale,
# fara secrete, node_modules, dist, loguri, rapoarte si profilul de browser. Se pastreaza ultimele 2 copii.
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$nume = 'Site Pretino.ro BACKUP'
$dest = $null
foreach ($d in (Get-PSDrive -PSProvider FileSystem)) {
  foreach ($sub in 'My Drive', 'Contul meu Drive', 'Drive-ul meu') {
    $p = Join-Path $d.Root (Join-Path $sub $nume)
    if (Test-Path $p) { $dest = $p; break }
  }
  if ($dest) { break }
}
if (-not $dest) { Write-Output "Backup: nu gasesc folderul '$nume' pe Google Drive (Google Drive pentru desktop pornit?). Sar peste."; exit 0 }
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$tmp = Join-Path $env:TEMP "pretino-backup-$stamp"
$null = robocopy $Root $tmp /E /NFL /NDL /NJH /NJS /NP /XD node_modules dist logs rapoarte .git .wrangler browser-profil chrome-partajare /XF *.env
$zip = Join-Path $dest "Pretino-BACKUP-$stamp.zip"
try {
  Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $zip -Force -ErrorAction Stop
  Write-Output "Backup salvat pe Google Drive: $zip"
  Get-ChildItem $dest -Filter 'Pretino-BACKUP-*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 2 | Remove-Item -Force
} catch { Write-Output "Backup: eroare la arhivare: $_" }
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
exit 0
