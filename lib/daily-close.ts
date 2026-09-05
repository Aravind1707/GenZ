export type DailyCloseTotals={cash:bigint;upi:bigint;card:bigint;other:bigint;refunds:bigint};
export function netTenderTotal(t:DailyCloseTotals):bigint{const gross=t.cash+t.upi+t.card+t.other;if(t.refunds<0n||t.refunds>gross)throw new Error('Invalid refund total');return gross-t.refunds}
export function cashDrawerNet(cashTender:bigint,cashRefunds:bigint,cashExpenses:bigint):bigint{if(cashTender<0n||cashRefunds<0n||cashExpenses<0n)throw new Error('Invalid cash drawer values');return cashTender-cashRefunds-cashExpenses}
export function cashVariance(actualCash:bigint,expectedCash:bigint):bigint{if(actualCash<0n)throw new Error('Invalid actual cash');return actualCash-expectedCash}
export function dailyCloseReconciliationDifference(input:{tenderNet:bigint;creditSales:bigint;creditRepayments:bigint;bookingDeposits:bigint;earnedRevenue:bigint}):bigint{return input.tenderNet+input.creditSales-input.creditRepayments-input.bookingDeposits-input.earnedRevenue}
export function assertDailyCloseBalanced(input:{ledgerNet:bigint;tenderNet:bigint}):void{if(input.ledgerNet!==input.tenderNet)throw new Error(`Daily close is out of balance: ledger=${input.ledgerNet} tender=${input.tenderNet}`)}
