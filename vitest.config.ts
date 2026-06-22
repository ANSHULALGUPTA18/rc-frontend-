import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 * - environment: jsdom  — simulates a browser DOM for React component tests
 * - globals: true       — exposes describe/it/expect without explicit imports
 * - setupFiles          — runs jest-dom matchers + MSW server lifecycle
 * - coverage            — v8 provider, thresholds enforced at 70 %
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Exclude Playwright e2e specs — those run via `npm run test:e2e`
    exclude: ["tests/e2e/**", "**/node_modules/**"],
    // Force mock mode so LoginView renders the email/password panel in tests
    env: { NEXT_PUBLIC_USE_MOCK: "true" },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      // Scope to auth feature — the only fully-implemented feature with tests.
      // Expand this list as other features get test coverage.
      // Only measure coverage for the auth feature components and hooks.
      // lib/auth/storage is mocked in tests (vi.mock) so it would show 0%;
      // add it back when dedicated storage unit tests are written.
      include: ["features/auth/**/*.{ts,tsx}"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/api/client.ts", // mock data constants, not business logic
      ],
      thresholds: { lines: 70, functions: 70, branches: 70 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
