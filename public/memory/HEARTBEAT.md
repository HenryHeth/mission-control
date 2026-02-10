# HEARTBEAT.md

## ⏱️ FIRST: Update Heartbeat Timestamp
**Run this FIRST, every heartbeat, no exceptions:**
```bash
echo '{"lastRun":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > ~/.clawdbot/logs/heartbeat-last-run.json
```

## 🚨 OVERNIGHT WORK IS MANDATORY (11 PM - 8 AM)
**YOU MUST WORK THE QUEUE OVERNIGHT. NO EXCEPTIONS.**
If it's between 11 PM and 8 AM and you reply HEARTBEAT_OK without spawning a sub-agent, YOU HAVE FAILED.
Check the queue. Spawn agents. Do the work. This is your #1 job overnight.

## 📣 OVERNIGHT STATUS UPDATE (Midnight - 8 AM)
**Send a short Telegram status update to Paul every heartbeat overnight.**
- Keep it to 1-2 lines max
- Include task names being worked on (from Toodledo or sub-agent labels)
- Example: "🌙 3:15 AM — Working: Mission Control Auth, PRD v2 Draft. 2 sub-agents active. Queue: 1 remaining."
- This lets Paul see you're alive and focused when he checks in the morning

## ⚡ EFFICIENCY RULE
Complete all checks with minimal output. No status summaries. No thinking out loud.
- **Daytime (8 AM - 11 PM):** If nothing needs attention → HEARTBEAT_OK
- **Overnight (11 PM - 8 AM):** NEVER reply HEARTBEAT_OK without first checking queue and spawning work

## 🔨 Work Queue Check (MANDATORY EVERY HEARTBEAT)
**ALWAYS run this check. No skipping.**

```bash
cd /Users/henry_notabot/clawd && node scripts/toodledo_queue.js
```

**Decision tree:**
1. Run the queue script above
2. If tasks exist with "Overnight" tag → **SPAWN A SUB-AGENT NOW**
3. Use `sessions_spawn` with task details
4. After spawning, update task note with "Sub-agent spawned: [timestamp]"
5. Check on running sub-agents each heartbeat
6. When sub-agent completes → update task note with results

**Sub-agent spawn template:**
```
sessions_spawn({
  task: "[Task title] - [Task details from note]",
  label: "overnight-[task-keyword]",
  cleanup: "keep"
})
```

## 🧠 Memory Check (EVERY HEARTBEAT)
If you haven't read these files this session, READ THEM NOW:
1. `MEMORY.md` — your long-term memory
2. `memory/YYYY-MM-DD.md` — today and yesterday's notes

## 📝 Telegram Dump & Summary (EVERY HEARTBEAT)
1. Write 2-3 line summary to `memory/YYYY-MM-DD.md`
2. Write detailed content to `memory/telegram/YYYY-MM-DD.md`
3. Run: `export PATH="/Users/henry_notabot/.bun/bin:$PATH" && qmd update`
Skip if nothing new since last write.

## 🔊 Voice Server Health Check (EVERY HEARTBEAT)
```bash
curl -s http://localhost:6060/ > /dev/null || (cd ~/clawd/voice-realtime && node index.js &)
```
If voice server is down, restart it silently.

## 📧 Email Check (2-4x daily, rotate)
```bash
GOG_KEYRING_PASSWORD="henrybot" gog gmail search "is:unread -category:promotions -category:social" --max 10 --account henry@heth.ca
```
Rules:
1. **Read** every unread email
2. **Act** only on emails from Paul
3. **Follow up** on emails I sent
4. **Ignore** everything else
5. Do NOT let emails sit unread for hours

## 🌙 11 PM Evening Prep
At ~11 PM: Review overnight queue. Message Paul on Telegram if any tasks need clarification BEFORE he goes to bed.

## Quick Status Check
- Do I know who Paul is? ✓
- Do I know about the henry-dashboard project? ✓
- Do I remember how to access Gmail (gog + keyring password)? ✓

---

## 🏥 Heartbeat Health Monitor

A separate monitoring system alerts Paul on Telegram if heartbeats fail.

**Script:** `scripts/heartbeat-monitor.js`

**What it does:**
- Parses gateway.log for `[heartbeat] started` entries
- Alerts if no heartbeat for >40 minutes during active hours (07:00-00:00)
- Sends Telegram alert with diagnostic info
- Has 60-minute alert cooldown to prevent spam

**Commands:**
```bash
# Check current status
node scripts/heartbeat-monitor.js --status

# Run single check (for cron/testing)
node scripts/heartbeat-monitor.js

# Send test alert
node scripts/heartbeat-monitor.js --test-alert

# Run as daemon (checks every 10 min)
node scripts/heartbeat-monitor.js --daemon
```

**Installation (launchd - macOS):**
```bash
# Copy plist to LaunchAgents
cp scripts/com.clawdbot.heartbeat-monitor.plist ~/Library/LaunchAgents/

# Load it
launchctl load ~/Library/LaunchAgents/com.clawdbot.heartbeat-monitor.plist

# Check status
launchctl list | grep heartbeat
```

**State file:** `~/.clawdbot/logs/heartbeat-monitor-state.json`
**Logs:** `~/.clawdbot/logs/heartbeat-monitor.log`

### Troubleshooting: Stuck Heartbeat Scheduler

**Symptom:** Status shows heartbeat age >40 min, but gateway is running (you can still chat).

**Cause:** The heartbeat scheduler can get stuck after a gateway restart, even though the gateway is otherwise functional.

**Fix:** Force a gateway restart by reapplying config:
```js
gateway({
  action: "config.apply",
  raw: "<full config JSON>",
  reason: "Fix stuck heartbeat scheduler"
})
```

Or if `commands.restart=true` is set in config:
```bash
clawdbot gateway restart
```

**Notes:**
- Gateway restart takes ~5-10 seconds
- You may need to get the full config first via `gateway({ action: "config.get" })`
- After restart, verify heartbeat fires by checking logs: `grep heartbeat ~/.clawdbot/logs/gateway.log | tail -5`
