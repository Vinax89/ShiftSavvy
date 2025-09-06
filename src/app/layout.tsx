'use client'
import { useEffect } from 'react'
import './globals.css';
import Toaster from '@/components/ui/toaster';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_SW === '1' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }
  }, [])
  return (
    <html lang="en">
        <body>
            {children}
            <Toaster />
        </body>
    </html>
    )
}
