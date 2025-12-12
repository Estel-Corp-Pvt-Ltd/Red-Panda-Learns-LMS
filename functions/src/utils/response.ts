export type Result<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
};

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


export function logError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[${context}]`, message, stack || "");
};

