// Sursa Profitshare: feed-uri CSV de produse generate în contul de afiliat pentru pretino.ro.
// Linkurile feed-urilor stau doar în %LOCALAPPDATA%\Pretino\secrete.env: PRETINO_PROFITSHARE_FEEDS=url1 url2 (separate prin spațiu sau virgulă).
import { parseCsv } from "../lib/csv.js";
import { parsePret, idOferta, inStoc, mapCategorie } from "../lib/oferta.js";
import { gasesteMagazin } from "../lib/magazine.js";

export function dinRand(x, magazine) {
  const link = x.link || x.product_url || x.product_link || "";
  const m = gasesteMagazin(magazine, { nume: x.adv_name || x.advertiser_name, link });
  if (!m) return { omis: "magazin necunoscut: " + (x.adv_name || link) };
  if (!inStoc(x.availability)) return { omis: "fara stoc" };
  const vechi = parsePret(x.price_vat || x.price_with_vat), disc = parsePret(x.price_discounted || x["price_with_discount,_with_vat"]);
  const pret = disc && vechi && disc < vechi ? disc : vechi;
  const pretVechi = disc && vechi && disc < vechi ? vechi : null;
  const aff = (x.product_aff_link || x.product_affiliate_link || "").replace(/^\/\//, "https://");
  const url = aff || link;
  if (!pret || !url || !(x.product_name)) return { omis: "date incomplete" };
  return { oferta: { id: idOferta("ps", link || url), sursa: "profitshare", titlu: x.product_name, categorie: mapCategorie(x.category), magazin: m.id, pret, ...(pretVechi ? { pretVechi } : {}), url, afiliat: Boolean(aff), ...((x.product_pic || x.product_picture) ? { imagine: x.product_pic || x.product_picture } : {}) } };
}

export async function citeste(magazine, secrete, fetchFn = fetch) {
  const feeds = (secrete.PRETINO_PROFITSHARE_FEEDS ?? "").split(/[\s,]+/).filter(Boolean);
  if (!feeds.length) throw new Error("lipsește PRETINO_PROFITSHARE_FEEDS din secrete.env");
  const oferte = [], omise = {};
  let esantion = "";
  const categorii = {};
  for (const f of feeds) {
    const res = await fetchFn(f, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`feed Profitshare: HTTP ${res.status}`);
    const rows = parseCsv(await res.text());
    if (!esantion && rows[0]) esantion = `coloane: ${Object.keys(rows[0]).join(" | ")}\nrand1: ${JSON.stringify(rows[0])}\nrand2: ${JSON.stringify(rows[1] ?? {})}\n`;
    for (const x of rows) {
      { const k = x.category; const c = categorii[k] ??= { n: 0 }; c.n++; }
      const r = dinRand(x, magazine);
      if (r.oferta) oferte.push(r.oferta); else omise[r.omis] = (omise[r.omis] ?? 0) + 1;
    }
  }
  return { oferte, omise, esantion, categorii };
}
