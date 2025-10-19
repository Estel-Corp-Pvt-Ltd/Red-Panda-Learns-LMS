# 🧭 Code Style & Naming Conventions

This document defines **coding standards and conventions** to ensure consistency, readability, and maintainability across the codebase.

---

## 1. General Principles

- Follow **TypeScript best practices** — type everything explicitly where possible.
- Maintain **consistent naming, structure, and formatting** throughout the project.
- Write **self-documenting code** — comments should explain *why*, not *what*.
- Keep functions, components, and files **short and purposeful**.
- Use **async/await** instead of nested promises for readability.
- Use **Result patterns** (like `ok` / `fail`) for consistent error handling.
- Use **blank lines** to separate:
  - Imports from code
  - Logical code blocks
  - Function definitions
  - Try/catch blocks

---

## 2. File & Folder Naming

| Type | Convention | Example |
|------|-----------|---------|
| Folders | kebab-case | `user-profile/`, `course-list/` |
| Components | PascalCase | `UserCard.tsx`, `LoginForm.tsx` |
| Utilities / Hooks / Config | kebab-case | `use-auth.ts`, `api-client.ts` |
| Stylesheets | kebab-case | `vendor-card.css` |
| Tests | kebab-case + `.test.ts` | `auth-service.test.ts` |

---

## 3. Naming Conventions

| Category | Convention | Example |
|-----------|-----------|---------|
| Variables | camelCase | `userId`, `vendorName` |
| Functions | camelCase (verb first) | `getUserData()`, `calculateTotal()` |
| Classes | PascalCase | `AuthService`, `CourseModel` |
| Interfaces / Types | PascalCase | `User`, `IAuthResponse` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT` |
| React Components | PascalCase | `CourseCard`, `LoginPage` |
| Enums / Constant Objects | UPPER_SNAKE_CASE | `COUPON_STATUS` |
| Booleans | Prefix with `is`, `has`, `can`, `should` | `isActive`, `hasPermission` |

---

## 4. Constants & Enums

- Prefer **readonly constant objects** (`as const`) over `enum` for clarity and type safety.
- Use `as const` for string literal types and map them to TypeScript types.

```ts
export const COUPON_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  EXPIRED: "EXPIRED",
} as const;

export type CouponStatus = typeof COUPON_STATUS[keyof typeof COUPON_STATUS];
````

---

## 5. Import Guidelines

* Separate imports by **origin** with blank lines:

  1. External libraries (`firebase/auth`, `react`, etc.)
  2. Firebase / backend services
  3. Project constants, utils, types
  4. Local service modules
  5. Types

* Use **named imports** and **aliasing** for clarity.

```ts
import {
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword as firebaseCreateUser,
  User as FirebaseUser,
  UserCredential,
} from "firebase/auth";

import { collection, doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/firebaseConfig";
import { COLLECTION, USER_ROLE } from "@/constants";
import { fail, ok, Result } from "@/utils/response";

import { userService } from "./userService";
import { User } from "@/types/user";
```

---

## 6. Function & Doc Comment Guidelines

* **Always** document public / exported functions.
* Include **purpose**, **parameters**, and **return value**.
* Keep consistent formatting:

```ts
/**
 * Signs in a user using Firebase email and password authentication.
 * Fetches the corresponding user profile from Firestore by UID or email.
 *
 * @param email - The user's email address.
 * @param password - The user's password.
 * @returns A Result object containing the User and Firebase UserCredential on success, or an error on failure.
 */
async function signInWithEmailAndPassword(
  email: string,
  password: string
): Promise<Result<{ user: User; userCredential: UserCredential }>> {
  // function body
}
```

* **Private helper functions** can have short inline comments if their purpose is clear.
* Separate **logical code blocks** with blank lines inside functions (e.g., fetching user, fallback query, error handling).

---

## 7. Error Handling

* Catch errors using `try/catch` blocks.
* Log errors consistently with a **service name + method**.
* Map errors to **friendly messages** using helper functions.
* Return **Result objects** (`ok` / `fail`) instead of throwing exceptions in async service methods.

```ts
try {
  const userCredential = await firebaseSignIn(auth, email, password);
} catch (error: any) {
  logError("AuthService.signInWithEmailAndPassword", error);
  return fail(handleAuthError(error).message, error.code);
}
```

---

## 8. Blank Lines & Spacing

* **1 blank line**:

  * Between import groups
  * Between class properties/methods
  * Between logical sections inside functions

* **2 blank lines**:

  * Between top-level classes or exported functions in a file

* Avoid unnecessary trailing whitespace.

---

## 9. General Tips

* Keep functions **single-responsibility**; break down large functions.
* Use **async/await** for promises; avoid `.then()` chaining.
* Name functions **verbs first** (`getUser`, `createUser`, `sendEmail`).

---

## 10. Enforcing Rules

* Enable **TypeScript flags**:

```json
{
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

* Use **ESLint rules** for unused variables and formatting:

```js
"@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
```

* Use **Prettier** for automatic formatting to enforce blank lines and spacing.
