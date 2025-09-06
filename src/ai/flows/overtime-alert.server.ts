'use server';

import 'server-only';

/**
 * @fileOverview Defines the Genkit flow for the overtime alert feature.
 *
 * - OvertimeAlertInput - The input type for the overtimeAlert function.
 * - OvertimeAlertOutput - The return type for the overtimeAlert function.
 * - runOvertimeAlert - The exported function that executes the flow.
 */

import { z } from 'zod';
import { ai } from '@/ai/genkit.server';

const OvertimeAlertInputSchema = z.object({
  workSchedule: z.string().describe('The user\'s work schedule in plain text.'),
  shiftDetails: z.string().describe('Details of the shift the user is considering picking up.'),
  userName: z.string().describe('The name of the user.'),
});
export type OvertimeAlertInput = z.infer<typeof OvertimeAlertInputSchema>;

const OvertimeAlertOutputSchema = z.object({
  alertMessage: z.string().describe('A personalized and gentle warning message about potential overwork and burnout.'),
});
export type OvertimeAlertOutput = z.infer<typeof OvertimeAlertOutputSchema>;


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
async (flowInput) => {
    const {output} = await prompt(flowInput);
    return output!;
}
);

export async function runOvertimeAlert(input: OvertimeAlertInput): Promise<OvertimeAlertOutput> {
    return await overtimeAlertFlow(input);
}
