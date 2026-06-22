/**
 * Shared error type for apiFetch() failures.
 *
 * Mirrors the JSON error shapes produced by the backend's exception
 * handlers (app/interfaces/http/main.py):
 *   - { "detail": "..." }
 *   - { "detail": "...", "errors": [{ "field": "...", "msg": "..." }] }
 */

export interface ApiFieldError {
  field: string;
  msg: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly fieldErrors: ApiFieldError[];

  constructor(status: number, detail: string, fieldErrors: ApiFieldError[] = []) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }

  /** True for 401 Unauthorized — caller should trigger re-authentication. */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /** True for 403 Forbidden — caller lacks the required permission. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** True for 404 Not Found. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/**
 * Build an ApiError from a non-OK fetch Response.
 *
 * Falls back to `response.statusText` if the body isn't JSON or doesn't
 * match the expected `{ detail, errors? }` shape.
 */
export async function parseApiErrorResponse(response: Response): Promise<ApiError> {
  let detail = response.statusText || `Request failed with status ${response.status}`;
  let fieldErrors: ApiFieldError[] = [];

  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.detail === "string") {
        detail = record.detail;
      }
      if (Array.isArray(record.errors)) {
        fieldErrors = record.errors.filter(
          (entry): entry is ApiFieldError =>
            !!entry &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>).field === "string" &&
            typeof (entry as Record<string, unknown>).msg === "string",
        );
      }
    }
  } catch {
    // Response body wasn't JSON — keep the statusText fallback.
  }

  return new ApiError(response.status, detail, fieldErrors);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
