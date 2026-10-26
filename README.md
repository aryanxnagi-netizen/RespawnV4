# RESPAWN — Find Your Squad. Build Your Legacy.

A mobile-first gaming social network: teammate finder, Gamer ID portfolio, clips, community events.

> **Current state: a working, tested DEMO.** Everything runs in your browser and is saved only on your device.
> There are no accounts, no real chat, no video storage and no coin economy yet — the app says so on every screen
> where that matters. See **Feature status** below (also inside the app: Menu → Feature status).

## Why plain HTML/JavaScript and not React?

The brief preferred React + TypeScript + Vite. The build workspace could not download npm packages
(the npm registry was blocked), and you work from a phone with no terminal. So this build uses **zero dependencies**:
plain HTML, CSS and JavaScript. It opens anywhere, hosts for free on any static host, and needs no build step.
Moving to React later is straightforward because the logic (`matching.js`, `games.js`, `data.js`) is framework-free.



## GitHub Pages upload (important)

This project is a **static site**: it has no npm install, no build command, and no `dist` folder.

1. Extract the ZIP. The `index.html` file should be directly at the top level of what you upload (not inside an extra project folder). If your file manager shows a folder before you see `index.html`, open that folder first.
2. Upload **the contents** of that folder: `index.html`, `css/`, `js/`, `icons/`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, and the remaining project files.
3. In GitHub, open **Settings → Pages**, select **Deploy from a branch**, choose the branch (usually `main`) and folder `/ (root)`, then save.
4. Wait for the Pages deployment to complete, then open `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. Keep the paths relative; do not change them to `/css/...` or `/js/...`, because a project Pages site lives in a subfolder of the domain.
5. If a previous blank version is cached, open the site in Chrome and reload it once after the new deployment. The service-worker cache was versioned for this refresh.

### UI refresh in this ZIP

- Reworked the existing design tokens into a charcoal/black/white system with clearer text hierarchy, calmer cards, less glow, and subtle transitions/entry animations.
- Redesigned ARENA cards and filters without replacing its registration logic.
- Added a visible messages shortcut and an interactive local demo inbox/chat. Demo messages are stored only in this browser and are **not sent to other players**; real multi-user chat still requires authentication and a secured backend.
- Kept the plain JS architecture and original matching, feed, profile, and registration flows. No new runtime dependencies were added.

## Open it on your Samsung phone

A phone can't run these files by double-tapping them, so put them on a free static host:

1. **Easiest — Netlify Drop** (free, no card): on a laptop-less phone, zip this folder, open `app.netlify.com/drop`
   in Chrome and upload the zip. You get an `https://….netlify.app` link.
