import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, ExternalLink, LockKeyhole, Rocket, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Lancement iOS & Android — Côte d’Ivoire" };

const stages = [
  {
    id: "legal",
    title: "1. Dossier légal unique",
    owner: "Direction WARIBA",
    items: ["Raison sociale, RCCM/TIN et adresse strictement identiques", "D‑U‑N‑S à 9 chiffres", "Domaine wariba.app et téléphone professionnel vérifiés", "developer@, support@ et legal@wariba.app", "Deux administrateurs avec MFA"],
  },
  {
    id: "stores",
    title: "2. Comptes Apple et Google",
    owner: "Account Holder",
    items: ["Apple Developer Organization — 99 USD/an", "Google Play Organization — 25 USD une fois", "Identité de l’organisation validée dans les deux consoles", "Apps créées avec app.wariba.mobile", "Confidentialité, support et suppression de compte accessibles"],
  },
  {
    id: "eas",
    title: "3. Expo Organization et EAS",
    owner: "Équipe technique",
    items: ["Organisation Expo détenue par WARIBA", "eas login puis eas init depuis apps/mobile", "UUID placé dans EXPO_PUBLIC_EAS_PROJECT_ID", "Certificats iOS et keystore Android gérés par EAS", "Aucun credential ajouté à Git"],
  },
  {
    id: "billing",
    title: "4. Monétisation après le lancement",
    owner: "Produit + Finance",
    items: ["Paid Apps Agreement, fiscalité et banque Apple", "Profil Google Payments et compte marchand", "Produits Apple et Google + prix Côte d’Ivoire", "RevenueCat : entitlement pro et offering Current", "Webhook vers /api/webhooks/revenuecat", "Achats, restauration, annulation et remboursement validés"],
  },
  {
    id: "builds",
    title: "5. Builds signés et tests réels",
    owner: "QA mobile",
    items: ["Build preview sur iPhone et Android physiques", "Réseau mobile ivoirien, clair/sombre et accessibilité", "Pro accessible sans compte ni entitlement", "Connexion, synchronisation, hors-ligne et reprise", "TestFlight et Play Internal Testing validés"],
  },
  {
    id: "review",
    title: "6. Fiches stores et soumission",
    owner: "Produit + Juridique",
    items: ["App Privacy et Data safety cohérents avec le code", "Financial features : suivi de portefeuille, aucun ordre exécuté", "URL de suppression de compte publique", "Captures françaises sur données réelles", "Compte reviewer, notes de review et validation juridique"],
  },
] as const;

const commands = `cd apps/mobile
eas login
eas whoami
eas init
eas project:info

eas build --platform all --profile preview
eas build --platform all --profile production
eas submit --platform ios --profile production
eas submit --platform android --profile production`;

export default function LaunchPage() {
  return (
    <div className="space-y-5 stagger">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <Badge tone="gold">Guide propriétaire · Côte d’Ivoire</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">Mettre WARIBA sur l’App Store et Google Play</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-2">Le code mobile est prêt. La publication gratuite reste bloquée par les comptes propriétaires, les builds signés et les preuves sur appareils physiques. Suivez cet ordre : dossier légal, Apple/Google, Expo/EAS, tests puis soumission. RevenueCat et les paiements sont volontairement différés après le lancement.</p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/8 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><CheckCircle2 className="h-4 w-4 text-up" /> Déjà prêt dans le dépôt</p>
            <p className="mt-2 text-xs leading-5 text-ink-2">Expo SDK 54, app.wariba.mobile, schéma wariba://, achats/restauration RevenueCat, webhooks, environnements EAS, suppression de compte et exports iOS/Android locaux.</p>
          </div>
        </div>
        <div className="grid border-t border-line sm:grid-cols-3">
          <div className="border-b border-line px-5 py-4 sm:border-b-0 sm:border-r"><p className="text-[10px] uppercase tracking-[0.12em] text-ink-3">Production web</p><p className="mt-1 text-sm font-semibold text-ink">Vercel · wariba.app</p></div>
          <div className="border-b border-line px-5 py-4 sm:border-b-0 sm:border-r"><p className="text-[10px] uppercase tracking-[0.12em] text-ink-3">Identité native</p><p className="mt-1 font-mono text-sm font-semibold text-ink">app.wariba.mobile</p></div>
          <div className="px-5 py-4"><p className="text-[10px] uppercase tracking-[0.12em] text-ink-3">État publication gratuite</p><p className="mt-1 text-sm font-semibold text-warn">NO-GO comptes/builds</p></div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Étapes de lancement">
        {stages.map((stage) => (
          <article key={stage.id} id={stage.id} className="scroll-mt-20 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-semibold text-ink">{stage.title}</h2><p className="mt-1 text-[11px] text-ink-3">Responsable : {stage.owner}</p></div>
              <Badge tone={stage.id === "billing" ? "neutral" : "warning"}><CircleDashed className="h-3 w-3" /> {stage.id === "billing" ? "Après lancement" : "Externe"}</Badge>
            </div>
            <ul className="mt-4 space-y-2.5">
              {stage.items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-ink-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{item}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Rocket className="h-4 w-4 text-accent" /> Commandes EAS, dans l’ordre</h2>
          <p className="mt-2 text-xs leading-5 text-ink-3">Ne les exécutez qu’après création de l’organisation Expo et accès aux comptes stores. Les valeurs secrètes restent dans EAS/Vercel, jamais dans Git.</p>
          <pre className="mt-4 max-w-full overflow-x-auto rounded-xl bg-[#09090b] p-4 text-[11px] leading-5 text-zinc-200"><code>{commands}</code></pre>
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><LockKeyhole className="h-4 w-4 text-accent" /> Variables à placer</h2>
          <div className="mt-4 space-y-4 text-xs leading-5 text-ink-2">
            <div><p className="font-semibold text-ink">Lancement gratuit — EAS</p><p className="mt-1 break-all font-mono text-[11px] text-ink-3">EXPO_PUBLIC_API_URL<br />EXPO_PUBLIC_SUPABASE_URL<br />EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY<br />EXPO_PUBLIC_EAS_PROJECT_ID<br />EXPO_ACCESS_TOKEN</p></div>
            <div><p className="font-semibold text-ink">Après lancement — monétisation</p><p className="mt-1 break-all font-mono text-[11px] text-ink-3">EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY<br />EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY<br />REVENUECAT_SECRET_API_KEY<br />REVENUECAT_ENTITLEMENT_ID<br />REVENUECAT_WEBHOOK_AUTH</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Store className="h-4 w-4 text-accent" /> Liens de configuration officiels</h2><p className="mt-1 text-xs text-ink-3">Ouvrez les comptes avec la même identité légale et conservez les preuves de chaque validation.</p></div>
          <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">Voir le produit Pro <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Apple Developer", "https://developer.apple.com/programs/enroll/"],
            ["Google Play Console", "https://play.google.com/console/about/"],
            ["Expo EAS", "https://docs.expo.dev/build/setup/"],
            ["RevenueCat", "https://www.revenuecat.com/docs/getting-started/entitlements"],
          ].map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-line px-3 py-3 text-xs font-medium text-ink-2 hover:border-accent/40 hover:text-ink">{label}<ExternalLink className="h-3.5 w-3.5 text-ink-3" /></a>)}
        </div>
      </section>

      <p className="text-[11px] leading-5 text-ink-3">Le guide détaillé reste versionné dans <code className="font-mono text-ink-2">docs/native-release-cote-ivoire.md</code>. Aucun compte Apple, Google, Expo ou RevenueCat n’est créé automatiquement par ce site.</p>
    </div>
  );
}
