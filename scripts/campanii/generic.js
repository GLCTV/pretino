// Extragere generica din pagini publice: metadate de campanie + produse din date structurate (JSON-LD / microdata).
// Nu inventeaza date: ce lipseste ramane null sau "Necunoscut".
import { qsa, qs, attr, text } from "../lib/dom.js";
import { parsePret } from "../lib/oferta.js";

export const absolut = (href, baza) => { try { return new URL(href, baza).href.split("#")[0]; } catch { return null; } };
export const fara = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");

const LUNI = { ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6, iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12 };
const iso = (a, l, z) => `${a}-${String(l).padStart(2, "0")}-${String(z).padStart(2, "0")}`;

// Date de inceput/sfarsit, doar cand apar explicit in text. Returneaza { inceput, sfarsit } (ISO sau null)
export function extrageDate(txt, anImplicit = new Date().getFullYear()) {
  const t = fara(txt).toLowerCase();
  const out = { inceput: null, sfarsit: null };
  let m = t.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\s*(?:-|–|pana(?: la| pe)?|→)\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
  if (m) return { inceput: iso(m[3], m[2], m[1]), sfarsit: iso(m[6], m[5], m[4]) };
  m = t.match(/(\d{1,2})\s*(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)(?:\s*(20\d{2}))?\s*(?:-|–|pana(?: la| pe)?)\s*(\d{1,2})\s*(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)(?:\s*(20\d{2}))?/);
  if (m) { const a2 = m[6] ?? m[3] ?? anImplicit; return { inceput: iso(m[3] ?? a2, LUNI[m[2]], m[1]), sfarsit: iso(a2, LUNI[m[5]], m[4]) }; }
  m = t.match(/(?:pana(?: la| pe| in)?|valabil pana(?: la| pe)?|se termina(?: pe| la)?)\s*(\d{1,2})\s*(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)(?:\s*(20\d{2}))?/);
  if (m) out.sfarsit = iso(m[3] ?? anImplicit, LUNI[m[2]], m[1]);
  m = t.match(/(?:incepand cu|de la|din)\s*(\d{1,2})\s*(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)(?:\s*(20\d{2}))?/);
  if (m) out.inceput = iso(m[3] ?? anImplicit, LUNI[m[2]], m[1]);
  return out;
}

// Reducerea anunțată, cu formularea exacta din pagina („pana la 30%”)
export function extrageReducere(txt) {
  const m = String(txt ?? "").match(/(?:p[aâă]n[aă] la\s*)?-?\s*\d{1,2}(?:[.,]\d+)?\s*%(?:\s*reducere)?/i);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}
// Cod promotional: DOAR daca apare explicit dupa cuvantul „cod”
export function extrageCod(txt) {
  const m = String(txt ?? "").match(/\b[Cc]od(?:ul)?(?:\s+promo(?:tional)?)?\s*[:\-]?\s*["“]?([A-Z0-9]{4,20})["”]?(?![a-z])/);
  return m && /[A-Z]/.test(m[1]) ? m[1] : null;
}
const CUVINTE_COND = /(valoare(?:a)? minim|comanda minim|comenzi? peste|minim\s*\d|exclus|cu exceptia|exceptii|doar in aplicatie|in aplicatia|genius|abonament|nu se cumuleaz|nu se cumulează|marketplace)/i;
export function extrageConditii(txt) {
  const frazele = String(txt ?? "").split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 8 && s.length < 240);
  return [...new Set(frazele.filter((s) => CUVINTE_COND.test(fara(s))))].slice(0, 6);
}

