# Pretino.ro – reguli de lucru

Pretino.ro = site de oferte actuale din magazinele din România. Proiect **complet independent** de ConfigurațiePC.ro: folosește doar aceiași pași de lucru, NU aceleași resurse sau fișiere.

## Independență (obligatoriu la fiecare modificare)
- Pretino nu citește, nu importă și nu scrie fișiere, baze de date, imagini, scripturi, configurări, secrete sau identificatori ai ConfigurațiePC. Nu modifici nimic la ConfigurațiePC.ro / `pc-potrivit` / proiectul Cloudflare `configuratiepc` / domeniul configuratiepc.ro pentru a construi Pretino.
- Resurse proprii: folder local, repo GitHub `glctv/pretino`, proiect Cloudflare Pages `pretino` (domeniu pretino.ro), program cu versiune proprie (`versiune-program.txt`), catalog (`data/oferte.json`), imagini, istoric prețuri (`data/istoric-preturi.json`), magazine/afiliere (`data/magazine.json`, `scripts/surse/`), loguri (`logs/`), rapoarte (`rapoarte/`), copii de siguranță (ramuri `backup/…` + `.pretino-local/`), documentație.
- Secrete/variabile de mediu: doar pe PC în `%LOCALAPPDATA%\Pretino\secrete.env` (și în secretele GitHub/Cloudflare ale Pretino). Nu copia chei, tokenuri sau ID-uri din alt proiect. Nimic secret în repo.
- Eroarea sau publicarea unui site nu trebuie să afecteze celălalt. Fiecare proiect trebuie să poată fi mutat, restaurat și rulat separat. `bun scripts/test.js` verifică automat că în cod nu apar referințe la ConfigurațiePC și nu sunt secrete.
- Se pot folosi aceleași conturi GitHub și Cloudflare, dar repo/proiecte distincte.

## Flux de lucru
1. Implementezi și verifici modificările în proiectul Pretino (fără confirmări la fiecare pas pentru operațiuni locale și reversibile; fără cheltuieli, ștergeri de date importante sau acțiuni distructive pe producție).
2. Faci backup înainte de modificări de cod: `git push origin HEAD:refs/heads/backup/AAAAMMZZ-HHMM` (ora României; se păstrează ultimele 3).
3. Lucrezi pe ramură separată (nu pe `main`). Pregătești preview local, pornit din programul Pretino (buton „Pornește previzualizarea”, `http://localhost:3100`).
4. Când Laur spune „OK”: commit, integrare în `main`, push, apoi verifici (`git log`, `git status`, `bun scripts/test.js`).
5. **Publicarea LIVE o pornește Laur separat** (butonul „PUBLICĂ LIVE” → `scripts/publica.js --live`). Nu publici tu (nu rulezi `publica.js`, `wrangler pages deploy`, `deploy.yml`). După `main` spui: „Modificările sunt pe main. Poți apăsa PUBLICĂ LIVE din program.”
6. **Push-ul pe `main` NU publică automat.** Workflow-urile din `.github/workflows` sunt doar `workflow_dispatch`. Dacă Cloudflare Pages ar fi conectat la Git pentru build automat, se dezactivează (publicarea e direct-upload cu wrangler). Dacă vreodată push-ul ar putea publica, anunți ÎNAINTE de primul push.

## Reguli pentru program
- Modificare **exclusiv în program** (`gui/`, scripturi locale): fără preview de site. Modifici, verifici (`bun scripts/test.js` + rulare), **incrementezi versiunea programului Pretino** (`versiune-program.txt`: 1.0 → 1.1 → …, o singură dată pe actualizarea livrată) și spui ce ai schimbat.
- Modificare care afectează și **site-ul generat**: preview local înainte de aprobare; apoi „OK” → main → PUBLICĂ LIVE manual; crești și versiunea programului dacă s-a schimbat programul.

## Reguli de conținut
- Fără oferte/prețuri inventate: `data/demo-oferte.json` se folosește doar cu `--demo` (preview marcat, noindex, nepublicabil).
- Linkurile de afiliere au `rel="sponsored nofollow noopener"`; site-ul explică în subsol că poate câștiga comision.
- Fiecare cerere se aplică pe tot site-ul (toate paginile generate), nu doar într-un loc.

## Continuitate
- Progres: `PROGRES.md` (ce e făcut, verificat, ce lipsește). Pe PC: `E:\Claude\proiecte\pretino\NOTITE.md` + `PROGRES.md`.
- La sarcini lungi, salvează progresul înainte de a rămâne fără context.
