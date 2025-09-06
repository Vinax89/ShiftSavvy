'use client'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

export default function DemoToast() {
  return <Button onClick={() => toast.success('It works!')}>Test toast</Button>
}
