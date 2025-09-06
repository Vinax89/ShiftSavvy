'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { type SavingsTargetGuidanceOutput } from '@/ai/flows/savings-target-guidance.server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Lightbulb, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

async function fetchGuidance(formData: FormData): Promise<SavingsTargetGuidanceOutput> {
    const res = await fetch('/api/savings-guidance', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch guidance');
    }
    return res.json();
}


function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90">
            {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Sparkles className="mr-2 h-4 w-4" />
            )}
            Get AI Guidance
        </Button>
    );
}

export default function SavingsGuidance() {
    const [result, setResult] = useState<SavingsTargetGuidanceOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    const formAction = async (formData: FormData) => {
        try {
            setError(null);
            setResult(null); // Clear previous results
            const guidance = await fetchGuidance(formData);
            setResult(guidance);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setResult(null);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">AI Savings Advisor</CardTitle>
                <CardDescription>Enter your details to get personalized savings advice.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="income">Monthly Income</Label>
                            <Input id="income" name="income" type="number" placeholder="$4500" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expenses">Monthly Expenses</Label>
                            <Input id="expenses" name="expenses" type="number" placeholder="$3200" required />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="currentSavings">Current Savings</Label>
                        <Input id="currentSavings" name="currentSavings" type="number" placeholder="$5000" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="savingsGoalDescription">Savings Goal (Optional)</Label>
                        <Input id="savingsGoalDescription" name="savingsGoalDescription" placeholder="e.g., Down payment for a car" />
                    </div>
                    <SubmitButton />
                </form>
                {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {result && (
                     <Alert className="mt-4 border-accent bg-accent/10">
                         <Lightbulb className="h-4 w-4 text-accent-foreground" />
                        <AlertTitle className="text-accent-foreground font-headline">AI Recommendation</AlertTitle>
                        <AlertDescription className="text-accent-foreground/90">
                           <p className="font-semibold mt-2">{result.recommendedSavingsGoal}</p>
                           <p className="mt-2 text-sm">{result.suggestions}</p>
                           <div className="mt-2 font-medium flex items-center gap-2">Goal Achievable: 
                            {result.savingsGoalAchievable ? 
                                <span className='flex items-center gap-1 text-green-700 dark:text-green-400'><CheckCircle className="h-4 w-4" /> Yes</span> : 
                                <span className='flex items-center gap-1 text-red-700 dark:text-red-400'><XCircle className="h-4 w-4" /> Challenging</span>}
                           </div>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}