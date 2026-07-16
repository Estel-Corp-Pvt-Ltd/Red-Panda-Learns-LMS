const rawBackendUrl =
  import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_FUNCTIONS_BASE_URL ?? "";

export const BACKEND_URL = rawBackendUrl.replace(/\/$/, "");