"use client";

/**
 * LoginView — adaptive login page.
 *
 * IS_MOCK=true  (development / demo)
 *   Shows an email + password form backed by the mock API client.
 *   Use credentials: admin@techgene.com / password123
 *
 * IS_MOCK=false (production)
 *   Shows only the "Sign in with Microsoft" button.
 *   Clicking it calls MSAL loginRedirect() → Azure AD → back to this app.
 *   MsalProvider (in AppProviders) automatically handles the redirect callback.
 *   No email/password fields are rendered; authentication is 100% via Azure AD.
 */

import { useEffect, useState } from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { IS_MOCK } from "@/lib/api/config";
import { setSessionCookie } from "@/lib/auth/storage";
import { useLogin, useAzureLogin } from "@/features/auth/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SpinnerIcon(): React.ReactElement {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/** Official Microsoft logo — four coloured squares */
function MicrosoftLogo(): React.ReactElement {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-500" aria-live="polite">
      {message}
    </p>
  );
}

// ─── Azure SSO panel ──────────────────────────────────────────────────────────

function AzureLoginPanel(): React.ReactElement {
  const { handleLogin } = useAzureLogin();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  /**
   * After Azure redirects back to /login, MsalProvider calls
   * handleRedirectPromise() automatically. Once it resolves,
   * useIsAuthenticated() flips to true — we then set the session
   * cookie and navigate to the dashboard.
   */
  useEffect(() => {
    if (isAuthenticated) {
      setSessionCookie();
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Show a spinner while MSAL is processing the redirect callback
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="h-6 w-6 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span className="ml-3 text-sm text-ink-muted">Signing you in…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-ink-muted"></p>

      <button
        type="button"
        onClick={handleLogin}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm font-semibold text-[#2f2f2f] shadow-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2"
      >
        <MicrosoftLogo />
        Sign in with Microsoft
      </button>

      <p className="text-center text-xs text-ink-subtle">
        Only <strong>@techgene.com</strong> accounts are permitted.
        <br />
        Contact IT if you cannot access your account.
      </p>
    </div>
  );
}

// ─── Mock email/password panel (dev only) ─────────────────────────────────────

function MockLoginPanel(): React.ReactElement {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = (data: LoginFormValues): void => {
    login(data);
  };

  const inputBase =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-sidebar-active focus:outline-none focus:ring-1 focus:ring-sidebar-active";

  return (
    <>
      {/* Dev-mode hint */}
      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <strong>Dev mode</strong> — use <code className="font-mono">admin@techgene.com</code> /{" "}
        <code className="font-mono">password123</code>
      </div>

      {/* API error */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            placeholder="you@techgene.com"
            className={cn(
              inputBase,
              errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400",
            )}
            {...register("email", {
              required: "Email is required.",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format." },
            })}
          />
          <FieldError message={errors.email?.message} />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              placeholder="••••••••"
              className={cn(
                inputBase,
                "pr-10",
                errors.password && "border-red-400 focus:border-red-400 focus:ring-red-400",
              )}
              {...register("password", { required: "Password is required." })}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink focus:outline-none"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <FieldError message={errors.password?.message} />
        </div>

        {/* Remember Me + Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-brand"
              {...register("rememberMe")}
            />
            Remember me
          </label>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-sm font-medium text-sidebar-active hover:underline"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending && <SpinnerIcon />}
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
import Image from "next/image";
export function LoginView(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="RC Pricing logo"
            width={48}
            height={48}
            className="h-12 w-12"
          />

          <div className="text-center">
            <p className="text-xl font-bold text-ink">RC Pricing</p>
            <p className="text-xs text-ink-subtle">powered by Techgene</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-card border border-line bg-surface p-8 shadow-card">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {IS_MOCK
                ? "Sign in to your account to continue"
                : "Sign in with your Techgene account to continue"}
            </p>
          </div>

          {/* Render the right panel based on environment */}
          {IS_MOCK ? <MockLoginPanel /> : <AzureLoginPanel />}
        </div>
      </div>
    </div>
  );
}
