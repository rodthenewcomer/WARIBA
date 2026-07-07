# AfriTerminal

Terminal de charting et d'analyse des actions africaines — MVP BRVM.
« La BRVM devient lisible » : charts, fondamentaux, dividendes, documents
officiels et signaux intelligents, sur données **simulées** (aucune API externe).

## Prérequis

- Node.js 20+ (testé sur v20.20.2)
- npm (le repo est verrouillé via `package-lock.json`)

## Lancer

```bash
npm install
npm run dev      # http://localhost:3000 — développement, hot reload
npm run build    # build de production (SSG des 15 fiches actions)
npm run start    # sert le build de production, après npm run build
```

Aucune variable d'environnement n'est requise : toutes les données sont
mockées dans `lib/mock/`.

## Stack

- Next.js 15.5 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
- lightweight-charts v5 (TradingView) pour le chart principal
- Sparklines SVG maison · Zustand (watchlist persistée) · next-themes

## Écart connu par rapport au brief initial

Le brief demandait shadcn/ui. Les primitives dans `components/ui/`
(`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `dialog.tsx`, `tabs.tsx`,
`skeleton.tsx`) sont **écrites à la main** avec le même rendu visuel et la
même API que shadcn (props, `cn()`, Tailwind), mais ne sont pas générées par
la CLI shadcn : pas de `components.json`, pas de dépendance Radix. À faire si
besoin de l'écosystème shadcn : `npx shadcn@latest init` puis remplacer ces
fichiers par les composants générés (les imports `@/components/ui/*`
resteraient inchangés).

Aucun linter n'est configuré (`npm run lint` n'existe pas) — seul `tsc
--noEmit` (via `next build`) vérifie les types. À ajouter avec
`npx eslint --init` si le projet grandit au-delà du MVP.

## Structure

```
app/                pages (dashboard, markets, stocks/[ticker], screener,
                    documents, watchlist, alerts, ipo, settings)
components/
  charts/           MainChart (bougies, ligne, aire, OHLC, Heikin Ashi,
                    volume, SMA/EMA/Bollinger, RSI, MACD, comparaison %,
                    ajustement dividendes), toolbar, sparkline
  stocks/           table, badges, scores, analyse IA, dividendes, secteur
  documents/        cartes + visionneuse modale (résumé IA, signaux)
  layout/           shell, sidebar, bottom nav, recherche ⌘K, statut BRVM
lib/
  mock/             15 sociétés BRVM, séries OHLCV déterministes (5 ans),
                    dividendes, documents, alertes, opérations
  signals.ts        moteur de signaux (bénéfice non durable, risque crédit,
                    payout > 90 %, volume anormal, sous-évaluation…)
  indicators.ts     SMA, EMA, RSI, MACD, Bollinger, Heikin Ashi, VWAP
```

## Sociétés couvertes (15)

`SNTS` Sonatel · `ORAC` Orange CI · `NSBC` NSIA Banque CI · `SGBC` SGCI ·
`SIBC` SIB · `BICC` BICICI · `CBIBF` Coris Bank · `BOAB` BOA Burkina ·
`ETIT` Ecobank ETI · `ONTBF` Onatel BF · `PALC` Palm CI · `SPHC` SAPH ·
`UNXC` Uniwax · `CIEC` CIE · `TTLC` TotalEnergies Marketing CI

## Brancher de vraies données plus tard

Toute la donnée passe par `lib/data.ts` (snapshots) et
`lib/mock/series.ts` (`getSeries`, `seriesForTimeframe`). Remplacer ces
deux modules par des appels API (Supabase / flux BRVM licencié) suffit —
les composants ne connaissent que les types de `lib/types.ts`.

## Avertissement

Données simulées, à but éducatif et démonstratif uniquement.
Ceci n'est pas un conseil en investissement.
