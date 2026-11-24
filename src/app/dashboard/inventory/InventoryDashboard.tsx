"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { ApiError, isUnauthorizedError, requestJson } from "../../../lib/api";
import type { DashboardSession } from "../types";
import { WarehouseKpis } from "./components/WarehouseKpis";
import { StockInventoryTable } from "./components/StockInventoryTable";
import { StockMovementFeed } from "./components/StockMovementFeed";
import { StockAdjustmentForm } from "./components/StockAdjustmentForm";
import { StockCountForm } from "./components/StockCountForm";
import { StockCountHistory } from "./components/StockCountHistory";
import type { WarehouseInventory } from "./types";

type LoadState = "loading" | "ready" | "error" | "unauthorized" | "forbidden";

export default function WarehouseDashboard() {
  const [inventory, setInventory] = useState<WarehouseInventory | null>(null);
  const [status, setStatus] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError("");

    async function load() {
      try {
        const [session, warehouseInventory] = await Promise.all([
          requestJson<DashboardSession>("/api/auth/session", { signal: controller.signal }),
          requestJson<WarehouseInventory>("/api/inventory", { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        if (!session.company.setupComplete) {
          window.location.assign("/setup");
          return;
        }
        setInventory(warehouseInventory);
        setStatus("ready");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        if (isUnauthorizedError(loadError)) {
          setStatus("unauthorized");
          return;
        }
        if (loadError instanceof ApiError && loadError.status === 403) {
          setStatus("forbidden");
          setError(loadError.message);
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Warehouse data could not be loaded.");
        setStatus("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [reload]);

  if (!inventory) {
    const title = status === "loading"
      ? "Loading warehouse data…"
      : status === "unauthorized"
        ? "Sign in to view warehouse stock"
        : status === "forbidden"
          ? "Warehouse data isn't available to your role"
        : "Warehouse data is unavailable";
    const message = status === "loading"
      ? "Fetching stock for your assigned branch and warehouse."
      : status === "unauthorized"
        ? "Warehouse data is only available to an authenticated account."
        : status === "forbidden"
          ? error
        : error;
    return (
      <div className="page">
        <div className="warehouse-state-card" role={status === "loading" ? "status" : "alert"}>
          <div className="warehouse-state-icon">{status === "loading" ? <RefreshCw size={20} /> : <AlertCircle size={20} />}</div>
          <h1>{title}</h1>
          <p>{message}</p>
          {status === "unauthorized"
            ? <Link className="primary-btn" href="/login?returnTo=/warehouse">Go to sign in</Link>
            : status === "error"
              ? <button className="secondary-btn" type="button" onClick={() => setReload((value) => value + 1)}><RefreshCw size={15} /> Try again</button>
              : status === "forbidden"
                ? <Link className="primary-btn" href="/">Go to your dashboard</Link>
              : null}
        </div>
      </div>
    );
  }

  return (
    <div className="page warehouse-page">
      <div className="page-heading warehouse-heading">
        <div>
          <p className="eyebrow">{inventory.warehouse.name.toUpperCase()}</p>
          <h1>Warehouse management</h1>
          <p className="warehouse-subtitle">A live view of stock assigned to this warehouse.</p>
        </div>
        <div className="heading-actions">
          <button className="icon-btn" type="button" onClick={() => setReload((value) => value + 1)} aria-label="Refresh warehouse data" disabled={status === "loading"}>
            <RefreshCw size={16} />
          </button>
          <Link className="primary-btn" href="/pos"><ShoppingCart size={15} /> Open POS</Link>
        </div>
      </div>

      {status === "loading" && <p className="warehouse-refresh-status" role="status">Refreshing warehouse data…</p>}
      {status === "error" && (
        <div className="warehouse-refresh-error" role="alert">
          <span>{error}</span>
          <button className="secondary-btn" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>
        </div>
      )}

      <WarehouseKpis
        products={inventory.summary.products}
        totalUnits={inventory.summary.totalUnits}
        lowStock={inventory.summary.lowStock}
        outOfStock={inventory.summary.outOfStock}
      />

      <StockAdjustmentForm
        products={inventory.products}
        onAdjusted={() => setReload((value) => value + 1)}
      />
      <StockCountForm
        products={inventory.products}
        onCounted={() => setReload((value) => value + 1)}
      />

      <div className="warehouse-content-grid">
        <StockInventoryTable products={inventory.products} />
        <StockMovementFeed movements={inventory.recentMovements} timezone={inventory.timezone} />
        <StockCountHistory counts={inventory.recentCounts} timezone={inventory.timezone} />
      </div>
    </div>
  );
}
