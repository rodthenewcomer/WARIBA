import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card-glass mx-auto mt-16 max-w-md p-10 text-center">
      <p className="text-4xl font-black text-accent">404</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">Page introuvable</h1>
      <p className="mt-1 text-sm text-ink-3">
        Cette valeur n&apos;est pas cotée ici — ou pas encore.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex h-9 items-center rounded-lg bg-accent/15 px-4 text-sm font-medium text-accent border border-accent/30 hover:bg-accent/25"
      >
        Retour au dashboard
      </Link>
    </div>
  );
}
