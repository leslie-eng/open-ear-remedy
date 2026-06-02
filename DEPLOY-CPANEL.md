# Deploy Open Ear on cPanel (full guide)

This app has **two parts**:

| Part | Technology | What users hit |
|------|------------|----------------|
| **Frontend** | Vite + React (static files in `out/`) | `https://yourdomain.com` |
| **Backend** | Node.js + Express (`server/`) | `https://yourdomain.com/api/...` (same domain) **or** `https://api.yourdomain.com` |

Database: **PostgreSQL** (you confirmed cPanel has this).

**Production domain:** [https://openearemedy.com](https://openearemedy.com)

**API on Render (recommended if cPanel Node crashes):** see **[DEPLOY-RENDER.md](./DEPLOY-RENDER.md)**.

---

## Production checklist — openearemedy.com

Copy these values as-is (same-domain API; `/api` proxied to Node).

### PC — `openear/.env` (then `npm run build`)

```env
VITE_API_URL=
VITE_SITE_URL=https://openearemedy.com
```

Remove any `VITE_PUBLIC_SUPABASE_*` lines before building.

### cPanel — `openear/server/.env`

```env
NODE_ENV=production
PORT=<port from Setup Node.js App>

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE

JWT_SECRET=<long random string>
JWT_EXPIRES_IN=7d

CLIENT_URL=https://openearemedy.com
CORS_ORIGINS=https://openearemedy.com,https://www.openearemedy.com

RESEND_API_KEY=
EMAIL_FROM=Open Ear <noreply@openearemedy.com>

PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_CURRENCY=USD

GROQ_API_KEY=
ADMIN_EMAIL=

UPLOAD_DIR=/home/YOUR_CPANEL_USER/openear/server/uploads
```

Replace `YOUR_CPANEL_USER`, database credentials, and secrets.

### URLs to test (in order)

| # | URL | Expected |
|---|-----|----------|
| 1 | https://openearemedy.com/api/health | `{"ok":true,"database":true}` |
| 2 | https://openearemedy.com/signin (refresh) | Page loads, no 404 |
| 3 | https://openearemedy.com/admin-login | After SQL admin grant |
| Paystack webhook | https://openearemedy.com/api/payments/webhook | Set in Paystack dashboard |

### `public_html/.htaccess` proxy

Use the port from **Setup Node.js App** for the new `openear/server` app:

```apache
RewriteCond %{REQUEST_URI} ^/api [OR]
RewriteCond %{REQUEST_URI} ^/uploads
RewriteRule ^(.*)$ http://127.0.0.1:YOUR_PORT/$1 [P,L]
```

---

## How to use this guide in cPanel (read this first)

`DEPLOY-CPANEL.md` is a **playbook**, not something you upload to the server. Keep it open on your PC while you click through cPanel. Follow the **order below** — skipping steps (especially stopping the old Node app or fixing `.env` before build) is what causes most “nothing works” issues.

### Where you work vs where cPanel works

| Step | Do on **your PC** | Do in **cPanel** |
|------|-------------------|------------------|
| Build website UI | Part 1 — `npm run build` → folder `out/` | — |
| Upload static site | Zip `out/` locally | **File Manager** → `public_html` → Upload → Extract |
| Database tables | — | Part 2 — **PostgreSQL Databases** + migrate (Part 3.6) |
| API (Node) | Zip/upload `openear` project (or `server/` at minimum) | Part 3 — **Setup Node.js App** |
| Connect site to API | Edit proxy port in `.htaccess` (from build or File Manager) | **File Manager** → `public_html/.htaccess` |
| Secrets | Prepare values in a notes file | **`server/.env`** via File Manager **or** Node app **Environment variables** |
| Email / payments | Copy keys from Resend / Paystack dashboards | Paste into `server/.env` → **Restart** Node app |
| Admin user | — | Part 5 — **phpPgAdmin** or Terminal + SQL |
| Old Supabase Node app | — | **Stop** old app first (section below) |

**Rule:** Frontend = PC build + `public_html`. Backend = cPanel Node + Postgres. **Do not** run `npm install` for the whole repo in cPanel Terminal unless you activated the Node virtualenv (Part 3.5).

### Recommended order (first-time deploy)

Do these in sequence. Check each box before moving on.

1. **[ ] Before you start** — SSL on domain, Node.js + PostgreSQL visible in cPanel menu.
2. **[ ] Old app** — If a Supabase-era Node app exists: note its port, then **Stop** it (see “Replacing an old Node.js app”).
3. **[ ] Part 2** — Create PostgreSQL DB + user; save `DATABASE_URL`.
4. **[ ] Part 3.1** — Upload project to `/home/USER/openear/` (not inside `public_html`).
5. **[ ] Part 3.2** — Create `openear/server/.env` with `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `CORS_ORIGINS`.
6. **[ ] Part 3.3–3.4** — **Setup Node.js App**: root = `openear/server`, startup = **`app.cjs`** (not `src/index.js` on LiteSpeed/cPanel), Production mode.
7. **[ ] Part 3.5** — **Run NPM Install** in Node app UI (not raw Terminal unless virtualenv is active).
8. **[ ] Part 3.6** — Migrate DB (`npm run db:migrate` with virtualenv, or `schema.sql` in phpPgAdmin).
9. **[ ] Part 3.7–3.8** — **Restart** app → open `https://yourdomain.com/api/health` → must show `"database": true`.
10. **[ ] Part 1** — On PC: fix `.env` (no Supabase keys) → `npm run build`.
11. **[ ] Part 4** — Upload `out/*` to `public_html`; set `.htaccess` proxy port to **new** Node app port.
12. **[ ] Part 5** — Sign up on live site → SQL `admin_users` → test `/admin-login`.
13. **[ ] Part 6–7** — Paystack webhook + Resend → **Restart** Node app after env changes.
14. **[ ] Smoke test** — Sign in, pricing/credits, one admin page (see below).

Only after step 9 passes should you upload the frontend (steps 10–11). Otherwise the site loads but API calls fail.

### cPanel tool → doc section map

| cPanel area | Use for |
|-------------|---------|
| **File Manager** | Upload/extract `openear/`, edit `server/.env`, upload `public_html`, edit `.htaccess` |
| **Terminal** | Optional: migrate, logs — **after** `source .../nodevenv/.../activate` (Part 3.5) |
| **Setup Node.js App** | Create app, **Run NPM Install**, **Restart**, read logs, env vars |
| **PostgreSQL Databases** | Create DB/user (Part 2) |
| **phpPgAdmin** | Run `schema.sql` or admin SQL (Parts 2, 5) |
| **SSL/TLS** or **AutoSSL** | HTTPS before Paystack webhooks |
| **Domains / Subdomains** | Only if using `api.yourdomain.com` (Part 3.4 Approach B) |
| **Metrics → Errors** | Apache/`public_html` errors when pages 404 or proxy fails |

### Smoke test (2 minutes)

| # | Action | Pass if |
|---|--------|---------|
| 1 | Open `https://yourdomain.com/api/health` | JSON with `"ok": true`, `"database": true` |
| 2 | Open `https://yourdomain.com/signin` and refresh (F5) | Page loads (not Apache 404) |
| 3 | DevTools → Network → sign in | Request to `/api/auth/...` returns JSON, not HTML |
| 4 | Open `https://yourdomain.com/dashboard` logged in | Loads without CORS errors in console |

### Day-2 operations (updates)

| Change | PC | cPanel |
|--------|-----|--------|
| Text/UI only | `npm run build` → upload `out/` to `public_html` | — |
| API code or `server/.env` | Upload changed `server/` files | **Restart** Node app |
| Database schema | — | `npm run db:migrate` (virtualenv) or SQL in phpPgAdmin |
| New `VITE_*` URL | Rebuild + re-upload `out/` | — |

After any `server/.env` change: **Restart** the Node app (env is read at startup).

### Habits that keep things smooth

- **One Node.js app** for Open Ear (`openear/server` only).
- **One Paystack webhook** URL pointing at `/api/payments/webhook` on the live domain.
- **Build frontend on PC** — cPanel Terminal often has no `npm`; that is normal.
- **Never put** `server/.env` or `JWT_SECRET` in `public_html`.
- **Write down** the Node app **port** from Setup Node.js App; it must match `.htaccess` proxy.
- **Restart** Node after every env change; **rebuild** frontend after every `VITE_*` change.

### If you get stuck

1. Find the symptom in **Troubleshooting** (bottom of this file).
2. Open **Setup Node.js App → Logs** for API errors.
3. Confirm `/api/health` before debugging sign-in or Paystack.

---

## Replacing an old Node.js app (Supabase era)

If cPanel already has a **Node.js application** from the first deployment, that app was almost certainly built for **Supabase** (edge functions, `SUPABASE_URL`, service role keys). The migrated codebase uses **`openear/server`** (Express + **cPanel PostgreSQL**). The React app in `src/` no longer calls Supabase.

**Run only one backend.** Two Node apps on the same domain/port cause wrong APIs, double webhooks, and confusing errors.

### How to tell which app is which

In **Setup Node.js App**, open each application and check:

| Sign it is the **OLD** app (remove or stop) | Sign it is the **NEW** app (keep) |
|---------------------------------------------|-----------------------------------|
| Application root is **not** `.../openear/server` | Application root ends with **`openear/server`** |
| Startup file is not `app.cjs` | Startup file: **`app.cjs`** (loads `src/index.js`) |
| Environment has `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` | Environment has **`DATABASE_URL`** (PostgreSQL) and **`JWT_SECRET`** |
| `package.json` name / folder from an old upload or `supabase/functions` port | `package.json` name: **`openear-api`** |

The folder `supabase/functions/` in the repo is **legacy** (Deno edge functions for Supabase cloud). It is **not** what you deploy on cPanel for the new stack.

### What to do

1. **Do not delete data yet** — export users/transactions from Supabase if you still need them.
2. **Stop the old Node app** — Setup Node.js App → old application → **Stop** (or **Destroy** after the new app works).
3. **Create or update one app** pointing at `openear/server` (sections 3.3–3.7 below).
4. **Point `/api` to the new app only** — update `public_html/.htaccess` proxy port to the **new** app’s port (section 4.2).
5. **Rebuild the frontend on your PC** with Supabase vars removed from `.env` (see below).
6. **Paystack webhook** — must hit the **new** URL only: `https://yourdomain.com/api/payments/webhook`.

### Fix local `.env` before rebuilding

Remove Supabase keys and use:

```env
VITE_API_URL=
VITE_SITE_URL=https://yourdomain.com
```

Then `npm run build` and re-upload `out/` to `public_html`.

---

## Before you start — checklist

- [ ] Domain pointed to cPanel (e.g. `openearemedy.com`)
- [ ] **SSL** enabled (AutoSSL / Let's Encrypt in cPanel)
- [ ] **Setup Node.js App** available (cPanel → Software → Setup Node.js App)
- [ ] **PostgreSQL** available (cPanel → Databases → PostgreSQL)
- [ ] **SSH** access (recommended) or File Manager + Terminal in cPanel
- [ ] Node **18+** selectable in Setup Node.js App
- [ ] API keys ready: Paystack, Resend (email), Groq (chat) — optional Twilio (calls)

---

## Part 0 — Understand the folder layout

Recommended layout on the server:

```text
/home/YOUR_CPANEL_USER/
├── openear/                    ← full project (NOT web-accessible)
│   ├── server/                 ← Node API lives here
│   │   ├── app.cjs             ← cPanel startup file (LiteSpeed)
│   │   ├── src/index.js        ← Express entry
│   │   ├── package.json
│   │   ├── .env                ← secrets (never in public_html)
│   │   └── uploads/            ← ebook files (created at runtime)
│   ├── src/                    ← React source (only needed to build)
│   ├── package.json
│   └── .env                    ← build-time only (VITE_*)
│
└── public_html/                ← ONLY the built frontend
    ├── index.html
    ├── assets/
    ├── .htaccess               ← from public/.htaccess (SPA routing)
    └── ...
```

**Never** put `server/.env` or `JWT_SECRET` inside `public_html`.

---

## Part 1 — Build the frontend on your computer

### 1.1 Install dependencies (once)

```bash
cd openear
npm install
```

### 1.2 Create root `.env` for production build

Create `openear/.env` (same folder as `package.json`):

```env
# Same domain as website — API reached via /api proxy (see Part 4)
VITE_API_URL=
VITE_SITE_URL=https://openearemedy.com
```

Replace `openearemedy.com` with your real domain.

**If you use a separate API subdomain** (e.g. `api.openearemedy.com`):

```env
VITE_API_URL=https://api.openearemedy.com
VITE_SITE_URL=https://openearemedy.com
```

### 1.3 Build

```bash
npm run build
```

Output is in **`out/`**. Upload **everything inside `out/`** to `public_html` (not the `out` folder itself).

Optional (better SEO): `npm run build:prerender` if prerender works on your machine.

---

## Part 2 — PostgreSQL on cPanel

### 2.1 Create database and user

1. cPanel → **Databases** → **PostgreSQL Databases** (or **Postgres**).
2. **Create database** — e.g. `cpuser_openear`.
3. **Create user** — strong password.
4. **Add user to database** with **ALL PRIVILEGES**.

Write down:

| Field | Example |
|-------|---------|
| Host | Often `localhost` or `127.0.0.1` |
| Port | `5432` |
| Database | `cpuser_openear` |
| User | `cpuser_openear` |
| Password | (your password) |

### 2.2 Connection string

Format:

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Example:

```text
postgresql://cpuser_openear:MyStr0ngP@ss@localhost:5432/cpuser_openear
```

If the password contains `@`, `#`, `%`, etc., [URL-encode](https://www.urlencoder.org/) it.

If connection fails locally from the server, try appending:

```text
?sslmode=disable
```

### 2.3 Create tables (schema)

**Option A — SSH** (best):

```bash
cd ~/openear/server
npm install
cp .env.example .env
# edit .env and set DATABASE_URL=...
npm run db:migrate
```

**Option B — phpPgAdmin** (cPanel → PostgreSQL → phpPgAdmin):

1. Open your database.
2. SQL tab → paste contents of `server/db/schema.sql` → Execute.

You should see tables: `users`, `user_credits`, `credit_transactions`, `call_history`, etc.

---

## Part 3 — Deploy the Node API on cPanel

### 3.1 Upload the project

Upload the whole `openear` folder to `/home/YOUR_CPANEL_USER/openear` via:

- **File Manager** (zip locally → upload → Extract), or  
- **SFTP** (FileZilla), or  
- **Git** (if cPanel has Git Version Control): clone into `openear`

You need at least the **`server/`** folder on the server. Keeping full repo allows rebuilding frontend on the server later.

### 3.2 Create `server/.env`

On the server, create `/home/YOUR_CPANEL_USER/openear/server/.env`:

```env
NODE_ENV=production
PORT=3001

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE

JWT_SECRET=PASTE_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARS
JWT_EXPIRES_IN=7d

CLIENT_URL=https://openearemedy.com
CORS_ORIGINS=https://openearemedy.com,https://www.openearemedy.com

RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=Open Ear <noreply@openearemedy.com>

PAYSTACK_SECRET_KEY=sk_live_xxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_or_paystack_secret
PAYSTACK_CURRENCY=USD

GROQ_API_KEY=gsk_xxxxxxxx

ADMIN_EMAIL=you@openearemedy.com

UPLOAD_DIR=/home/YOUR_CPANEL_USER/openear/server/uploads
```

Notes:

- `CLIENT_URL` must match the public site URL (password-reset links).
- `CORS_ORIGINS` must list every origin the browser uses (with `https://`, no trailing slash).
- Use **absolute path** for `UPLOAD_DIR` on cPanel so uploads survive restarts.
- Leave optional keys empty if you are not using that feature yet.

Generate `JWT_SECRET` (on your PC):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3.3 Setup Node.js App in cPanel

1. cPanel → **Software** → **Setup Node.js App**.
2. Click **Create Application**.
3. Set:

| Setting | Value |
|---------|--------|
| Node.js version | 18.x or 20.x |
| Application mode | **Production** |
| Application root | `openear/server` (full path: `/home/USER/openear/server`) |
| Application URL | See **3.4** below |
| Application startup file | **`app.cjs`** (required on LiteSpeed; do not use `src/index.js`) |
| Passenger log file | default is fine |

4. Click **Create**.

### 3.4 Application URL — choose ONE approach

#### Approach A — Same domain (recommended)

- Application URL: often cPanel assigns a **port** or internal path.
- Many hosts expose the app on `http://127.0.0.1:PORT` and you **proxy** from Apache (Part 4).
- In Setup Node.js App, note the **port** (e.g. `3001` or an assigned port like `34567`). Use that in `.htaccess` proxy rules.

Set in `server/.env`:

```env
PORT=34567
```

(use the port cPanel shows for your application)

Frontend build:

```env
VITE_API_URL=
```

#### Approach B — API subdomain (simpler on some hosts)

1. cPanel → **Domains** → **Subdomains** → create `api.openearemedy.com`.
2. Create a **second** Node.js app OR point subdomain document root to the Node app (host-specific).
3. Common pattern: Node app URL = `https://api.openearemedy.com`, root = `openear/server`.

Frontend build:

```env
VITE_API_URL=https://api.openearemedy.com
```

`CORS_ORIGINS` must include `https://openearemedy.com`.

### 3.5 Install server dependencies (`npm: command not found` on cPanel)

On most cPanel accounts, **the default Terminal does not have `npm` on PATH**. That is normal. Node/npm are tied to **Setup Node.js App**, not the system shell.

**You only need `npm` on the server for the API** (`openear/server`). The React frontend should be built on your PC (`npm run build`) and uploaded as static files in `out/` — you do **not** need `npm` in cPanel for the frontend.

#### Option 1 — Use cPanel UI (recommended)

1. Create the Node.js application first (section 3.3) with **Application root** = `openear/server`.
2. Open that application in **Setup Node.js App**.
3. Click **Run NPM Install** (or **NPM Install**).
4. Wait until it finishes, then click **Restart**.

This runs `npm install` with the correct Node version for that app.

#### Option 2 — Activate Node in Terminal, then run npm

1. **Setup Node.js App** → open your application.
2. Find the block labeled **Enter to the virtual environment** (or **Environment variables / command to enter virtual environment**). It looks like:

```bash
source /home/USER/nodevenv/openear/server/18/bin/activate && cd /home/USER/openear/server
```

3. Copy that **entire** line, paste it into **cPanel Terminal** or SSH, press Enter.
4. Then run:

```bash
npm install --production
npm run db:migrate
```

5. In cPanel UI, click **Restart** on the Node app (do not rely on `npm start` in SSH for production).

#### Option 3 — Add Node to PATH manually (if Option 2 path differs)

List installed Node versions:

```bash
ls /opt/cpanel/ea-nodejs*/
```

Then (example for Node 18):

```bash
export PATH=/opt/cpanel/ea-nodejs18/bin:$PATH
node -v
npm -v
cd ~/openear/server
npm install --production
```

To make this persist for future SSH sessions:

```bash
echo 'export PATH=/opt/cpanel/ea-nodejs18/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

Use the version folder that exists on your server (`ea-nodejs20`, `ea-nodejs16`, etc.).

#### If `npm` is still not found

- **Setup Node.js App** is missing → your plan may not include Node; ask the host to enable it, or use a VPS.
- You have not **created** a Node.js application yet → create it first (section 3.3); npm is not global on shared hosting.
- You are in the **wrong directory** → `cd` to `openear/server` (where `package.json` for the API lives), not `public_html` or the repo root.

### 3.6 Run database migration (if not done in 2.3)

After npm works (Option 1–3 above):

```bash
# If you used Option 1 (UI), use Terminal with virtualenv (Option 2) for migrate:
npm run db:migrate
```

Or run `server/db/schema.sql` in phpPgAdmin (section 2.3).

### 3.7 Start / restart the app

In Setup Node.js App → **Restart**.

Or SSH:

```bash
cd ~/openear/server
npm start
```

(Production should use cPanel/Passenger restart, not a manual `node` in SSH unless you use a process manager.)

### 3.8 Test the API

Replace domain/port as appropriate:

```text
https://openearemedy.com/api/health
```

or

```text
https://api.openearemedy.com/api/health
```

Expected JSON:

```json
{ "ok": true, "database": true }
```

If `database: false` → fix `DATABASE_URL`.  
If 404 → proxy or Node app URL not wired (Part 4).

---

## Part 4 — Deploy the frontend to `public_html`

### 4.1 Upload build output

1. On your PC, after `npm run build`, open the `out/` folder.
2. Select **all files inside** `out/` (`index.html`, `assets/`, etc.).
3. Upload to `public_html/` (overwrite existing `index.html` if any).

### 4.2 SPA routing (`.htaccess`)

The repo includes `public/.htaccess`; it is copied into `out/` when you build.

If `public_html/.htaccess` is missing, create it:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Proxy /api and /uploads to Node (use YOUR assigned port from Setup Node.js App)
  RewriteCond %{REQUEST_URI} ^/api [OR]
  RewriteCond %{REQUEST_URI} ^/uploads
  RewriteRule ^(.*)$ http://127.0.0.1:YOUR_PORT/$1 [P,L]

  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Replace `YOUR_PORT` with the port from Setup Node.js App (e.g. `34567`).

**If proxy `[P]` fails** (500 error):

- cPanel may disable `mod_proxy` — use **Approach B** (API subdomain) instead, or ask host to enable `mod_proxy`.
- Alternative: cPanel → **Domains** → **Redirects** / **Application Manager** documentation for your host.

Uncomment or add proxy lines only for **Approach A**.

### 4.3 Verify the site

1. Open `https://openearemedy.com` — home page loads.
2. Open `https://openearemedy.com/signin` — refresh page; should **not** 404 (proves SPA rules work).
3. Browser DevTools → Network → sign in → requests go to `/api/auth/...` and return JSON (not HTML).

---

## Part 5 — First admin user

The API has no public “make me admin” endpoint. After you sign up once on the live site:

### 5.1 Sign up on the website

1. Go to `https://openearemedy.com/signin` → create account → verify email (needs `RESEND_API_KEY`).

### 5.2 Promote your user in PostgreSQL

phpPgAdmin or SSH:

```sql
INSERT INTO admin_users (user_id, role)
SELECT id, 'admin' FROM users WHERE email = 'your@email.com';
```

### 5.3 Admin login

1. `https://openearemedy.com/admin-login`
2. Sign in with that email.
3. Admin dashboard should load with real analytics (zeros until you have data).

---

## Part 6 — Paystack (payments)

1. [Paystack Dashboard](https://dashboard.paystack.com) → **Settings** → **API Keys** → copy **Secret key** → `PAYSTACK_SECRET_KEY` in `server/.env`.
2. **Settings** → **Webhooks** → add:

```text
https://openearemedy.com/api/payments/webhook
```

(or `https://api.openearemedy.com/api/payments/webhook` if using subdomain)

3. Copy webhook secret → `PAYSTACK_WEBHOOK_SECRET`.
4. Restart Node.js app.
5. Test a small live payment on `/pricing` or `/dashboard`.

---

## Part 7 — Email (signup OTP, password reset)

1. [Resend](https://resend.com) → API key → `RESEND_API_KEY`.
2. Verify your domain in Resend; set `EMAIL_FROM` to an address on that domain.
3. Restart Node app.
4. Test sign-up and forgot-password flows.

Without Resend, auth may work only if you manually verify users in the database (`email_verified_at`).

---

## Part 8 — Optional services

| Feature | Env vars |
|---------|----------|
| AI chat | `GROQ_API_KEY` |
| Voice calls | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Appointment alerts | `ADMIN_EMAIL`, `RESEND_API_KEY` |

---

## Part 9 — Updating the app later

### Frontend only

```bash
# On PC
npm run build
# Upload contents of out/ to public_html
```

### API only

```bash
# Upload changed files in server/
# cPanel → Setup Node.js App → Restart
```

### Schema changes

```bash
cd ~/openear/server
npm run db:migrate
```

---

## Troubleshooting

### phpPgAdmin: `syntax error at or near "CREATE"` on `CREATE EXTENSION`

- **Wrong tool:** You opened **phpMyAdmin** (MySQL). Use **phpPgAdmin** for PostgreSQL only.
- **Extension blocked:** Older `schema.sql` had `CREATE EXTENSION pgcrypto` — cPanel often rejects it. Use the current `schema.sql` (no extension line); `gen_random_uuid()` works on PostgreSQL 13+ without it.
- **Bad paste:** Copy from line 1 of `schema.sql` only — no line numbers, no partial file. Re-copy from your PC after pulling the updated schema.

---

### `Cannot find module .../server/src/migrate.js`

The file exists in the repo but was **not uploaded** to cPanel (incomplete `server/` folder).

**Option A — Upload missing files**

Upload the entire `server/` folder from your PC, especially:

- `server/src/migrate.js` (and all of `server/src/`)
- `server/db/schema.sql`
- `server/package.json`

Then:

```bash
cd ~/openear/server
# use virtualenv from Setup Node.js App first, then:
npm run db:migrate
```

**Option B — Skip migrate script (fastest)**

cPanel → **phpPgAdmin** → your **PostgreSQL** database (not MySQL/phpMyAdmin) → **SQL**:

1. Paste all of `server/db/schema.sql` (no `CREATE EXTENSION` line — cPanel often blocks it).
2. Click **Execute** / **Go**.
3. If you still get errors, run **one `CREATE TABLE` block at a time** (from each `CREATE TABLE` through its closing `);`).

Do **not** use phpMyAdmin — that is MySQL and will fail on this file.

---

### stderr: `Cannot use import statement outside a module` (lsnode.js)

LiteSpeed/cPanel loads the startup file with **`require()`**, so **`src/index.js` cannot be the startup file** when it uses `import`.

**Fix:**

1. Upload `server/app.cjs` from the repo (already in the project).
2. In **Setup Node.js App**, set **Application startup file** to **`app.cjs`** (not `src/index.js`).
3. **Run NPM Install** → **START APP**.

`app.cjs` loads the real API: `src/index.js`.

---

### stderr: `require is not defined` on `index.js` line 1 (`var http = require`)

The file on the server is **not** Open Ear’s API. It was overwritten (old template / Rismak app). Line 1 must be:

```js
import express from 'express';
```

**Fix:** From your PC, re-upload the entire `server/src/` folder (zip → extract in File Manager), overwriting `/home2/openeare/server/src/`. Then **Restart** Node app.

### stderr: `SyntaxError` in `middleware.js` at `requireAuth(async (req`

Invalid syntax in an older copy. Use the fixed repo file (`export async function requireAuth(req, res, next)`). Re-upload `server/src/middleware.js` with the full `server/src/` upload above.

---

### Sign-in 404 or `api.openearemedy.com/api/...` 404

`api.openearemedy.com` only works if a **second** Node.js app is created with **Application URL** = `api.openearemedy.com` and root `openear/server`. If the subdomain shows 404 for `/api/health`, the subdomain is **not** running the API (static site or wrong app).

**Fix A (simplest):** Use the main domain for API:

```env
VITE_API_URL=
VITE_SITE_URL=https://openearemedy.com
```

Rebuild, upload `out/`. Ensure `public_html/.htaccess` proxies `/api` to your Node port and **https://openearemedy.com/api/health** returns JSON.

**Fix B:** Create/fix Node app on `api.openearemedy.com` → test **https://api.openearemedy.com/api/health** (must be JSON before setting `VITE_API_URL=https://api.openearemedy.com`).

---

### `/api/health` returns 404 (openearemedy.com)

This almost always means **Apache is not forwarding `/api` to Node**. The React site can work while the API does not.

**Fix A — `.htaccess` proxy (same domain)**

1. cPanel → **Setup Node.js App** → open the app for `openear/server` → note the **port** (often not `3001`, e.g. `34567`).
2. Confirm the app is **Running** → click **Restart** if unsure.
3. cPanel → **File Manager** → `public_html` → edit **`.htaccess`**.
4. Ensure these lines exist **above** the `index.html` SPA rules (order matters):

```apache
RewriteCond %{REQUEST_URI} ^/api [OR]
RewriteCond %{REQUEST_URI} ^/uploads
RewriteRule ^(.*)$ http://127.0.0.1:YOUR_PORT/$1 [P,L]
```

Replace `YOUR_PORT` with the port from step 1.

5. Save → test https://openearemedy.com/api/health again.

If you get **500** instead of 404, your host may block `mod_proxy` — use **Fix B**.

**Also on your PC:** run `npm run build` and re-upload `out/` so `public_html/.htaccess` includes the proxy block (see `public/.htaccess` in the repo).

**Fix B — API subdomain (when proxy `[P]` fails)**

1. Create subdomain `api.openearemedy.com` → point Node app URL there (Setup Node.js App).
2. Test https://api.openearemedy.com/api/health (should return JSON).
3. Rebuild frontend with `VITE_API_URL=https://api.openearemedy.com` and upload `out/`.
4. Add `https://openearemedy.com` to `CORS_ORIGINS` in `server/.env` → Restart Node.

**Still 404?**

| Check | Action |
|-------|--------|
| No Node app for `openear/server` | Create it (Part 3); old Supabase app does not serve `/api/health` |
| Node app stopped | **Restart** in Setup Node.js App |
| Wrong port in `.htaccess` | Must match cPanel app port exactly |
| Only `public_html` uploaded | API lives in `openear/server`, not in `public_html` |

---

| Problem | What to check |
|---------|----------------|
| `npm: command not found` in cPanel Terminal | Use **Setup Node.js App → Run NPM Install**, or `source .../nodevenv/.../activate` from the app page (section 3.5). Do not expect global `npm`. |
| Blank page | Browser console for JS errors; wrong `VITE_API_URL` at build time — rebuild |
| `/signin` 404 on refresh | `.htaccess` missing or `mod_rewrite` off |
| API returns HTML | Proxy not routing `/api` to Node; fix `.htaccess` or use API subdomain |
| CORS error | `CORS_ORIGINS` must exactly match `https://yourdomain.com` |
| `database: false` | `DATABASE_URL` wrong; user lacks privileges; Postgres not running |
| 502 on `/api` | Node app crashed — check Setup Node.js App logs / `stderr.log` |
| Paystack works but no credits | Webhook URL wrong or signature secret wrong; check server logs |
| Uploads 404 | Proxy `/uploads` to Node; `UPLOAD_DIR` writable |
| Admin “Access denied” | Missing row in `admin_users` |

### Log locations (typical cPanel)

- Setup Node.js App → **Open log** / `stderr.log` in application root
- Apache: cPanel → **Metrics** / **Errors** / `error_log` in `public_html`

### Rebuild frontend after env change

`VITE_*` variables are **baked in at build time**. Changing `.env` on the server does **not** change the frontend until you run `npm run build` again and re-upload `out/`.

---

## Quick reference — environment variables

### On your PC (`openear/.env`) — build only

```env
VITE_API_URL=
VITE_SITE_URL=https://openearemedy.com
```

### On server (`openear/server/.env`) — runtime

Required:

- `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `CORS_ORIGINS`, `NODE_ENV=production`, `PORT`

For production features:

- `RESEND_API_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `GROQ_API_KEY`, `ADMIN_EMAIL`

---

## Support from your host

If **Setup Node.js App** or **PostgreSQL** screens differ, your host’s docs for “Node.js Selector” / “Passenger” are authoritative. Share your host name (e.g. Namecheap, Hostinger, GoDaddy) if you need host-specific screenshots.
