'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Drop <Toaster /> once in app layout.
 * Use: import { toast } from '@/components/ui/toast'; toast('Saved!')
 */
export default function Toaster() {
  return (
    <SonnerToaster
      richColors
      closeButton
      position="top-right"
      duration={3500}
      toastOptions={{ className: 'rounded-xl shadow-sm' }}
    />
  )
}
