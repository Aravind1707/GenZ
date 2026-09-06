USE genz_os;
ALTER TABLE membership_transactions MODIFY COLUMN new_expires_at DATE NULL;
INSERT INTO schema_migrations(version,applied_at) VALUES(50,NOW(3)) ON DUPLICATE KEY UPDATE version=VALUES(version);
