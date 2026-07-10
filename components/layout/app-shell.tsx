"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Eye,
  FileText,
  Filter,
  Grid3X3,
  LayoutDashboard,
  Briefcase,
  CandlestickChart,
  Newspaper,
  Plus,
  ShieldCheck,
  X,
  Rocket,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LATEST_TRADING_DATE } from "@/lib/real-data";
import { dateFr } from "@/lib/format";
import { GlobalSearch, GlobalSearchDialog } from "./global-search";
import { MarketStatusBadge } from "./market-status-badge";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/map", label: "Carte du marché", icon: Grid3X3 },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/charts", label: "Graphiques", icon: CandlestickChart },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/portfolio", label: "Portefeuille", icon: Briefcase },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/ipo", label: "IPO & Opérations", icon: Rocket },
  { href: "/settings", label: "Réglages", icon: Settings },
] as const;

const MOBILE_NAV = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/map", label: "Carte", icon: Grid3X3 },
  { href: "/portfolio", label: "Portefeuille", icon: Briefcase },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
] as const;

/** Toutes les sections restantes, accessibles depuis le bouton « + » de
 * la barre mobile — avant lui, Screener, Graphiques, Alertes, IPO,
 * Documents, Actualités, Statut et Réglages étaient introuvables au
 * doigt (le 5e onglet menait directement aux Réglages). */
const MOBILE_MORE = [
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/charts", label: "Graphiques", icon: CandlestickChart },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/ipo", label: "IPO & Opérations", icon: Rocket },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/news", label: "Actualités", icon: Newspaper },
  { href: "/status", label: "Statut des données", icon: ShieldCheck },
  { href: "/settings", label: "Réglages", icon: Settings },
] as const;

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-gold text-sm font-black text-white shadow-lg shadow-accent/20">
        A
      </span>
      <span className="text-[15px] font-bold tracking-tight text-ink">
        Afri<span className="text-accent">Terminal</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface/50 backdrop-blur-xl lg:flex">
        <div className="px-4 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 text-[10px] leading-relaxed text-ink-3 border-t border-line">
          Cours, indices, dividendes, documents, alertes et opérations sur
          titres : sources officielles BRVM. Seuls les exemples pédagogiques
          d&apos;analyse (page IPO) sont simulés.
          <br />
          Ceci n&apos;est pas un conseil en investissement.
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-line bg-background/75 backdrop-blur-xl lg:pl-60">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden md:block flex-1 max-w-xs">
            <GlobalSearch trigger="bar" />
          </div>
          <div className="flex-1 md:hidden" />
          <div className="md:hidden">
            <GlobalSearch trigger="icon" />
          </div>
          <MarketStatusBadge />
          <Link
            href="/status"
            className="hidden whitespace-nowrap text-[11px] text-ink-3 hover:text-ink sm:inline"
            title="Dernière séance intégrée — cliquer pour le statut détaillé de chaque source de données"
          >
            Bulletin du {dateFr(LATEST_TRADING_DATE)}
          </Link>
          <Link
            href="/alerts"
            aria-label="Alertes"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-down" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <GlobalSearchDialog />

      {/* Contenu */}
      <main className="px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pl-[264px] xl:pr-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 backdrop-blur-xl lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-accent" : "text-ink-3"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Toutes les sections"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium cursor-pointer",
              MOBILE_MORE.some((m) => pathname.startsWith(m.href))
                ? "text-accent"
                : "text-ink-3"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15">
              <Plus className="h-3.5 w-3.5 text-accent" />
            </span>
            Plus
          </button>
        </div>
      </nav>

      {/* Feuille « toutes les sections » (mobile) */}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Toutes les sections">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl fade-in">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Toutes les sections</p>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MOBILE_MORE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-2/50 px-1 py-3 text-center text-[10px] font-medium leading-tight",
                    pathname.startsWith(href) ? "text-accent border-accent/30" : "text-ink-2"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
