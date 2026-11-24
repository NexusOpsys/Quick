"use client";

import { useEffect, useState, type FormEvent } from "react";
import { requestJson } from "../../../lib/api";
import WorkspaceFrame from "../components/WorkspaceFrame";
import { errorMessage, type BusinessSettings } from "../types";

const EMPTY_SETTINGS: BusinessSettings = {
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
  branchName: "",
  warehouseName: "",
};

export default function SettingsWorkspace() {
  const [settings, setSettings] = useState<BusinessSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    requestJson<BusinessSettings>("/api/settings", { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      setSettings(data);
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted) return;
      setError(errorMessage(loadError, "Business settings could not be loaded."));
      setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await requestJson("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ ...settings, taxRateBps: Number(settings.taxRateBps) }),
      });
      setSuccess("Business settings saved. Existing sales and stock history were not changed.");
      setReload((value) => value + 1);
    } catch (saveError) {
      setError(errorMessage(saveError, "Business settings could not be saved."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkspaceFrame
      title="Settings"
      description="Update business identity, regional defaults, receipt preferences, and the assigned branch and warehouse. Owner access only."
      loading={loading}
      error={error}
      success={success}
    >
      <section className="panel workspace-panel">
        <div className="panel-head"><div><h2>Business configuration</h2><p>Changes are recorded in the audit history.</p></div></div>
        <form className="workspace-form" onSubmit={(event) => void saveSettings(event)}>
          <label className="workspace-field"><span>Business name</span><input required minLength={2} maxLength={120} value={settings.businessName} onChange={(event) => setSettings({ ...settings, businessName: event.target.value })} /></label>
          <label className="workspace-field"><span>Business type</span><select value={settings.businessType} onChange={(event) => setSettings({ ...settings, businessType: event.target.value as BusinessSettings["businessType"] })}><option>Retail</option><option>Wholesale</option><option>Distribution</option><option>Supermarket</option><option>Convenience Store</option><option>Other</option></select></label>
          <label className="workspace-field"><span>Business email</span><input type="email" maxLength={254} value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} /></label>
          <label className="workspace-field"><span>Phone</span><input type="tel" maxLength={50} value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></label>
          <label className="workspace-field workspace-field-wide"><span>Address</span><input maxLength={300} value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} /></label>
          <label className="workspace-field"><span>Logo URL</span><input type="url" maxLength={2048} value={settings.logoUrl} onChange={(event) => setSettings({ ...settings, logoUrl: event.target.value })} /></label>
          <label className="workspace-field"><span>Currency code</span><input required pattern="[A-Z]{3}" maxLength={3} value={settings.currencyCode} onChange={(event) => setSettings({ ...settings, currencyCode: event.target.value.toUpperCase() })} /></label>
          <label className="workspace-field"><span>Time zone</span><input required maxLength={80} value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></label>
          <label className="workspace-field"><span>Tax rate (basis points)</span><input type="number" min="0" max="10000" step="1" value={settings.taxRateBps} onChange={(event) => setSettings({ ...settings, taxRateBps: Number(event.target.value) })} /></label>
          <label className="workspace-field"><span>Tax registration number</span><input maxLength={100} value={settings.taxRegistrationNumber} onChange={(event) => setSettings({ ...settings, taxRegistrationNumber: event.target.value })} /></label>
          <label className="workspace-field"><span>Financial year start (MM-DD)</span><input required pattern="[0-9]{2}-[0-9]{2}" maxLength={5} value={settings.financialYearStart} onChange={(event) => setSettings({ ...settings, financialYearStart: event.target.value })} /></label>
          <label className="workspace-field"><span>Invoice prefix</span><input required minLength={1} maxLength={20} value={settings.invoicePrefix} onChange={(event) => setSettings({ ...settings, invoicePrefix: event.target.value })} /></label>
          <label className="workspace-field"><span>Receipt template</span><select value={settings.receiptTemplate} onChange={(event) => setSettings({ ...settings, receiptTemplate: event.target.value as BusinessSettings["receiptTemplate"] })}><option value="standard">Standard</option><option value="compact">Compact</option><option value="detailed">Detailed</option></select></label>
          <label className="workspace-field"><span>Language</span><select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value as BusinessSettings["language"] })}><option>English</option><option>Myanmar</option></select></label>
          <label className="workspace-field"><span>Branch name</span><input required minLength={2} maxLength={120} value={settings.branchName} onChange={(event) => setSettings({ ...settings, branchName: event.target.value })} /></label>
          <label className="workspace-field"><span>Warehouse name</span><input required minLength={2} maxLength={120} value={settings.warehouseName} onChange={(event) => setSettings({ ...settings, warehouseName: event.target.value })} /></label>
          <div className="workspace-form-actions"><button className="primary-btn" type="submit" disabled={submitting || loading}>{submitting ? "Saving…" : "Save settings"}</button></div>
        </form>
      </section>
    </WorkspaceFrame>
  );
}
