// Istoricul propriu Pretino pentru produsele din campanii (data/istoric-campanii.json): { [id]: [{ d: "AAAA-LL-ZZ", p: pret }] }
// O observatie pe zi. Scaderea se calculeaza doar cu observatii suficiente si se indica perioada.
export function observa(istoric, id, pret, azi) {
  const lista = [...(istoric[id] ?? [])];
  if (lista.length && lista[lista.length - 1].d === azi) lista[lista.length - 1] = { d: azi, p: pret };
  else lista.push({ d: azi, p: pret });
  istoric[id] = lista.slice(-400);
  return istoric;
}
const zile = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export function scadereIstoric(istoric, id, pretCurent, azi, { perioada = 30, minObs = 3, minZile = 7 } = {}) {
  const lista = (istoric[id] ?? []).filter((x) => zile(x.d, azi) <= perioada);
  if (lista.length < minObs) return null;
  const span = zile(lista[0].d, azi);
  if (span < minZile) return null;
  const max = Math.max(...lista.map((x) => x.p));
  return { perioadaZile: span, observatii: lista.length, pretMaximObservat: max, procent: max > pretCurent ? Math.round((1 - pretCurent / max) * 1000) / 10 : 0 };
}
