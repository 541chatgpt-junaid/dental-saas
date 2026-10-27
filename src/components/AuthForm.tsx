"use client";
import { useState, useRef, type FormEvent, type ReactNode, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { Building2, Eye, EyeOff, LoaderCircle, Lock, Mail, User } from "lucide-react";
import styles from "./AuthForm.module.css";
import { MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT } from "@/lib/passwordRules";

export type AuthMode = "login" | "signup";
export type LoginValues = { email: string; password: string; remember: boolean };
export type SignupValues = { fullName: string; clinicName: string; email: string; password: string };

type Props = {
  initialMode?: AuthMode;
  /** Resolve on success, throw an Error (its message is shown) on failure. */
  onLogin?: (values: LoginValues) => Promise<void>;
  onSignup?: (values: SignupValues) => Promise<void>;
  onGoogle?: () => Promise<void> | void;
  /** Called shortly after the success checkmark has played. */
  onSuccess?: (mode: AuthMode) => void;
  forgotPasswordHref?: string;
};

type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// TODO: connect to Dentease auth API
// Without handlers the form runs as a demo: it validates, waits briefly and shows the success state.
const demoSubmit = () => new Promise<void>(resolve => setTimeout(resolve, 900));

function errorMessage(err: unknown, fallback: string) {
  if (!(err instanceof Error) || !err.message) return fallback;
  return err.message === "Failed to fetch" ? "Network error. Check your connection and try again." : err.message;
}

/** Drops a field's error (and the form-level error) once the user edits that field. */
function clearError(errs: Errors, key: string): Errors {
  const next = { ...errs };
  delete next[key];
  delete next.form;
  return next;
}

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        d="M15 6c-5.5 0-9.5 4.2-9.5 10.2 0 5.6 2.2 8.6 3.2 13.6 1.2 6 2 12.2 6.2 12.2 3.2 0 3.4-5.2 4.4-9 .8-3 2-5 4.7-5s3.9 2 4.7 5c1 3.8 1.2 9 4.4 9 4.2 0 5-6.2 6.2-12.2 1-5 3.2-8 3.2-13.6C42.5 10.2 38.5 6 33 6c-4 0-5.8 2-9 2s-5-2-9-2z" />
      <path stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M9 21h7.5l2.2-4.5 3.2 9 2.4-4.5H32" />
      <path stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" d="M32 21h5M30 17.5h4M30 24.5h4" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Field({
  id, label, icon: Icon, error, children,
}: { id: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; error?: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputWrap}>
        <Icon className={styles.inputIcon} aria-hidden="true" />
        {children}
      </div>
      {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    </div>
  );
}

function PasswordInput({
  id, value, onChange, error, autoComplete, placeholder,
}: { id: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(styles.input, styles.hasToggle, error && styles.invalid)}
      />
      <button
        type="button"
        className={styles.eyeButton}
        onClick={() => setShow(s => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        aria-controls={id}
      >
        {show ? <EyeOff /> : <Eye />}
      </button>
    </>
  );
}

function SuccessState({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.success} role="status" aria-live="polite">
      <svg className={styles.checkSvg} viewBox="0 0 56 56" aria-hidden="true">
        <circle className={styles.checkFill} cx="28" cy="28" r="25" />
        <circle className={styles.checkCircle} cx="28" cy="28" r="26" fill="none" strokeWidth="2.5" />
        <path className={styles.checkTick} d="M17 29l7 7 15-15" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.successText}>{text}</p>
    </div>
  );
}

