import { NextResponse } from 'next/server';
import { z } from 'zod';
import { savingsTargetGuidance } from '@/ai/flows/savings-target-guidance.server';
import type { SavingsTargetGuidanceInput } from '@/ai/flows/savings-target-guidance.server';

export const runtime = 'nodejs';

const savingsSchema = z.object({
    income: z.coerce.number().positive({message: "Income must be a positive number."}),
    expenses: z.coerce.number().positive({message: "Expenses must be a positive number."}),
    currentSavings: z.coerce.number().nonnegative({message: "Current savings cannot be negative."}),
    savingsGoalDescription: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedFields = savingsSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json({ message: validatedFields.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }

    const input: SavingsTargetGuidanceInput = {
      ...validatedFields.data,
      futureShifts: '3 shifts scheduled next week: Mon 8h, Wed 8h, Fri 12h. Est. total pay $850.' // Mock data
    };
    
    const result = await savingsTargetGuidance(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}