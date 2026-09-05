USE genz_os;

UPDATE staff_users SET role='MANAGER' WHERE role IN ('CASHIER','KITCHEN','FLOOR');
ALTER TABLE staff_users MODIFY COLUMN role ENUM('OWNER','MANAGER') NOT NULL;

INSERT INTO schema_migrations(version,applied_at) VALUES(27,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
