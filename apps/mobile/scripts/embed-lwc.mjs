// Regénère src/components/chart/lwc-runtime.ts depuis node_modules après une
// mise à jour de lightweight-charts : node scripts/embed-lwc.mjs
import { readFileSync, writeFileSync } from "node:fs";
const js = readFileSync(new URL("../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js", import.meta.url), "utf8");
const out = `// Généré par: node scripts/embed-lwc.mjs — ne pas éditer à la main.
// Build standalone de lightweight-charts (même version que le site web),
// embarqué en chaîne pour fonctionner 100 % hors ligne dans la WebView.
export const LWC_RUNTIME: string = ${JSON.stringify(js)};
`;
writeFileSync(new URL("../src/components/chart/lwc-runtime.ts", import.meta.url), out);
console.log("lwc-runtime.ts régénéré");
