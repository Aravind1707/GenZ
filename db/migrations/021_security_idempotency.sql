USE genz_os;

-- A client-generated idempotency key makes customer order retries safe.
-- The key is scoped to a session so the same key can never create two orders
-- for the same gaming tab, while NULL keeps legacy rows valid.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_idempotency_key VARCHAR(100) NULL;
ALTER TABLE orders ADD UNIQUE KEY uq_orders_session_idempotency(session_id,client_idempotency_key);

-- A Razorpay payment ID is a single capture identity. The order-level lock and
-- provider-order check in the application prevent reuse of a gateway order.
ALTER TABLE payment_transactions ADD UNIQUE KEY uq_payment_provider_payment(provider,provider_payment_id);

INSERT INTO schema_migrations(version,applied_at) VALUES(21,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
