"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { requestJson } from "../../../lib/api";
import WorkspaceFrame from "../components/WorkspaceFrame";
import { canManageWorkspace, errorMessage, type WorkspaceCustomer, type WorkspaceSession } from "../types";

export default function CustomersWorkspace() {
  const [customers, setCustomers] = useState<WorkspaceCustomer[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      requestJson<WorkspaceSession>("/api/auth/session", { signal: controller.signal }),
      requestJson<WorkspaceCustomer[]>("/api/customers", { signal: controller.signal }),
    ]).then(([session, rows]) => {
      if (controller.signal.aborted) return;
      setRole(session.user.role);
      setCustomers(rows);
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted) return;
      setError(errorMessage(loadError, "Customers could not be loaded."));
      setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query))
      : customers;
  }, [customers, search]);

  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await requestJson("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name, phone, email }),
      });
      setName("");
      setPhone("");
      setEmail("");
      setSuccess("Customer added.");
      setReload((value) => value + 1);
    } catch (saveError) {
      setError(errorMessage(saveError, "The customer could not be saved."));
    } finally {
      setSubmitting(false);
    }
  }

  const canManage = canManageWorkspace(role);
  return (
    <WorkspaceFrame
      title="Customers"
      description="Keep customer contact records in one company-scoped directory and make them available at checkout."
      loading={loading}
      error={error}
      success={success}
    >
      {canManage && (
        <section className="panel workspace-panel">
          <div className="panel-head"><div><h2>Add a customer</h2><p>Customer details are available to authorized POS users.</p></div></div>
          <form className="workspace-form" onSubmit={(event) => void addCustomer(event)}>
            <label className="workspace-field"><span>Name</span><input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="workspace-field"><span>Phone</span><input type="tel" maxLength={50} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <label className="workspace-field"><span>Email</span><input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <div className="workspace-form-actions"><button className="primary-btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Add customer"}</button></div>
          </form>
        </section>
      )}
      <section className="panel workspace-panel">
        <div className="panel-head workspace-list-head">
          <div><h2>Customer directory</h2><p>{customers.length} customer{customers.length === 1 ? "" : "s"}</p></div>
          <label className="workspace-search"><span className="sr-only">Search customers</span><input type="search" placeholder="Search name or contact" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th></tr></thead>
            <tbody>
              {visibleCustomers.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.phone || "—"}</td><td>{customer.email || "—"}</td></tr>)}
              {!loading && visibleCustomers.length === 0 && <tr><td className="workspace-empty" colSpan={3}>No customers match this search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceFrame>
  );
}
