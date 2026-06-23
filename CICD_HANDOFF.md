# RC Pricing Frontend — CI/CD Handoff

**Audience:** Developers (daily workflow) · Team Lead / Release Owner (promotion & oversight)
**Repo:** `Techgene-Products/rc-pricing-frontend`
**App:** Next.js 15 SSR container on Azure Container Apps (port 3000)
**Runner:** self-hosted `rcp-frontend` @ `192.168.0.160`
**Companion docs:** `RCP_FRONTEND_CICD_PLAN.md` · `RCP_FRONTEND_DEVOPS_IMPLEMENTATION.md` · `RCP_FRONTEND_AZURE_SETUP.md`

---

## 1. TL;DR

- **Branch model:** `feature/*` → PR → `develop` → (promote) `staging` → `production`.
- **Push to `develop` auto-deploys to the `development` environment.** Staging & production are **manual** promotions.
- **All checks run on one self-hosted runner** with warm caches — `npm ci` only re-runs when `package-lock.json` changes.
- **Master switch:** the repo variable `AZURE_ENABLED` must be `true` for any deploy/rollback to run. While `false`, deploy jobs skip safely.
- **Notifications** for deploys/scans go to **Microsoft Teams**.

---

## 2. Branch → Environment → Azure map

| Branch / action | GitHub Environment | Azure Container App |
|---|---|---|
| push `develop` (auto) | `development` | `ca-rcp-frontend-dev` |
| manual dispatch → `staging` | `staging` | `ca-rcp-frontend-staging` |
| manual dispatch → `production` | `production` | `ca-rcp-frontend-prod` |

> The GitHub Environment names (`development`/`staging`/`production`) are mapped inside the workflow to the Azure short codes (`dev`/`staging`/`prod`). **Do not rename** the Azure container apps or the GitHub environments without updating `deploy.yml` + `rollback.yml`.

---

## 3. Developer workflow

### Day-to-day
1. Branch off `develop`: `git checkout -b feature/my-change`
2. Push — **`fast-checks`** runs automatically (lint · unit · build, ~4–6 min). Non-blocking, just fast feedback.
3. Open a **PR into `develop`** — this triggers the blocking gate:
   - **`ci`** (lint · format · typecheck · coverage · build) — **must pass to merge**
   - **`security`** (secret scan · npm audit · Trivy) — parallel, report-only for now
4. Get review + green checks → **merge via the PR** (never `git push` straight to `develop`).
5. Merge to `develop` → **auto-deploys to `development`** → smoke test → Teams notification.

### Rules
- **Always use PRs** for `develop`/`staging`/`main`. A direct push trips **`direct-push-guard`** (red ❌ check + Teams alert) — GitHub Free can't hard-block it, so this is the tripwire.
- Keep `package-lock.json` committed and in sync — a lockfile change triggers a (slower) cold `npm ci`; code-only changes stay fast.
- Local commands that mirror CI: `npm run lint` · `npm run format:check` · `npm run typecheck` · `npm run test` · `npm run build`.

### What runs when (quick reference)
| You do… | Workflow | Blocks merge? | ~Time (warm) |
|---|---|---|---|
| push `feature/*` | fast-checks | no | 4–6 min |
| open/update PR | ci + security | ci ✅ | 6–10 min |
| merge to `develop` | deploy → development | — | ~5 min |
| (nightly 02:00 / 02:30) | security / e2e | no | — |

---

## 4. Promotion & deploys (Team Lead / Release Owner)

### Auto: development
Merging to `develop` deploys to `development` with no manual step.

### Manual: staging then production
1. **Actions** tab → **deploy** → **Run workflow**.
2. Choose environment: **`staging`** (validate), then **`production`**.
3. If environment protection (required reviewers) is set, the run **pauses for approval** — approve in the run page.

### What a deploy does (every environment)
`build + push image (NEXT_PUBLIC_* baked in)` → `deploy new revision` → `deactivate old revisions` → `wait healthy` → `HTTP smoke test` → `auto-rollback on failure` → `Teams notify`.

### Auto-rollback
If a revision goes live but the deploy isn't fully green (unhealthy revision **or** failed smoke test), the pipeline **automatically redeploys the previous image** and posts a Teams alert. No manual action needed.

### Manual rollback
**Actions** → **rollback** → **Run workflow** → pick environment (`development`/`staging`/`production`).
- Leave **image tag blank** first → it lists recent tags.
- Re-run with a chosen tag → redeploys it, waits healthy, smoke-checks, notifies.

---

## 5. Configuration reference (where values live)

