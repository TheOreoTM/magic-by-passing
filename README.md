# Magic in Passing

`frieren.oreotm.xyz` is an unofficial Frieren fan-game collection: small games from a long journey. Its first game is FrierenGuessr, where a player identifies a TV episode from a curated still frame.

Product and engineering decisions live in `docs/`.

## App development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run lint
npm run build
```

The focused browser suite uses Playwright. Install its Chromium runtime once, then run it against
the configured database:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

The Connections browser flow is read-only with respect to puzzle content and therefore expects a
complete approved puzzle for the current UTC date.

Before a production deployment, run `npm run env:check` against the intended environment and follow [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md).

## Site branding

Names, taglines, header marks, favicon paths, and recurring special-occasion dates live in
[`src/lib/site-brand.ts`](src/lib/site-brand.ts). Nyamon activates automatically on April 1 UTC.

To preview or force a brand on another occasion, set `NEXT_PUBLIC_SITE_BRAND_OVERRIDE` to
`nyamon` or `default`, then restart or redeploy the app. Leave it unset to use the automatic
schedule.

## Local curator

Install `ffmpeg`/`ffprobe`, copy `.env.example` to `.env.local`, set an absolute `CURATOR_MEDIA_ROOT`, and run:

```bash
npm run curator
```

See `tools/curator/README.md` for the media workflow, timestamp model, generated paths, and local safety boundary.

## Database

Set `DATABASE_URL` in `.env.local`. Local tooling and the deployed app use the same configured database, so migration, seed, and test commands may affect live data.

```bash
npm run db:migrate
npm run db:migrate:deploy
npm run db:seed
```

Use `db:migrate` while creating a new migration and `db:migrate:deploy` to apply already committed migrations. The schema includes curated Guessr content plus Auth.js users, accounts, and sessions.

## Frame pipeline and admin

After approving local frames and configuring the R2 variables from `.env.example`:

```bash
npm run frames:push
```

The command validates each WebP, uploads it under an opaque key, upserts its `Frame` record, and marks the local manifest entry as pushed. It is safe to retry.
After rebuilding the configured database or changing the target, use `npm run frames:push -- --all` to synchronize entries already marked as pushed.

The frame manager at `/admin/frames` requires an authenticated user with the `ADMIN` role. See the Discord setup below for bootstrapping the first administrator, and `tools/frames/README.md` for the frame pipeline safety model.

## Connections authoring

Administrators prepare future Connections puzzles at `/admin/connections`. With
`OPENROUTER_API_KEY` configured, the AI-assisted panel can arrange the curated catalogue into draft
candidates, run a second-model critique, and show the estimated request cost. Choosing a candidate
saves it only as a draft; review and editing remain required before approval. Replacing an existing
draft requires an explicit confirmation and approved puzzles cannot be overwritten by the generator.

## Unlimited FrierenGuessr

Generate a signing secret for anonymous game sessions and add it to `.env.local`:

```bash
openssl rand -base64 32
```

```env
GUESSR_SESSION_SECRET="generated value"
```

Run `npm run dev`, then open `/guessr`. Anonymous state is kept in a signed HttpOnly cookie; answers and scoring remain server-side.

## Daily FrierenGuessr

Daily mode at `/guessr/daily` requires Discord sign-in. Every account gets one ranked five-round attempt per UTC date; completed replays are practice runs. The current leaderboard and saved Daily history are available at `/leaderboards/guessr`.

Administrators prepare future challenges at `/admin/dailies`. Generate any future UTC date range, inspect or replace its frames, then approve it. Challenge composition locks when its date begins. If no approved challenge exists at 00:00 UTC, the first Daily request persists one fallback composition and reuses it for everyone. `VOID DAILY` is reserved for a broken challenge and invalidates its ranked results.

Frames scheduled for today or a future non-void Daily are automatically held out of Unlimited. A frame is never assigned to more than one Daily, so the available scheduling horizon depends on the approved frame inventory.

## Profiles and progression

Signed-in players build a public game profile at `/user/[username]`. Ranked Daily completions and signed-in Unlimited completions contribute auditable statistics, XP, levels, and a small achievement set. Private Discord/account fields are never included in the public profile query.

XP is stored as an append-only transaction ledger. Daily awards are keyed by ranked attempt, Unlimited awards by signed game ID, and achievement awards by achievement ID, so retries cannot pay twice. Unlimited awards 10 XP per completed game up to 100 XP per UTC day; the exact values and level curve live in `src/features/progression/domain/`.

## Discord authentication

Create an application in the Discord Developer Portal and add this local OAuth redirect:

```text
http://localhost:3000/api/auth/callback/discord
```

For production, add the equivalent callback on the production origin. Then configure:

```env
AUTH_DISCORD_ID="Discord application client ID"
AUTH_DISCORD_SECRET="Discord application client secret"
AUTH_SECRET="random Auth.js secret"
ADMIN_DISCORD_ID="your personal Discord user ID"
```

Generate `AUTH_SECRET` with `npx auth secret`. `ADMIN_DISCORD_ID` is read only on the server; when that Discord account signs in, its database role is promoted to `ADMIN`. Existing manually assigned admins are not demoted if the variable later changes.

New Discord users are sent through `/onboarding` once to review their public username and display name. Discord provider IDs and direct Discord avatar URLs are not exposed by public site UI.
The OAuth request uses only Discord's `identify` scope; Discord email addresses are neither requested nor stored.
