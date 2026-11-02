// Istoricul prețurilor Pretino (data/istoric-preturi.json): { [idOferta]: [{ d: "AAAA-LL-ZZ", p: pret }] }
// Se adaugă o intrare doar când prețul s-a schimbat.
export function actualizeazaIstoric(istoric, oferte, azi = new Date().toISOString().slice(0, 10)) {
  const nou = { ...istoric };
  for (const o of oferte) {
    const lista = [...(nou[o.id] ?? [])];
    if (!lista.length || lista[lista.length - 1].p !== o.pret) lista.push({ d: azi, p: o.pret });
    nou[o.id] = lista;
  }
  return nou;
}
