// Pornește / oprește temporar un magazin (data/magazine.json → activ). Folosit de butoanele din program.
// Un magazin oprit nu mai e citit la actualizare și ofertele lui nu mai apar pe site (rămân în catalog, gata de repornire).
// Utilizare: bun scripts/magazin.js <id> on|off
import { readFileSync, writeFileSync } from "node:fs";
const [id, stare] = process.argv.slice(2);
const f = new URL("../data/magazine.json", import.meta.url);
const l = JSON.parse(readFileSync(f, "utf8"));
const m = l.find((x) => x.id === id);
if (!m || !["on", "off"].includes(stare)) { console.log(`Utilizare: bun scripts/magazin.js <id> on|off (id necunoscut: ${id})`); process.exit(1); }
m.activ = stare === "on";
writeFileSync(f, JSON.stringify(l, null, 2) + "\n");
console.log(`${m.nume}: ${m.activ ? "PORNIT – ofertele lui revin pe site la următoarea publicare" : "OPRIT – ofertele lui dispar de pe site la următoarea publicare"}`);
