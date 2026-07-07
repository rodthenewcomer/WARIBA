"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DOCUMENTS } from "@/lib/mock/documents";
import type { DocItem, DocType } from "@/lib/types";
import { STOCK_MAP } from "@/lib/mock/stocks";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";

const TYPES: DocType[] = [
  "Résultats",
  "États financiers",
  "Dividende",
  "AGO",
  "IPO",
  "Communiqué",
];

export default function DocumentsPage() {
  const [type, setType] = useState<DocType | null>(null);
  const [query, setQuery] = useState("");
  const [openDoc, setOpenDoc] = useState<DocItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...DOCUMENTS]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((d) => {
        if (type && d.type !== type) return false;
        if (!q) return true;
        const stock = STOCK_MAP.get(d.ticker);
        return (
          d.title.toLowerCase().includes(q) ||
          d.ticker.toLowerCase().includes(q) ||
          (stock?.name.toLowerCase().includes(q) ?? false)
        );
      });
  }, [type, query]);

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Documents</h1>
        <p className="mt-1 text-sm text-ink-3">
          Les documents officiels, transformés en signaux simples.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par société ou ticker…"
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setType(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer",
              type === null
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
            )}
          >
            Tous
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(type === t ? null : t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap cursor-pointer",
                type === t
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-glass p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucun document</p>
          <p className="mt-1 text-xs text-ink-3">
            Modifiez la recherche ou le filtre de type.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <DocumentCard key={d.id} doc={d} onOpen={setOpenDoc} />
          ))}
        </div>
      )}

      <DocumentViewerModal doc={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  );
}
