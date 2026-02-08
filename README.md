# Mission Control v1.7

**One app, one URL, one bookmark.** Everything Paul needs to manage his day without sitting at a desk.

![Mission Control](https://img.shields.io/badge/version-1.7.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## ✨ What's New in v1.7

### 💰 Spending Tab (NEW)
- **Service catalog** — Complete audit of all API costs and subscriptions
- **Daily burn rate** — Track daily spending with warning thresholds
- **7-day trend chart** — Stacked bar chart of spending by provider
- **Category breakdown** — AI/LLM, Infrastructure, SaaS, Domains
- **Voice call costs** — Combined Twilio + OpenAI per-call tracking
- **Live API integration** — Real data from Anthropic, OpenAI, OpenRouter, Twilio, ElevenLabs
- **Dashboard links** — Quick access to provider billing pages

### 🔧 File Server Enhancements
- `/api/spending` — API spending data endpoint
- `/api/spending/history?days=7` — Historical spending data
- Spending data collector with caching

## Previous Updates (v1.5-1.6)

### 🏠 Homepage Dashboard
- **At-a-glance metrics** — Desk time, Computer, Mobile, YouTube hours
- **Productivity Pulse** — RescueTime integration
- **Task summary** — Due today, overdue, completed
- **7-day sitting chart** — Track desk time trends
- **Quick links** — Calendar, Email, RescueTime, Home Assistant

### 🔧 System Status Tab
- **Service monitoring** — Gateway, Voice Server, File Server, Browser Proxy
- **Voice server metrics** — Active calls, total calls, uptime
- **Cron job status** — Scheduled tasks with last/next run times
- **Sub-agent monitor** — Track running and completed agents

### ✅ Enhanced Tasks Tab
- **Live Toodledo integration** — Real task data via API
- **Velocity charts** — Tasks completed per day with 7-day average
- **New vs Retired** — Weekly task creation vs completion
- **Backlog trend** — Open task count over 60 days

### 📝 Improved Docs, Memory, Captures
- **Tree view** for file navigation
- **Live file server** for real-time updates
- **Tag-based filtering**
- **Full-text search**

## 🚀 Quick Start

```bash
# Development (with live file server)
npm run dev:live

# Or just the Next.js dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Tabs

| Tab | Purpose |
|-----|---------|
| **Mission Control** | At-a-glance dashboard with metrics |
| **Tasks** | Toodledo velocity, closes, backlog |
| **Spending** | API costs, subscriptions, burn rate |
| **Memory** | Daily logs + MEMORY.md |
| **Captures** | Telegram + voice call transcripts |
| **Docs** | All workspace documentation |
| **System** | Service health & monitoring |

## 🔌 Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Mission Control                      │
│              (Next.js + Tailwind CSS)                   │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌───────┐ ┌────────┐ ┌──────┐ ┌──────┐  │
│  │Dashboard │ │ Tasks │ │Spending│ │ Docs │ │System│  │
│  └────┬─────┘ └───┬───┘ └───┬────┘ └──┬───┘ └──┬───┘  │
│       │           │         │         │        │       │
├───────┼───────────┼─────────┼─────────┼────────┼───────┤
│       ▼           ▼         ▼         ▼        ▼       │
│  ┌────────────────────────────────────────────────┐   │
│  │              File Server (3456)                │   │
│  │  /api/files  /api/tasks  /api/spending        │   │
│  └────────────────────────────────────────────────┘   │
│       │           │              │                     │
│       ▼           ▼              ▼                     │
│  Local Files   Toodledo    Anthropic/OpenAI/          │
│                  API        Twilio/ElevenLabs          │
└────────────────────────────────────────────────────────┘
```

## 🎨 Design Principles

- **Dark theme** — Easy on the eyes
- **Bar charts over bullets** — Accessibility/dyslexia friendly
- **Atkinson Hyperlegible font** — 18px base size
- **Bento card layout** — Visual, instant, no reading required
- **Mobile-first** — Works on phone without horizontal scroll

## 🔐 Authentication Setup

Mission Control uses Google OAuth for secure authentication. Only whitelisted email addresses can access the dashboard.

### Required Environment Variables

```bash
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-auth-secret-here

# Google OAuth credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth URL (set automatically by Vercel in production)
NEXTAUTH_URL=http://localhost:3000
```

### Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://mission-control-tan.vercel.app/api/auth/callback/google` (production)
7. Copy the Client ID and Client Secret to your environment variables

### Vercel Deployment

Add these environment variables in Vercel Dashboard > Settings > Environment Variables:
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Whitelisted Users

Currently authorized: `paul@heth.ca`

To add more users, edit the `ALLOWED_EMAILS` array in `src/auth.ts`.

## 🔧 Configuration

### Environment Variables

```bash
# Live file server URL (defaults to localhost:3456)
NEXT_PUBLIC_LIVE_API_URL=http://localhost:3456
```

### Running the File Server

The file server provides live access to workspace files and Toodledo tasks:

```bash
# Via npm script
npm run file-server

# Or directly
node scripts/file-server.js [port]
```

## 📦 Deployment

Deployed to Vercel at: https://mission-control-tan.vercel.app

```bash
# Deploy via Vercel CLI
vercel --prod
```

Note: Production deployment uses bundled files (prebuild step). Live file server features require local development mode.

## 📋 Changelog

### v1.7.0 (2026-02-08)
- 💰 **NEW: Spending Tab** — Track all API costs and subscriptions
- 💰 Service catalog with 13+ services categorized
- 💰 Daily burn rate with warning/danger thresholds
- 💰 7-day stacked bar chart trend
- 💰 Category pie chart breakdown
- 💰 Voice call combined cost tracking
- 🔧 New spending data collector script
- 🔧 `/api/spending` and `/api/spending/history` endpoints
- 🔧 Live data from provider APIs (with sample fallback)

### v1.6.0 (2026-02-06)
- 🔐 Added Google OAuth authentication (NextAuth.js)
- 🔐 Whitelist-only access (paul@heth.ca)
- 🔐 Protected all routes via middleware
- ✨ Sign-in page with Google OAuth
- ✨ Sign-out button in navigation
- ✨ Error page for access denied

### v1.5.0 (2026-02-05)
- ✨ Added Homepage Dashboard tab with metrics
- ✨ Added System Status tab
- ✨ Live Toodledo API integration for Tasks
- ✨ Task velocity, new vs retired, backlog charts
- 🎨 Refined dark theme and responsive layout
- 🔧 File server now serves tasks data

### v1.0.0 (2026-02-02)
- Initial release
- Docs, Memory, Captures, Tasks tabs
- Tree view file navigation
- Live file server integration

---

Built with ❤️ by Henry for Paul
