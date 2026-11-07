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
$script:Oprit = $false

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Title="Pretino v$AppVersion" Width="1060" Height="920" MinWidth="900" MinHeight="640" Background="#0b1220" WindowStartupLocation="CenterScreen" FontFamily="Segoe UI" FontSize="13">
  <Window.Resources>
    <Style TargetType="TextBlock"><Setter Property="Foreground" Value="#f1f5f9"/></Style>
    <Style TargetType="CheckBox"><Setter Property="Foreground" Value="#f1f5f9"/></Style>
    <Style TargetType="TextBox"><Setter Property="Background" Value="#0f172a"/><Setter Property="Foreground" Value="#f1f5f9"/><Setter Property="BorderBrush" Value="#334155"/><Setter Property="CaretBrush" Value="#f1f5f9"/><Setter Property="Padding" Value="6,4"/></Style>
    <Style TargetType="ListBox"><Setter Property="Background" Value="#0f172a"/><Setter Property="Foreground" Value="#f1f5f9"/><Setter Property="BorderBrush" Value="#334155"/></Style>
    <Style x:Key="Btn" TargetType="Button">
      <Setter Property="Foreground" Value="White"/><Setter Property="FontWeight" Value="SemiBold"/><Setter Property="Padding" Value="14,8"/><Setter Property="Margin" Value="0,0,8,6"/><Setter Property="Cursor" Value="Hand"/><Setter Property="Background" Value="#334155"/>
      <Setter Property="Template"><Setter.Value><ControlTemplate TargetType="Button"><Border Background="{TemplateBinding Background}" CornerRadius="7" Padding="{TemplateBinding Padding}"><ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/></Border></ControlTemplate></Setter.Value></Setter>
      <Style.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter Property="Opacity" Value="0.82"/></Trigger><Trigger Property="IsEnabled" Value="False"><Setter Property="Opacity" Value="0.35"/></Trigger></Style.Triggers>
    </Style>
    <Style x:Key="BtnVerde" TargetType="Button" BasedOn="{StaticResource Btn}"><Setter Property="Background" Value="#15803d"/></Style>
    <Style x:Key="BtnAlbastru" TargetType="Button" BasedOn="{StaticResource Btn}"><Setter Property="Background" Value="#2563eb"/></Style>
    <Style x:Key="BtnPortocaliu" TargetType="Button" BasedOn="{StaticResource Btn}"><Setter Property="Background" Value="#c2410c"/></Style>
    <Style x:Key="BtnRosu" TargetType="Button" BasedOn="{StaticResource Btn}"><Setter Property="Background" Value="#dc2626"/></Style>
    <Style x:Key="BtnGri" TargetType="Button" BasedOn="{StaticResource Btn}"><Setter Property="Background" Value="#475569"/></Style>
    <Style TargetType="TabControl"><Setter Property="Background" Value="#131c2e"/><Setter Property="BorderBrush" Value="#24324d"/><Setter Property="BorderThickness" Value="1"/><Setter Property="Padding" Value="12"/></Style>
    <Style TargetType="TabItem">
      <Setter Property="Template"><Setter.Value><ControlTemplate TargetType="TabItem">
        <Border Name="Bd" Background="#1e293b" CornerRadius="8,8,0,0" Padding="18,9" Margin="0,0,4,0"><ContentPresenter Name="Cp" ContentSource="Header" TextElement.Foreground="#94a3b8" TextElement.FontWeight="SemiBold"/></Border>
        <ControlTemplate.Triggers><Trigger Property="IsSelected" Value="True"><Setter TargetName="Bd" Property="Background" Value="#2563eb"/><Setter TargetName="Cp" Property="TextElement.Foreground" Value="White"/></Trigger></ControlTemplate.Triggers>
      </ControlTemplate></Setter.Value></Setter>
    </Style>
  </Window.Resources>
  <Grid Margin="16">
    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="*"/></Grid.RowDefinitions>
    <DockPanel Margin="0,0,0,10">
      <Button Name="BProgram" DockPanel.Dock="Right" Content="Actualizeaz&#x103; programul" Style="{StaticResource BtnAlbastru}" VerticalAlignment="Center" Margin="0"/>
      <StackPanel>
        <TextBlock Text="Pretino.ro" Foreground="#2dd4bf" FontSize="28" FontWeight="Bold"/>
        <TextBlock Text="Program de administrare - oferte din magazinele din Rom&#xE2;nia  |  versiunea $AppVersion" Foreground="#94a3b8"/>
      </StackPanel>
    </DockPanel>
    <Border Name="StareBox" Grid.Row="1" Background="#131c2e" BorderBrush="#16a34a" BorderThickness="6,0,0,0" CornerRadius="4" Padding="12,10" Margin="0,0,0,8">
      <TextBlock Name="Stare" FontSize="15" FontWeight="SemiBold" TextWrapping="Wrap" Text="Gata."/>
    </Border>
    <WrapPanel Grid.Row="2" Margin="0,0,0,10">
      <TextBlock Text="Ce &#xEE;nseamn&#x103; culorile:  " Foreground="#94a3b8"/>
      <TextBlock Text="VERDE" Foreground="#4ade80" FontWeight="Bold"/><TextBlock Text=" = cite&#x219;te / verific&#x103;, sigur  &#xB7;  " Foreground="#94a3b8"/>
      <TextBlock Text="ALBASTRU" Foreground="#60a5fa" FontWeight="Bold"/><TextBlock Text=" = local, doar la tine pe PC  &#xB7;  " Foreground="#94a3b8"/>
      <TextBlock Text="PORTOCALIU" Foreground="#fb923c" FontWeight="Bold"/><TextBlock Text=" = aten&#x21B;ie / opre&#x219;te  &#xB7;  " Foreground="#94a3b8"/>
      <TextBlock Text="RO&#x218;U" Foreground="#f87171" FontWeight="Bold"/><TextBlock Text=" = public pe site sau &#x219;terge  &#xB7;  " Foreground="#94a3b8"/>
      <TextBlock Text="GRI" Foreground="#cbd5e1" FontWeight="Bold"/><TextBlock Text=" = deschide o pagin&#x103;" Foreground="#94a3b8"/>
    </WrapPanel>
    <TabControl Grid.Row="3" Margin="0,0,0,10">
      <TabItem Header="1. Site: de la oferte la publicare">
        <Grid>
          <Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
          <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
          <Button Name="BActualizare" Content="1. Actualizeaz&#x103; oferte" Style="{StaticResource BtnVerde}" Width="260"/>
          <TextBlock Grid.Column="1" Text="Cite&#x219;te ofertele din magazine (Profitshare, evoMAG, PC Garage) &#x219;i le salveaz&#x103;. Nu schimb&#x103; site-ul public." Foreground="#cbd5e1" VerticalAlignment="Center" TextWrapping="Wrap" Margin="6,0,0,6"/>
          <StackPanel Grid.Row="1" Orientation="Horizontal"><Button Name="BPreview" Content="2. Porne&#x219;te previzualizarea" Style="{StaticResource BtnAlbastru}" Width="190"/><Button Name="BOprestePreview" Content="Opre&#x219;te" Style="{StaticResource BtnGri}" Width="62"/></StackPanel>
          <StackPanel Grid.Row="1" Grid.Column="1" Orientation="Horizontal" Margin="6,0,0,6"><CheckBox Name="Demo" Content="Date DEMO" IsChecked="True" VerticalAlignment="Center" Margin="0,0,12,0"/><TextBlock Text="Vezi site-ul doar la tine, pe http://localhost:3100. Nu e public." Foreground="#cbd5e1" VerticalAlignment="Center"/></StackPanel>
          <Button Grid.Row="2" Name="BTeste" Content="3. Ruleaz&#x103; testele" Style="{StaticResource BtnAlbastru}" Width="260"/>
          <TextBlock Grid.Row="2" Grid.Column="1" Text="Verific&#x103; dac&#x103; totul e &#xEE;n regul&#x103; &#xEE;nainte de publicare." Foreground="#cbd5e1" VerticalAlignment="Center" Margin="6,0,0,6"/>
          <Button Grid.Row="3" Name="BLive" Content="4. PUBLIC&#x102; LIVE" Style="{StaticResource BtnRosu}" Width="260" FontSize="15"/>
          <TextBlock Grid.Row="3" Grid.Column="1" Text="ATEN&#x21A;IE: pune pe pretino.ro versiunea de pe main. Se vede imediat pentru toat&#x103; lumea." Foreground="#fca5a5" FontWeight="SemiBold" VerticalAlignment="Center" TextWrapping="Wrap" Margin="6,0,0,6"/>
          <StackPanel Grid.Row="4" Grid.ColumnSpan="2" Margin="0,8,0,0">
            <TextBlock Text="Actualizeaz&#x103; un singur magazin (celelalte r&#x103;m&#xE2;n neatinse):" Foreground="#94a3b8" Margin="0,0,0,6"/>
            <WrapPanel Name="PanouMagazine"/>
          </StackPanel>
        </Grid>
      </TabItem>
      <TabItem Header="2. Campanii PC Garage">
        <StackPanel>
          <TextBlock Text="Doar citire &#x219;i consultare - nu public&#x103; nimic pe site." Foreground="#94a3b8" Margin="0,0,0,8"/>
          <WrapPanel Margin="0,0,0,6">
            <TextBlock Text="Magazin:" VerticalAlignment="Center" Margin="0,0,6,6"/>
            <ComboBox Name="CMagazin" Width="100" SelectedIndex="0" Margin="0,0,10,6"><ComboBoxItem Content="toate"/><ComboBoxItem Content="pcgarage"/></ComboBox>
            <Button Name="CCauta" Content="Caut&#x103; campanii" Style="{StaticResource BtnVerde}"/>
            <Button Name="CActualizeaza" Content="Actualizeaz&#x103; campanii &#x219;i oferte" Style="{StaticResource BtnVerde}"/>
            <Button Name="COpreste" Content="Opre&#x219;te" Style="{StaticResource BtnPortocaliu}"/>
            <Button Name="CReia" Content="Reia verificarea &#xEE;ntrerupt&#x103;" Style="{StaticResource BtnAlbastru}"/>
            <Button Name="CRaport" Content="Raport" Style="{StaticResource BtnGri}"/>
            <Button Name="CVerifica" Content="Deschide Chrome pentru verificare" Style="{StaticResource BtnPortocaliu}"/>
          </WrapPanel>
          <TextBlock Name="CProgres" Foreground="#cbd5e1" TextWrapping="Wrap" Margin="0,0,0,8" Text="Campanii: nicio verificare &#xEE;n aceast&#x103; sesiune."/>
          <Grid Margin="0,0,0,8">
            <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <DockPanel Margin="0,0,6,0"><TextBlock DockPanel.Dock="Top" Text="Surse configurate (adrese)" Foreground="#94a3b8" Margin="0,0,0,3"/><ListBox Name="CSurse" Height="105"/></DockPanel>
            <DockPanel Grid.Column="1"><TextBlock DockPanel.Dock="Top" Text="Campanii g&#x103;site" Foreground="#94a3b8" Margin="0,0,0,3"/><ListBox Name="CCampanii" Height="105"/></DockPanel>
          </Grid>
          <WrapPanel Margin="0,0,0,6">
            <TextBox Name="CUrl" Width="340" Margin="0,0,6,6" ToolTip="Adres&#x103; pe domeniul PC Garage"/>
            <TextBox Name="CTitlu" Width="130" Margin="0,0,6,6" ToolTip="Titlu (op&#x21B;ional)"/>
            <Button Name="CAdauga" Content="Adaug&#x103; surs&#x103;" Style="{StaticResource BtnVerde}" Padding="10,5"/>
            <Button Name="CManual" Content="Adaug&#x103; campanie manual" Style="{StaticResource BtnVerde}" Padding="10,5"/>
            <Button Name="CComuta" Content="Activeaz&#x103; / Dezactiveaz&#x103; sursa" Style="{StaticResource BtnGri}" Padding="10,5"/>
            <Button Name="CSterge" Content="&#x218;terge sursa" Style="{StaticResource BtnRosu}" Padding="10,5"/>
            <Button Name="CDeschide" Content="Deschide pagina oficial&#x103;" Style="{StaticResource BtnGri}" Padding="10,5"/>
          </WrapPanel>
          <TextBox Name="CDetalii" Height="80" IsReadOnly="True" TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"/>
        </StackPanel>
      </TabItem>
      <TabItem Header="3. SEO: Google &#x219;i Bing">
        <StackPanel>
          <TextBlock Text="Verific&#x103;ri &#x219;i trimitere c&#x103;tre Google &#x219;i Bing. Nu modific&#x103; site-ul &#x219;i nu public&#x103; nimic. Ruleaz&#x103; pe site-ul LIVE, deci folose&#x219;te-le dup&#x103; PUBLIC&#x102; LIVE." Foreground="#94a3b8" TextWrapping="Wrap" Margin="0,0,0,10"/>
          <WrapPanel Margin="0,0,0,10">
            <Button Name="STot" Content="F&#x103; tot (verific&#x103; + Bing + vitez&#x103;)" Style="{StaticResource BtnVerde}" FontSize="14"/>
            <Button Name="SVerifica" Content="Verific&#x103; site-ul live" Style="{StaticResource BtnVerde}"/>
            <Button Name="STrimite" Content="Trimite paginile noi la Bing" Style="{StaticResource BtnVerde}"/>
            <Button Name="SViteza" Content="M&#x103;soar&#x103; viteza (mobil)" Style="{StaticResource BtnVerde}"/>
            <Button Name="SOpreste" Content="Opre&#x219;te" Style="{StaticResource BtnPortocaliu}" IsEnabled="False"/>
          </WrapPanel>
          <TextBlock Text="Google nu permite trimitere automat&#x103; f&#x103;r&#x103; cont conectat. Aceste butoane deschid direct paginile potrivite:" Foreground="#94a3b8" TextWrapping="Wrap" Margin="0,0,0,6"/>
          <WrapPanel Margin="0,0,0,8">
            <Button Name="SGSitemap" Content="Google: Sitemaps" Style="{StaticResource BtnGri}"/>
            <Button Name="SGInspect" Content="Google: Inspectare adres&#x103;" Style="{StaticResource BtnGri}"/>
            <Button Name="SGPerf" Content="Google: Performan&#x21B;&#x103;" Style="{StaticResource BtnGri}"/>
            <Button Name="SRich" Content="Test rezultate &#xEE;mbog&#x103;&#x21B;ite" Style="{StaticResource BtnGri}"/>
            <Button Name="SBing" Content="Bing Webmaster" Style="{StaticResource BtnGri}"/>
            <Button Name="SPageSpeed" Content="PageSpeed (site)" Style="{StaticResource BtnGri}"/>
          </WrapPanel>
          <TextBlock Text="Sitemap: https://pretino.ro/sitemap.xml  |  Raportul apare &#xEE;n jurnalul de jos." Foreground="#94a3b8"/>
        </StackPanel>
      </TabItem>
    </TabControl>
    <DockPanel Grid.Row="4">
      <TextBlock DockPanel.Dock="Top" Text="Jurnal (ce face programul acum)" Foreground="#94a3b8" Margin="0,0,0,3"/>
      <TextBox Name="Jurnal" IsReadOnly="True" FontFamily="Consolas" VerticalScrollBarVisibility="Auto" TextWrapping="Wrap"/>
    </DockPanel>
  </Grid>
