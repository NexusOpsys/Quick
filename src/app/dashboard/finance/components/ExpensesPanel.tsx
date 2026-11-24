"use client";

import { useState, type FormEvent } from "react";
import { currencyMinorUnitScale, formatMinorUnits } from "../../../../domain/sales";
import { requestJson } from "../../../../lib/api";
import type { DashboardResponse } from "../../types";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Payroll",
  "Supplies",
  "Transport",
  "Maintenance",
  "Other",
];

export function ExpensesPanel({
  expenses,
  currencyCode,
  timezone,
  onExpenseRecorded,
}: {
  expenses: NonNullable<DashboardResponse["expenses"]>;
  currencyCode: string;
  timezone: string;
  onExpenseRecorded: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const amountMinor = Number.isFinite(Number(amount))
    ? Math.round(Number(amount) * currencyMinorUnitScale(currencyCode))
    : 0;
  const validAmount = Number.isSafeInteger(amountMinor) && amountMinor > 0;

  async function recordExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !validAmount) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await requestJson("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ amountMinor, category, memo }),
      });
      setAmount("");
      setMemo("");
      setSuccess("Expense recorded.");
      onExpenseRecorded();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The expense could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="panel expense-panel">
      <div className="panel-head">
        <div><h2>Recorded expenses</h2><p>{expenses.summary.count.toLocaleString()} entries in the selected period</p></div>
        <strong className="expense-total">{formatMinorUnits(expenses.summary.amountMinor, currencyCode)}</strong>
      </div>
      <form className="expense-form" onSubmit={(event) => void recordExpense(event)}>
        <label>
          Amount ({currencyCode})
          <input
            type="number"
            min={1 / currencyMinorUnitScale(currencyCode)}
            step={1 / currencyMinorUnitScale(currencyCode)}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="expense-memo">
          Note
          <input
            value={memo}
            maxLength={300}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="Optional details"
          />
        </label>
        <button className="primary-btn" type="submit" disabled={submitting || !validAmount}>
          {submitting ? "Recording…" : "Record expense"}
        </button>
      </form>
      {error && <p className="expense-feedback error" role="alert">{error}</p>}
      {success && <p className="expense-feedback success" role="status">{success}</p>}
      {expenses.byCategory.length > 0 && (
        <ul className="expense-category-list">
          {expenses.byCategory.map((item) => (
            <li key={item.category}>
              <span>{item.category} <small>{item.count.toLocaleString()} entries</small></span>
              <strong>{formatMinorUnits(item.amountMinor, currencyCode)}</strong>
            </li>
          ))}
        </ul>
      )}
      <div className="expense-recent">
        <h3>Recent entries</h3>
        {expenses.recent.length ? (
          <ul>
            {expenses.recent.map((expense) => (
              <li key={expense.id}>
                <span>
                  <strong>{expense.category}</strong>
                  <small>{expense.memo || expense.recordedBy} · {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    timeZone: timezone,
                  }).format(new Date(expense.createdAt))}</small>
                </span>
                <strong>{formatMinorUnits(expense.amountMinor, currencyCode)}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="finance-empty">No expenses recorded in this period.</p>}
      </div>
    </article>
  );
}
