export type DailyCloseTotals = {
  cash: bigint;
  upi: bigint;
  card: bigint;
  other: bigint;
  refunds: bigint;
};

export function netTenderTotal(totals: DailyCloseTotals): bigint {
  const gross = totals.cash + totals.upi + totals.card + totals.other;
  if (totals.refunds < 0n || totals.refunds > gross) throw new Error('Invalid refund total');
  return gross - totals.refunds;
}

export function assertDailyCloseBalanced(input: {
  ledgerNet: bigint;
  tenderNet: bigint;
}): void {
  if (input.ledgerNet !== input.tenderNet) {
    throw new Error(`Daily close is out of balance: ledger=${input.ledgerNet} tender=${input.tenderNet}`);
  }
}
