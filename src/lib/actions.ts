'use server';

import { savingsTargetGuidance, type SavingsTargetGuidanceInput, type SavingsTargetGuidanceOutput } from '@/ai/flows/savings-target-guidance.server';
import { overtimeAlert, type OvertimeAlertInput, type OvertimeAlertOutput } from '@/ai/flows/overtime-alert.server';
import { z } from 'zod';

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

    const input: SavingsTargetGuidanceInput = {
        ...validatedFields.data,
        futureShifts: '3 shifts scheduled next week: Mon 8h, Wed 8h, Fri 12h. Est. total pay $850.' // Mock data
    };

    return await savingsTargetGuidance(input);
}


export async function getOvertimeAlert(): Promise<OvertimeAlertOutput> {
    const input: OvertimeAlertInput = {
        userName: 'Demo User',
        workSchedule: 'Worked 40 hours this week. Shifts on Mon, Tue, Wed, Fri, Sat.',
        shiftDetails: 'Considering picking up an 8-hour shift on Sunday.'
    };

    return await overtimeAlert(input);
}
