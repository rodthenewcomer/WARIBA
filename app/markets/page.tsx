"use client";

// La page Marchés faisait doublon avec le Screener (même tableau, filtres
// moins riches) — supprimée. Cette coquille redirige les anciens liens/
// favoris ; l'export statique ne permet pas de redirection serveur.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MarketsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/screener");
  }, [router]);
  return null;
}
