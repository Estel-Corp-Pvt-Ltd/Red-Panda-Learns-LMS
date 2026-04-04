import { ENVIRONMENT } from "@/constants";

const isDev = import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.DEVELOPMENT;

export function log(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

export function logWarn(...args: unknown[]) {
  if (isDev) {
    console.warn(...args);
  }
}

export function logError(context: string, err: unknown) {
  if (!isDev) return;

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(`[${context}]`, message, stack ?? "");
}
