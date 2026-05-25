# Custom Email Verification Flow

This guide outlines how to use a custom email verification page with Firebase Authentication instead of showing Firebase's default action page.

## Goal

When a user signs up:

1. Firebase sends them a verification email.
2. The email link opens your app.
3. Your app reads Firebase's verification parameters.
4. Your custom page verifies the email using Firebase Auth.
5. The user is redirected to login or another destination.

## Firebase Console Setup

### 1. Enable Email/Password Auth

In Firebase Console:

1. Go to **Authentication**.
2. Open **Sign-in method**.
3. Enable **Email/Password**.

### 2. Add Authorized Domains

In Firebase Console:

1. Go to **Authentication**.
2. Open **Settings**.
3. Under **Authorized domains**, add every domain that will send or handle auth links.

Common examples:

```text
localhost
your-project.web.app
your-project.firebaseapp.com
your-production-domain.com
```

### 3. Configure the Email Verification Template

In Firebase Console:

1. Go to **Authentication**.
2. Open **Templates**.
3. Select **Email address verification**.
4. Customize the sender name, subject, and message if needed.
5. Set the action handler URL to your app auth handler route:

```text
https://your-production-domain.com/auth
```

For development, use your dev domain or local app:

```text
http://localhost:5173/auth
```

Firebase will append query parameters automatically:

```text
/auth?mode=verifyEmail&oobCode=CODE&continueUrl=URL
```

Your app must read these parameters.

## App Elements Required

### 1. Firebase Auth Setup

Your app needs a Firebase client config and exported Auth instance.

Example:

```ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### 2. Signup Function

After creating the user, send a verification email.

```ts
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

export async function signup(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  await sendEmailVerification(credential.user, {
    url: `${window.location.origin}/auth/login`,
  });

  return credential.user;
}
```

The `url` value is the `continueUrl`. It is where the user should go after verification succeeds.

### 3. Auth Action Redirect Route

Create a route like:

```text
/auth
```

This page reads Firebase's action params and sends email verification links to your custom verification page.

Example:

```tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthActionRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");
    const continueUrl = searchParams.get("continueUrl");

    if (mode === "verifyEmail" && oobCode) {
      const params = new URLSearchParams({ oobCode });

      if (continueUrl) {
        params.set("continueUrl", continueUrl);
      }

      navigate(`/auth/verify-email?${params.toString()}`, { replace: true });
      return;
    }

    navigate("/auth/login", { replace: true });
  }, [navigate, searchParams]);

  return <p>Processing authentication...</p>;
}
```

### 4. Custom Verify Email Page

Create a route like:

```text
/auth/verify-email
```

This page applies the Firebase action code.

Example:

```tsx
import { useEffect, useState } from "react";
import { applyActionCode } from "firebase/auth";
import { auth } from "./firebaseConfig";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function verifyEmail() {
      const params = new URLSearchParams(window.location.search);
      const oobCode = params.get("oobCode");
      const continueUrl = params.get("continueUrl");

      if (!oobCode) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        await applyActionCode(auth, oobCode);

        if (continueUrl) {
          window.location.href = continueUrl;
          return;
        }

        setStatus("success");
        setMessage("Your email has been verified successfully.");
      } catch {
        setStatus("error");
        setMessage("This verification link is invalid or expired.");
      }
    }

    void verifyEmail();
  }, []);

  return (
    <main>
      <h1>
        {status === "loading" && "Verifying Email"}
        {status === "success" && "Email Verified"}
        {status === "error" && "Verification Failed"}
      </h1>
      <p>{message}</p>
      {status !== "loading" && <a href="/auth/login">Go to login</a>}
    </main>
  );
}
```

### 5. App Routes

Register these routes in your router:

```tsx
<Route path="/auth" element={<AuthActionRedirect />} />
<Route path="/auth/verify-email" element={<VerifyEmailPage />} />
<Route path="/auth/login" element={<LoginPage />} />
<Route path="/auth/signup" element={<SignupPage />} />
```

### 6. Login Guard

When users sign in with email/password, check `emailVerified`.

```ts
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);

  if (!credential.user.emailVerified) {
    await signOut(auth);
    throw new Error("Please verify your email before logging in.");
  }

  return credential.user;
}
```

## End-to-End Flow

1. User signs up with email and password.
2. App creates the Firebase Auth user.
3. App calls `sendEmailVerification`.
4. Firebase sends an email containing a link to the configured action handler URL.
5. User clicks the email link.
6. Firebase opens:

```text
https://your-domain.com/auth?mode=verifyEmail&oobCode=CODE&continueUrl=URL
```

7. Your `/auth` route redirects to:

```text
/auth/verify-email?oobCode=CODE&continueUrl=URL
```

8. Your custom verification page calls `applyActionCode(auth, oobCode)`.
9. Firebase marks the user's email as verified.
10. The app redirects the user to login or the provided `continueUrl`.

## Testing Checklist

- Email/password sign-in is enabled in Firebase.
- Your local and production domains are authorized in Firebase Auth.
- The verification email template action URL points to `/auth`.
- Signup sends `sendEmailVerification`.
- The email link opens your app, not Firebase's default page.
- `/auth` receives `mode=verifyEmail` and `oobCode`.
- `/auth/verify-email` successfully calls `applyActionCode`.
- Unverified users cannot log in.
- Verified users can log in.

## Common Issues

### `auth/unauthorized-domain`

The current domain is missing from Firebase Auth authorized domains.

### Invalid or expired verification link

The `oobCode` has already been used, expired, or was altered.

### User still appears unverified after clicking the link

Refresh the current Firebase user or ask the user to sign in again. Firebase ID token/user state may be stale immediately after verification.

### Link opens Firebase default page

The email template action URL is not set to your app's `/auth` route.
