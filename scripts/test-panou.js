// Teste pentru panoul de control (logica pura: autentificare Access, utilitare email, Worker cu D1 simulat).
import { verificaAccess, reseteazaCache, verificaParola } from "../panou/src/auth.js";
import { htmlInText, valideazaTrimitere, corpResend, adresa, taie } from "../panou/src/mail.js";

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));

export async function testePanou(ok) {
  // --- utilitare email ---
  ok(htmlInText("<style>x{}</style><p>Salut&nbsp;<b>lume</b></p><script>1</script>").includes("Salut lume") && !htmlInText("<script>alert(1)</script>x").includes("alert"), "panou: HTML din email redus la text fara script/stil");
  ok(valideazaTrimitere({ to: "a@b.ro", subject: "Salut", text: "Mesaj" }).ok, "panou: trimitere valida acceptata");
  ok(valideazaTrimitere({ to: "nu-e-email", subject: "x", text: "y" }).eroare && valideazaTrimitere({ to: "a@b.ro", subject: "", text: "y" }).eroare && valideazaTrimitere({ to: "a@b.ro", subject: "x", text: " " }).eroare, "panou: trimitere invalida respinsa (adresa, subiect, mesaj)");
  ok(valideazaTrimitere({ to: "a@b.ro", subject: "linie1\r\nBcc: x@y.ro", text: "t" }).ok.subject === "linie1 Bcc: x@y.ro", "panou: subiectul nu poate injecta antete");
  ok(corpResend({ to: ["a@b.ro"], subject: "S", text: "T", inReplyTo: "id1@x" }, "Pretino <contact@pretino.ro>").headers["In-Reply-To"] === "<id1@x>", "panou: raspuns cu antet In-Reply-To");
  { const v = valideazaTrimitere({ to: "a@b.ro, c@d.ro", cc: "e@f.ro", bcc: "g@h.ro", subject: "S", text: "T" }).ok;
    ok(v.to.length === 2 && v.cc[0] === "e@f.ro" && corpResend(v, "x@y.ro").bcc[0] === "g@h.ro", "panou: Cc/Bcc si mai multi destinatari");
    ok(valideazaTrimitere({ to: Array.from({ length: 41 }, (_, i) => `a${i}@b.ro`).join(","), subject: "S", text: "T" }).eroare && valideazaTrimitere({ to: "a@b.ro", cc: "nu-e-email", subject: "S", text: "T" }).eroare, "panou: maxim 40 de destinatari, Cc invalid respins"); }
  ok(adresa("Nume <Ab@X.ro>") === "ab@x.ro" && taie("a".repeat(300000)).length < 300000, "panou: adresa extrasa, textul lung taiat");

  // --- parola ---
  const R = (p) => new Request("https://x/", { headers: p ? { Authorization: "Bearer " + p } : {} });
  ok(await verificaParola(R("parola-foarte-lunga-123"), { PANOU_KEY: "parola-foarte-lunga-123" }), "panou: parola corecta acceptata");
  ok(!(await verificaParola(R("alta-parola-lunga-12"), { PANOU_KEY: "parola-foarte-lunga-123" })) && !(await verificaParola(R(null), { PANOU_KEY: "parola-foarte-lunga-123" })), "panou: parola gresita sau lipsa respinsa");
  ok(!(await verificaParola(R("scurta"), { PANOU_KEY: "scurta" })) && !(await verificaParola(R("x"), {})), "panou: parola scurta (<12) sau nesetata -> refuzata");

  // --- Cloudflare Access ---
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const fetchFn = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
  const env = { ACCESS_TEAM_DOMAIN: "echipa.cloudflareaccess.com", ACCESS_AUD: "aud123", ALLOWED_EMAIL: "laur@example.com" };
  const acum = 1_800_000_000_000, sec = acum / 1000;
  const jeton = async (payload, cheie = kp.privateKey, kid = "k1") => {
    const h = enc({ alg: "RS256", kid, typ: "JWT" }), p = enc(payload);
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cheie, new TextEncoder().encode(`${h}.${p}`));
    return `${h}.${p}.${b64u(sig)}`;
  };
  const baza = { email: "Laur@Example.com", aud: ["aud123"], iss: "https://echipa.cloudflareaccess.com", exp: sec + 600 };
  const cer = async (payload, e = env, cheie, kid) => { reseteazaCache(); return verificaAccess(new Request("https://x/", { headers: { "Cf-Access-Jwt-Assertion": await jeton(payload, cheie, kid) } }), e, { fetchFn, acum }); };
  ok((await cer(baza)) === "laur@example.com", "panou: jeton Access valid acceptat");
  ok(!(await cer({ ...baza, email: "altcineva@example.com" })), "panou: alt email respins");
  ok(!(await cer({ ...baza, exp: sec - 10 })), "panou: jeton expirat respins");
  ok(!(await cer({ ...baza, aud: ["alta"] })), "panou: alta aplicatie (aud) respinsa");
  ok(!(await cer({ ...baza, iss: "https://rau.cloudflareaccess.com" })), "panou: alt emitent respins");
  const altKp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  ok(!(await cer(baza, env, altKp.privateKey)), "panou: semnatura falsa respinsa");
  ok(!(await cer(baza, { ...env, ACCESS_AUD: "" })), "panou: fara configuratie Access -> acces refuzat");
  reseteazaCache();
  ok(!(await verificaAccess(new Request("https://x/"), env, { fetchFn, acum })), "panou: fara jeton -> acces refuzat");

  await testeStatistici(ok);
}

