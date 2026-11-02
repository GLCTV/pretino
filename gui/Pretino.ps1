# Programul Pretino (WPF). Versiunea proprie a programului e in ..\versiune-program.txt.
Add-Type -AssemblyName PresentationFramework
$Root = Split-Path -Parent $PSScriptRoot
$AppVersion = (Get-Content (Join-Path $Root 'versiune-program.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
if (-not $AppVersion) { $AppVersion = '?' }
$env:Path = "$env:USERPROFILE\.bun\bin;$env:ProgramFiles\Git\cmd;$env:Path"
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$script:Proc = $null
$script:Preview = $null
$script:LogFile = $null
$script:DupaProgram = $false

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" Title="Pretino v$AppVersion" Width="980" Height="860" Background="#0d1514" WindowStartupLocation="CenterScreen">
  <Grid Margin="14">
    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="*"/></Grid.RowDefinitions>
    <DockPanel>
      <Button Name="BProgram" DockPanel.Dock="Right" Content="Actualizeaza programul" Padding="12,6" VerticalAlignment="Center"/>
      <TextBlock Name="Titlu" Text="Pretino.ro - oferte actuale (v$AppVersion)" Foreground="#2dd4bf" FontSize="22" FontWeight="Bold"/>
    </DockPanel>
    <TextBlock Name="Stare" Grid.Row="1" Foreground="#9bb0ad" Margin="0,4,0,10" Text="Gata."/>
    <WrapPanel Grid.Row="2" Margin="0,0,0,10">
      <CheckBox Name="Demo" Content="Date DEMO in previzualizare" Foreground="#e6f0ee" IsChecked="True" Margin="0,0,14,0" VerticalAlignment="Center"/>
      <Button Name="BPreview" Content="Porneste previzualizarea" Padding="12,6" Margin="0,0,8,0"/>
      <Button Name="BOprestePreview" Content="Opreste previzualizarea" Padding="12,6" Margin="0,0,8,0"/>
      <Button Name="BActualizare" Content="Actualizeaza oferte" Padding="12,6" Margin="0,0,8,0"/>
      <Button Name="BTeste" Content="Ruleaza testele" Padding="12,6" Margin="0,0,8,0"/>
      <Button Name="BLive" Content="PUBLICA LIVE" Padding="12,6" Background="#b91c1c" Foreground="White" FontWeight="Bold"/>
    </WrapPanel>
    <Border Grid.Row="3" BorderBrush="#2dd4bf" BorderThickness="0,1,0,0" Padding="0,8,0,8" Margin="0,0,0,8">
      <StackPanel>
        <TextBlock Text="Campanii si oferte (eMAG / PC Garage) - doar citire si consultare, nu publica nimic pe site" Foreground="#2dd4bf" FontWeight="Bold" Margin="0,0,0,6"/>
        <WrapPanel Margin="0,0,0,6">
          <TextBlock Text="Magazin:" Foreground="#e6f0ee" VerticalAlignment="Center" Margin="0,0,6,0"/>
          <ComboBox Name="CMagazin" Width="100" SelectedIndex="0" Margin="0,0,10,0"><ComboBoxItem Content="toate"/><ComboBoxItem Content="emag"/><ComboBoxItem Content="pcgarage"/></ComboBox>
          <Button Name="CCauta" Content="Cauta campanii" Padding="10,4" Margin="0,0,8,0"/>
          <Button Name="CActualizeaza" Content="Actualizeaza campanii si oferte" Padding="10,4" Margin="0,0,8,0"/>
          <Button Name="COpreste" Content="Opreste" Padding="10,4" Margin="0,0,8,0"/>
          <Button Name="CReia" Content="Reia verificarea intrerupta" Padding="10,4" Margin="0,0,8,0"/>
          <Button Name="CRaport" Content="Raport" Padding="10,4"/>
        </WrapPanel>
        <TextBlock Name="CProgres" Foreground="#9bb0ad" TextWrapping="Wrap" Margin="0,0,0,6" Text="Campanii: nicio verificare in aceasta sesiune."/>
        <Grid Margin="0,0,0,6">
          <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
          <DockPanel Margin="0,0,6,0"><TextBlock DockPanel.Dock="Top" Text="Surse configurate (URL-uri)" Foreground="#9bb0ad"/><ListBox Name="CSurse" Height="110" Background="#142120" Foreground="#e6f0ee"/></DockPanel>
          <DockPanel Grid.Column="1"><TextBlock DockPanel.Dock="Top" Text="Campanii gasite" Foreground="#9bb0ad"/><ListBox Name="CCampanii" Height="110" Background="#142120" Foreground="#e6f0ee"/></DockPanel>
        </Grid>
        <WrapPanel Margin="0,0,0,6">
          <TextBox Name="CUrl" Width="360" Margin="0,0,6,0" ToolTip="URL pe domeniul eMAG sau PC Garage"/>
          <TextBox Name="CTitlu" Width="130" Margin="0,0,6,0" ToolTip="Titlu (optional)"/>
          <Button Name="CAdauga" Content="Adauga URL sursa" Padding="8,3" Margin="0,0,6,0"/>
          <Button Name="CManual" Content="Adauga campanie manual" Padding="8,3" Margin="0,0,6,0"/>
          <Button Name="CComuta" Content="Activeaza / Dezactiveaza sursa" Padding="8,3" Margin="0,0,6,0"/>
          <Button Name="CSterge" Content="Sterge sursa" Padding="8,3" Margin="0,0,6,0"/>
          <Button Name="CDeschide" Content="Deschide pagina oficiala" Padding="8,3"/>
        </WrapPanel>
        <TextBox Name="CDetalii" Height="86" IsReadOnly="True" Background="#142120" Foreground="#e6f0ee" TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"/>
      </StackPanel>
    </Border>
    <TextBox Name="Jurnal" Grid.Row="4" IsReadOnly="True" Background="#142120" Foreground="#e6f0ee" FontFamily="Consolas" VerticalScrollBarVisibility="Auto" TextWrapping="Wrap"/>
  </Grid>
</Window>
"@
$win = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))