</Window>
"@
try {
  $win = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
} catch {
  # Plasa de siguranta: daca interfata nu se poate incarca, descarca ultima versiune a proiectului ca sa se poata repara
  $eroare = "$_"
  try { Push-Location $Root; git pull --rebase --autostash -q 2>$null; Pop-Location } catch { Pop-Location }
  [void][System.Windows.MessageBox]::Show("Interfata programului nu s-a putut incarca.`n`nAm descarcat ultima versiune a proiectului. Inchide si porneste programul din nou.`nDaca apare din nou, trimite captura acestui mesaj:`n`n$eroare", 'Pretino - eroare interfata', 'OK', 'Error')
  exit 1
}

$c = @{}; foreach ($n in 'Stare','StareBox','PanouMagazine','Demo','BPreview','BOprestePreview','BActualizare','BTeste','BLive','BProgram','Jurnal','CMagazin','CCauta','CActualizeaza','COpreste','CReia','CRaport','CVerifica','CProgres','CSurse','CCampanii','CUrl','CTitlu','CAdauga','CManual','CComuta','CSterge','CDeschide','CDetalii','STot','SVerifica','STrimite','SViteza','SOpreste','SGSitemap','SGInspect','SGPerf','SRich','SBing','SPageSpeed') { $c[$n] = $win.FindName($n) }

