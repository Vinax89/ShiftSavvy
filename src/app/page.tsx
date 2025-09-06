// src/app/page.tsx  (SERVER ONLY)
import 'server-only'
import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/dashboard') // or '/calendar' — pick your real landing route
}
