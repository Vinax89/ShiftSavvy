'use client';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export default function Toaster() {
  return <SonnerToaster richColors closeButton />;
}
export const toast = sonnerToast;
