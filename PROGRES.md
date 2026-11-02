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

## 2026-11-02 – program v1.17: PC Garage – prețuri vechi, reduceri, pagini „desigilate”
- Verificat în Chrome: pe paginile „desigilate” titlul e în `.bf_ptitle a` (înainte nu se recunoșteau), cu preț vechi `.bfp_old` și reducere în RON `.bf_pdiscount`; pe `/extra-reduceri-*/` reducerea e „X% reducere în cos” (`.bf_bonus_text`, păstrată exact, fără preț vechi); paginile de categorie (ex. `/notebook-laptop/`) nu afișează preț vechi, doar etichete (ex. „Cumpără acum la preț de Black Friday”), salvate în `etichete`. Câmp nou `conditie: "desigilat"`.

## 2026-11-02 – program v1.18: browser vizibil mai robust
- Raportat: la eMAG (HTTP 511) fereastra de browser se deschidea goală. Fereastra se maximizează și e adusă în față; în browser, conținutul real (pagină mare, fără marcaje de verificare) are prioritate față de statusul 511; după ~16 s de pagină goală se încarcă o dată pagina principală a magazinului; jurnalul afișează la fiecare ~10 s starea paginii (URL, status, lungime, titlu). NEREZOLVAT dacă eMAG afișează ceva ce trebuie făcut manual – de verificat pe PC.

## 2026-11-02 – program v1.19: pornirea browserului (fereastra goală `about:blank`)
- Cauză probabilă: o instanță Chrome rămasă din rularea anterioară (același profil Pretino) „fuzionează” cu cea nouă, care nu mai pornește cu depanare → fereastră goală și „browserul nu a pornit”. Acum: înainte de pornire se închid instanțele rămase pe profilul `.pretino-local\\browser-profil` și se șterg fișierele de blocare; port de depanare ales automat (fișierul `DevToolsActivePort`); se încearcă pe rând Chrome apoi Edge; la eșec, mesajul spune motivul (cod de ieșire / nu răspunde). La final browserul și procesele lui se închid.

