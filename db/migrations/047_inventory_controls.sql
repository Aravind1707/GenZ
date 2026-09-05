USE genz_os;

ALTER TABLE inventory_stocktakes
  ADD COLUMN approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN approved_by VARCHAR(64) NULL,
  ADD COLUMN approved_at DATETIME(3) NULL,
  ADD COLUMN rejection_reason VARCHAR(500) NULL;

ALTER TABLE inventory_material_movements
  ADD COLUMN authorization_status ENUM('AUTHORIZED','REJECTED') NOT NULL DEFAULT 'AUTHORIZED',
  ADD COLUMN authorized_by VARCHAR(64) NULL,
  ADD COLUMN authorized_at DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(40) NULL,
  email VARCHAR(160) NULL,
  address VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_inventory_supplier_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_purchase_history (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  supplier_id VARCHAR(64) NULL,
  material_id VARCHAR(64) NOT NULL,
  batch_id VARCHAR(64) NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit_cost BIGINT UNSIGNED NOT NULL,
  total_cost BIGINT UNSIGNED NOT NULL,
  received_at DATETIME(3) NOT NULL,
  received_by VARCHAR(64) NULL,
  notes VARCHAR(500) NULL,
  CONSTRAINT fk_purchase_supplier FOREIGN KEY(supplier_id) REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_material FOREIGN KEY(material_id) REFERENCES inventory_materials(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_batch FOREIGN KEY(batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_staff FOREIGN KEY(received_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_purchase_supplier(supplier_id,received_at),
  INDEX idx_purchase_material(material_id,received_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(47,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
