"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions/auth";
import Link from "next/link";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const INITIAL = { ok: false, message: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, INITIAL as any);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="min-h-dvh hero-gradient flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card p-8 shadow-xl animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Sign in to your BlogSphere account
            </p>
          </div>

          <form action={formAction} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`input ${state && !state.ok && state.fieldErrors?.email ? "error" : ""}`}
                placeholder="you@example.com"
                required
              />
              {state?.fieldErrors?.email?.map((e) => (
                <p key={e} className="field-error">{e}</p>
              ))}
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  className={`input pr-10 ${state && !state.ok && state.fieldErrors?.password ? "error" : ""}`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {state?.fieldErrors?.password?.map((e) => (
                <p key={e} className="field-error">{e}</p>
              ))}
              <div className="flex justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--brand-500)] hover:text-[var(--brand-400)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Error message */}
            {state && !state.ok && state.message && !state.fieldErrors && (
              <div className="p-3 rounded-lg border border-[var(--danger)] bg-[hsl(0_72%_97%)] dark:bg-[hsl(0_20%_14%)] text-sm text-[var(--danger)]">
                {state.message}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={pending}
            >
              <LogIn size={18} />
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[var(--brand-500)] font-medium hover:text-[var(--brand-400)] transition-colors"
            >
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
