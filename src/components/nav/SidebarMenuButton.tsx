'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function SidebarMenuButton({ href, children, isActive: manualIsActive }: { href: string; children: React.ReactNode, isActive?: boolean }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isActive = mounted && (manualIsActive || pathname === href)  // SSR neutral, no mismatch
  return (
    <Link
      href={href}
      data-active={isActive || undefined}
      className={cn(
        'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-foreground',
        isActive && 'bg-primary text-primary-foreground'
      )}
    >
      {children}
    </Link>
  )
}
