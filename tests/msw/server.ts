import { setupServer } from "msw/node";
import { authHandlers } from "./handlers/auth";

/** Shared MSW node server — started/reset/stopped via tests/setup.ts */
export const server = setupServer(...authHandlers);
