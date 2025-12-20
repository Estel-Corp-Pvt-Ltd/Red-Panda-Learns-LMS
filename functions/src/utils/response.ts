export type SuccessResult<T> = {
  success: true;
  data: T;
  error?: never; // Explicitly never
};

export type ErrorResult = {
  success: false;
  data?: never; // Explicitly never
  error: {
    message: string;
    code?: string;
    stack?: string;
  };
};

export type Result<T> = SuccessResult<T> | ErrorResult;

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



