# Henry III System Architecture - Research Report
**Date:** 2026-02-01
**Version:** 1.0
**Status:** Operational / Active Development

## 1. Executive Summary
This document outlines the current system architecture of the Henry III instance running on Clawdbot. It reflects significant upgrades made between Jan 29 and Feb 1, 2026, specifically the introduction of a real-time voice layer, direct browser automation via CDP, and hardened security protocols.

## 2. High-Level Architecture Diagram

```ascii
                                     [ PAUL (User) ]
                                     /      |      \
                                    /       |       \
                             Telegram    Voice Call   Browser/Email
                                |           |             |
                                v           v             v
+-----------------------------------------------------------------------+
|  CLAWDBOT HOST (macOS: Henry's Virtual Machine)                       |
|                                                                       |
|  +-------------------+      +--------------------------------------+  |
|  |   CORE AGENT      |      |      VOICE SERVER (Node.js)          |  |
|  | (Clawdbot Gateway)|<---->|  Start: port 6060 / PID: marine-canyon| |
|  |                   |      |  Context: 18k chars (MD files)       |  |
|  |  - Model Routing  |      |  Tools: Calendar, Tasks, Briefing    |  |
|  |  - Heartbeats     |      |  Security: Safe Word / Caller ID     |  |
|  |  - Cron Jobs      |      +------------------+-------------------+  |
|  |  - Telegram Bot   |                         ^                      |
|  +--------+----------+                         | (WebSocket)          |
|           |                                    v                      |
|           |                         +-----------------------+         |
|           |                         |         ngrok         |         |
|           |                         | (Tunnel: fausto-...)  |         |
|           |                         +----------+------------+         |
|           |                                    ^                      |
|           v                                    | (Media Stream)       |
|  +-------------------+              +----------+------------+         |
|  |  INTEGRATIONS     |              |        TWILIO         |         |
|  |                   |              | (+1-778-907-7285)     |         |
|  | [gog] Gmail/Cal   |              +----------+------------+         |
|  | [gh] GitHub       |                         ^                      |
|  | [bw] Bitwarden    |                         |                      |
|  | [node] Toodledo   |              +----------+------------+         |
|  +--------+----------+              |  OPENAI REALTIME API  |         |
|           |                         | (gpt-4o-realtime)     |         |
|           v                         +-----------------------+         |
|  +-------------------+                                                |
|  |  BROWSER AUTOMATION                                                |
|  |  (Puppeteer-core)                                                  |
|  |          |                                                         |
|  |          v                                                         |
|  |    Brave Browser                                                   |
|  | (CDP @ 127.0.0.1:18800)                                            |
|  |  [Persisted Cookies]                                               |
|  +-------------------+                                                |
|                                                                       |
+-----------------------------------------------------------------------+
```

## 3. Core System Components

