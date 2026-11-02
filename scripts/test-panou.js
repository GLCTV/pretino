// Teste pentru panoul de control (logica pura: autentificare Access, utilitare email, Worker cu D1 simulat).
import { verificaAccess, reseteazaCache } from "../panou/src/auth.js";
import { htmlInText, valideazaTrimitere, corpResend, adresa, taie } from "../panou/src/mail.js";

const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));

export async function testePanou(ok) {
  // --- utilitare email ---
  ok(htmlInText("<style>x{}</style><p>Salut&nbsp;<b>lume</b></p><script>1</script>").includes("Salut lume") && !htmlInText("<script>alert(1)</script>x").includes("alert"), "panou: HTML din email redus la text fara script/stil");
  ok(valideazaTrimitere({ to: "a@b.ro", subject: "Salut", text: "Mesaj" }).ok, "panou: trimitere valida acceptata");
  ok(valideazaTrimitere({ to: "nu-e-email", subject: "x", text: "y" }).eroare && valideazaTrimitere({ to: "a@b.ro", subject: "", text: "y" }).eroare && valideazaTrimitere({ to: "a@b.ro", subject: "x", text: " " }).eroare, "panou: trimitere invalida respinsa (adresa, subiect, mesaj)");
  ok(valideazaTrimitere({ to: "a@b.ro", subject: "linie1\r\nBcc: x@y.ro", text: "t" }).ok.subject === "linie1 Bcc: x@y.ro", "panou: subiectul nu poate injecta antete");
  ok(corpResend({ to: "a@b.ro", subject: "S", text: "T", inReplyTo: "id1@x" }, "Pretino <contact@pretino.ro>").headers["In-Reply-To"] === "<id1@x>", "panou: raspuns cu antet In-Reply-To");
  ok(adresa("Nume <Ab@X.ro>") === "ab@x.ro" && taie("a".repeat(300000)).length < 300000, "panou: adresa extrasa, textul lung taiat");

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
}
