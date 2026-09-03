CREATE TABLE IF NOT EXISTS inventory_items (
  item_id VARCHAR(64) NOT NULL PRIMARY KEY,
  on_hand INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 0,
  unit VARCHAR(40) NOT NULL DEFAULT 'unit',
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_inventory_menu_item FOREIGN KEY(item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  CONSTRAINT chk_inventory_on_hand CHECK(on_hand>=0),
  CONSTRAINT chk_inventory_reserved CHECK(reserved>=0),
  CONSTRAINT chk_inventory_reorder CHECK(reorder_level>=0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  status ENUM('RESERVED','CONSUMED','RELEASED') NOT NULL DEFAULT 'RESERVED',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_inventory_res_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_res_item FOREIGN KEY(item_id) REFERENCES menu_items(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_inventory_order_item(order_id,item_id),
  INDEX idx_inventory_res_item_status(item_id,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  item_id VARCHAR(64) NOT NULL,
  type ENUM('RECEIVE','RESERVE','RELEASE','CONSUME','ADJUST','WASTE') NOT NULL,
  qty INT NOT NULL,
  order_id VARCHAR(64) NULL,
  note VARCHAR(255) NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_inventory_move_item FOREIGN KEY(item_id) REFERENCES menu_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_move_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_move_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_inventory_move_item(item_id,created_at),
  INDEX idx_inventory_move_order(order_id)
) ENGINE=InnoDB;
