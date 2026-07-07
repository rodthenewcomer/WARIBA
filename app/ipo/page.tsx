import type { Metadata } from "next";
import { IPOS } from "@/lib/mock/ipos";
import { IPOCard } from "@/components/ipo/ipo-card";

export const metadata: Metadata = { title: "IPO & Opérations" };

export default function IPOPage() {
  const [featured, ...rest] = IPOS;

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          IPO & opérations sur capital
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Introductions, augmentations de capital, OPV, splits et emprunts —
          analysés avant de souscrire. Opérations simulées pour la démo.
        </p>
      </div>

      <IPOCard ipo={featured} featured />

      <div className="grid gap-3 lg:grid-cols-2">
        {rest.map((ipo) => (
          <IPOCard key={ipo.id} ipo={ipo} />
        ))}
      </div>
    </div>
  );
}
