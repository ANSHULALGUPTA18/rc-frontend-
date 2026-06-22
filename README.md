# RC Pricing Frontend

Recruiter-facing web application for the RC Pricing Platform — built with Next.js 15, TypeScript, and Tailwind CSS.

---

## Getting Started

### Prerequisites

| Requirement                    | Version                     |
| ------------------------------ | --------------------------- |
| [Node.js](https://nodejs.org/) | 18.18+ (20 LTS recommended) |
| npm                            | comes with Node             |
| Git                            | any recent version          |

### 1. Clone and install

```bash
git clone https://github.com/Techgene-Products/rc-pricing-frontend.git
cd rc-pricing-frontend
npm install
```

### 2. Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored — never commit it.

**Easiest setup (no backend, no Azure needed):**

```
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_URL=
```

With `NEXT_PUBLIC_USE_MOCK=true`, the app runs fully on mock data and the
login page shows an email/password form. Sign in with:

```
Email:    admin@techgene.com
Password: password123
```

**Connecting to a real backend + Azure AD SSO:**

```
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=https://your-api.example.com
NEXT_PUBLIC_AZURE_CLIENT_ID=<App Registration client ID>
NEXT_PUBLIC_AZURE_TENANT_ID=<Techgene tenant ID>
NEXT_PUBLIC_AZURE_REDIRECT_URI=http://localhost:3000/login
```

With `NEXT_PUBLIC_USE_MOCK=false`, the login page shows a "Sign in with
Microsoft" button instead, and all data is fetched from `NEXT_PUBLIC_API_URL`
(no mock fallback — see [API Layer & Mock Data](#api-layer--mock-data)).

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to
`/login`. After signing in you land on `/dashboard`.

### Other useful commands

| Command              | What it does                                     |
| -------------------- | ------------------------------------------------ |
| `npm run build`      | Production build                                 |
| `npm run start`      | Run the production build (after `npm run build`) |
| `npm run lint`       | ESLint                                           |
| `npm run typecheck`  | TypeScript check (`tsc --noEmit`)                |
| `npm test`           | Run unit/component tests (Vitest)                |
| `npm run test:watch` | Run unit tests in watch mode                     |
| `npm run test:e2e`   | Run end-to-end tests (Playwright)                |

---

## What was built

### 0. Authentication & Global Layout

- **`/login`** — public route. Adapts to `NEXT_PUBLIC_USE_MOCK`:
  - `true`: email/password form (react-hook-form, show/hide password, Remember me)
  - `false`: "Sign in with Microsoft" button (Azure AD / Entra ID via MSAL)
- **Route protection** — `middleware.ts` blocks unauthenticated access to every
  page except `/login`; `AuthGuard` (used on `/dashboard`, `/jd-upload`,
  `/prompt-template`) redirects to `/login` if the session is missing
- **`AuthContext`** (`features/auth/context/AuthContext.tsx`) — single source of
  truth for the signed-in user (name, email, role) and `logout()`, fed from
  either localStorage/sessionStorage (mock) or the MSAL account (Azure)
- **`AppShell` + `TopBar`** (`components/layout/`) — every authenticated page
  is wrapped in `AppShell`, which renders the sidebar plus a global `TopBar`
  showing the user's name, avatar initials, and a dropdown with
  **Profile**, **Settings**, and **Sign out**
- Session persists across page refresh; signing out clears all stored auth
  state and returns to `/login`

---

### 1. Sidebar Navigation

A collapsible left sidebar used across all screens.

- Logo (`/public/logo.png`) with "RC Pricing / powered by Techgene" branding
- Collapse/expand toggle — shrinks to icon-only mode (`w-16`) with smooth animation
- **Pricing Workshop** is a real clickable button that expands/collapses its child links (Upload Doc, Prompt Template)
- Active route is auto-highlighted using `usePathname()` from Next.js — no manual prop needed
- Links: Dashboard → `/dashboard`, Upload Doc → `/jd-upload`, Prompt Template → `/prompt-template`

---

### 2. Pricing Workshop — 3-Stage Flow (`/jd-upload`)

A sequential three-stage wizard managed by `JdWorkshopFlow`. All state (uploaded files) is held in memory and passed between stages — no URL params needed.

#### Stage 1 — Upload (`JdUploadView`)

- Drag-and-drop file zone supporting PDF, DOCX, TXT (max 10 MB each)
- Duplicate detection by name + size
- Uploaded files appear as cards below the drop zone (document icon, filename, size, remove button)
- Right panel: **Uploaded Document Preview** table — POSITION / EXP.(YRS) / EXISTINGPRICE columns, "Clear All" button, individual trash-icon removal
- **Continue** button enabled only when at least one file is uploaded

#### Stage 2 — Prompt Selection (`PromptSelectionView`)

- Left queue panel: all uploaded files shown as selectable cards (active card has blue left border)
- Each file has its own independent config: prompt mode, template, location, sector
- **DEFAULT AI PROMPT / CUSTOM USER PROMPT** toggle tabs
- Prompt template dropdown (populated from API)
- Preview textarea — read-only by default, "Edit" pencil button makes it editable
- Location + Sector free-text inputs per file
- **Back** returns to Upload; **Continue to Pricing** advances to Stage 3

#### Stage 3 — Pricing (`PricingView`)

- Same queue panel (switch between files to see their pricing)
- Right panel: **Job Pricing** table — POSITION / EXP.(YRS) / EXISTINGPRICE (shown as dark navy pill)
- **Edit** (pencil) and **Export CSV** (green outlined) buttons in panel header
- **Send for Approval** full-width orange button — navigates to `/dashboard`

#### Stages Stepper (`WorkshopStages`)

- Reusable component, receives `activeStage` prop
- Completed stages show a filled green circle with white checkmark + dark navy connector line
- Active stage shows an orange dashed ring
- Upcoming stages show a gray ring

---

### 3. Prompt Templates (`/prompt-template`)

- 3-column responsive card grid
- **Add Prompt** card — dashed orange border, opens a modal
- **Create New Prompt modal** — Prompt Name input, Instruction Content textarea (live `0 / 5000` character counter), Cancel + Create Prompt buttons, Escape key and backdrop click to dismiss
- **Prompt cards** — title, Default badge (one card at a time), 3-dot dropdown menu
  - **Set as Default** — moves the Default badge
  - **Edit** — placeholder (no modal yet)
  - **Delete** — removes the card instantly
- Data fetched via `useQuery`; mutations are optimistic (local state updated immediately)

---

### 4. Dashboard (`/dashboard`)

Navigated to automatically after clicking "Send for Approval."

- **+ Create report** button (top right)
- **4 KPI cards** — Active Requests, Pending Approvals, Recent Pricing Reports, Avg Margin
- **Pending Approvals table** — REQUEST ID / CLIENT / ROLE / PROPOSED RATE / AI CONFIDENCE / ACTION columns
  - Approved row: green "Approved" button with user-check icon
  - Pending rows: gray "Pending" button with clock icon
  - 3-dot menu per row
  - Pagination footer (< >)
- **Recent Reports panel** — file type icon, title, size, download button
- All data fetched via `useQuery` with loading spinners and error states

---

## API Layer & Mock Data

All mock data lives exclusively in `features/*/api/client.ts` files, controlled by a single environment flag:

```
# .env.local
NEXT_PUBLIC_USE_MOCK=true       # development — uses mock data
NEXT_PUBLIC_API_URL=            # set this when backend is ready
```

**When `IS_MOCK=true`** — views show mock data.  
**When `IS_MOCK=false` and backend is down** — views show an error state with a Retry button. No fallback to mock data by design.

### Mock data locations

| File                                     | Data                                       |
| ---------------------------------------- | ------------------------------------------ |
| `features/dashboard/api/client.ts`       | KPI stats, approvals table, recent reports |
| `features/jd-upload/api/client.ts`       | Pricing rows, prompt dropdown options      |
| `features/prompt-template/api/client.ts` | Prompt template cards                      |

### Connecting the backend (3 steps)

1. In `.env.local`: set `NEXT_PUBLIC_USE_MOCK=false` and `NEXT_PUBLIC_API_URL=https://your-api.com`
2. In each `api/client.ts`: delete the `MOCK_*` constants and `if (IS_MOCK) return MOCK_*` lines
3. Adjust the endpoint paths in `apiFetch(...)` to match your real API routes

---

## Folder Map

| Folder                      | Purpose                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| `app/`                      | Next.js routes — thin page files only                                       |
| `app/login/`                | Public login route                                                          |
| `middleware.ts`             | Edge middleware — blocks unauthenticated access to protected routes         |
| `features/jd-upload/`       | Upload, Prompt Selection, Pricing stages + sidebar + stepper                |
| `features/prompt-template/` | Prompt template grid, modal, hook                                           |
| `features/dashboard/`       | Dashboard view and KPI components                                           |
| `features/auth/context/`    | `AuthContext` / `AuthProvider` — current user + logout                      |
| `features/auth/components/` | `LoginView`, `AuthGuard`, `UserMenu`                                        |
| `features/auth/hooks/`      | Login/logout hooks (mock + Azure)                                           |
| `features/auth/providers/`  | `AppProviders` — MSAL, AuthProvider, TanStack `QueryClientProvider`         |
| `lib/auth/`                 | `msal.ts` (MSAL config/instance), `storage.ts` (token/user/session storage) |
| `components/layout/`        | `AppShell`, `TopBar` — shared authenticated page layout                     |
| `features/*/api/client.ts`  | All API functions + mock data                                               |
| `lib/api/config.ts`         | `IS_MOCK` and `API_BASE` env flags                                          |
| `components/ui/`            | Button, Card, FileUpload, LoadingSpinner, ErrorState primitives             |
| `public/`                   | Static assets (logo.png)                                                    |

---

## Tech Stack

| Tool                    | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| Next.js 15 (App Router) | Routing and SSR shell                           |
| TypeScript (strict)     | Full type safety, no `any`                      |
| Tailwind CSS            | Utility-first styling with custom design tokens |
| TanStack Query          | Server state, loading/error handling, cache     |
| React Hook Form         | (wired in stack, not yet used in forms above)   |

---
