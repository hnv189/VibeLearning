# Deploying Vibe Street

This guide gets Vibe Street online so friends can join from anywhere, not just your Wi-Fi.

## TL;DR: which path should I pick?

Vibe Street has two parts:

- **Frontend**: the files in `public/` (HTML, CSS, JS) that run in the browser.
- **Backend**: `server.js`, a Node.js server that keeps rooms, players, chat and orders in sync over **WebSockets** (Socket.IO). It needs to stay running and keep connections open.

**Vercel can't run this backend.** Vercel Functions start, answer one request and stop. They can't hold the long-lived WebSocket connections Socket.IO needs. So you have three options:

| Path | What goes where | Code changes | Supabase needed? | Recommended for |
| --- | --- | --- | --- | --- |
| **A. Everything on Render** | Frontend + backend together on one Render web service | **None** | No | ✅ Getting online today |
| **B. Vercel + Render** | Frontend on Vercel, backend on Render | Small (about 4 edits) | No | You specifically want the site on Vercel |
| **C. Vercel + Supabase** | Frontend on Vercel, realtime + data on Supabase, no Node server | Large (rewrite the networking) | **Yes** | Long term: no server to babysit, data that survives restarts |

**Do you need Supabase right now? No.** The app keeps everything in memory and needs no database. Supabase only becomes useful for Path C, or if you later want things like dishes and settings surviving a restart, user accounts, or saved profiles.

> Start with **Path A**. You can move to B or C later without losing anything.

---

## Step 0: Prepare the project (all paths)

### 0.1 Install the tools

- **Git**: https://git-scm.com/downloads
- **A GitHub account**: https://github.com (Render and Vercel deploy from a GitHub repo)
- **Node.js 20 or newer**: you already have Node 22.

### 0.2 Add a `.gitignore`

Create a file named `.gitignore` in the project root (next to `package.json`) with:

```gitignore
node_modules/
.env
*.log
.DS_Store
```

This keeps the large `node_modules` folder and any secrets out of GitHub.

### 0.3 (Recommended) Pin the Node version

In `package.json`, add an `engines` field so the host uses a modern Node:

```json
{
  "name": "vibe-street",
  "engines": { "node": ">=20" },
  ...
}
```

### 0.4 Check your custom music

Anything inside `public/audio/` gets uploaded and becomes publicly downloadable. Only put music there that you have the right to share. YouTube links are fine because they play through YouTube's own player.

### 0.5 Test locally one last time

```bash
npm install
npm start
```

Open http://localhost:3000 in two different browsers (for example Edge and an Incognito window), join the same room, and check that you see each other move.

### 0.6 Push to GitHub

1. On GitHub, click **New repository**, name it (e.g. `vibe-street`), keep it **empty** (no README), and create it.
2. In a terminal in the project folder:

```bash
git init
git add .
git commit -m "Vibe Street"
git branch -M main
git remote add origin https://github.com/<your-username>/vibe-street.git
git push -u origin main
```

---

## Path A: Everything on Render (recommended, no code changes)

Render runs `server.js` as a normal always-on Node process, which is exactly what Socket.IO needs. It serves the `public/` folder too, so one URL does everything.

### A.1 Create the service

1. Sign up at https://render.com (you can log in with GitHub).
2. Click **New → Web Service**.
3. Choose **Build and deploy from a Git repository**, connect GitHub, and pick your `vibe-street` repo.

### A.2 Fill in the settings

| Setting | Value |
| --- | --- |
| Name | `vibe-street` (this becomes part of your URL) |
| Region | The one closest to you and your friends (e.g. Singapore for Vietnam) |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` to start |

You don't need to set `PORT`. Render provides it and `server.js` already reads `process.env.PORT`.

### A.3 Deploy

Click **Create Web Service**. The first build takes a couple of minutes. When the log shows `Vibe Street is open at http://localhost:...` and the status turns **Live**, open the URL at the top of the page:

```
https://vibe-street.onrender.com
```

(Yours will have the name you chose.)

### A.4 Test it

