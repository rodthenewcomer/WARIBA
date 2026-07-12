# AfriTerminal Mobile — plan Expo (iOS/Android)

Statut : **planifié, non démarré**. Ce document sert de référence avant
d'ouvrir le chantier — architecture, choix techniques, périmètre par
écran, risques. Le site web (ce dépôt, Next.js, GitHub Pages) n'est
**pas remplacé** : il continue de vivre à l'identique, en parallèle.

## Contraintes fixées par le produit

1. **Niveau de finition « 2026, outstanding »** — pas un wrapper qui a
   l'air d'un site web dans une coquille. Interactions natives
   (haptics, gestes, transitions), et la même identité visuelle que le
   site (palette sombre `#09090b`/`#111113`/`#18181b`, accent ambre
   `#e2a63d`, vert/rouge `#22c55e`/`#ef4444`, violet `#8b5cf6` pour
   MACD/opérations, or pour dividendes).
2. **Charts 100 % natifs** — pas de WebView autour de
   `lightweight-charts`. Le moteur de rendu du graphique est réécrit
   nativement. C'est le lot le plus coûteux du projet (voir plus bas).

## Architecture — monorepo, pas un nouveau dépôt

```
apps/
  web/         ce dépôt actuel (Next.js), inchangé fonctionnellement
  mobile/      nouvelle app Expo (iOS + Android)
packages/
  core/        lib/ + hooks/ + data/ + types déplacés ici une seule fois,
               importés par web ET mobile — une seule source de vérité
               pour les calculs (PRU, volatilité, bêta, indicateurs...)
```

**Ce qui migre vers `packages/core` quasiment sans modification**
(fonctions pures, zéro DOM) : `lib/portfolio.ts`, `lib/risk.ts`,
`lib/indicators.ts`, `lib/dividend-calendar.ts`, `lib/format.ts`,
`lib/glossary.ts`, `lib/company-profiles.ts`, `lib/types.ts`,
`lib/real-*.ts`, et tous les `data/real/*.json` (servis depuis le site
GitHub Pages déjà public — pas de nouveau backend à créer).

**Ce qui migre avec un adaptateur mineur** : les stores zustand
(`hooks/use-watchlist.ts`, `use-portfolio.ts`, `use-price-alerts.ts`,
`use-chart-levels.ts`, `use-chart-layouts.ts`, `use-saved-filters.ts`)
— même logique, seul le moteur de stockage change (`localStorage` →
`AsyncStorage`/`expo-secure-store`). Le pattern d'hydratation
(`skipHydration` + `rehydrate()` + `hasHydrated()`) déjà en place ne
change pas.

**Ce qui se reconstruit entièrement** : tous les composants React
(`components/*`) — écrits en JSX/Tailwind, incompatibles avec React
Native. Reconstruction avec les primitives RN (`View`, `Text`,
`Pressable`, `ScrollView`), en gardant NativeWind (Tailwind pour RN) pour
réutiliser les mêmes tokens de couleur et éviter de réinventer un
design system.

## Le moteur de graphique — le vrai chantier

Le chart actuel (`components/charts/main-chart.tsx`, moteur v3.1) fait
déjà beaucoup : 6 types de rendu (chandelles, ligne, aire, baseline,
barres, heikin-ashi), 10 indicateurs avec sous-panneaux (RSI, MACD, ATR,
Stochastique en pane séparé ; SMA/EMA/VWAP/Bollinger en overlay),
marqueurs d'événements (dividendes, opérations sur capital), échelle
logarithmique, comparaison en %, lignes de référence (clôture veille,
extrêmes 52 semaines), outil de niveaux (tap pour poser/retirer), export
PNG, raccourcis clavier.

**Bonne nouvelle** : tout le calcul (`lib/indicators.ts` — SMA, EMA,
RSI, MACD, ATR, Stochastique, VWAP, Bollinger, tous purs et testés) migre
tel quel dans `packages/core`. Ce qui doit être réécrit, c'est
uniquement le **rendu** — dessiner les chandelles, gérer le pan/zoom
tactile, les marqueurs, les sous-panneaux.

**Moteur retenu : `@shopify/react-native-skia`** + `react-native-gesture-handler`
+ `react-native-reanimated`. C'est la stack qui permet un rendu GPU
personnalisable (seul moyen d'atteindre la qualité TradingView en natif
pur) et qui a l'écosystème le plus mature pour ce niveau d'exigence en
2026. Alternative écartée : les libs de charts RN existantes
(`react-native-wagmi-charts`, Victory Native) couvrent la chandelle/ligne
basique mais aucune ne gère nativement les sous-panneaux multiples
(RSI + MACD + prix empilés) ni l'outil de niveaux — il aurait fallu les
détourner autant que de partir de Skia directement.

**Risque principal du projet** : ce moteur est un morceau d'ingénierie à
part entière (essentiellement reconstruire une partie de
`lightweight-charts` en Skia). Recommandation : commencer par un
**spike d'1 semaine** (chandelles + pan/zoom + un seul indicateur en
overlay) avant de committer sur le planning complet, pour vérifier la
faisabilité et la fluidité sur device réel (pas seulement simulateur)
avant d'investir les semaines suivantes.

