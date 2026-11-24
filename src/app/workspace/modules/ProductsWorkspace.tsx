"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { currencyMinorUnitScale } from "../../../domain/sales";
import { requestJson } from "../../../lib/api";
import WorkspaceFrame from "../components/WorkspaceFrame";
import { canManageWorkspace, errorMessage, type WorkspaceProduct, type WorkspaceSession } from "../types";

type ProductForm = {
  sku: string;
  name: string;
  category: string;
  price: string;
  taxRateBps: string;
  isStocked: boolean;
  openingQuantity: string;
  reorderLevel: string;
};

const EMPTY_FORM: ProductForm = {
  sku: "",
  name: "",
  category: "",
  price: "",
  taxRateBps: "0",
  isStocked: true,
  openingQuantity: "0",
  reorderLevel: "0",
};

export default function ProductsWorkspace() {
  const [products, setProducts] = useState<WorkspaceProduct[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState("MMK");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      requestJson<WorkspaceSession>("/api/auth/session", { signal: controller.signal }),
      requestJson<WorkspaceProduct[]>("/api/products", { signal: controller.signal }),
    ]).then(([session, rows]) => {
      if (controller.signal.aborted) return;
      setRole(session.user.role);
      setCurrencyCode(session.company.currencyCode);
      setProducts(rows);
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted) return;
      setError(errorMessage(loadError, "Products could not be loaded."));
      setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query))
      : products;
  }, [products, search]);
  const canManage = canManageWorkspace(role);

  function startEditing(product: WorkspaceProduct) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: String(product.priceMinor / currencyMinorUnitScale(currencyCode)),
      taxRateBps: String(product.taxRateBps),
      isStocked: product.isStocked === 1,
      openingQuantity: "0",
      reorderLevel: String(product.reorderLevel),
    });
    setSuccess("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const payload = {
      sku: form.sku,
      name: form.name,
      category: form.category,
      priceMinor: Math.round(Number(form.price) * currencyMinorUnitScale(currencyCode)),
      taxRateBps: Number(form.taxRateBps),
      isStocked: form.isStocked,
      reorderLevel: Number(form.reorderLevel),
      ...(!editingId ? { openingQuantity: Number(form.openingQuantity) } : {}),
    };
    try {
      await requestJson(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(editingId ? "Product details updated." : "Product added to the catalog.");
      resetForm();
      setReload((value) => value + 1);
    } catch (saveError) {
      setError(errorMessage(saveError, "The product could not be saved."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkspaceFrame
      title="Products"
      description="Search the catalog, add products, and update product details without silently changing stock."
      loading={loading}
      error={error}
      success={success}
    >
      {canManage && (
        <section className="panel workspace-panel">
          <div className="panel-head"><div><h2>{editingId ? "Edit product" : "Add a product"}</h2><p>Stock changes belong in Warehouse adjustments or counts.</p></div></div>
          <form className="workspace-form" onSubmit={(event) => void saveProduct(event)}>
            <label className="workspace-field"><span>SKU</span><input required maxLength={64} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
            <label className="workspace-field"><span>Product name</span><input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="workspace-field"><span>Category</span><input maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
            <label className="workspace-field"><span>Selling price ({currencyCode})</span><input required type="number" min="0" step="any" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
            <label className="workspace-field"><span>Tax rate (basis points)</span><input type="number" min="0" max="10000" step="1" value={form.taxRateBps} onChange={(event) => setForm({ ...form, taxRateBps: event.target.value })} /></label>
            <label className="workspace-field"><span>Reorder level</span><input type="number" min="0" step="1" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: event.target.value })} /></label>
            {!editingId && form.isStocked && (
              <label className="workspace-field"><span>Opening quantity</span><input type="number" min="0" step="1" value={form.openingQuantity} onChange={(event) => setForm({ ...form, openingQuantity: event.target.value })} /></label>
            )}
            <label className="workspace-check"><input type="checkbox" checked={form.isStocked} onChange={(event) => setForm({ ...form, isStocked: event.target.checked })} /><span>Track inventory for this product</span></label>
            <div className="workspace-form-actions">
              <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save changes" : "Add product"}</button>
              {editingId && <button className="secondary-btn" type="button" onClick={resetForm}>Cancel edit</button>}
            </div>
          </form>
        </section>
      )}
      <section className="panel workspace-panel">
        <div className="panel-head workspace-list-head">
          <div><h2>Catalog</h2><p>{products.length} active product{products.length === 1 ? "" : "s"}</p></div>
          <label className="workspace-search"><span className="sr-only">Search products</span><input type="search" placeholder="Search SKU, name, category" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Reorder at</th>{canManage && <th>Action</th>}</tr></thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku}</td><td>{product.name}</td><td>{product.category || "—"}</td>
                  <td>{new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(product.priceMinor / currencyMinorUnitScale(currencyCode))}</td>
                  <td>{product.isStocked === 1 ? product.stock : "Not stocked"}</td><td>{product.isStocked === 1 ? product.reorderLevel : "—"}</td>
                  {canManage && <td><button className="workspace-link" type="button" onClick={() => startEditing(product)}>Edit</button></td>}
                </tr>
              ))}
              {!loading && visibleProducts.length === 0 && <tr><td className="workspace-empty" colSpan={canManage ? 7 : 6}>No products match this search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceFrame>
  );
}
