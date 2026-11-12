// Motorul de actualizare Pretino. Pentru fiecare SURSĂ folosită de magazinele active (data/magazine.json → sursa) rulează adaptorul
// scripts/surse/<sursa>.js (export async function citeste(magazine, secrete) -> { oferte, omise }), păstrează doar ofertele cu reducere reală,
// scrie data/oferte.json și istoricul prețurilor. O sursă care dă eroare nu oprește celelalte, iar ofertele ei anterioare se păstrează.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { incarcaSecrete } from "./lib/secrete.js";
import { actualizeazaIstoric } from "./lib/istoric.js";
import { areReducereReala } from "./lib/oferta.js";
import { actualizeazaArhiva } from "./lib/arhiva.js";

const f = (n) => new URL(`../data/${n}`, import.meta.url);
const citesteJson = (n) => JSON.parse(readFileSync(f(n), "utf8"));
const magazine = citesteJson("magazine.json");
const categorii = new Set(citesteJson("categorii.json").map((c) => c.slug));
const secrete = incarcaSecrete();
const precedente = citesteJson("oferte.json");
mkdirSync("rapoarte", { recursive: true });
const raport = [];
// Rulare pe un singur magazin: node scripts/actualizare.js --magazin <id>. Celelalte magazine (si ofertele lor) raman neatinse.
const ia = process.argv.indexOf("--magazin");
const ales = ia > 0 ? process.argv[ia + 1] : null;
const tinta = ales ? magazine.find((m) => m.id === ales) : null;
if (ales && !(tinta && tinta.activ && tinta.sursa)) { console.log(`Magazin necunoscut sau inactiv: ${ales}`); process.exit(1); }
const surse = ales ? [tinta.sursa] : [...new Set(magazine.filter((m) => m.activ && m.sursa).map((m) => m.sursa))];
const opriteIds = new Set(magazine.filter((m) => m.activ === false).map((m) => m.id));
let rezultat = ales ? precedente.filter((o) => !(o.sursa === tinta.sursa && o.magazin === ales)) : precedente.filter((o) => opriteIds.has(o.magazin)); // magazinele oprite: ofertele raman in catalog (ascunse pe site)
let schimbat = false;
// data ultimei verificari REUSITE a fiecarei surse (data/actualizat.json -> surse): la o eroare ramane data veche
let actualizat = { la: null, surse: {} };
try { actualizat = { surse: {}, ...citesteJson("actualizat.json") }; actualizat.surse ??= {}; } catch { /* prima rulare */ }

for (const sursa of surse) {
  const adaptor = new URL(`./surse/${sursa}.js`, import.meta.url);
  const pastrate = precedente.filter((o) => o.sursa === sursa && (!ales || o.magazin === ales));
  if (!existsSync(adaptor)) { raport.push(`[${sursa}] activ, dar lipseste scripts/surse/${sursa}.js (oferte vechi pastrate: ${pastrate.length})`); rezultat.push(...pastrate); continue; }
  try {
    const { citeste } = await import(adaptor.href);
    const { oferte, omise, esantion, categorii: catFeed, verificat } = await citeste(magazine.filter((m) => m.activ && m.sursa === sursa && (!ales || m.id === ales)), secrete);
    if (esantion) writeFileSync(`rapoarte/esantion-${sursa}.txt`, esantion);
    if (catFeed) writeFileSync(`rapoarte/categorii-${sursa}.txt`, Object.entries(catFeed).sort((p, q) => q[1].n - p[1].n).slice(0, 300).map(([k, v]) => `${v.n}\t${k}`).join("\n"));
    const bune = [], respinse = { ...omise };
    for (const o of oferte) {
      if (!o.categorie || !categorii.has(o.categorie)) { respinse["fara categorie"] = (respinse["fara categorie"] ?? 0) + 1; continue; }
      if (!areReducereReala(o)) { respinse["fara reducere reala"] = (respinse["fara reducere reala"] ?? 0) + 1; continue; }
      bune.push(o);
    }
    rezultat.push(...bune);
    schimbat = true;
    if (!ales) actualizat.surse[sursa] = verificat ?? new Date().toISOString(); // „verificat” = data reala a datelor citite (ex. campanii), altfel momentul citirii cu succes
    raport.push(`[${ales ?? sursa}] ${bune.length} oferte cu reducere din ${oferte.length} citite. Omise: ${Object.entries(respinse).map(([k, v]) => `${k}=${v}`).join(", ") || "-"}`);
  } catch (e) {
    rezultat.push(...pastrate);
    raport.push(`[${sursa}] EROARE: ${e.message} (oferte vechi pastrate: ${pastrate.length})`);
  }
}

if (!surse.length) raport.push("Nicio sursa activa (data/magazine.json). Catalogul ramane neschimbat.");
if (schimbat) {
  writeFileSync(f("oferte.json"), JSON.stringify(rezultat, null, 1) + "\n");
  writeFileSync(f("istoric-preturi.json"), JSON.stringify(actualizeazaIstoric(citesteJson("istoric-preturi.json"), rezultat)) + "\n");
  { let arh = {}; try { arh = citesteJson("produse-arhiva.json"); } catch {} // oferte incheiate: paginile lor raman ZILE_ARHIVA zile
    const arhNoua = actualizeazaArhiva(arh, precedente, rezultat, new Set(magazine.filter((m) => m.activ === false).map((m) => m.id)));
    writeFileSync(f("produse-arhiva.json"), JSON.stringify(arhNoua) + "\n");
    raport.push(`Arhiva oferte incheiate: ${Object.keys(arhNoua).length} pagini pastrate`); }
  actualizat.la = new Date().toISOString();
  writeFileSync(f("actualizat.json"), JSON.stringify(actualizat) + "\n"); // afisat pe site: „Preturi actualizate la ...”
}
const text = `Actualizare Pretino ${new Date().toISOString()}\n${raport.join("\n")}\nTotal oferte: ${schimbat ? rezultat.length : precedente.length}\n`;
writeFileSync("rapoarte/ultimul-raport.txt", text);
console.log(text);