// --- statistici anonime: SQLite real (bun:sqlite) cu schema panoului, adaptat la interfata D1 ---
async function testeStatistici(ok) {
  const { Database } = await import("bun:sqlite");
  const { readFileSync } = await import("node:fs");
  const { colecteaza, statistici, dispozitiv, curataCale, curataSursa, esteBot, ziRO } = await import("../panou/src/stat.js");
  const sq = new Database(":memory:");
  sq.exec(readFileSync("panou/schema.sql", "utf8"));
  const DB = { prepare: (q) => { const st = sq.prepare(q); let a = []; const o = { bind: (...x) => { a = x; return o; }, run: async () => { st.run(...a); return {}; }, first: async () => st.get(...a), all: async () => ({ results: st.all(...a) }) }; return o; } };
  const env = { DB, SITE_URL: "https://pretino.ro", PANOU_KEY: "parola-foarte-lunga-123" };
  const UA = "Mozilla/5.0 (Windows NT 10.0) Chrome/120";
  const T0 = Date.parse("2026-11-03T10:00:00+02:00");
  const post = (corp, { ip = "1.1.1.1", ua = UA, origin = "https://pretino.ro", acum = T0 } = {}) =>
    colecteaza(new Request("https://pretino.ro/_s/c", { method: "POST", headers: { "CF-Connecting-IP": ip, "User-Agent": ua, ...(origin ? { Origin: origin } : {}) }, body: typeof corp === "string" ? corp : JSON.stringify(corp) }), env, acum);
  const pid = (n) => n.toString(16).padStart(16, "0");

  ok(curataCale("/categorie/electronice/?x=1#a") === "/categorie/electronice/" && !curataCale("javascript:alert(1)") && !curataCale("//evil.com") && !curataCale("/a b") && !curataCale(5), "statistici: calea e curatata, valorile straine respinse");
  ok(curataSursa("WWW.Google.com") === "google.com" && curataSursa("<x>") === "" && curataSursa("localhost") === "", "statistici: sursa = doar domeniul");
  ok(dispozitiv("Mozilla/5.0 (iPhone; CPU iPhone OS 17) Mobile/15E148") === "m" && dispozitiv("Mozilla/5.0 (Linux; Android 14; SM-X) Chrome/120") === "t" && dispozitiv(UA) === "d", "statistici: tip dispozitiv");
  ok(esteBot("Googlebot/2.1") && esteBot("") && esteBot("python-requests/2") && !esteBot(UA), "statistici: roboti exclusi");
  ok(ziRO(Date.parse("2026-11-03T23:30:00Z")) === "2026-11-04", "statistici: ziua dupa ora Romaniei");

  // vizitator A: 2 pagini in aceeasi vizita + revenire dupa 2 ore (vizita noua); vizitator B: o pagina; bot, alta origine, abuz: ignorate
  ok((await post({ e: "v", p: pid(1), c: "/", r: "google.com" })).status === 204, "statistici: raspuns 204");
  await post({ e: "t", p: pid(1), s: 40 });
  await post({ e: "v", p: pid(2), c: "/categorie/electronice/" }, { acum: T0 + 60e3 });
  await post({ e: "t", p: pid(2), s: 80 }, { acum: T0 + 60e3 });
  await post({ e: "t", p: pid(2), s: 30 }, { acum: T0 + 61e3 });             // valoarea mai mica nu o scade pe cea mare
  await post({ e: "v", p: pid(3), c: "/magazin/evomag/" }, { acum: T0 + 2 * 3600e3 });
  await post({ e: "t", p: pid(3), s: 999999 }, { acum: T0 + 2 * 3600e3 });   // plafonat la 30 min
  await post({ e: "v", p: pid(4), c: "/", r: "www.facebook.com" }, { ip: "2.2.2.2" });
  await post({ e: "t", p: pid(4), s: 20 }, { ip: "2.2.2.2" });
  await post({ e: "v", p: pid(5), c: "/" }, { ua: "Googlebot/2.1" });
  await post({ e: "v", p: pid(6), c: "/" }, { origin: "https://evil.com" });
  await post({ e: "v", p: "nu-e-id", c: "/" });
  await post("nu e json {");
  await post({ e: "v", p: pid(7), c: "/" }, { ip: "2.2.2.2" });
  await post({ e: "t", p: pid(7), s: 5 }, { ip: "9.9.9.9" });                 // alt vizitator nu poate modifica randul altuia
  ok(sq.prepare("SELECT COUNT(*) n FROM vizite").get().n === 5, "statistici: bot, origine straina, id invalid ignorate (5 randuri valide)");
  ok(sq.prepare("SELECT sec FROM vizite WHERE pid=?").get(pid(7)).sec === 0, "statistici: un alt vizitator nu poate schimba timpul altuia");
  ok(sq.prepare("SELECT sec FROM vizite WHERE pid=?").get(pid(2)).sec === 80 && sq.prepare("SELECT sec FROM vizite WHERE pid=?").get(pid(3)).sec === 1800, "statistici: timp = maximul raportat, plafonat la 30 min");
  ok(!JSON.stringify(sq.prepare("SELECT * FROM vizite").all()).includes("1.1.1.1"), "statistici: adresa IP nu se salveaza");
  const u = (ip) => sq.prepare("SELECT v FROM vizite WHERE pid=?").get(ip).v;
  ok(u(pid(1)) === u(pid(2)) && u(pid(1)) !== u(pid(4)), "statistici: acelasi vizitator in aceeasi zi are acelasi cod");

  await post({ e: "c", c: "/", m: "evomag" }, { acum: T0 + 5e3 });
  await post({ e: "c", c: "/", m: "evomag" }, { acum: T0 + 6e3, ip: "2.2.2.2" });
  await post({ e: "c", c: "/", m: "<x>" });
  const s = await statistici(env, 1, T0 + 3 * 3600e3);
  ok(s.azi.zi === "2026-11-03" && s.azi.vizualizari === 5 && s.azi.vizitatori === 2, "statistici: pagini si vizitatori unici pe zi (" + JSON.stringify(s.azi) + ")");
  ok(s.azi.vizite === 3, "statistici: vizita noua dupa pauza >30 min (A: 2 vizite, B: 2 pagini adiacente = 1 → " + s.azi.vizite + ")");
  ok(s.total.sec === 40 + 80 + 1800 + 20 + 0, "statistici: suma timpilor");
  ok(s.pagini[0].cale === "/" && s.pagini[0].n === 3 && s.pagini[0].medie === 30, "statistici: top pagini cu timp mediu (fara zerouri): " + JSON.stringify(s.pagini[0]));
  ok(s.clickuri.length === 1 && s.clickuri[0].mag === "evomag" && s.clickuri[0].n === 2 && s.clickuri_total === 2 && s.dispozitive.d === 5, "statistici: click-uri pe magazin, dispozitive " + JSON.stringify([s.clickuri, s.clickuri_total, s.dispozitive]));
  ok(s.acum === 0 && (await statistici(env, 1, T0 + 2 * 60e3)).acum === 2, "statistici: vizitatori activi in ultimele 5 minute");
  ok(s.surse.length === 2 && s.surse.some((r) => r.ref === "facebook.com"), "statistici: surse (domenii fara www)");
  await post({ e: "v", p: pid(8), c: "/" }, { acum: T0 + 86400e3 });
  ok(sq.prepare("SELECT v FROM vizite WHERE pid=?").get(pid(8)).v !== u(pid(1)), "statistici: codul vizitatorului se schimba zilnic");
  const s7 = await statistici(env, 7, T0 + 86400e3 + 3600e3);
  ok(s7.pe_zi.length === 7 && s7.pe_zi.every((r) => r.zi) && s7.total.vizualizari === 6 && s7.pe_zi[0].vizualizari === 0, "statistici: zilele fara trafic apar cu zero");
}
