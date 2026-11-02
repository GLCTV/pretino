# Panou de control Pretino

Worker Cloudflare propriu Pretino (`pretino-panou`) la `https://panou.pretino.ro`:
- **Primite**: emailurile trimise la `contact@pretino.ro` (Email Routing → Worker → baza D1 `pretino-mail`) si copie pe Gmail (`FORWARD_TO`).
- **Trimise / Scrie**: raspuns si mesaje noi din `contact@pretino.ro` prin Resend (limita 30/ora).
- **Stare site**: numar de oferte, magazine, categorii, data ultimei publicari (din `https://pretino.ro/status.json` si `version.json`).
- Acces doar prin Cloudflare Access (Worker-ul verifica singur jetonul si adresa permisa; fara configuratie = acces refuzat). Emailurile se afiseaza doar ca text; atasamentele nu se salveaza (raman in copia de pe Gmail).

## Instalare (o singura data), in ordine
1. **Resend**: cont gratuit → Domains → adauga `pretino.ro` → adauga in Cloudflare DNS inregistrarile cerute (sau „Auto configure”) → API Keys → cheie cu drept „Sending access”. Nu o da nimanui; o lipesti doar in terminal la pasul 2.
2. Pe PC: `bun scripts/panou-deploy.js --deploy --resend` (instaleaza baza, Worker-ul si salveaza cheia ca secret in Cloudflare). Autentificare: token din `%LOCALAPPDATA%\Pretino\secrete.env` sau `wrangler login`.
3. **Cloudflare Access** (Zero Trust → Access → Applications → Self-hosted): domeniu `panou.pretino.ro`, politica „Allow” doar pentru emailul tau. Noteaza „Application Audience (AUD) Tag” si numele echipei (`nume.cloudflareaccess.com`).
4. Pune in `%LOCALAPPDATA%\Pretino\secrete.env`: `ACCESS_TEAM_DOMAIN=nume.cloudflareaccess.com` si `ACCESS_AUD=<AUD tag>`, apoi rulezi din nou `bun scripts/panou-deploy.js --deploy`.
5. **Email Routing** (pretino.ro → Routing rules): regula `contact@pretino.ro` → „Send to a Worker” → `pretino-panou`.
6. Test: trimite un email la `contact@pretino.ro`; apare in Primite si pe Gmail.

Actualizari ulterioare: `bun scripts/panou-deploy.js --deploy`. Pagina „Stare site” are nevoie de `status.json`, generat la build (apare dupa urmatoarea publicare a site-ului).
