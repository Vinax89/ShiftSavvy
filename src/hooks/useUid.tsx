'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase.client'

export function useUid() {
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null))
  }, [])
  return uid
}
