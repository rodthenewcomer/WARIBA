import type { NextConfig } from "next";

// Base path injecté par le workflow de déploiement GitHub Pages
// (le site vit sous https://<user>.github.io/AfriTerminal/).
// Absent en dev local : les URLs restent à la racine.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig: NextConfig = {
  // Site 100 % statique (aucune route API, données importées au build) :
  // l'export statique permet un hébergement GitHub Pages sans serveur.
  output: "export",
  // Chaque page devient un répertoire/index.html — servi proprement
  // par GitHub Pages sans réécriture d'URL.
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