export default function AuthForm({
  initialMode = "login", onLogin, onSignup, onGoogle, onSuccess, forgotPasswordHref = "/forgot-password",
}: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const isSignup = mode === "signup";

  // Login state
  const [login, setLogin] = useState({ email: "", password: "", remember: true });
  const [loginErrors, setLoginErrors] = useState<Errors>({});
  const [loginShake, setLoginShake] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginDone, setLoginDone] = useState(false);

  // Signup state
  const [signup, setSignup] = useState({ fullName: "", clinicName: "", email: "", password: "", confirm: "", terms: false });
  const [signupErrors, setSignupErrors] = useState<Errors>({});
  const [signupShake, setSignupShake] = useState(false);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const updateLogin = <K extends keyof typeof login>(key: K, value: (typeof login)[K]) => {
    setLogin(v => ({ ...v, [key]: value }));
    setLoginErrors(errs => clearError(errs, key));
  };
  const updateSignup = <K extends keyof typeof signup>(key: K, value: (typeof signup)[K]) => {
    setSignup(v => ({ ...v, [key]: value }));
    setSignupErrors(errs => clearError(errs, key));
  };

  const loginRef = useRef<HTMLFormElement>(null);
  const signupRef = useRef<HTMLFormElement>(null);

  const switchTo = (next: AuthMode) => {
    setMode(next);
    setLoginErrors({});
    setSignupErrors({});
  };

  const focusFirstInvalid = (form: HTMLFormElement | null) => {
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!login.email.trim()) errs.email = "Email is required.";
    else if (!EMAIL_RE.test(login.email.trim())) errs.email = "Enter a valid email address.";
    if (!login.password) errs.password = "Password is required.";
    setLoginErrors(errs);
    if (Object.keys(errs).length) {
      setLoginShake(true);
      requestAnimationFrame(() => focusFirstInvalid(loginRef.current));
      return;
    }
    setLoginBusy(true);
    try {
      await (onLogin ?? demoSubmit)({ email: login.email.trim(), password: login.password, remember: login.remember });
      setLoginDone(true);
      setTimeout(() => onSuccess?.("login"), 1400);
    } catch (err) {
      setLoginErrors({ form: errorMessage(err, "Sign in failed. Please try again.") });
      setLoginShake(true);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    const s = signup;
    const errs: Errors = {};
    if (!s.fullName.trim()) errs.fullName = "Full name is required.";
    if (!s.clinicName.trim()) errs.clinicName = "Clinic name is required.";
    if (!s.email.trim()) errs.email = "Email is required.";
    else if (!EMAIL_RE.test(s.email.trim())) errs.email = "Enter a valid email address.";
    if (!s.password) errs.password = "Password is required.";
    else if (s.password.length < MIN_PASSWORD_LENGTH) errs.password = PASSWORD_TOO_SHORT;
    if (!s.confirm) errs.confirm = "Please confirm your password.";
    else if (s.confirm !== s.password) errs.confirm = "Passwords do not match.";
    if (!s.terms) errs.terms = "Please accept the terms to continue.";
    setSignupErrors(errs);
    if (Object.keys(errs).length) {
      setSignupShake(true);
      requestAnimationFrame(() => focusFirstInvalid(signupRef.current));
      return;
    }
    setSignupBusy(true);
    try {
      await (onSignup ?? demoSubmit)({
        fullName: s.fullName.trim(), clinicName: s.clinicName.trim(), email: s.email.trim(), password: s.password,
      });
      setSignupDone(true);
      setTimeout(() => onSuccess?.("signup"), 1400);
    } catch (err) {
      setSignupErrors({ form: errorMessage(err, "Could not create your account. Please try again.") });
      setSignupShake(true);
    } finally {
      setSignupBusy(false);
    }
  };

  const google = async () => {
    // TODO: connect to Dentease auth API (Google OAuth) when no handler is passed
    try {
      await onGoogle?.();
    } catch (err) {
      const msg = errorMessage(err, "Google sign-in failed.");
      if (isSignup) setSignupErrors({ form: msg }); else setLoginErrors({ form: msg });
    }
  };

  const inputProps = (id: string, err?: string) => ({
    id,
    "aria-invalid": !!err,
    "aria-describedby": err ? `${id}-error` : undefined,
    className: cx(styles.input, err && styles.invalid),
  });

  const googleBlock = (
    <>
      <div className={styles.divider}>Or continue with</div>
      <button type="button" className={styles.googleButton} onClick={google}>
        <GoogleIcon /> Google
      </button>
    </>
  );

  return (
    <div className={styles.page}>
      <div id="auth-card" className={cx(styles.container, isSignup && styles.active)}>
        {/* ── SIGN UP ── */}
        <div className={cx(styles.formPanel, styles.signUpPanel)} inert={!isSignup} aria-hidden={!isSignup}>
          {signupDone ? (
            <SuccessState title="Account created" text="Setting up your clinic workspace…" />
          ) : (
            <form
              ref={signupRef}
              noValidate
              onSubmit={handleSignup}
              onAnimationEnd={() => setSignupShake(false)}
              className={cx(styles.form, signupShake && styles.shake)}
              aria-labelledby="signup-title"
            >
              <Link href="/" className={styles.brand}><ToothMark className={styles.brandMark} /><span>Dent<span className={styles.brandAccent}>Ease</span></span></Link>
              <h1 id="signup-title" className={styles.title}>Create account</h1>
              <p className={styles.subtitle}>Start managing your clinic in minutes.</p>

              {signupErrors.form && <p className={styles.formError} role="alert">{signupErrors.form}</p>}

              <div className={styles.row}>
                <Field id="su-name" label="Full name" icon={User} error={signupErrors.fullName}>
                  <input {...inputProps("su-name", signupErrors.fullName)} autoComplete="name" placeholder="Dr. Ayesha Malik"
                    value={signup.fullName} onChange={e => updateSignup("fullName", e.target.value)} />
                </Field>
                <Field id="su-clinic" label="Clinic name" icon={Building2} error={signupErrors.clinicName}>
                  <input {...inputProps("su-clinic", signupErrors.clinicName)} autoComplete="organization" placeholder="Bright Smile Dental"
                    value={signup.clinicName} onChange={e => updateSignup("clinicName", e.target.value)} />
                </Field>
              </div>
              <Field id="su-email" label="Email" icon={Mail} error={signupErrors.email}>
                <input {...inputProps("su-email", signupErrors.email)} type="email" autoComplete="email" placeholder="you@clinic.com"
                  value={signup.email} onChange={e => updateSignup("email", e.target.value)} />
              </Field>
              <div className={styles.row}>
                <Field id="su-password" label="Password" icon={Lock} error={signupErrors.password}>
                  <PasswordInput id="su-password" autoComplete="new-password" placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`} error={signupErrors.password}
                    value={signup.password} onChange={v => updateSignup("password", v)} />
                </Field>
                <Field id="su-confirm" label="Confirm password" icon={Lock} error={signupErrors.confirm}>
                  <PasswordInput id="su-confirm" autoComplete="new-password" placeholder="Repeat password" error={signupErrors.confirm}
                    value={signup.confirm} onChange={v => updateSignup("confirm", v)} />
                </Field>
              </div>

              <div className={styles.terms}>
                <label className={styles.check}>
                  <input type="checkbox" checked={signup.terms} aria-invalid={!!signupErrors.terms}
                    aria-describedby={signupErrors.terms ? "su-terms-error" : undefined}
                    onChange={e => updateSignup("terms", e.target.checked)} />
                  I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
                </label>
                {signupErrors.terms && <p id="su-terms-error" className={styles.error} role="alert">{signupErrors.terms}</p>}
              </div>

              <button type="submit" className={styles.goldButton} disabled={signupBusy}>
                {signupBusy && <LoaderCircle className={styles.spin} />}
                {signupBusy ? "Creating account…" : "Create Account"}
              </button>

              {googleBlock}

              <p className={styles.switch}>
                Already have an account?{" "}
                <button type="button" className={styles.link} onClick={() => switchTo("login")} aria-controls="auth-card">Sign In</button>
              </p>
            </form>
          )}
        </div>

        {/* ── SIGN IN ── */}
        <div className={cx(styles.formPanel, styles.signInPanel)} inert={isSignup} aria-hidden={isSignup}>
          {loginDone ? (
            <SuccessState title="Welcome back" text="Signing you in to your dashboard…" />
          ) : (
            <form
              ref={loginRef}
              noValidate
              onSubmit={handleLogin}
              onAnimationEnd={() => setLoginShake(false)}
              className={cx(styles.form, loginShake && styles.shake)}
              aria-labelledby="login-title"
            >
              <Link href="/" className={styles.brand}><ToothMark className={styles.brandMark} /><span>Dent<span className={styles.brandAccent}>Ease</span></span></Link>
              <h1 id="login-title" className={styles.title}>Sign in</h1>
              <p className={styles.subtitle}>Access your clinic dashboard.</p>

              {loginErrors.form && <p className={styles.formError} role="alert">{loginErrors.form}</p>}

              <Field id="li-email" label="Email" icon={Mail} error={loginErrors.email}>
                <input {...inputProps("li-email", loginErrors.email)} type="email" autoComplete="email" placeholder="you@clinic.com"
                  value={login.email} onChange={e => updateLogin("email", e.target.value)} />
              </Field>
              <Field id="li-password" label="Password" icon={Lock} error={loginErrors.password}>
                <PasswordInput id="li-password" autoComplete="current-password" placeholder="Your password" error={loginErrors.password}
                  value={login.password} onChange={v => updateLogin("password", v)} />
              </Field>

              <div className={styles.metaRow}>
                <label className={styles.check}>
                  <input type="checkbox" checked={login.remember} onChange={e => updateLogin("remember", e.target.checked)} />
                  Remember me
                </label>
                <Link href={forgotPasswordHref} className={styles.link}>Forgot password?</Link>
              </div>

              <button type="submit" className={styles.goldButton} disabled={loginBusy}>
                {loginBusy && <LoaderCircle className={styles.spin} />}
                {loginBusy ? "Signing in…" : "Sign In"}
              </button>

              {googleBlock}

              <p className={styles.switch}>
                Don&apos;t have an account?{" "}
                <button type="button" className={styles.link} onClick={() => switchTo("signup")} aria-controls="auth-card">Sign Up</button>
              </p>
            </form>
          )}
        </div>

        {/* ── SLIDING DECORATIVE PANEL ── */}
        <div className={styles.overlayContainer}>
          <div className={styles.overlay}>
            <div className={cx(styles.overlayPanel, styles.overlayLeft)} aria-hidden={!isSignup}>
              <ToothMark className={styles.overlayMark} />
              <h2 className={styles.overlayTitle}>Join DentEase</h2>
              <hr className={styles.overlayRule} />
              <p className={styles.overlayText}>Bring appointments, patient records, billing and your whole team into one calm workspace.</p>
              <button type="button" className={styles.ghostButton} onClick={() => switchTo("login")}
                tabIndex={isSignup ? 0 : -1} aria-controls="auth-card">
                Sign In
              </button>
            </div>
            <div className={cx(styles.overlayPanel, styles.overlayRight)} aria-hidden={isSignup}>
              <ToothMark className={styles.overlayMark} />
              <h2 className={styles.overlayTitle}>WELCOME BACK!</h2>
              <hr className={styles.overlayRule} />
              <p className={styles.overlayText}>Your schedule, patients and reports are right where you left them.</p>
              <button type="button" className={styles.ghostButton} onClick={() => switchTo("signup")}
                tabIndex={isSignup ? -1 : 0} aria-controls="auth-card">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
