// Motorul de actualizare Pretino: citește sursele magazinelor active (data/magazine.json), scrie data/oferte.json,
// actualizează istoricul prețurilor și raportul. Fiecare magazin are adaptorul lui în scripts/surse/<id>.js
// (export async function citesteOferte(magazin, secrete) -> [{ id, titlu, categorie, magazin, pret, pretVechi?, url, imagine?, actualizat }]).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { incarcaSecrete } from "./lib/secrete.js";
import { actualizeazaIstoric } from "./lib/istoric.js";

const f = (n) => new URL(`../data/${n}`, import.meta.url);
const magazine = JSON.parse(readFileSync(f("magazine.json"), "utf8"));
const secrete = incarcaSecrete();
const rezultat = [];
const raport = [];

for (const m of magazine.filter((x) => x.activ)) {
  const adaptor = new URL(`./surse/${m.id}.js`, import.meta.url);
  if (!existsSync(adaptor)) { raport.push(`${m.nume}: activ, dar lipsește scripts/surse/${m.id}.js`); continue; }
  try {
    const { citesteOferte } = await import(adaptor.href);
    const l = await citesteOferte(m, secrete);
    rezultat.push(...l);
    raport.push(`${m.nume}: ${l.length} oferte`);
  } catch (e) {
    raport.push(`${m.nume}: EROARE ${e.message}`); // o eroare la un magazin nu oprește celelalte magazine
  }
}

if (!magazine.some((x) => x.activ)) {
  raport.push("Nicio sursă activată (data/magazine.json → activ:true). Catalogul rămâne neschimbat.");
} else if (rezultat.length) {
  writeFileSync(f("oferte.json"), JSON.stringify(rezultat, null, 1) + "\n");
  const istoric = JSON.parse(readFileSync(f("istoric-preturi.json"), "utf8"));
  writeFileSync(f("istoric-preturi.json"), JSON.stringify(actualizeazaIstoric(istoric, rezultat)) + "\n");
}
mkdirSync("rapoarte", { recursive: true });
const text = `Actualizare Pretino ${new Date().toISOString()}\n${raport.join("\n")}\n`;
writeFileSync("rapoarte/ultimul-raport.txt", text);
console.log(text);
