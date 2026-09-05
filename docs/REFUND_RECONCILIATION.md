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

The execution path must lock the payment/session rows, validate the remaining refundable balance, write the financial reversal and audit event in one transaction, then recalculate settlement state.
