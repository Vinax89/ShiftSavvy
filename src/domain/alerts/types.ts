export type AlertSeverity = 'info' | 'warn' | 'critical';
export type AlertState = 'open' | 'ack';

export interface AlertDoc {
  userId: string;
  type: 'bill-due' | 'bill-overdue' | 'bnpl-due' | 'bnpl-overdue' | 'buffer-risk';
  title: string;
  body: string;
  severity: AlertSeverity;
  state: AlertState;
  dueDate?: string;         // ISO date (YYYY-MM-DD) for due/overdue
  entityRef?: {
    kind: 'bill' | 'bnpl' | 'paycheck' | 'account' | 'other';
    id?: string;
    name?: string;
  };
  createdAt: number;        // ms epoch
  ack?: boolean;
  ackAt?: number | null;    // ms epoch
  hash: string;             // deterministic idempotency key
}
