// Sursa 2Performant: feed-uri CSV de produse. Secrete (doar în secrete.env, dedicate Pretino):
// PRETINO_TWOPERF_FEEDS=url1 url2 ; PRETINO_TWOPERF_AFF_CODE=codul de afiliat pentru pretino.ro (pentru linkuri Quicklink dacă feed-ul nu le dă).
// Codul campaniei („unique”) se pune în data/magazine.json → afiliere.unique.
import { parseCsv } from "../lib/csv.js";
import { parsePret, idOferta, inStoc, mapCategorie } from "../lib/oferta.js";
import { gasesteMagazin } from "../lib/magazine.js";

const pick = (x, ...ks) => { for (const k of ks) if (x[k]) return x[k]; return ""; };

export function dinRand(x, magazine, affCode) {
  const link = pick(x, "product_url", "url", "link", "product_link");
  const m = gasesteMagazin(magazine, { nume: pick(x, "merchant_program", "campaign_name", "advertiser", "shop"), link });
  if (!m) return { omis: "magazin necunoscut: " + link };
  if (!inStoc(pick(x, "availability", "stock", "in_stock", "stoc", "disponibilitate")) || /^(0|false|no|nu)$/i.test(pick(x, "product_active", "active", "is_active"))) return { omis: "fara stoc" };
  const pret = parsePret(pick(x, "sale_price", "price", "price_vat", "pret")), vechi = parsePret(pick(x, "old_price", "full_price", "price_old"));
  const aff = pick(x, "marketer_link", "aff_link", "affiliate_link", "affiliate_url", "aff_url", "tracking_link")
    || (affCode && m.afiliere?.unique ? `https://event.2performant.com/events/click?ad_type=quicklink&aff_code=${affCode}&unique=${m.afiliere.unique}&redirect_to=${encodeURIComponent(link)}` : "");
  const titlu = pick(x, "product_title", "title", "name", "product_name");
  const url = aff || link;
  if (!pret || !url || !titlu) return { omis: "date incomplete" };
  const img = pick(x, "image_urls", "image_url", "image", "product_pic", "images").split(/[,|\s]+/)[0];
  return { oferta: { id: idOferta("2p", link || url), sursa: "2performant", titlu, categorie: mapCategorie([pick(x, "category", "category_name"), pick(x, "subcategories", "subcategory")].join(" ")), magazin: m.id, pret, ...(vechi && vechi > pret ? { pretVechi: vechi } : {}), url, afiliat: Boolean(aff), ...(img ? { imagine: img } : {}) } };
}

export async function citeste(magazine, secrete, fetchFn = fetch) {
  const feeds = (secrete.PRETINO_TWOPERF_FEEDS ?? "").split(/[\s,]+/).filter(Boolean);
  if (!feeds.length) throw new Error("lipsește PRETINO_TWOPERF_FEEDS din secrete.env");
  const oferte = [], omise = {};
  for (const f of feeds) {
    const res = await fetchFn(f, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`feed 2Performant: HTTP ${res.status}`);
    for (const x of parseCsv(await res.text())) {
      const r = dinRand(x, magazine, secrete.PRETINO_TWOPERF_AFF_CODE);
      if (r.oferta) oferte.push(r.oferta); else omise[r.omis] = (omise[r.omis] ?? 0) + 1;
    }
  }
  return { oferte, omise };
}
