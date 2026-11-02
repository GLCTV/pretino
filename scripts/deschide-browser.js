// Deschide Chrome (sau Edge) NORMAL, fara depanare automata, cu profilul dedicat Pretino, ca sa treci tu manual verificarea anti-bot a PC Garage.
// Port fix de depanare (doar local): dupa ce treci verificarea, NU inchide fereastra – „Actualizeaza campanii si oferte” se ataseaza la ea si citeste din aceeasi sesiune.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { gasesteBrowsere, curataProfil, PORT_VERIFICARE } from "./lib/browser.js";

export const argumenteVerificare = (profil, url) => [`--user-data-dir=${profil}`, `--remote-debugging-port=${PORT_VERIFICARE}`, "--remote-debugging-address=127.0.0.1", "--no-first-run", "--no-default-browser-check", url];

export function deschide({ dir = ".", url = "https://www.pcgarage.ro/", env = process.env, lanseaza = spawn } = {}) {
  const exe = gasesteBrowsere(env)[0];
  if (!exe) throw new Error("nu am gasit Chrome sau Edge pe acest PC (poti seta PRETINO_BROWSER)");
  const profil = resolve(join(dir, ".pretino-local", "browser-profil"));
  curataProfil(profil);
  mkdirSync(profil, { recursive: true });
  const p = lanseaza(exe, argumenteVerificare(profil, url), { detached: true, stdio: "ignore" });
  p.unref?.();
  return { exe, profil };
}

if (import.meta.main) {
  try { const r = deschide(); console.log(`Browser deschis (${r.exe.split(/[\\/]/).pop()}). Treci verificarea si lasa fereastra deschisa, apoi porneste campaniile.`); } catch (e) { console.error(e.message); process.exit(1); }
}
