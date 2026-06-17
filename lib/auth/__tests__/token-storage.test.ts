import { afterEach, describe, expect, it, vi } from "vitest";
import { getToken } from "@/lib/auth/storage";
import { getAccessToken } from "@/lib/auth/token-storage";

vi.mock("@/lib/auth/storage", () => ({
  getToken: vi.fn(),
}));

// Vitest is configured with NEXT_PUBLIC_USE_MOCK=true globally, so the
// statically-imported getAccessToken above exercises the mock-mode path.
describe("getAccessToken — mock mode (NEXT_PUBLIC_USE_MOCK=true)", () => {
  afterEach(() => {
    vi.mocked(getToken).mockReset();
  });

  it("returns the stored dev token", async () => {
    vi.mocked(getToken).mockReturnValue("dev-jwt-abc");

    await expect(getAccessToken()).resolves.toBe("dev-jwt-abc");
  });

  it("returns null when no dev token is stored", async () => {
    vi.mocked(getToken).mockReturnValue(null);

    await expect(getAccessToken()).resolves.toBeNull();
  });
});

describe("getAccessToken — Azure mode (NEXT_PUBLIC_USE_MOCK=false)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns null when no backend API scope is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_AZURE_API_SCOPE", "");
    vi.resetModules();

    const { getAccessToken: getAccessTokenAzure } = await import("@/lib/auth/token-storage");

    const result = await getAccessTokenAzure({
      instance: { acquireTokenSilent: vi.fn(), acquireTokenRedirect: vi.fn() } as never,
      account: { homeAccountId: "abc" } as never,
    });

    expect(result).toBeNull();
  });

  it("returns null when no account is signed in", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_AZURE_API_SCOPE", "api://rc-pricing-backend/access_as_user");
    vi.resetModules();

    const { getAccessToken: getAccessTokenAzure } = await import("@/lib/auth/token-storage");

    const result = await getAccessTokenAzure({
      instance: { acquireTokenSilent: vi.fn(), acquireTokenRedirect: vi.fn() } as never,
      account: null,
    });

    expect(result).toBeNull();
  });

  it("returns the silently-acquired access token", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_AZURE_API_SCOPE", "api://rc-pricing-backend/access_as_user");
    vi.resetModules();

    const { getAccessToken: getAccessTokenAzure } = await import("@/lib/auth/token-storage");

    const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: "az-token-123" });
    const result = await getAccessTokenAzure({
      instance: { acquireTokenSilent, acquireTokenRedirect: vi.fn() } as never,
      account: { homeAccountId: "abc" } as never,
    });

    expect(result).toBe("az-token-123");
    expect(acquireTokenSilent).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ["api://rc-pricing-backend/access_as_user"],
        account: { homeAccountId: "abc" },
      })
    );
  });

  it("throws a descriptive error when interaction is required", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_AZURE_API_SCOPE", "api://rc-pricing-backend/access_as_user");
    vi.resetModules();

    const { InteractionRequiredAuthError } = await import("@azure/msal-browser");
    const { getAccessToken: getAccessTokenAzure } = await import("@/lib/auth/token-storage");

    const acquireTokenRedirect = vi.fn().mockResolvedValue(undefined);
    const acquireTokenSilent = vi
      .fn()
      .mockRejectedValue(new InteractionRequiredAuthError("interaction_required"));

    await expect(
      getAccessTokenAzure({
        instance: { acquireTokenSilent, acquireTokenRedirect } as never,
        account: { homeAccountId: "abc" } as never,
      })
    ).rejects.toThrow(/permission/i);

    expect(acquireTokenRedirect).not.toHaveBeenCalled();
  });
});
