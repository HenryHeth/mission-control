# Deployment Plan: Henry's Dashboard

**Apps:**
1.  **Frontend Dashboard:** React/Vite app (Visualizer).
2.  **Worker Scripts:** Node.js sync scripts (Toodledo Fetcher, YouTube Curator).
3.  **Database:** Persistent storage for tasks and metrics.

## Option A: Railway (Recommended)
**Why:** Railway is a "full backend" platform. It can host the Dashboard *and* keep the Worker Scripts running in the background (Cron) easily.
*   **Architecture:**
    *   **Service 1 (Web):** Hosts the Vite App (Frontend).
    *   **Service 2 (Worker):** Runs `node scripts/toodledo_sync.js` daily.
    *   **Service 3 (DB):** A simple Redis or Postgres database to store the tasks (replacing `tasks.json`).
*   **Pros:** All-in-one. Can run the "heavy lifting" scripts easily.
*   **Cons:** Small monthly cost (~$5/mo) once trial runs out.

## Option B: Vercel + Supabase (Serverless)
**Why:** Vercel is best-in-class for React hosting. Supabase provides the Database.
*   **Architecture:**
    *   **Frontend:** Vercel hosts the dashboard.
    *   **Database:** Supabase (Postgres).
    *   **Sync Logic:** This is harder. We'd have to use "Vercel Cron Functions" (limited duration) or keep running scripts locally on your Mac/VM to push data to Supabase.
*   **Pros:** Generous free tiers. Fast global CDN.
*   **Cons:** "Heavy" sync scripts (fetching 15MB of tasks) might timeout on serverless functions.

## Recommendation: Railway
Since we want to eventually add "YouTube Curation" (browser automation) and heavy Toodledo syncing, **Railway** allows us to run a real persistent container background process, which is much robust than serverless functions for this use case.

## Next Steps
1.  **Database Migration:** Convert `tasks.json` reader to a simple SQLite or Postgres adapter.
2.  **Repo Structure:** Ensure `package.json` has a `start` script for production.
3.  **Deploy:** Link GitHub repo to Railway.
