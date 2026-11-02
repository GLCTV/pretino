# SEO Pretino.ro – strategie si verificari

Toate regulile de mai jos sunt in generator (`scripts/build.js`, `src/seo.js`, `scripts/lib/ghid.js`, `public/cauta.js`, `public/_headers`), deci raman dupa fiecare actualizare de catalog. `bun scripts/test.js` (fisierul `scripts/test-seo.js`) le verifica pe site-ul generat.

## Pagini indexabile / utilitare
- **Indexabile** (canonical propriu, in sitemap doar prima pagina a listei): `/`, `/categorie/<cat>/`, `/categorie/<cat>/<sub>/` (doar subcategorii cu cel putin `MIN_SUB_PAGINA`=15 oferte), `/magazin/<id>/` (doar cu cel putin `MIN_MAGAZIN_INDEX`=5 oferte; sub prag pagina exista, e `noindex` si nu e in sitemap), `/despre/`, `/contact/`, `/cum-interpretam-reducerile/`, paginile legale.
- **Paginare**: `/…/pagina-N/` (48 produse/pagina, HTML real, linkuri `<a href>` inainte/inapoi si numerotate, canonical propriu, titlu cu „– pagina N”). Pagina 1 nu are `/pagina-1/`; peste ultima pagina = 404 (nu se genereaza). Paginile 2+ nu sunt in sitemap, dar sunt linkate si indexabile.
- **Utilitare**: `/cauta/`, `/favorite/` = `noindex`, fara sitemap.
- **Filtre/sortare** (`?m=`, `?min=`, `?max=`, `?red=`, `?sort=`, `?sub=`): functioneaza in browser; pagina statica are acelasi canonical (fara parametri), deci variantele sunt echivalente. Fara `Disallow` in robots.txt (ca Google sa poata citi canonical/noindex). Parametrii invalizi se ignora.
- **Vechiul `?sub=<sub>`**: cand subcategoria are pagina proprie, JavaScript face `location.replace` catre ruta noua, pastrand ceilalti parametri. Redirect 301 pe server nu se poate cu `_redirects` (nu potriveste parametri de interogare); optional, regula in Cloudflare (vezi mai jos).
- **Previzualizare**: `--demo` => `noindex` pe toate paginile + `Disallow: /` + banner. Build-ul normal nu contine `noindex` pe paginile indexabile (test). `*.pages.dev` primeste `X-Robots-Tag: noindex` din `public/_headers`.
- **lastmod**: nu se foloseste (nu avem o data reala de modificare pe pagina).

## Politica ofertelor
- Se afiseaza doar oferte cu pret de referinta > pret curent.
- Reduceri peste limita magazinului ascunse: evoMAG `reducereMaxProcent` (data/magazine.json), PC Garage 60% (`scripts/surse/campanii.js`).
- **Date vechi**: `data/actualizat.json` pastreaza data ultimei verificari REUSITE pe sursa (la eroare ramane data veche). Ofertele unei surse neverificate de peste `ZILE_DATE_VECHI`=7 zile nu se mai afiseaza. PC Garage: produse mai vechi de 3 zile nu intra in catalog. Data afisata pe site = cea mai veche verificare dintre sursele cu oferte.
- Duplicate certe (acelasi magazin + titlu + preturi) afisate o singura data. Resigilat/refurbished marcate pe card. Cupoane: textul spune ca pretul afisat nu include cuponul.
- Pretul de referinta nu e numit „cel mai mic pret din 30 de zile”.

## Verificari care necesita contul tau / dupa publicare
1. **www → apex**: `https://www.pretino.ro/` serveste acelasi site (200, fara redirect). Canonical-ul indica `https://pretino.ro/`, dar e recomandat 301. Cloudflare → Rules → Redirect Rules: *Hostname equals www.pretino.ro* → Dynamic `concat("https://pretino.ro", http.request.uri.path)` (pastreaza query), 301.
2. **HTTP → HTTPS**: Cloudflare → SSL/TLS → Edge Certificates → *Always Use HTTPS* = On (verifica cu `curl -I http://pretino.ro/` → 301 catre https).
3. **Bot protection**: Cloudflare → Security → Bots: *Verified bots* (Googlebot) sa nu fie blocati; nu dezactiva protectiile global.
4. **Search Console**: adauga proprietatea (Domain), trimite `https://pretino.ro/sitemap.xml`, URL Inspection pe `/`, o categorie, `/categorie/electronice/laptopuri/`, `/categorie/electronice/pagina-2/`, un magazin. Noteaza baza: afisari, clicuri, CTR, pagini.
5. **Rich Results Test / Schema validator** pe `/` (WebSite, Organization) si o subcategorie (BreadcrumbList).
6. **Core Web Vitals reale (CrUX/PageSpeed)**: domeniul nou poate sa nu aiba date suficiente; masuratorile Lighthouse/laborator nu sunt date de utilizare reala.
7. Redirect 301 optional pentru `?sub=` vechi (Redirect Rules cu *Query String contains sub=laptopuri*) – util doar daca Google a descoperit astfel de URL-uri.
