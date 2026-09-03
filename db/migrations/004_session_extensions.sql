USE genz_os;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_end_at DATETIME(3) NULL;
CREATE INDEX idx_sessions_station_scheduled_end ON sessions(station_id,scheduled_end_at,status);

INSERT INTO schema_migrations(version,applied_at) VALUES(4,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
