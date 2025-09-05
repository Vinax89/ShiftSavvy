'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MinusCircle } from 'lucide-react';

export default function PaycheckSimulation() {
  const [shifts, setShifts] = useState(3);
  const [netPay, setNetPay] = useState(1850.75);

  const handleAddShift = () => {
    const newShifts = shifts + 1;
    setShifts(newShifts);
    setNetPay(netPay + 220.50);
  };

  const handleRemoveShift = () => {
    if (shifts > 0) {
      const newShifts = shifts - 1;
      setShifts(newShifts);
      setNetPay(netPay - 220.50);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paycheck Simulator</CardTitle>
        <CardDescription>Experiment with your schedule to estimate your next paycheck.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-4">
          <p className="text-lg font-medium">Shifts:</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRemoveShift} aria-label="Remove shift" disabled={shifts === 0}>
              <MinusCircle className="h-6 w-6" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center">{shifts}</span>
            <Button variant="ghost" size="icon" onClick={handleAddShift} aria-label="Add shift">
              <PlusCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>
        <div className="mt-6 text-center bg-secondary rounded-lg p-4">
            <p className="text-sm text-secondary-foreground">Estimated Net Pay</p>
            <p className="text-4xl font-bold font-headline text-primary transition-all duration-300">
                ${netPay.toFixed(2)}
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
