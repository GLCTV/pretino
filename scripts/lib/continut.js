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

// Elemente suplimentare pe ghid (fara cifre de pret inventate): pictograma din hero, verdict rapid, casete pe sectiune,
// tabel, oferte din catalog dupa o sectiune, calculator, checklist si intrebari frecvente.
// `casete`: { <index sectiune>: [{ t: "tip"|"atentie", x: "text" }] }, `oferteDupa`: indexul sectiunii dupa care apar 3 oferte.
export const GHID_EXTRA = {
  "cum-verifici-o-reducere-reala": {
    icoana: "lampa",
    verdict: "Prețul tăiat este doar un punct de pornire. Compară același model în 2–3 magazine și judecă după prețul din coș, nu după procentul afișat.",
    casete: {
      0: [{ t: "atentie", x: "Un procent mare de reducere nu spune nimic despre cât a costat produsul cu adevărat în ultimele săptămâni." }],
      1: [{ t: "tip", x: "Caută după codul exact al produsului (model sau EAN), nu după nume. Numele pot arăta la fel la configurații diferite." }],
      3: [{ t: "tip", x: "Adaugă transportul la preț înainte de comparație. Uneori un magazin cu preț puțin mai mare, dar cu livrare gratuită, iese mai ieftin." }],
      5: [{ t: "atentie", x: "Dacă vânzătorul îți cere plata în afara platformei sau a magazinului, renunță la comandă." }],
    },
    calculator: true,
    checklist: { titlu: "Listă de verificare înainte de comandă", pasi: ["Am înțeles ce preț de referință folosește magazinul", "Am comparat același cod de produs în cel puțin două magazine", "Am verificat prețul final din coș, cu transport cu tot", "Am citit garanția și politica de retur", "Am verificat condiția produsului: nou, resigilat sau refurbished", "Am verificat stocul și termenul de livrare"] },
    faq: [
      { q: "Prețul tăiat înseamnă că produsul a costat atât în ultima lună?", a: "Nu neapărat. Prețul tăiat este prețul de referință ales de magazin: poate fi prețul recomandat de producător sau un preț mai vechi. Pentru siguranță, compară cu alte magazine." },
      { q: "Cum îmi dau seama dacă o reducere mare este suspectă?", a: "Compară prețul cu cel din alte magazine, pentru același cod de produs, și verifică vânzătorul. O diferență foarte mare față de restul pieței merită o verificare în plus." },
      { q: "Ce preț contează, cel de pe Pretino sau cel din magazin?", a: "Cel din magazin. Prețurile se pot schimba între actualizarea catalogului și momentul în care deschizi pagina magazinului, așa că verifică prețul final în coș." },
    ],
  },
  "cum-alegi-un-laptop-la-oferta": {
    icoana: "laptop",
    verdict: "Alege întâi utilizarea, apoi bugetul. Pentru majoritatea oamenilor contează mai mult un SSD, 16 GB de RAM și un ecran bun decât cifrele mari la procesor.",
    casete: {
      1: [{ t: "tip", x: "Verifică dacă memoria RAM poate fi extinsă. La unele modele subțiri este lipită pe placă și nu se mai poate schimba." }],
      2: [{ t: "tip", x: "Un SSD se simte în orice utilizare: pornire rapidă, aplicații care se deschid repede. Merită prioritate față de alte specificații." }],
      3: [{ t: "atentie", x: "Rezoluția mare pe un ecran mic nu înseamnă automat calitate. Verifică și tipul de panou și luminozitatea." }],
      5: [{ t: "atentie", x: "La produsele resigilate sau refurbished, cere în scris garanția și perioada de retur." }],
    },
    tabel: { dupa: 1, titlu: "Orientare după utilizare", cap: ["Utilizare", "Memorie RAM", "Stocare", "Placă video"], randuri: [
      ["Birou, școală, navigare", "8–16 GB", "SSD", "Integrată"],
      ["Programare, multitasking", "16–32 GB", "SSD", "Integrată sau dedicată"],
      ["Editare foto și video", "16–32 GB", "SSD mare", "Dedicată recomandată"],
      ["Jocuri", "16 GB sau mai mult", "SSD", "Dedicată"],
    ], nota: "Orientativ: cerințele reale depind de aplicațiile pe care le folosești." },
    oferteDupa: 2,
    checklist: { titlu: "Listă de verificare pentru laptop", pasi: ["Știu pentru ce îl folosesc", "Are SSD", "Are suficientă memorie RAM pentru utilizarea mea", "Am verificat tipul și luminozitatea ecranului", "Are porturile de care am nevoie", "Am verificat greutatea și autonomia", "Am verificat garanția și condiția produsului"] },
    faq: [
      { q: "Câtă memorie RAM am nevoie la un laptop?", a: "Pentru activități simple, 8 GB pot fi suficienți. Pentru confort la multitasking, programare sau editare, 16 GB sunt o alegere mai sigură." },
      { q: "SSD sau HDD?", a: "SSD, în aproape toate cazurile: laptopul pornește și răspunde mult mai repede. Un HDD are sens doar ca stocare suplimentară, ieftină, pentru fișiere mari." },
      { q: "Merită un laptop resigilat sau refurbished?", a: "Poate, dacă diferența de preț este mare și garanția este clară. Compară cu produsul nou și citește condițiile magazinului înainte de comandă." },
    ],
  },
  "cum-alegi-un-monitor": {
    icoana: "monitor",
    verdict: "Alege diagonala și rezoluția împreună, apoi panoul și rata de reîmprospătare după ce faci: birou, jocuri sau editare foto.",
    casete: {
      0: [{ t: "tip", x: "Stai la aproximativ o lungime de braț de ecran? Atunci diagonalele mijlocii sunt de obicei mai confortabile decât cele foarte mari." }],
      1: [{ t: "atentie", x: "Rata mare de reîmprospătare se vede doar dacă și placa video poate produce suficiente cadre pe secundă." }],
      3: [{ t: "tip", x: "Dacă lucrezi cu un laptop, un monitor cu USB-C și încărcare printr-un singur cablu simplifică biroul." }],
    },
    tabel: { dupa: 2, titlu: "Tipuri de panou pe scurt", cap: ["Panou", "Puncte tari", "De ținut minte"], randuri: [
      ["IPS", "Culori bune, unghiuri largi de vizualizare", "Contrastul poate fi mai slab în încăperi întunecate"],
      ["VA", "Contrast bun, negru adânc", "Poate avea răspuns mai lent la unele modele"],
      ["TN", "Răspuns rapid, preț mic", "Unghiuri de vizualizare mai înguste"],
    ], nota: "Verifică mereu specificațiile exacte ale modelului, nu doar tipul de panou." },
    oferteDupa: 1,
    checklist: { titlu: "Listă de verificare pentru monitor", pasi: ["Am ales diagonala potrivită pentru distanța de privit", "Rezoluția se potrivește cu placa video și cu ce fac", "Am verificat tipul de panou", "Are porturile de care am nevoie", "Poate fi reglat pe înălțime sau are suport VESA", "Am verificat garanția și politica privind pixelii defecți"] },
    faq: [
      { q: "Ce rată de reîmprospătare îmi trebuie?", a: "Pentru birou este suficientă rata obișnuită. Pentru jocuri, o rată mai mare face mișcarea mai fluidă, cu condiția ca placa video să o susțină." },
      { q: "IPS, VA sau TN?", a: "IPS pentru culori și unghiuri, VA pentru contrast, TN pentru viteză la preț mic. Alege după utilizare și verifică specificațiile exacte." },
      { q: "Ce înseamnă suport VESA?", a: "Un standard de prindere pe perete sau pe braț de monitor. Este util dacă vrei să eliberezi spațiu pe birou." },
    ],
  },
  "cum-alegi-un-mouse-sau-o-tastatura-gaming": {
    icoana: "mouse",
    verdict: "Confortul bate cifrele. Alege un mouse care ți se potrivește în mână și o tastatură cu senzația de tastare pe care o preferi.",
    casete: {
      0: [{ t: "tip", x: "Mâna mare sau mică, prindere palmă, gheare sau vârfuri: forma contează mai mult decât rezoluția senzorului." }],
      1: [{ t: "atentie", x: "La modelele wireless verifică autonomia și tipul de conexiune. Un dongle USB nu este același lucru cu Bluetooth." }],
      3: [{ t: "tip", x: "Dacă scrii mult în română, verifică layout-ul și dacă tastele cu diacritice sunt accesibile." }],
    },
    tabel: { dupa: 2, titlu: "Switch-uri mecanice pe scurt", cap: ["Tip", "Senzație", "Potrivit pentru"], randuri: [
      ["Liniar", "Apăsare fină, fără prag", "Jocuri, tastare rapidă"],
      ["Tactil", "Prag ușor de simțit la apăsare", "Scris și jocuri"],
      ["Clicky", "Prag tactil și sunet distinct", "Scris, dacă zgomotul nu deranjează"],
    ], nota: "Denumirile comerciale diferă între producători; citește descrierea modelului." },
    oferteDupa: 1,
    checklist: { titlu: "Listă de verificare pentru periferice", pasi: ["Forma mouse-ului se potrivește cu mâna mea", "Greutatea este confortabilă", "Am ales între cu fir și wireless", "Switch-urile tastaturii se potrivesc cu felul meu de a tasta", "Formatul și layout-ul tastaturii se potrivesc cu nevoile mele", "Am verificat garanția"] },
    faq: [
      { q: "Mouse cu fir sau wireless pentru jocuri?", a: "Ambele pot fi foarte bune. Modelele cu fir nu depind de baterie; cele wireless sunt mai comode, dar cer atenție la autonomie și la tipul de conexiune." },
      { q: "Ce rezoluție (DPI) este suficientă?", a: "Cifrele foarte mari sunt mai ales marketing. Contează stabilitatea senzorului și cât de bine ți se potrivește sensibilitatea." },
      { q: "Merită o tastatură mecanică?", a: "Dacă tastezi mult sau joci des, mulți utilizatori o preferă pentru senzația de tastare. Este în mare parte o chestiune de gust." },
    ],
  },
  "produse-resigilate-si-refurbished": {
    icoana: "cos",
    verdict: "Diferența de preț merită doar dacă garanția și returul sunt clare. Cere în scris starea produsului și ce accesorii include.",
    casete: {
      0: [{ t: "atentie", x: "Termenii „resigilat”, „desigilat” și „refurbished” nu au aceeași definiție la toate magazinele." }],
      1: [{ t: "tip", x: "Salvează pagina produsului și condițiile magazinului (captură de ecran), în caz că ai nevoie de ele ulterior." }],
      2: [{ t: "tip", x: "Compară cu același model nou, în același magazin. Uneori diferența este mică și noul merită." }],
    },
    tabel: { dupa: 0, titlu: "Pe scurt", cap: ["Condiție", "Ce înseamnă de obicei", "Ce verifici"], randuri: [
      ["Nou", "Sigilat, neîntrebuințat", "Garanția standard"],
      ["Resigilat / desigilat", "Ambalaj deschis, de exemplu la o returnare", "Starea produsului, accesoriile, garanția"],
      ["Refurbished / recondiționat", "Verificat sau reparat înainte de revânzare", "Cine a făcut verificarea, garanția, starea estetică"],
    ], nota: "Definițiile exacte le stabilește fiecare magazin." },
    oferteDupa: 2,
    checklist: { titlu: "Întrebări pentru magazin", pasi: ["Ce garanție are produsul?", "Care este perioada de retur?", "Ce accesorii sunt incluse?", "În ce stare estetică este?", "Cine a verificat sau a reparat produsul?", "Cât costă același model nou?"] },
    faq: [
      { q: "Produsele resigilate au garanție?", a: "De obicei da, dar condițiile diferă de la magazin la magazin. Verifică durata și ce acoperă înainte de comandă." },
      { q: "Cum le recunosc pe Pretino?", a: "Dacă titlul produsului arată că este resigilat, desigilat sau refurbished, cardul afișează această condiție lângă numele magazinului. Poți filtra și după condiție." },
      { q: "Merită un produs refurbished?", a: "Poate, dacă prețul este mult mai mic decât cel nou și garanția este clară. Compară și citește politica de retur." },
    ],
  },
};
