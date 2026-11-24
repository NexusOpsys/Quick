import type { ReactNode } from "react";

export default function WorkspaceFrame({
  title,
  description,
  loading,
  error,
  success,
  children,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string;
  success: string;
  children: ReactNode;
}) {
  return (
    <div className="page workspace-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BUSINESS WORKSPACE</p>
          <h1>{title}</h1>
          <p className="workspace-description">{description}</p>
        </div>
      </div>
      {loading && <p className="workspace-notice" role="status">Loading authorized business data…</p>}
      {error && <p className="workspace-notice workspace-error" role="alert">{error}</p>}
      {success && <p className="workspace-notice workspace-success" role="status">{success}</p>}
      {children}
    </div>
  );
}
