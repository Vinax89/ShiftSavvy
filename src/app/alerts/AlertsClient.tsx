'use client'
import React from 'react';
import { useAlerts, ackAlert } from '@/hooks/useAlerts';
import { AlertDoc } from '@/domain/alerts/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function Row({ a, uid }: { a: AlertDoc, uid: string }) {
  const onAck = async () => { await ackAlert(uid, a.hash); };

  const severityVariant = {
    critical: 'destructive',
    warn: 'default',
    info: 'secondary'
  } as const;


  return (
    <Card className="flex items-start justify-between gap-4 p-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={severityVariant[a.severity] || 'secondary'}>{a.severity}</Badge>
          <span className="font-medium">{a.title}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{a.body}</div>
         <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <span>{new Date(a.createdAt).toLocaleString()}</span>
            {a.dueDate && <Badge variant="outline">due {a.dueDate}</Badge>}
        </div>
      </div>
      <Button onClick={onAck} variant="outline" size="sm">Ack</Button>
    </Card>
  );
}

export default function AlertsClient({ uid }: { uid: string }) {
  const alerts = useAlerts(uid);

  if (alerts === null) {
    return (
        <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    )
  };

  if (!alerts.length) {
    return (
        <Card className="p-12 text-center text-muted-foreground">
            No open alerts 🎉
        </Card>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => <Row key={a.hash} a={a} uid={uid} />)}
    </div>
  );
}
