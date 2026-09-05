$ErrorActionPreference = 'Stop'
param(
  [string]$InstallDir = 'C:\GenZ',
  [int]$Port = 3000
)
Set-Location $InstallDir
$env:NODE_ENV = 'production'
$env:PORT = "$Port"
& npm.cmd start
exit $LASTEXITCODE
