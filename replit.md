# PiBooking — W3C Digital Network

A Pi Network & Telegram Mini App inspired booking platform for W3C Digital Network. Clients browse services, book appointments via a multi-step flow (details → schedule → summary → Pi payment), and track their bookings. Includes a business admin console.

## Run & Operate

- `pnpm --filter @workspace/pibooking run dev` — run the frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4 (via `@tailwindcss/vite`)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Payments: Pi Network SDK (`sdk.minepi.com/pi-sdk.js`)
- Backend persistence: Supabase (optional — falls back to localStorage when not configured)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/pibooking/src/App.tsx` — root component, state machine for booking flow
- `artifacts/pibooking/src/components/` — all UI components (ServiceBrowser, ServiceDetail, booking steps, etc.)
- `artifacts/pibooking/src/features/` — auth modal, business console view
- `artifacts/pibooking/src/hooks/` — useAuth, useBookings, useBusiness, useServices, useExchangeRate
- `artifacts/pibooking/src/services/` — Supabase-backed services with localStorage fallback
- `artifacts/pibooking/src/lib/supabase.ts` — Supabase client + auto-healing helpers
- `artifacts/pibooking/src/config/business.ts` — default business profile (W3C Digital Network)
- `artifacts/pibooking/src/config/constants.ts` — global constants (exchange rate, time slots, etc.)
- `artifacts/pibooking/src/types.ts` — all TypeScript types
- `supabase/schema.sql` (in original zip) — Supabase DB schema reference
- `lib/api-spec/openapi.yaml` — OpenAPI spec for the Express API server

## Architecture decisions

- **Supabase optional**: All services check `isSupabaseConfigured()` and fall back to localStorage when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set. App works fully offline/locally.
- **Auto-healing upserts**: `safeSupabaseUpsert/Insert/Update` in `lib/supabase.ts` retry with column stripping on schema mismatch and log RLS hints.
- **Pi SDK**: Loaded via CDN in `index.html`. Pi auth runs on mount but gracefully degrades outside Pi Browser.
- **Admin console**: PIN-protected (default `8888`) or Supabase email auth. Accessible via "About" → Admin button.

## Product

- **Service Browser**: Browse available services with search/filter, featured hero card, category pills
- **Booking Flow**: 4-step (client details + file upload → schedule picker → summary → Pi payment)
- **My Bookings**: Track booking status, cancel/reschedule, submit reviews
- **Business About**: Public-facing bio, hours, socials, gallery
- **Business Console**: Admin panel — manage services, view bookings & customers, update settings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Pi SDK `postMessage` cross-origin warnings are expected in browser preview (not Pi Browser). Payments only work inside Pi Browser.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets to enable cloud persistence.
- Supabase tables need `CREATE POLICY "Allow public all" ON public.<table> FOR ALL USING (true)...` for unauthenticated access.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
