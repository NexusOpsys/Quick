"use client";

import { useState, type FormEvent } from "react";
import { requestJson } from "../../../../lib/api";
import type { WarehouseInventory } from "../types";

export function StockCountForm({
  products,
  onCounted,
}: {
  products: WarehouseInventory["products"];
  onCounted: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [countedQuantity, setCountedQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const product = products.find((item) => item.id === productId);
  const count = Number(countedQuantity);
  const validCount = countedQuantity !== ""
    && Number.isSafeInteger(count)
    && count >= 0
    && count <= 1_000_000;

  async function submitCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !productId || !validCount) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await requestJson<{
        expectedQuantity: number;
        countedQuantity: number;
        quantityDelta: number;
      }>("/api/inventory/counts", {
        method: "POST",
        body: JSON.stringify({ productId, countedQuantity: count, reason }),
      });
      setCountedQuantity("");
      setReason("");
      const variance = result.quantityDelta === 0
        ? "No variance."
        : `Variance ${result.quantityDelta > 0 ? "+" : ""}${result.quantityDelta}.`;
      setSuccess(`Count posted. System quantity ${result.expectedQuantity}, counted ${result.countedQuantity}. ${variance}`);
      onCounted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The stock count could not be posted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="warehouse-panel stock-count-panel">
      <div className="warehouse-panel-heading">
        <div><h2>Record stock count</h2><p>Post a physical count and reconcile any variance.</p></div>
      </div>
      {products.length ? (
        <form className="stock-adjustment-form" onSubmit={(event) => void submitCount(event)}>
          <label>
            Product
            <select required value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">Select a stocked product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {item.sku} · {item.quantity} on hand</option>
              ))}
            </select>
          </label>
          <label>
            Physical quantity
            <input
              type="number"
              min="0"
              max="1000000"
              step="1"
              required
              value={countedQuantity}
              onChange={(event) => setCountedQuantity(event.target.value)}
              aria-describedby="stock-count-help"
            />
          </label>
          <p id="stock-count-help" className="stock-adjustment-help">
            {product ? `Current system quantity: ${product.quantity.toLocaleString()}.` : "Select a product to see its current system quantity."}
          </p>
          <label className="stock-adjustment-reason">
            Reason
            <input
              required
              minLength={3}
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example, cycle count"
            />
          </label>
          <button className="primary-btn" type="submit" disabled={submitting || !validCount || !productId}>
            {submitting ? "Posting…" : "Post count"}
          </button>
        </form>
      ) : (
        <p className="finance-empty">Create a stocked product before recording a count.</p>
      )}
      {error && <p className="stock-adjustment-feedback error" role="alert">{error}</p>}
      {success && <p className="stock-adjustment-feedback success" role="status">{success}</p>}
    </section>
  );
}
