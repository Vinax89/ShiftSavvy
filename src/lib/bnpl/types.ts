
// src/lib/bnpl/types.ts
export type Cadence = 'biweekly' | 'monthly';
export type ContractStatus = 'active' | 'paid' | 'late';
export type InstallmentStatus = 'scheduled' | 'paid' | 'refunded';

export interface BnplContract {
  userId: string;
  accountId: string;
  provider: string; // e.g., 'Afterpay', 'Klarna'
  merchant?: string; // best-effort reconstruction
  principal: number; // original principal after refunds
  feeTotal: number;  // sum of fees we can attribute
  startDate: string; // ISO date
  cadence: Cadence;
  expectedInstallments: 4 | 6 | 12 | number;
  installmentAmount: number; // typical amount
  paidCount: number; // number of installments marked paid
  nextDueDate?: string; // ISO date
  status: ContractStatus;
  endDate?: string; // calculated when fully paid
  sourceTxIds: string[]; // tx ids used to infer
  createdAt?: any; // Firestore server timestamp
  updatedAt?: any;
}

export interface BnplInstallment {
  contractId: string;
  txId?: string; // present when paid
  amount: number;
  dueDate: string; // ISO date (scheduled) OR same as postedAt for already-paid
  postedAt?: string; // ISO
  status: InstallmentStatus;
}

export interface TxnBnplAnnotation {
  contractId: string;
  role: 'principal' | 'installment' | 'fee';
}

export interface RawTransaction {
  id: string; // txId
  userId: string;
  accountId: string;
  amount: number; // negative for debit or positive? we normalize to +debit
  postedAt: string; // ISO
  description?: string;
  merchant?: string;
  mcc?: string | number;
}
