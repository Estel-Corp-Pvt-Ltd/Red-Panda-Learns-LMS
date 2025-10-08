#TypeScript Universal Response & Error Handling Standard

**1️⃣ Define a Universal Response Structure**

At the core of your project (e.g. /src/types/common.ts):

```ts
export type Result<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
};
```

✅ This becomes your single source of truth for return types.
Every function — API, service, or utility — must return this Result<T>.

**⚙️ 2️⃣ Create a Helper Utility**

File: /src/utils/response.ts

```ts
import { Result } from "../types/common";

export const ok = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

export const fail = (
  message: string,
  code?: string,
  stack?: string
): Result<never> => ({
  success: false,
  error: { message, code, stack },
});
```

You have ok() and fail() to standardize all returns.


**🧱 3️⃣ Refactor Functions Incrementally**

❌ Before

```ts
function getUser(id: string) {
  if (!id) throw new Error("Missing ID");
  return { name: "John" };
}
```

✅ After

```ts
import { ok, fail } from "../utils/response";

function getUser(id: string) {
  if (!id) return fail("Missing ID");
  return ok({ name: "John" });
}
```

For async functions

```ts
async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) return fail("User not found", "NOT_FOUND");
    const data = await res.json();
    return ok(data);
  } catch (err) {
    return fail((err as Error).message, "FETCH_ERROR");
  }
}
```

**🧠 4️⃣ Centralize Error Logging**

File: /src/utils/logger.ts

```ts
export function logError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${context}]`, message);
}
```

✅ Use it inside all catch blocks for consistent logging.

**🚀 5️⃣ For APIs or Controllers**

Example (Express / Next.js):

```ts
app.get("/user/:id", async (req, res) => {
  const result = await fetchUser(req.params.id);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});
```

All APIs now return uniform:

```json
{
  "success": true,
  "data": { "id": "123", "name": "John" }
}
```

or

```json
{
  "success": false,
  "error": { "message": "User not found" }
}
```

**🧹 6️⃣ Enforce with ESLint / TypeScript**

✅ Option 1: Manual Rule in ESLint

In .eslintrc.cjs (or .eslintrc.json):

```js
module.exports = {
  rules: {
    // Warn if exported async functions don’t have an explicit return type
    "@typescript-eslint/explicit-function-return-type": "warn",

    // Optional: enforce typing for module exports
    "import/no-default-export": "off",
  },
};
```

This ensures functions like:

```ts
export async function getUser() { ... }
```

will warn you unless you specify:

```ts
export async function getUser(): Promise<Result<User>> { ... }
```

✅ Option 2: Use TypeScript types for service layers

Example — enforce all service functions return Result<T>:

```ts
type ServiceFunction<T> = (...args: any[]) => Promise<Result<T>>;
```

Usage:

```ts
const getUser: ServiceFunction<User> = async (id) => {
  ...
};
```

This ensures compile-time consistency.

**🧰 7️⃣ Optional: Universal Async Wrapper**

```ts
import { ok, fail } from "./response";

export async function handle<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (err) {
    return fail((err as Error).message);
  }
}
```

Usage:

```ts
const user = await handle(() => getUserFromDB("123"));
```

## 🧩 TypeScript-Specific Concepts Explained

| **Keyword / Feature**                                     | **TypeScript-Specific** | **Meaning**                                                          | **Why Used**                                              |
| --------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| **Generics `<T>`**                                        | ✅                      | A placeholder for any data type (e.g., `User`, `string`, `number[]`) | Reuse one structure (`Result<T>`) for multiple data types |
| **Type Annotations `: Type`**                             | ✅                      | Defines the expected type of a variable or return value              | Enforces correct input/output at compile time             |
| **`never` type**                                          | ✅                      | Represents a value that never exists                                 | Used in `fail()` because there’s no valid data on failure |
| **Type Imports**                                          | ✅                      | Import only type definitions                                         | Keeps project type-safe and consistent                    |
| **Type Guards (`instanceof`)**                            | ✅                      | Narrow the type at runtime safely                                    | Prevents invalid property access                          |
| **Explicit Return Type for Async (`Promise<Result<T>>`)** | ✅                      | Specifies return type of async functions                             | Enforces structure and prevents accidental mismatches     |
| **Optional Properties `?`**                               | ✅                      | Marks properties as optional                                         | Allows flexible but structured responses                  |
| **Generic Wrapper (`handle<T>`)**                         | ✅                      | Wraps async functions in a standard error/success structure          | Centralizes and simplifies error handling                 |
