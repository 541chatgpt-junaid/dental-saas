# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test suite is configured. There is no single-test command.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Architecture

**DentEase** is a dental clinic management SaaS. Stack: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Supabase (PostgreSQL + Auth).

### Routing & Middleware

All routes under `/dashboard/*` are protected by `src/middleware.ts`. The middleware:
- Redirects unauthenticated users to `/`
- Reads staff permissions from Supabase and maps them to page access (e.g., the `patients` permission gates `/dashboard/patients`)
- Blocks inactive staff accounts
- Redirects unauthorized access to `/unauthorized`

Public routes: `/`, `/login`, `/forgot-password`, `/reset-password`.

### Data Layer

All data access goes through Supabase:
- `src/lib/supabase.ts` exports the browser client (uses `NEXT_PUBLIC_*` keys)
- API routes (`src/app/api/`) use the service role key for admin operations
- Dashboard pages fetch data client-side in `useEffect` hooks via the Supabase JS client
- Key tables: `patients`, `appointments`, `doctors`, `labs`, `staff`, `materials`, `purchases`, `expenses`, `settings`

### Permissions Model

Staff have a `permissions` field (stored in Supabase) listing which modules they can access. The middleware reads this on every request and enforces access. The `staff` page is only accessible to the clinic owner/admin.

### Currency

`src/lib/useCurrency.ts` auto-detects the user's currency (PKR, USD, AED, GBP, EUR, SAR, CAD, AUD) based on browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Use this hook anywhere monetary values are displayed.

### Shared Components

- `src/components/Sidebar.tsx` — main navigation, handles responsive collapse and active-link highlighting via `usePathname`
- `src/components/Receipt.tsx` — printable receipt/invoice component

### Landing Page (`src/app/page.tsx`)

The landing page is a standalone marketing page with heavy animation (canvas waves, parallax, intersection observers, feature carousel). It uses inline styles and direct DOM manipulation via `useRef`/`useEffect` — this is intentional for animation performance. It includes a welcome popup (shown on every load), a WhatsApp chat widget, and a review submission form that writes to Supabase.

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`). Use this for all internal imports.