$c = @{}; foreach ($n in 'Stare','Demo','BPreview','BOprestePreview','BActualizare','BTeste','BLive','BProgram','Jurnal','CMagazin','CCauta','CActualizeaza','COpreste','CReia','CRaport','CProgres','CSurse','CCampanii','CUrl','CTitlu','CAdauga','CManual','CComuta','CSterge','CDeschide','CDetalii') { $c[$n] = $win.FindName($n) }

function Set-Busy($busy) { foreach ($n in 'BPreview','BActualizare','BTeste','BLive','BProgram') { $c[$n].IsEnabled = -not $busy } }

function Start-Task($nume, $comanda) {
  if ($script:Proc -and -not $script:Proc.HasExited) { return }
  $script:LogFile = Join-Path $LogDir ("{0}-{1}.txt" -f $nume, (Get-Date -Format 'yyyyMMdd-HHmmss'))
  $c.Stare.Text = "Ruleaza: $nume..."
  Set-Busy $true
  $script:Proc = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c cd /d `"$Root`" && $comanda > `"$script:LogFile`" 2>&1" -WindowStyle Hidden -PassThru
}

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(700)
$timer.Add_Tick({
  if ($script:LogFile -and (Test-Path $script:LogFile)) {
    try { $c.Jurnal.Text = (Get-Content $script:LogFile -Raw -Encoding UTF8 -ErrorAction Stop); $c.Jurnal.ScrollToEnd() } catch {}
  }
  if ($script:Proc -and $script:Proc.HasExited) {
    $c.Stare.Text = if ($script:Proc.ExitCode -eq 0) { 'Terminat cu succes.' } else { "Terminat cu eroare (cod $($script:Proc.ExitCode))." }
    $script:Proc = $null; Set-Busy $false
    if ($script:DupaProgram) {
      $script:DupaProgram = $false
      $vNou = (Get-Content (Join-Path $Root 'versiune-program.txt') -ErrorAction SilentlyContinue | Select-Object -First 1)
      if ($vNou -and $vNou -ne $AppVersion) {
        $r = [System.Windows.MessageBox]::Show("Versiune noua: v$vNou (acum v$AppVersion). Repornesc programul acum?", 'Actualizare program', 'YesNo', 'Question')
        if ($r -eq 'Yes') { Start-Process -FilePath (Join-Path $Root 'Pretino.bat'); $win.Close() }
      } else { $c.Stare.Text = "Programul e la zi (v$AppVersion)." }
    }
  }
})
$timer.Start()

# La pornire: aduce ultimele modificari ale proiectului Pretino (doar fast-forward, nu atinge alt proiect)
if (Test-Path (Join-Path $Root '.git')) {
  try { Push-Location $Root; git pull --rebase --autostash -q 2>$null; Pop-Location } catch { Pop-Location }
}

$c.BPreview.Add_Click({
  if ($script:Preview -and -not $script:Preview.HasExited) { Start-Process 'http://localhost:3100'; return }
  $flag = if ($c.Demo.IsChecked) { '--demo' } else { '' }
  $b = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c cd /d `"$Root`" && bun scripts/build.js $flag" -WindowStyle Hidden -PassThru -Wait
  if ($b.ExitCode -ne 0) { $c.Stare.Text = 'Build esuat - vezi testele.'; return }
  $script:Preview = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c cd /d `"$Root`" && bun scripts/serve.js" -WindowStyle Hidden -PassThru
  Start-Sleep -Milliseconds 1200
  Start-Process 'http://localhost:3100'
  $c.Stare.Text = 'Previzualizare pornita: http://localhost:3100'
})
$c.BOprestePreview.Add_Click({
  if ($script:Preview -and -not $script:Preview.HasExited) { & taskkill /PID $script:Preview.Id /T /F | Out-Null }
  $script:Preview = $null; $c.Stare.Text = 'Previzualizare oprita.'
})
$c.BProgram.Add_Click({ $script:DupaProgram = $true; Start-Task 'actualizare-program' 'git pull --rebase --autostash' })
$c.BActualizare.Add_Click({ Start-Task 'actualizare' 'bun scripts/actualizare.js' })
$c.BTeste.Add_Click({ Start-Task 'teste' 'bun scripts/test.js' })
$c.BLive.Add_Click({
  $r = [System.Windows.MessageBox]::Show('Publici LIVE pe pretino.ro versiunea de pe main?', 'PUBLICA LIVE', 'YesNo', 'Warning')
  if ($r -eq 'Yes') { Start-Task 'publica-live' 'bun scripts/publica.js --live' }
})

