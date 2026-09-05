# MySQL Backup and Restore

GenZ production must maintain backups independently of the live application host. The backup process must use a dedicated MySQL account with only the privileges required for dumping, and backup files must be protected like production data.

## Windows scheduled backup example

Use Task Scheduler to run a PowerShell wrapper once daily. Keep the output directory outside the application checkout and copy encrypted backups to separate storage.

```powershell
$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = "D:\GenZBackups\genz_os-$stamp.sql"
& mysqldump.exe --single-transaction --routines --triggers --events --host=127.0.0.1 --port=3306 --user=genz_backup --password="$env:GENZ_BACKUP_PASSWORD" genz_os | Out-File -Encoding utf8 $out
```

Do not commit credentials or embed the real password in a task or script. Prefer Windows Credential Manager or a protected machine/user environment variable.

## Restore drill

1. Stop the GenZ application before replacing a production database.
2. Create a clean test database on an isolated host.
3. Import the selected backup with `mysql`.
4. Run all migrations that were newer than the backup.
5. Start GenZ against the restored database.
6. Verify customers, memberships, bookings, sessions, orders, payments, credit ledgers, inventory and finance records.
7. Record restore duration and any missing data.

A backup is not considered verified until a restore has succeeded on a clean database. Keep at least one backup on storage that is not writable by the live application account.
