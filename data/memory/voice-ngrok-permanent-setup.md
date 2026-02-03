# Voice System — Permanent ngrok Setup (2026-02-02)

## Overview
Henry III's voice calling system uses a permanent ngrok tunnel (paid Hobbyist plan) to bridge Twilio phone calls to the local voice server.

## Architecture

```
Phone Call (+17789077285)
        │
        ▼
┌──────────────┐
│   Twilio     │  PSTN → WebSocket Media Streams
│   (Cloud)    │
└──────┬───────┘
       │ HTTPS POST /incoming-call
       ▼
┌─────────────────────────────────────────────────────┐
│  ngrok (Paid Hobbyist Plan — $10 CAD/mo)            │
│  Static Domain: noninterceptive-myrtice-             │
│    unindustriously.ngrok-free.dev                    │
│  Forwards to: localhost:6060                         │
│  Survives restarts — domain is permanently reserved  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Voice Server (Fastify + WebSocket)  │
│  Port: 6060                          │
│  Code: voice-realtime/index.js       │
│  Config: voice-realtime/.env         │
└──────┬───────────────────────────────┘
       │ WebSocket (bidirectional audio)
       ▼
┌──────────────────────────────────────┐
│  OpenAI Realtime API                 │
│  Model: gpt-4o-realtime             │
│  Speech-to-speech + tool calling     │
└──────┬───────────────────────────────┘
       │ Tool calls
       ▼
┌──────────────────────────────────────┐
│  Tool Execution Layer                │
│  - Calendar (paul@heth.ca)           │
│  - Tasks (Toodledo)                 │
│  - Weather                           │
│  - Email (paul@heth.ca read-only)    │
│  - Memory (QMD search + daily files) │
│  - Pre-cached data (voice-cache.js)  │
└──────────────────────────────────────┘
```

## Key Configuration

| Component | Setting | Value |
|-----------|---------|-------|
| Twilio Phone | Number | +1-778-907-7285 |
| Twilio Webhook | VoiceUrl | https://noninterceptive-myrtice-unindustriously.ngrok-free.dev/incoming-call |
| ngrok | Plan | Hobbyist ($10 CAD/mo) |
| ngrok | Domain | noninterceptive-myrtice-unindustriously.ngrok-free.dev (permanent) |
| ngrok | Auth | Token in ~/.config/ngrok/ngrok.yml |
| ngrok | Target | localhost:6060 |
| Voice Server | Port | 6060 |
| Voice Server | Config | voice-realtime/.env |
| OpenAI | Model | gpt-4o-realtime |

## Startup Commands

```bash
# Start ngrok with permanent domain
ngrok http 6060 --domain=noninterceptive-myrtice-unindustriously.ngrok-free.dev

# Start voice server
cd ~/clawd/voice-realtime && node index.js
```

## Security
- Caller ID checked against PAUL_PHONE env var
- Unknown callers: tools stripped, safe word challenge required
- Safe word stored as env var SAFE_WORD (never in logs/memory)
- Concurrent call rejection (busy-line protection)

## Voice Context Budget (per-call) — FINAL 2026-02-02

| Source | Max Size | Contents |
|--------|----------|----------|
| USER.md | 2,000 chars | Paul's profile, preferences |
| IDENTITY.md | 500 chars | Henry's identity |
| MEMORY.md | 6,000 chars | Long-term memory, rules, projects |
| Today's daily notes | 8,000 chars | Day's events (transcripts stripped) |
| Live Telegram context | 35,000 chars budget | Last 2hrs of Telegram chat with timestamps |
| System instructions | ~2,000 chars | Personality, rules, tool descriptions |
| **Total measured** | **~53K chars (~13K tokens)** | **~41% of 128K token limit** |

### Context Loading
- **Static files** (USER, IDENTITY, MEMORY, daily notes): loaded once at server startup
- **Live Telegram**: fetched fresh per-call from Clawdbot session JSONL (2hr rolling window)
- **File read**: full JSONL file (can be multi-MB; 2hr filter handles scoping)
- **Format**: `[3:35 PM PAUL] message content...` — Telegram metadata stripped
- **Header**: includes oldest/newest timestamps + message count for easy verification
- **Feed header**: explicit instruction NOT to use search_memory (prevents fabrication)
- **Quality filters**: heartbeats removed, empty/short messages removed, code blocks removed
- **Per-message truncation**: 300 chars

## What Changed (2026-02-02)
- **Before:** ngrok free tier — random URLs, sessions killed randomly
- **After:** ngrok paid Hobbyist — permanent static domain, no session kills
- Twilio webhook set once, never needs updating again
- DOMAIN in voice-realtime/.env updated to permanent domain
- Fixed ES module `require()` bug in Telegram context fetch (was silently failing)
- Added timestamps to live Telegram context
- Bumped context limits: daily notes 3K→8K, MEMORY.md 4K→6K
- Telegram feed: reads full JSONL file, 35K char budget, 2hr rolling window
- Strips Telegram metadata headers to avoid double-timestamp confusion
- Feed header shows oldest/newest timestamps + message count
- Heartbeat messages filtered out of feed
- Quality filter: drops empty, short, code-block messages
- Known limitation: OpenAI Realtime model may fabricate details beyond what's in context

## Account
- ngrok account: paul@heth.ca
- Dashboard: https://dashboard.ngrok.com
- Domain management: https://dashboard.ngrok.com/domains
