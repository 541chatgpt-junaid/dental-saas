"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import styles from "./AuthForm.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";

const EMPTY = {
  signin: { email: "", password: "", remember: false },
  signup: { fullName: "", clinicName: "", email: "", password: "", confirmPassword: "", terms: false },
};

// Each rule returns an error message, or "" when the value is valid.
const RULES = {
  signin: {
    email: v => (!v.email.trim() ? "Email is required." : !EMAIL_RE.test(v.email.trim()) ? "Enter a valid email address." : ""),
    password: v => (!v.password ? "Password is required." : ""),
  },
  signup: {
    fullName: v => (!v.fullName.trim() ? "Full name is required." : ""),
    clinicName: v => (!v.clinicName.trim() ? "Clinic name is required." : ""),
    email: v => (!v.email.trim() ? "Email is required." : !EMAIL_RE.test(v.email.trim()) ? "Enter a valid email address." : ""),
    password: v => (!v.password ? "Password is required." : v.password.length < 8 ? "Password must be at least 8 characters." : ""),
    confirmPassword: v => (!v.confirmPassword ? "Confirm password is required." : v.confirmPassword !== v.password ? "Passwords do not match." : ""),
    terms: v => (!v.terms ? "Please accept the terms to continue." : ""),
  },
};

const cx = (...names) => names.filter(Boolean).join(" ");

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function Field({ id, label, icon: Icon, error, password, shown, onToggleShown, ...inputProps }) {
  const errorId = `${id}-err`;
  return (
    <div className={cx(styles.field, error && styles.isInvalid)}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={cx(styles.control, password && styles.hasEye)}>
        <Icon className={styles.icon} aria-hidden="true" />
        <input
          id={id}
          className={styles.input}
          type={password ? (shown ? "text" : "password") : inputProps.type || "text"}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId}
          {...inputProps}
        />
        {password && (
          <button
            type="button"
            className={cx(styles.eye, shown && styles.isVisible)}
            aria-controls={id}
            aria-pressed={shown}
            aria-label={shown ? "Hide password" : "Show password"}
            onClick={onToggleShown}
          >
            <Eye className={styles.eyeOn} aria-hidden="true" />
            <EyeOff className={styles.eyeOff} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className={styles.error} id={errorId}>{error}</p>
    </div>
  );
}

function SuccessState({ titleRef, title, text, resetLabel, onReset }) {
  return (
    <div className={styles.success} role="status">
      <svg className={styles.checkmark} viewBox="0 0 52 52" aria-hidden="true">
        <circle className={styles.checkmarkBg} cx="26" cy="26" r="24" />
        <circle className={styles.checkmarkCircle} cx="26" cy="26" r="24" />
        <path className={styles.checkmarkTick} d="M15 27l7 7 15-15" />
      </svg>
      <h3 className={styles.successTitle} tabIndex={-1} ref={titleRef}>{title}</h3>
      <p className={styles.successText}>{text}</p>
      <button type="button" className={styles.link} onClick={onReset}>{resetLabel}</button>
    </div>
  );
}

export default function AuthForm({ initialMode = "signin" }) {
  const uid = useId();
  const id = name => `${uid}-${name}`;

  const [mode, setMode] = useState(initialMode);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({ signin: {}, signup: {} });
  const [status, setStatus] = useState({ signin: "idle", signup: "idle" }); // idle | loading | success
  const [shown, setShown] = useState({});
  const [announcement, setAnnouncement] = useState("");

  const signinFormRef = useRef(null);
  const signupFormRef = useRef(null);
  const signinSuccessRef = useRef(null);
  const signupSuccessRef = useRef(null);
  const formRef = form => (form === "signup" ? signupFormRef : signinFormRef);
  const timers = useRef([]);
  const switched = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Move focus into the newly shown form after a user-initiated switch
  useEffect(() => {
    if (!switched.current) return;
    formRef(mode).current?.querySelector("input")?.focus({ preventScroll: true });
  }, [mode]);

  // Announce success by moving focus to its heading once it is visible
  useEffect(() => {
    if (status.signup === "success") signupSuccessRef.current?.focus({ preventScroll: true });
    else if (status.signin === "success") signinSuccessRef.current?.focus({ preventScroll: true });
  }, [status.signin, status.signup]);

  // The only thing JS does for the slide is flip `mode` (→ .active); CSS handles all motion.
  const switchTo = next => {
    switched.current = true;
    setMode(next);
    setAnnouncement(next === "signup" ? "Create account form shown" : "Sign in form shown");
  };

  const update = (form, name, value) => {
    const nextValues = { ...values[form], [name]: value };
    setValues(v => ({ ...v, [form]: nextValues }));
    // Re-check fields the user is fixing (only those already flagged)
    const flagged = Object.keys(errors[form]).filter(k => errors[form][k]);
    if (flagged.length) {
      const nextErrors = { ...errors[form] };
      flagged.forEach(k => { nextErrors[k] = RULES[form][k](nextValues); });
      setErrors(e => ({ ...e, [form]: nextErrors }));
    }
  };

  const shake = el => {
    el.classList.remove(styles.shake);
    void el.offsetWidth; // restart the shake keyframe
    el.classList.add(styles.shake);
  };

  const handleSubmit = (form, e) => {
    e.preventDefault();
    if (status[form] === "loading") return;
    const formErrors = {};
    Object.entries(RULES[form]).forEach(([name, rule]) => { formErrors[name] = rule(values[form]); });
    setErrors(prev => ({ ...prev, [form]: formErrors }));

    const firstInvalid = Object.keys(formErrors).find(name => formErrors[name]);
    if (firstInvalid) {
      shake(e.currentTarget);
      e.currentTarget.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setStatus(s => ({ ...s, [form]: "loading" }));

    // TODO: connect to Dentease auth API
    // Sign in → supabase.auth.signInWithPassword({ email, password })
    // Sign up → POST /api/register { clinicName, email, password }
    // On failure, set an error and return to "idle" instead of showing success.
    timers.current.push(setTimeout(() => setStatus(s => ({ ...s, [form]: "success" })), 900));
  };

  const reset = form => {
    setValues(v => ({ ...v, [form]: EMPTY[form] }));
    setErrors(e => ({ ...e, [form]: {} }));
    setShown({});
    setStatus(s => ({ ...s, [form]: "idle" }));
    formRef(form).current?.querySelector("input")?.focus({ preventScroll: true });
  };

  const handleGoogle = () => {
    // TODO: connect to Dentease auth API
    // supabase.auth.signInWithOAuth({ provider: "google" })
  };

  const toggleShown = key => () => setShown(s => ({ ...s, [key]: !s[key] }));
  const onShakeEnd = e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove(styles.shake); };

  const isSignup = mode === "signup";
  const si = values.signin, su = values.signup;
  const siErr = errors.signin, suErr = errors.signup;

  const submitButton = (form, label) => (
    <button
      type="submit"
      className={cx(styles.btn, styles.btnPrimary, status[form] === "loading" && styles.isLoading)}
      disabled={status[form] === "loading"}
      aria-busy={status[form] === "loading" || undefined}
    >
      <span className={styles.btnLabel}>{label}</span>
      <span className={styles.spinner} aria-hidden="true" />
    </button>
  );

  const googleBlock = (
    <>
      <div className={styles.divider}>Or continue with</div>
      <button type="button" className={cx(styles.btn, styles.btnGoogle)} onClick={handleGoogle}>
        <GoogleIcon />
        Continue with Google
      </button>
    </>
  );

  return (
    <section className={styles.root} aria-label="Sign in or create a DentEase account">
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />

      <div className={cx(styles.card, isSignup && styles.active)}>
        {/* ── SIGN IN ── */}
        <div className={cx(styles.formWrap, styles.signin, status.signin === "success" && styles.isSuccess)} id={id("signin")} inert={isSignup}>
          <form ref={signinFormRef} className={styles.form} noValidate aria-labelledby={id("signin-title")} onSubmit={e => handleSubmit("signin", e)} onAnimationEnd={onShakeEnd} inert={status.signin === "success"}>
            <h2 className={styles.title} id={id("signin-title")}>Sign In</h2>
            <p className={styles.subtitle}>Access your clinic dashboard.</p>

            <div className={styles.fields}>
              <Field id={id("si-email")} name="email" type="email" label="Email address" icon={Mail} autoComplete="email" placeholder="you@clinic.com"
                value={si.email} onChange={e => update("signin", "email", e.target.value)} error={siErr.email} />
              <Field id={id("si-password")} name="password" label="Password" icon={Lock} autoComplete="current-password" placeholder="Enter your password"
                password shown={!!shown.siPassword} onToggleShown={toggleShown("siPassword")}
                value={si.password} onChange={e => update("signin", "password", e.target.value)} error={siErr.password} />
              <div className={styles.options}>
                <label className={styles.checkLabel}>
                  <input className={styles.checkbox} type="checkbox" name="remember" checked={si.remember} onChange={e => update("signin", "remember", e.target.checked)} />
                  Remember me
                </label>
                <a className={styles.link} href="/forgot-password">Forgot password?</a>
              </div>
            </div>

            {submitButton("signin", "Sign In")}
            {googleBlock}

            <p className={styles.switch}>
              Don&rsquo;t have an account?{" "}
              <button type="button" className={styles.link} aria-controls={id("signup")} aria-expanded={isSignup} onClick={() => switchTo("signup")}>Sign Up</button>
            </p>
          </form>

          <SuccessState titleRef={signinSuccessRef} title="Welcome back!" text="You’re signed in. Taking you to your clinic dashboard…" resetLabel="Back to sign in" onReset={() => reset("signin")} />
        </div>

        {/* ── SIGN UP ── */}
        <div className={cx(styles.formWrap, styles.signup, status.signup === "success" && styles.isSuccess)} id={id("signup")} inert={!isSignup}>
          <form ref={signupFormRef} className={styles.form} noValidate aria-labelledby={id("signup-title")} onSubmit={e => handleSubmit("signup", e)} onAnimationEnd={onShakeEnd} inert={status.signup === "success"}>
            <h2 className={styles.title} id={id("signup-title")}>Create Account</h2>
            <p className={styles.subtitle}>Set up your clinic in under a minute.</p>

            <div className={styles.fields}>
              <div className={styles.row}>
                <Field id={id("su-name")} name="fullName" label="Full name" icon={User} autoComplete="name" placeholder="Dr. Ayesha Khan"
                  value={su.fullName} onChange={e => update("signup", "fullName", e.target.value)} error={suErr.fullName} />
                <Field id={id("su-clinic")} name="clinicName" label="Clinic name" icon={Building2} autoComplete="organization" placeholder="Smile Dental Care"
                  value={su.clinicName} onChange={e => update("signup", "clinicName", e.target.value)} error={suErr.clinicName} />
              </div>
              <Field id={id("su-email")} name="email" type="email" label="Email address" icon={Mail} autoComplete="email" placeholder="you@clinic.com"
                value={su.email} onChange={e => update("signup", "email", e.target.value)} error={suErr.email} />
              <Field id={id("su-password")} name="password" label="Password" icon={Lock} autoComplete="new-password" placeholder="At least 8 characters"
                password shown={!!shown.suPassword} onToggleShown={toggleShown("suPassword")}
                value={su.password} onChange={e => update("signup", "password", e.target.value)} error={suErr.password} />
              <Field id={id("su-confirm")} name="confirmPassword" label="Confirm password" icon={Lock} autoComplete="new-password" placeholder="Re-enter your password"
                password shown={!!shown.suConfirm} onToggleShown={toggleShown("suConfirm")}
                value={su.confirmPassword} onChange={e => update("signup", "confirmPassword", e.target.value)} error={suErr.confirmPassword} />
              <div className={cx(styles.field, suErr.terms && styles.isInvalid)}>
                <label className={styles.checkLabel}>
                  <input className={styles.checkbox} type="checkbox" name="terms" checked={su.terms} onChange={e => update("signup", "terms", e.target.checked)}
                    aria-invalid={suErr.terms ? "true" : "false"} aria-describedby={id("su-terms-err")} />
                  <span>I agree to the <a className={styles.link} href="#">Terms of Service</a> and <a className={styles.link} href="#">Privacy Policy</a></span>
                </label>
                <p className={styles.error} id={id("su-terms-err")}>{suErr.terms}</p>
              </div>
            </div>

            {submitButton("signup", "Create Account")}
            {googleBlock}

            <p className={styles.switch}>
              Already have an account?{" "}
              <button type="button" className={styles.link} aria-controls={id("signin")} aria-expanded={!isSignup} onClick={() => switchTo("signin")}>Sign In</button>
            </p>
          </form>

          <SuccessState titleRef={signupSuccessRef} title="Account created!" text="Your clinic is ready. Check your inbox to verify your email." resetLabel="Back to sign up" onReset={() => reset("signup")} />
        </div>

        {/* ── DECORATIVE SLIDING PANEL ── */}
        <div className={styles.overlayWrap}>
          <div className={styles.overlay}>
            <div className={cx(styles.panel, styles.panelLeft)} inert={!isSignup}>
              <p className={styles.eyebrow}>DentEase</p>
              <h2 className={styles.panelTitle}>Join <em>DentEase</em></h2>
              <p className={styles.panelText}>Patients, appointments, lab records and revenue in one beautifully simple platform. Already registered?</p>
              <button type="button" className={cx(styles.btn, styles.btnGhost)} aria-controls={id("signin")} aria-expanded={!isSignup} onClick={() => switchTo("signin")}>Sign In</button>
            </div>
            <div className={cx(styles.panel, styles.panelRight)} inert={isSignup}>
              <p className={styles.eyebrow}>DentEase</p>
              <h2 className={styles.panelTitle}>WELCOME BACK!</h2>
              <p className={styles.panelText}>Good to see you again. New to DentEase? Set up your clinic in under a minute.</p>
              <button type="button" className={cx(styles.btn, styles.btnGhost)} aria-controls={id("signup")} aria-expanded={isSignup} onClick={() => switchTo("signup")}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>

      <p className={styles.srOnly} aria-live="polite">{announcement}</p>
    </section>
  );
}
