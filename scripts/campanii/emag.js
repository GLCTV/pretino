// eMAG: pagini publice. Structura verificata (nov. 2026) pe /nav/deals si /<categorie>/c:
// card = .card-item cu data-offer-id, data-product-id, data-name, data-url; pret .product-new-price; pret afisat taiat <s> in .rrp-lp30d-content
// (eticheta exacta neverificata: NU e tratat drept „cel mai mic pret din 30 zile”); reducere .badge-discount; paginare /pN/c.
import { qsa, qs, attr, text } from "../lib/dom.js";
import { parsePret } from "../lib/oferta.js";
import { absolut, fara, paginaUrmatoare, produseStructurate } from "./generic.js";

export const DOMENII = ["emag.ro"];
// Pagini relevante pentru descoperire (doar pe domeniul eMAG; pagini de produs si cont excluse)
const PERMISE = /^\/(lps|guide|campanii|genius-deals|genius|nav\/deals|resigilate|brands|black-friday|promo|cupoane)(\/|$)/i;
const EXCLUSE = /\/(pd|cart|favorites|history|user|checkout|login)(\/|$)/i;
export function esteLinkCampanie(url) {
  try { const u = new URL(url); return /(^|\.)emag\.ro$/.test(u.hostname) && PERMISE.test(u.pathname) && !EXCLUSE.test(u.pathname); } catch { return false; }
}
export function descopera(root, baza) {
  const out = new Map();
  for (const a of qsa(root, "a[href]")) {
    const u = absolut(attr(a, "href"), baza);
    if (!u) continue;
    const curat = u.split("?")[0];
    if (esteLinkCampanie(curat) && !out.has(curat)) out.set(curat, { url: curat, titlu: text(a).slice(0, 80) || null });
  }
  return [...out.values()];
}

const dispo = (card) => {
  const c = (card.attrs.class ?? "") + " " + qsa(card, "[class*=text-availability]").map((e) => e.attrs.class).join(" ");
  const m = c.match(/text-availability-([a-z_]+)/);
  return m ? (m[1] === "in_stock" ? "in_stoc" : m[1]) : "necunoscut";
};

export function parseListare(root, baza) {
  const produse = [];
  for (const card of qsa(root, ".card-item[data-offer-id],.card-item[data-product-id]")) {
    const idOferta = attr(card, "data-offer-id") ?? null, idProdus = attr(card, "data-product-id") ?? null;
    const titlu = attr(card, "data-name") || text(qs(card, ".card-v2-title"));
    const url = absolut(attr(card, "data-url") ?? attr(qs(card, "a[href*='/pd/'],a.js-product-url"), "href") ?? "", baza);
    const pret = parsePret(text(qs(card, ".product-new-price")));
    if (!titlu || !url || !pret) continue;
    const ref = parsePret(text(qs(card, ".rrp-lp30d-content s, .product-old-price")));
    const img = qs(card, "img");
    const src = attr(img, "src") && !/^data:/.test(attr(img, "src")) ? attr(img, "src") : attr(img, "data-src") ?? null;
    const vand = text(qs(card, "[class*=vendor],[class*=seller]"));
    produse.push({
      idMagazin: idProdus ?? idOferta, idOferta, titlu, url: url.split("?")[0], imagine: src ? absolut(src, baza) : null,
      pret, pretReferinta: ref && ref > pret ? ref : null, reducereAfisata: text(qs(card, ".badge-discount")) || null,
      disponibilitate: dispo(card),
      // pe cardurile din liste nu apare vanzatorul; ramane necunoscut pana la citirea paginii produsului
      vandut: vand ? (/emag/i.test(fara(vand)) ? "eMAG" : "Marketplace") : "Necunoscut",
      categorie: attr(card, "data-category-name") ?? null,
    });
  }
  const vazut = new Set();
  const unice = produse.filter((p) => !vazut.has(p.idMagazin) && vazut.add(p.idMagazin));
  return { produse: unice.length ? unice : produseStructurate(root, baza), urmatoarea: urmatoarea(root, baza) };
}

// Paginare eMAG: /<categorie>/p2/c ; „Pagina urmatoare” are href real doar cand exista
function urmatoarea(root, baza) {
  const a = qsa(root, "a").find((x) => /pagina urmatoare/i.test(fara(text(x))) && /\/p\d+\//.test(attr(x, "href") ?? ""));
  return a ? absolut(attr(a, "href"), baza) : paginaUrmatoare(root, baza);
}
