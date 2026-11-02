// Instaleaza / actualizeaza panoul de control Pretino (Worker Cloudflare „pretino-panou", baza D1 „pretino-mail"). Pornit DOAR manual de Laur:
//   bun scripts/panou-deploy.js --deploy            (instaleaza / actualizeaza)
//   bun scripts/panou-deploy.js --deploy --resend   (+ iti cere cheia Resend si o salveaza ca secret in Cloudflare)
// Autentificare Cloudflare: CLOUDFLARE_API_TOKEN din %LOCALAPPDATA%\Pretino\secrete.env (daca are drepturi pentru Workers/D1/DNS) sau `wrangler login`.
// Setari neSecrete din secrete.env: ACCESS_TEAM_DOMAIN (ex. nume.cloudflareaccess.com) si ACCESS_AUD (din aplicatia Access). Fara ele panoul refuza orice acces.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { incarcaSecrete } from "./lib/secrete.js";

const stop = (m) => { console.error("OPRIT: " + m); process.exit(1); };
if (!process.argv.includes("--deploy")) stop("lipseste --deploy (se porneste doar manual).");
const secrete = incarcaSecrete();
const env = { ...process.env, ...(secrete.CLOUDFLARE_API_TOKEN ? { CLOUDFLARE_API_TOKEN: secrete.CLOUDFLARE_API_TOKEN } : {}), ...(secrete.CLOUDFLARE_ACCOUNT_ID ? { CLOUDFLARE_ACCOUNT_ID: secrete.CLOUDFLARE_ACCOUNT_ID } : {}) };
const run = (cmd, args, { cwd = "panou", capture = false, input } = {}) => {
  const r = spawnSync(cmd, args, { cwd, env, shell: true, encoding: "utf8", stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit", input });
  if (r.status !== 0) stop(`${cmd} ${args.join(" ")} a esuat.`);
  return r.stdout ?? "";
};
const wr = (args, o) => run("bunx", ["wrangler@latest", ...args], o);

console.log("1/5 Dependinte panou…");
run("bun", ["install"]);

console.log("2/5 Baza de date D1 «pretino-mail»…");
const listeaza = () => { try { return JSON.parse(wr(["d1", "list", "--json"], { capture: true })); } catch { return []; } };
let db = listeaza().find((d) => d.name === "pretino-mail");
if (!db) { wr(["d1", "create", "pretino-mail"]); db = listeaza().find((d) => d.name === "pretino-mail"); }
if (!db?.uuid) stop("nu am gasit baza D1 pretino-mail dupa creare.");
wr(["d1", "execute", "pretino-mail", "--remote", "--file=schema.sql"]);

console.log("3/5 Configuratie…");
const sablon = readFileSync("panou/wrangler.sablon.jsonc", "utf8").replace(/^\s*\/\/.*$/gm, "");
const cfg = sablon.replace("__DATABASE_ID__", db.uuid).replace("__ACCESS_TEAM_DOMAIN__", secrete.ACCESS_TEAM_DOMAIN ?? "").replace("__ACCESS_AUD__", secrete.ACCESS_AUD ?? "");
writeFileSync("panou/wrangler.local.jsonc", cfg);
if (!secrete.ACCESS_TEAM_DOMAIN || !secrete.ACCESS_AUD) console.warn("AVERTISMENT: lipsesc ACCESS_TEAM_DOMAIN / ACCESS_AUD din secrete.env - panoul va refuza accesul pana le completezi si rulezi din nou.");

if (process.argv.includes("--resend")) {
  console.log("4/5 Cheia Resend: lipeste-o cand ti se cere (nu se afiseaza si nu se salveaza in repo).");
  wr(["secret", "put", "RESEND_API_KEY", "-c", "wrangler.local.jsonc"]);
} else console.log("4/5 Cheia Resend: sarita (foloseste --resend pentru a o seta).");

console.log("5/5 Publicare Worker…");
wr(["deploy", "-c", "wrangler.local.jsonc"]);
console.log("\nGata. Panou: https://panou.pretino.ro (dupa ce creezi aplicatia Cloudflare Access). Regula de email contact@ trebuie sa trimita catre Worker-ul pretino-panou.");
