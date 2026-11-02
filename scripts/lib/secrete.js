// Secretele Pretino stau DOAR pe PC, în %LOCALAPPDATA%\Pretino\secrete.env (niciodată în repo). Format: CHEIE=valoare
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
export function caleSecrete() {
  const base = process.env.LOCALAPPDATA || join(process.env.HOME || ".", ".local", "share");
  return join(base, "Pretino", "secrete.env");
}
export function incarcaSecrete() {
  const f = caleSecrete();
  const out = {};
  if (!existsSync(f)) return out;
  for (const l of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !l.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