## Feuille de route (réestimée avec le chart natif)

| Phase | Contenu | Estimation |
|---|---|---|
| 0 | Monorepo : extraction de `packages/core`, sans toucher au comportement du site web | 3-4 jours |
| 1 | Spike chart Skia (chandelles, pan/zoom, 1 overlay) — go/no-go | 1 semaine |
| 2 | Squelette Expo (navigation, thème, design tokens NativeWind) + écrans Accueil/Watchlist/Alertes | 1,5-2 semaines |
| 3 | Chart natif complet (types, 10 indicateurs, marqueurs, niveaux, log/comparaison) | 3-4 semaines |
| 4 | Fiche action, Portefeuille, Screener, Documents/Actus, Réglages | 2 semaines |
| 5 | Notifications push (alertes de prix — la vraie raison d'être natif), icônes, splash, soumission stores | 1 semaine |

**Total : ~9-11 semaines** pour une v1 complète et soumissible, contre
~5-6 semaines si le chart avait été en WebView. Le delta (~4-5 semaines)
est le prix du rendu 100 % natif demandé.

## Ce qui ne change pas

- Le site web (`apps/web` après migration) garde son pipeline de données
  (`scripts/boc/`, GitHub Actions), son export statique, son déploiement
  GitHub Pages — rien de ce document n'affecte son fonctionnement actuel.
- Aucune donnée n'est dupliquée : l'app mobile consomme les mêmes JSON
  publics déjà générés pour le site.

## Statut

- ✅ **Phase 0 — terminée** (commit `7d4bda1`). `packages/core` extrait,
  ~70 imports migrés, site web vérifié inchangé (tsc, 81 tests vitest,
  63 tests Python, build statique, CI + deploy GitHub Actions verts).
- ✅ **Phase 1 (spike) — code écrit et type-vérifié, rendu non confirmé
  visuellement.** Détail ci-dessous.

## Résultat du spike (Phase 1)

`apps/mobile` : app Expo SDK 57 + TypeScript, dépend de
`@afriterminal/core` en workspace. Composant `CandleChart`
(`apps/mobile/src/components/CandleChart.tsx`) : chandelles construites
en `SkPath` via `useDerivedValue` (recalcul réactif sur `translateX`/
`scale`, thread UI), pan + pinch-zoom via `Gesture.Pan`/`Gesture.Pinch`
(react-native-gesture-handler), double-tap pour recadrer, overlay SMA 20
calculé par `@afriterminal/core/indicators` sur 180 séances réelles
SNTS (`data/real/series/SNTS.json`).

**Ce qui est vérifié :** le code type-check intégralement contre les
vraies définitions TypeScript des packages installés (`@shopify/
react-native-skia@2.6.2`, `react-native-gesture-handler`, `react-native-
reanimated@4.5.0`) — signal fort que l'API utilisée (Path/Canvas/
Gesture/useDerivedValue) est correcte pour ces versions.

**Ce qui n'est PAS vérifié — limite d'environnement, pas du code
métier :** cette machine n'a ni Simulateur iOS (Xcode incomplet, pas de
`simctl`) ni émulateur Android. La voie de repli — l'aperçu web d'Expo
(`expo start --web`, react-native-skia y dessine via CanvasKit/WASM) —
bute sur un problème d'initialisation : le singleton `Skia` de la
librairie semble se construire avant que `LoadSkiaWeb()`/`WithSkiaWeb`
n'aient fini de charger le WASM (`Skia.Path.Make()` échoue avec
`Cannot read properties of undefined (reading 'PathBuilder')`), cohérent
avec un bundle Metro web qui n'effectue pas de vrai découpage
asynchrone par défaut dans cette config. Aucune des deux méthodes
documentées par Shopify (code-splitting `WithSkiaWeb`, enregistrement
différé `LoadSkiaWeb` + entrée `index.web.ts`) n'a résolu le problème
après investigation ciblée ; approfondir demanderait de creuser la
config Metro/`web.output` — non prioritaire puisque **le natif n'a pas
du tout ce problème** (Skia y est compilé dans le binaire, pas chargé en
WASM à l'exécution). Le code du spike a été laissé propre (pas
d'artefacts web cassés committés) plutôt que de garder un faux-semblant
qui donnerait l'impression que l'aperçu web fonctionne.

## Prochaine étape concrète

Le go/no-go réel de la Phase 1 (fluidité du pan/pinch-zoom, rendu
correct des chandelles) ne peut être tranché que sur un vrai
Simulateur iOS / émulateur Android / device physique — à faire sur une
machine qui en dispose (`cd apps/mobile && npx expo start`, puis `i`
pour iOS ou `a` pour Android, ou scanner le QR code avec Expo Go). Si
le rendu et les gestes sont concluants : passer en Phase 2 (squelette
de navigation + écrans). Sinon, ce spike aura coûté une fraction de la
Phase 3 complète — exactement ce pour quoi il a été fait.