## 2026-11-02 – program v1.20: eMAG prin browser
- Prima rulare eMAG reușită prin browserul vizibil: 8 campanii, 899 produse (din /resigilate; limita de 15 pagini/sursă a rămas „neverificat”). Paginile /nav/deals, /genius-deals, /guide/black-friday, /genius, /lps/* au apărut fără listă de produse (conținut încărcat cu JavaScript după încărcarea paginii) → acum browserul derulează pagina și așteaptă stabilizarea conținutului înainte de citire.

## v1.21
- Paginile eMAG fara lista de produse: se salveaza un esantion (rapoarte/esantioane-pagini/) pentru diagnostic; dupa derulare tot nu apar produse.

## v1.22
- Resigilate/desigilate/refurbished excluse complet (eMAG + PC Garage): surse scoase, produse si campanii vechi curatate la urmatoarea actualizare.

## v1.23
- eMAG: 13 surse implicite IT sortate dupa reducere (/categorie/sort-discountdesc/c, max 6 pagini fiecare, verificate in Chrome); surse implicite noi se adauga o singura data in configul existent. Paginile de prezentare (nav/deals, genius etc.) sunt doar informative.

## v1.24 – eMAG si PC Garage in catalog
- Sursa noua scripts/surse/campanii.js: citeste data/produse-campanii.json (modulul Campanii) si le duce in catalogul Pretino la „Actualizeaza oferte”. Doar produse cu pret de referinta afisat > pret (min 5%, max 60%), in stoc (PC Garage: stoc necunoscut acceptat daca nu e marcat epuizat), verificate in ultimele 3 zile, fara resigilate.
- Oferta are referintaMagazin=true: cardul spune „reducere afisata de magazin” (nu istoricul Pretino, nu „cel mai mic pret din 30 zile”). Link-uri oficiale, fara afiliere pentru eMAG/PC Garage pana exista un mecanism configurat.
- magazine.json: emag si pcgarage -> sursa „campanii”, active.

## v1.25
- Limita de reducere afisata pentru eMAG/PC Garage coborata la 60% (preturi de referinta nesigure, ex. mouse 192 RON cu referinta 1230 RON).

## v1.26 – categorii eMAG non-IT
- +33 surse eMAG (electrocasnice, casa si gradina, sport, copii, auto, moda, supermarket), sortate dupa reducere, max 4 pagini; fiecare sursa are categoriePretino, copiata pe campanie si folosita la catalog.
- Afiliere eMAG: contul Profitshare are doar website-ul „Configuratie PC"; pretino.ro trebuie adaugat de Laur ca website (si aprobat la programul eMAG), apoi „Genereaza script link automat" (app.profitshare.ro/automate-links) -> fragmentul se pune in site. De facut dupa ce exista.

## v1.27
- Validare website pretino.ro la Profitshare: tag meta profitshareid in antetul tuturor paginilor (scripts/build.js). Dupa PUBLICA LIVE: „valideaza website” in Profitshare; apoi script link automat pentru eMAG.

## v1.28
- Catalog real (3867 oferte) comis pe main; testul de independenta nu mai scaneaza catalogul generat dupa codul de afiliat (apare legitim in linkurile evoMAG), dar verifica ca nu contine nimic ConfiguratiePC.

## v1.29
- PUBLICA LIVE: daca singurele modificari necomise sunt catalogul generat (data/oferte.json, istoric-preturi.json), le comite si le urca pe main inainte de publicare.

## v1.30 – pagini legale
- Pagini noi: /despre/, /contact/, /confidentialitate/, /cookies/, /termeni/ (scripts/lib/legal.js, sablon RO), legate din subsolul tuturor paginilor.
- Operatorul se completeaza in src/config.js (OPERATOR: nume, email, cui optional). PUBLICA LIVE se opreste cat timp raman marcaje „[COMPLETEAZĂ”.
- De facut: cand se adauga scriptul Profitshare (dupa aprobare), verificat daca seteaza cookie-uri la incarcare -> bannerul de consimtamant + actualizat /cookies/.

- Email contact: contact@pretino.ro (Cloudflare Email Routing -> Gmail), pus in src/config.js. Mai lipseste OPERATOR.nume. Etapa 2 (trimitere din contact@) neinceputa.

## v1.31
- OPERATOR completat (Laur Cristian, contact@pretino.ro): paginile legale nu mai au marcaje, publicarea nu mai e blocata.

## v1.32 – panou de control (email + stare site)
- panou/: Worker Cloudflare propriu (primire contact@ -> D1 + copie Gmail, trimitere Resend, stare site, Cloudflare Access verificat in Worker). scripts/panou-deploy.js (pornit manual de Laur). Build emite dist/status.json. Teste: scripts/test-panou.js; Worker verificat local cu D1 simulat (postal-mime nu s-a putut instala in cloud, folosit stub).
- De facut de Laur: pasii din panou/README.md (Resend, deploy, Access, regula Email Routing -> Worker). Neverificat pe Cloudflare real: postal-mime ^2.4, deploy cu domeniu custom, Access.

## v1.33 – panou cu parola
- Panoul se deschide cu parola (PANOU_KEY, secret Cloudflare setat de Laur cu `--parola`), fara Zero Trust. Limitare incercari per IP, Cc/Bcc, retentie 6 luni, Reincarca/Iesi. Cloudflare Access ramane optional. Teste actualizate.

## v1.34
- panou-deploy: optiunea --login (ignora tokenul din secrete.env, foloseste wrangler login).

## v1.35 – eMAG scos
- Scos eMAG din catalog (1851 oferte), surse de campanii, magazine.json, cod de citire, program si teste. Raman PC Garage si retelele (Profitshare/2Performant). Local pe PC: data/campanii-surse.json, campanii.json si produse-campanii.json se curata singure la urmatoarea rulare a campaniilor.

## v1.36 – script Profitshare linkuri automate
- Scriptul Profitshare (linkuri automate, pretino.ro aprobat) pus in <head> pe toate paginile (nu in preview DEMO). Textele de confidentialitate/cookies il mentioneaza. Neverificat: ce cookie-uri seteaza efectiv; daca e nevoie de banner de consimtamant se adauga separat.

## v1.37
- Script Profitshare regenerat cu eMAG exclus din lista de advertiseri (v=1793640493).

## v1.38 – logo + cautare
- Logo nou (B „P care scade”, bicolor teal + portocaliu/chihlimbar), favicon/iconite/manifest, ghid in docs/logo/GHID-LOGO.md.
- Casuta de cautare in header (logo stanga), sugestii si pagina /cauta/ (noindex), index client-side dist/cauta-index.json (~600 KB, incarcat la focus). Testata local in browser. Neverificat: aspect pe telefoane reale.

## v1.39 – pagina mai larga
- Latimea maxima a continutului 1100 -> 1720 px, padding lateral fluid (12-32 px): pe monitoare mari apar 6 coloane de oferte.

## v1.40 – poze produse
- Pozele din feed-uri (campul imagine, 2016/2016 oferte) afisate pe carduri si in rezultatele cautarii: hotlink de pe serverele magazinelor, incarcare lenesa, fallback = fara poza daca nu se incarca. Neverificat: daca CDN-urile magazinelor permit hotlink (in sandbox nu am acces la ele; layout testat cu poze de proba). Confidentialitate actualizata.

## v1.41 – cache
- stil.css si cauta.js au ?v=<hash> in URL: dupa publicare, browserele nu mai folosesc stilul vechi din cache (se vedea pagina ingusta / poze scapate din card dupa v1.40).

## v1.42 – doar oferte cu preț redus
- Site-ul afișează doar oferte cu preț vechi > preț nou (filtru în build). Fără etichete PRP. Include cache-busting (v1.41).

## v1.43 – cupon PC Garage
- Cupon GVYDBDQ9 (1%) pe cardurile PC Garage (site + cautare), buton Copiaza, mentiune in subsol. Cuponul e cod de cont (nu secret), scos din lista interzisa din test.js.

## v1.44 – categorii PC Garage
- Descoperire automata a categoriilor din meniul PC Garage (ul.top_menu, ~290), separat de limita campaniilor (max 400). Listele de categorie au pret vechi taiat (verificat in Chrome pe /notebook-laptop/: 9 din 20 cu pret vechi). Nu s-a rulat inca pe PC.

## v1.45 – fix descoperire categorii
- In HTML-ul brut meniul PC Garage e ul id="top_menu" (clasa se adauga din JS); selectorul foloseste acum [id=top_menu] (parserul propriu nu suporta #id). Verificat in Chrome: HTML brut are top_menu, linkuri absolute.

## v1.46 – doar produse cu discount din categorii PC Garage
- Categoriile din meniu se citesc prin filtrul /<cat>/filtre/discount/ (verificat in Chrome: toate cardurile au pret vechi), max 30 pagini/categorie. Pretul vechi (.pbe-price-old) e in .pb-extra, frate al .product_box in .product_box_container: parseListare citeste acum containerul. Nu s-a rulat inca pe PC. De verificat: paginarea /pagina2/ pe filtre/discount si categoriile fara discount (pot da 404/gol).

## v1.47 – fix profil browser
- Edge nu putea crea .pretino-local\browser-profil (cale relativa); acum calea e absoluta (resolve) in lib/browser.js.

## v1.48 – ritm browser PC Garage
- In modul browser: pauza minima 3 s intre pagini (daca nu e fortata din test), flaguri contra incetinirii filelor in fundal. Profil propriu .pretino-local/browser-profil (nu se foloseste nimic din alt proiect). Cloudflare: verificarea nu se ocoleste; programul asteapta rezolvarea manuala.

## v1.49 – buton verificare manuala
- Buton „Deschide Chrome pentru verificare” (scripts/deschide-browser.js): Chrome normal, fara depanare automata, cu profilul Pretino; treci verificarea Cloudflare, inchizi fereastra, apoi rulezi campaniile. Nu garanteaza ca Cloudflare accepta; de verificat pe PC.

## v1.50 – atasare la Chrome verificat manual
- Butonul „Deschide Chrome pentru verificare” porneste Chrome cu port local fix 9333; campaniile se ataseaza la el (daca e deschis) in loc sa porneasca alt browser. Utilizatorul NU inchide fereastra. Fara fereastra deschisa, comportamentul vechi. Nu garanteaza ca Cloudflare accepta; de verificat pe PC.

## v1.51 – limita 10 pagini
- Categoriile PC Garage (filtrul Cu discount): maximum 10 pagini pe categorie (era 30).

## v1.52 – design nou (referinta Pretino.ro, tema inchisa + luminoasa)
- Site regenerat dupa designul de referinta: antet cu logo/cautare/favorite/tema, categorii cu iconite, subcategorii, filtre (Magazine, Pret, Reducere, Reseteaza), sortare, grila de 4 produse, carduri cu reducere/economie/„Vezi oferta”.
- Clasificare noua pe titlu (`scripts/lib/clasificare.js`), iconite proprii (`scripts/lib/iconite.js`), stil `src/stil.css`, font Montserrat local (OFL).
- Doar date reale (oferte cu pret redus); linkurile de afiliere pastrate (`sponsored nofollow noopener`). Responsive: telefon 2 produse/rand, filtre in panou; fara scroll orizontal 390–1920 px.
- STATUS: local, asteptam OK de la Laur inainte de main. Neverificat: imagini produse (in cloud nu exista), tema luminoasa pe toate paginile.

## v1.53 – numarul live PC Garage
- Pagina „Cumpara acum la pret de Black Friday” adaugata ca sursa fixa (se adauga o singura data in configuratia locala).
- La listele de categorie PC Garage se citeste numarul afisat de magazin (`.products-count`, ex. „18 produse”). Se iau exact atatea produse de sus in jos; cand totalul e atins nu se mai deschide pagina urmatoare (nici pagina goala de la final). Limita de 10 pagini ramane. Test adaugat.
