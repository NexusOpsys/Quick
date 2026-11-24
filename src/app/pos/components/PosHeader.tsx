import { Bell, CalendarDays, Menu, RefreshCw, Search } from "lucide-react";
import { displayName, todayLabel } from "./pos-format";
import type { PosSession } from "./types";

type PosHeaderProps = {
  session: PosSession;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  navOpen: boolean;
  onMenuClick: () => void;
};

export function PosHeader({ session, search, onSearchChange, onRefresh, navOpen, onMenuClick }: PosHeaderProps) {
  const initials = session.user.email.slice(0, 2).toUpperCase();
  return (
    <header className="pos-topbar">
      <button className="pos-mobile-nav-toggle" type="button" onClick={onMenuClick} aria-label="Toggle POS navigation" aria-expanded={navOpen}>
        <Menu size={19} aria-hidden="true" />
      </button>
      <div className="pos-breadcrumb">Quick <span className="pos-breadcrumb-sep">/</span> Point of Sale</div>
      <div className="pos-search">
        <Search size={15} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search SKU / item name..." aria-label="Search products" />
        <kbd>⌘K</kbd>
      </div>
      <div className="pos-top-actions">
        <span className="pos-pill"><CalendarDays size={13} /><span>{todayLabel(session.company.timezone)}</span></span>
        <span className="pos-pill pos-pill-accent">{session.company.currencyCode}</span>
        <button className="pos-icon-btn" type="button" aria-label="Refresh catalog" onClick={onRefresh}><RefreshCw size={15} /></button>
        <button className="pos-icon-btn" type="button" aria-label="Notifications"><Bell size={17} /></button>
        <div className="pos-profile">
          <div className="pos-avatar">{initials}</div>
          <div className="pos-profile-text"><strong>{displayName(session.user.email)}</strong><span>{session.user.role}</span></div>
        </div>
      </div>
    </header>
  );
}
