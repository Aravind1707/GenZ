USE genz_os;
CREATE TABLE IF NOT EXISTS group_settlements (
 id VARCHAR(64) NOT NULL PRIMARY KEY,
 group_id VARCHAR(64) NOT NULL,
 method ENUM('CASH','UPI','CARD','RAZORPAY','OTHER') NOT NULL,
 amount BIGINT UNSIGNED NOT NULL,
 status ENUM('CAPTURED','VOIDED') NOT NULL DEFAULT 'CAPTURED',
 created_by VARCHAR(64) NULL,
 created_at DATETIME(3) NOT NULL,
 CONSTRAINT fk_group_settlement_group FOREIGN KEY(group_id) REFERENCES session_groups(id),
 CONSTRAINT fk_group_settlement_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
 INDEX idx_group_settlement_group(group_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS group_settlement_payers (
 id VARCHAR(64) NOT NULL PRIMARY KEY,
 settlement_id VARCHAR(64) NOT NULL,
 customer_id VARCHAR(64) NULL,
 label VARCHAR(120) NOT NULL,
 amount BIGINT UNSIGNED NOT NULL,
 CONSTRAINT fk_group_payer_settlement FOREIGN KEY(settlement_id) REFERENCES group_settlements(id) ON DELETE CASCADE,
 CONSTRAINT fk_group_payer_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
 INDEX idx_group_payer_settlement(settlement_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS group_settlement_allocations (
 id VARCHAR(64) NOT NULL PRIMARY KEY,
 settlement_id VARCHAR(64) NOT NULL,
 payer_id VARCHAR(64) NOT NULL,
 source_type ENUM('GAMING_SESSION','FOOD_ORDER_ITEM') NOT NULL,
 source_id VARCHAR(64) NOT NULL,
 session_id VARCHAR(64) NOT NULL,
 order_id VARCHAR(64) NULL,
 amount BIGINT UNSIGNED NOT NULL,
 created_at DATETIME(3) NOT NULL,
 CONSTRAINT fk_group_alloc_settlement FOREIGN KEY(settlement_id) REFERENCES group_settlements(id) ON DELETE CASCADE,
 CONSTRAINT fk_group_alloc_payer FOREIGN KEY(payer_id) REFERENCES group_settlement_payers(id) ON DELETE CASCADE,
 CONSTRAINT fk_group_alloc_session FOREIGN KEY(session_id) REFERENCES sessions(id),
 CONSTRAINT fk_group_alloc_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
 INDEX idx_group_alloc_source(source_type,source_id),
 INDEX idx_group_alloc_settlement(settlement_id)
) ENGINE=InnoDB;
INSERT INTO schema_migrations(version,applied_at) VALUES(14,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
