# 🧭 Code Style & Naming Conventions

This document defines the **coding standards and conventions** to ensure consistency, readability, and maintainability across the codebase.

---

## 1. General Principles

- Follow **TypeScript best practices** — type everything explicitly where possible.  
- Maintain **consistent naming, structure, and formatting** throughout the project.  
- Write **self-documenting code** — comments are for *why*, not *what*.  
- Keep functions, components, and files **short and purposeful**.  

---

## 2. File & Folder Naming

| Type | Convention | Example |
|------|-------------|----------|
| Folders | kebab-case | `user-profile/`, `course-list/` |
| Files (components) | PascalCase | `UserCard.tsx`, `LoginForm.tsx` |
| Files (utility, hooks, config) | kebab-case | `use-auth.ts`, `api-client.ts`, `form-utils.ts` |
| Stylesheets | kebab-case | `vendor-card.css`, `hero-section.css` |
| Tests | kebab-case + `.test.ts` | `auth-service.test.ts` |

---

## 3. Naming Conventions

| Category | Convention | Example |
|-----------|-------------|----------|
| **Variables** | `camelCase` | `userId`, `vendorName` |
| **Functions** | `camelCase` (verb first) | `getUserData()`, `calculateTotal()` |
| **Classes** | `PascalCase` | `AuthService`, `CourseModel` |
| **Interfaces / Types** | `PascalCase` + optional prefix `I` | `User`, `IAuthResponse` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT` |
| **React Components** | `PascalCase` | `CourseCard`, `LoginPage` |
| **Enums / Constant Objects** | `UPPER_SNAKE_CASE` | `COUPON_STATUS` |
| **Booleans** | Prefix with `is`, `has`, `can`, `should` | `isActive`, `hasPermission`, `canEdit` |

---

## 4. Constants & Enums

Prefer **readonly constant objects** (`as const`) over `enum` for clarity and type safety.

### ✅ Recommended Format

```ts
export const COUPON_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  EXPIRED: "EXPIRED",
} as const;

export type CouponStatus = typeof COUPON_STATUS[keyof typeof COUPON_STATUS];
