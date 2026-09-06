USE genz_os;

-- Seed the physical GenZ Gaming Cafe equipment inventory.
-- Existing station status is intentionally preserved on re-runs so a migration
-- never resets a live station that is ACTIVE, BOOKED, MAINTENANCE, or BLOCKED.
INSERT INTO stations(id,name,type,pc_tier,status,hourly_rate,slot_minutes,created_at) VALUES
('PC-01','PC-01','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-02','PC-02','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-03','PC-03','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-04','PC-04','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-05','PC-05','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-06','PC-06','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-07','PC-07','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-08','PC-08','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-09','PC-09','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-10','PC-10','PC','PREMIUM','AVAILABLE',120,60,NOW(3)),
('PC-11','PC-11','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-12','PC-12','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-13','PC-13','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-14','PC-14','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-15','PC-15','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-16','PC-16','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-17','PC-17','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-18','PC-18','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-19','PC-19','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PC-20','PC-20','PC','NORMAL','AVAILABLE',90,60,NOW(3)),
('PS5-A','PS5-A','PS5',NULL,'AVAILABLE',150,60,NOW(3)),
('PS5-B','PS5-B','PS5',NULL,'AVAILABLE',150,60,NOW(3)),
('PS5-C','PS5-C','PS5',NULL,'AVAILABLE',150,60,NOW(3)),
('PS5-D','PS5-D','PS5',NULL,'AVAILABLE',150,60,NOW(3)),
('PS5-E','PS5-E','PS5',NULL,'AVAILABLE',150,60,NOW(3)),
('PSVR-01','PSVR-01','PSVR',NULL,'AVAILABLE',400,60,NOW(3)),
('PSVR-02','PSVR-02','PSVR',NULL,'AVAILABLE',400,60,NOW(3)),
('MOZA-01','MOZA-01','MOZA',NULL,'AVAILABLE',400,60,NOW(3)),
('MOZA-02','MOZA-02','MOZA',NULL,'AVAILABLE',400,60,NOW(3))
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  type=VALUES(type),
  pc_tier=VALUES(pc_tier),
  hourly_rate=VALUES(hourly_rate),
  slot_minutes=VALUES(slot_minutes);

INSERT INTO schema_migrations(version,applied_at)
VALUES(51,NOW(3))
ON DUPLICATE KEY UPDATE version=VALUES(version);
