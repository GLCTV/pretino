// Motorul de actualizare Pretino. Pentru fiecare SURSĂ folosită de magazinele active (data/magazine.json → sursa) rulează adaptorul
// scripts/surse/<sursa>.js (export async function citeste(magazine, secrete) -> { oferte, omise }), păstrează doar ofertele cu reducere reală,
// scrie data/oferte.json și istoricul prețurilor. O sursă care dă eroare nu oprește celelalte, iar ofertele ei anterioare se păstrează.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { incarcaSecrete } from "./lib/secrete.js";
import { actualizeazaIstoric } from "./lib/istoric.js";
import { areReducereReala } from "./lib/oferta.js";

const f = (n) => new URL(`../data/${n}`, import.meta.url);
const citesteJson = (n) => JSON.parse(readFileSync(f(n), "utf8"));
const magazine = citesteJson("magazine.json");
const categorii = new Set(citesteJson("categorii.json").map((c) => c.slug));
const secrete = incarcaSecrete();
const precedente = citesteJson("oferte.json");
mkdirSync("rapoarte", { recursive: true });
const raport = [];
const surse = [...new Set(magazine.filter((m) => m.activ && m.sursa).map((m) => m.sursa))];
let rezultat = [];
let schimbat = false;

for (const sursa of surse) {
  const adaptor = new URL(`./surse/${sursa}.js`, import.meta.url);
  const pastrate = precedente.filter((o) => o.sursa === sursa);
  if (!existsSync(adaptor)) { raport.push(`[${sursa}] activ, dar lipseste scripts/surse/${sursa}.js (oferte vechi pastrate: ${pastrate.length})`); rezultat.push(...pastrate); continue; }
  try {
    const { citeste } = await import(adaptor.href);
    const { oferte, omise, esantion, categorii: catFeed } = await citeste(magazine.filter((m) => m.activ && m.sursa === sursa), secrete);
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
    raport.push(`[${sursa}] ${bune.length} oferte cu reducere din ${oferte.length} citite. Omise: ${Object.entries(respinse).map(([k, v]) => `${k}=${v}`).join(", ") || "-"}`);
  } catch (e) {
    rezultat.push(...pastrate);
    raport.push(`[${sursa}] EROARE: ${e.message} (oferte vechi pastrate: ${pastrate.length})`);
  }
}

if (!surse.length) raport.push("Nicio sursa activa (data/magazine.json). Catalogul ramane neschimbat.");
if (schimbat) {
  writeFileSync(f("oferte.json"), JSON.stringify(rezultat, null, 1) + "\n");
  writeFileSync(f("istoric-preturi.json"), JSON.stringify(actualizeazaIstoric(citesteJson("istoric-preturi.json"), rezultat)) + "\n");
}
const text = `Actualizare Pretino ${new Date().toISOString()}\n${raport.join("\n")}\nTotal oferte: ${schimbat ? rezultat.length : precedente.length}\n`;
writeFileSync("rapoarte/ultimul-raport.txt", text);
console.log(text);
