// PUBLICARE LIVE Pretino – pornită DOAR manual (butonul „PUBLICĂ LIVE” din program). Nu rulează la push.
// Cere --live explicit; refuză build demo, ramuri diferite de main, modificări necomise sau main nepus pe GitHub.
import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { SITE_URL, WORKERS_DEV_URL } from "../src/config.js";
import { incarcaSecrete, caleSecrete } from "./lib/secrete.js";

const sh = (c) => execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const stop = (m) => { console.error("OPRIT: " + m); process.exit(1); };
if (!process.argv.includes("--live")) stop("lipsește --live (publicarea se pornește doar manual din program).");

if (sh("git rev-parse --abbrev-ref HEAD") !== "main") stop("nu ești pe ramura main.");
if (sh("git status --porcelain")) stop("există modificări necomise.");
sh("git fetch origin main");
if (sh("git rev-parse HEAD") !== sh("git rev-parse origin/main")) stop("main local diferă de origin/main (fă push/pull întâi).");

const secrete = incarcaSecrete();
if (!secrete.CLOUDFLARE_API_TOKEN || !secrete.CLOUDFLARE_ACCOUNT_ID) stop(`lipsesc CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID din ${caleSecrete()}`);

const env = { ...process.env, ...secrete };
const rulez = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: true }); if (r.status !== 0) stop(`${cmd} ${args.join(" ")} a eșuat.`); };

const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
try { sh(`git push origin HEAD:refs/heads/backup/${ts.slice(0, 8)}-${ts.slice(8, 12)}`); console.log("Backup urcat: backup/" + ts); } catch (e) { console.warn("Avertisment: backupul nu s-a putut urca."); }

rulez("bun", ["scripts/build.js"]);
if (JSON.parse(readFileSync("dist/version.json", "utf8")).demo) stop("build demo – nu se publică.");
rulez("bunx", ["wrangler@latest", "deploy"]);

const sha = sh("git rev-parse HEAD");
for (let i = 0; i < 12; i++) {
  for (const base of [SITE_URL, WORKERS_DEV_URL]) {
    try {
      const j = await (await fetch(`${base}/version.json?x=${Date.now()}`, { signal: AbortSignal.timeout(10000) })).json();
      if (j.sha === sha) { console.log(`Verificat online pe ${base}: ${sha.slice(0, 7)}`); process.exit(0); }
    } catch {}
  }
  await new Promise((r) => setTimeout(r, 5000));
}
stop("publicat, dar versiunea nouă nu s-a văzut încă online (verifică în Cloudflare).");
