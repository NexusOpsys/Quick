import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function DashboardLoadState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="page">
      <div className="module-placeholder">
        <div className="placeholder-icon"><AlertCircle aria-hidden="true" /></div>
        <h2>{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </div>
  );
}
