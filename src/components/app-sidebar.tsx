'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Wallet, Calendar, LineChart, FileText, Settings } from 'lucide-react';
import { Logo } from '@/components/icons';


const items = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/paycheck',  label: 'Paycheck', icon: Wallet  },
  { href: '/calendar',  label: 'Cashflow', icon: Calendar  },
  { href: '/planner',   label: 'Debt Planner', icon: LineChart },
  { href: '/transactions', label: 'Transactions', icon: FileText },
]

export default function AppSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 shrink-0 border-r bg-background flex flex-col">
      <div className="p-4 h-12 flex items-center border-b">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Logo className="size-6 text-primary" />
          ShiftSavvy
        </div>
      </div>
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  data-active={active || undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                    'hover:bg-accent hover:text-accent-foreground',
                    active && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="mt-auto p-2">
          <Link
            href="#"
            className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                'hover:bg-accent hover:text-accent-foreground'
            )}
            >
            <Settings className="size-4" />
            Settings
            </Link>
      </div>
    </aside>
  )
}
