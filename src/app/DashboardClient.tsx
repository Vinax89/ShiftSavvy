'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import AppHeader from '@/components/app-header';
import { CreditCard, DollarSign, User, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NetIncomeChart from '@/components/dashboard/net-income-chart';
import UpcomingShifts from '@/components/dashboard/upcoming-shifts';
import UpcomingBills from '@/components/dashboard/upcoming-bills';
import SavingsGuidance from '@/components/dashboard/savings-guidance';
import { OvertimeAlert } from '@/components/dashboard/overtime-alert';
import PaycheckSimulation from '@/components/dashboard/paycheck-simulation';
import DemoToast from '@/components/dashboard/DemoToast';

export default function DashboardClient() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Income (Month)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$4,231.89</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Safe to Spend
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$1,250.50</div>
                <p className="text-xs text-muted-foreground">
                  Until next payday
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Bills</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$845.00</div>
                <p className="text-xs text-muted-foreground">
                  In next 30 days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Shifts This Week
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+5</div>
                <p className="text-xs text-muted-foreground">
                  +2 since last week
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Net Income Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <NetIncomeChart />
              </CardContent>
            </Card>
            <div className="col-span-4 lg:col-span-3 space-y-4">
               <PaycheckSimulation />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-1">
             <SavingsGuidance />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
             <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Upcoming Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingShifts />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Upcoming Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingBills />
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-center p-4">
            <OvertimeAlert />
          </div>
          <div className="flex justify-center p-4">
            <DemoToast />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
