# Deploy Open Ear API on Render (+ frontend on cPanel)

Use **Render** for the Node API and keep **cPanel** for the static React site at [https://openearemedy.com](https://openearemedy.com).

| Part | Host |
|------|------|
| Frontend (`out/`) | cPanel `public_html` |
| API (`server/`) | [Render](https://render.com) Web Service |
| Database | **Render PostgreSQL** (recommended) or remote cPanel Postgres if your host allows |

Stop the cPanel Node.js app for Open Ear (or leave it stopped) so you are not running two APIs.

---

## Part 1 — Push code to GitHub

Render deploys from Git. If the project is not on GitHub yet:

```bash
cd openear
git init
git add .
git commit -m "Prepare Render API deploy"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/openear.git
git push -u origin main
```

---

## Part 2 — Create Render PostgreSQL (recommended)

cPanel Postgres often **blocks remote connections**, so Render cannot reach it. Use a database on Render:

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. Name: `openear-db` (or any name)
3. Plan: **Free** (or paid for production)
4. Create → copy **Internal Database URL** (for the API service on Render)  
   - Use **Internal** URL when API and DB are both on Render  
   - Use **External** URL only if you must connect from your PC for tools

5. **SQL / PSQL** or local: run schema once if not using `preDeployCommand`:
   - Paste `server/db/schema.sql` in Render Postgres **Connect** → psql, or rely on Blueprint `preDeployCommand: npm run db:migrate`

---

## Part 3 — Deploy the API (manual setup)

1. **New +** → **Web Service**
2. Connect your **GitHub** repo
3. Settings:

| Field | Value |
|-------|--------|
| **Name** | `openear-api` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

4. **Environment variables** (Environment → Add):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render Postgres **Internal** connection string |
| `JWT_SECRET` | Long random string (Generate in Render or `openssl rand -hex 48`) |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `https://openearemedy.com` |
| `CORS_ORIGINS` | `https://openearemedy.com,https://www.openearemedy.com` |
| `RESEND_API_KEY` | Your Resend key (signup email) |
| `EMAIL_FROM` | `Open Ear <noreply@openearemedy.com>` |
| `PAYSTACK_SECRET_KEY` | Live/test secret |
| `PAYSTACK_WEBHOOK_SECRET` | From Paystack dashboard |
| `PAYSTACK_CURRENCY` | `USD` |
| `GROQ_API_KEY` | Optional (chat) |
| `ADMIN_EMAIL` | Your email |

Do **not** set `PORT` — Render sets it automatically.

5. Optional **Pre-Deploy Command**: `npm run db:migrate` (creates tables from `schema.sql`)

6. **Create Web Service** → wait until status is **Live**

7. Copy your service URL, e.g. `https://openear-api.onrender.com`

8. Test: `https://openear-api.onrender.com/api/health`  
   Expected: `{"ok":true,"database":true}`

---

## Part 3b — Deploy with Blueprint (optional)

Repo includes `render.yaml` at the project root.

1. **New +** → **Blueprint**
2. Connect repo → Render creates **openear-api** + **openear-db**
3. Add remaining secrets in the dashboard: `RESEND_API_KEY`, `PAYSTACK_*`, `GROQ_API_KEY`, etc.
4. After deploy, note the web service URL

---

## Part 4 — Paystack webhook

In Paystack → **Settings** → **Webhooks**:

```text
https://openear-api.onrender.com/api/payments/webhook
```

Use your real Render hostname. Set `PAYSTACK_WEBHOOK_SECRET` on Render to match.

---

## Part 5 — Frontend on cPanel

On your PC, edit **`openear/.env`**:

```env
VITE_API_URL=https://openear-api.onrender.com
VITE_SITE_URL=https://openearemedy.com
```

Replace `openear-api.onrender.com` with your actual Render URL (**no trailing slash**).

Build and upload:

```bash
npm install
npm run build
```

Upload **contents of `out/`** to cPanel `public_html`.

### cPanel cleanup

- **Remove or comment out** `/api` proxy rules in `public_html/.htaccess` (API is no longer on cPanel):

```apache
# No longer needed when API is on Render:
# RewriteCond %{REQUEST_URI} ^/api ...
```

Keep HTTPS redirect and React SPA `index.html` rules.

- **Stop** the cPanel Node.js app for `server/` to save resources.

---

## Part 6 — First admin user

1. Sign up on `https://openearemedy.com/signin`
2. In Render Postgres (psql or dashboard), run:

```sql
INSERT INTO admin_users (user_id, role)
SELECT id, 'admin' FROM users WHERE email = 'your@email.com';
```

3. Log in at `/admin-login`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `failed to fetch` on sign-in | Wrong `VITE_API_URL` → rebuild & re-upload `out/` |
| CORS error in browser | `CORS_ORIGINS` must include exact origin `https://openearemedy.com` |
| `database: false` on health | Wrong `DATABASE_URL` on Render; use Internal URL |
| 502 / slow first request | Free tier **spins down** after ~15 min idle; first hit wakes it (30–60s) |
| Paystack webhook fails | URL must be Render host, not cPanel |
| Ebook uploads missing after restart | Render disk is **ephemeral**; use object storage later for production files |

### Using cPanel Postgres from Render (usually not possible)

Only if your host enables **Remote PostgreSQL** and whitelists Render IPs (changes often on free tier). Prefer Render Postgres.

---

## Architecture

```text
Browser → https://openearemedy.com (cPanel static React)
       → https://openear-api.onrender.com/api/... (Render Express)
       → Render PostgreSQL
```

---

## Local development

```bash
# Terminal 1
cd server && cp .env.example .env   # edit DATABASE_URL
npm install && npm run dev

# Terminal 2 (repo root)
# .env: VITE_API_URL=http://localhost:3001
npm run dev
```
