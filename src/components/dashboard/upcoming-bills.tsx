import { type Bill } from '@/lib/mock-data';
import { format } from 'date-fns';
import { Landmark, Wifi, Car, CreditCard, Home } from 'lucide-react';

const categoryIcons: { [key: string]: React.ElementType } = {
  Housing: Home,
  Utilities: Wifi,
  Transport: Car,
  Debt: CreditCard,
  Default: Landmark,
};

export default function UpcomingBills({ bills }: { bills: Bill[] }) {
  const sortedBills = [...bills].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  
  return (
    <div className="space-y-4">
      {sortedBills.slice(0,4).map((bill: Bill) => {
        const Icon = categoryIcons[bill.category] || categoryIcons.Default;
        return (
            <div key={bill.id} className="flex items-center">
                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{bill.name}</p>
                    <p className="text-sm text-muted-foreground">
                    Due {format(bill.dueDate, "MMM d, yyyy")}
                    </p>
                </div>
                <div className="ml-auto font-medium">${bill.amount.toFixed(2)}</div>
            </div>
        )
      })}
    </div>
  );
}
