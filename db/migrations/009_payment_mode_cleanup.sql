USE genz_os;
ALTER TABLE orders MODIFY COLUMN payment_mode ENUM('PAY_NOW','COUNTER') NOT NULL;
INSERT INTO schema_migrations(version,applied_at) VALUES(9,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
