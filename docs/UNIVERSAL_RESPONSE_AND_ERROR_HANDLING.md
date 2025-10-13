# TypeScript Universal Response & Error Handling Standard

## Why we do this
This standard ensures all functions return a consistent, type-safe result, making error handling predictable across the project. 
It simplifies async operations, prevents unhandled exceptions, and improves TypeScript type safety.

**1️⃣ Our Universal Response Structure**

```ts
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code?: string; stack?: string } };

```

Every function — API, service, or utility — must return this Result<T>.

**⚙️ 2️⃣ Helper Utilities For Success And Failure**

```ts
const ok = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

const fail = (
  message: string,
  code?: string,
  stack?: string
): { success: false; error: { message: string; code?: string; stack?: string } } => {
  return {
    success: false,
    error: {
      message,
      code,
      // If stack is not provided, capture the current stack trace
      stack: stack ?? new Error().stack,
    },
  };
};
```

We use ok() and fail() to standardize all returns.


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

In .eslintrc.cjs (or .eslintrc.json):

```js
module.exports = {
  rules: {
    // Warn if exported async functions don’t have an explicit return type
    // Enforces that all exported async functions explicitly declare Promise<Result<T>>, preventing accidental mismatched return types.
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

will warn us unless we specify:

```ts
export async function getUser(): Promise<Result<User>> { ... }
```


**🧰 7️⃣ Universal Async Wrapper**
> Use `handle()` for most async service calls. For complex flows where you need granular error handling, manual try/catch is still fine.

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
