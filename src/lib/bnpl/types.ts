// src/lib/bnpl/types.ts
import type { Timestamp } from 'firebase-admin/firestore';

// --- Firestore Document Schemas ---

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number; // in cents, negative for outflow
  date: Timestamp;
  merchant: string;
  note?: string;
  raw?: Record<string, any>;
}

export type BnplContractState = 'OPEN' | 'ACTIVE' | 'PAID' | 'LATE' | 'DEFAULTED' | 'CANCELED';
export type BnplScheduleFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface BnplContract {
  id: string;
  userId: string;
  provider: string;
  merchant: string;
  principal: number; // in cents
  currency: string;
  startDate: Timestamp;
  scheduleCount: number;
  scheduleFrequency: BnplScheduleFrequency;
  state: BnplContractState;
  nextDueDate: Timestamp | null;
  paidInstallments: number;
  totalInstallments: number;
  outstanding: number; // in cents
  lastReconciledAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type BnplInstallmentStatus = 'UPCOMING' | 'DUE' | 'PAID' | 'PARTIAL' | 'OVERDUE';

export interface BnplInstallment {
  id: string;
  contractId: string;
  dueDate: Timestamp;
  amountDue: number; // in cents
  amountPaid: number; // in cents
  status: BnplInstallmentStatus;
  paidAt: Timestamp | null;
}

export interface BnplLink {
  id: string;
  contractId: string;
  txnId: string;
  installmentId: string;
  amountApplied: number; // in cents, positive
  confidence: number; // 0..1
  matchedAt: Timestamp;
}


// --- Interfaces for Reconstruction Logic ---

// Simplified transaction shape for processing
export interface RawTransaction {
  id: string;
  userId: string;
  accountId: string;
  amountCents: number; // negative for debit/outflow
  postedDate: string; // YYYY-MM-DD
  description?: string;
  merchant?: string;
}
