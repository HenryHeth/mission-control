# Memory Architecture Design
**Created:** 2026-02-02
**Status:** v1 — Initial implementation

## Problem
Voice-Henry and Text-Henry operate as separate systems with no shared context. Text-Henry (Clawdbot/Telegram) has rich conversation history. Voice-Henry (OpenAI Realtime/Twilio) starts each call with a frozen snapshot loaded at server startup.

## Design: Three-Layer Memory

### Layer 1: Automatic — Live Telegram Inject (Call Start)
- **When:** Phone call comes in, before connecting to OpenAI
- **What:** Read last 2 hours of Telegram session transcript
- **How:** Parse Clawdbot's session JSONL file, filter user/assistant messages by timestamp
- **Output:** Injected into voice-Henry's system prompt (~15 messages max, 300 chars each)
- **Cost:** ~1,500-4,500 tokens per call (one-time, not recurring)
- **Purpose:** Broad recent context — "what have we been talking about?"

### Layer 2: On Demand — QMD Search (During Call)
- **When:** Paul asks a specific question about past work/decisions
- **What:** Voice-Henry runs `qmd search` against indexed workspace files
- **How:** QMD tool available as OpenAI function call during the conversation
- **Output:** Relevant snippets returned to OpenAI for voice response
- **Cost:** ~500-1,000 tokens per search (only when triggered)
- **Purpose:** Deep lookup — "what exactly did we decide about X?"

### Layer 3: Background — Heartbeat Summaries (Periodic)
- **When:** Every 15-minute heartbeat cycle
- **What:** Text-Henry writes 2-3 line summary of recent Telegram activity to daily notes
- **How:** Added to heartbeat routine + `qmd update` to reindex
- **Output:** Fresh daily memory file, fresh QMD index
- **Cost:** Minimal — piggybacks on existing heartbeat
- **Purpose:** Persistent record — keeps daily notes consistently fresh for QMD queries

## Clawdbot Built-in Features (Enabled 2026-02-02)
- **memoryFlush:** Saves important context before compaction (prevents amnesia)
- **sessionMemory:** Text-Henry can search past session transcripts via memory_search
- **sources: ["memory", "sessions"]:** Session transcripts indexed alongside memory files

## Infrastructure
- **QMD:** Local markdown search engine (installed via bun, indexes ~/clawd workspace)
- **Embedding model:** embeddinggemma (300M, local, no cloud dependency)
- **Index refresh:** `qmd update` + `qmd embed` on heartbeat schedule
- **Tunnel:** ngrok (unstable free tier) — needs migration to Cloudflare or paid ngrok

## Tuning Parameters
| Parameter | Current | Notes |
|---|---|---|
| Telegram lookback | 15 messages | Should switch to 2-hour time window |
| Message truncation | 300 chars | Balance between detail and tokens |
| Max messages injected | 15 | Cap for token budget |
| Heartbeat interval | 15 min | How often daily notes + QMD refresh |
| QMD search results | 5 | Per search query |
| Session transcript tail | 50KB | How much of JSONL file to read |

## Future Improvements
- [ ] Time-based lookback (2 hours) instead of message count
- [ ] Summarized context injection instead of raw messages
- [ ] Automatic QMD embed refresh (currently only keyword index updates)
- [ ] Cloudflare tunnel for stability
- [ ] Busy-line fix for dropped calls not releasing
