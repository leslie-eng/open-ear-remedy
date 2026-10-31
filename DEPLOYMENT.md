# Deploying Open Ear

| Part | Host | Address |
|---|---|---|
| Website (`apps/web`) | Vercel | https://openearemedy.com |
| API + call signaling (`apps/api`) | Render (web service, Starter) | https://api.openearemedy.com |
| Pass reminder emails | Render (cron job) | daily, 06:00 Nairobi |
| Database | Neon Postgres | |
| Covers and ebooks | Neon S3-compatible storage (one private bucket) | |
| Call audio relay | Cloudflare Realtime TURN | |
| Email / payments / AI chat | Resend / Paystack (KES) / OpenRouter | |

```text
Browser ── https://openearemedy.com ──────────► Vercel (static site)
   │
   ├── https://api.openearemedy.com/api ─────► Render API ──► Neon Postgres
   │                                              │      └──► Neon storage (signed links)
   ├── wss://api.openearemedy.com/ws ────────► Render API (call signaling)
   └── audio ◄──── Cloudflare TURN ────► other browser
```

Why it is shaped like this: [docs/adr/](docs/adr/).

Do the steps in order. Each one names what you need from the previous one.

---

## 1. Neon

1. **Database.** In the Neon console, open the project, then **Connect**. Copy two connection strings for the production branch, and add `?sslmode=verify-full` to each:
   - **Pooled** (the host contains `-pooler`): this is `DATABASE_URL`.
   - **Direct** (no `-pooler`): this is `DATABASE_URL_UNPOOLED`, used for migrations.
2. **Test database (optional, for `npm test`).** Create a branch or database whose name contains `test`, for example `openear_test`. The tests **wipe** it.
3. **Storage.** Under **Storage**, create a bucket (ours is `ebook`) and an access key. Copy the endpoint, key ID, secret and region.

You don't need to create tables. Render runs the migrations before every deploy.

## 2. Cloudflare TURN (call audio)

Go to **Cloudflare dashboard → Realtime → TURN Server → Create**. Copy the **Turn Token ID** (`CLOUDFLARE_TURN_KEY_ID`) and the **API Token** (`CLOUDFLARE_TURN_API_TOKEN`). In production, calls are refused unless both are set.

## 3. Render (API)

1. **Deploy the blueprint.** In Render, choose **New → Blueprint**, connect the GitHub repo and pick `render.yaml`. This creates `openear-api` and `openear-pass-reminders`.
2. **Fill in the secret values on `openear-api`.** Render asks for every `sync: false` value:

   | Key | Value |
   |---|---|
   | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | from step 1 |
   | `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` | Neon storage, from step 1 |
   | `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` | from step 2 |
   | `RESEND_API_KEY` | Resend → API Keys |
   | `ADMIN_EMAIL` | where contact-form and appointment emails go |
   | `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` | Paystack → Settings → API Keys & Webhooks (Kenyan account) |
   | `OPENROUTER_API_KEY` | https://openrouter.ai/keys |

   `JWT_SECRET` is generated for you. `PUBLIC_API_URL`, `CLIENT_URL`, `CORS_ORIGINS`, `EMAIL_FROM` and `OPENROUTER_MODEL` already have values in the blueprint.
3. **Fill in the cron job.** On `openear-pass-reminders`, set `DATABASE_URL` (pooled), `RESEND_API_KEY`, and `JWT_SECRET` (copy it from `openear-api`).
4. **Add the custom domain.** Under `openear-api` → **Settings → Custom Domains**, add `api.openearemedy.com`, then add the CNAME record Render shows to your DNS.
5. **Check it.** Open `https://api.openearemedy.com/api/health`. It should return `{"ok":true,...}`.

> **Keep exactly one instance on a paid plan.** The free plan sleeps, which disconnects Listeners. Running more than one instance splits who is online, so Calls fail to match. Every deploy or restart ends any live Calls. See [ADR 0001](docs/adr/0001-in-house-browser-calls.md).

## 4. Vercel (website)

1. **Import the repo.** In Vercel, choose **Add New → Project** and import the repo. Set **Root Directory** to `apps/web`. Everything else comes from `apps/web/vercel.json`: it installs and builds from the repo root so `@openear/shared` is built, and it serves `out/`.
2. **Set the environment variables** (Production):

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://api.openearemedy.com` |
   | `VITE_WS_URL` | `wss://api.openearemedy.com/ws` |
   | `VITE_SITE_URL` | `https://openearemedy.com` |

   These values are built into the site, so **redeploy** after changing them.
3. **Add the domains.** Add `openearemedy.com` and `www.openearemedy.com` under **Domains**, and follow Vercel's DNS instructions.

## 5. Paystack

Under **Settings → API Keys & Webhooks**, set the webhook URL to:

```text
https://api.openearemedy.com/api/payments/webhook
```

The webhook only grants something when the signature, the amount and the currency (KES) all match.

## 6. Resend

Verify `openearemedy.com` under **Domains** (add the DNS records Resend shows). Without it, verification, reset and reminder emails are rejected.

## 7. First admin and first Listener

1. Sign up on https://openearemedy.com/signin with your own email and verify it.
2. In the **Neon SQL editor** (production branch), run:

   ```sql
   INSERT INTO admin_users (user_id, role)
   SELECT id, 'admin' FROM users WHERE email = 'you@example.com';
   ```

3. Sign in at `/admin-login`. Add Listeners at **/admin/listeners** using the email of their Open Ear account. They take Calls at **/listener**.

## 8. Before launch

- [ ] **Two-phone call test** on different networks (for example Wi-Fi and mobile data), so that audio goes through TURN.
- [ ] **Crisis Help numbers:** a qualified person verifies `/crisis-help` and adds Kenyan resources.
- [ ] **Test payment:** buy a Credit Pack with Paystack test keys and check the Credits arrive. Then switch to live keys.
- [ ] **Rotate leaked secrets:** any secrets that were ever committed to git must be rotated.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Failed to fetch` or a CORS error | `VITE_API_URL` is wrong (redeploy Vercel after fixing it), or the site's origin is missing from `CORS_ORIGINS` |
| Calls never connect / "could not connect the audio" | TURN variables are missing or wrong on Render |
| Listener shows offline after a deploy | Expected: the console reconnects and comes back online by itself within seconds |
| Cover images broken | `PUBLIC_API_URL` is not `https://api.openearemedy.com`, or the storage variables are wrong |
| Paystack paid but no Credits | Webhook URL or `PAYSTACK_WEBHOOK_SECRET` mismatch; check the Render logs |
| Deploy fails at "pre-deploy" | Migration error. Check `DATABASE_URL_UNPOOLED` and the Render logs |
