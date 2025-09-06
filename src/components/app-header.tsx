'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function AppHeader() {
  return (
    <header className="h-12 flex items-center px-3 border-b">
        <SidebarTrigger />
        <div className="font-medium ml-2">ShiftSavvy</div>
    </header>
  );
}
