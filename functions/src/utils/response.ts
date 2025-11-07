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
