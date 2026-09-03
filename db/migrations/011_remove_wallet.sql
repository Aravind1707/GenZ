USE genz_os;

-- Wallet/GenZ Pay is intentionally not part of the current product.
-- Drop the legacy compatibility column if it exists on an upgraded database.
SET @has_wallet := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='members' AND column_name='wallet_balance');
SET @sql := IF(@has_wallet > 0, 'ALTER TABLE members DROP COLUMN wallet_balance', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO schema_migrations(version,applied_at) VALUES(11,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
