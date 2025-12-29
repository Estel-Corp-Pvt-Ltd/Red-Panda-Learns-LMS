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

All users have a required organizationType.
Valid values: SCHOOL, INDUSTRY, COLLEGE.
Default = INDUSTRY for all manual signups (including Google).
Always use the ORGANIZATION constant and OrganizationType type.
Update this document if a new organization type is added.

🔹User Identity Standardization
Overview
All user documents in Firestore are now keyed directly by the Firebase Authentication UID.
The UID serves both as the Firestore document ID and is stored inside the document as its id field.

This replaces the older custom format (user\_<number>, e.g., user_10000000) that caused mismatches between Auth and Firestore identifiers.

New Standard
Aspect Rule
Firestore document path /users/{uid}
Document ID The Firebase Auth uid
Stored field id: uid (explicitly stored in the document data)
Removed field uid (no longer a separate field in the document)

Example

````bash

users/
  ajx7T34HdSmKyP9zR21L9LQ7v5o2
    {
      "id": "ajx7T34HdSmKyP9zR21L9LQ7v5o2",
      "email": "user@example.com",
      "firstName": "Aria",
      "lastName": "Bennett",
      "role": "STUDENT",
      "status": "ACTIVE",
      ...
    }
    ```

Implementation Notes
User creation

When a user signs up or logs in via Google, the application calls userService.createUser(uid, data).
userService automatically assigns id: uid before writing to Firestore.
No code should manually generate or use the deprecated user_<number> identifiers.
Queried relationships

All lookups, joins, and rules now use the UID (user.id or document ID) as the definitive user reference.
Security rules

Firestore security rules validate using request.auth.uid exclusively.
Example:
```bash
JavaScript

match /users/{uid} {
  allow read, update, delete: if request.auth.uid == uid;
}
````

Benefits
One‑to‑one mapping between Firebase Auth and Firestore.
Simplified queries, stronger security, and easier integrations.
Zero risk of ID mismatches between systems.
