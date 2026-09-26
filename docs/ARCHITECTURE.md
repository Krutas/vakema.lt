# Vakema.lt — Architecture

## Overview

Astro 5 + TypeScript marketing site, statically rendered, deployed to Firebase Hosting. A single Cloud Function (2nd gen, Node 22, `europe-west1`) handles the contact form: it validates the lead, stores it in Firestore, and best-effort sends an email via Resend.

```
Browser
  │
  ├─► Firebase Hosting (static dist/ from Astro build)
  │     index.html + optimized AVIF/WebP images, zero-JS by default
  │
  └─► POST /submitLead  (Cloud Function, europe-west1)
        ├─► validateLead()  (shared with frontend: functions/src/validate-lead.ts
        │                    is a copy of src/scripts/validate-lead.ts)
        ├─► Firestore  →  collection "leads"  (write only via Admin SDK;
        │                  client reads/writes all denied by firestore.rules)
        └─► Resend API → email to info@vakema.lt
              (skipped when RESEND_API_KEY secret is unset — Firestore-only mode)
```

## Key decisions

- **Astro, not Next/React**: the page is 99% static; Astro ships no JS except the carousel/menu/form bundles.
- **No base64 inlining**: `vite.build.assetsInlineLimit = 0` — the original 14 MB inline favicon sin is structurally impossible now.
- **Images** through `astro:assets` → AVIF/WebP with `srcset`.
- **Content** in typed Astro content collections (`src/content/products.json`, schema in `src/content.config.ts`).
- **Shared validation**: `validateLead` runs client-side (instant feedback) and server-side (source of truth).
- **Firestore rules**: `allow read, update, delete, create: if false` — only the function's Admin SDK touches `leads`.
- **Secrets**: `RESEND_API_KEY` via `firebase functions:secrets:set` (never in git). No key → lead still stored, email logged as skipped.
- **CORS**: allowlist `https://vakema.lt`, `https://www.vakema.lt`, `http://localhost:4321`.
- **Honeypot**: hidden `company` field — bots get a fake `{"ok":true}` with no write.

## Repo layout

```
src/components/   8 sections (Header, Hero, ProductCarousel, Solutions, Manifesto, Process, ContactForm, Footer)
src/content/      products.json (typed collection)
src/scripts/      carousel.ts, menu.ts, page-wipe.ts, contact-form.ts, carousel-math.ts, validate-lead.ts
src/layouts/      BaseLayout.astro (SEO meta, OG, canonical, JSON-LD slot)
functions/        submitLead Cloud Function (own package.json, tsc → lib/)
tests/unit/       Vitest  •  tests/e2e/  Playwright (+ axe)
scripts/          emulator-test.sh (backend smoke test)
```

## Environments

| | Site | Function |
|---|---|---|
| Local dev | `npm run dev` :4321 | `firebase emulators:start` :5001 |
| CI | GitHub Actions (`.github/workflows/ci.yml`) | deployed by Firebase action |
| Prod | https://vakema.lt | `europewest1-vakema.cloudfunctions.net/submitLead` |
