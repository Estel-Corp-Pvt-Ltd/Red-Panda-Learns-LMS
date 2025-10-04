Contributing Guide: Date & Time Handling
Why This Matters

Firestore timestamps must always be server authoritative to prevent client clock skew.

Queries and UI rendering break if inconsistent date formats are used.

Developers need one source of truth for writing, reading, and displaying dates.

🔹 Firestore Writes

Always use serverTimestamp() when writing createdAt, updatedAt, lastActivityDate, or other system timestamps.

Never use new Date() for Firestore writes.

✅ Example:
```bash
import { serverTimestamp } from "firebase/firestore";

await addDoc(collection(db, "cohorts"), {
  title: "Cohort 1",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```
🔹 Firestore Reads
Firestore returns Timestamp objects. Convert them into JavaScript Date for consistency.
✅ Example:
```bash
import { Timestamp } from "firebase/firestore";
const docSnap = await getDoc(docRef);
const data = docSnap.data();
const cohort = {
  ...data,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
};
🔹 Queries
⚠️ serverTimestamp() cannot be used in Firestore queries.
When filtering by current time, use new Date() on the client.
✅ Example:
const now = new Date();
const q = query(
  collection(db, "live_sessions"),
  where("scheduledDate", ">=", now),
  where("status", "==", "scheduled")
);
```

🔹 UI Formatting

Always display times in the user’s local timezone unless explicitly specified.
Absolute Date Display
const formatted = new Intl.DateTimeFormat("default", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(cohort.createdAt);
Example output:
Sep 29, 2025, 11:45 AM
🔹 Best Practices
On Write: serverTimestamp()
On Read: Timestamp.toDate()
On UI: Format using Intl.DateTimeFormat or date-fns
On Query: use new Date()

🔹 Definition of Done
✅ No Firestore write uses new Date().
✅ All reads safely convert Timestamp → Date.
✅ UI shows user-local time by default.
✅ Queries use new Date() where needed.
✅ This guide is updated when new timestamp fields are added.

<!-- organization -->
Every user must have an organizationType.
Allowed values are in constants.ts under ORGANIZATION.
Default: INDUSTRY for email/password signups.
Developers must always use ORGANIZATION constants instead of raw strings.