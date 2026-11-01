# Deploying Open Ear

| Part | Host | Address |
|---|---|---|
| Website (`apps/web`) | Vercel | https://openearemedy.com |
| API + call signaling (`apps/api`) | Render (web service, free plan) | https://api.openearemedy.com |
| Keep-awake ping + pass reminder emails | GitHub Actions (`.github/workflows/scheduled.yml`) | every 10 min / daily 06:00 Nairobi |
| Database | Neon Postgres | |
| Covers and ebooks | Neon S3-compatible storage (one private bucket) | |
| Call audio relay | Cloudflare Realtime TURN | |
| Email / payments / AI chat | Resend / M-Pesa Express via Safaricom Daraja / OpenRouter | |

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

You don't need to create tables. The API runs the migrations each time it starts.

## 2. Cloudflare TURN (call audio)

Go to **Cloudflare dashboard → Realtime → TURN Server → Create**. Copy the **Turn Token ID** (`CLOUDFLARE_TURN_KEY_ID`) and the **API Token** (`CLOUDFLARE_TURN_API_TOKEN`). In production, calls are refused unless both are set.

## 3. Render (API)

1. **Deploy the blueprint.** In Render, choose **New → Blueprint**, connect the GitHub repo (branch `master`) and pick `render.yaml`. This creates `openear-api` on the free plan.
2. **Fill in the secret values on `openear-api`.** Render asks for every `sync: false` value:

   | Key | Value |
   |---|---|
   | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | from step 1 |
   | `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` | Neon storage, from step 1 |
   | `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` | from step 2 |
   | `RESEND_API_KEY` | Resend → API Keys |
   | `ADMIN_EMAIL` | where contact-form emails and missed-Booking alerts go |
   | `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_SHORT_CODE`, `DARAJA_PASSKEY` | Daraja portal → your app (see §5) |
   | `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials → OAuth client (Web). Add the site's addresses under **Authorized JavaScript origins** |
   | `OPENROUTER_API_KEY` | https://openrouter.ai/keys (chat replies and Knowledge Source search) |

   `JWT_SECRET` is generated for you. `PUBLIC_API_URL`, `CLIENT_URL`, `CORS_ORIGINS`, `EMAIL_FROM` and `OPENROUTER_MODEL` already have values in the blueprint.
3. **Scheduled jobs (GitHub).** In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add `DATABASE_URL` (pooled) and `RESEND_API_KEY`. The workflow then pings the API every 10 minutes so it doesn't sleep, and sends Monthly Pass reminders daily. To check it, open **Actions → Scheduled → Run workflow**.
4. **Add the custom domain.** Under `openear-api` → **Settings → Custom Domains**, add `api.openearemedy.com`, then add the CNAME record Render shows to your DNS.
5. **Check it.** Open `https://api.openearemedy.com/api/health`. It should return `{"ok":true,...}`.

> **Keep exactly one instance.** Running more than one splits who is online, so Calls fail to match. Every deploy or restart ends any live Calls. See [ADR 0001](docs/adr/0001-in-house-browser-calls.md).
>
> **Free plan limits:** the keep-awake ping is what stops the API sleeping. GitHub can delay scheduled runs, and it pauses them after 60 days with no commits to the repo; re-enable them under **Actions** if that happens. If Listeners report being dropped, or the first visit of the day is slow, move to Starter: in `render.yaml`, set `plan: starter`.

## 4. Vercel (website)

1. **Import the repo.** In Vercel, choose **Add New → Project** and import the repo. Set **Root Directory** to `apps/web`. Everything else comes from `apps/web/vercel.json`: it installs and builds from the repo root so `@openear/shared` is built, and it serves `out/`.
2. **Set the environment variables** (Production):

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://api.openearemedy.com` |
   | `VITE_WS_URL` | `wss://api.openearemedy.com/ws` |
   | `VITE_SITE_URL` | `https://openearemedy.com` |
   | `VITE_GOOGLE_CLIENT_ID` | the Google OAuth client ID (same as `GOOGLE_CLIENT_ID` on Render) |

   These values are built into the site, so **redeploy** after changing them.
3. **Add the domains.** Add `openearemedy.com` and `www.openearemedy.com` under **Domains**, and follow Vercel's DNS instructions.

## 5. M-Pesa (Daraja)

1. **Sandbox first.** On https://developer.safaricom.co.ke create an app with **M-Pesa Express** enabled. Copy its Consumer Key and Secret. The sandbox shortcode is `174379`; its passkey is on the M-Pesa Express simulator page.
2. **Going live** needs your own **Paybill** or **Till** (a registered business) and Safaricom's go-live approval, which gives you a production shortcode and passkey. Then on Render set `DARAJA_BASE_URL=https://api.safaricom.co.ke` and the production values. For a Till, also set `DARAJA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` and `DARAJA_TILL_NUMBER`.

There is no webhook to register: each payment tells Safaricom where to send its result (`/api/payments/mpesa/callback/…` on `PUBLIC_API_URL`). Callbacks are not trusted on their own; the API asks Safaricom to confirm every payment before granting anything.

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
- [ ] **AI Companion review:** add the approved Knowledge Sources (admin → **AI knowledge**), run `npm run review:companion -w @openear/api` with the production `DATABASE_URL` and `OPENROUTER_API_KEY`, and have your mental-health professional review the 30 conversations in the file it writes. Until then, set `RAG_ENABLED=false` on Render.
- [ ] **Test payment:** with the sandbox keys, buy a Credit Pack (use the sandbox test phone number shown on the Daraja simulator) and check the Credits arrive. Then switch to production keys and make one real KSh 50 purchase.
- [ ] **Rotate leaked secrets:** any secrets that were ever committed to git must be rotated.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Failed to fetch` or a CORS error | `VITE_API_URL` is wrong (redeploy Vercel after fixing it), or the site's origin is missing from `CORS_ORIGINS` |
| Calls never connect / "could not connect the audio" | TURN variables are missing or wrong on Render |
| Listener shows offline after a deploy | Expected: the console reconnects and comes back online by itself within seconds |
| Cover images broken | `PUBLIC_API_URL` is not `https://api.openearemedy.com`, or the storage variables are wrong |
| M-Pesa paid but no Credits | The payment page confirms with Safaricom while it is open; check the Render logs for "M-Pesa confirm failed" and that the Daraja keys match the environment (sandbox vs production) |
| Deploy never goes live / crashes at start | Migration error. Check `DATABASE_URL_UNPOOLED` and the Render logs |
| First request takes ~1 minute | The API was asleep. Check that the **Scheduled** workflow is running under GitHub **Actions** |
