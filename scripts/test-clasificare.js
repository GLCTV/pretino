// Regresie clasificare (P0 audit 2026-11-05); rulat din scripts/test.js
import { clasifica } from "./lib/clasificare.js";
import * as fs from "node:fs";

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
  // pagini noi (necesita dist/ generat de build)
  const { existsSync, readFileSync } = fs;
  if (existsSync("dist/index.html")) {
    const citeste = (f) => readFileSync(f, "utf8");
    ok(existsSync("dist/magazine/index.html") && /href="\/magazine\/"/.test(citeste("dist/index.html")), "seo: director /magazine/ exista si e legat din prima pagina");
    ok(/Descoperă oferte:/.test(citeste("dist/index.html")) && /Laptopuri la ofertă/.test(citeste("dist/index.html")), "seo: prima pagina are acces compact la categoriile principale");
    ok(!existsSync("dist/categorie/sport/trotinete-electrice/index.html") || !/piese/i.test(citeste("dist/categorie/sport/trotinete-electrice/index.html").match(/<h1[^>]*>[^<]*/)[0]), "clasificare: pagina trotinetelor electrice nu e a pieselor");
    const sm = citeste("dist/sitemap.xml");
    ok(["periferice/mouse", "periferice/tastaturi", "monitoare-tv/monitoare"].every((x) => existsSync(`dist/categorie/electronice/${x}/index.html`) === sm.includes(`/categorie/electronice/${x}/`)), "seo: paginile pe tip de produs sunt in sitemap exact cand exista");
  }
}
