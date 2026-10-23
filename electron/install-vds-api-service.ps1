# ŞefPOS VDS API — Windows Service kurulum (NSSM)
# Çalıştır: Administrator PowerShell → .\install-vds-api-service.ps1

$ErrorActionPreference = 'Stop'
$ApiDir = 'C:\sefpos-deploy\vds-api'
$NodeExe = 'C:\Program Files\nodejs\node.exe'
$ApiScript = Join-Path $ApiDir 'vdsApi.cjs'
$NssmDir = 'C:\sefpos-deploy\nssm'
$NssmExe = Join-Path $NssmDir 'nssm.exe'
$ServiceName = 'SefposVdsApi'

if (-not (Test-Path $NodeExe)) { throw "node.exe yok: $NodeExe" }
if (-not (Test-Path $ApiScript)) { throw "vdsApi.cjs yok: $ApiScript" }

New-Item -ItemType Directory -Force -Path $NssmDir | Out-Null
if (-not (Test-Path $NssmExe)) {
  Write-Host 'NSSM indiriliyor...'
  $zip = Join-Path $env:TEMP 'nssm-2.24.zip'
  Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath (Join-Path $env:TEMP 'nssm-extract') -Force
  $src = Get-ChildItem -Path (Join-Path $env:TEMP 'nssm-extract') -Recurse -Filter 'nssm.exe' |
    Where-Object { $_.FullName -match '\\win64\\nssm\.exe$' } |
    Select-Object -First 1
  if (-not $src) { throw 'nssm.exe (win64) bulunamadi' }
  Copy-Item $src.FullName $NssmExe -Force
}

# Eski görevleri bırak (yedek kalsın) ama servis asıl olsun
Get-CimInstance Win32_Process -Filter "name='node.exe'" | ForEach-Object {
  if ([string]$_.CommandLine -match 'vdsApi\.cjs') {
    try { Stop-Process -Id $_.ProcessId -Force } catch {}
  }
}
Get-CimInstance Win32_Process | Where-Object {
  [string]$_.CommandLine -match 'vds-api-keepalive'
} | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force } catch {}
}

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  & $NssmExe stop $ServiceName
  Start-Sleep -Seconds 1
  & $NssmExe remove $ServiceName confirm
  Start-Sleep -Seconds 1
}

& $NssmExe install $ServiceName $NodeExe $ApiScript
& $NssmExe set $ServiceName AppDirectory $ApiDir
& $NssmExe set $ServiceName DisplayName 'SefPOS VDS API'
& $NssmExe set $ServiceName Description 'SefPOS SQL API (127.0.0.1:8787) — giris / kayit / SMS'
& $NssmExe set $ServiceName Start SERVICE_AUTO_START
& $NssmExe set $ServiceName AppStdout (Join-Path $ApiDir 'vds-api.out.log')
& $NssmExe set $ServiceName AppStderr (Join-Path $ApiDir 'vds-api.err.log')
& $NssmExe set $ServiceName AppRotateFiles 1
& $NssmExe set $ServiceName AppRotateBytes 2000000
& $NssmExe set $ServiceName AppEnvironmentExtra "SEFPOS_VDS_API_CONFIG=$ApiDir\vds-api.json"
& $NssmExe set $ServiceName AppExit Default Restart
& $NssmExe set $ServiceName AppRestartDelay 3000
& $NssmExe set $ServiceName ObjectName LocalSystem

Start-Service $ServiceName
Start-Sleep -Seconds 2
Get-Service $ServiceName | Format-List Name, Status, StartType

try {
  $h = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/health' -UseBasicParsing -TimeoutSec 5
  Write-Host "HEALTH: $($h.Content)"
} catch {
  Write-Host "HEALTH FAIL: $($_.Exception.Message)"
  throw
}

Write-Host 'OK — SefposVdsApi Windows Service kuruldu (otomatik baslar, dusunce yeniden baslar).'
