const COVERAGE = [
  { label: "POS revenue & payment allocations", status: "Available", available: true },
  { label: "Operating expenses", status: "Available", available: true },
  { label: "Budgets & bank reconciliation", status: "Not available", available: false },
  { label: "Accounts receivable & payable", status: "Not available", available: false },
  { label: "General ledger & statements", status: "Not available", available: false },
];

export function FinancialCoveragePanel() {
  return (
    <article className="panel finance-coverage-panel">
      <div className="panel-head">
        <div><h2>Financial data coverage</h2><p>Unsupported metrics are intentionally not estimated.</p></div>
      </div>
      <ul className="finance-coverage-list">
        {COVERAGE.map(({ label, status, available }) => (
          <li key={label}>
            <span className={`coverage-dot ${available ? "recorded" : "unavailable"}`} />
            {label}
            <strong>{status}</strong>
          </li>
        ))}
      </ul>
    </article>
  );
}
