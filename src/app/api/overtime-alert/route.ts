import { NextResponse } from 'next/server';
import { runOvertimeAlert } from '@/ai/flows/overtime-alert.server';
import type { OvertimeAlertInput } from '@/ai/flows/overtime-alert.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // In a real app, you might get the user's name and schedule from a database
    const input: OvertimeAlertInput = {
        userName: 'Demo User',
        workSchedule: 'Worked 40 hours this week. Shifts on Mon, Tue, Wed, Fri, Sat.',
        shiftDetails: 'Considering picking up an 8-hour shift on Sunday.'
    };
    const result = await runOvertimeAlert(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'An error occurred while checking for overtime.' }, { status: 500 });
  }
}