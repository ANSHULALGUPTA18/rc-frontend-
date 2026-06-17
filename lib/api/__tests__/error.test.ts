import { describe, expect, it } from "vitest";
import { ApiError, isApiError, parseApiErrorResponse } from "@/lib/api/error";

describe("ApiError", () => {
  it("stores status, detail, and field errors", () => {
    const err = new ApiError(422, "Validation failed", [
      { field: "rate", msg: "must be positive" },
    ]);

    expect(err.status).toBe(422);
    expect(err.detail).toBe("Validation failed");
    expect(err.message).toBe("Validation failed");
    expect(err.fieldErrors).toEqual([{ field: "rate", msg: "must be positive" }]);
    expect(err.name).toBe("ApiError");
  });

  it("defaults fieldErrors to an empty array", () => {
    const err = new ApiError(500, "Internal server error");
    expect(err.fieldErrors).toEqual([]);
  });

  it.each([
    [401, "isAuthError", true],
    [403, "isAuthError", false],
    [403, "isForbidden", true],
    [404, "isForbidden", false],
    [404, "isNotFound", true],
    [500, "isNotFound", false],
  ] as const)("status %d -> %s is %s", (status, getter, expected) => {
    const err = new ApiError(status, "x");
    expect(err[getter]).toBe(expected);
  });
});

describe("isApiError", () => {
  it("returns true for ApiError instances", () => {
    expect(isApiError(new ApiError(400, "bad"))).toBe(true);
  });

  it("returns false for other errors and values", () => {
    expect(isApiError(new Error("plain"))).toBe(false);
    expect(isApiError("oops")).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});

describe("parseApiErrorResponse", () => {
  it("extracts detail from a { detail } body", async () => {
    const response = new Response(JSON.stringify({ detail: "Token has expired" }), {
      status: 401,
      statusText: "Unauthorized",
    });

    const err = await parseApiErrorResponse(response);

    expect(err.status).toBe(401);
    expect(err.detail).toBe("Token has expired");
    expect(err.fieldErrors).toEqual([]);
  });

  it("extracts detail and field errors from a validation error body", async () => {
    const response = new Response(
      JSON.stringify({
        detail: "Validation failed",
        errors: [{ field: "rate", msg: "must be positive" }],
      }),
      { status: 422, statusText: "Unprocessable Entity" }
    );

    const err = await parseApiErrorResponse(response);

    expect(err.status).toBe(422);
    expect(err.detail).toBe("Validation failed");
    expect(err.fieldErrors).toEqual([{ field: "rate", msg: "must be positive" }]);
  });

  it("ignores malformed entries in errors[]", async () => {
    const response = new Response(
      JSON.stringify({
        detail: "Validation failed",
        errors: [{ field: "rate" }, { field: "x", msg: "bad" }, "not-an-object"],
      }),
      { status: 422 }
    );

    const err = await parseApiErrorResponse(response);

    expect(err.fieldErrors).toEqual([{ field: "x", msg: "bad" }]);
  });

  it("falls back to statusText when the body is not JSON", async () => {
    const response = new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error",
    });

    const err = await parseApiErrorResponse(response);

    expect(err.status).toBe(500);
    expect(err.detail).toBe("Internal Server Error");
  });

  it("falls back to statusText when the body has no detail field", async () => {
    const response = new Response(JSON.stringify({ message: "nope" }), {
      status: 503,
      statusText: "Service Unavailable",
    });

    const err = await parseApiErrorResponse(response);

    expect(err.detail).toBe("Service Unavailable");
  });
});
