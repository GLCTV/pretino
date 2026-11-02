// Secretele Pretino stau DOAR pe PC, in %LOCALAPPDATA%\Pretino\ (niciodata in repo). Format: CHEIE=valoare
//   secrete.env  = token/ID Cloudflare etc.
//   feeduri.env  = linkurile feed-urilor de produse si codurile de afiliat (PRETINO_PROFITSHARE_FEEDS, PRETINO_TWOPERF_FEEDS, PRETINO_TWOPERF_AFF_CODE)
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
export function dirSecrete() {
  const base = process.env.LOCALAPPDATA || join(process.env.HOME || ".", ".local", "share");
  return join(base, "Pretino");
}
export const caleSecrete = () => join(dirSecrete(), "secrete.env");
export function incarcaSecrete() {
  const out = {};
  for (const nume of ["secrete.env", "feeduri.env"]) {
    const f = join(dirSecrete(), nume);
    if (!existsSync(f)) continue;
    for (const l of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !l.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return out;
}
