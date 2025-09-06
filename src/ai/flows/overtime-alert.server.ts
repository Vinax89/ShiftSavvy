'use server';

/**
 * @fileOverview Checks the user's work schedule and warns them if accepting a shift could lead to overwork and burnout.
 *
 * - overtimeAlert - A function that checks the schedule and provides a personalized warning.
 * - OvertimeAlertInput - The input type for the overtimeAlert function.
 * - OvertimeAlertOutput - The return type for the overtimeAlert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OvertimeAlertInputSchema = z.object({
  workSchedule: z.string().describe('The user s work schedule in plain text.'),
  shiftDetails: z.string().describe('Details of the shift the user is considering picking up.'),
  userName: z.string().describe('The name of the user.'),
});
export type OvertimeAlertInput = z.infer<typeof OvertimeAlertInputSchema>;

const OvertimeAlertOutputSchema = z.object({
  alertMessage: z.string().describe('A personalized and gentle warning message about potential overwork and burnout.'),
});
export type OvertimeAlertOutput = z.infer<typeof OvertimeAlertOutputSchema>;

export async function overtimeAlert(input: OvertimeAlertInput): Promise<OvertimeAlertOutput> {
  return overtimeAlertFlow(input);
}

const prompt = ai.definePrompt({
  name: 'overtimeAlertPrompt',
  input: {schema: OvertimeAlertInputSchema},
  output: {schema: OvertimeAlertOutputSchema},
  prompt: `You are a helpful assistant designed to gently warn users about potential overwork and burnout.

  Given the user's work schedule and the details of a potential new shift, provide a personalized warning message.
  Be empathetic and understanding, and focus on the user's well-being.

  User Name: {{{userName}}}
  Work Schedule: {{{workSchedule}}}
  Shift Details: {{{shiftDetails}}}

  Craft a message that is both informative and supportive, encouraging the user to prioritize their health and avoid overexertion.`,
});

const overtimeAlertFlow = ai.defineFlow(
  {
    name: 'overtimeAlertFlow',
    inputSchema: OvertimeAlertInputSchema,
    outputSchema: OvertimeAlertOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
