# Issue Tracker

## Auth Service Differences To Review

- Add active session registration through a Firebase Cloud Function named `registerActiveSession`.
- Store the active session token in `localStorage`, with separate keys for development and production environments.
- Sign the user back out and clear client auth storage when Firebase login succeeds but Firestore profile lookup or session setup fails.
- Clear auth-related client storage on sign-out, including `cart`, `vizuara_roadmap_redirected`, Firebase localStorage keys, and active session tokens.
- During email/password login, only register an active session after confirming `firebaseUser.emailVerified`.
- Add optional `continueUrl` support to `createUserWithEmailAndPassword` and pass it to `sendEmailVerification`.
- Replace the username pseudo-email domain from `@RedPanda Learns.ai` with `@vizuara.ai`, or confirm the intended domain. The current value contains a space and is likely invalid for Firebase email auth.
- Register an active session after Google sign-in, and sign out plus clear client storage if that session registration fails.
- Decide whether `getToken()` should use `user.getIdToken(false)` to allow cached tokens or keep `user.getIdToken(true)` to force refresh every time.
- Expand Firebase auth error handling to cover `auth/invalid-credential`, `auth/invalid-login-credentials`, `auth/unauthorized-domain`, `auth/app-not-authorized`, `auth/operation-not-allowed`, and `auth/popup-blocked`.
- Fix the garbled warning and error symbols in `getToken()`.
