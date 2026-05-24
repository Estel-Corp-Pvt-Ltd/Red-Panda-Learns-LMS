# Issue Tracker

## Priority Levels

| Label | Severity | When to act |
|-------|----------|-------------|
| **P0** | Critical | Data integrity, auth security, or production breakage affecting all users. Fix immediately. |
| **P1** | High | Important correctness or security issue on a key user path. Fix in the current cycle. |
| **P2** | Medium | Non-breaking improvement or planned feature work. Schedule for the near term. |
| **P3** | Low | Polish, minor inconsistency, or tech debt. Address when convenient. |

---

## Auth Service

| Priority | Issue | Status |
|----------|-------|--------|
| P0 | Replace invalid username pseudo-email domain — `@RedPanda Learns.ai` contains a space and is invalid for Firebase Auth; replaced with `@redpandalearns.com`. | Done |
| P0 | Sign the user out and clear client auth storage when Firebase login succeeds but the Firestore profile lookup fails. | Done |
| P0 | Prevent orphaned Firebase Auth users when signup fails after `firebaseCreateUser()` — if `updateProfile()` or Firestore doc creation fails, delete the Auth user, sign out, and clear client storage. If client-side deletion fails, the code can log it and sign out, but the orphaned Firebase Auth user may still remain. Long-term, move signup to a server-side endpoint or Cloud Function that creates Auth + Firestore together and uses Admin SDK cleanup on failure. Treat email verification failure separately (resend support or full cleanup). | Open |
| P0 | `signInWithGoogle` does not check the `Result` returned by `userService.createUser`. If Firestore doc creation fails after a successful `signInWithPopup`, the function still returns `ok(...)`, leaving the user authenticated with no profile document. | Open |
| P1 | Email signup can still leave orphaned Firebase Auth users if `updateProfile()` or `sendEmailVerification()` throws after `firebaseCreateUser()` succeeds. Add cleanup that deletes the newly created Auth user, signs out, and clears client storage for all post-create failure paths. | Open |
| P1 | Clear all auth-related client storage on sign-out: `cart`, `vizuara_roadmap_redirected`, Firebase localStorage keys, and active session tokens. | Done |
| P1 | `getToken()` should use `user.getIdToken(false)` to return a cached token instead of always forcing a refresh. | Done |
| P1 | During email/password login, only register an active session after confirming `firebaseUser.emailVerified`. | Future |
| P1 | Register an active session after Google sign-in; sign the user out and clear client storage if that session registration fails. | Future |
| P2 | Expand Firebase auth error handling to cover `auth/invalid-credential`, `auth/invalid-login-credentials`, `auth/unauthorized-domain`, `auth/app-not-authorized`, `auth/operation-not-allowed`, and `auth/popup-blocked`. | Done |
| P2 | Add optional `continueUrl` support to `createUserWithEmailAndPassword` and pass it through to `sendEmailVerification`. | Done |
| P2 | Add active session registration via a Firebase Cloud Function named `registerActiveSession`. | Future |
| P2 | Store the active session token in `localStorage` with separate keys for development and production environments. | Future |
| P2 | `userService.upsertFcmToken` sets `updatedAt` to `new Date()` (a JS Date) when updating an existing token, but `FcmToken.updatedAt` is a Firestore `Timestamp`. Should use `Timestamp.now()` for type consistency. | Open |
| P3 | Fix the garbled warning and error symbols in `getToken()`. | Done |

---

## Future Auth Features

| Priority | Feature | Status |
|----------|---------|--------|
| P1 | Add a dedicated email verification flow: verification-pending UI, resend verification email, and post-verification redirect handling. | Future |
| P1 | Add a forgot password flow that lets users request a password reset email from the login screen. | Future |
