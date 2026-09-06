param(
  [string]$InstallDir = 'C:\GenZ',
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
Set-Location $InstallDir

$envFile = Join-Path $InstallDir '.env.local'
if (-not (Test-Path $envFile)) { throw "Missing production environment file: $envFile" }

# Scheduled tasks run under SYSTEM and do not inherit the interactive user's
# environment. Load only simple KEY=VALUE entries from .env.local.
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $equals = $line.IndexOf('=')
  if ($equals -lt 1) { return }
  $key = $line.Substring(0, $equals).Trim()
  $value = $line.Substring($equals + 1).Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  [Environment]::SetEnvironmentVariable($key, $value, 'Process')
}

$env:NODE_ENV = 'production'
$env:PORT = "$Port"

Write-Host 'Running GenZ database migrations...'
& npm.cmd run db:migrate
if ($LASTEXITCODE -ne 0) { throw "Database migration failed with exit code $LASTEXITCODE." }

Write-Host "Starting GenZ on port $Port..."
& npm.cmd start
exit $LASTEXITCODE
