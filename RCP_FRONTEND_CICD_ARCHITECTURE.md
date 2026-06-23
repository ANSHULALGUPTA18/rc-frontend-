# RC Pricing Frontend — CI/CD Architecture

Timing targets are from `RCP_FRONTEND_CICD_PLAN.md` §13a (warm = steady-state cache, the normal case; cold = first build on a fresh runner or after a `package-lock.json` change).

---

## 1. Big picture — code → production

```
DEVELOPER                 GITHUB ACTIONS (self-hosted runner @ 192.168.0.160)            AZURE
─────────                 ──────────────────────────────────────────────────            ─────

 feature/*  ──push──►  ┌──────────────────────┐
                       │  fast-checks.yml      │  lint · unit · build
                       │  ~4–6 min (warm)      │  (non-blocking, pre-PR)
                       └──────────────────────┘

 open PR ──────────►   ┌──────────────────────┐   ┌──────────────────────┐
 (→develop/            │  ci.yml  (BLOCKS)     │   │  security.yml         │
   staging/main)       │  lint·format·type·    │   │  secret·audit·trivy   │
                       │  cov·build  ~6–10 min │   │  ~4–6 min (parallel)  │
                       └──────────────────────┘   └──────────────────────┘
                                  │ merge (PR only — guard tripwire on direct push)
                                  ▼
 merge to     ──push──► ┌─────────────────────────────────────────────┐    ACR
 develop                │  deploy.yml  → environment: development      │  ┌──────────────┐
                        │  build+push → deploy → health → smoke →      │─►│ <acr>.azure  │
                        │  rollback? → notify        ~5 min (warm)     │  │   cr.io      │
                        └─────────────────────────────────────────────┘  └──────┬───────┘
                                                                                 │ pull (MI/AcrPull)
 manual    ──dispatch─► ┌─────────────────────────────────────────────┐         ▼
 promote                │  deploy.yml  → staging | production          │  ┌──────────────────┐
 (Actions ▶ Run)        │  (same pipeline, env protection/approval)    │  │ Container Apps:   │
                        └─────────────────────────────────────────────┘  │ ca-rcp-frontend-  │
                                                                          │  dev/staging/prod │
 Teams ◄─── notifications at every stage ──────────────────────────────  └──────────────────┘
```

---

## 2. Trigger & timing matrix

| Workflow | Trigger | Jobs | Blocks? | Warm | Cold |
|---|---|---|---|---|---|
| **fast-checks** | push to `feature/*` (not develop/staging/main) | lint · unit · build | no | **4–6 min** | 8–12 |
| **ci** | PR → develop/staging/main | lint · format · typecheck · coverage · build | ✅ merge | **6–10 min** | 10–15 |
| **security** | PR + nightly **02:00 UTC** | secret-scan · audit · trivy · notify | no | **4–6 min** | 6–10 |
| **deploy** | push `develop` (auto) / manual dispatch (staging,production) | deploy · smoke · rollback · notify | — | **~5 min** | 10–15 |
| **e2e** | nightly **02:30 UTC** + on-demand | Playwright | no | **5–10 min** | 10–15 |
| **rollback** | manual dispatch | rollback (image redeploy) | — | ~3–5 min | — |
| **direct-push-guard** | push develop/staging/main | tripwire (PR check) | ✅ red X | <30 s | <30 s |
| **hotfix-backport** | push `main` | open backport PR | — | <1 min | — |
| **acr-cleanup** | scheduled | prune ACR (`--ago 30d --keep 10`) | — | ~1 min | — |

---

## 3. Deploy pipeline DAG

