// Arhiva ofertelor încheiate (data/produse-arhiva.json): când o ofertă dispare din catalog, pagina ei de produs rămâne
// ZILE_ARHIVA zile cu mesajul „Oferta s-a încheiat”, istoricul prețului și oferte similare (nu mai dă 404).
// Revine automat ca ofertă activă dacă produsul apare din nou în catalog. Ofertele magazinelor oprite din program nu se arhivează.
export const ZILE_ARHIVA = 60;
const CAMPURI = ["id", "sursa", "titlu", "categorie", "magazin", "pret", "pretVechi", "url", "imagine", "referintaMagazin"];
export function actualizeazaArhiva(arhiva, precedente, curente, oprite = new Set(), azi = new Date().toISOString().slice(0, 10)) {
  const nou = { ...arhiva }, active = new Set(curente.map((o) => o.id));
  for (const id of Object.keys(nou)) if (active.has(id)) delete nou[id];
  for (const o of precedente) {
    if (active.has(o.id) || oprite.has(o.magazin) || nou[o.id]) continue;
    nou[o.id] = { ...Object.fromEntries(CAMPURI.filter((k) => o[k] !== undefined).map((k) => [k, o[k]])), incheiat: azi };
  }
  const limita = Date.parse(azi) - ZILE_ARHIVA * 864e5;
  for (const [id, x] of Object.entries(nou)) if (Date.parse(x.incheiat) < limita) delete nou[id];
  return nou;
}
