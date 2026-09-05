$ErrorActionPreference = 'Stop'

param(
  [string]$InstallDir = 'C:\GenZ',
  [string]$ServiceName = 'GenZOS',
  [int]$Port = 3000
)

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run PowerShell as Administrator.'
}

$node = (Get-Command node -ErrorAction Stop).Source
$npm = (Get-Command npm -ErrorAction Stop).Source
if (-not (Test-Path (Join-Path $InstallDir 'package.json'))) { throw "GenZ was not found at $InstallDir." }

$envFile = Join-Path $InstallDir '.env.local'
if (-not (Test-Path $envFile)) { throw "Create $envFile before registering the service." }

$wrapper = Join-Path $InstallDir 'deploy\windows\run-genz.ps1'
if (-not (Test-Path $wrapper)) { throw "Missing service wrapper: $wrapper" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$wrapper`" -InstallDir `"$InstallDir`" -Port $Port"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $ServiceName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName $ServiceName

Write-Host "GenZ scheduled service '$ServiceName' registered and started on port $Port."
Write-Host 'Use Windows Firewall to allow TCP 3000 only from the LAN/reverse proxy, and expose only HTTPS 443 on the router.'
