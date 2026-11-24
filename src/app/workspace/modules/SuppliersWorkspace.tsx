"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { requestJson } from "../../../lib/api";
import WorkspaceFrame from "../components/WorkspaceFrame";
import { errorMessage, type WorkspaceSession, type WorkspaceSupplier } from "../types";

type SupplierForm = {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  paymentTerms: string;
  notes: string;
};

const EMPTY_FORM: SupplierForm = {
  code: "", name: "", contactPerson: "", phone: "", email: "",
  address: "", taxNumber: "", paymentTerms: "", notes: "",
};

export default function SuppliersWorkspace() {
  const [suppliers, setSuppliers] = useState<WorkspaceSupplier[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      requestJson<WorkspaceSession>("/api/auth/session", { signal: controller.signal }),
      requestJson<WorkspaceSupplier[]>("/api/suppliers", { signal: controller.signal }),
    ]).then(([session, rows]) => {
      if (controller.signal.aborted) return;
      setRole(session.user.role);
      setSuppliers(rows);
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted) return;
      setError(errorMessage(loadError, "Suppliers could not be loaded."));
      setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  const visibleSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? suppliers.filter((supplier) => `${supplier.code} ${supplier.name} ${supplier.contactPerson} ${supplier.phone}`.toLowerCase().includes(query))
      : suppliers;
  }, [suppliers, search]);

  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await requestJson("/api/suppliers", { method: "POST", body: JSON.stringify(form) });
      setForm(EMPTY_FORM);
      setSuccess("Supplier added.");
      setReload((value) => value + 1);
    } catch (saveError) {
      setError(errorMessage(saveError, "The supplier could not be saved."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkspaceFrame
      title="Suppliers"
      description="Maintain supplier contacts and terms for receiving goods into the assigned warehouse."
      loading={loading}
      error={error}
      success={success}
    >
      {(role === "owner" || role === "manager") && (
        <section className="panel workspace-panel">
          <div className="panel-head"><div><h2>Add a supplier</h2><p>Supplier codes must be unique within your company.</p></div></div>
          <form className="workspace-form" onSubmit={(event) => void addSupplier(event)}>
            <label className="workspace-field"><span>Supplier code</span><input required maxLength={64} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <label className="workspace-field"><span>Supplier name</span><input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="workspace-field"><span>Contact person</span><input maxLength={160} value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></label>
            <label className="workspace-field"><span>Phone</span><input type="tel" maxLength={50} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label className="workspace-field"><span>Email</span><input type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="workspace-field"><span>Payment terms</span><input placeholder="e.g. Net 30" maxLength={120} value={form.paymentTerms} onChange={(event) => setForm({ ...form, paymentTerms: event.target.value })} /></label>
            <label className="workspace-field workspace-field-wide"><span>Address</span><input maxLength={300} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            <label className="workspace-field"><span>Tax number</span><input maxLength={100} value={form.taxNumber} onChange={(event) => setForm({ ...form, taxNumber: event.target.value })} /></label>
            <label className="workspace-field"><span>Notes</span><input maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <div className="workspace-form-actions"><button className="primary-btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Add supplier"}</button></div>
          </form>
        </section>
      )}
      <section className="panel workspace-panel">
        <div className="panel-head workspace-list-head">
          <div><h2>Supplier directory</h2><p>{suppliers.length} active supplier{suppliers.length === 1 ? "" : "s"}</p></div>
          <label className="workspace-search"><span className="sr-only">Search suppliers</span><input type="search" placeholder="Search supplier or code" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead><tr><th>Code</th><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Terms</th></tr></thead>
            <tbody>
              {visibleSuppliers.map((supplier) => <tr key={supplier.id}><td>{supplier.code}</td><td>{supplier.name}</td><td>{supplier.contactPerson || "—"}</td><td>{supplier.phone || "—"}</td><td>{supplier.email || "—"}</td><td>{supplier.paymentTerms || "—"}</td></tr>)}
              {!loading && visibleSuppliers.length === 0 && <tr><td className="workspace-empty" colSpan={6}>No suppliers match this search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceFrame>
  );
}
