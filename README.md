# RC Pricing Frontend

Recruiter-facing web application for the RC Pricing Platform.

## What it does
- JD upload with live pipeline progress tracking
- Review queue (Green auto / Yellow review / Red senior escalation)
- Pricing recommendation detail with comps, confidence breakdown, explanation
- Analytics dashboard — KPIs, win rates, override tracking
- Admin console — rate cards, burden models, prompt registry, skills taxonomy
- Excel export for pricing reports

## Architecture
Feature-based layering (mirrors backend domain split). See [ARCHITECTURE.md](ARCHITECTURE.md).

## Folder Map
| Folder | Purpose |
|---|---|
| `app/` | Next.js routes — thin coordinators only (≤30 LOC each) |
| `features/` | One folder per business capability |
| `lib/` | Shared infra — API client, auth, WebSocket, utils |
| `components/ui/` | Design primitives only (no business logic) |

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** TanStack Query (server state) · React Hook Form (forms)
- **Testing:** Vitest + RTL + MSW · Playwright (E2E)