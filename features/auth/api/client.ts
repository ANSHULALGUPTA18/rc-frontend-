/**
 * Auth API client — login and logout.
 *
 * Mock mode: simulates a 600 ms network delay and accepts only the
 * MOCK_VALID_* credentials. Any other combination throws with the same
 * message the real API would return, so error-handling tests are realistic.
 *
 * Real mode: calls NEXT_PUBLIC_API_URL/auth/login. Non-2xx responses are
 * unwrapped and thrown as plain Error objects so callers don't need to
 * inspect the Response object.
 *
 * To switch to the real backend:
 *   1. Set NEXT_PUBLIC_USE_MOCK=false in .env.local
 *   2. Delete the MOCK_VALID_* constants and the entire `if (IS_MOCK)` block
 */

import { IS_MOCK, API_BASE } from "@/lib/api/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─── Mock credentials — delete when backend is connected ──────────────────────
const MOCK_VALID_EMAIL = "admin@techgene.com";
const MOCK_VALID_PASSWORD = "password123";

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Authenticates a user by email + password.
 * Throws a plain Error with a human-readable message on failure so the UI
 * can display error.message directly without any additional mapping.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  if (IS_MOCK) {
    // Simulate network latency so loading states are visible during dev
    await new Promise((r) => setTimeout(r, 600));
    if (email === MOCK_VALID_EMAIL && password === MOCK_VALID_PASSWORD) {
      return {
        token: "mock-jwt-token-xyz",
        user: { id: "1", name: "Anshu Lal Gupta", email },
      };
    }
    throw new Error("Invalid email or password.");
  }

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const payload = await res
      .json()
      .catch(() => ({ message: "Login failed. Please try again." })) as { message?: string };
    throw new Error(payload.message ?? "Login failed. Please try again.");
  }

  return res.json() as Promise<LoginResponse>;
}

export async function logout(): Promise<void> {
  if (IS_MOCK) return;
  await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
}
