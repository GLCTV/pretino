// Continut editorial si reguli pentru paginile SEO extra: ghiduri, topuri de economii, branduri.
// Textele sunt originale si generale (fara preturi, modele sau promisiuni de stoc inventate). Datele din oferte vin la generare din catalog.
export const MIN_TOP = 8;       // „Top economii” pentru o categorie/subcategorie doar cu cel putin atatea oferte
export const N_TOP = 24;        // oferte afisate in topul unei pagini
export const MIN_BRAND = 15;    // o marca primeste pagina proprie doar cu cel putin atatea oferte

const fara = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Marci cunoscute (lista editoriala). Marca se recunoaste doar daca apare in primele 4 cuvinte ale titlului si titlul nu incepe cu un cuvant de accesoriu
// (ex. „Husa Samsung Galaxy” nu intra la Samsung). O marca fara destule oferte nu primeste pagina.
const MARCI = ["Redragon", "Logitech", "ASUS", "Genesis", "Samsung", "Corsair", "Razer", "Govee", "Xiaomi", "Axagon", "Techstar", "QwertyKey", "Apple", "HP", "Lenovo", "Acer", "MSI", "Dell", "Gigabyte", "Philips", "Bosch", "Tefal", "Sony", "LG", "Kingston", "TP-Link", "Dyson", "Rowenta", "Huawei", "Honor", "Anker", "Baseus", "Ugreen", "Hama", "Trust", "HyperX", "SteelSeries", "Cooler Master", "Noctua", "Arctic", "DeepCool", "Thermaltake", "Zotac", "AMD", "Intel", "Sapphire", "Western Digital", "Seagate", "Crucial", "Adata", "Sandisk", "Hikvision", "Dahua", "Ezviz", "Tesla", "Beko", "Gorenje", "Whirlpool", "Electrolux", "Zanussi", "Heinner", "Hausberg", "Zass", "Black+Decker", "Makita", "Dewalt", "Karcher", "Einhell", "Stanley", "Bosch Professional", "Brother", "Epson", "Canon", "Garmin", "Fitbit", "Jabra", "JBL", "Marshall", "Bose", "Edifier", "Realme", "Oppo", "OnePlus", "Motorola", "Nokia", "Google", "Microsoft", "Nintendo", "Playstation", "Ubiquiti", "Mikrotik", "Netgear", "D-Link", "Tenda", "Cudy", "Zyxel"];
const FARA_ACCESORII = new Set(["husa", "folie", "cablu", "incarcator", "adaptor", "protectie", "geanta", "rucsac", "suport", "curea", "sticla", "capac", "dock", "docking", "accesoriu", "accesorii", "kit", "set", "piese", "piesa", "bateria", "baterie", "carcasa", "telecomanda", "cheie", "tester", "pad", "mousepad", "ecran"]);
export const slugMarca = (nume) => fara(nume).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const RX = MARCI.map((nume) => ({ id: slugMarca(nume), nume, rx: new RegExp(`(^| )${fara(nume).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`) }));
export function marcaOfertei(titlu) {
  const t = fara(titlu).replace(/[^a-z0-9+\- ]+/g, " ").split(/\s+/).filter(Boolean);
  if (!t.length || FARA_ACCESORII.has(t[0])) return null;
  const inceput = t.slice(0, 4).join(" ");
  let best = null;
  for (const m of RX) { const x = inceput.match(m.rx); if (x && (best === null || x.index < best.poz || (x.index === best.poz && m.nume.length > best.m.nume.length))) best = { m, poz: x.index }; }
  return best ? { id: best.m.id, nume: best.m.nume } : null;
}

