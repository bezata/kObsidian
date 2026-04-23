export type ErrorCode =
  | "invalid_argument"
  | "not_found"
  | "conflict"
  | "unavailable"
  | "unauthorized"
  | "internal";

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  invalid_argument: 400,
  unauthorized: 401,
  not_found: 404,
  conflict: 409,
  unavailable: 503,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS_MAP[code];
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError("internal", error.message, { cause: error.name });
  }

  return new AppError("internal", "Unknown error", { error });
}
