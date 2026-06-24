/**
 * LoginView test suite — 11 tests covering:
 *
 *  Rendering     : all form elements present
 *  Validation    : empty email, empty password, invalid email format
 *  Happy path    : successful login → token stored → redirect
 *  Remember Me   : token stored in localStorage when checked
 *  Error states  : invalid credentials, API failure (500), network failure
 *  Loading state : button disabled + spinner text while in-flight
 *  UX            : password visibility toggle
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginView } from "@/features/auth/components/LoginView";

// ─── Module mocks ─────────────────────────────────────────────────────────────

/** Capture router.push() calls without spinning up Next.js */
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/login",
}));

/**
 * Stub @azure/msal-react so tests don't need a real MsalProvider.
 * Tests run with IS_MOCK=true (set in vitest.config.ts env) so the Azure
 * panel is never rendered, but the hook imports still resolve.
 */
vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({ instance: { loginRedirect: vi.fn(), logoutRedirect: vi.fn() }, accounts: [] }),
  useIsAuthenticated: () => false,
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

/** Replace the real auth API so tests never hit a network */
vi.mock("@/features/auth/api/client", () => ({
  login: vi.fn(),
}));

/** Replace token storage so tests never touch localStorage / sessionStorage */
vi.mock("@/lib/auth/storage", () => ({
  setToken: vi.fn(),
  getToken: vi.fn(() => null),
  setUser: vi.fn(),
  getStoredUser: vi.fn(() => null),
  clearAuth: vi.fn(),
  clearSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
}));

// Import the mocked versions so we can configure them per-test
import { login as mockLogin } from "@/features/auth/api/client";
import { setToken } from "@/lib/auth/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_EMAIL = "admin@techgene.com";
const VALID_PASSWORD = "password123";
const MOCK_SUCCESS = {
  token: "mock-jwt-token",
  user: { id: "1", name: "Test User", email: VALID_EMAIL },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Renders LoginView inside a fresh QueryClient so mutations start clean.
 * retry:false prevents TanStack from re-attempting on error during tests.
 */
function renderLogin() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={qc}>
        <LoginView />
      </QueryClientProvider>,
    ),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Rendering ─────────────────────────────────────────────────────────────

  it("renders all form elements", () => {
    renderLogin();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
  });

  // ── 2. Validation — empty email ──────────────────────────────────────────────

  it("shows validation error when email is empty on submit", async () => {
    const { user } = renderLogin();

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ── 3. Validation — empty password ───────────────────────────────────────────

  it("shows validation error when password is empty on submit", async () => {
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ── 4. Validation — invalid email format ─────────────────────────────────────

  it("shows validation error for invalid email format", async () => {
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ── 5. Happy path — successful login ─────────────────────────────────────────

  it("calls login API, stores token and redirects to /dashboard on success", async () => {
    vi.mocked(mockLogin).mockResolvedValueOnce(MOCK_SUCCESS);
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(VALID_EMAIL, VALID_PASSWORD);
      // rememberMe defaults to false → sessionStorage path
      expect(setToken).toHaveBeenCalledWith("mock-jwt-token", false);
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  // ── 6. Remember Me — token persisted in localStorage ─────────────────────────

  it("passes rememberMe=true to setToken when Remember Me checkbox is checked", async () => {
    vi.mocked(mockLogin).mockResolvedValueOnce(MOCK_SUCCESS);
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.click(screen.getByLabelText(/remember me/i)); // check it
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith("mock-jwt-token", true);
    });
  });

  // ── 7. Invalid credentials error ─────────────────────────────────────────────

  it("displays error alert on invalid credentials", async () => {
    vi.mocked(mockLogin).mockRejectedValueOnce(new Error("Invalid email or password."));
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), "wrong@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/invalid email or password/i);
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── 8. API failure (server error) ────────────────────────────────────────────

  it("displays error alert on unexpected API failure", async () => {
    vi.mocked(mockLogin).mockRejectedValueOnce(new Error("Internal server error."));
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── 9. Network timeout / offline ─────────────────────────────────────────────

  it("displays error alert on network failure (TypeError: Failed to fetch)", async () => {
    vi.mocked(mockLogin).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── 10. Loading state ────────────────────────────────────────────────────────

  it("disables submit button and shows loading text while request is in-flight", async () => {
    // Promise that never resolves — keeps the mutation in isPending state
    vi.mocked(mockLogin).mockImplementation(() => new Promise(() => {}));
    const { user } = renderLogin();

    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Button text changes to "Signing in…" and becomes disabled
    const loadingButton = await screen.findByRole("button", {
      name: /signing in/i,
    });
    expect(loadingButton).toBeDisabled();
  });

  // ── 11. Password visibility toggle ───────────────────────────────────────────

  it("toggles password input type between password and text", async () => {
    const { user } = renderLogin();
    const passwordInput = screen.getByLabelText(/^password$/i);

    // Default: hidden
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click "Show password"
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput).toHaveAttribute("type", "text");

    // Click "Hide password"
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
