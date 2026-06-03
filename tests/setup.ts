/**
 * Global test setup — runs before every test file.
 *
 * 1. Imports @testing-library/jest-dom so every test file can use
 *    matchers like toBeInTheDocument(), toBeDisabled(), etc.
 * 2. Starts the MSW node server so HTTP calls are intercepted rather
 *    than hitting a real network.
 */

import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
