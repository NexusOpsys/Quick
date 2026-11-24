"use client";

import { useState, type FormEvent } from "react";
import { requestJson } from "../../../../lib/api";
import type { WarehouseInventory } from "../types";

export function StockAdjustmentForm({
  products,
  onAdjusted,
}: {
  products: WarehouseInventory["products"];
  onAdjusted: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const delta = Number(quantityDelta);
  const validDelta = Number.isSafeInteger(delta) && delta !== 0;

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !validDelta || !productId) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await requestJson<{ quantity: number }>("/api/inventory/adjustments", {
        method: "POST",
        body: JSON.stringify({ productId, quantityDelta: delta, reason }),
      });
      setQuantityDelta("");
      setReason("");
      setSuccess(`Stock updated. New on-hand quantity: ${result.quantity.toLocaleString()}.`);
      onAdjusted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The stock adjustment could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="warehouse-panel stock-adjustment-panel">
      <div className="warehouse-panel-heading">
        <div><h2>Adjust stock</h2><p>Record a reasoned correction to the assigned warehouse balance.</p></div>
      </div>
      {products.length ? (
        <form className="stock-adjustment-form" onSubmit={(event) => void submitAdjustment(event)}>
          <label>
            Product
            <select required value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">Select a stocked product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} · {product.sku} · {product.quantity} on hand</option>
              ))}
            </select>
          </label>
          <label>
            Quantity change
            <input
              type="number"
              step="1"
              min="-1000000"
              max="1000000"
              required
              value={quantityDelta}
              onChange={(event) => setQuantityDelta(event.target.value)}
              aria-describedby="stock-adjustment-help"
            />
          </label>
          <label className="stock-adjustment-reason">
            Reason
            <input
              required
              minLength={3}
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example, damaged stock or recount"
            />
          </label>
          <button className="primary-btn" type="submit" disabled={submitting || !validDelta || !productId}>
            {submitting ? "Saving…" : "Save adjustment"}
          </button>
          <p id="stock-adjustment-help" className="stock-adjustment-help">Use a positive number to add stock or a negative number to remove stock.</p>
        </form>
      ) : (
        <p className="finance-empty">Create a stocked product before making adjustments.</p>
      )}
      {error && <p className="stock-adjustment-feedback error" role="alert">{error}</p>}
      {success && <p className="stock-adjustment-feedback success" role="status">{success}</p>}
    </section>
  );
}
