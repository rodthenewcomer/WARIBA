import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarClock, CircleDollarSign, History, TrendingUp } from "lucide-react";
import { getSnapshots } from "@/lib/data";
import { allDividendEvents, dividendsByMonth, isRecurring } from "@/lib/dividend-calendar";
import { fcfa, dateFr } from "@wariba/core/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Term } from "@/components/ui/term";

export const metadata: Metadata = {
  title: "Calendrier des dividendes",
  description:
    "Saisonnalité réelle des dividendes BRVM : quels mois de l'année les sociétés cotées ont historiquement versé un dividende, et le journal complet des versements.",
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

/**
 * Pas de dates d'ex-dividende publiées par la BRVM dans un format
 * structuré — la seule vue « à venir » honnête est la saisonnalité :
 * ce que chaque société a versé, mois par mois, les années passées.
 * Jamais présenté comme une date certaine (voir bandeau + méthodologie).
 */
export default function DividendCalendarPage() {
  const snapshots = getSnapshots();
  const tickers = snapshots.filter((s) => s.real).map((s) => s.ticker);
  const nameOf = new Map(snapshots.map((s) => [s.ticker, s.name]));
  const byMonth = dividendsByMonth(tickers);
  const events = allDividendEvents(tickers);
  const dividendCompanies = new Set(events.map((event) => event.ticker)).size;
  const recurringCompanies = new Set(
    Object.values(byMonth).flat().filter(isRecurring).map((entry) => entry.ticker),
  ).size;
  const yieldLeaders = snapshots
    .filter((snapshot) => (
      snapshot.real?.netYieldPct != null
      && snapshot.real.netYieldPct > 0
      && snapshot.real.netYieldPct <= 25
      && snapshot.real.lastDividendNet != null
      && snapshot.real.lastDividendDate != null
    ))
    .sort((a, b) => (b.real?.netYieldPct ?? 0) - (a.real?.netYieldPct ?? 0))
    .slice(0, 8);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const orderedMonths = Array.from({ length: 12 }, (_, i) => ((currentMonth - 1 + i) % 12) + 1);
  const upNext = orderedMonths.slice(0, 3);
  const currentMonthRecurring = byMonth[currentMonth].filter(isRecurring).length;
  const latestPayment = events[0];

  return (
    <div className="stagger max-w-6xl space-y-5">
      <header className="border-b border-line pb-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
          <CircleDollarSign className="h-3.5 w-3.5" /> Données officielles BRVM
        </div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          <CalendarClock className="h-6 w-6 text-accent" /> Dividendes
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-3">
          La BRVM ne publie pas de date d&apos;ex-dividende à l&apos;avance dans
          un format exploitable : ceci n&apos;est donc pas un calendrier
          d&apos;annonces mais une{" "}
          <Term id="saisonnalite">saisonnalité</Term> — les mois où chaque société
          a réellement versé un dividende net par le passé.{" "}
          <strong className="text-ink-2">Récurrence n&apos;est pas garantie</strong>{" "}
          — chaque montant vient du dernier versement réel, pas d&apos;une
          prévision.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
          <div className="bg-surface p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-ink-3"><Building2 className="h-3.5 w-3.5" /> Sociétés payeuses</div>
            <p className="num mt-2 text-xl font-extrabold text-ink">{dividendCompanies}</p>
            <p className="mt-1 text-[10px] text-ink-3">au moins un versement enregistré</p>
          </div>
          <div className="bg-surface p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-ink-3"><History className="h-3.5 w-3.5" /> Récurrentes</div>
            <p className="num mt-2 text-xl font-extrabold text-ink">{recurringCompanies}</p>
            <p className="mt-1 text-[10px] text-ink-3">même mois observé au moins 2 ans</p>
          </div>
          <div className="bg-surface p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-ink-3"><CalendarClock className="h-3.5 w-3.5" /> Ce mois historique</div>
            <p className="num mt-2 text-xl font-extrabold text-ink">{currentMonthRecurring}</p>
            <p className="mt-1 text-[10px] text-ink-3">société{currentMonthRecurring > 1 ? "s" : ""} récurrente{currentMonthRecurring > 1 ? "s" : ""} en {MONTH_NAMES[currentMonth - 1].toLocaleLowerCase("fr")}</p>
          </div>
          <div className="bg-surface p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-ink-3"><CircleDollarSign className="h-3.5 w-3.5" /> Dernier paiement</div>
            <p className="num mt-2 text-lg font-extrabold text-ink">{latestPayment ? dateFr(latestPayment.date) : "—"}</p>
            <p className="mt-1 text-[10px] text-ink-3">{latestPayment ? `${latestPayment.ticker} · ${fcfa(latestPayment.net)} net/action` : "aucun paiement"}</p>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden border-accent/25">
        <CardHeader
          title="Rendements nets observés"
          subtitle="Dernier dividende net payé ÷ dernier cours disponible. Ce classement n'est ni une prévision ni une recommandation."
          action={<TrendingUp className="h-4 w-4 text-accent" />}
        />
        <CardBody className="p-0">
          <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {[yieldLeaders.slice(0, 4), yieldLeaders.slice(4, 8)].map((column, columnIndex) => (
              <div key={columnIndex} className="divide-y divide-line">
                {column.map((snapshot, index) => (
                  <Link
                    key={snapshot.ticker}
                    href={`/stocks/${snapshot.ticker}`}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5"
                  >
                    <span className="num text-[10px] font-bold text-ink-3">{String(columnIndex * 4 + index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-ink">{snapshot.ticker} <span className="font-normal text-ink-3">· {snapshot.name}</span></span>
                      <span className="mt-0.5 block text-[10px] text-ink-3">{fcfa(snapshot.real?.lastDividendNet ?? 0)} net · payé le {dateFr(snapshot.real?.lastDividendDate ?? "")}</span>
                    </span>
                    <span className="num rounded-lg bg-accent/10 px-2.5 py-1.5 text-sm font-extrabold text-accent">
                      {(snapshot.real?.netYieldPct ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <p className="border-t border-line px-4 py-2.5 text-[10px] leading-4 text-ink-3 sm:px-5">
            Le rendement varie avec le cours. Les montants, dates et cours de référence proviennent des dernières données intégrées ; les ratios atypiques supérieurs à 25 % sont exclus du classement et restent visibles sur leur fiche pour contrôle d&apos;une éventuelle opération exceptionnelle.
          </p>
        </CardBody>
      </Card>

      <section aria-labelledby="dividend-season-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="dividend-season-title" className="text-base font-bold text-ink">Fenêtre saisonnière</h2>
            <p className="mt-0.5 text-xs text-ink-3">Les 3 mois à partir du mois courant · sociétés récurrentes uniquement.</p>
          </div>
          <Badge tone="neutral">Historique, pas prévision</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
        {upNext.map((m) => {
          const entries = byMonth[m].filter(isRecurring);
          return (
            <Card key={m}>
              <CardHeader
                title={MONTH_NAMES[m - 1]}
                subtitle={
                  entries.length > 0
                    ? `${entries.length} société${entries.length > 1 ? "s" : ""} récurrente${entries.length > 1 ? "s" : ""}`
                    : "Aucun historique récurrent"
                }
              />
              <CardBody className="space-y-1.5">
                {entries.length === 0 ? (
                  <p className="text-xs text-ink-3">
                    Pas de versement observé au moins deux années sur ce mois.
                  </p>
                ) : (
                  entries.slice(0, 6).map((e) => (
                    <Link
                      key={e.ticker}
                      href={`/stocks/${e.ticker}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-surface-2"
                    >
                      <span className="min-w-0 truncate text-ink-2">
                        <span className="font-semibold text-ink">{e.ticker}</span>{" "}
                        <span className="text-ink-3">· {e.years.length} ans</span>
                      </span>
                      <span className="num shrink-0 font-medium text-ink">
                        {fcfa(e.lastNet)}
                      </span>
                    </Link>
                  ))
                )}
              </CardBody>
            </Card>
          );
        })}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Les 12 mois de l'année"
          subtitle="Toutes les sociétés ayant versé un dividende ce mois-ci au moins une fois depuis 2019 — badge doré si récurrent (≥ 2 années)."
        />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MONTH_NAMES.map((label, i) => {
            const m = i + 1;
            const entries = byMonth[m];
            if (entries.length === 0) return null;
            return (
              <div key={m} className="rounded-xl border border-line bg-surface-2/50 p-3">
                <p className="mb-1.5 text-xs font-semibold text-ink">{label}</p>
                <div className="flex flex-wrap gap-1">
                  {entries.map((e) => (
                    <Link key={e.ticker} href={`/stocks/${e.ticker}`}>
                      <Badge tone={isRecurring(e) ? "gold" : "neutral"}>
                        {e.ticker}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Journal des versements"
          subtitle={`${events.length} versements réels enregistrés, du plus récent au plus ancien.`}
        />
        <CardBody className="max-h-[28rem] overflow-y-auto p-0">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-2 text-left sm:px-5">Société</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right sm:px-5">Net / action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={`${e.ticker}-${e.date}-${i}`} className="border-t border-line/60">
                  <td className="px-4 py-2 sm:px-5">
                    <Link href={`/stocks/${e.ticker}`} className="font-medium text-ink hover:text-accent">
                      {e.ticker}
                    </Link>
                    <span className="ml-1.5 hidden text-ink-3 sm:inline">
                      {nameOf.get(e.ticker)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{dateFr(e.date)}</td>
                  <td className="num px-4 py-2 text-right font-medium text-ink sm:px-5">
                    {fcfa(e.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <p className="text-[10px] text-ink-3">
        Montants nets par action, après IRVM 10 % — issus des bulletins
        officiels BRVM. Pour vos titres détenus, voir la projection de revenu
        dans{" "}
        <Link href="/portfolio" className="underline hover:text-ink">
          Portefeuille
        </Link>
        . Détail des sources :{" "}
        <Link href="/methodologie" className="underline hover:text-ink">
          méthodologie
        </Link>
        .
      </p>
    </div>
  );
}
