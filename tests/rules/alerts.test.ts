// tests/rules/alerts.test.ts
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { setDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { beforeAll, test } from "vitest";

let env: Awaited<ReturnType<typeof initializeTestEnvironment>>, authed: any, db: any, uid='u1';
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo",
    firestore: { rules: require('fs').readFileSync('firestore.rules','utf8') }
  });
  authed = env.authenticatedContext(uid);
  db = authed.firestore();
  // Seed alert (server bypass)
  const admin = env.unauthenticatedContext().firestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(admin, `users/${uid}/alerts/a1`), {
      createdAt: new Date(), ack: false
    });
  });
});

test("owner can only ack/ackAt", async () => {
  await assertSucceeds(updateDoc(doc(db, `users/${uid}/alerts/a1`), {
    ack: true, ackAt: new Date()
  }));
  await assertFails(updateDoc(doc(db, `users/${uid}/alerts/a1`), {
    ack: true, ackAt: new Date(), extra: 1 // not allowed
  }));
});

test("events immutable", async () => {
  const ref = doc(db, `users/${uid}/bnpl/events/e1`);
  // create allowed if you chose `create: if isOwner(uid)`; remove if server-only
  // await assertSucceeds(setDoc(ref, { t: new Date() }));
  await assertFails(updateDoc(ref, { patched: true }));
});
