'use server';

import 'server-only';

/**
 * @fileOverview A savings target guidance AI agent.
 *
 * - savingsTargetGuidance - A function that uses generative AI to help set reasonable savings goals and determine whether future shifts will allow the user to achieve those goals.
 * - SavingsTargetGuidanceInput - The input type for the savingsTargetGuidance function.
 * - SavingsTargetGuidanceOutput - The return type for the savingsTargetGuidance function.
 */

import {z} from 'genkit';
import {ai} from '@/ai/genkit.server';

const SavingsTargetGuidanceInputSchema = z.object({
  income: z.number().describe('The user\'s current monthly income.'),
  expenses: z.number().describe('The user\'s current monthly expenses.'),
  currentSavings: z.number().describe('The user\'s current savings balance.'),
  futureShifts: z
    .string()
    .describe(
      'A description of the user\'s upcoming work shifts, including dates, times, and estimated pay for each shift.'
    ),
  savingsGoalDescription: z
    .string()
    .optional()
    .describe('The user\'s desired savings goal, if any.'),
});
export type SavingsTargetGuidanceInput = z.infer<typeof SavingsTargetGuidanceInputSchema>;

const SavingsTargetGuidanceOutputSchema = z.object({
  recommendedSavingsGoal: z
    .string()
    .describe(
      'A recommended savings goal, taking into account the user\'s income, expenses, and future shifts.'
    ),
  savingsGoalAchievable: z
    .boolean()
    .describe(
      'Whether the user is likely to achieve their savings goal, given their current financial situation and future shifts.'
    ),
  suggestions: z
    .string()
    .describe(
      'Suggestions for how the user can increase their savings, such as reducing expenses or working more shifts.'
    ),
});
export type SavingsTargetGuidanceOutput = z.infer<typeof SavingsTargetGuidanceOutputSchema>;


const prompt = ai.definePrompt({
  name: 'savingsTargetGuidancePrompt',
  input: {schema: SavingsTargetGuidanceInputSchema},
  output: {schema: SavingsTargetGuidanceOutputSchema},
  prompt: `You are a financial advisor helping a user set a reasonable savings goal and determine if their future shifts will allow them to achieve that goal.

  Consider the following information about the user's financial situation:
  Current monthly income: {{income}}
  Current monthly expenses: {{expenses}}
  Current savings balance: {{currentSavings}}
  Future shifts: {{futureShifts}}
  Savings goal description: {{savingsGoalDescription}}

  Based on this information, provide the following:
  - A recommended savings goal.
  - Whether the user is likely to achieve their savings goal, given their current financial situation and future shifts.
  - Suggestions for how the user can increase their savings, such as reducing expenses or working more shifts.

  Please provide your response in a structured format.`,
});

const savingsTargetGuidanceFlow = ai.defineFlow(
  {
    name: 'savingsTargetGuidanceFlow',
    inputSchema: SavingsTargetGuidanceInputSchema,
    outputSchema: SavingsTargetGuidanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function savingsTargetGuidance(
  input: SavingsTargetGuidanceInput
): Promise<SavingsTargetGuidanceOutput> {
  return savingsTargetGuidanceFlow(input);
}
