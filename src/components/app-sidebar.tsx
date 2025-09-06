'use client'

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  // compute collapsed/expanded on client; default neutral on SSR
  return <aside suppressHydrationWarning>{children}</aside>
}
