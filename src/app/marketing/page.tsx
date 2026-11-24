"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CirclePlay,
  Scale,
  ClipboardCheck,
  ShieldCheck,
  Gavel,
  TrendingUp,
  Cloud,
  Zap,
  LogOut,
  User,
} from "lucide-react";
import AuthForm from "./auth-form";
import "./marketing.css";

const NAV_LINKS = [
  { label: "Solutions", href: "#" },
  { label: "Platform Architecture", href: "#" },
  { label: "Security & IRD e-Tax", href: "#" },
  { label: "Pricing & ROI", href: "#roi-calculator" },
  { label: "Customer Stories", href: "#" },
];

const METRICS = [
  { icon: ShieldCheck, label: "High-Availability SLA", value: "99.995%", note: "Multi-AZ Edge Failover" },
  { icon: Scale, label: "Hardware Tare Sync", value: "< 8ms", note: "Serial & USB Sub-Second" },
  { icon: ShieldCheck, label: "IRD Form 31 Gateway", value: "100% Pass", note: "Cryptographic QR Tokens" },
  { icon: TrendingUp, label: "Monthly Volume", value: "12.4B+", note: "MMK Settled Without Desync" },
];

const PILLARS = [
  {
    icon: Scale,
    tone: "primary",
    title: "Hardware-Integrated Precision POS",
    body: "Automatic category-linked tare presets (-15g pouch, -120g jar), supervisor RBAC override clamps, offline barcode caching, and instant label generation with zero driver lag.",
    footer: "Serial / USB / BLE Scales",
  },
  {
    icon: ClipboardCheck,
    tone: "secondary",
    title: "Automated 3-Way Procurement Matching",
    body: "Continuously reconcile purchase orders, warehouse Goods Received notes, and supplier invoices. Automatically locks unauthorized price variations and captures early settlement cash discounts.",
    footer: "Zero-Drift AP Verification",
  },
  {
    icon: ShieldCheck,
    tone: "primary-fixed",
    title: "Automated IRD Form 31 & Direct Tax API",
    body: "Native certified integration with Myanmar Internal Revenue Department. Generates encrypted QR commercial tax tokens on every receipt, with immutable audit logs and 1-click monthly reconciliations.",
    footer: "IRD v2.4 Certified Engine",
  },
  {
    icon: Gavel,
    tone: "tertiary",
    title: "Dual-Control Treasury & Quorum Governance",
    body: "Multi-tier segregation of duties for capital expenditures and vendor disbursements > 10M MMK. Cryptographic approvals via hardware keys eliminate rogue branch payouts.",
    footer: "FIDO2 / WebAuthn Enforced",
  },
  {
    icon: TrendingUp,
    tone: "secondary",
    title: "Predictive Cash Flow & AP/AR Aging",
    body: "Real-time Days Sales Outstanding (DSO) forecasting with automated alerts for overdue accounts. Machine learning identifies vendor rebate opportunities across high-velocity product lines.",
    footer: "Working Capital Optimization",
  },
  {
    icon: Cloud,
    tone: "primary",
    title: "Multi-Branch Edge-Cloud Resilience",
    body: "Continuous operation even during prolonged regional internet blackouts. Branch registers process hundreds of transactions offline, auto-reconciling bi-directionally without inventory conflicts.",
    footer: "Zero-Downtime Autonomous Edge",
  },
];

