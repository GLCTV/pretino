# Pretino.ro

Site static de oferte actuale din magazinele din România. Proiect independent (repo `glctv/pretino`, Cloudflare Pages `pretino`, domeniu pretino.ro). Generat cu Bun, fără dependențe externe.

## Structură
| Cale | Rol |
|---|---|
| `src/config.js` | adresa site-ului, numele proiectului Cloudflare, portul preview (3100) |
| `data/` | `oferte.json` (catalog), `istoric-preturi.json`, `magazine.json`, `categorii.json`, `demo-oferte.json` (doar preview) |
| `scripts/build.js` | generează `dist/` (pagini, sitemap, robots, 404, version.json) |
| `scripts/actualizare.js` | citește sursele magazinelor active (`scripts/surse/<id>.js`) și actualizează catalogul + istoricul |
| `scripts/serve.js` | server local pentru preview |
| `scripts/publica.js` | publicare LIVE (doar manual, cu `--live`) |
| `scripts/test.js` | teste (build, independență, secrete, workflow-uri, versiune) |
| `gui/Pretino.ps1`, `Pretino.bat` | programul Pretino (WPF) |
| `versiune-program.txt` | versiunea proprie a programului |

## Instalare (o dată)
1. Pune folderul proiectului pe PC (clonează `https://github.com/glctv/pretino`).
2. Rulează `Pretino.bat` – instalează Git și Bun dacă lipsesc și deschide programul.
3. Secretele pentru publicare, în `%LOCALAPPDATA%\Pretino\` (`secrete.env` pentru Cloudflare, `feeduri.env` pentru feed-uri/coduri de afiliat) (nu în repo):
   ```
   CLOUDFLARE_API_TOKEN=...
   CLOUDFLARE_ACCOUNT_ID=...
   ```
   (token Cloudflare cu drept „Cloudflare Pages: Edit”, dedicat Pretino). Chei de afiliere/feed-uri se adaugă tot aici.

## Actualizare
- Program: `Pretino.bat` face `git pull --ff-only` la pornire; modificările urcate pe `main` ajung singure.
- Oferte: buton „Actualizează oferte” (`bun scripts/actualizare.js`). Magazinele se activează în `data/magazine.json` (`activ: true`) și au adaptor în `scripts/surse/`.

## Preview
Buton „Pornește previzualizarea” (build + server la `http://localhost:3100`). Manual: `bun scripts/build.js --demo && bun scripts/serve.js`.

## Publicare
1. Modificările aprobate sunt pe `main`.
2. Butonul „PUBLICĂ LIVE” (sau `bun scripts/publica.js --live`): verifică ramura/curățenia, urcă `backup/…`, face build, `wrangler pages deploy`, verifică `version.json` online.
3. Push-ul pe `main` nu publică. `.github/workflows/deploy.yml` e doar manual (rezervă).

## Ce e unde
- **Local (PC):** codul și datele proiectului, `logs/`, `rapoarte/`, `.pretino-local/`, secretele din `%LOCALAPPDATA%\Pretino\`.
- **GitHub (`glctv/pretino`):** cod, `data/`, documentație, workflow-uri manuale, ramuri `backup/*`. Fără secrete.
- **Cloudflare:** proiect Pages `pretino` (direct upload), domeniul pretino.ro, token/ID-uri dedicate. Configurația Cloudflare NU e în repo; vezi `PROGRES.md` pentru starea ei.

## Campanii și oferte (eMAG / PC Garage)
Modul din program care citește paginile publice ale celor două magazine (campanii, liste de produse) și le salvează local pentru consultare. Nu publică nimic pe site. Comenzi: `bun scripts/campanii.js --campanii|--complet [--magazin emag|pcgarage|toate] [--reia]`, `--surse`, `--sursa-adauga <magazin> <url> [titlu]`, `--sursa-activeaza|--sursa-dezactiveaza|--sursa-sterge <id>`, `--campanie-manuala <magazin> <url> <titlu>`. Detalii în PROGRES.md.
