/** One password rule for the whole app: signup, API routes, reset, staff creation. */
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_TOO_SHORT = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** Returns an error message, or null when the password is acceptable. */
export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || !password) return "Password is required.";
  if (password.length < MIN_PASSWORD_LENGTH) return PASSWORD_TOO_SHORT;
  return null;
}
