# Refund and Reconciliation Rules

Refunds are financial reversals, not edits to the original sale. The original captured payment remains immutable; a refund creates a separate reversal/refund record linked to that payment.

## Rules

- Never refund more than the captured, non-refunded balance.
- A failed or pending payment is not refundable because it was never captured.
- Partial refunds require an explicit policy decision; the UI must not silently round or exceed the remaining balance.
- Voids are for reversing an eligible transaction before final settlement; refunds are for money returned after capture.
- Every refund/void must record actor, timestamp, reason, source payment and amount.
- Finance totals must include the reversal so daily reconciliation can compare gross captures, refunds, net revenue and tender totals.
- A refunded payment must not make an unpaid gaming session appear settled.

## Session-payment implementation

`session_payment_refunds` stores each captured refund against the original `session_settlements` row. Refunds support CASH, UPI, CARD, RAZORPAY and OTHER, require a reason, support an idempotency key, and are capped by the original settlement's remaining refundable amount.

The execution path locks the payment/session rows, validates the remaining refundable balance, writes the refund and `PAYMENT_REFUND` finance reversal in one transaction, recalculates settlement state and blocks an ended session's station again if the refund creates an outstanding balance. A settlement with an existing refund cannot subsequently be voided because that would create contradictory reversal records.

The current UI records the internal refund/reversal only. Razorpay/POS provider APIs are intentionally not called until the exact deployed provider contract is verified. When an external provider is integrated, its refund/reference result must be stored alongside the internal refund record and the provider's final status must be reconciled.

## Daily close

The daily close report separates captured tenders, payment/deposit refunds and operating expenses by method, calculates net tender and expected cash-drawer movement, and distinguishes earned-revenue timing differences caused by credit sales/repayments and booking-deposit advances. Physical cash can be counted and persisted for variance checking.
