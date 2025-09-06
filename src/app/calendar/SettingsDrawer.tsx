
'use client'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SettingsDrawer({ 
  open, 
  onOpenChange, 
  schedule, 
  setSchedule, 
  buffer, 
  setBuffer 
}:{ 
  open:boolean, 
  onOpenChange:(v:boolean)=>void, 
  schedule:any, 
  setSchedule:(s:any)=>void, 
  buffer:number, 
  setBuffer:(n:number)=>void 
}){
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[360px] sm:max-w-sm">
        <SheetHeader>
            <SheetTitle>Calendar Settings</SheetTitle>
            <SheetDescription>
                Configure your pay schedule and cash buffer to refine the forecast.
            </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pay-schedule">Pay schedule</Label>
            <Select value={schedule.kind} onValueChange={value => setSchedule({ ...schedule, kind: value })}>
                <SelectTrigger id="pay-schedule">
                    <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anchor-date">An anchor payday</Label>
            <Input id="anchor-date" type="date" value={schedule.anchor} onChange={e=>setSchedule({ ...schedule, anchor: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buffer-cents">Buffer ($)</Label>
            <Input id="buffer-cents" type="number" value={buffer/100} onChange={e=>setBuffer(parseInt(e.target.value||'0',10) * 100)} />
          </div>
        </div>
         <SheetFooter className="mt-6">
            <Button onClick={()=> onOpenChange(false)} className="w-full">Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
