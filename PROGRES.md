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

## 2026-11-02 – feed-uri reale (v1.6–v1.12)
- Verificat pe date reale: Profitshare (ITGalaxy, Techstar, Vexio, Dwyn, PCMadd, CITGrup) și evoMAG (2Performant, link afiliat per produs din coloana `aff_code`) → 2001 oferte cu reducere reală. Categoriile sunt mapate după listele reale din feed-uri; produsele refurbished/second hand sunt excluse.
- eMAG: advertiserul NU oferă feed de produse (confirmat în Profitshare). PC Garage: nu e în Profitshare; are validare anti-bot Cloudflare.

## 2026-11-02 – program v1.13: modul „Campanii și oferte”
- Cod: `scripts/campanii.js` (orchestrator + CLI), `scripts/campanii/{emag,pcgarage,generic}.js`, `scripts/lib/{dom,http,istoric-campanii}.js`, teste în `scripts/test-campanii.js` (fișiere de probă în `tests/fixtures`, fetch simulat, fără rețea).
- Date locale (gitignored, nu se publică): `data/campanii-surse.json` (creat din `data/campanii-surse.default.json`), `data/campanii.json`, `data/produse-campanii.json`, `data/istoric-campanii.json`; progres `logs/campanii-progres.json`; raport `rapoarte/ultimul-raport-campanii.txt`; stare rulare `.pretino-local/campanii-rulare.json`; backup înainte de aplicare `.pretino-local/backup-campanii/` (ultimele 5).
- Interfață (program): selectare eMAG/PC Garage, lista surselor (adaugă/editează/activează/dezactivează/șterge URL), „Caută campanii”, „Actualizează campanii și oferte”, „Oprește” (salvează progresul), „Reia”, progres + contoare, lista campaniilor cu detalii și deschiderea paginii oficiale, raport final. Rulează în fundal.
- eMAG: structura cardurilor verificată în Chrome (nov. 2026): `.card-item` cu `data-offer-id/-product-id/-name/-url`, preț `.product-new-price`, preț afișat tăiat `<s>` în `.rrp-lp30d-content` (eticheta exactă neverificată – NU e tratat ca „cel mai mic preț din 30 zile”), reducere `.badge-discount`, paginare `/pN/c`. Vânzătorul (eMAG vs Marketplace) nu apare pe cardurile din liste → „Necunoscut”.
- PC Garage: validarea anti-bot (Cloudflare Turnstile, `/validare-acces/`) NU se completează și NU se ocolește → sursa e raportată „blocată”; structura paginilor neanalizată (doar date structurate JSON-LD/microdata); reîncercare sau introducere manuală.
- NEVERIFICAT: citirea HTTP simplă de pe PC pe emag.ro (eMAG poate bloca cererile fără browser → apare „blocat”; fără browser automat implementat); sintaxa PowerShell a noului panel (netestată în cloud); sursele descoperite automat.
- Nu publică nimic pe site; aprobarea de publicare și eligibilitatea pentru afiliere sunt câmpuri separate (implicit „fals”/„necunoscut”).

## 2026-11-02 – program v1.14: verificare anti-bot completata de Laur
- Când eMAG/PC Garage cer verificare anti-bot, modulul Campanii trece pe un browser vizibil (Chrome sau Edge, profil dedicat Pretino în `.pretino-local\browser-profil`, port local 127.0.0.1), programul sună și afișează un mesaj, Laur completează verificarea în fereastra de browser, iar citirea continuă singură. Programul NU rezolvă și NU ocolește verificarea. Dacă nu e completată în 10 minute → sursa e „blocată” (date păstrate, campanie „neverificată”). Opțiune CLI: `--browser auto|da|nu` (implicit `auto` = doar la blocare).
- Verificat: teste cu browser simulat + test manual cu Chromium real în cloud (pagină de validare care se deblochează după câteva secunde). NEVERIFICAT: Chrome/Edge de pe PC și verificarea reală Cloudflare Turnstile de la PC Garage; sintaxa PowerShell a mesajului de notificare.

## 2026-11-02 – program v1.15: cititor PC Garage
- Verificat în Chrome (nov. 2026) pe `/extra-reduceri-*/` și `/notebook-laptop/`: carduri `.product_box` (două variante: listă de campanie `bf_*` și listă de categorie), preț vechi `.bfp_old`/`.aq_prod_p_old`/`.pbe-price-old`, paginare `/paginaN/`. Prima rulare pe PC: 11 pagini de campanii descoperite prin browserul vizibil.
- Pagini citite fără listă de produse (home, regulamente) sunt raportate ca „informative”, nu ca eroare; pagina goală/neînțeleasă rămâne eroare. Entități HTML decodate în titluri; titlul paginii are prioritate pentru sursele descoperite.

## 2026-11-02 – program v1.16
- eMAG răspunde la cereri HTTP simple cu 511 (verificare anti-bot) → acum e tratat ca blocare și modulul trece pe browserul vizibil (ca la PC Garage), în loc de eroare simplă.
