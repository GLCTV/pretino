// Imagini de partajare (Telegram, TikTok, Instagram, Facebook) pentru cele mai bune oferte din catalog.
// Folosește catalogul generat (dist/cauta-index.json; dacă lipsește rulează build-ul) și Chrome/Edge în mod invizibil pentru captură.
// Rezultat: rapoarte/partajare/AAAA-LL-ZZ/NN-magazin.png (1080x1350) + texte.txt (descriere gata de lipit, cu link).
// Nu publică nimic nicăieri: imaginile le postezi tu.  Utilizare: bun scripts/imagini-partajare.js [--n 10]
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { gasesteBrowser } from "./lib/browser.js";

const ia = process.argv.indexOf("--n");
const N = Math.max(1, Math.min(30, Number(ia > 0 ? process.argv[ia + 1] : 10) || 10));
const SITE = "https://pretino.ro";

if (!existsSync("dist/cauta-index.json")) { console.log("Construiesc site-ul local (catalogul lipsește)..."); execSync("bun scripts/build.js", { stdio: "inherit" }); }
const idx = JSON.parse(readFileSync("dist/cauta-index.json", "utf8"));
const exe = gasesteBrowser();
if (!exe) { console.log("EROARE: nu am găsit Chrome sau Edge pe acest PC."); process.exit(1); }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lei = (n) => `${Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;
const red = (o) => Math.round((1 - o.p / o.v) * 100);
const imgMare = (u) => (/^https:\/\/\d\.grgs\.ro\/images\/products\/.+\/thumbnails\//.test(u) ? u.replace("/thumbnails/", "/") : u);

// aceeasi alegere ca „Ofertele zilei” de pe prima pagina: economie mare in lei, pret >= 150 lei, cu poza, maxim 2 oferte pe magazin
const peMag = {};
const alese = idx.o.filter((o) => o.v > o.p && o.p >= 150 && o.i && red(o) >= 15 && !o.x)
  .sort((a, b) => (b.v - b.p) - (a.v - a.p))
  .filter((o) => (peMag[o.m] = (peMag[o.m] ?? 0) + 1) <= 2).slice(0, N);
if (!alese.length) { console.log("Nicio ofertă potrivită în catalog."); process.exit(0); }

const logo = "data:image/svg+xml;base64," + Buffer.from(readFileSync("public/logo-dark.svg")).toString("base64");
const sablon = (o, nr) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:"Segoe UI",Montserrat,Arial,sans-serif;color:#fff;background:radial-gradient(90% 60% at 100% 0,#ef4444 0,transparent 60%),linear-gradient(160deg,#0a1916,#0e2a24 55%,#140c14);padding:56px 64px;display:flex;flex-direction:column}
.cap{display:flex;justify-content:space-between;align-items:center}.cap img{height:58px}
.et{font-weight:800;font-size:26px;letter-spacing:.12em;text-transform:uppercase;color:#fdc950}
.poza{margin:40px 0 0;height:560px;border-radius:40px;background:radial-gradient(120% 95% at 50% 40%,#fff 60%,#e8efed);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.poza img{max-width:86%;max-height:86%;object-fit:contain}
.red{position:absolute;left:0;top:36px;background:linear-gradient(135deg,#f87171,#dc2626);font-weight:900;font-size:64px;padding:10px 40px 10px 30px;border-radius:0 999px 999px 0;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.tit{margin-top:40px;font-size:40px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.mag{margin-top:14px;font-size:28px;color:#a7c4bd}
.pret{margin-top:auto;display:flex;align-items:baseline;gap:26px}.pret b{font-size:96px;font-weight:900;line-height:1}.pret s{font-size:40px;color:#9fb3ae}
.ec{margin-top:22px;display:inline-block;align-self:flex-start;background:#fdc950;color:#2b2105;font-weight:900;font-size:36px;padding:14px 30px;border-radius:999px}
.jos{margin-top:30px;display:flex;justify-content:space-between;font-size:24px;color:#a7c4bd}
</style></head><body>
<div class="cap"><img src="${logo}" alt=""><span class="et">Oferta zilei #${nr}</span></div>
<div class="poza"><img src="${esc(imgMare(o.i))}" referrerpolicy="no-referrer" onerror="this.style.display='none'"><span class="red">-${red(o)}%</span></div>
<div class="tit">${esc(o.t)}</div><div class="mag">la ${esc(idx.m[o.m] ?? o.m)}</div>
<div class="pret"><b>${lei(o.p)}</b><s>${lei(o.v)}</s></div>
<span class="ec">Economisești ${lei(o.v - o.p)}</span>
<div class="jos"><span>pretino.ro – oferte reale, verificate zilnic</span><span>Prețul se poate schimba</span></div>
</body></html>`;

const zi = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });
const out = resolve("rapoarte", "partajare", zi);
mkdirSync(out, { recursive: true });
const tmp = join(tmpdir(), `pretino-partajare-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const texte = [];
let reusite = 0;
alese.forEach((o, i) => {
  const nr = String(i + 1).padStart(2, "0"), html = join(tmp, `${nr}.html`), png = join(out, `${nr}-${o.m}.png`);
  writeFileSync(html, sablon(o, i + 1));
  const r = spawnSync(exe, [...(process.platform === "linux" ? ["--no-sandbox"] : []), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--window-size=1080,1350", "--virtual-time-budget=9000", `--screenshot=${png}`, pathToFileURL(html).href], { stdio: "ignore", timeout: 90000 });
  const ok = existsSync(png);
  if (ok) reusite++;
  console.log(`${ok ? "OK  " : "EȘEC"} ${nr}. -${red(o)}% ${o.t.slice(0, 70)} (${idx.m[o.m] ?? o.m})${ok ? "" : ` cod ${r.status}`}`);
  texte.push(`#${i + 1} ${o.t}\n🔥 -${red(o)}%: ${lei(o.p)} în loc de ${lei(o.v)} (economisești ${lei(o.v - o.p)}) la ${idx.m[o.m] ?? o.m}\n👉 ${o.u}\nMai multe oferte: ${SITE}/\n`);
});
writeFileSync(join(out, "texte.txt"), `Oferte Pretino ${zi} – texte gata de postat (prețurile se pot schimba; verifică înainte de postare)\n\n${texte.join("\n")}`);
rmSync(tmp, { recursive: true, force: true });
console.log(`\n${reusite} imagini în ${out}\nTextele pentru postare: ${join(out, "texte.txt")}`);
if (process.platform === "win32" && reusite) spawnSync("explorer.exe", [out], { stdio: "ignore" });
