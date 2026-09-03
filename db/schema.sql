PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('PC','PS5','MOZA')),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','BOOKED','ACTIVE','MAINTENANCE','BLOCKED')),
  hourly_rate INTEGER NOT NULL DEFAULT 0,
  slot_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id),
  customer_name TEXT NOT NULL,
  member_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','PAUSED','ENDED')),
  started_at TEXT NOT NULL,
  paused_at TEXT,
  ended_at TEXT,
  token TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_station_status ON sessions(station_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  station_id TEXT NOT NULL REFERENCES stations(id),
  status TEXT NOT NULL CHECK (status IN ('NEW','ACCEPTED','PREPARING','READY','DELIVERED','CANCELLED')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('PAY_NOW','ADD_TO_BILL','WALLET')),
  created_at TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
