USE genz_os;

-- Staff authority model: OWNER and MANAGER are the only supported roles.
-- Legacy roles are migrated before the enum is narrowed.
UPDATE staff_users SET role='MANAGER' WHERE role IN ('CASHIER','KITCHEN','FLOOR');
ALTER TABLE staff_users MODIFY COLUMN role ENUM('OWNER','MANAGER') NOT NULL;

INSERT INTO schema_migrations(version,applied_at) VALUES(43,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