### 3.1 Clawdbot Gateway
- **Host:** macOS (Henry's Virtual Machine)
- **Role:** Central orchestrator for text chat, file ops, and tool execution.
- **Model Routing:**
  - Default: `openrouter/auto` (Google Gemini 3 Pro/Flash)
  - Complex Logic: `anthropic/claude-opus-4-5`
  - Control: Telegram `model-menu` skill allows manual switching.
- **Heartbeats:** Runs every ~15-30 mins. Checks email (`henry@heth.ca`), calendar updates, and system health.
- **Context Monitoring:**
  - Automated check every 5 mins (`context-monitor` cron).
  - Alert Thresholds: 50% (Warn), 80% (Critical/Flush).

### 3.2 Memory System
- **Long-Term:** `MEMORY.md` (Curated manually, read by Core & Voice).
- **Short-Term:** `memory/YYYY-MM-DD.md` (Daily operational logs).
- **Voice Memory:** `memory/voice-calls/` (Raw transcripts).
- **State Tracking:** `memory/heartbeat-state.json` (Last check timestamps).
- **Shared Context:** Voice server loads `IDENTITY.md`, `USER.md`, and `MEMORY.md` on startup (Snapshot model).

## 4. Voice Calling Subsystem (New - Jan 31)

### 4.1 Architecture
- **Server:** Standalone Node.js Fastify server (`voice-realtime/index.js`).
- **Protocol:** WebSocket bridge between Twilio Media Streams and OpenAI Realtime API.
- **Tunneling:** `ngrok` (free tier) exposes port 6060 to public internet.
- **Phone Number:** +1-778-907-7285 (Twilio) -> Routes to `https://fausto...ngrok-free.dev`.

### 4.2 Features
- **Inbound/Outbound:** Paul can call Henry; Henry can call Paul (`+16047637285`).
- **Tools:**
  - `tasks_due`: Read Toodledo tasks (filtered).
  - `check_calendar`: Read Google Calendar (Paul, Parker, Ailie, Jen).
  - `get_briefing`: Generates morning summary (Weather + Cal + Email).
  - `add_task`: Voice-confirmed task creation.
- **Post-Processing:**
  - Transcript captured during call.
  - Summarized by GPT-4o-mini ("PHONE CALL SUMMARY").
  - Posted to Telegram & appended to Daily Memory.

## 5. Browser Automation (Refactored - Feb 1)

### 5.1 Direct CDP Pattern
- **Problem:** Clawdbot's built-in proxy (`:18791`) was unstable/banned.
- **Solution:** Direct connection via `puppeteer-core` to Brave Browser's Debugging Port (`:18800`).
- **Profile:** Persistent user data at `~/.clawdbot/browser/clawd/user-data`.
- **Launch Command:** `Brave Browser --remote-debugging-port=18800 ...`

### 5.2 Capabilities
- **Persistent Sessions:** Cookies saved for Gmail, Google Calendar, Snow-Forecast, Jane App.
- **Captcha Solving:**
  - Primary: `scripts/captcha-solver.js` (2captcha API).
  - Backup: Screenshot -> Telegram -> Human Manual Entry.
- **Monitoring:** Used for Jane App waitlist checking (polling every 2 mins).

## 6. Integrations & Tooling

### 6.1 Google Workspace
- **Tool:** `gog` CLI.
- **Auth:** OAuth 2.0 (File-based keyring, no macOS Keychain dependency).
- **Scope:**
  - Gmail: Read/Search/Draft (Send restricted by policy).
  - Drive: Read/Write (Folder ID: `1f7BHru...`).
  - Calendar: Read/Write (Shared Family Calendars: Parker, Ailie, Jen).

### 6.2 Task Management (Toodledo)
- **Tool:** Custom Node.js scripts (`scripts/toodledo.js`).
- **Auth:** `toodledo_credentials.json` (Auto-refresh token).
- **Policy:** Read-only default. No bulk edits without review.
- **Backup:** Daily JSON dump at 6 AM.

### 6.3 Security Tools
- **Bitwarden:** `bw` CLI for credential retrieval (Session-based unlock).
- **GitHub:** `gh` CLI for repo management (`HenryHeth/henry-dashboard`).

## 7. Security & Rules of Engagement

### 7.1 Voice Security
- **Caller ID:** Server checks incoming number against `PAUL_PHONE` env var.
- **Safe Word:** `[SAFE_WORD]` (Stored in env, never logged). Used to challenge unknown callers or potential prompt injections.
- **Prompt Hardening:** If caller ID fails, system prompt is stripped of personal context and tools are disabled.

### 7.2 Operational Rules
1.  **No Outreach:** Never contact third parties without explicit instruction.
2.  **No Financials:** Never commit to payments/purchases without direct order.
3.  **Recoverable Deletes:** Paul handles deletions; Henry only drafts/creates.

## 8. Monitoring & Dashboard

### 8.1 Active Monitors
- **Jane App Watcher:** Scans for "Wait list spot available" emails/notifications.
- **Morning Briefing:** Cron job (8 AM) sends email summary to Paul.
- **Context Monitor:** Cron job (5 min) warns on high token usage.

### 8.2 Henry Dashboard
- **Repo:** `HenryHeth/henry-dashboard`.
- **Tech:** Vite + React.
- **Status:** Initial scaffolding. Planned features: Task velocity, Weekly review view, System health.

---
**Report Generated By:** Subagent (System Architecture Task)
**Context:** `MEMORY.md`, `TOOLS.md`, Daily Logs (Jan 30 - Feb 1)
