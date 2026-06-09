# Systemlix FilmOps — Manual QA Checklist

Run after deploying to Vercel and applying Supabase migrations `006`–`009`.

## Environment

- [ ] `.env.local` / Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Server-only: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC_*`)
- [ ] Supabase migrations applied in order: `002` → `009`

## Auth & roles

- [ ] **Admin login** — Platform Owner or Company Admin can access dashboard and all modules
- [ ] **Department User login** — Costumi (or other dept) sees only authorized nav items
- [ ] **Viewer / Cast-Crew** — read-only where configured; no edit buttons on operational data
- [ ] **Logout** — TopBar logout returns to `/login`

## Script Breakdown & Scenes

- [ ] Paste script → **Generate breakdown** → scenes appear in draft table
- [ ] **Save** scenes to project → visible on Scenes page
- [ ] Error shows `Operation failed:` or `Something went wrong:` with real message on failure
- [ ] Empty state on Scenes when no data

## Documents Vault

- [ ] **Upload** document (admin / authorized role)
- [ ] **Preview / download** works with loading indicator
- [ ] **Delete** (authorized user) with confirmation
- [ ] Department user sees only permitted documents
- [ ] Archived project: documents read-only

## Call Sheets

- [ ] **Save** call sheet linked to shooting day
- [ ] **Export PDF** downloads file
- [ ] **Send** call sheet (Producer / AD / Admin only — not Costumi)
- [ ] Costumi **cannot** see Generator / Send controls

## Read Receipts

- [ ] After send, **Read receipts** tab shows distribution
- [ ] **Costumi** receives call sheet in inbox
- [ ] **Acknowledge** receipt — loading state, success toast
- [ ] Empty state: no distributions yet

## Production Reports

- [ ] **Create** report linked to shooting day / call sheet
- [ ] **Save** timings, scenes, issues
- [ ] **Department note** — Costumi edits only Costume notes when report is Draft
- [ ] **Submit** / **Approve** — admin/producer/AD only
- [ ] **Export PDF** after save
- [ ] Costumi cannot Submit or Approve

## Set Assistant

- [ ] Ask question → loading indicator → response
- [ ] Error message is user-friendly (no API key names in browser)
- [ ] Department role context applied for dept users

## Access Management

- [ ] `/admin/access` — invite / assign roles (authorized users only)
- [ ] Errors show readable messages

## Archive / Lock

- [ ] **Archive** project → operational sections read-only
- [ ] **Lock** project → same read-only behavior
- [ ] **Re-enable / reactivate** project restores edit access (Platform Owner)

## Vercel deploy

- [ ] `npm run build` passes locally
- [ ] Vercel production deploy succeeds
- [ ] Smoke test: login → select company → open project → open Call Sheets + Production Reports

## Regression (do not break)

- [ ] Multi-tenant: company / workspace / project isolation
- [ ] Supabase RLS blocks cross-project access
- [ ] PDF Call Sheet + PDF Production Report still export
- [ ] Call Sheet Distribution + read receipts still work
