import { currencyMinorUnitScale, formatMinorUnits } from "../../../domain/sales";

export const CATEGORY_EMOJI: Record<string, string> = {
  "Beverages & Dairy": "🥛",
  Beverages: "🥤",
  "Packaged Foods": "🥣",
  Groceries: "🥣",
  "Personal Care": "🧴",
  Electronics: "📦",
};

export function money(amountMinor: number, currencyCode: string): string {
  return formatMinorUnits(amountMinor, currencyCode);
}

export function amountToMinor(value: string, currencyCode: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * currencyMinorUnitScale(currencyCode));
}

export function displayName(email: string): string {
  return email.split("@")[0].replace(/[._-]+/g, " ");
}

export function todayLabel(timezone: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date());
}
