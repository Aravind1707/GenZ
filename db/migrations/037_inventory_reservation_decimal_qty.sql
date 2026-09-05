USE genz_os;

ALTER TABLE inventory_reservations MODIFY COLUMN qty DECIMAL(14,4) NOT NULL;

INSERT INTO schema_migrations(version,applied_at) VALUES(37,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
