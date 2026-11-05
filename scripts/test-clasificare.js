// Regresie clasificare (P0 audit 2026-11-05); rulat din scripts/test.js
import { clasifica } from "./lib/clasificare.js";

export function testeClasificare(ok) {
const cazuri = [
  ["Cuptor incorporabil Whirlpool OMK58HU1B, Electric, Multifunctional, 71 L", "electronice", "imprimante", false],
  ["STANLEY Set multifunctional 62-511 blister", "electronice", "imprimante", false],
  ["Tester Multifunctional Techstar Portabil pentru Circuite Auto 6V-24V", "electronice", "imprimante", false],
  ["Adaptor multifunctional 3 in 1 USB-C la HDMI Techstar", "electronice", "imprimante", false],
  ["Multifunctional Inkjet color HP Envy Photo 7230, A4, wireless", "electronice", "imprimante", true],
  ["Toner laser 52D2X0E Corporate 522X, 45.000 pag", "electronice", "imprimante", true],
  ["Suporto Perna ortopedica lombara pentru scaun", "electronice", "componente", false],
  ["Memorie USB 128GB USB 3.2 Gen 1 DataTraveler", "electronice", "componente", false],
  ["Placa video GIGABYTE GeForce RTX 5070 GAMING OC 12GB", "electronice", "componente", true],
  ["Router Wireless ZTE T3000, AX3000, Wi-Fi 6", "electronice", "componente", false],
  ["Husa pentru Apple iPhone 15 Plus, Techsuit", "electronice", "telefoane", false],
  ["Smartwatch Samsung Galaxy Watch Ultra (2025), 47mm", "electronice", "telefoane", false],
  ["Telefon Mobil Samsung Galaxy S26 Ultra, 12GB RAM, cablu inclus", "electronice", "telefoane", true],
  ["Bara ghidon pentru trotineta electrica ZERO 9", "sport", "trotinete-electrice", false],
  ["Trotineta electrica Xiaomi 4 Ultra, 25 km/h", "sport", "trotinete-electrice", true],
  ["Masina de spalat rufe Candy Smart Pro CS 1272DRRE", "electrocasnice", "frigidere", false],
  ["Combina frigorifica Bosch KGN39VLEB", "electrocasnice", "frigidere", true],
  ["Robot de Curatat Piscina S1 fara Fir", "supermarket", null, false],
];
for (const [titlu, cat, sub, asteptat] of cazuri) {
  const r = clasifica({ titlu, categorie: cat === "sport" ? "sport" : cat });
  ok((r.sub === sub) === asteptat, `clasificare: „${titlu.slice(0, 50)}” ${asteptat ? "in" : "nu in"} ${sub}`);
}
}
