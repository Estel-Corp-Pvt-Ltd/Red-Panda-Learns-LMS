# Issue Tracker

## Auth Service Differences To Review

- Add active session registration through a Firebase Cloud Function named `registerActiveSession`. [Future]
- Store the active session token in `localStorage`, with separate keys for development and production environments.  [Future]
- Sign the user back out and clear client auth storage when Firebase login succeeds but Firestore profile lookup or session setup fails. [Done]
- Clear auth-related client storage on sign-out, including `cart`, `vizuara_roadmap_redirected`, Firebase localStorage keys, and active session tokens (whichever among these apply, or anything that is set upon login). [Done]
- During email/password login, only register an active session after confirming `firebaseUser.emailVerified`. [Future]
- Add optional `continueUrl` support to `createUserWithEmailAndPassword` and pass it to `sendEmailVerification`. [Done]
- Replace the username pseudo-email domain from `@RedPanda Learns.ai` with `@redpandalearns.com`. The current value contains a space and is likely invalid for Firebase email auth. [Done]
- Register an active session after Google sign-in, and sign out plus clear client storage if that session registration fails. [Future]
- `getToken()` should use `user.getIdToken(false)` to allow cached tokens. [Done]
- Expand Firebase auth error handling to cover `auth/invalid-credential`, `auth/invalid-login-credentials`, `auth/unauthorized-domain`, `auth/app-not-authorized`, `auth/operation-not-allowed`, and `auth/popup-blocked`. [Done]
- Fix the garbled warning and error symbols in `getToken()`. [Done]
- Prevent orphaned Firebase Auth users when signup fails after `firebaseCreateUser()` succeeds. If `updateProfile()` or Firestore profile creation fails, delete the newly created Auth user, sign out, and clear client auth storage. Treat email verification failure separately by either keeping the created account and supporting resend verification, or adding full Firestore/Auth cleanup. [Open]
- `signInWithGoogle` does not check the `Result` returned by `userService.createUser`. If Firestore doc creation fails after a successful `signInWithPopup`, the function still returns `ok(...)`, leaving the user authenticated with no profile document. [Open]
- `userService.upsertFcmToken` sets `updatedAt` to `new Date()` (a JS Date) when updating an existing token, but `FcmToken.updatedAt` is a Firestore `Timestamp`. Should use `Timestamp.now()` for type consistency. [Open]

## Future Auth Features

- Add a dedicated email verification flow, including verification-pending UI, resend verification email, and post-verification redirect handling. [Future]
- Add a forgot password flow that lets users request a password reset email from the login screen. [Future]
