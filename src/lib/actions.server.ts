'use server';
import 'server-only';

// Hard guard: only ever run on the server (prevents accidental client bundling)
if (typeof window !== 'undefined') {
  throw new Error('actions.server.ts must not run on the client')
}

import { z } from 'zod';
import type { SavingsTargetGuidanceInput, SavingsTargetGuidanceOutput } from '@/ai/flows/savings-target-guidance.server';
import type { OvertimeAlertOutput } from '@/ai/flows/overtime-alert.server';

const savingsSchema = z.object({
    income: z.coerce.number().positive({message: "Income must be a positive number."}),
    expenses: z.coerce.number().positive({message: "Expenses must be a positive number."}),
    currentSavings: z.coerce.number().nonnegative({message: "Current savings cannot be negative."}),
    savingsGoalDescription: z.string().optional(),
});


export async function getSavingsGuidance(formData: FormData): Promise<SavingsTargetGuidanceOutput> {
    const validatedFields = savingsSchema.safeParse({
        income: formData.get('income'),
        expenses: formData.get('expenses'),
        currentSavings: formData.get('currentSavings'),
        savingsGoalDescription: formData.get('savingsGoalDescription'),
    });

    if (!validatedFields.success) {
        throw new Error(validatedFields.error.errors.map(e => e.message).join(', '));
    }

    const { savingsTargetGuidance } = await import('@/ai/flows/savings-target-guidance.server');

    const input: SavingsTargetGuidanceInput = {
        ...validatedFields.data,
        futureShifts: '3 shifts scheduled next week: Mon 8h, Wed 8h, Fri 12h. Est. total pay $850.' // Mock data
    };
    
    return savingsTargetGuidance(input);
}

export async function getOvertimeAlert(): Promise<OvertimeAlertOutput> {
    const { runOvertimeAlert } = await import('@/ai/flows/overtime-alert.server');
    const input = {
        userName: 'Demo User',
        workSchedule: 'Worked 40 hours this week. Shifts on Mon, Tue, Wed, Fri, Sat.',
        shiftDetails: 'Considering picking up an 8-hour shift on Sunday.'
    };
    return runOvertimeAlert(input);
}
