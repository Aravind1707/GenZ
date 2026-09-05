export type RefundDecision = {
  refundable: boolean;
  amount: bigint;
  reason: string;
};

/**
 * Pure policy boundary. Actual refund execution must be performed by the
 * payment/finance layer in a transaction and must create a reversal/audit
 * record. Never treat a client supplied refund amount as authoritative.
 */
export function calculateRefund(input: {
  capturedAmount: bigint;
  alreadyRefunded: bigint;
  requestedAmount: bigint;
  allowPartial: boolean;
}): RefundDecision {
  if (input.capturedAmount < 0n || input.alreadyRefunded < 0n || input.requestedAmount <= 0n) {
    throw new Error('Invalid refund amount');
  }

  const remaining = input.capturedAmount - input.alreadyRefunded;
  if (remaining <= 0n) {
    return { refundable: false, amount: 0n, reason: 'No refundable balance remains' };
  }

  if (!input.allowPartial && input.requestedAmount !== remaining) {
    return { refundable: false, amount: 0n, reason: 'Partial refunds are not permitted' };
  }

  if (input.requestedAmount > remaining) {
    return { refundable: false, amount: 0n, reason: 'Refund exceeds refundable balance' };
  }

  return { refundable: true, amount: input.requestedAmount, reason: 'Approved by configured policy' };
}
