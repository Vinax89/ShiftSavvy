'use client';
import Link from 'next/link';
import { useAlerts } from '@/hooks/useAlerts';
import { useUid } from '@/hooks/useUid';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export default function AlertBell() {
  const uid = useUid();
  const alerts = useAlerts(uid ?? undefined);
  const count = alerts?.length || 0;
  const pathname = usePathname();
  const active = pathname === '/alerts';

  return (
    <Link
      href="/alerts"
      data-active={active || undefined}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
        'hover:bg-accent hover:text-accent-foreground',
        active && 'bg-primary text-primary-foreground'
      )}
    >
      <Bell className="size-4" />
      Alerts
      {count > 0 && (
        <span className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground rounded-full">
          {count}
        </span>
      )}
    </Link>
  );
}
