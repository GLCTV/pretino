// Teste Pretino: build, independență față de alte proiecte, secrete, versiune program, istoric.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { actualizeazaIstoric } from "./lib/istoric.js";

let esecuri = 0;
const ok = (c, m) => { console.log((c ? "OK   " : "EȘEC ") + m); if (!c) esecuri++; };

function fisiere(d, acc = []) {
  for (const n of readdirSync(d)) {
    if (["node_modules", "dist", ".git", ".pretino-local", "logs", "rapoarte"].includes(n)) continue;
    const p = join(d, n);
    statSync(p).isDirectory() ? fisiere(p, acc) : acc.push(p);
  }
  return acc;
}
const toate = fisiere(".").map((f) => f.replace(/\\/g, "/")); // căi cu / și pe Windows
const cod = toate.filter((f) => /\.(js|ps1|bat|yml|json|html|css)$/.test(f) && !f.endsWith("scripts/test.js"));

// 1. Independență: codul nu citește/folosește resurse ale altui proiect
const interzise = /configuratiepc|pc-potrivit|ConfiguratiePC|PROFITSHARE_API|aff_code=647099a0b|GVYDBDQ9/i;
ok(!cod.some((f) => interzise.test(readFileSync(f, "utf8"))), "nicio referință la resursele ConfigurațiePC în cod/config");
// 2. Secrete
const secret = /(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|CLOUDFLARE_API_TOKEN\s*=\s*\S{10,})/;
ok(!toate.filter((f) => !f.endsWith("scripts/test.js")).some((f) => secret.test(readFileSync(f, "utf8"))), "niciun token/secret în fișiere");
ok(!toate.some((f) => f.endsWith(".env")), "niciun fișier .env în proiect");
// 3. Workflow-uri: doar manual
const wf = toate.filter((f) => f.includes(".github/workflows"));
ok(wf.every((f) => !/^\s*(push|schedule|pull_request):/m.test(readFileSync(f, "utf8"))), "workflow-urile nu pornesc la push/programat (doar workflow_dispatch)");
// 4. Versiune program
const v = readFileSync("versiune-program.txt", "utf8").trim();
ok(/^\d+\.\d+$/.test(v), `versiune program validă (${v})`);
// 5. Build real și demo
execSync("bun scripts/build.js", { stdio: "pipe" });
ok(JSON.parse(readFileSync("dist/version.json", "utf8")).demo === false, "build normal nu e demo");
ok(!/DEMO/.test(readFileSync("dist/index.html", "utf8")), "build normal fără conținut DEMO");
execSync("bun scripts/build.js --demo", { stdio: "pipe" });
ok(/DEMO/.test(readFileSync("dist/index.html", "utf8")) && /Disallow: \//.test(readFileSync("dist/robots.txt", "utf8")), "build demo marcat și blocat pentru Google");
execSync("bun scripts/build.js", { stdio: "pipe" }); // lasă dist curat (non-demo)
// 6. Istoric prețuri
let i = actualizeazaIstoric({}, [{ id: "x", pret: 10 }], "2026-11-02");
i = actualizeazaIstoric(i, [{ id: "x", pret: 10 }], "2026-11-03");
ok(i.x.length === 1, "istoric: preț neschimbat nu adaugă intrare");
i = actualizeazaIstoric(i, [{ id: "x", pret: 8 }], "2026-11-04");
ok(i.x.length === 2 && i.x[1].p === 8, "istoric: preț schimbat adaugă intrare");
ok(existsSync("CLAUDE.md") && existsSync("README.md") && existsSync("PROGRES.md"), "CLAUDE.md, README.md, PROGRES.md există");
console.log(esecuri ? `\n${esecuri} teste eșuate` : "\nToate testele au trecut");
process.exit(esecuri ? 1 : 0);
