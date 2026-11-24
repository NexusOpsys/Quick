"use client";

import { useState, useCallback } from "react";
import { Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type AuthMode = "signup" | "login";

interface AuthFormProps {
  onSuccess: (user: { id: string; email: string; role: string }, setupRequired: boolean) => void;
}

function validateSignup(data: {
  email: string;
  password: string;
  confirmPassword: string;
}): { ok: true } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const email = data.email.trim();
  const password = data.password;

  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 12) {
    errors.password = "Password must be at least 12 characters.";
  }

  if (password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

function validateLogin(data: { email: string; password: string }): {
  ok: true;
} | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const email = data.email.trim();

  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!data.password) {
    errors.password = "Password is required.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formData = {
    email: "",
    password: "",
    confirmPassword: "",
  };

  const [fields, setFields] = useState(formData);

  const handleChange = useCallback(
    (key: keyof typeof formData, value: string) => {
      setFields((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError("");
      setSuccess("");

      if (mode === "signup") {
        const result = validateSignup(fields);
        if (!result.ok) {
          setError(Object.values(result.errors)[0]);
          return;
        }
      } else {
        const result = validateLogin({ email: fields.email, password: fields.password });
        if (!result.ok) {
          setError(Object.values(result.errors)[0]);
          return;
        }
      }

      setLoading(true);
      try {
        const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
        const body =
          mode === "signup"
            ? {
                email: fields.email,
                password: fields.password,
              }
            : { email: fields.email, password: fields.password };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const resultJson = (await response.json()) as {
          error?: string;
          user?: { id: string; email: string; role: string };
          setupRequired?: boolean;
        };

        if (!response.ok) {
          setError(resultJson.error || (mode === "signup" ? "Sign up failed." : "Sign in failed."));
          return;
        }

        setSuccess(mode === "signup" ? "Account created successfully." : "Signed in successfully.");
        onSuccess(
          resultJson.user ?? { id: "", email: fields.email, role: "owner" },
          resultJson.setupRequired ?? mode === "signup",
        );
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [mode, fields, onSuccess],
  );

  return (
    <section className="auth-form-section" aria-labelledby="auth-heading">
      <div className="auth-form-card">
        <div className="auth-form-header">
          <div className="auth-form-icon">
            {mode === "signup" ? (
              <CheckCircle2 size={28} strokeWidth={2} />
            ) : (
              <ShieldCheck size={28} strokeWidth={2} />
            )}
          </div>
          <div>
            <h2 id="auth-heading" className="auth-form-title">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="auth-form-subtitle">
              {mode === "signup"
                ? "Join Quick Enterprise and start using your POS dashboard."
                : "Sign in to access your POS dashboard."}
            </p>
          </div>
        </div>

        {error && (
          <div className="auth-form-alert auth-form-alert-error">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-form-alert auth-form-alert-success">
            <CheckCircle2 size={16} strokeWidth={2} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
          <div className="auth-form-field">
            <Mail size={16} strokeWidth={2} className="auth-form-field-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={fields.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
              autoComplete={mode === "signup" ? "email" : "username"}
            />
          </div>

          <div className="auth-form-field">
            <Lock size={16} strokeWidth={2} className="auth-form-field-icon" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={fields.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
              minLength={12}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {mode === "signup" && (
            <div className="auth-form-field">
              <Lock size={16} strokeWidth={2} className="auth-form-field-icon" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={fields.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            className="auth-form-submit"
            disabled={loading}
          >
            {loading ? "Processing…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="auth-form-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-form-toggle"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New to Quick? Create an account"}
        </button>

        <p className="auth-form-footer">
          Already have a business set up?{" "}
          <Link href="/pos" className="auth-form-footer-link">
            Go to POS dashboard
          </Link>
        </p>
      </div>
    </section>
  );
}
