USE genz_os;

-- Booking deposits are cash advances, not earned revenue. Keep the existing
-- ledger type for backward compatibility, but give the entries a distinct
-- category so finance reporting can exclude them from revenue.
UPDATE finance_transactions
SET category='BOOKING_DEPOSIT_ADVANCE'
WHERE source_type='BOOKING_DEPOSIT_PAYMENT' AND category='BOOKING_DEPOSIT';

INSERT INTO schema_migrations(version,applied_at) VALUES(26,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
