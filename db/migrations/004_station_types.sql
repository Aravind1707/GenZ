USE genz_os;
ALTER TABLE stations MODIFY COLUMN type ENUM('PC','PS5','PS4','PSVR','MOZA') NOT NULL;
INSERT INTO schema_migrations(version,applied_at) VALUES(4,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
