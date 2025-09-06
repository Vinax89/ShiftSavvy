// Initialize Admin SDK once.
import { initializeApp, getApps } from 'firebase-admin/app';
if (!getApps().length) {
    initializeApp();
}
// Example HTTPS function (v2).
import { onRequest } from 'firebase-functions/v2/https';
export const helloWorld = onRequest((req, res) => {
    res.status(200).send('ShiftSavvy Functions are live ✅');
});
// --- Add your real functions here ---
// Example scheduled function (uncomment if you want one):
// import { onSchedule } from 'firebase-functions/v2/scheduler';
// export const nightlyTask = onSchedule("every day 01:00", async () => {
//   // do work
// });
//# sourceMappingURL=index.js.map