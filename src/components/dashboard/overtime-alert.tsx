'use client';

import { useState } from 'react';
import { getOvertimeAlert } from '@/lib/actions';
import { type OvertimeAlertOutput } from '@/ai/flows/overtime-alert';
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

export function OvertimeAlert() {
    const [alert, setAlert] = useState<OvertimeAlertOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAlertCheck = async () => {
        setIsLoading(true);
        setAlert(null);
        try {
            const result = await getOvertimeAlert();
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
