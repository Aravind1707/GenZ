param(
  [int]$AppPort = 3000
)

$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run PowerShell as Administrator.' }

New-NetFirewallRule -DisplayName 'GenZ App LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $AppPort -Profile Domain,Private -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName 'GenZ HTTPS Public' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -Profile Any -ErrorAction SilentlyContinue | Out-Null

Write-Host "Allowed GenZ application TCP $AppPort on Domain/Private profiles and HTTPS 443."
Write-Host 'Router policy: forward WAN TCP 443 to the reverse-proxy host only. Do NOT forward 3000, 3306, 3389, 22, router admin or CCTV ports.'
