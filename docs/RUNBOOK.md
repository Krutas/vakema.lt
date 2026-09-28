# Vakema.lt — Runbook

## Prerequisites

- Node 22 (`.nvmrc`), Java 11+ (for the Firestore emulator)
- `npm i -g firebase-tools` and `firebase login`
- Repo secrets (CI): `FIREBASE_SERVICE_ACCOUNT`

## Local development

```bash
npm install
npm run dev                 # http://localhost:4321
npm test                    # Vitest unit tests
npm run test:e2e            # Playwright (builds + previews automatically)
```

Backend locally:

```bash
cd functions && npm install && npm run build && cd ..
firebase emulators:start --only functions,firestore
bash scripts/emulator-test.sh   # smoke: validation, 405, OPTIONS, honeypot, happy path
```

Set the frontend endpoint for local testing in `.env`:

```
PUBLIC_LEAD_ENDPOINT=http://localhost:5001/vakema/europe-west1/submitLead
```

## Deploy

Merging to `main` deploys automatically via GitHub Actions (Firebase Hosting channel `live` + functions via `predeploy` build).

Manual deploy:

```bash
npm run build
firebase deploy                      # hosting + functions + firestore rules
firebase deploy --only hosting       # frontend only
firebase deploy --only functions     # backend only
```

## Rollback

Hosting keeps every deployed version:

```bash
firebase hosting:releases:list       # or: Firebase console → Hosting → Release history
# Console → select previous version → "Rollback"
```

For a broken function: `git revert` the offending commit and push, or redeploy a known-good function revision from the Cloud Functions console.

## Secret rotation (RESEND_API_KEY)

```bash
firebase functions:secrets:set RESEND_API_KEY   # paste new key
firebase deploy --only functions                # pick up the new version
```

The old secret version can then be destroyed in Google Cloud Secret Manager.

## Verifying the lead flow

1. Submit the form on https://vakema.lt.
2. Firestore console → `leads` collection → new document with `name/email/message/createdAt/ua`.
3. Check inbox `info@vakema.lt` (only when `RESEND_API_KEY` is set).
4. Function logs: `firebase functions:log` or Cloud Logging.

## Firestore rules

`firestore.rules` denies all client access. Only the Cloud Function (Admin SDK, bypasses rules) writes. Deploy rule changes with `firebase deploy --only firestore:rules`.