function Set-Busy($busy) { foreach ($n in 'BPreview','BActualizare','BTeste','BLive','BProgram','STot','SVerifica','STrimite','SViteza') { $c[$n].IsEnabled = -not $busy }; $c.SOpreste.IsEnabled = $busy; foreach ($b in $c.PanouMagazine.Children) { $b.IsEnabled = -not $busy } }

function Start-Task($nume, $comanda) {
  if ($script:Proc -and -not $script:Proc.HasExited) { return }
  $script:LogFile = Join-Path $LogDir ("{0}-{1}.txt" -f $nume, (Get-Date -Format 'yyyyMMdd-HHmmss'))
  $c.Stare.Text = "Ruleaza: $nume..."
  Set-Busy $true
  $script:Proc = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c cd /d `"$Root`" && $comanda > `"$script:LogFile`" 2>&1" -WindowStyle Hidden -PassThru
}

function Set-CuloareStare {
  $t = "$($c.Stare.Text)"
  $col = '#16a34a'
  if ($t -match 'Oprit') { $col = '#ea580c' }
  elseif ($t -match 'eroare|esuat|invalid') { $col = '#dc2626' }
  elseif ($t -match 'ASTEPT|Alege') { $col = '#ea580c' }
  elseif ($t -match 'Ruleaza|ruleaza|Opresc|pornita') { $col = '#2563eb' }
  $c.StareBox.BorderBrush = (New-Object System.Windows.Media.BrushConverter).ConvertFromString($col)
}

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(700)
$timer.Add_Tick({
  Set-CuloareStare
  if ($script:LogFile -and (Test-Path $script:LogFile)) {
    try { $c.Jurnal.Text = (Get-Content $script:LogFile -Raw -Encoding UTF8 -ErrorAction Stop); $c.Jurnal.ScrollToEnd() } catch {}
  }
  if ($script:Proc -and $script:Proc.HasExited) {
    $c.Stare.Text = if ($script:Oprit) { 'Oprit de tine.' } elseif ($script:Proc.ExitCode -eq 0) { 'Terminat cu succes.' } else { "Terminat cu eroare (cod $($script:Proc.ExitCode))." }
    $script:Proc = $null; $script:Oprit = $false; Set-Busy $false
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

# ---------- SEO si motoare de cautare (ruleaza pe site-ul live; scripts/seo-motoare.js) ----------
$c.STot.Add_Click({ Start-Task 'seo-tot' 'bun scripts/seo-motoare.js --tot' })
$c.SVerifica.Add_Click({ Start-Task 'seo-verifica' 'bun scripts/seo-motoare.js --verifica' })
$c.STrimite.Add_Click({ Start-Task 'seo-trimite' 'bun scripts/seo-motoare.js --trimite' })
$c.SViteza.Add_Click({ Start-Task 'seo-viteza' 'bun scripts/seo-motoare.js --viteza' })
$c.SOpreste.Add_Click({
  if ($script:Proc -and -not $script:Proc.HasExited) {
    $script:Oprit = $true
    & taskkill /PID $script:Proc.Id /T /F | Out-Null
    $c.Stare.Text = 'Opresc...'
  }
})
$c.SGSitemap.Add_Click({ Start-Process 'https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Apretino.ro' })
$c.SGInspect.Add_Click({ Start-Process 'https://search.google.com/search-console/inspect?resource_id=sc-domain%3Apretino.ro' })
$c.SGPerf.Add_Click({ Start-Process 'https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Apretino.ro' })
$c.SRich.Add_Click({ Start-Process 'https://search.google.com/test/rich-results?url=https%3A%2F%2Fpretino.ro%2F' })
$c.SBing.Add_Click({ Start-Process 'https://www.bing.com/webmasters' })
$c.SPageSpeed.Add_Click({ Start-Process 'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fpretino.ro%2F&form_factor=mobile' })

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
$script:UltimaAsteptare = 0
$script:InNotificare = $false
function Show-Progres {
  $p = Read-Json (Join-Path $Root 'logs\campanii-progres.json')
  if (-not $p) { return }
  if ($p.stare -eq 'asteapta_utilizator' -and $p.asteapta -and $p.asteapta.id -ne $script:UltimaAsteptare -and -not $script:InNotificare -and $script:ProcC -and -not $script:ProcC.HasExited) {
    $script:UltimaAsteptare = $p.asteapta.id
    $script:InNotificare = $true
    [System.Media.SystemSounds]::Exclamation.Play()
    $c.Stare.Text = 'Campanii: ASTEPT VERIFICAREA ANTI-BOT - completeaz-o in fereastra de browser deschisa.'
    [void][System.Windows.MessageBox]::Show($win, "Magazinul cere verificare anti-bot ($($p.asteapta.url)).`n`nS-a deschis o fereastra de browser: bifeaza verificarea (si apasa Trimite daca exista).`nDupa aceea programul continua singur. Apasa OK ca sa inchizi acest mesaj.", 'Verificare anti-bot necesara', 'OK', 'Information')
    $script:InNotificare = $false
  }
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
function Mag-DinUrl($u) { if ($u -match 'pcgarage\.ro') { return 'pcgarage' } else { return $null } }

