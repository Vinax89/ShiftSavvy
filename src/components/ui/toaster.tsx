'use client';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export default function Toaster() {
  return <SonnerToaster richColors closeButton />;
}

// Optional: re-export toast so callers can import from the same module
export const toast = sonnerToast;
