USE genz_os;

-- Reconciliation covers both money received (REVENUE) and money returned/spent
-- (EXPENSE). Existing rows remain valid; the API now decides eligibility by type.
INSERT INTO schema_migrations(version,applied_at) VALUES(40,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
