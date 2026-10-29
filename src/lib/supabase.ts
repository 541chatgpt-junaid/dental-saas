import { createBrowserClient } from '@supabase/ssr'
import { activeBranch, BRANCH_HEADER } from '@/lib/branch'

// Tells the database which branch this screen is working in (see lib/branch.ts).
// Read at request time, so switching branch needs no new client.
const withBranch: typeof fetch = (input, init) => {
  const branch = activeBranch()
  if (!branch) return fetch(input, init)
  const headers = new Headers(init?.headers)
  headers.set(BRANCH_HEADER, branch)
  return fetch(input, { ...init, headers })
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: withBranch } }
  )
}
