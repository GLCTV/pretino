// Sursa Profitshare: feed-uri CSV de produse generate în contul de afiliat pentru pretino.ro.
// Linkurile feed-urilor stau doar în %LOCALAPPDATA%\Pretino\secrete.env: PRETINO_PROFITSHARE_FEEDS=url1 url2 (separate prin spațiu sau virgulă).
import { parseCsv } from "../lib/csv.js";
import { parsePret, idOferta, inStoc, mapCategorie } from "../lib/oferta.js";
import { gasesteMagazin } from "../lib/magazine.js";

export function dinRand(x, magazine) {
  const link = x.link || x.product_url || "";
  const m = gasesteMagazin(magazine, { nume: x.adv_name, link });
  if (!m) return { omis: "magazin necunoscut: " + (x.adv_name || link) };
  if (!inStoc(x.availability)) return { omis: "fara stoc" };
  const vechi = parsePret(x.price_vat), disc = parsePret(x.price_discounted);
  const pret = disc && vechi && disc < vechi ? disc : vechi;
  const pretVechi = disc && vechi && disc < vechi ? vechi : null;
  const url = x.product_aff_link || link;
  if (!pret || !url || !x.product_name) return { omis: "date incomplete" };
  return { oferta: { id: idOferta("ps", link || url), sursa: "profitshare", titlu: x.product_name, categorie: mapCategorie(x.category), magazin: m.id, pret, ...(pretVechi ? { pretVechi } : {}), url, afiliat: Boolean(x.product_aff_link), ...(x.product_pic ? { imagine: x.product_pic } : {}) } };
}

export async function citeste(magazine, secrete, fetchFn = fetch) {
  const feeds = (secrete.PRETINO_PROFITSHARE_FEEDS ?? "").split(/[\s,]+/).filter(Boolean);
  if (!feeds.length) throw new Error("lipsește PRETINO_PROFITSHARE_FEEDS din secrete.env");
  const oferte = [], omise = {};
  for (const f of feeds) {
    const res = await fetchFn(f, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`feed Profitshare: HTTP ${res.status}`);
    for (const x of parseCsv(await res.text())) {
      const r = dinRand(x, magazine);
      if (r.oferta) oferte.push(r.oferta); else omise[r.omis] = (omise[r.omis] ?? 0) + 1;
    }
  }
  return { oferte, omise };
}
