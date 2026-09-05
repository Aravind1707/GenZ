export type ReconciliationTotals = {
  billTotal: bigint;
  capturedPayments: bigint;
  creditPosted: bigint;
  outstanding: bigint;
};

export function reconcileTotals(input: {
  billTotal: bigint;
  capturedPayments: bigint;
  creditPosted?: bigint;
}): ReconciliationTotals {
  const creditPosted = input.creditPosted ?? BigInt(0);
  const applied = input.capturedPayments + creditPosted;
  return {
    billTotal: input.billTotal,
    capturedPayments: input.capturedPayments,
    creditPosted,
    outstanding: input.billTotal > applied ? input.billTotal - applied : BigInt(0),
  };
}

export function assertReconciliationSafe(input: ReconciliationTotals): void {
  if (input.billTotal < BigInt(0) || input.capturedPayments < BigInt(0) || input.creditPosted < BigInt(0)) {
    throw new Error('Reconciliation totals cannot be negative');
  }
  if (input.capturedPayments + input.creditPosted > input.billTotal) {
    throw new Error('Captured payments and credit exceed bill total');
  }
}
