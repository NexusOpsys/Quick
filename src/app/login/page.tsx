"use client";

import { useState } from "react";
import { AlertCircle, Lock, Mail, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { requestJson } from "../../lib/api";
import "../marketing/marketing.css";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < (mode === "signup" ? 12 : 1)) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const result = await requestJson<{ setupRequired?: boolean }>(endpoint, {
        method: "POST",
        body: JSON.stringify(mode === "signup" ? { email, password } : { email, password }),
      });
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      window.location.assign(result.setupRequired ? "/setup" : returnTo && returnTo.startsWith("/") ? returnTo : "/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page mkt-root">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />
      <div className="auth-shell">
        <header className="auth-brand-header">
          <Link className="mkt-brand" href="/marketing">
            <div className="mkt-logo-mark"><Zap size={20} strokeWidth={2.2} /></div>
            <div className="mkt-brand-text">
              <span className="mkt-brand-name mkt-headline-md">Quick Enterprise</span>
              <span className="mkt-brand-tag">e-Tax • ERP • Core POS</span>
            </div>
          </Link>
        </header>
        <section className="auth-layout">
          <aside className="auth-showcase" aria-label="Platform overview">
            <div className="auth-showcase-pill"><span /> Secure business workspace</div>
            <h2>One operating system for inventory, POS, finance, and growth.</h2>
            <p>Sign in to access your branch or create an account to begin guided business setup.</p>
            <div className="auth-feature-grid">
              <div><strong>POS</strong><span>Fast checkout</span></div>
              <div><strong>ERP</strong><span>Unified operations</span></div>
              <div><strong>Secure</strong><span>Tenant isolation</span></div>
            </div>
          </aside>
          <section className="auth-form-section" aria-labelledby="auth-heading">
            <div className="auth-form-card">
              <div className="auth-form-header">
                <div className="auth-form-icon"><ShieldCheck size={28} /></div>
                <div>
                  <h1 id="auth-heading" className="auth-form-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
                  <p className="auth-form-subtitle">{mode === "signup" ? "Create an account, then configure your business." : "Sign in to your Quick workspace."}</p>
                </div>
              </div>
              {error && <div className="auth-form-alert auth-form-alert-error"><AlertCircle size={16} /><span>{error}</span></div>}
              <form onSubmit={submit} className="auth-form-body" noValidate>
                <label className="auth-form-field">
                  <Mail size={16} className="auth-form-field-icon" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required />
                </label>
                <label className="auth-form-field">
                  <Lock size={16} className="auth-form-field-icon" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 12 : 1} />
                </label>
                {mode === "signup" && (
                  <label className="auth-form-field">
                    <Lock size={16} className="auth-form-field-icon" />
                    <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" autoComplete="new-password" required minLength={12} />
                  </label>
                )}
                <button className="auth-form-submit" type="submit" disabled={loading}>
                  {loading ? "Processing…" : mode === "signup" ? "Create account" : "Sign in"}
                </button>
              </form>
              <button type="button" className="auth-form-toggle" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>
                {mode === "signup" ? "Already have an account? Sign in" : "New to Quick? Create an account"}
              </button>
              <p className="auth-form-footer"><Link className="auth-form-footer-link" href="/marketing">Back to website</Link></p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
