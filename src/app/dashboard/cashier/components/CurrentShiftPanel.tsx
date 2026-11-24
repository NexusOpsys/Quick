"use client";

import { useEffect, useState, type FormEvent } from "react";
import { currencyMinorUnitScale, formatMinorUnits } from "../../../../domain/sales";
import { requestJson } from "../../../../lib/api";

type ShiftMovement = {
  id: string;
  movementType: "cash_in" | "cash_out";
  amountMinor: number;
  reason: string;
  createdAt: string;
};

type CurrentShift = {
  id: string;
  openingCashMinor: number;
  openedAt: string;
  cashSalesMinor: number;
  cashInMinor: number;
  cashOutMinor: number;
  expectedCashMinor: number;
  movements: ShiftMovement[];
};

type ShiftResponse = { currentShift: CurrentShift | null };
type ClosedShift = { expectedCashMinor: number; countedCashMinor: number; varianceMinor: number };
type LoadState = "loading" | "ready" | "error";
type CashMovementType = "cash_in" | "cash_out";

function minorAmount(value: string, currencyCode: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * currencyMinorUnitScale(currencyCode));
}

export function CurrentShiftPanel({
  paymentCount,
  currencyCode,
  timezone,
  canOperateShift,
}: {
  paymentCount: number;
  currencyCode: string;
  timezone: string;
  canOperateShift: boolean;
}) {
  const [currentShift, setCurrentShift] = useState<CurrentShift | null>(null);
  const [closedShift, setClosedShift] = useState<ClosedShift | null>(null);
  const [status, setStatus] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [amount, setAmount] = useState("");
  const [movementType, setMovementType] = useState<CashMovementType>("cash_in");
  const [reason, setReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reload, setReload] = useState(0);
  const scale = currencyMinorUnitScale(currencyCode);
  const amountMinor = minorAmount(amount, currencyCode);
  const countedCashMinor = minorAmount(countedCash, currencyCode);

  useEffect(() => {
    const controller = new AbortController();
    if (!canOperateShift) {
      setCurrentShift(null);
      setStatus("ready");
      setError("");
      return () => controller.abort();
    }
    setStatus("loading");
    setError("");
    requestJson<ShiftResponse>("/api/shifts/current", { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setCurrentShift(response.currentShift);
        setStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Shift data could not be loaded.");
        setStatus("error");
      });
    return () => controller.abort();
  }, [canOperateShift, reload]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setFeedback("");
    try {
      await requestJson(endpoint, { method: "POST", body: JSON.stringify(body) });
      setFeedback(successMessage);
      setAmount("");
      setReason("");
      setReload((value) => value + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The shift action could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function closeShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setFeedback("");
    try {
      const result = await requestJson<ClosedShift>("/api/shifts/close", {
        method: "POST",
        body: JSON.stringify({ countedCashMinor }),
      });
      setClosedShift(result);
      setCountedCash("");
      setFeedback("Shift closed and cash variance recorded.");
      setReload((value) => value + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The shift could not be closed.");
    } finally {
      setSubmitting(false);
    }
  }

  const amountStep = String(1 / scale);

  return (
    <article className="panel cashier-shift-panel">
      <div className="panel-head"><div><h2>{canOperateShift ? "Current shift" : "Cashier shift access"}</h2><p>Cash opening, movement, and closing reconciliation</p></div></div>
      {!canOperateShift ? (
        <div className="cashier-shift-state" role="status">
          <strong>Read-only dashboard view</strong>
          <p>Shift actions are available to owner and cashier accounts.</p>
        </div>
      ) : status === "loading" ? (
        <p className="cashier-shift-state" role="status">Loading shift status…</p>
      ) : status === "error" ? (
        <div className="cashier-shift-state" role="alert">
          <strong>Shift data is unavailable</strong>
          <p>{error}</p>
          <button type="button" className="secondary-btn" onClick={() => setReload((value) => value + 1)}>Try again</button>
        </div>
      ) : currentShift ? (
        <div className="cashier-shift-active">
          <div className="cashier-shift-summary">
            <span className="shift-state-indicator" />
            <strong>Shift open</strong>
            <time dateTime={currentShift.openedAt}>
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(currentShift.openedAt))}
            </time>
          </div>
          <dl className="cashier-shift-totals">
            <div><dt>Opening cash</dt><dd>{formatMinorUnits(currentShift.openingCashMinor, currencyCode)}</dd></div>
            <div><dt>Cash sales</dt><dd>{formatMinorUnits(currentShift.cashSalesMinor, currencyCode)}</dd></div>
            <div><dt>Cash in / out</dt><dd>{formatMinorUnits(currentShift.cashInMinor - currentShift.cashOutMinor, currencyCode)}</dd></div>
            <div><dt>Expected cash</dt><dd>{formatMinorUnits(currentShift.expectedCashMinor, currencyCode)}</dd></div>
          </dl>
          <form className="shift-action-form" onSubmit={(event) => void submit(
            event,
            "/api/shifts/movements",
            { movementType, amountMinor, reason },
            "Cash movement recorded.",
          )}>
            <label>
              Movement
              <select value={movementType} onChange={(event) => {
                if (event.target.value === "cash_in" || event.target.value === "cash_out") {
                  setMovementType(event.target.value);
                }
              }}>
                <option value="cash_in">Cash in</option>
                <option value="cash_out">Cash out</option>
              </select>
            </label>
            <label>
              Amount ({currencyCode})
              <input type="number" min={1 / scale} step={amountStep} value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </label>
            <label className="shift-reason">
              Reason
              <input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={200} required />
            </label>
            <button type="submit" className="secondary-btn" disabled={submitting || amountMinor <= 0}>
              Record movement
            </button>
          </form>
          <form className="shift-close-form" onSubmit={(event) => void closeShift(event)}>
            <label>
              Counted cash ({currencyCode})
              <input type="number" min="0" step={amountStep} value={countedCash} onChange={(event) => setCountedCash(event.target.value)} required />
            </label>
            <button type="submit" className="primary-btn" disabled={submitting || countedCash === ""}>
              {submitting ? "Closing…" : "Close shift"}
            </button>
          </form>
          {currentShift.movements.length > 0 && (
            <ul className="shift-movement-list">
              {currentShift.movements.map((movement) => (
                <li key={movement.id}>
                  <span>{movement.movementType === "cash_in" ? "Cash in" : "Cash out"} · {movement.reason}</span>
                  <strong>{movement.movementType === "cash_in" ? "+" : "-"}{formatMinorUnits(movement.amountMinor, currencyCode)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form className="shift-open-form" onSubmit={(event) => void submit(
          event,
          "/api/shifts/open",
          { openingCashMinor: amountMinor },
          "Shift opened. You can now use the POS register.",
        )}>
          <p>No shift is open. Record opening cash to track POS sales and reconcile cash.</p>
          <label>
            Opening cash ({currencyCode})
            <input type="number" min="0" step={amountStep} value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
          <button type="submit" className="primary-btn" disabled={submitting || !Number.isSafeInteger(amountMinor)}>
            {submitting ? "Opening…" : "Open shift"}
          </button>
        </form>
      )}
      {error && status !== "error" && <p className="shift-feedback error" role="alert">{error}</p>}
      {feedback && <p className="shift-feedback success" role="status">{feedback}</p>}
      {closedShift && !currentShift && (
        <div className="shift-closed-summary" role="status">
          <strong>Last shift closed</strong>
          <span>Expected {formatMinorUnits(closedShift.expectedCashMinor, currencyCode)} · counted {formatMinorUnits(closedShift.countedCashMinor, currencyCode)} · variance {formatMinorUnits(closedShift.varianceMinor, currencyCode)}</span>
        </div>
      )}
      <div className="cashier-payment-summary">
        <span>Payment records this period</span>
        <strong>{paymentCount.toLocaleString()}</strong>
      </div>
    </article>
  );
}
