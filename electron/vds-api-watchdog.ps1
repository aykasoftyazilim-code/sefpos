# ŞefPOS VDS API — kalıcı başlatıcı (Scheduled Task job'dan koparır)
# Windows, görev bitince child process'i öldürebilir; Win32_Process.Create bunu engeller.

$ErrorActionPreference = 'SilentlyContinue'
$ApiDir = 'C:\sefpos-deploy\vds-api'
$NodeExe = 'C:\Program Files\nodejs\node.exe'
$ApiScript = Join-Path $ApiDir 'vdsApi.cjs'
$ConfigEnv = Join-Path $ApiDir 'vds-api.json'
$LogFile = Join-Path $ApiDir 'watchdog.log'
$LockFile = Join-Path $ApiDir 'watchdog.lock'

function Write-Log([string]$msg) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 } catch {}
}

function Test-Listening8787 {
  try {
    $lines = netstat -ano | Select-String '127\.0\.0\.1:8787\s+.*LISTENING'
    return [bool]$lines
  } catch {
    return $false
  }
}

function Test-HealthOk {
  try {
    $req = [System.Net.HttpWebRequest]::Create('http://127.0.0.1:8787/health')
    $req.Method = 'GET'
    $req.Timeout = 2500
    $req.ReadWriteTimeout = 2500
    $req.Proxy = $null
    $resp = $req.GetResponse()
    try {
      $sr = New-Object IO.StreamReader($resp.GetResponseStream())
      $body = $sr.ReadToEnd()
      $sr.Close()
      return ($resp.StatusCode -eq 200 -and $body -match '"ok"\s*:\s*true')
    } finally {
      $resp.Close()
    }
  } catch {
    return $false
  }
}

function Start-VdsApiDetached {
  if (-not (Test-Path $NodeExe)) { Write-Log "node yok: $NodeExe"; return $false }
  if (-not (Test-Path $ApiScript)) { Write-Log "script yok: $ApiScript"; return $false }

  # Ortam: config yolu
  [Environment]::SetEnvironmentVariable('SEFPOS_VDS_API_CONFIG', $ConfigEnv, 'Process')

  # Win32_Process.Create → Scheduled Task Job Object dışında kalır (görev bitince ölmez)
  $cmd = 'cmd.exe /c set SEFPOS_VDS_API_CONFIG=' + $ConfigEnv + '&& "' + $NodeExe + '" "' + $ApiScript + '"'
  $r = ([wmiclass]'Win32_Process').Create($cmd, $ApiDir)
  if ($r.ReturnValue -eq 0) {
    Write-Log ("detatched start PID {0}" -f $r.ProcessId)
    return $true
  }
  Write-Log ("Win32_Process.Create return={0}" -f $r.ReturnValue)
  return $false
}

# Çift çalışma kilidi
if (Test-Path $LockFile) {
  $age = (Get-Date) - (Get-Item $LockFile).LastWriteTime
  if ($age.TotalSeconds -lt 40) { exit 0 }
}
Set-Content -Path $LockFile -Value $PID -Encoding ASCII

try {
  if ((Test-Listening8787) -and (Test-HealthOk)) {
    exit 0
  }

  # Port dinliyorsa ama health bozuksa: sadece bir kez nazikçe yeniden dene (öldürmeden)
  if (Test-Listening8787) {
    Start-Sleep -Seconds 2
    if (Test-HealthOk) { exit 0 }
    Write-Log 'port acik ama health kotu — mevcut vdsApi kapatilip yeniden baslatilacak'
    Get-CimInstance Win32_Process -Filter "name='node.exe'" | ForEach-Object {
      if ([string]$_.CommandLine -match 'vdsApi\.cjs') {
        try { Stop-Process -Id $_.ProcessId -Force; Write-Log ("PID {0} kapatildi" -f $_.ProcessId) } catch {}
      }
    }
    Start-Sleep -Seconds 1
  } else {
    Write-Log '8787 LISTENING yok — baslatiliyor'
  }

  if (-not (Start-VdsApiDetached)) { exit 1 }
  Start-Sleep -Seconds 3
  if (Test-HealthOk) {
    Write-Log 'health OK'
    exit 0
  }
  Write-Log 'health hala basarisiz'
  exit 2
}
finally {
  Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
}
