# Open Ear

Emotional support at https://openearemedy.com: talk to a trained Listener on an in-browser call, or chat with an AI Companion. Pricing is in Kenyan shillings, with Credits and a Monthly Pass. Words like *Listener*, *Credit* and *Connected Time* have exact meanings, defined in [GLOSSARY.md](GLOSSARY.md).

## Layout

```text
apps/
  web/        React 19 + Vite + Tailwind website (Vercel)
  api/        Express API, call signaling WebSocket, migrations, pass-reminder job (Render)
    db/migrations/   numbered SQL, applied in order by `npm run db:migrate`
packages/
  shared/     pricing rules and call message types, used by both apps
docs/adr/     why the architecture is the way it is
.github/workflows/scheduled.yml   keep-awake ping + daily pass reminders
```

## Run it locally

Requires Node 20+ and a Postgres database (a Neon branch or a local one).

```bash
npm install                 # also builds packages/shared
cp .env.example .env        # fill in DATABASE_URL at minimum
npm run db:migrate
npm run dev:api             # API on http://localhost:3001
npm run dev                 # website on http://localhost:3000 (proxies /api, /uploads and /ws)
```

Optional services can be left empty in `.env`:
- **No storage settings:** uploads go to `apps/api/uploads`.
- **No `OPENROUTER_API_KEY`:** AI chat returns "not configured".
- **No TURN key:** calls connect directly, which works between two tabs on most machines.

To make yourself an admin, see [DEPLOYMENT.md §7](DEPLOYMENT.md#7-first-admin-and-first-listener).

## Checks

```bash
npm run db:test:start   # throwaway Postgres + pgvector in Docker (npm run db:test:stop when done)
npm test          # shared pricing tests, plus API tests when TEST_DATABASE_URL is set
npm run lint
npm run type-check
npm run build
npm run review:companion -w @openear/api   # real AI replies to 30 test conversations, for a professional to review
```

The API tests **wipe** the database in `TEST_DATABASE_URL`, and refuse to run unless its name contains `test`.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md).
