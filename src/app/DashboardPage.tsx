'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import UpcomingShifts from '@/components/dashboard/upcoming-shifts';
import UpcomingBills from '@/components/dashboard/upcoming-bills';
import PaycheckSimulation from '@/components/dashboard/paycheck-simulation';
import NetIncomeChart from '@/components/dashboard/net-income-chart';
import SavingsGuidance from '@/components/dashboard/savings-guidance';
import { OvertimeAlert } from '@/components/dashboard/overtime-alert';
import type { Shift, Bill } from '@/lib/mock-data';
import { useState, useEffect } from 'react';
import AppHeader from '@/components/app-header';
import AppSidebar from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import {
  Home,
  LineChart,
  Package,
  Settings,
  Users,
  Wallet,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { usePathname } from 'next/navigation';

export default function DashboardPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Safely generate dynamic, date-based mock data on the client
    const upcomingShifts: Shift[] = [
      {
        id: '1',
        start: new Date(new Date().setDate(new Date().getDate() + 1)),
        end: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(new Date().getHours() + 8)),
        site: 'Main Hospital',
        netPay: 224,
      },
      {
        id: '2',
        start: new Date(new Date().setDate(new Date().getDate() + 2)),
        end: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(new Date().getHours() + 8)),
        site: 'Downtown Clinic',
        netPay: 240,
      },
      {
        id: '3',
        start: new Date(new Date().setDate(new Date().getDate() + 4)),
        end: new Date(new Date(new Date().setDate(new Date().getDate() + 4)).setHours(new Date().getHours() + 12)),
        site: 'Main Hospital',
        netPay: 380,
      },
    ];

    const upcomingBills: Bill[] = [
      {
        id: '1',
        name: 'Rent',
        amount: 1500,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        category: 'Housing',
      },
      {
        id: '2',
        name: 'Internet',
        amount: 70,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
        category: 'Utilities',
      },
      {
        id: '3',
        name: 'Car Payment',
        amount: 350,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 20),
        category: 'Transport',
      },
       {
        id: '4',
        name: 'Visa Credit Card',
        amount: 120,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 18),
        category: 'Debt',
      },
    ];
    setShifts(upcomingShifts);
    setBills(upcomingBills);
  }, []);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-6 text-primary" />
            <span className="text-lg font-semibold">ShiftSavvy</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard" isActive={pathname === '/dashboard'}>
                <Home />
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/paycheck" isActive={pathname === '/paycheck'}>
                <Wallet />
                Paycheck
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/calendar" isActive={pathname === '/calendar'}>
                <Calendar />
                Cashflow
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/planner" isActive={pathname === '/planner'}>
                <LineChart />
                Debt Planner
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/transactions" isActive={pathname === '/transactions'}>
                <FileText />
                Transactions
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <Settings />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="h-12 flex items-center px-4 border-b">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold ml-2">Dashboard</h1>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Upcoming Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingShifts shifts={shifts} />
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle className="font-headline">Upcoming Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingBills bills={bills} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <PaycheckSimulation />
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-1 lg:col-span-4">
              <CardHeader>
                <CardTitle className="font-headline">Net Income</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <NetIncomeChart />
              </CardContent>
            </Card>
            <Card className="col-span-1 lg:col-span-3">
               <SavingsGuidance />
            </Card>
          </div>
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Need advice?</CardTitle>
                    <CardDescription>Check your schedule for burnout risks before picking up extra shifts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OvertimeAlert />
                </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
