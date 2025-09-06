'use server';
import 'server-only';

/**
 * @fileOverview Defines the types for the overtime alert flow.
 * The implementation has been moved to src/lib/actions.server.ts.
 *
 * - OvertimeAlertInput - The input type for the overtimeAlert function.
 * - OvertimeAlertOutput - The return type for the overtimeAlert function.
 */

import {z} from 'zod';

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
