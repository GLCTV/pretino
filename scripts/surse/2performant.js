// Sursa 2Performant: feed-uri CSV de produse. Secrete (doar în secrete.env, dedicate Pretino):
// PRETINO_TWOPERF_FEEDS=url1 url2 ; PRETINO_TWOPERF_AFF_CODE=codul de afiliat pentru pretino.ro (pentru linkuri Quicklink dacă feed-ul nu le dă).
// Codul campaniei („unique”) se pune în data/magazine.json → afiliere.unique.
// Feed separat per magazin (optional): PRETINO_TWOPERF_FEED_<ID> (ex. PRETINO_TWOPERF_FEED_GSMNET=https://api.2performant.com/feed/xxxx.csv). Un magazin fara cheie proprie foloseste PRETINO_TWOPERF_FEEDS.
// Astfel „Actualizeaza” pe un singur magazin descarca doar feed-ul lui, nu toate feed-urile.
import { parseCsv } from "../lib/csv.js";
import { parsePret, idOferta, inStoc, mapCategorie } from "../lib/oferta.js";
import { gasesteMagazin } from "../lib/magazine.js";

const RESIGILAT = /refurbished|second ?hand|resigilat|desigilat|reconditionat|recondi[tț]ionat/i;
const pick = (x, ...ks) => { for (const k of ks) if (x[k]) return x[k]; return ""; };

export function dinRand(x, magazine, affCode) {
  const link = pick(x, "merchant_url", "product_url", "url", "link", "product_link");
  const m = gasesteMagazin(magazine, { nume: pick(x, "merchant_program", "campaign_name", "advertiser", "shop"), link });
  if (!m) return { omis: "magazin necunoscut: " + link };
  if (!inStoc(pick(x, "availability", "stock", "in_stock", "stoc", "disponibilitate")) || /^(0|false|no|nu)$/i.test(pick(x, "product_active", "active", "is_active"))) return { omis: "fara stoc" };
  const pret = parsePret(pick(x, "sale_price", "price", "price_vat", "pret")), vechi = parsePret(pick(x, "old_price", "full_price", "price_old"));
  let aff = pick(x, "marketer_link", "aff_link", "affiliate_link", "affiliate_url", "aff_url", "tracking_link") || (/^https?:/.test(x.aff_code ?? "") ? x.aff_code : "")
    || (affCode && m.afiliere?.unique ? `https://event.2performant.com/events/click?ad_type=quicklink&aff_code=${affCode}&unique=${m.afiliere.unique}&redirect_to=${encodeURIComponent(link)}` : "");
  if (aff && link && /redirect_to=$/.test(aff)) aff += encodeURIComponent(link);
  if (!aff || /redirect_to=$/.test(aff)) return { omis: "fara link produs" };
  const titlu = pick(x, "product_title", "title", "name", "product_name");
  const url = aff || link;
  if (!pret || !url || !titlu) return { omis: "date incomplete" };
  const img = pick(x, "image_urls", "image_url", "image", "product_pic", "images").split(/[,|\s]+/)[0];
  const catText = [pick(x, "category", "category_name"), pick(x, "subcategories", "subcategory")].join(" ");
  let categorie = mapCategorie(catText);
  // magazin specializat (ex. GSMnet = telefoane/accesorii, Otter = incaltaminte): categoria implicita daca textul din feed nu se potriveste, dar niciodata pentru produse resigilate/refurbished
  if (!categorie && m.categorieImplicita && !RESIGILAT.test(`${titlu} ${catText}`)) categorie = m.categorieImplicita;
  return { oferta: { id: idOferta("2p", link || url), sursa: "2performant", titlu, categorie, magazin: m.id, pret, ...(vechi && vechi > pret ? { pretVechi: vechi } : {}), url, afiliat: Boolean(aff), ...(img ? { imagine: img } : {}) } };
}

export async function citeste(magazine, secrete, fetchFn = fetch) {
  const lista = (v) => String(v ?? "").split(/[\s,]+/).filter(Boolean);
  const feeds = [], oferte = [], omise = {};
  let generale = false;
  for (const m of magazine) {
    const cheie = `PRETINO_TWOPERF_FEED_${m.id.toUpperCase()}`, proprii = lista(secrete[cheie]);
    if (proprii.length) feeds.push(...proprii);
    else if (m.feedPropriu) omise[`magazin sarit: lipseste ${cheie} din secrete.env`] = 1; // magazin cu feed propriu, nesetat: nu blocam celelalte magazine
    else generale = true;
  }
  if (generale) feeds.push(...lista(secrete.PRETINO_TWOPERF_FEEDS));
  if (!feeds.length && !Object.keys(omise).length) throw new Error("lipsește feed-ul din secrete.env (PRETINO_TWOPERF_FEEDS sau PRETINO_TWOPERF_FEED_<ID>, ex. PRETINO_TWOPERF_FEED_GSMNET)");
  feeds.splice(0, feeds.length, ...new Set(feeds));
  let esantion = "";
  const categorii = {};
  for (const f of feeds) {
    const res = await fetchFn(f, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`feed 2Performant: HTTP ${res.status}`);
    const rows = parseCsv(await res.text());
    if (!esantion && rows[0]) esantion = `coloane: ${Object.keys(rows[0]).join(" | ")}\nrand1: ${JSON.stringify(rows[0])}\nrand2: ${JSON.stringify(rows[1] ?? {})}\n`;
    for (const x of rows) {
      { const k = [x.category, x.subcategory].join(" | "); const c = categorii[k] ??= { n: 0 }; c.n++; }
      const r = dinRand(x, magazine, secrete.PRETINO_TWOPERF_AFF_CODE);
      if (r.oferta) oferte.push(r.oferta); else omise[r.omis] = (omise[r.omis] ?? 0) + 1;
    }
  }
  return { oferte, omise, esantion, categorii };
}
