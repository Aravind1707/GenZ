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
  const creditPosted = input.creditPosted ?? 0n;
  const applied = input.capturedPayments + creditPosted;
  return {
    billTotal: input.billTotal,
    capturedPayments: input.capturedPayments,
    creditPosted,
    outstanding: input.billTotal > applied ? input.billTotal - applied : 0n,
  };
}

export function assertReconciliationSafe(input: ReconciliationTotals): void {
  if (input.billTotal < 0n || input.capturedPayments < 0n || input.creditPosted < 0n) {
    throw new Error('Reconciliation totals cannot be negative');
  }
  if (input.capturedPayments + input.creditPosted > input.billTotal) {
    throw new Error('Captured payments and credit exceed bill total');
  }
}