export default function MarketingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);

  const handleAuthSuccess = (authUser: { id: string; email: string; role: string }, setupRequired: boolean) => {
    setUser(authUser);
    setShowAuth(false);
    if (setupRequired) window.location.assign("/setup");
  };

  return (
    <div className="mkt-root font-inter font-plus-jakarta">
      <header className="mkt-header">
        <div className="mkt-header-inner">
          <a className="mkt-brand" href="#top">
            <div className="mkt-logo-mark">
              <Zap size={20} strokeWidth={2.2} />
            </div>
            <div className="mkt-brand-text">
              <span className="mkt-brand-name mkt-headline-md">Quick Enterprise</span>
              <span className="mkt-brand-tag">e-Tax • ERP • Core POS</span>
            </div>
          </a>

          <nav className="mkt-nav" aria-label="Marketing">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mkt-header-actions">
            <div className="mkt-ird-pill">
              <span className="mkt-ird-dot" />
              <span>IRD Direct Sync: Nominal</span>
            </div>

            {user ? (
              <>
                <span className="mkt-user-pill">
                  <User size={14} />
                  <span>{user.email}</span>
                </span>
                <Link href="/pos" className="mkt-btn mkt-btn-primary">
                  <span>Open POS Dashboard</span>
                  <ArrowRight size={14} />
                </Link>
                <button
                  className="mkt-btn mkt-btn-ghost"
                  type="button"
                  onClick={() => {
                    setUser(null);
                    document.cookie =
                      "quick_session=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0";
                  }}
                >
                  <LogOut size={16} strokeWidth={2} />
                  <span className="mkt-hide-sm">Sign out</span>
                </button>
              </>
            ) : (
              <>
                <a className="mkt-btn mkt-btn-ghost" href="/login?returnTo=/">
                  <User size={16} strokeWidth={2} />
                  <span className="mkt-hide-sm">Sign in</span>
                </a>
                <a
                  href="/login?mode=signup&returnTo=/"
                  className="mkt-btn mkt-btn-primary"
                >
                  <span>Create account</span>
                  <ArrowRight size={14} />
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {showAuth && !user && <AuthForm onSuccess={handleAuthSuccess} />}

      <main className="mkt-main" id="top">
        <section className="mkt-hero">
          <div className="mkt-ambient mkt-ambient-1" />
          <div className="mkt-ambient mkt-ambient-2" />
          <div className="mkt-ambient mkt-ambient-3" />

          <div className="mkt-hero-inner">
            <div className="mkt-pill">
              <span className="mkt-pill-dot" />
              <span>Now IRD e-Tax API v2.4 Certified</span>
              <span className="mkt-pill-sep">•</span>
              <span className="mkt-pill-text">Real-time Form 31 Submission &amp; Automated Tax Verification</span>
              <ShieldCheck size={14} className="mkt-pill-icon" />
            </div>

            <h1 className="mkt-hero-title mkt-display">
              The Sovereign Enterprise Operating System for{" "}
              <span className="mkt-hero-title-gradient">High-Growth Commerce</span>
            </h1>

            <p className="mkt-hero-sub">
              Unify real-time retail POS with sub-second scale tare governance, 3-way procurement matching, dual-control
              treasury approvals, and statutory Myanmar IRD e-Tax compliance — across 100+ branches with offline-first
              resilience.
            </p>

            <div className="mkt-hero-ctas">
              <a className="mkt-btn mkt-btn-primary mkt-btn-lg" href="#enterprise-pilot">
                <span>Schedule Private Enterprise Pilot</span>
                <ArrowRight size={16} />
              </a>
              <button className="mkt-btn mkt-btn-ghost mkt-btn-lg" type="button">
                <CirclePlay size={18} />
                <span>Explore Live Interactive Sandbox</span>
              </button>
            </div>

            <div className="mkt-metrics">
              {METRICS.map((m) => (
                <div className="mkt-metric" key={m.label}>
                  <div className="mkt-metric-icon">
                    <m.icon size={18} />
                  </div>
                  <div className="mkt-metric-value">{m.value}</div>
                  <div className="mkt-metric-label">{m.label}</div>
                  <div className="mkt-metric-note">{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mkt-pillars">
          <div className="mkt-pillars-inner">
            <div className="mkt-pillars-head">
              <span className="mkt-eyebrow">Core Operational Capabilities</span>
              <h2 className="mkt-pillars-title mkt-headline-lg">Engineered for High-Throughput Enterprises Where Milliseconds and Kyats Count</h2>
              <p className="mkt-pillars-sub">
                Six mission-critical modules constructed as a unified resilient fabric. Deploy on local edge micro-servers
                or central cloud.
              </p>
            </div>

            <div className="mkt-pillar-grid">
              {PILLARS.map((p) => (
                <article className="mkt-pillar" key={p.title}>
                  <div className={`mkt-pillar-icon mkt-tone-${p.tone}`}>
                    <p.icon size={24} />
                  </div>
                  <h3 className="mkt-pillar-title">{p.title}</h3>
                  <p className="mkt-pillar-body">{p.body}</p>
                  <div className="mkt-pillar-footer">
                    <span>{p.footer}</span>
                    <ArrowRight size={14} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
