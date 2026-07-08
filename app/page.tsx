"use client";

// Redirection client vers /dashboard : redirect() côté serveur n'émet
// pas de page exploitable en export statique (GitHub Pages, sans
// serveur) — la racine sortait comme coquille d'erreur vide.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
