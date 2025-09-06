'use client'

import { Toaster as SonnerToaster } from 'sonner'

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
