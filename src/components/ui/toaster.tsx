'use client';
import * as React from 'react';
import { Toaster as Sonner } from 'sonner';

export default function Toaster() {
  return (
    <Sonner
      richColors
      position="top-right"
      closeButton
      duration={4000}
    />
  );
}
