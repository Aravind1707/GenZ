param(
  [string]$OutputDir = ".\backups",
  [string]$Container = "genz-mysql-1",
  [int]$RetentionDays = 14
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $OutputDir "genz_os-$stamp.sql"
$rootPassword = $env:MYSQL_ROOT_PASSWORD
if ([string]::IsNullOrWhiteSpace($rootPassword)) { throw 'Set MYSQL_ROOT_PASSWORD in the backup environment.' }
# Prefer the Compose service container name supplied by the operator. The dump is
# written through docker exec so MySQL remains private and port 3306 is not exposed.
docker exec $Container sh -c "exec mysqldump -uroot -p\"$rootPassword\" --single-transaction --routines --triggers --events genz_os" | Out-File -FilePath $file -Encoding utf8
if ((Get-Item $file).Length -lt 1024) { Remove-Item $file -Force; throw 'Backup appears empty.' }
Get-ChildItem $OutputDir -Filter 'genz_os-*.sql' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
Write-Host "Backup created: $file"
