// Material original: „Cum interpretăm reducerile pe Pretino”. Descrie funcționarea reală a programului (valorile vin din configurație, nu sunt scrise de mână).
import { SITE_NAME } from "../../src/config.js";
import { esc } from "./html.js";

export const CALE_GHID = "/cum-interpretam-reducerile/";

export function paginaGhid({ magazine, maxRed, pcgMax, pcgZile, zileVechi, cupoane }) {
  const nume = (id) => magazine.find((m) => m.id === id)?.nume ?? id;
  const limite = [
    ...Object.entries(maxRed).map(([id, p]) => `${esc(nume(id))}: peste ${p}%`),
    `PC Garage: peste ${pcgMax}%`,
  ];
  const cuponi = cupoane.map((c) => `<li><b>${esc(c.magazin)}</b>: codul <b>${esc(c.cod)}</b> (${esc(c.text)}) se introduce în coș. Prețul afișat pe Pretino nu include cuponul; reducerea se aplică în coș, conform condițiilor magazinului, care pot exclude unele produse.</li>`).join("");
  return {
    cale: CALE_GHID,
    titlu: "Cum interpretăm reducerile pe Pretino",
    nume: "Cum interpretăm reducerile",
    descriere: `De unde vin prețurile de pe ${SITE_NAME}, ce înseamnă prețul tăiat și ce oferte ascundem.`,
    corp: () => `<h1>Cum interpretăm reducerile pe Pretino</h1>
<p>${esc(SITE_NAME)} este un agregator: nu vinde produse, ci adună ofertele cu preț redus din magazine online din România. Pagina de față explică, pe scurt, cum ajung ofertele pe site și cum să citești prețurile.</p>
<h2>De unde vin prețurile</h2>
<p>Prețurile vin din feed-uri de produse oferite prin rețele de afiliere (Profitshare, 2Performant) și din paginile publice ale PC Garage, citite de programul Pretino. Catalogul se actualizează manual, nu în timp real: pe fiecare listă afișăm data ultimei verificări reușite. Magazinul poate schimba prețul între două actualizări, deci prețul final se verifică întotdeauna în magazin.</p>
<h2>Ce înseamnă prețul tăiat</h2>
<p>Prețul tăiat este prețul de referință transmis sau afișat de magazin. Nu este calculat de Pretino și nu înseamnă automat cel mai mic preț din ultimele 30 de zile. Păstrăm în catalog doar produsele la care prețul de referință este mai mare decât prețul curent. Pretino a început să păstreze un istoric propriu al prețurilor, dar acesta este încă scurt și nu îl folosim ca să confirmăm reducerile.</p>
<h2>Ce oferte nu afișăm</h2>
<ul>
<li><b>Reduceri foarte mari.</b> Un preț de referință umflat nu face o reducere reală, așa că ascundem reducerile peste o limită stabilită pentru fiecare magazin (${limite.join("; ")}).</li>
<li><b>Date prea vechi.</b> Ofertele unei surse care nu a fost verificată cu succes de mai mult de ${zileVechi} zile nu mai apar pe site. Datele PC Garage mai vechi de ${pcgZile} zile nu intră în catalog.</li>
<li><b>Duplicate certe.</b> Dacă același magazin are același produs, cu același titlu și aceleași prețuri, îl afișăm o singură dată. Nu unim produse diferite doar pentru că titlurile seamănă.</li>
</ul>
<p>Produsele resigilate sau refurbished sunt marcate clar pe card.</p>
<h2>Cupoane</h2>
${cuponi ? `<ul>${cuponi}</ul>` : "<p>În prezent nu afișăm cupoane.</p>"}
<h2>Afiliere</h2>
<p>Unele linkuri sunt linkuri de afiliere (marcate <em>sponsored</em>), iar pentru unele magazine putem primi un comision dacă cumperi. Prețul pentru tine nu se schimbă, iar comisionul nu decide ce oferte afișăm.</p>
<p>Mai multe în paginile <a href="/despre/">Despre</a> și <a href="/contact/">Contact</a>. Dacă observi o ofertă greșită, scrie-ne.</p>`,
  };
}
