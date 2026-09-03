USE genz_os;
ALTER TABLE bookings ADD COLUMN session_id VARCHAR(64) NULL AFTER checked_in_at;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD UNIQUE KEY uq_bookings_session(session_id);
ALTER TABLE bookings ADD INDEX idx_bookings_session(session_id);
INSERT INTO schema_migrations(version,applied_at) VALUES(15,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
