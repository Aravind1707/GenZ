USE genz_os;

-- Immutable cost-of-goods ledger. Each FIFO batch consumption creates one or more rows.
CREATE TABLE IF NOT EXISTS inventory_cogs_ledger (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  material_id VARCHAR(64) NOT NULL,
  batch_id VARCHAR(64) NOT NULL,
  qty DECIMAL(14,4) NOT NULL,
  unit_cost BIGINT UNSIGNED NOT NULL,
  total_cost BIGINT UNSIGNED NOT NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_cogs_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cogs_material FOREIGN KEY(material_id) REFERENCES inventory_materials(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cogs_batch FOREIGN KEY(batch_id) REFERENCES inventory_batches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cogs_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_cogs_qty CHECK(qty>0),
  INDEX idx_cogs_order(order_id,created_at),
  INDEX idx_cogs_material(material_id,created_at),
  INDEX idx_cogs_batch(batch_id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(44,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
