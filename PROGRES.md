# Pretino – progres (2026-11-02)

## Implementat și verificat (în mediul cloud, `bun scripts/test.js` → toate testele trec)
- Schelet independent: config proprie, date (categorii, magazine inactive, catalog gol, istoric, demo), generator static (home, categorii, magazine, sitemap, robots, 404, version.json), server preview pe portul 3100.
- Motor de actualizare (cadru cu adaptori per magazin, eroare izolată per magazin, istoric prețuri doar la schimbare).
- Publicare manuală `publica.js --live` (verificări main/curat/sincronizat, backup branch, wrangler, verificare online); workflow doar `workflow_dispatch`.
- Program Pretino (WPF) v1.0: preview, actualizare, teste, PUBLICĂ LIVE cu confirmare. **Sintaxa PowerShell nu a putut fi testată în cloud** – de verificat la prima rulare pe PC.
- Documentație: CLAUDE.md, README.md, acest fișier.

## Neverificat / lipsește
- Repo GitHub `glctv/pretino`: de creat (gol, privat) – fără el nu pot face push.
- Proiect Cloudflare Pages `pretino` + domeniul pretino.ro + token dedicat: de creat/atașat.
- Local pe PC: fără shell pe PC în această sesiune; fișierele sunt scrise în `E:\Claude\Pretino`. Nu s-au rulat git/bun/PowerShell pe PC.
- Adaptori magazine (eMAG, Altex, PC Garage…), conturi/feed-uri de afiliere, imagini produse.
- Copii de siguranță automate ale datelor (acum: ramuri `backup/*` la publicare).

## 2026-11-02 (seara) – program v1.5: surse de oferte
- Implementat și verificat cu fișiere de probă (`tests/fixtures`, fără rețea): adaptor Profitshare (feed CSV), adaptor 2Performant (feed CSV, Quicklink din cod afiliat + `unique` în `data/magazine.json`), filtrul „reducere reală” (≥5%, preț vechi > preț nou, în stoc, cu categorie), motorul pe surse cu izolarea erorilor și păstrarea ofertelor vechi.
- Magazine active: eMAG, ITGalaxy, Vexio, PCMadd, CITGrup, Dwyn, Techstar (Profitshare), evoMAG (2Performant). PC Garage: inactiv, fără adaptor (nu are feed; necesită citire din site, cu verificare anti-bot) – de făcut.
- LIPSEȘTE de la Laur: feed-urile și codurile PROPRII Pretino în `%LOCALAPPDATA%\Pretino\secrete.env` (`PRETINO_PROFITSHARE_FEEDS`, `PRETINO_TWOPERF_FEEDS`, `PRETINO_TWOPERF_AFF_CODE`) + `unique` evoMAG în `data/magazine.json`. Nu se refolosesc cele de la ConfigurațiePC.
- Neverificat pe date reale (formatul real al coloanelor din feed-uri poate cere ajustări).
