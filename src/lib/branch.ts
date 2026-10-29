// The branch a screen is working in. It is kept in a cookie and sent to the
// database with every request (the "x-branch-id" header). The database only ever
// uses it to NARROW what the signed-in user may already see: it can never widen it.

export const BRANCH_COOKIE = "dentease_branch";
export const BRANCH_HEADER = "x-branch-id";

export function activeBranch(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${BRANCH_COOKIE}=([0-9a-f-]{36})`, "i"));
  return m ? m[1] : null;
}

export function setActiveBranch(id: string | null) {
  document.cookie = id
    ? `${BRANCH_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`
    : `${BRANCH_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
