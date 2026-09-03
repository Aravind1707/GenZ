CREATE DATABASE IF NOT EXISTS genz_os CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE genz_os;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INT UNSIGNED NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS stations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type ENUM('PC','PS5','MOZA') NOT NULL,
  status ENUM('AVAILABLE','BOOKED','ACTIVE','MAINTENANCE','BLOCKED') NOT NULL DEFAULT 'AVAILABLE',
  hourly_rate BIGINT UNSIGNED NOT NULL DEFAULT 0,
  slot_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  created_at DATETIME(3) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  station_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  member_id VARCHAR(64) NULL,
  status ENUM('ACTIVE','PAUSED','ENDED') NOT NULL,
  started_at DATETIME(3) NOT NULL,
  paused_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  gaming_balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  food_balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_sessions_station FOREIGN KEY (station_id) REFERENCES stations(id),
  INDEX idx_sessions_station_status (station_id,status),
  INDEX idx_sessions_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(100) NOT NULL,
  member_price BIGINT UNSIGNED NOT NULL,
  non_member_price BIGINT UNSIGNED NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_menu_active (active,category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  station_id VARCHAR(64) NOT NULL,
  status ENUM('NEW','ACCEPTED','PREPARING','READY','DELIVERED','CANCELLED') NOT NULL,
  payment_mode ENUM('PAY_NOW','ADD_TO_BILL','WALLET') NOT NULL,
  created_at DATETIME(3) NOT NULL,
  total BIGINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_orders_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  CONSTRAINT fk_orders_station FOREIGN KEY (station_id) REFERENCES stations(id),
  INDEX idx_orders_session (session_id),
  INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  unit_price BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  station_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  member_id VARCHAR(64) NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  status ENUM('PENDING','CONFIRMED','PAID','CANCELLED','NO_SHOW') NOT NULL DEFAULT 'CONFIRMED',
  deposit BIGINT UNSIGNED NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_bookings_station FOREIGN KEY (station_id) REFERENCES stations(id),
  INDEX idx_bookings_station_time (station_id,starts_at,ends_at,status)
) ENGINE=InnoDB;
