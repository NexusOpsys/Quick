import { CalendarDays, Menu } from "lucide-react";
import { displayName, todayLabel } from "./pos-format";
import type { PosSession } from "./types";

export function PosSectionHeader({
  session,
  title,
  navOpen,
  onMenuClick,
}: {
  session: PosSession;
  title: string;
  navOpen: boolean;
  onMenuClick: () => void;
}) {
  const initials = session.user.email.slice(0, 2).toUpperCase();

  return (
    <header className="pos-topbar">
      <button
        className="pos-mobile-nav-toggle"
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle POS navigation"
        aria-expanded={navOpen}
      >
        <Menu size={19} aria-hidden="true" />
      </button>
      <div className="pos-breadcrumb">
        Quick <span className="pos-breadcrumb-sep">/</span> POS <span className="pos-breadcrumb-sep">/</span> {title}
      </div>
      <div className="pos-top-actions">
        <span className="pos-pill"><CalendarDays size={13} /><span>{todayLabel(session.company.timezone)}</span></span>
        <span className="pos-pill pos-pill-accent">{session.company.currencyCode}</span>
        <div className="pos-profile">
          <div className="pos-avatar">{initials}</div>
          <div className="pos-profile-text"><strong>{displayName(session.user.email)}</strong><span>{session.user.role}</span></div>
        </div>
      </div>
    </header>
  );
}
