export type ApiErrorCode =
  | "UNAUTHORIZED" | "INVALID_REQUEST" | "NOT_FOUND" | "ANALYSIS_IN_PROGRESS"
  | "ALREADY_COMPLETE" | "NO_RECORDS" | "CONFIGURATION_ERROR" | "INVALID_RECORD"
  | "MODEL_RATE_LIMIT" | "MODEL_SAFETY_BLOCK" | "MODEL_INVALID_OUTPUT" | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(public code: ApiErrorCode, message: string, public status = 400, public retryable = false) {
    super(message);
  }
}

export function safeErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json({ ok: false, error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.status });
  }
  return Response.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", retryable: true } }, { status: 500 });
}