**Repo secrets** (Settings → Secrets and variables → Actions):
`AZURE_CREDENTIALS` · `ACR_NAME` · `ACR_LOGIN_SERVER` · `AZURE_RESOURCE_GROUP`
(optional: `TEAMS_WEBHOOK_URL`)

**Repo variable:** `AZURE_ENABLED` (`true`/`false` master switch)

**Per-environment** (Settings → Environments → development/staging/production):
- Secrets: `NEXT_PUBLIC_API_URL` · `NEXT_PUBLIC_AZURE_CLIENT_ID` · `NEXT_PUBLIC_AZURE_TENANT_ID` · `NEXT_PUBLIC_AZURE_REDIRECT_URI` (optional `NEXT_PUBLIC_AZURE_API_SCOPE`)
- Variable: `NEXT_PUBLIC_USE_MOCK` (`true` = mock data / no backend; `false` = call real backend)

> `NEXT_PUBLIC_*` are **build-time** — they're baked into the image at `next build`, so a value change requires a **redeploy**, not just a container restart. They ship to the browser (not cryptographic secrets) but are stored as secrets for clean per-env management.

---

## 6. Infrastructure & caching

- **One self-hosted runner** (`rcp-frontend-server`) on `192.168.0.160`. Jobs serialize on it; speed comes from warm caches, not parallelism.
- **Caches that persist between jobs:** `node_modules` (hardlink-restored from `/opt/ci-cache/...`, `npm ci` only on lockfile change), Next.js `.next/cache`, Docker layers + BuildKit mounts, Trivy DB, Playwright browsers.
- **Disk hygiene:** weekly `docker system prune` (size/age-filtered to keep the deps base layer) + disk alerting. If the runner is wiped/re-registered, the next build is a one-time cold (slow) build, then warm again.
- **Azure:** images live in ACR `<acr>.azurecr.io`; container apps pull via managed identity (`AcrPull`); the deploy SP needs `AcrPush` + `Contributor` on the RG.
- **Prod** keeps `min replicas ≥ 1` to avoid SSR cold-start latency; non-prod scales to zero.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `deploy` job skipped entirely | `AZURE_ENABLED` is `false` | set repo variable `AZURE_ENABLED=true` |
| `az acr login` / `docker push` denied | SP missing `AcrPush` on the registry | grant `AcrPush` to the deploy SP |
| Deploy can't find container app | env→app name mismatch | confirm `ca-rcp-frontend-{dev,staging,prod}` exist & match the mapping in `deploy.yml` |
| App loads but no data | `NEXT_PUBLIC_USE_MOCK=false` but backend not reachable | set `=true`, or fix `NEXT_PUBLIC_API_URL` / deploy backend |
| First build very slow | cold cache (new runner or lockfile change) | expected one-time; subsequent builds are warm |
| Red ❌ from `direct-push-guard` | someone pushed straight to a protected branch | use a PR; the check is a tripwire, not a hard block |
| Jobs queue / wait | single runner serializes jobs | expected; add a 2nd `rcp-frontend` runner (one-line label change) only if queueing hurts |

**Where to look:** GitHub **Actions** tab → the failing run → expand the failed step. Deploy/rollback also post status to Teams.

---

## 8. Current status & outstanding items

**Done:** runner online · repo secrets + `AZURE_ENABLED` · 3 environments with secrets/variables · workflows reviewed & fixed (env-name mapping, image-tag consistency, widened auto-rollback, e2e restored).

**Before going fully live:**
- [ ] Commit the workflow changes and get them onto `develop` (workflows only run from the committed branch).
- [ ] Confirm deploy SP has `AcrPush` on the ACR.
- [ ] Confirm backend reachability before setting any env's `NEXT_PUBLIC_USE_MOCK=false`.
- [ ] Set `AZURE_ENABLED=true`, push to `develop`, watch the first `development` deploy, then promote `staging` → `production`.
- [ ] (Optional) add required reviewers on `staging`/`production` environments for approval gates.

**Backend CI/CD is separate and not yet built** (`rc-pricing-backend` has no workflows, no `develop`/`staging` branches, no `rcp-backend` runner).

---

## 9. Quick links

- Workflows: `.github/workflows/` (`ci`, `fast-checks`, `security`, `e2e`, `deploy`, `rollback`, `direct-push-guard`, `hotfix-backport`, `acr-cleanup`)
- Architecture diagram: `RCP_FRONTEND_CICD_ARCHITECTURE.md` (if generated)
- Azure provisioning: `RCP_FRONTEND_AZURE_SETUP.md`
- Pipeline plan: `RCP_FRONTEND_CICD_PLAN.md`
