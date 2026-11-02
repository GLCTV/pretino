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
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" Title="Pretino v$AppVersion" Width="760" Height="560" Background="#0d1514" WindowStartupLocation="CenterScreen">
  <Grid Margin="14">
    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="*"/></Grid.RowDefinitions>
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
    <TextBox Name="Jurnal" Grid.Row="3" IsReadOnly="True" Background="#142120" Foreground="#e6f0ee" FontFamily="Consolas" VerticalScrollBarVisibility="Auto" TextWrapping="Wrap"/>
  </Grid>
</Window>
"@
$win = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))

$c = @{}; foreach ($n in 'Stare','Demo','BPreview','BOprestePreview','BActualizare','BTeste','BLive','BProgram','Jurnal') { $c[$n] = $win.FindName($n) }

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
  try { Push-Location $Root; git pull --ff-only -q 2>$null; Pop-Location } catch { Pop-Location }
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
$c.BProgram.Add_Click({ $script:DupaProgram = $true; Start-Task 'actualizare-program' 'git pull --ff-only' })
$c.BActualizare.Add_Click({ Start-Task 'actualizare' 'bun scripts/actualizare.js' })
$c.BTeste.Add_Click({ Start-Task 'teste' 'bun scripts/test.js' })
$c.BLive.Add_Click({
  $r = [System.Windows.MessageBox]::Show('Publici LIVE pe pretino.ro versiunea de pe main?', 'PUBLICA LIVE', 'YesNo', 'Warning')
  if ($r -eq 'Yes') { Start-Task 'publica-live' 'bun scripts/publica.js --live' }
})
$win.Add_Closed({ if ($script:Preview -and -not $script:Preview.HasExited) { & taskkill /PID $script:Preview.Id /T /F | Out-Null } })
[void]$win.ShowDialog()
