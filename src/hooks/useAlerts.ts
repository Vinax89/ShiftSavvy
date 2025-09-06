'use client';
import { useEffect, useState } from "react";
import { db } from "../lib/firebase.client";
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc } from "firebase/firestore";
import type { AlertDoc } from "../domain/alerts/types";

export function useAlerts(uid: string | undefined) {
  const [alerts, setAlerts] = useState<AlertDoc[] | null>(null);
  useEffect(() => {
    if (!uid) {
        setAlerts([]); // Clear alerts if no user
        return;
    };
    const q = query(
      collection(db, "users", uid, "alerts"),
      where("state", "==", "open"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map(d => d.data() as AlertDoc));
    });
  }, [uid]);
  return alerts;
}

export async function ackAlert(uid: string, alertId: string) {
  const ref = doc(db, "users", uid, "alerts", alertId);
  await updateDoc(ref, { ack: true, ackAt: Date.now(), state: "ack" as const });
}
