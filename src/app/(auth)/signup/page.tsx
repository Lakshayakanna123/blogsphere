"use client";

import { useActionState, useState } from "react";
import { signUp } from "@/lib/actions/auth";
import Link from "next/link";
import { UserPlus, Eye, EyeOff, CheckCircle } from "lucide-react";

const INITIAL = { ok: false, message: "" };

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, INITIAL as any);
  const [showPwd, setShowPwd] = useState(false);

  if (state?.ok) {
    return (
      <div className="min-h-dvh hero-gradient flex items-center justify-center px-4">
        <div className="card p-10 max-w-md w-full text-center shadow-xl animate-fade-in-up">
          <CheckCircle size={48} className="text-[var(--success)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Almost there!</h1>
          <p className="text-[var(--text-secondary)]">{state.message}</p>
          <Link href="/login" className="btn btn-primary mt-6">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh hero-gradient flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-xl animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-1">Create your account</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Join the BlogSphere community
            </p>
          </div>

          <form action={formAction} className="space-y-4" noValidate>
            {/* Display name */}
            <div>
              <label className="label" htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                className={`input ${state?.fieldErrors?.displayName ? "error" : ""}`}
                placeholder="Your name"
                required
              />
              {state?.fieldErrors?.displayName?.map((e) => (
                <p key={e} className="field-error">{e}</p>
              ))}
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`input ${state?.fieldErrors?.email ? "error" : ""}`}
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
                  autoComplete="new-password"
                  className={`input pr-10 ${state?.fieldErrors?.password ? "error" : ""}`}
                  placeholder="Min. 8 characters"
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
            </div>

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
              <UserPlus size={18} />
              {pending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--brand-500)] font-medium hover:text-[var(--brand-400)] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
