import { type Shift } from '@/lib/mock-data';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function UpcomingShifts({ shifts }: { shifts: Shift[] }) {
  return (
    <div className="space-y-4">
      {shifts.slice(0, 3).map((shift: Shift) => (
        <div key={shift.id} className="flex items-center">
           <Avatar className="h-9 w-9">
            <AvatarImage src={`https://picsum.photos/seed/${shift.id}/100/100`} data-ai-hint="hospital building" />
            <AvatarFallback>{shift.site.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{shift.site}</p>
            <p className="text-sm text-muted-foreground">
              {format(shift.start, "EEE, MMM d 'at' h:mm a")}
            </p>
          </div>
          <div className="ml-auto font-medium text-green-600">+${shift.netPay.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}
