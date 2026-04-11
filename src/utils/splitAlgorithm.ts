import { SplitExpense, SplitParticipant } from '../types';

export interface Settlement {
  from: string; // participant id
  to: string; // participant id
  amount: number;
}

export interface SplitResult {
  balances: Record<string, number>; // participantId -> net balance
  settlements: Settlement[];
}

export function calculateSplits(participants: SplitParticipant[], expenses: SplitExpense[]): SplitResult {
  const balances: Record<string, number> = {};

  // Initialize balances to 0
  participants.forEach(p => {
    balances[p.id] = 0;
  });

  // Calculate net balances
  expenses.forEach(expense => {
    // Determine the payer
    if (balances[expense.paidById] !== undefined) {
      balances[expense.paidById] += expense.amount; // Payer gets credited
    }

    // Determine how much each owes
    if (expense.splitType === 'equal') {
      const validParticipants = expense.participants.filter(p => balances[p.participantId] !== undefined);
      if (validParticipants.length > 0) {
        const perPerson = expense.amount / validParticipants.length;
        validParticipants.forEach(p => {
          balances[p.participantId] -= perPerson; // Each participant owes
        });
      }
    } else if (expense.splitType === 'exact') {
      expense.participants.forEach(p => {
        if (balances[p.participantId] !== undefined) {
          balances[p.participantId] -= (p.value || 0);
        }
      });
    } else if (expense.splitType === 'percentage') {
      expense.participants.forEach(p => {
        if (balances[p.participantId] !== undefined) {
          const amountOwed = expense.amount * ((p.value || 0) / 100);
          balances[p.participantId] -= amountOwed;
        }
      });
    } else if (expense.splitType === 'shares') {
      const totalShares = expense.participants.reduce((acc, p) => acc + (p.value || 0), 0);
      if (totalShares > 0) {
        expense.participants.forEach(p => {
          if (balances[p.participantId] !== undefined) {
            const amountOwed = expense.amount * ((p.value || 0) / totalShares);
            balances[p.participantId] -= amountOwed;
          }
        });
      }
    }
  });

  // Settle Debts using Greedy algorithm
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    // Round to 2 decimals to avoid floating point issues
    const roundedBalance = Math.round(balance * 100) / 100;
    if (roundedBalance < 0) {
      debtors.push({ id, amount: -roundedBalance }); // amount is absolute debt
    } else if (roundedBalance > 0) {
      creditors.push({ id, amount: roundedBalance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];

  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: Math.round(amount * 100) / 100
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    // Small epsilon for floating point zero comparisons
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return { balances, settlements };
}
