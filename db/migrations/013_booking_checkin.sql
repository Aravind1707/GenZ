USE genz_os;
ALTER TABLE bookings ADD COLUMN checked_in_at DATETIME(3) NULL AFTER notes;
ALTER TABLE bookings ADD INDEX idx_bookings_checked_in(checked_in_at);
INSERT INTO schema_migrations(version,applied_at) VALUES(13,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
