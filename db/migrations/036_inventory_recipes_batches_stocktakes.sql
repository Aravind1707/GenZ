USE genz_os;

CREATE TABLE IF NOT EXISTS inventory_materials (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
  unit VARCHAR(40) NOT NULL DEFAULT 'unit',
  reorder_level INT UNSIGNED NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_inventory_material_active(active,category,name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_item_recipes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  menu_item_id VARCHAR(64) NOT NULL,
  material_id VARCHAR(64) NOT NULL,
  qty_per_item DECIMAL(12,4) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_recipe_menu_item FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_material FOREIGN KEY(material_id) REFERENCES inventory_materials(id) ON DELETE RESTRICT,
  CONSTRAINT chk_recipe_qty CHECK(qty_per_item>0),
  UNIQUE KEY uq_recipe_menu_material(menu_item_id,material_id),
  INDEX idx_recipe_menu(menu_item_id),
  INDEX idx_recipe_material(material_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_material_stock (
  material_id VARCHAR(64) NOT NULL PRIMARY KEY,
  on_hand DECIMAL(14,4) NOT NULL DEFAULT 0,
  reserved DECIMAL(14,4) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(14,4) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_material_stock_material FOREIGN KEY(material_id) REFERENCES inventory_materials(id) ON DELETE CASCADE,
  CONSTRAINT chk_material_stock_on_hand CHECK(on_hand>=0),
  CONSTRAINT chk_material_stock_reserved CHECK(reserved>=0),
  CONSTRAINT chk_material_stock_reorder CHECK(reorder_level>=0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_batches (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  material_id VARCHAR(64) NOT NULL,
  received_qty DECIMAL(14,4) NOT NULL,
  remaining_qty DECIMAL(14,4) NOT NULL,
  unit_cost BIGINT UNSIGNED NOT NULL DEFAULT 0,
  supplier VARCHAR(160) NULL,
  batch_number VARCHAR(100) NULL,
  received_at DATETIME(3) NOT NULL,
  expiry_at DATE NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_batch_material FOREIGN KEY(material_id) REFERENCES inventory_materials(id) ON DELETE RESTRICT,
  CONSTRAINT fk_batch_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_batch_received CHECK(received_qty>0),
  CONSTRAINT chk_batch_remaining CHECK(remaining_qty>=0 AND remaining_qty<=received_qty),
  INDEX idx_batch_material_fifo(material_id,received_at,id),
  INDEX idx_batch_expiry(expiry_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_stocktakes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  status ENUM('OPEN','COMPLETED','VOID') NOT NULL DEFAULT 'OPEN',
  notes VARCHAR(500) NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  completed_by VARCHAR(64) NULL,
  completed_at DATETIME(3) NULL,
  CONSTRAINT fk_stocktake_created_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_stocktake_completed_staff FOREIGN KEY(completed_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_stocktake_status(status,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_stocktake_lines (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  stocktake_id VARCHAR(64) NOT NULL,
  material_id VARCHAR(64) NOT NULL,
  system_qty DECIMAL(14,4) NOT NULL,
  counted_qty DECIMAL(14,4) NULL,
  variance_qty DECIMAL(14,4) NULL,
  note VARCHAR(255) NULL,
  CONSTRAINT fk_stocktake_line_header FOREIGN KEY(stocktake_id) REFERENCES inventory_stocktakes(id) ON DELETE CASCADE,
  CONSTRAINT fk_stocktake_line_material FOREIGN KEY(material_id) REFERENCES inventory_materials(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_stocktake_material(stocktake_id,material_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_waste_reasons (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_material_movements (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  material_id VARCHAR(64) NOT NULL,
  type ENUM('RECEIVE','RESERVE','RELEASE','CONSUME','ADJUST','WASTE','STOCKTAKE') NOT NULL,
  qty DECIMAL(14,4) NOT NULL,
  order_id VARCHAR(64) NULL,
  batch_id VARCHAR(64) NULL,
  waste_reason_id VARCHAR(64) NULL,
  note VARCHAR(255) NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_material_move_material FOREIGN KEY(material_id) REFERENCES inventory_materials(id) ON DELETE RESTRICT,
  CONSTRAINT fk_material_move_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_material_move_batch FOREIGN KEY(batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_material_move_waste FOREIGN KEY(waste_reason_id) REFERENCES inventory_waste_reasons(id) ON DELETE SET NULL,
  CONSTRAINT fk_material_move_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_material_move_material(material_id,created_at),
  INDEX idx_material_move_order(order_id)
) ENGINE=InnoDB;

INSERT INTO inventory_waste_reasons(id,name,active,created_at) VALUES
('WASTE_EXPIRED','Expired',TRUE,NOW(3)),
('WASTE_DAMAGED','Damaged',TRUE,NOW(3)),
('WASTE_SPOILED','Spoiled',TRUE,NOW(3)),
('WASTE_PREP','Preparation waste',TRUE,NOW(3)),
('WASTE_OTHER','Other',TRUE,NOW(3))
ON DUPLICATE KEY UPDATE name=VALUES(name),active=VALUES(active);

INSERT INTO schema_migrations(version,applied_at) VALUES(36,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
