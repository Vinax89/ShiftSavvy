'use client';

import { useState } from 'react';
import { type OvertimeAlertOutput } from '@/ai/flows/overtime-alert.server';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Siren } from 'lucide-react';

async function triggerAlert(): Promise<OvertimeAlertOutput> {
    const res = await fetch('/api/overtime-alert', {
        method: 'POST',
        body: JSON.stringify({}), // Empty body for now, can add inputs later
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        throw new Error('Failed to fetch alert');
    }
    return res.json();
}

export function OvertimeAlert() {
    const [alert, setAlert] = useState<OvertimeAlertOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAlertCheck = async () => {
        setIsLoading(true);
        setAlert(null);
        try {
            const result = await triggerAlert();
            setAlert(result);
        } catch (error) {
            console.error(error);
            setAlert({ alertMessage: "Could not retrieve alert. Please try again."});
        }
        setIsLoading(false);
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" onClick={handleAlertCheck}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Siren className="mr-2 h-4 w-4" />}
                     Check for Overtime Risk
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className='font-headline'>Heads up!</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isLoading ? 'Checking your schedule...' : (alert ? alert.alertMessage : 'Click the button to check your schedule.')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction>Got it, thanks!</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}