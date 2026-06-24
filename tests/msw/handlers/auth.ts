import { http, HttpResponse } from "msw";

/**
 * MSW handlers for /auth/* endpoints.
 * These are used when IS_MOCK=false in tests — vi.mock() is used instead
 * in the LoginView unit tests, so these handlers serve as integration-test
 * and documentation of the expected API contract.
 */
export const authHandlers = [
  http.post("http://localhost/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === "admin@techgene.com" && body.password === "password123") {
      return HttpResponse.json({
        token: "mock-jwt-token-xyz",
        user: { id: "1", name: "Anshu Lal Gupta", email: body.email },
      });
    }

    return HttpResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }),
];
