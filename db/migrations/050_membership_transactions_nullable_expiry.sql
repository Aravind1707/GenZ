USE genz_os;

-- Membership is a single active product. Legacy transaction expiry remains nullable
-- for compatibility with historical transactions and future policy changes.
ALTER TABLE membership_transactions MODIFY COLUMN new_expires_at DATE NULL;

INSERT INTO schema_migrations(version,applied_at)
VALUES(50,NOW(3))
ON DUPLICATE KEY UPDATE version=VALUES(version);
