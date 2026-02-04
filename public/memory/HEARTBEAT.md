# HEARTBEAT.md

## 🧠 Memory Check (EVERY HEARTBEAT)
If you haven't read these files this session, READ THEM NOW:
1. `MEMORY.md` — your long-term memory
2. `memory/YYYY-MM-DD.md` — today and yesterday's notes

If you feel confused about context, projects, or what you've done recently — that's a sign you skipped this step. Go read them.

## 📝 Telegram Dump & Summary (EVERY HEARTBEAT)
1. Write a 2-3 line summary of recent Telegram conversation activity to today's daily file (`memory/YYYY-MM-DD.md`).
2. Write detailed conversation content (key decisions, instructions, feedback from Paul) to `memory/telegram/YYYY-MM-DD.md` — separate file to avoid cluttering the daily notes.
3. Then run: `export PATH="/Users/henry_notabot/.bun/bin:$PATH" && qmd update`
This keeps the daily notes and QMD index fresh for voice-Henry.
Skip if nothing has happened since last write.
NOTE: This is the "stop the bleeding" approach until we set up full Telegram Client API history search (TD task 443192204).

## Quick Status Check
- Do I know who Paul is? ✓
- Do I know about the henry-dashboard project? ✓
- Do I remember how to access Gmail (gog + keyring password)? ✓
- Do I remember the Brazil flight research? ✓

If any of these are unclear, read MEMORY.md immediately.

## 🔨 Work Queue Check (EVERY HEARTBEAT)
If Paul hasn't messaged in 30+ minutes AND no active conversation is happening:
1. Check the **Henry tasks due** queue: https://tasks.toodledo.com/saved/240263
2. Pull the list: `cd /Users/henry_notabot/clawd && node scripts/toodledo_queue.js` (fetches the saved view — Paul controls the filters)
3. If there are tasks in the queue:
   - Pick the highest priority task
   - Spawn a sub-agent to work on it: `sessions_spawn` with the task details
   - Track running sub-agents — check on them each heartbeat
4. If sub-agents are already running: check their status, collect results
5. **Overnight rule:** Between 11 PM and 8 AM, this is your PRIMARY job. Work the queue.
6. **9 PM Evening Prep:** At ~9 PM, review the new4henry queue. If any tasks need clarification, message Paul on Telegram BEFORE he goes to bed.

## 📧 Email Check
Check ALL unread emails:
```
GOG_KEYRING_PASSWORD="henrybot" gog gmail search "is:unread -category:promotions -category:social" --max 10 --account henry@heth.ca
```
Rules:
1. **Read** every unread email — no skipping
2. **Act** only on emails from Paul
3. **Follow up** on emails I sent on Paul's behalf — report back on replies/next steps
4. **Ignore** everything else (don't respond to non-Paul emails)
5. Do NOT let emails sit unread for hours
