param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [string]$Container = "genz-mysql-1",
  [string]$Database = "genz_restore_verify"
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
$rootPassword = $env:MYSQL_ROOT_PASSWORD
if ([string]::IsNullOrWhiteSpace($rootPassword)) { throw 'Set MYSQL_ROOT_PASSWORD in the restore environment.' }
Get-Content -Raw $BackupFile | docker exec -i $Container sh -c "mysql -uroot -p\"$rootPassword\" -e 'DROP DATABASE IF EXISTS $Database; CREATE DATABASE $Database;' && mysql -uroot -p\"$rootPassword\" $Database"
if ($LASTEXITCODE -ne 0) { throw 'Restore failed.' }
Write-Host "Restore completed into $Database. Verify row counts and application migrations before treating this as a production restore sign-off."
