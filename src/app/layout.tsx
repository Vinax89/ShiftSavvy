import './globals.css'
import Toaster from '@/components/ui/toaster'       // client component, safe to include
import ClientInit from '@/components/ClientInit'     // small client-only initializer

export const metadata = {
  title: 'Nurse Finance',
  description: 'Shift → Paycheck → Bills',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning avoids warnings for attrs that may be toggled post-hydration
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body>
        {children}
        <Toaster />        {/* portal mounts after hydration */}
        <ClientInit />     {/* registers SW, etc., after mount */}
      </body>
    </html>
  )
}
