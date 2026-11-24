"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, ReceiptText, Save } from "lucide-react";
import { isUnauthorizedError, requestJson } from "../../lib/api";
import "./setup.css";

type SetupStatus = { needsSetup: boolean; company: { name: string; currencyCode: string; timezone: string } | null };

const BUSINESS_TYPES = ["Retail", "Wholesale", "Distribution", "Supermarket", "Convenience Store", "Other"];
const CURRENCIES = ["MMK", "USD", "EUR", "THB", "SGD"];
const TIMEZONES = ["Asia/Yangon", "Asia/Bangkok", "Asia/Singapore", "UTC"];

export default function SetupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState({
    businessName: "",
    businessType: "Retail",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    currencyCode: "MMK",
    timezone: "Asia/Yangon",
    taxRateBps: 0,
    taxRegistrationNumber: "",
    financialYearStart: "01-01",
    invoicePrefix: "INV",
    receiptTemplate: "standard",
    language: "English",
    branchName: "Main Branch",
    warehouseName: "Main Warehouse",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const status = await requestJson<SetupStatus>("/api/setup/status");
        if (!active) return;
        if (!status.needsSetup) {
          window.location.assign("/");
          return;
        }
        setFields((current) => ({
          ...current,
          businessName: status.company?.name && status.company.name !== "Pending Setup" ? status.company.name : "",
          currencyCode: status.company?.currencyCode ?? "MMK",
          timezone: status.company?.timezone ?? "Asia/Yangon",
        }));
      } catch (loadError) {
        if (!active) return;
        if (isUnauthorizedError(loadError)) {
          window.location.assign("/login?returnTo=/setup");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Setup status could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function update<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (fields.businessName.trim().length < 2) {
      setError("Business name must contain at least 2 characters.");
      return;
    }
    if (fields.branchName.trim().length < 2 || fields.warehouseName.trim().length < 2) {
      setError("Branch and warehouse names are required.");
      return;
    }
    if (!/^\d{2}-\d{2}$/.test(fields.financialYearStart)) {
      setError("Financial year start must use MM-DD format.");
      return;
    }

    setSaving(true);
    try {
      await requestJson("/api/setup", { method: "POST", body: JSON.stringify(fields) });
      setSuccess("Business setup completed.");
      window.setTimeout(() => window.location.assign("/"), 500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Business setup could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="setup-page"><div className="setup-loading">Loading secure business setup…</div></main>;
  }

  return (
    <main className="setup-page">
      <form className="setup-card" onSubmit={submit}>
        <header className="setup-header">
          <div className="setup-mark"><Building2 size={24} /></div>
          <div>
            <p>Initial configuration</p>
            <h1>Set up your business</h1>
            <span>Configure the tenant, branch, warehouse, currency, tax, and reporting defaults.</span>
          </div>
        </header>

        {error && <div className="setup-alert setup-alert-error"><AlertCircle size={17} /><span>{error}</span></div>}
        {success && <div className="setup-alert setup-alert-success"><CheckCircle2 size={17} /><span>{success}</span></div>}

        <section className="setup-section">
          <h2><Building2 size={17} /> Business profile</h2>
          <div className="setup-grid">
            <label><span>Business name *</span><input value={fields.businessName} onChange={(event) => update("businessName", event.target.value)} required /></label>
            <label><span>Business type *</span><select value={fields.businessType} onChange={(event) => update("businessType", event.target.value)}>{BUSINESS_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Business phone</span><input value={fields.phone} onChange={(event) => update("phone", event.target.value)} /></label>
            <label><span>Business email</span><input type="email" value={fields.email} onChange={(event) => update("email", event.target.value)} /></label>
            <label><span>Company logo URL</span><input type="url" value={fields.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} placeholder="https://" /></label>
            <label className="setup-span-2"><span>Business address</span><textarea value={fields.address} onChange={(event) => update("address", event.target.value)} rows={3} /></label>
          </div>
        </section>

        <section className="setup-section">
          <h2><ReceiptText size={17} /> Regional and tax settings</h2>
          <div className="setup-grid">
            <label><span>Currency *</span><select value={fields.currencyCode} onChange={(event) => update("currencyCode", event.target.value)}>{CURRENCIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Timezone *</span><select value={fields.timezone} onChange={(event) => update("timezone", event.target.value)}>{TIMEZONES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Tax rate (basis points)</span><input type="number" min="0" max="10000" value={fields.taxRateBps} onChange={(event) => update("taxRateBps", Number(event.target.value))} /></label>
            <label><span>Tax registration number</span><input value={fields.taxRegistrationNumber} onChange={(event) => update("taxRegistrationNumber", event.target.value)} /></label>
            <label><span>Financial year start (MM-DD)</span><input value={fields.financialYearStart} onChange={(event) => update("financialYearStart", event.target.value)} placeholder="01-01" /></label>
            <label><span>Invoice prefix</span><input value={fields.invoicePrefix} onChange={(event) => update("invoicePrefix", event.target.value)} /></label>
            <label><span>Receipt template</span><select value={fields.receiptTemplate} onChange={(event) => update("receiptTemplate", event.target.value)}><option value="standard">Standard</option><option value="compact">Compact</option><option value="detailed">Detailed</option></select></label>
            <label><span>Language</span><select value={fields.language} onChange={(event) => update("language", event.target.value)}><option>English</option><option>Myanmar</option></select></label>
          </div>
        </section>

        <section className="setup-section">
          <h2><Building2 size={17} /> First branch and warehouse</h2>
          <div className="setup-grid">
            <label><span>Branch name *</span><input value={fields.branchName} onChange={(event) => update("branchName", event.target.value)} required /></label>
            <label><span>Warehouse name *</span><input value={fields.warehouseName} onChange={(event) => update("warehouseName", event.target.value)} required /></label>
          </div>
        </section>

        <footer className="setup-footer">
          <span>All values can be changed later from system settings.</span>
          <button type="submit" disabled={saving}><Save size={16} />{saving ? "Saving setup…" : "Complete setup"}</button>
        </footer>
      </form>
    </main>
  );
}
