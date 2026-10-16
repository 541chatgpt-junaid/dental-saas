// "Remember me" unchecked → the session should end when the browser closes.
// Supabase keeps sessions in persistent cookies, so we pair a persistent flag
// (localStorage) with a session cookie that the browser drops on close.
// If the flag is set but the session cookie is gone, the browser was closed.

const FLAG = "de_session_only";
const ALIVE = "de_alive";

export function applyRememberMe(remember: boolean) {
  try {
    if (remember) localStorage.removeItem(FLAG);
    else {
      localStorage.setItem(FLAG, "1");
      document.cookie = `${ALIVE}=1; path=/; SameSite=Lax`;
    }
  } catch {
    // Storage unavailable (private mode etc.): fall back to a normal persistent session
  }
}

/** True when the user chose not to be remembered and the browser has since been closed. */
export function sessionShouldEnd(): boolean {
  try {
    return localStorage.getItem(FLAG) === "1" && !document.cookie.split("; ").some(c => c.startsWith(`${ALIVE}=`));
  } catch {
    return false;
  }
}

export function clearRememberMe() {
  try { localStorage.removeItem(FLAG); } catch {}
}
