# Heights Sales

Internal sales reporting dashboard, synced from LeafLink. Tracks overall
revenue (with month-over-month, quarter-over-quarter, and year-over-year
comparisons), plus breakdowns by SKU, customer, and sales rep.

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Postgres via [Drizzle ORM](https://orm.drizzle.team/)
- Recharts for the trend chart

## Setup

1. **Database.** Either run Postgres locally with Docker:

   ```bash
   docker compose up -d
   ```

   or point `DATABASE_URL` at any Postgres instance (e.g. a free
   [Neon](https://neon.tech) project) if you'd rather not run Docker.

2. **Environment.** Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — already set correctly for the docker-compose setup above.
   - `LEAFLINK_API_KEY` — from your LeafLink account's API settings.
   - `LEAFLINK_AUTH_SCHEME` — `Token` for a personal API key, `App` for an
     application key. If the first sync fails with a 401/403, try switching
     this.
   - `LEAFLINK_COUNTED_STATUSES` — which LeafLink order statuses count as
     real sales in the dashboards.

3. **Install and migrate:**

   ```bash
   npm install
   npm run db:migrate
   ```

4. **Run it:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, go to **Sync**, and click **Sync now** to pull
   your products, staff, and orders from LeafLink. Once that finishes, the
   Overview / SKU / Customer / Rep pages will populate.

## Syncing data

- The **Sync** page has a manual "Sync now" button (calls `POST /api/sync`).
- For unattended/scheduled syncing, run `npm run sync` from a cron job (or
  any scheduler) — it does the same sync as the button, from the command
  line.
- Sync is incremental: orders are pulled with `modified__gte` set to the
  cursor from the last successful run, so re-running is cheap. Products and
  staff are re-listed in full each time.
- The **Sync** page shows a log of recent runs (per entity, status, record
  count, and any error).

## A note on the LeafLink integration

LeafLink's v2 API doesn't publish a full machine-readable schema, and this
environment couldn't make live calls to LeafLink while building this (the
sandbox's network policy blocks `leaflink.com`). The client and field
mappings in `src/lib/leaflink/` were built from LeafLink's public developer
docs and are defensive by design:

- Every synced row keeps the full raw API response in a `raw` JSONB column,
  so nothing is lost even if a specific field mapping turns out wrong.
- Field extraction (`src/lib/leaflink/mappers.ts`) tries several plausible
  key names per field rather than assuming one exact shape.
- Customers, reps, and products are primarily derived from what's embedded
  in each order; `syncProducts`/`syncReps` also try dedicated LeafLink list
  endpoints as a supplementary enrichment step and fail soft if those
  endpoints don't match your account's API version.

**After your first real sync**, if any numbers or names look off, check the
`raw` column on the relevant row (via `npm run db:studio`) to see LeafLink's
actual payload, and adjust `mappers.ts` accordingly — the sync logic itself
shouldn't need to change.

## Multi-rep orders

If a LeafLink order has more than one sales rep attached, the **Sales by
Rep** page credits the full order total to each rep (rather than splitting
it), so the sum across all reps can exceed total revenue. This was a
simplifying choice — if you want commission-style splitting instead, that
logic lives in `getRepBreakdown` in `src/lib/analytics/queries.ts`.

## Project layout

```
src/db/                    Drizzle schema + client
src/lib/leaflink/          API client, field mappers, sync engine
src/lib/analytics/         Period math (MoM/QoQ/YoY) and aggregate queries
src/app/                   Dashboard pages (overview, skus, customers, reps, sync)
src/app/api/sync/route.ts  Sync trigger endpoint
scripts/sync.ts            CLI entry point for cron-based syncing
scripts/seed-sample-data.ts Optional: inserts fake data for local UI testing
```
