// PC Garage: site-ul cere o validare anti-bot (Cloudflare Turnstile, /validare-acces/) inainte de pagini.
// Validarea NU se completeaza si NU se ocoleste. Daca apare, sursa e raportata „blocata”; reincercare sau introducere manuala.
// Structura paginilor PC Garage NU a putut fi analizata (acces blocat), deci se folosesc doar date structurate standard (JSON-LD/microdata).
import { qsa, qs, attr, text } from "../lib/dom.js";
import { parsePret } from "../lib/oferta.js";
import { absolut, fara, paginaUrmatoare, produseStructurate } from "./generic.js";

export const DOMENII = ["pcgarage.ro"];
const PERMISE = /(oferte|promo|campanie|campanii|black-?friday|reduceri|outlet|lichidare|zilele|craciun)/i;
export function esteLinkCampanie(url) {
  try { const u = new URL(url); return /(^|\.)pcgarage\.ro$/.test(u.hostname) && PERMISE.test(u.pathname) && !/\/(cos|cont|login|validare-acces)(\/|$)/i.test(u.pathname); } catch { return false; }
}
// categorii de produse din meniul principal (ul#top_menu in HTML brut): /<slug>/ pe un singur nivel; fara pagini de cont/info si fara pagini de „gameplay" (sisteme de test)
const NU_CATEGORIE = /gameplay|testat|^\/(cos|cont|logout|info|p|sisteme|noutati|angajari|desigilate|adauga-wishlist|vizualizare-wishlist)\/$/i;
export function descopera(root, baza) {
  const out = new Map();
  for (const a of qsa(root, "[id=top_menu] a[href], .top_menu a[href]")) {
    const curat = absolut(attr(a, "href"), baza)?.split("?")[0];
    if (!curat) continue;
    try { const u = new URL(curat); if (/(^|\.)pcgarage\.ro$/.test(u.hostname) && /^\/[a-z0-9-]+\/$/.test(u.pathname) && !NU_CATEGORIE.test(u.pathname)) { const filtrat = `${u.origin}${u.pathname}filtre/discount/`; out.set(filtrat, { url: filtrat, titlu: text(a).slice(0, 80) || u.pathname.replace(/\//g, ""), categorie: true }); } } catch { /* ignora */ }
  }
  // doar categoriile din meniu (cu filtrul „Cu discount”); paginile de campanie/oferte nu se mai descopera
  return [...out.values()];
}
// Structura verificata (nov. 2026) in Chrome pe /extra-reduceri-*/ si /notebook-laptop/:
//  - lista campanii: .product_box cu .bf_ptitle_link (titlu+URL), .bfp_new (pret), .bfp_old (pret vechi, poate fi gol), .bf_pdiscount, imagine .bf_pimage_img
//  - lista categorie: .product_box cu .product_box_name a (titlu+URL), .pb-price .price (pret), .aq_prod_p_old / .pbe-price-old (pret vechi), .product_box_availability
//  - filtrul „Cu discount": /<categorie>/filtre/discount/ (doar produsele cu pret vechi; verificat in Chrome)
//  - paginare: /<categorie>/paginaN/
const OLD = ".bfp_old,.aq_prod_p_old,.pbe-price-old,.pb-price-old,[class*=price-old]";
const stoc = (card) => {
  const el = qs(card, ".product_box_availability");
  const t = fara(text(el)).toLowerCase();
  if (!el && !t) return "necunoscut";
  if (/epuizat|indisponibil|nu este in stoc|fara stoc/.test(t)) return "indisponibil";
  if (/precomand|comanda la furnizor|la comanda/.test(t)) return "la_comanda";
  return /stoc|disponibil/.test(t) || /instock/.test(el?.attrs?.class ?? "") ? "in_stoc" : "necunoscut";
};
export function parseListare(root, baza) {
  const produse = [];
  // pe paginile de categorie, pretul vechi (.pbe-price-old) e in blocul .pb-extra de langa .product_box, ambele in .product_box_container
  const cutii = qsa(root, ".product_box"), containere = qsa(root, ".product_box_container");
  for (const card of containere.length && containere.length === cutii.length ? containere : cutii) { // containere folosite doar daca fiecare card are propriul container
    const a = qs(card, ".bf_ptitle_link") ?? qs(card, ".bf_ptitle a") ?? qs(card, ".product_box_name a") ?? qs(card, "a[href]");
    const titlu = text(a) || text(qs(card, ".product_box_name"));
    const url = absolut(attr(a, "href") ?? "", baza)?.split("?")[0];
    const pret = parsePret(text(qs(card, ".bfp_new")) || text(qs(card, ".pb-price .price")) || text(qs(card, ".price")));
    if (!titlu || !url || !pret) continue;
    const vechi = parsePret(text(qs(card, OLD)));
    const img = qs(card, "img");
    const src = attr(img, "src") && !/^data:/.test(attr(img, "src")) ? attr(img, "src") : (attr(img, "srcset") ?? "").split(/[\s,]+/)[0] || attr(img, "data-src") || null;
    const slug = new URL(url).pathname.replace(/\/$/, "").split("/").pop();
    produse.push({
      idMagazin: slug, idOferta: null, titlu, url, imagine: src ? absolut(src, baza) : null, pret, pretReferinta: vechi && vechi > pret ? vechi : null,
      reducereAfisata: text(qs(card, ".bf_pdiscount")) || text(qs(card, ".pbe-name")) || text(qs(card, ".bf_bonus_text")) || null,
      etichete: [...new Set(qsa(card, ".ls_labels *, .bf_bonus_text").map((e) => text(e)).filter((t) => t && t.length < 80))],
      conditie: /desigilat/i.test(baza) || /desigilat/i.test(url) ? "desigilat" : null, disponibilitate: stoc(card), vandut: "PC Garage", categorie: null,
    });
  }
  const vazut = new Set();
  const unice = produse.filter((p) => !vazut.has(p.url) && vazut.add(p.url));
  // numarul live al produselor din pagina de categorie („18 produse de la 7 producatori”, .products-count)
  const mt = text(qs(root, ".products-count")).match(/(\d[\d.]*)\s+produs/i);
  const total = mt ? Number(mt[1].replace(/\./g, "")) : null;
  return { produse: unice.length ? unice : produseStructurate(root, baza).map((p) => ({ ...p, vandut: p.vandut ?? "PC Garage" })), urmatoarea: urmatoarea(root, baza), total: total > 0 ? total : null };
}
function urmatoarea(root, baza) {
  const m = baza.match(/\/pagina(\d+)\/?(?:\?.*)?$/);
  const n = m ? Number(m[1]) + 1 : 2;
  const a = qsa(root, ".pagination a, .lr-pagination a").find((x) => new RegExp(`/pagina${n}/?$`).test(attr(x, "href") ?? ""));
  return a ? absolut(attr(a, "href"), baza) : paginaUrmatoare(root, baza);
}
