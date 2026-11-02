// Pagini informative si legale Pretino (sablon in romana; verifica-le inainte de publicare, nu sunt consultanta juridica).
import { SITE_NAME, SITE_URL, OPERATOR } from "../../src/config.js";
import { esc } from "./html.js";

const LIPSA = (e) => `[COMPLETEAZĂ: ${e}]`;
const op = () => esc(OPERATOR.nume || LIPSA("nume operator în src/config.js"));
const email = () => { const e = OPERATOR.email || LIPSA("email contact în src/config.js"); return OPERATOR.email ? `<a href="mailto:${esc(e)}">${esc(e)}</a>` : esc(e); };
const cui = () => (OPERATOR.cui ? ` (CUI/CIF ${esc(OPERATOR.cui)})` : "");
const DATA = "2 noiembrie 2026";

export const PAGINI_LEGALE = [
  { cale: "/despre/", titlu: "Despre Pretino", nume: "Despre", descriere: `Ce este ${SITE_NAME} și de unde vin ofertele.`, corp: () => `<h1>Despre ${esc(SITE_NAME)}</h1>
<p>${esc(SITE_NAME)} adună într-un singur loc ofertele și reducerile actuale din magazine online din România. Nu vindem produse: te trimitem către magazinul care le vinde, iar achiziția se face acolo.</p>
<h2>De unde vin ofertele</h2>
<p>Ofertele provin din feed-uri de produse puse la dispoziție prin rețele de afiliere și din paginile publice ale magazinelor. Ținem în catalog doar produsele care au un preț de referință mai mare decât prețul curent.</p>
<h2>Cum citești reducerile</h2>
<p>Prețul tăiat este prețul de referință afișat de magazin. Nu înseamnă automat cel mai mic preț din ultimele 30 de zile. Acolo unde apare „reducere afișată de magazin”, ne bazăm pe ce arată magazinul în acel moment.</p>
<h2>Afiliere</h2>
<p>Unele linkuri sunt linkuri de afiliere (marcate <em>sponsored</em>). Dacă cumperi după un astfel de link, putem primi un comision de la magazin. Prețul pentru tine nu se schimbă, iar comisionul nu influențează ce oferte afișăm.</p>
<p>Operator: ${op()}${cui()}. Contact: ${email()}.</p>` },
  { cale: "/contact/", titlu: "Contact", nume: "Contact", descriere: `Cum ne poți contacta pe ${SITE_NAME}.`, corp: () => `<h1>Contact</h1>
<p>Pentru întrebări, sesizări despre o ofertă greșită sau cereri legate de datele tale, scrie-ne la ${email()}.</p>
<p>Operator: ${op()}${cui()}.</p>
<p>Nu putem modifica prețuri, comenzi sau livrări: acestea țin de magazinul de unde cumperi.</p>` },
  { cale: "/confidentialitate/", titlu: "Politica de confidențialitate", nume: "Confidențialitate", descriere: `Cum tratăm datele personale pe ${SITE_NAME}.`, corp: () => `<h1>Politica de confidențialitate</h1>
<p>Ultima actualizare: ${DATA}. Operator de date: ${op()}${cui()}, contact ${email()}.</p>
<h2>Ce date prelucrăm</h2>
<p>${esc(SITE_NAME)} nu are conturi, formulare sau comentarii și nu îți cerem date personale. Site-ul este găzduit pe Cloudflare Pages, care poate înregistra tehnic adresa IP și date despre cerere (de exemplu pagina vizitată, data, browserul) pentru securitate și funcționare. Nu folosim instrumente de analiză sau publicitate proprii. Paginile încarcă un script al rețelei de afiliere Profitshare (de la l.profitshare.ro), care transformă linkurile către magazinele partenere în linkuri de afiliere și poate primi date tehnice despre vizită (de exemplu adresa IP și linkul apăsat).</p>
<h2>Linkuri către magazine și afiliere</h2>
<p>Când apeși pe „Vezi oferta” ajungi pe site-ul magazinului. Linkurile de afiliere trec prin serverele rețelelor de afiliere (de exemplu Profitshare sau 2Performant), care pot salva un identificator în browserul tău (cookie) ca să poată atribui o eventuală comandă. Aceste rețele și magazinele își au propriile politici de confidențialitate, pe care ți le recomandăm să le citești.</p>
<h2>Drepturile tale</h2>
<p>Conform GDPR ai dreptul de acces, rectificare, ștergere, restricționare, opoziție și portabilitate, precum și dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP, <a href="https://www.dataprotection.ro" rel="noopener">dataprotection.ro</a>). Ne poți scrie la ${email()}.</p>
<p>Pagina se poate modifica; versiunea curentă este mereu cea de pe ${esc(SITE_URL)}/confidentialitate/.</p>` },
  { cale: "/cookies/", titlu: "Politica de cookies", nume: "Cookies", descriere: `Ce cookie-uri sunt folosite pe ${SITE_NAME}.`, corp: () => `<h1>Politica de cookies</h1>
<p>Ultima actualizare: ${DATA}.</p>
<p>${esc(SITE_NAME)} nu setează cookie-uri proprii și nu folosește analiză sau publicitate proprie. Paginile încarcă însă scriptul Profitshare pentru linkurile de afiliere, care poate folosi cookie-uri sau stocare locală pentru a atribui comenzile.</p>
<p>Când apeși pe un link către un magazin, rețeaua de afiliere sau magazinul pot seta cookie-uri în browserul tău, pentru a atribui comanda și pentru funcționarea magazinului. Acestea sunt controlate de ei, nu de noi. Poți șterge sau bloca cookie-urile din setările browserului.</p>
<p>Întrebări: ${email()}.</p>` },
  { cale: "/termeni/", titlu: "Termeni și condiții", nume: "Termeni", descriere: `Termenii de utilizare ai ${SITE_NAME}.`, corp: () => `<h1>Termeni și condiții</h1>
<p>Ultima actualizare: ${DATA}. Site operat de ${op()}${cui()}.</p>
<ul>
<li>${esc(SITE_NAME)} are doar rol informativ: nu vindem produse și nu suntem parte în contractul dintre tine și magazin.</li>
<li>Prețurile, reducerile și stocul sunt preluate de la magazine și pot să se schimbe în orice moment. Verifică întotdeauna prețul final și condițiile în magazin înainte să cumperi.</li>
<li>Depunem eforturi ca datele să fie corecte, dar nu garantăm exactitatea sau disponibilitatea ofertelor.</li>
<li>Unele linkuri sunt de afiliere; putem primi un comision, fără cost suplimentar pentru tine.</li>
<li>Denumirile și mărcile magazinelor și ale produselor aparțin proprietarilor lor.</li>
<li>Nu ne asumăm răspunderea pentru conținutul sau politicile site-urilor către care trimitem.</li>
</ul>
<p>Contact: ${email()}.</p>` },
];
