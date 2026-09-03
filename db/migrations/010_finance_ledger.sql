USE genz_os;
CREATE TABLE IF NOT EXISTS finance_transactions (
 id VARCHAR(64) NOT NULL PRIMARY KEY,
 type ENUM('REVENUE','EXPENSE') NOT NULL,
 category VARCHAR(100) NOT NULL,
 description VARCHAR(255) NOT NULL,
 amount BIGINT UNSIGNED NOT NULL,
 method ENUM('CASH','UPI','CARD','RAZORPAY','OTHER') NOT NULL DEFAULT 'CASH',
 source_type VARCHAR(80) NULL,
 source_id VARCHAR(64) NULL,
 created_by VARCHAR(64) NULL,
 created_at DATETIME(3) NOT NULL,
 CONSTRAINT fk_finance_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
 UNIQUE KEY uq_finance_source(source_type,source_id),
 INDEX idx_finance_created(created_at),
 INDEX idx_finance_type_created(type,created_at)
) ENGINE=InnoDB;
INSERT INTO schema_migrations(version,applied_at) VALUES(10,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