// Ghiduri: fiecare are o categorie/subcategorie asociata (pentru „oferte relevante” afisate din catalog).
export const GHIDURI = [
  { slug: "cum-verifici-o-reducere-reala", data: "2026-11-03", titlu: "Cum verifici dacă o reducere este reală", h1: "Cum verifici dacă o reducere este reală",
    descriere: "Listă scurtă de verificări înainte să cumperi un produs la reducere: prețul de referință, compararea între magazine, condițiile și costurile din coș.",
    intro: "Un preț tăiat nu garantează o ofertă bună. Iată câțiva pași simpli pe care îi poți face în câteva minute, indiferent de magazin.",
    cat: null, sectiuni: [
      { h: "1. Vezi ce înseamnă prețul tăiat", p: ["Prețul tăiat este prețul de referință ales de magazin. Poate fi prețul recomandat de producător sau un preț mai vechi al magazinului. Nu înseamnă automat că produsul a costat atât în ultima perioadă."] },
      { h: "2. Compară cu alte magazine", p: ["Caută același model exact, cu același cod de produs, în două sau trei magazine. Atenție la diferențe de configurație: două laptopuri cu același nume pot avea memorie sau stocare diferită."] },
      { h: "3. Verifică prețul final în magazin", p: ["Prețurile se pot schimba între momentul actualizării catalogului și momentul în care deschizi pagina magazinului. Prețul care contează este cel din coș."] },
      { h: "4. Adaugă costurile din coș", p: ["Verifică transportul, taxele de plată la livrare și eventualele servicii adăugate automat. Un preț mic poate deveni obișnuit după aceste costuri."] },
      { h: "5. Citește condiția produsului", p: ["Produsele resigilate, refurbished sau cu ambalaj deteriorat sunt marcate separat pe Pretino. Verifică garanția și politica de retur ale magazinului înainte de comandă."] },
      { h: "6. Dacă oferta pare prea bună", p: ["O reducere foarte mare la un produs recent sau căutat merită o verificare în plus: compară prețul cu cel din alte magazine și caută recenzii despre vânzător."] },
    ] },
  { slug: "cum-alegi-un-laptop-la-oferta", data: "2026-11-03", titlu: "Cum alegi un laptop la ofertă", h1: "Cum alegi un laptop la ofertă",
    descriere: "Ghid scurt pentru alegerea unui laptop: utilizare, procesor, memorie, stocare, ecran, autonomie și garanție, plus cum verifici o ofertă.",
    intro: "O ofertă bună la laptop înseamnă configurația potrivită pentru ce faci tu, nu doar un preț mic. Pașii de mai jos te ajută să compari corect.",
    cat: "electronice", sub: "laptopuri", sectiuni: [
      { h: "Începe cu utilizarea", p: ["Pentru birou, școală și navigare, un model simplu este suficient. Pentru jocuri, editare video sau programare ai nevoie de procesor mai puternic, mai multă memorie și, în cazul jocurilor, o placă video dedicată."] },
      { h: "Procesor și memorie RAM", p: ["Compară procesoarele din aceeași generație și gamă. Pentru uz general, 16 GB de memorie RAM este o alegere confortabilă; 8 GB poate fi suficient pentru activități simple. Verifică dacă memoria este lipită pe placă sau poate fi extinsă."] },
      { h: "Stocare", p: ["Un SSD face laptopul mult mai rapid decât un hard disk clasic. Alege capacitatea după fișierele pe care le ții local; poți completa cu stocare externă sau în cloud."] },
      { h: "Ecran", p: ["Verifică diagonala, rezoluția și tipul de panou. Un panou IPS oferă de obicei unghiuri bune de vizualizare. Pentru lucru în exterior contează și luminozitatea."] },
      { h: "Autonomie, greutate și conectică", p: ["Dacă îl muți des, greutatea și autonomia contează. Verifică porturile de care ai nevoie: USB, HDMI, cititor de carduri, conexiune pentru încărcare."] },
      { h: "Garanție și condiție", p: ["Verifică dacă produsul este nou, resigilat sau refurbished și ce garanție oferă magazinul. La modelele resigilate sau refurbished, condiția este marcată pe card în Pretino."] },
      { h: "Cum verifici oferta", p: ["Alege două sau trei modele care îți plac și compară-le după codul exact al produsului. Deschide pagina magazinului și verifică prețul final, stocul și termenul de livrare înainte de comandă."] },
    ] },
  { slug: "cum-alegi-un-monitor", data: "2026-11-03", titlu: "Cum alegi un monitor la ofertă", h1: "Cum alegi un monitor la ofertă",
    descriere: "Ce contează la un monitor: diagonală, rezoluție, rata de reîmprospătare, tipul de panou, conectică și ergonomie, plus cum compari ofertele.",
    intro: "Monitorul se potrivește după distanța de la care îl privești și după ce faci cel mai des: birou, jocuri sau editare foto.",
    cat: "electronice", sub: "monitoare-tv", sectiuni: [
      { h: "Diagonală și rezoluție", p: ["Diagonala și rezoluția trebuie alese împreună. O rezoluție mai mare oferă mai mult spațiu de lucru, dar cere o placă video mai capabilă în jocuri. Verifică și raportul de aspect: 16:9 sau ultrawide."] },
      { h: "Rata de reîmprospătare", p: ["Pentru birou este suficientă rata obișnuită. Pentru jocuri, o rată mai mare face mișcarea mai fluidă, dar ai nevoie și de o placă video care să o susțină."] },
      { h: "Tipul de panou", p: ["IPS oferă de obicei culori și unghiuri bune. VA are de obicei contrast mai bun. TN este mai rar întâlnit și apare mai ales la modele orientate spre viteză. Verifică specificațiile exacte ale modelului."] },
      { h: "Timp de răspuns și conectică", p: ["Timpul de răspuns contează în jocuri. Verifică porturile: HDMI, DisplayPort, USB-C. Dacă folosești laptopul, un port USB-C cu încărcare poate simplifica biroul."] },
      { h: "Ergonomie", p: ["Reglarea pe înălțime și înclinare te ajută la lucrul îndelungat. Verifică dacă are suport VESA, dacă vrei să-l montezi pe braț."] },
      { h: "Verifică oferta", p: ["Compară același model în mai multe magazine și verifică garanția. La monitoare, citește și politica magazinului privind pixelii defecți."] },
    ] },
  { slug: "cum-alegi-un-mouse-sau-o-tastatura-gaming", data: "2026-11-03", titlu: "Cum alegi un mouse sau o tastatură gaming", h1: "Cum alegi un mouse sau o tastatură gaming",
    descriere: "Ghid scurt pentru periferice gaming: senzor, greutate, conexiune, tipul de switch-uri, layout și cum compari ofertele din magazine.",
    intro: "La periferice contează confortul și potrivirea cu mâna ta, nu doar numărul de butoane sau luminile RGB.",
    cat: "electronice", sub: "periferice", sectiuni: [
      { h: "Mouse: formă, greutate și senzor", p: ["Alege forma după felul în care ții mouse-ul. Un mouse mai ușor obosește mai puțin mâna. Verifică senzorul și rezoluția maximă, dar nu alege doar după cifre mari; contează mai mult stabilitatea."] },
      { h: "Cu fir sau wireless", p: ["Modelele cu fir nu depind de baterie. Cele wireless sunt mai comode pe birou și pot fi foarte bune; verifică autonomia și tipul de conexiune."] },
      { h: "Tastatură: switch-uri", p: ["La tastaturile mecanice, switch-urile schimbă senzația și zgomotul. Dacă poți, încearcă diferite tipuri; dacă nu, citește descrierea producătorului și recenziile."] },
      { h: "Format și layout", p: ["Formatele compacte economisesc spațiu, dar pot elimina tastele numerice sau de navigare. Verifică și layout-ul: dacă scrii cu diacritice românești, alege un layout potrivit."] },
      { h: "Software și garanție", p: ["Unele periferice au aplicații pentru personalizare. Verifică dacă ai nevoie de ele și ce garanție oferă magazinul."] },
    ] },
  { slug: "produse-resigilate-si-refurbished", data: "2026-11-03", titlu: "Produse resigilate și refurbished: ce trebuie să verifici", h1: "Produse resigilate și refurbished: ce trebuie să verifici",
    descriere: "Ce înseamnă resigilat, desigilat și refurbished, ce întrebări să pui magazinului și cum le recunoști pe Pretino.",
    intro: "Produsele resigilate sau refurbished pot costa mai puțin, dar condițiile diferă de la magazin la magazin.",
    cat: null, sectiuni: [
      { h: "Ce înseamnă pe scurt", p: ["Un produs resigilat sau desigilat a avut ambalajul deschis, de exemplu la o returnare. Unul refurbished sau recondiționat a fost verificat sau reparat înainte de revânzare. Definițiile exacte le stabilește magazinul."] },
      { h: "Întreabă înainte de comandă", p: ["Verifică garanția, perioada de retur, ce accesorii include produsul și în ce stare estetică se află. Aceste informații trebuie să apară pe pagina produsului sau în politica magazinului."] },
      { h: "Compară cu produsul nou", p: ["Diferența de preț trebuie să merite riscul și condițiile mai puțin avantajoase. Verifică prețul aceluiași model nou, în același magazin și în altele."] },
      { h: "Cum le marcăm pe Pretino", p: ["Dacă titlul produsului arată că este resigilat, desigilat sau refurbished, cardul afișează această condiție lângă numele magazinului. Detaliile finale se verifică întotdeauna în magazin."] },
    ] },
];