# ---------- Campanii si oferte (modul propriu Pretino; ruleaza in fundal) ----------
$script:ProcC = $null
$CampLog = $null
$StopFlag = Join-Path $Root '.pretino-local\opreste-campanii.flag'
function Read-Json($f) { if (Test-Path $f) { try { return (Get-Content $f -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null } } return $null }
function Load-Surse {
  $c.CSurse.Items.Clear()
  $cfg = Read-Json (Join-Path $Root 'data\campanii-surse.json')
  if (-not $cfg) { $cfg = Read-Json (Join-Path $Root 'data\campanii-surse.default.json') }
  if (-not $cfg) { return }
  foreach ($s in $cfg.surse) {
    $it = New-Object System.Windows.Controls.ListBoxItem
    $stare = if ($s.activ -eq $false) { '[oprit]' } else { '[activ]' }
    $it.Content = "$stare $($s.magazin) | $($s.url) | $($s.titlu)"
    $it.Tag = $s
    [void]$c.CSurse.Items.Add($it)
  }
}
function Load-Campanii {
  $c.CCampanii.Items.Clear()
  $d = Read-Json (Join-Path $Root 'data\campanii.json')
  if (-not $d) { return }
  foreach ($p in $d.PSObject.Properties) {
    $x = $p.Value
    $it = New-Object System.Windows.Controls.ListBoxItem
    $nev = if ($x.neverificata) { ' (neverificata)' } else { '' }
    $it.Content = "[$($x.stare)]$nev $($x.magazin) | $($x.titlu) | $($x.reducereAnuntata)"
    $it.Tag = $x
    [void]$c.CCampanii.Items.Add($it)
  }
}
function Show-Progres {
  $p = Read-Json (Join-Path $Root 'logs\campanii-progres.json')
  if (-not $p) { return }
  $k = $p.contoare
  $m = ''
  foreach ($q in $p.magazine.PSObject.Properties) { $m += "$($q.Name): $($q.Value.stare), $($q.Value.pagini) pagini | " }
  $c.CProgres.Text = "Stare: $($p.stare) | $m" + "Pagini citite: $($k.paginiCitite) | campanii noi: $($k.campaniiNoi) | actualizate: $($k.campaniiActualizate) | produse citite: $($k.produseCitite) | surse noi: $($k.surseNoi) | erori: $($k.erori)"
}
function Set-BusyC($busy) { foreach ($n in 'CCauta','CActualizeaza','CReia') { $c[$n].IsEnabled = -not $busy }; $c.COpreste.IsEnabled = $busy }
function Start-Camp($args2) {
  if ($script:ProcC -and -not $script:ProcC.HasExited) { return }
  $mag = $c.CMagazin.SelectedItem.Content
  $script:CampLog = Join-Path $LogDir ("campanii-{0}.txt" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
  $script:LogFile = $script:CampLog
  $c.Stare.Text = 'Campanii: ruleaza in fundal...'
  Set-BusyC $true
  $script:ProcC = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c cd /d `"$Root`" && bun scripts/campanii.js $args2 --magazin $mag > `"$script:CampLog`" 2>&1" -WindowStyle Hidden -PassThru
}
function Run-Camp($argList) {
  Push-Location $Root
  try { $o = (& bun scripts/campanii.js @argList 2>&1 | Out-String).Trim() } catch { $o = "$_" }
  Pop-Location
  return $o
}
function Mag-DinUrl($u) { if ($u -match 'emag\.ro') { return 'emag' } elseif ($u -match 'pcgarage\.ro') { return 'pcgarage' } else { return $null } }

$campTimer = New-Object System.Windows.Threading.DispatcherTimer
$campTimer.Interval = [TimeSpan]::FromMilliseconds(1200)
$campTimer.Add_Tick({
  Show-Progres
  if ($script:ProcC -and $script:ProcC.HasExited) {
    $script:ProcC = $null; Set-BusyC $false; Load-Surse; Load-Campanii
    $c.Stare.Text = 'Campanii: verificare terminata. Vezi raportul pentru ce a ramas neverificat.'
  }
})
$campTimer.Start()
Set-BusyC $false; $c.COpreste.IsEnabled = $false
Load-Surse; Load-Campanii; Show-Progres

$c.CCauta.Add_Click({ Start-Camp '--campanii' })
$c.CActualizeaza.Add_Click({ Start-Camp '--complet' })
$c.CReia.Add_Click({ Start-Camp '--complet --reia' })
$c.COpreste.Add_Click({
  New-Item -ItemType Directory -Force -Path (Split-Path $StopFlag) | Out-Null
  Set-Content -Path $StopFlag -Value 'stop'
  $c.Stare.Text = 'Opresc dupa pagina curenta; progresul se salveaza...'
})
$c.CRaport.Add_Click({ $script:LogFile = Join-Path $Root 'rapoarte\ultimul-raport-campanii.txt'; if (-not (Test-Path $script:LogFile)) { $c.Jurnal.Text = 'Niciun raport de campanii inca.' } })
$c.CAdauga.Add_Click({
  $u = $c.CUrl.Text.Trim(); $m = Mag-DinUrl $u
  if (-not $m) { $c.Stare.Text = 'URL invalid: trebuie sa fie pe emag.ro sau pcgarage.ro.'; return }
  $c.Stare.Text = (Run-Camp @('--sursa-adauga', $m, $u, $c.CTitlu.Text.Trim())).Split("`n")[0]
  Load-Surse
})
$c.CManual.Add_Click({
  $u = $c.CUrl.Text.Trim(); $m = Mag-DinUrl $u
  if (-not $m) { $c.Stare.Text = 'URL invalid: trebuie sa fie pe emag.ro sau pcgarage.ro.'; return }
  $c.Stare.Text = (Run-Camp @('--campanie-manuala', $m, $u, $c.CTitlu.Text.Trim())).Split("`n")[0]
  Load-Campanii
})
$c.CComuta.Add_Click({
  $it = $c.CSurse.SelectedItem; if (-not $it) { $c.Stare.Text = 'Alege o sursa din lista.'; return }
  $act = if ($it.Tag.activ -eq $false) { '--sursa-activeaza' } else { '--sursa-dezactiveaza' }
  [void](Run-Camp @($act, $it.Tag.id)); Load-Surse
})
$c.CSterge.Add_Click({
  $it = $c.CSurse.SelectedItem; if (-not $it) { $c.Stare.Text = 'Alege o sursa din lista.'; return }
  $r = [System.Windows.MessageBox]::Show("Stergi sursa $($it.Tag.url)?", 'Sterge sursa', 'YesNo', 'Question')
  if ($r -eq 'Yes') { [void](Run-Camp @('--sursa-sterge', $it.Tag.id)); Load-Surse }
})
$c.CSurse.Add_SelectionChanged({ $it = $c.CSurse.SelectedItem; if ($it) { $c.CUrl.Text = $it.Tag.url; $c.CTitlu.Text = "$($it.Tag.titlu)" } })
$c.CCampanii.Add_SelectionChanged({
  $it = $c.CCampanii.SelectedItem; if (-not $it) { return }
  $x = $it.Tag
  $c.CDetalii.Text = ("Titlu: {0}`nMagazin: {1} | Stare: {2} | Ultima verificare reusita: {3}`nPagina oficiala: {4}`nReducere anuntata: {5} | Cod promotional: {6} | Valabila: {7} - {8}`nDescriere: {9}`nConditii: {10}`nProduse asociate: {11} | Aprobare publicare: {12} | Eligibil afiliere: {13}" -f $x.titlu, $x.magazin, $x.stare, $x.ultimaVerificareReusita, $x.url, $x.reducereAnuntata, $x.codPromotional, $x.inceput, $x.sfarsit, $x.descriere, (($x.conditii) -join ' ; '), (@($x.produse).Count), $x.aprobarePublicare, $x.eligibilAfiliere)
})
$c.CDeschide.Add_Click({
  $it = $c.CCampanii.SelectedItem; $u = $null
  if ($it) { $u = $it.Tag.url } elseif ($c.CSurse.SelectedItem) { $u = $c.CSurse.SelectedItem.Tag.url }
  if ($u -and (Mag-DinUrl $u)) { Start-Process $u }
})

$win.Add_Closed({ if ($script:ProcC -and -not $script:ProcC.HasExited) { New-Item -ItemType Directory -Force -Path (Split-Path $StopFlag) | Out-Null; Set-Content -Path $StopFlag -Value 'stop' }; if ($script:Preview -and -not $script:Preview.HasExited) { & taskkill /PID $script:Preview.Id /T /F | Out-Null } })
[void]$win.ShowDialog()
