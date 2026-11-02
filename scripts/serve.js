// Server local pentru previzualizare: servește dist/ la http://localhost:3100 (alt port decât al altor proiecte).
import { PREVIEW_PORT } from "../src/config.js";
import { existsSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
const port = Number(process.env.PORT || PREVIEW_PORT);
const root = join(process.cwd(), "dist");
if (!existsSync(root)) { console.error("Nu există dist/. Rulează întâi: bun scripts/build.js [--demo]"); process.exit(1); }
Bun.serve({
  port,
  fetch(req) {
    let p = normalize(decodeURIComponent(new URL(req.url).pathname)).replace(/^(\.\.[\\/])+/, "");
    let f = join(root, p);
    if (!f.startsWith(root)) return new Response("Interzis", { status: 403 });
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) return new Response(Bun.file(join(root, "404.html")), { status: 404 });
    return new Response(Bun.file(f));
  },
});
console.log(`Previzualizare Pretino: http://localhost:${port}`);