```
                         deploy.yml
   ┌───────────────────────────────────────────────────────────────┐
   │ JOB: deploy   (environment: development|staging|production)     │
   │  if vars.AZURE_ENABLED == 'true'                                │
   │                                                                 │
   │  1 Set vars (ENV short-code, IMAGE, FULL_ENV)        ~5 s       │
   │  2 Teams: "deploy started"                            ~2 s       │
   │  3 Azure login + ACR login                            ~10 s      │
   │  4 Capture current image (prev_tag → rollback)        ~5 s       │
   │  5 docker build + push (NEXT_PUBLIC_* baked)   warm ~2–3 min    │
   │  6 az containerapp update (new revision)              ~1–2 min  │  ← sets deployed=true
   │  7 Deactivate old revisions                           ~10 s      │
   │  8 Wait for revision Healthy (poll ≤5 min)            ~30–60 s  │
   └───────────────────────────────┬─────────────────────────────────┘
                                    ▼
                         ┌────────────────────┐
                         │ JOB: smoke          │  HTTP GET / → 200/3xx
                         │  ~30 s              │
                         └─────────┬──────────┘
                  ┌────────────────┴───────────────────┐
        deploy OR smoke not green               all green
        AND a revision went live                    │
                  ▼                                  ▼
   ┌──────────────────────────────┐        ┌────────────────────┐
   │ JOB: rollback-on-failure     │        │ JOB: notify         │
   │  redeploy prev_tag image     │        │  Teams ✅ / ❌       │
   │  + Teams "rolled back"       │        │  (always)           │
   └──────────────────────────────┘        └────────────────────┘
```

**Rollback fires when:** a revision went live (`deployed==true`) **and** (deploy failed at health **or** smoke failed). Skipped if build/push failed before any revision deployed, or if everything's green.

---

## 4. Infrastructure topology

```
        ┌──────────────────────────── 192.168.0.160 (Ubuntu, github-runner) ────────────────────────────┐
        │  Runner: rcp-frontend-server   labels: [self-hosted, rcp-frontend]   (1 runner — jobs serialize) │
        │                                                                                                  │
        │  WARM CACHES (persist between jobs):                                                             │
        │   • /opt/ci-cache/rc-pricing-frontend/node_modules   (hardlink restore; npm ci only on lock Δ)   │
        │   • Next.js .next/cache        • Docker layer cache + BuildKit mounts                            │
        │   • Trivy vuln DB (named volume)   • Playwright browsers (pre-installed)                         │
        │  Hygiene: weekly `docker system prune` (size/age-filtered) + disk alerting                       │
        └──────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                    │ docker push / az containerapp update (SP: AcrPush+Contributor)
                                                    ▼
        ┌──────────────────────────────────── AZURE (RG: TECHGENE_group) ───────────────────────────────┐
        │  ACR  <acr>.azurecr.io  ──pull (managed identity / AcrPull)──►                                  │
        │                                                                                                  │
        │   ca-rcp-frontend-dev          ca-rcp-frontend-staging         ca-rcp-frontend-prod             │
        │   min replicas 0               min replicas 0                  min replicas ≥1 (no cold start)  │
        │   port 3000, ext HTTPS         port 3000, ext HTTPS            port 3000, ext HTTPS             │
        └──────────────────────────────────────────────────────────────────────────────────────────────┘

  GitHub Environments (secrets + protection):  development · staging · production
   ↳ each: 4 secrets (NEXT_PUBLIC_API_URL/CLIENT_ID/TENANT_ID/REDIRECT_URI) + 1 var (NEXT_PUBLIC_USE_MOCK)
  Repo secrets: AZURE_CREDENTIALS · ACR_NAME · ACR_LOGIN_SERVER · AZURE_RESOURCE_GROUP
  Repo variable: AZURE_ENABLED (master switch)
```

---

## 5. End-to-end timeline (feature → dev, warm cache)

```
 t0      push feature/*        ──► fast-checks            ~4–6 min   ✅
 t+      open PR → develop     ──► ci  ‖  security        ~6–10 min  ✅ (parallel)
 t+      merge PR              ──► direct-push-guard       <30 s     ✅ (came via PR)
 t+      (merge = push develop)──► deploy → development
              build+push ~2–3m │ update ~1–2m │ health ~1m │ smoke 30s
                                                          ≈ 5 min    ✅ → Teams ✅
 ── later, manual ──
         Actions ▶ deploy ▶ staging      (env approval)  ≈ 5 min    ✅
         Actions ▶ deploy ▶ production   (env approval)  ≈ 5 min    ✅

 nightly  02:00 security scan      02:30 Playwright e2e
```

| Branch / action | GitHub env | Azure Container App |
|---|---|---|
| push `develop` | `development` | `ca-rcp-frontend-dev` |
| dispatch `staging` | `staging` | `ca-rcp-frontend-staging` |
| dispatch `production` | `production` | `ca-rcp-frontend-prod` |