export function metaCampanie(root, url, baza = url) {
  const meta = (k) => attr(qs(root, `meta[property="${k}"],meta[name="${k}"]`), "content") ?? null;
  const titlu = meta("og:title") || text(qs(root, "h1")) || text(qs(root, "title")) || null;
  const descriere = meta("og:description") || meta("description") || null;
  const imagine = meta("og:image") ? absolut(meta("og:image"), baza) : null;
  const corp = text(qs(root, "main")) || text(qs(root, "body")) || "";
  const continut = [titlu, descriere, corp.slice(0, 20000)].filter(Boolean).join(". ");
  const date = extrageDate(continut);
  return {
    titlu: titlu ? titlu.replace(/\s*[|\-–]\s*(eMAG\.ro|PC Garage).*$/i, "").trim() : null,
    descriere, url, imagine, imagineSursa: imagine ? url : null,
    inceput: date.inceput, sfarsit: date.sfarsit,
    reducereAnuntata: extrageReducere([titlu, descriere].filter(Boolean).join(" ")) ?? extrageReducere(corp.slice(0, 4000)),
    codPromotional: extrageCod(continut),
    conditii: extrageConditii(continut),
  };
}

// Produse din JSON-LD (Product, ItemList cu Product) si microdata
export function produseStructurate(root, baza) {
  const gasite = [];
  const vizita = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(vizita);
    const tip = [].concat(o["@type"] ?? []);
    if (tip.includes("Product") && o.name) {
      const of = [].concat(o.offers ?? [])[0] ?? {};
      const pret = parsePret(of.price ?? of.lowPrice);
      gasite.push({
        idMagazin: String(o.sku ?? o.productID ?? of.sku ?? "") || null, titlu: String(o.name), url: absolut(o.url ?? of.url ?? "", baza),
        imagine: absolut([].concat(o.image ?? [])[0]?.url ?? [].concat(o.image ?? [])[0] ?? "", baza) || null,
        pret, pretReferinta: null, reducereAfisata: null,
        disponibilitate: /InStock/i.test(of.availability ?? "") ? "in_stoc" : /OutOfStock|SoldOut/i.test(of.availability ?? "") ? "indisponibil" : "necunoscut",
        vandut: of.seller?.name ?? null, moneda: of.priceCurrency ?? null,
      });
    }
    for (const k of Object.keys(o)) if (typeof o[k] === "object") vizita(o[k]);
  };
  for (const s of qsa(root, 'script[type="application/ld+json"]')) {
    try { vizita(JSON.parse(s.children.map((c) => c.text ?? "").join(""))); } catch {}
  }
  for (const p of qsa(root, '[itemtype*="schema.org/Product"]')) {
    const ip = (n) => attr(qs(p, `[itemprop="${n}"]`), "content") ?? text(qs(p, `[itemprop="${n}"]`));
    const titlu = ip("name");
    if (!titlu) continue;
    gasite.push({ idMagazin: ip("sku") || null, titlu, url: absolut(attr(qs(p, '[itemprop="url"]'), "href") ?? attr(qs(p, "a"), "href") ?? "", baza), imagine: absolut(attr(qs(p, '[itemprop="image"]'), "src") ?? attr(qs(p, '[itemprop="image"]'), "content") ?? "", baza), pret: parsePret(ip("price")), pretReferinta: null, reducereAfisata: null, disponibilitate: /InStock/i.test(ip("availability")) ? "in_stoc" : "necunoscut", vandut: null, moneda: ip("priceCurrency") || null });
  }
  const vazut = new Set();
  return gasite.filter((p) => p.url && p.pret && !vazut.has(p.url) && vazut.add(p.url));
}

export function paginaUrmatoare(root, baza) {
  const l = attr(qs(root, "link[rel=next]"), "href") ?? attr(qs(root, "a[rel=next]"), "href");
  if (l) return absolut(l, baza);
  const a = qsa(root, "a").find((x) => /pagina urmatoare|urmatoarea|next/i.test(fara(text(x) + " " + (attr(x, "title") ?? "") + " " + (attr(x, "aria-label") ?? ""))) && attr(x, "href") && !/^(javascript|#)/.test(attr(x, "href")));
  return a ? absolut(attr(a, "href"), baza) : null;
}
