// Sursa „campanii": produsele citite din paginile publice eMAG / PC Garage de modulul „Campanii si oferte" (data/produse-campanii.json).
// Fara feed si fara link de afiliere configurat: URL-ul ramane cel oficial al magazinului (afiliat=false).
// „pretVechi" = pretul de referinta AFISAT DE MAGAZIN (nu cel mai mic pret din 30 de zile) - oferta primeste referintaMagazin=true.
import { readFileSync, existsSync } from "node:fs";
import { idOferta, mapCategorie } from "../lib/oferta.js";

const MAX_ZILE = 3;           // date mai vechi de atat nu intra in catalog (pretul s-ar putea sa nu mai fie valabil)
const REDUCERE_MAX = 90;      // peste acest procent datele sunt suspecte
const EXCLUS = /resigilat|desigilat|refurbished|renewed/i;
const citesteJson = (c, impl) => { try { return existsSync(c) ? JSON.parse(readFileSync(c, "utf8")) : impl; } catch { return impl; } };

export function dinProdus(p, magazine, campanii = {}, acum = Date.now()) {
  const m = magazine.find((x) => x.id === p.magazin);
  if (!m) return { omis: "magazin necunoscut" };
  const stocOk = ["in_stoc", "limited_stock_qty"].includes(p.disponibilitate) || (p.magazin === "pcgarage" && p.disponibilitate === "necunoscut"); // PC Garage: lista nu marcheaza stocul, produsele epuizate sunt marcate explicit
  if (!stocOk) return { omis: "fara stoc / stoc necunoscut" };
  if (p.conditie === "desigilat" || EXCLUS.test(`${p.titlu} ${p.url}`)) return { omis: "resigilat / desigilat" };
  if (!p.titlu || !p.url || !(p.pret > 0)) return { omis: "date incomplete" };
  const verif = Date.parse(p.ultimaVerificare ?? "");
  if (!verif || acum - verif > MAX_ZILE * 864e5) return { omis: `date mai vechi de ${MAX_ZILE} zile` };
  const ref = p.pretReferinta;
  if (!(ref > p.pret)) return { omis: "fara pret de referinta afisat" };
  const red = (1 - p.pret / ref) * 100;
  if (red > REDUCERE_MAX) return { omis: "reducere suspecta (>90%)" };
  const dinListaIT = (p.campanii ?? []).some((c) => String(campanii[c]?.sursaId ?? "").startsWith("emag-red-"));
  const categorie = mapCategorie([p.categorie, p.titlu].filter(Boolean).join(" ")) ?? (dinListaIT ? "electronice" : null);
  return { oferta: { id: idOferta("camp", p.url), sursa: "campanii", titlu: p.titlu, categorie, magazin: m.id, pret: p.pret, pretVechi: ref, referintaMagazin: true, url: p.url, afiliat: false, ...(p.vandut && p.vandut !== "Necunoscut" ? { vandut: p.vandut } : {}), ...(p.imagine ? { imagine: p.imagine } : {}) } };
}

export async function citeste(magazine, _secrete, { produseCale = new URL("../../data/produse-campanii.json", import.meta.url), campaniiCale = new URL("../../data/campanii.json", import.meta.url), acum = Date.now() } = {}) {
  const f = (u) => (u instanceof URL ? u.pathname.replace(/^\/([A-Za-z]:)/, "$1") : u);
  if (!existsSync(f(produseCale))) throw new Error("lipseste data/produse-campanii.json - ruleaza mai intai „Actualizeaza campanii si oferte”");
  const produse = Object.values(citesteJson(f(produseCale), {})), campanii = citesteJson(f(campaniiCale), {});
  const oferte = [], omise = {};
  for (const p of produse) { const r = dinProdus(p, magazine, campanii, acum); if (r.oferta) oferte.push(r.oferta); else omise[r.omis] = (omise[r.omis] ?? 0) + 1; }
  return { oferte, omise };
}