$campTimer = New-Object System.Windows.Threading.DispatcherTimer
$campTimer.Interval = [TimeSpan]::FromMilliseconds(1200)
$campTimer.Add_Tick({
  Show-Progres; Set-CuloareStare
  if ($script:ProcC -and $script:ProcC.HasExited) {
    $script:ProcC = $null; Set-BusyC $false; Load-Surse; Load-Campanii
    $c.Stare.Text = 'Campanii: verificare terminata. Vezi raportul pentru ce a ramas neverificat.'
  }
})
$campTimer.Start()
Set-BusyC $false; $c.COpreste.IsEnabled = $false
Load-Surse; Load-Campanii; Show-Progres

# Un buton pentru fiecare magazin activ din data\magazine.json (se creeaza automat; magazin nou = buton nou)
foreach ($m in (Read-Json (Join-Path $Root 'data\magazine.json'))) {
  if (-not $m.activ -or -not $m.sursa) { continue }
  $b = New-Object System.Windows.Controls.Button
  $b.Content = "$($m.nume)"; $b.Style = $win.FindResource('BtnVerde'); $b.Tag = $m.id; $b.Padding = [System.Windows.Thickness]::new(12,6,12,6); $b.Margin = [System.Windows.Thickness]::new(0,0,8,6)
  $b.Add_Click({ param($s, $e) $id = $s.Tag; Start-Task "actualizare-$id" "bun scripts/actualizare.js --magazin $id" })
  [void]$c.PanouMagazine.Children.Add($b)
}
$c.CCauta.Add_Click({ Start-Camp '--campanii' })
$c.CActualizeaza.Add_Click({ Start-Camp '--complet' })
$c.CReia.Add_Click({ Start-Camp '--complet --reia' })
$c.CVerifica.Add_Click({
  Push-Location $Root
  try { $o = (& bun scripts/deschide-browser.js 2>&1 | Out-String).Trim() } catch { $o = "$_" }
  Pop-Location
  $c.Stare.Text = "$o  (dupa ce site-ul PC Garage se deschide normal, LASA fereastra Chrome deschisa si porneste campaniile)"
})
$c.COpreste.Add_Click({
  New-Item -ItemType Directory -Force -Path (Split-Path $StopFlag) | Out-Null
  Set-Content -Path $StopFlag -Value 'stop'
  $c.Stare.Text = 'Opresc dupa pagina curenta; progresul se salveaza...'
})
$c.CRaport.Add_Click({ $script:LogFile = Join-Path $Root 'rapoarte\ultimul-raport-campanii.txt'; if (-not (Test-Path $script:LogFile)) { $c.Jurnal.Text = 'Niciun raport de campanii inca.' } })
$c.CAdauga.Add_Click({
  $u = $c.CUrl.Text.Trim(); $m = Mag-DinUrl $u
  if (-not $m) { $c.Stare.Text = 'URL invalid: trebuie sa fie pe pcgarage.ro.'; return }
  $c.Stare.Text = (Run-Camp @('--sursa-adauga', $m, $u, $c.CTitlu.Text.Trim())).Split("`n")[0]
  Load-Surse
})
$c.CManual.Add_Click({
  $u = $c.CUrl.Text.Trim(); $m = Mag-DinUrl $u
  if (-not $m) { $c.Stare.Text = 'URL invalid: trebuie sa fie pe pcgarage.ro.'; return }
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
