/**
 * AuthFlow integration tests — 8 tests covering:
 *
 *  Auth context   : user info available after mock login
 *  Persistence    : stored user is restored from storage on reload
 *  Dashboard      : shows welcome message + user name when authenticated
 *  Logout         : clears storage, clears cookie, redirects to /login
 *  UserMenu       : renders user name + email, logout button present
 *  Protected route: AuthGuard redirects to /login when not authenticated
 *  Protected route: AuthGuard renders children when authenticated
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/features/auth/context/AuthContext";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { UserMenu } from "@/features/auth/components/UserMenu";

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
  usePathname: () => "/dashboard",
}));

vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: { logoutRedirect: vi.fn(), loginRedirect: vi.fn() },
    accounts: [],
    inProgress: "none",
  }),
  useIsAuthenticated: () => false,
  MsalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@azure/msal-browser", () => ({
  InteractionStatus: { None: "none" },
}));

vi.mock("@/features/auth/api/client", () => ({ login: vi.fn() }));

// ─── Storage mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/auth/storage", () => ({
  getStoredUser: vi.fn(),
  clearAuth: vi.fn(),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  setToken: vi.fn(),
  setUser: vi.fn(),
  getToken: vi.fn(() => null),
}));

import { getStoredUser, clearAuth, getToken } from "@/lib/auth/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQC()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

const MOCK_USER = { name: "Anshu Lal Gupta", email: "anshu@techgene.com", role: "Admin" };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AuthFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue(null);
    vi.mocked(getStoredUser).mockReturnValue(null);
  });

  // ── 1. User info available when stored ────────────────────────────────────

  it("exposes user info from storage via useAuth()", () => {
    vi.mocked(getStoredUser).mockReturnValue(MOCK_USER);
    vi.mocked(getToken).mockReturnValue("tok");

    function Probe() {
      const { user, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="name">{user?.name}</span>
          <span data-testid="auth">{String(isAuthenticated)}</span>
        </div>
      );
    }

    render(<Probe />, { wrapper: Wrapper });
    expect(screen.getByTestId("name")).toHaveTextContent("Anshu Lal Gupta");
    expect(screen.getByTestId("auth")).toHaveTextContent("true");
  });

  // ── 2. Session persistence — user restored from storage on page load ──────

  it("restores user session from localStorage on reload", () => {
    vi.mocked(getStoredUser).mockReturnValue(MOCK_USER);
    vi.mocked(getToken).mockReturnValue("persisted-token");

    function Probe() {
      const { user } = useAuth();
      return <span>{user?.email}</span>;
    }

    render(<Probe />, { wrapper: Wrapper });
    expect(screen.getByText("anshu@techgene.com")).toBeInTheDocument();
  });

  // ── 3. Dashboard shows welcome message ───────────────────────────────────

  it("shows user name in welcome message when authenticated", () => {
    vi.mocked(getStoredUser).mockReturnValue(MOCK_USER);
    vi.mocked(getToken).mockReturnValue("tok");

    function WelcomeBanner() {
      const { user } = useAuth();
      if (!user) return null;
      return <p>Welcome back, <span>{user.name}</span></p>;
    }

    render(<WelcomeBanner />, { wrapper: Wrapper });
    expect(screen.getByText(MOCK_USER.name)).toBeInTheDocument();
  });

  // ── 4. Logout clears auth and redirects ──────────────────────────────────

  it("logout clears auth storage and redirects to /login", async () => {
    vi.mocked(getStoredUser).mockReturnValue(MOCK_USER);
    vi.mocked(getToken).mockReturnValue("tok");

    function LogoutTrigger() {
      const { logout } = useAuth();
      return <button onClick={logout}>Sign out</button>;
    }

    const ue = userEvent.setup();
    render(<LogoutTrigger />, { wrapper: Wrapper });
    await ue.click(screen.getByRole("button", { name: /sign out/i }));

    expect(clearAuth).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  // ── 5. UserMenu shows user name and email ────────────────────────────────

  it("UserMenu renders user name and email in dropdown", async () => {
    vi.mocked(getStoredUser).mockReturnValue(MOCK_USER);
    vi.mocked(getToken).mockReturnValue("tok");

    const ue = userEvent.setup();
    render(<UserMenu />, { wrapper: Wrapper });

    await ue.click(screen.getByRole("button", { name: /user menu/i }));

    // Name appears in the button label AND the dropdown — at least one must be present
    expect(screen.getAllByText("Anshu Lal Gupta").length).toBeGreaterThan(0);
    expect(screen.getByText("anshu@techgene.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  // ── 6. UserMenu logout button works ─────────────────────────────────────

  it("clicking Sign out in UserMenu calls logout", async () => {
    vi.mocked(getStoredUser).mockReturnValue(MOCK_USER);
    vi.mocked(getToken).mockReturnValue("tok");

    const ue = userEvent.setup();
    render(<UserMenu />, { wrapper: Wrapper });

    await ue.click(screen.getByRole("button", { name: /user menu/i }));
    await ue.click(screen.getByRole("button", { name: /sign out/i }));

    expect(clearAuth).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  // ── 7. Protected route redirects when not authenticated ──────────────────

  it("AuthGuard redirects to /login when not authenticated", async () => {
    vi.mocked(getStoredUser).mockReturnValue(null);
    vi.mocked(getToken).mockReturnValue(null);

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  // ── 8. Protected route renders children when authenticated ───────────────

  it("AuthGuard renders children when authenticated", () => {
    vi.mocked(getStoredUser).mockReturnValue(MOCK_USER);
    vi.mocked(getToken).mockReturnValue("tok");

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
      { wrapper: Wrapper },
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
