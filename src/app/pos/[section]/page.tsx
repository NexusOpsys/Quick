import { notFound } from "next/navigation";
import PosSectionPage from "../components/PosSectionPage";

const sections = [
  "cashier",
  "shifts",
  "inventory",
  "purchasing",
  "finance",
  "reports",
  "settings",
] as const;

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function PosSectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const resolvedSection = sections.find((candidate) => candidate === section);
  if (!resolvedSection) notFound();
  return <PosSectionPage section={resolvedSection} />;
}
