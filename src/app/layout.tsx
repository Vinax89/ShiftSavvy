import './globals.css'
import Toaster from '@/components/ui/toaster'
import ClientInit from '@/components/ClientInit'

export const metadata = {
  title: 'ShiftSavvy',
  description: 'Shift → Paycheck → Bills',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased flex">
        <ClientInit />
        <Toaster />
        {children}
      </body>
    </html>
  )
}
