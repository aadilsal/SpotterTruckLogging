# Deployment Guide — SpotterTruckLogger

Deploy the **React frontend on Vercel** (free) and the **Django backend + PostgreSQL on Render** (free tier). This split is a common, reliable setup for full-stack apps.

| Layer | Service | Free tier notes |
|-------|---------|-----------------|
| Frontend | [Vercel](https://vercel.com) | Generous free tier, fast CDN, great Vite support |
| Backend API | [Render](https://render.com) | Free web service (spins down after ~15 min idle) |
| Database | Render PostgreSQL | Free 90-day trial DB, then paid; see alternatives below |

**Your repo:** https://github.com/aadilsal/SpotterTruckLogging

---

## Architecture overview

```
Browser
   │
   ▼
Vercel (React static site)
   │  HTTPS calls to VITE_API_URL
   ▼
Render (Django + Gunicorn)
   │
   ▼
Render PostgreSQL
```

The frontend calls the backend directly (cross-origin). CORS must allow your Vercel domain.

---

## Prerequisites

Before you start, make sure you have:

- [ ] Code pushed to GitHub (`main` branch)
- [ ] A [Vercel](https://vercel.com) account (sign in with GitHub)
- [ ] A [Render](https://render.com) account (sign in with GitHub)
- [ ] An [OpenRouteService API key](https://openrouteservice.org/dev/#/signup) (for routing/geocoding)
- [ ] A long random `SECRET_KEY` for Django (generate one — see below)

Generate a Django secret key (run locally):

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Part 1 — Deploy backend on Render

Deploy the database first, then the API.

### Step 1.1 — Create PostgreSQL on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Settings:
   - **Name:** `spotter-truck-db`
   - **Database:** `eld_planner`
   - **User:** leave default
   - **Region:** pick the closest to you (e.g. Oregon / Ohio)
   - **Plan:** Free (or Starter if free unavailable)
4. Click **Create Database**
5. Wait until status is **Available**
6. Open the database → copy the **Internal Database URL** (use this for the web service on Render)

> **Important:** You must connect the database to your web service. Either:
> - **Option A (recommended):** After creating the web service, go to **Environment → Link Database** and select your Postgres instance. Render adds `DATABASE_URL` automatically.
> - **Option B:** Manually add env var `DATABASE_URL` = the **Internal Database URL** from the database dashboard.

> **Note:** Render’s free PostgreSQL may expire after 90 days. For a long-lived free DB, consider [Neon](https://neon.tech) or [Supabase](https://supabase.com) and paste their connection string as `DATABASE_URL` instead.

### Step 1.2 — Create the Django web service

1. **New +** → **Web Service**
2. Connect GitHub repo: `aadilsal/SpotterTruckLogging`
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `spotter-truck-api` |
| **Region** | Same as database |
| **Root Directory** | `backend` |
| **Runtime** | **Docker** |
| **Instance type** | Free |

Render will detect `backend/Dockerfile` automatically.

4. **Environment variables** — add these in the Render dashboard:

| Key | Value | Notes |
|-----|-------|-------|
| `DEBUG` | `false` | Defaults to `false`; set explicitly anyway |
| `SECRET_KEY` | *(your generated key)* | **App refuses to boot without it.** Never commit |
| `ALLOWED_HOSTS` | `spotter-truck-api.onrender.com` | Replace with your actual Render hostname after creation |
| `DATABASE_URL` | *(Internal Database URL from Step 1.1)* | Render provides this; app reads it automatically |
| `ORS_API_KEY` | *(your OpenRouteService key)* | **App refuses to boot without it** — see warning below |
| `CORS_ALLOW_ALL_ORIGINS` | `false` | Lock down CORS in production |
| `CORS_ALLOWED_ORIGINS` | `https://YOUR-APP.vercel.app` | Set after Vercel deploy (Step 2.4) |
| `CSRF_TRUSTED_ORIGINS` | `https://YOUR-APP.vercel.app` | Defaults to the CORS list if unset |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` | Used to build password-reset links |

Optional — password reset emails. Without these, reset links are only printed to the Render logs:

| Key | Example | Notes |
|-----|---------|-------|
| `EMAIL_HOST` | `smtp.sendgrid.net` | Presence of this switches on real SMTP |
| `EMAIL_PORT` | `587` | |
| `EMAIL_HOST_USER` | `apikey` | |
| `EMAIL_HOST_PASSWORD` | *(your SMTP password)* | |
| `DEFAULT_FROM_EMAIL` | `no-reply@yourdomain.com` | |

> ### ⚠️ Why the app refuses to boot without `ORS_API_KEY`
>
> Without a routing key the backend falls back to **canned distances** (a fixed
> 1800 mi / 28.5 hr for every trip). It would still render a confident
> "HOS compliant" verdict — computed entirely from invented mileage. For a
> product whose whole purpose is telling a dispatcher whether a trip is legal,
> that is worse than an outage, so a non-DEBUG boot without a key is a hard
> error. If you knowingly want mock data in a **staging** environment, set
> `ALLOW_MOCK_ROUTING=true`. Never set it in production.

5. Click **Create Web Service**

6. Wait for the first deploy (5–10 minutes). The `entrypoint.sh` script runs migrations and `collectstatic` automatically.

7. When deploy succeeds, check the health endpoint first — it verifies the database is actually reachable:

   ```
   https://spotter-truck-api.onrender.com/healthz/
   ```

   Expect `{"status": "ok", "database": "ok"}`. Then:

   ```
   https://spotter-truck-api.onrender.com/api/trips/
   ```

   You should now see **401 Unauthorized** (`{"detail":"Authentication credentials were not provided."}`) — that is correct, the API requires a JWT. If you get **502**, check **Logs** in Render.

> **Faster alternative:** this repo ships a `render.yaml` blueprint. Use
> **New +** → **Blueprint**, point it at the repo, and Render creates the
> database and web service with most variables pre-wired. You still supply
> `ORS_API_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `FRONTEND_URL`.

### Step 1.3 — Render free tier behavior

- The service **sleeps after ~15 minutes** of no traffic.
- First request after sleep can take **30–60 seconds** (cold start).
- This is normal on the free plan.

### Step 1.4 — Troubleshooting backend

| Problem | Fix |
|---------|-----|
| `DisallowedHost` | Add your Render URL to `ALLOWED_HOSTS` |
| `502 Bad Gateway` | Check Render logs; often DB not connected or migrations failed |
| `ModuleNotFoundError` | Ensure **Root Directory** is `backend` |
| Database connection error | `DATABASE_URL` is missing — link the Postgres DB or paste the **Internal Database URL** into env vars |
| `connection to 127.0.0.1:5434 refused` | `DATABASE_URL` not set on Render; app is using local defaults |
| Routing fails | Verify `ORS_API_KEY` is set correctly |

---

## Part 2 — Deploy frontend on Vercel

### Step 2.1 — Import project

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** `aadilsal/SpotterTruckLogging`
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` (click Edit → set to `frontend`) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 2.2 — Environment variable (critical)

Add this **before** deploying:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://spotter-truck-api.onrender.com` |

Rules:

- Use your real Render backend URL
- **No trailing slash**
- Must start with `https://`
- Vite bakes this into the build at deploy time — if you change the backend URL later, **redeploy** on Vercel

### Step 2.3 — Deploy

1. Click **Deploy**
2. Wait for build (~1–2 minutes)
3. Vercel gives you a URL like `https://spotter-truck-logging.vercel.app`

The repo includes `frontend/vercel.json` so client-side routing works correctly.

### Step 2.4 — Connect frontend and backend (CORS)

Go back to **Render** → your web service → **Environment**:

Update `CORS_ALLOWED_ORIGINS` to your Vercel URL:

```
https://spotter-truck-logging.vercel.app
```

If you use a custom domain on Vercel, add that too (comma-separated):

```
https://spotter-truck-logging.vercel.app,https://yourdomain.com
```

Save — Render will redeploy automatically.

### Step 2.5 — Test the full app

1. Open your Vercel URL
2. Fill in the trip form (e.g. Dallas → Chicago → Los Angeles)
3. Click generate trip
4. First API call may be slow if Render was sleeping — wait up to 60 seconds

If the UI loads but trip generation fails:

- Open browser **DevTools → Network**
- Look for failed requests to `https://spotter-truck-api.onrender.com/api/trips/`
- **CORS error** → fix `CORS_ALLOWED_ORIGINS` on Render
- **502 / timeout** → Render cold start; retry after a minute
- **400** → check `ORS_API_KEY` on Render

---

## Part 3 — Environment variable reference

### Backend (Render)

```env
# Required — the app will not start without these
SECRET_KEY=your-long-random-secret
ORS_API_KEY=your-openrouteservice-key

DEBUG=false
ALLOWED_HOSTS=spotter-truck-api.onrender.com
DATABASE_URL=postgresql://user:pass@host/dbname
CORS_ALLOW_ALL_ORIGINS=false
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app

# Optional — password reset email (omit to log links instead of sending them)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-smtp-password
DEFAULT_FROM_EMAIL=no-reply@yourdomain.com

# Optional — tuning (shown with their defaults)
LOG_LEVEL=INFO
DB_CONN_MAX_AGE=60
THROTTLE_ANON=60/hour
THROTTLE_USER=1000/hour
THROTTLE_AUTH=10/hour
THROTTLE_TRIP_CREATE=60/hour
SECURE_SSL_REDIRECT=true
```

### Frontend (Vercel)

```env
VITE_API_URL=https://spotter-truck-api.onrender.com
```

### Local development

```env
# backend/.env — see .env.example for the full list
DEBUG=true
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5434
# Omit ORS_API_KEY locally to use mock routing (allowed only because DEBUG=true).
# The server logs a loud warning on every mocked call.

# frontend — not needed; `npm run dev` proxies /api to localhost:8000
```

Start local Postgres with `docker compose up -d db`.

---

## Part 4 — Custom domains (optional)

### Vercel custom domain

1. Vercel project → **Settings → Domains**
2. Add your domain and follow DNS instructions
3. Update Render `CORS_ALLOWED_ORIGINS` with the new domain
4. Redeploy is automatic on Vercel

### Render custom domain

1. Render service → **Settings → Custom Domains**
2. Add domain and configure DNS
3. Update `ALLOWED_HOSTS` to include the custom domain
4. Update `VITE_API_URL` on Vercel if the API URL changes, then redeploy

---

## Part 5 — Redeploying after code changes

### After pushing to GitHub

Both platforms auto-deploy from `main` by default.

```powershell
git add .
git commit -m "describe your change"
git push
```

- **Vercel:** new deployment starts automatically (~1–2 min)
- **Render:** new deployment starts automatically (~5–10 min)

### When you change `VITE_API_URL`

You must trigger a **new Vercel deployment** (env vars are build-time only).

Vercel → Project → **Deployments** → **Redeploy**

---

## Part 6 — Alternative free backend hosts

If Render’s cold starts or DB limits are an issue:

| Service | Pros | Cons |
|---------|------|------|
| **Render** (recommended) | Easy Docker deploy, managed Postgres | Free tier sleeps; DB trial expires |
| **Fly.io** | Always-on possible | More CLI setup; limited free resources |
| **Railway** | Simple UX | Mostly trial credits now, not fully free |
| **Koyeb** | Free web service | Manual Docker setup |

The same `backend/Dockerfile` and environment variables work on any Docker-based host. Point `VITE_API_URL` on Vercel to whichever backend URL you get.

### Using Neon or Supabase for PostgreSQL (free, longer-lived)

1. Create a free Postgres database on [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. Copy the connection string
3. On Render, set `DATABASE_URL` to that string instead of Render’s internal URL
4. Skip creating Render PostgreSQL

---

## Part 7 — Security checklist

Before sharing the app publicly:

- [ ] `DEBUG=false` on Render
- [ ] Strong unique `SECRET_KEY` (not the dev default)
- [ ] `CORS_ALLOW_ALL_ORIGINS=false`
- [ ] `CORS_ALLOWED_ORIGINS` lists only your Vercel domain(s)
- [ ] `.env` files are **not** in git (already in `.gitignore`)
- [ ] `ORS_API_KEY` only set in Render dashboard, never committed

---

## Part 8 — Quick command reference

```powershell
# Local production-like stack (Docker)
cd D:\Spotter\TruckLoggingApp
docker compose up --build -d
# App at http://localhost:8080

# Push updates to GitHub (triggers Vercel + Render)
git add .
git commit -m "your message"
git push

# Switch GitHub account if push fails with 403
gh auth switch -u aadilsal
gh auth setup-git
```

---

## Deployment order (summary)

```
1. Render PostgreSQL     → copy DATABASE_URL
2. Render Web Service    → set env vars, deploy backend
3. Test /api/trips/      → confirm 200 response
4. Vercel frontend       → set VITE_API_URL, deploy
5. Update CORS on Render → add Vercel URL
6. Test full trip flow   → generate a trip in the browser
```

---

## Need help?

| Symptom | Likely cause |
|---------|----------------|
| Blank page on Vercel | Build failed — check Vercel deployment logs |
| Page loads, API fails with CORS | `CORS_ALLOWED_ORIGINS` missing Vercel URL |
| API very slow first time | Render free tier cold start |
| `Invalid HTTP_HOST header` | `ALLOWED_HOSTS` missing Render domain |
| Trip returns 400 | Invalid locations or missing `ORS_API_KEY` |

For local issues, compare against the working Docker setup: `docker compose up` on port `8080`.
