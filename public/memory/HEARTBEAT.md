# HEARTBEAT.md

## ⚡ EFFICIENCY RULE
Complete all checks with minimal output. No status summaries. No thinking out loud.
- **Daytime (8 AM - 11 PM):** If nothing needs attention → HEARTBEAT_OK
- **Overnight (11 PM - 8 AM):** NEVER reply HEARTBEAT_OK without first checking queue and spawning work

## 📧 Email Check (EVERY HEARTBEAT)
```bash
GOG_KEYRING_PASSWORD="henrybot" gog gmail search "is:unread newer_than:2h" --account henry@heth.ca --max 5
```
- Act only on emails from Paul or replies to emails Henry sent
- Ignore everything else
- If action needed: do it, then report to Paul on Telegram

## 🔊 Voice Server Health Check
```bash
curl -s http://localhost:6060/status
```
- If not responding: restart with `pkill -f "node index.js"; sleep 1; cd ~/clawd/voice-realtime && nohup node index.js > voice.log 2>&1 &`
- If responding: no output needed

## 🌐 Cloudflare Tunnel Check
```bash
curl -s -o /dev/null -w "%{http_code}" https://mc.heth.ca
```
- If not 200/302: restart tunnel `nohup cloudflared tunnel run --config ~/.cloudflared/config.yml > ~/.cloudflared/tunnel.log 2>&1 &`

## 🚨 OVERNIGHT WORK IS MANDATORY (11 PM - 8 AM)
If overnight and active tasks exist in the queue, spawn sub-agents. Do NOT reply HEARTBEAT_OK without checking.
```bash
cd /Users/henry_notabot/clawd && node scripts/toodledo_queue.js
```