2. **Or GitHub Pages / Cloudflare Pages** (free): upload the folder to a GitHub repo and enable Pages.
3. Open the link in Chrome → ⋮ menu → **Add to Home screen** to install it like an app (it's a PWA).

*Nothing has been deployed by the builder; no live URL exists until you do one of the above.*

## What's inside

| Path | What it is |
|---|---|
| `index.html`, `css/styles.css` | App shell + design system (tokens, buttons, cards, badges, skeletons, toasts, sheets) |
| `js/games.js` | Game catalog: 7 launch games, ranks/modes/roles. **Community categories, not official integrations** |
| `js/matching.js` | **Squad Finder algorithm** — deterministic, weighted, explainable. No AI, no randomness |
| `js/data.js` | Clearly-labelled **demo** gamers, posts, clips, tournaments |
| `js/store.js` | Local-only demo storage (`localStorage`). Holds **no** coin balance |
| `js/screens1-3.js`, `js/app.js` | Screens, router, interactions |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA install + offline app shell |
| `supabase/migrations/` | **Backend schema with Row Level Security** and a server-owned coin ledger |
| `supabase/tests/` | 69 security tests (`run_local.sh`) |
| `tests/` | 21 unit tests (Node) + 81 browser checks (Playwright) |
| `.env.example` | Variable **names** only; says which are public vs server-secret |

## How the Squad Finder score works

Hard filters first (wrong game, blocked either way, not looking for group, invites off, incompatible platform,
and any filter you set). Then each remaining player scores 0–100 from seven factors:

| Factor | Weight | Idea |
|---|---|---|
| Game & mode | 25 | same mode scores highest |
| Rank | 20 | fades to 0 at 4 tiers apart |
| Role | 15 | *different* roles score higher (they complement), flex is good |
| Language | 10 | share of shared languages |
| Region / server | 10 | same server > same region > both in India |
| Play times | 10 | overlap of weekday/weekend slots |
| Playstyle & comms | 10 | casual/competitive + communication style |

Weights are configurable (Squad Finder → Filters → Tune weights; the UI refuses anything that doesn't total 100).
The explanation ("81% compatibility — same game and mode, complementary roles, …") is generated from the real
attribute comparison. **It is a heuristic estimate, not AI and not a validated probability.** Ranks are self-reported.

## Tests that were actually run

| Suite | Command | Last verified result |
|---|---|---|
| Algorithm + data (Node) | `node --test tests/matching.test.js tests/data.test.js` | **21 / 21 passed** after the UI refresh |
| Browser, phone size 412×915 (Playwright/Chromium) | `python3 tests/e2e.py` | Suite updated for the refreshed ARENA and chat UI; rerun locally to verify this version |
| Database security (PostgreSQL 16) | `bash supabase/tests/run_local.sh` | Previous baseline: 69 / 69 passed, plus a 3-way concurrent double-spend race (1 charge, 2 rejected); SQL was not changed in this refresh |

Caveats: the browser tests ran in headless Chromium, **not on a real Samsung device**. The SQL ran on plain
PostgreSQL 16 with a small stand-in for Supabase's `auth` schema and roles, **not on a real Supabase project**.
The e2e suite needs Playwright (`pip install playwright`) and a Chromium; the SQL suite needs PostgreSQL server binaries.

## Feature status

**A. Implemented and tested** — matching algorithm & filters; onboarding validation; navigation; feed like/comment/
bookmark/follow/post/delete/report/block flows; Squad Finder, invites (local), ARENA event states & registration (local);
Gamer ID + free customization studio; search; notifications (from real local actions only); settings; offline banner;
database schema, RLS and coin-ledger rules (on local Postgres).

**C. Demo-only (saved on this device, nobody else is involved)** — all social content, follows, invites, registrations, reports, blocks, notifications, Gamer ID. Sample people/posts/clips/events are invented and labelled.

**D. Needs your setup** — accounts/login/password reset (Supabase Auth), real database use, media storage for images/clips/voice intros, realtime chat, hosting.

**E. Not built yet** — chat & group chat; creating/joining squads and incoming requests; comment replies, post editing, drafts, image/video posts; coin wallet UI, missions, cosmetic store, subscriptions; tournament creation, brackets, result submission/verification, leaderboards, disputes; admin dashboard UI (the database functions exist); rate limiting; data-saver mode; official game integrations; Android APK.

## Connecting a real backend (when you're ready — free tier, may ask for no card)

1. Create a free project at supabase.com (check their current free-tier limits first; free projects can pause when idle).
2. SQL Editor → run `0001_core_schema.sql`, then `0002_wallet_ledger.sql`.
3. Put `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the app (these are public by design). **Never** put the
   service-role key or DB password in app code, a public repo, or a chat.
4. Give yourself the first admin role from the dashboard (Table editor → `user_roles`), never from the app.
5. The app is **not wired to Supabase yet** — that is the next build step (auth first, then profiles, then posts).

## Security decisions already made

* Row Level Security on every table; column-level grants so clients cannot touch `suspended`, `verification_status`, roles, moderation fields.
* Coins: clients can only *read* wallet/ledger. The only client write is `spend_coins()` (server-side price, row lock, idempotency key, no negative balance). `grant_coins()` is executable by the server only.
* Private in-game IDs live in an owner-only table, never beside public profile data.
* No birth date, phone, address or precise location is collected anywhere. Profiles default to **private**.
* Ranks are labelled **self-reported**; only a server can ever mark a result `organizer_verified` or `game_confirmed`.
* Admin power comes from a roles table clients cannot read or write. No hard-coded admin password exists.

## Before any public launch (not done)

* Real accounts + email verification + secure password reset, tested on a real Supabase project.
* **Child safety & legal review.** The audience starts at age 11. India's Digital Personal Data Protection Act, 2023 and its rules
  (verifiable parental consent for under-18s, restrictions on tracking/targeted ads for children), the IT Rules, and
  consumer-protection rules apply. Get qualified legal advice. Nothing here claims compliance.
* Moderation team + working report queue UI, rate limits, spam controls, upload scanning.
* Check each game publisher's terms before any official stats; rank ladders in `games.js` are approximations to verify.
* Virtual coins stay non-cash. Anything involving real money, payments or prizes needs a legally reviewed design first.

## Android APK path (not built)

This is a PWA (installable from Chrome). A real APK is not produced. Options: **Bubblewrap / PWABuilder** wrap a hosted
PWA into a Trusted Web Activity (needs the site on HTTPS, a signing key you keep safe, and typically a computer or a cloud build
service); **Capacitor** for a native shell. A Play Store listing costs a one-time developer fee, and requires a privacy policy
and child-safety declarations.


## GitHub upload (flat-file edition)
This package places every file in the repository root. Upload all extracted files together. Keep filenames unchanged. `index.html` is the entry point. Backend SQL and test files have prefixes to avoid folders and filename collisions; they are reference files and are not needed to run the front-end demo.