1. Open the URL on your computer and on your phone (on mobile data, not Wi-Fi, to prove it's really online).
2. Join the same room on both. Walk, chat, order food, paste a YouTube link as host.
3. Send the link to a friend.

### A.5 Things to know about the free tier

- **It sleeps.** A free Render service spins down after about 15 minutes with no visitors. The next visitor waits about a minute while it wakes up. A paid instance stays awake.
- **Restarts reset rooms.** Every deploy or restart clears who's host, the music choice, and dishes on tables, because they're kept in memory. People's browsers reconnect by themselves.
- **Run one instance only.** Rooms live in the memory of a single server process. Don't scale to 2+ instances unless you add a shared store (for example the Socket.IO Redis adapter).

### A.6 Updating the site later

Every `git push` to `main` redeploys automatically:

```bash
git add .
git commit -m "Describe the change"
git push
```

### A.7 (Optional) Your own domain

In Render: **Settings → Custom Domains → Add**, then add the DNS record Render shows you at your domain registrar. HTTPS is set up for you.

> **Alternatives to Render** that also support WebSockets with no code changes: **Railway** (New Project → Deploy from GitHub repo → Settings → Networking → Generate Domain) and **Fly.io**. Check their current pricing. They change their free plans more often than Render does.

---

## Path B: Frontend on Vercel, backend on Render

Use this if you want the website itself served by Vercel (fast global CDN, preview deploys for every branch). The realtime server still has to live on Render, because Vercel can't host it.

### B.1 Deploy the backend first

Follow **Path A** completely. Note your Render URL, e.g. `https://vibe-street.onrender.com`. You'll call it `BACKEND_URL` below.

### B.2 Code changes needed

Right now the browser assumes the backend is on the **same** website it was loaded from. With Vercel, it isn't, so four things change. *(Ask Claude: "apply the Path B changes from DEPLOYMENT.md" and they can be done for you.)*

1. **Tell the frontend where the backend is.** Add a small `public/config.js`:
   ```js
   // Empty = same origin (Path A / local). Set to your Render URL for Path B.
   window.VIBE_BACKEND = 'https://vibe-street.onrender.com';
   ```
   and load it in `public/index.html` before `main.js`.
2. **Load the Socket.IO client from a CDN** instead of `/socket.io/socket.io.js` (that path only exists on the Node server), e.g. `https://cdn.socket.io/4.8.1/socket.io.min.js`.
3. **Point networking at the backend** in `public/js/main.js`:
   - `io(window.VIBE_BACKEND || undefined, { autoConnect: false })`
   - `fetch((window.VIBE_BACKEND || '') + '/api/rooms')`
4. **Allow the Vercel site to connect** in `server.js` (CORS):
   - `new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN } })`
   - send `Access-Control-Allow-Origin: <CLIENT_ORIGIN>` on `/api/rooms`
   - then in Render → **Environment**, add `CLIENT_ORIGIN = https://<your-project>.vercel.app`

Push these changes. Render redeploys the backend automatically.

### B.3 Deploy the frontend on Vercel

1. Sign up at https://vercel.com with GitHub.
2. **Add New → Project** and import the `vibe-street` repo.
3. Configure:

| Setting | Value |
| --- | --- |
| Framework Preset | `Other` |
| Root Directory | `./` (project root) |
| Build Command | *(leave empty / override to nothing)* |
| Output Directory | `public` |
| Install Command | *(leave empty)* |

4. Click **Deploy**. You get a URL like `https://vibe-street.vercel.app`.
5. Make sure that exact URL is the `CLIENT_ORIGIN` on Render (B.2 step 4). If you add a custom domain later, update `CLIENT_ORIGIN` too.

### B.4 Test

Open the Vercel URL. In the browser dev tools (F12 → **Network** → **WS**) you should see a WebSocket connected to your **Render** URL. Then test with two devices like in A.4.

### B.5 Things to know

- The free Render backend still **sleeps after about 15 minutes**. The Vercel page loads instantly but can't connect until Render wakes up, so the lobby may show "Can't reach the server" for up to a minute.
- Custom music files: the browser loads them from the Vercel site and the server lists them from the Render copy. Both come from the same repo, so they match as long as both are deployed from the same commit.

---

## Path C: Vercel + Supabase (no Node server)

This removes `server.js` entirely. The browser talks to **Supabase Realtime** for live sync and to the **Supabase database** for anything that should be saved. Vercel only serves static files, so nothing sleeps.

**Honest warning:** this is a rewrite of the networking layer, not a settings change. Everything `server.js` does (rooms, host election, validating orders, the shared YouTube clock, dishes on tables) has to be redone with Supabase features. Do it when you want persistence or accounts, not just to get online.

### C.1 What maps to what

| Today (`server.js`) | With Supabase |
| --- | --- |
| Socket.IO room per room | Realtime **channel** per room, e.g. `room:quan-nhau` |
| Player list, join/leave | Realtime **Presence** (each browser "tracks" its name, look and position) |
| Movement, chat, emotes, waiter calls | Realtime **Broadcast** messages |
| Host = first person in the room | The earliest-joined member in Presence, worked out on every client |
| Room settings (music, sounds, YouTube) | A `room_settings` table; clients subscribe to changes |
| Dishes on tables (quán nhậu) | A `table_dishes` table with an `expires_at` column |
| Validation (bad dish ids, host-only settings) | **Row Level Security** policies and database constraints |

### C.2 Create the Supabase project

1. Sign up at https://supabase.com and click **New project**.
2. Choose a name, a strong database password (save it in a password manager), and a region close to your users (e.g. Singapore).
3. When it's ready, open **Project Settings → API** and copy:
   - **Project URL**, e.g. `https://abcd1234.supabase.co`
   - The **publishable (anon) key**. This one is safe to put in browser code; Row Level Security protects the data.
   - **Never** put the `service_role` / secret key in frontend code or in GitHub.

### C.3 Create the tables (SQL Editor)

A starting point. Run it in **SQL Editor → New query**:

```sql
create table public.room_settings (
  room_id     text primary key,
  music       text not null default 'lofi',
  ambience    jsonb not null default '{}',
  yt_started_at timestamptz,
  updated_at  timestamptz not null default now()
);

create table public.table_dishes (
  id          bigint generated always as identity primary key,
  room_id     text not null,
  table_no    int  not null check (table_no between 0 and 7),
  dish_id     text not null,
  emoji       text not null,
  name        text not null,
  ordered_by  text not null check (char_length(ordered_by) <= 16),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 minutes'
);

alter table public.room_settings enable row level security;
alter table public.table_dishes  enable row level security;

-- Everyone can read; anyone can add a dish (tighten later, e.g. with Supabase Auth).
create policy "read settings" on public.room_settings for select using (true);
create policy "read dishes"   on public.table_dishes  for select using (expires_at > now());
create policy "order dishes"  on public.table_dishes  for insert with check (true);

-- Let clients get live updates for these tables.
alter publication supabase_realtime add table public.room_settings, public.table_dishes;
```

Without logins, "only the host can change settings" can't be enforced by the database. Either accept that, add **Supabase Auth** (anonymous sign-ins work well here), or move that one action into a small **Edge Function**.

### C.4 Rewrite the client networking

*(This is the big part. Ask Claude: "migrate Vibe Street to Supabase Realtime following Path C in DEPLOYMENT.md".)*

- Add `@supabase/supabase-js` (load from a CDN, since this project has no bundler).
- Replace every `socket.emit` / `socket.on` in `public/js/main.js` with channel `send` / `on('broadcast')`, Presence `track` / `on('presence')`, and table reads/inserts.
- Keep the Supabase URL and publishable key in `public/config.js`.
- Delete `server.js`, `/api/rooms`, and the `express` / `socket.io` dependencies once everything works.

### C.5 Deploy on Vercel

Same as **B.3** (Framework `Other`, Output Directory `public`, no build). Then in Supabase → **Authentication → URL Configuration**, add your Vercel URL if you use Auth.

### C.6 Free-tier notes

Supabase's free plan pauses projects after a period of inactivity and limits concurrent realtime connections and messages. That's fine for friends, but check the current limits before inviting a big group.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Lobby says "Can't reach the server" | Free Render instance is waking up. Wait about a minute and refresh. For Path B, also check `CLIENT_ORIGIN` matches your Vercel URL exactly (https, no trailing slash). |
| Page loads but nobody else appears | The WebSocket isn't connecting. F12 → Console for CORS errors (Path B), or Render **Logs** for crashes. |
| Render build fails | Check the Node version (step 0.3) and that `package.json` and `package-lock.json` are committed. |
| No sound | Browsers block audio until you click. Click anywhere in the scene once. |
| YouTube shows "Video unavailable" | That video doesn't allow embedding, or it was removed. Try another link. |
| Everyone got reset | The server restarted (deploy, crash or free-tier sleep). Expected with in-memory rooms; Path C fixes it. |
| Changes don't show up | Hard-refresh (Ctrl+F5). Check the deploy finished in the Render/Vercel dashboard. |

---

## Checklist

- [ ] `.gitignore` added, code pushed to GitHub
- [ ] Only music you're allowed to share in `public/audio/`
- [ ] **Path A:** Render web service live, tested on two devices
- [ ] **Path B:** Path A done + 4 code changes + `CLIENT_ORIGIN` set + Vercel project live
- [ ] **Path C:** Supabase project + tables + networking rewrite + Vercel project live
- [ ] Shared the link with friends 🍻
