// PC Garage: site-ul cere o validare anti-bot (Cloudflare Turnstile, /validare-acces/) inainte de pagini.
// Validarea NU se completeaza si NU se ocoleste. Daca apare, sursa e raportata „blocata”; reincercare sau introducere manuala.
// Structura paginilor PC Garage NU a putut fi analizata (acces blocat), deci se folosesc doar date structurate standard (JSON-LD/microdata).
import { qsa, attr, text } from "../lib/dom.js";
import { absolut, paginaUrmatoare, produseStructurate } from "./generic.js";

export const DOMENII = ["pcgarage.ro"];
const PERMISE = /(oferte|promo|campanie|campanii|black-?friday|reduceri|outlet|lichidare|zilele|craciun)/i;
export function esteLinkCampanie(url) {
  try { const u = new URL(url); return /(^|\.)pcgarage\.ro$/.test(u.hostname) && PERMISE.test(u.pathname) && !/\/(cos|cont|login|validare-acces)(\/|$)/i.test(u.pathname); } catch { return false; }
}
export function descopera(root, baza) {
  const out = new Map();
  for (const a of qsa(root, "a[href]")) {
    const u = absolut(attr(a, "href"), baza);
    const curat = u?.split("?")[0];
    if (curat && esteLinkCampanie(curat) && !out.has(curat)) out.set(curat, { url: curat, titlu: text(a).slice(0, 80) || null });
  }
  return [...out.values()];
}
export function parseListare(root, baza) {
  return { produse: produseStructurate(root, baza).map((p) => ({ ...p, vandut: p.vandut ?? "PC Garage" })), urmatoarea: paginaUrmatoare(root, baza) };
}
