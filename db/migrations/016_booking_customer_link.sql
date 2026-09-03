USE genz_os;
ALTER TABLE bookings ADD COLUMN customer_id VARCHAR(64) NULL AFTER customer_name;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD INDEX idx_bookings_customer(customer_id);
INSERT INTO schema_migrations(version,applied_at) VALUES(16,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
