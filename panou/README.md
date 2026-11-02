# Panou de control Pretino

Worker Cloudflare propriu Pretino (`pretino-panou`) la `https://panou.pretino.ro`:
- **Primite**: emailurile trimise la `contact@pretino.ro` (Email Routing → Worker → baza D1 `pretino-mail`) si copie pe Gmail (`FORWARD_TO`).
- **Trimise / Scrie**: raspuns si mesaje noi din `contact@pretino.ro` prin Resend (limita 30/ora).
- **Stare site**: numar de oferte, magazine, categorii, data ultimei publicari (din `https://pretino.ro/status.json` si `version.json`).
- Acces implicit cu **parola** (secret `PANOU_KEY`, minim 12 caractere; 10 incercari gresite/10 min per IP → blocare temporara). Optional si Cloudflare Access (Worker-ul verifica singur jetonul). Fara parola si fara Access = acces refuzat. Trimitere: Cc/Bcc, max 40 destinatari, limite 30/ora; emailurile se pastreaza 6 luni. Emailurile se afiseaza doar ca text; atasamentele nu se salveaza (raman in copia de pe Gmail).

## Instalare (o singura data), in ordine
1. **Resend**: cont gratuit → Domains → adauga `pretino.ro` → adauga in Cloudflare DNS inregistrarile cerute (sau „Auto configure”) → API Keys → cheie cu drept „Sending access”. Nu o da nimanui; o lipesti doar in terminal la pasul 2.
2. Pe PC: `bun scripts/panou-deploy.js --deploy --resend` (instaleaza baza, Worker-ul si salveaza cheia ca secret in Cloudflare). Autentificare: token din `%LOCALAPPDATA%\Pretino\secrete.env` sau `wrangler login`.
3. **Parola panoului**: `bun scripts/panou-deploy.js --deploy --parola` (o scrii tu in terminal, minim 12 caractere, lunga si unica; nu o da nimanui). Se salveaza ca secret in Cloudflare. Poti combina: `--deploy --resend --parola`.
4. *(Optional)* Cloudflare Access: Zero Trust → Applications → Self-hosted pe `panou.pretino.ro`; pune `ACCESS_TEAM_DOMAIN` si `ACCESS_AUD` in `secrete.env` si redeploy.
5. **Email Routing** (pretino.ro → Routing rules): regula `contact@pretino.ro` → „Send to a Worker” → `pretino-panou`.
6. Test: trimite un email la `contact@pretino.ro`; apare in Primite si pe Gmail.

Actualizari ulterioare: `bun scripts/panou-deploy.js --deploy`. Pagina „Stare site” are nevoie de `status.json`, generat la build (apare dupa urmatoarea publicare a site-ului).
