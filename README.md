# Mission Control v1.5

**One app, one URL, one bookmark.** Everything Paul needs to manage his day without sitting at a desk.

![Mission Control](https://img.shields.io/badge/version-1.5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## ✨ What's New in v1.5

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
| **Memory** | Daily logs + MEMORY.md |
| **Captures** | Telegram + voice call transcripts |
| **Docs** | All workspace documentation |
| **System** | Service health & monitoring |

## 🔌 Architecture

```
┌─────────────────────────────────────────────────┐
│                  Mission Control                 │
│            (Next.js + Tailwind CSS)             │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Dashboard│  │  Tasks  │  │  Docs   │   ...  │
│  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │              │
├───────┼────────────┼────────────┼──────────────┤
│       ▼            ▼            ▼              │
│  ┌─────────────────────────────────────────┐  │
│  │           File Server (3456)            │  │
│  │  /api/files  /api/tasks  /health        │  │
│  └─────────────────────────────────────────┘  │
│       │            │                          │
│       ▼            ▼                          │
│  Local Files   Toodledo API                   │
└─────────────────────────────────────────────────┘
```

## 🎨 Design Principles

- **Dark theme** — Easy on the eyes
- **Bar charts over bullets** — Accessibility/dyslexia friendly
- **Atkinson Hyperlegible font** — 18px base size
- **Bento card layout** — Visual, instant, no reading required
- **Mobile-first** — Works on phone without horizontal scroll

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
