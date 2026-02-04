# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## Integrations

### Toodledo
- **Setup Guide:** [TOODLEDO_SETUP.md](./TOODLEDO_SETUP.md)
- **Credentials:** `toodledo_credentials.json`
- **Working Scripts:** `scripts/toodledo_update_fix.js`, `scripts/toodledo_add_task.js`
- **Defaults when creating:** Folder: pWorkflow (ID: 9975528), Priority: Med (1) — set these unless a specific topic folder is more appropriate (pHome, pPhysical, pFinancial, etc.)
- **Paul's task views:**
  - Paul's tasks: https://tasks.toodledo.com/saved/240253#
  - Henry's tasks: https://tasks.toodledo.com/saved/240228#
  - Henry deliverables (briefing): https://tasks.toodledo.com/saved/240262
  - Henry incoming (new4henry): https://tasks.toodledo.com/saved/240263#
- **"Henry:90" prefix:** Henry can do ~90% independently, needs Paul for the last ~10% (credentials, decisions, physical actions)
- **Progress:** ALWAYS log in BOTH task notes AND memory files
- **Task notes must include:** what was completed, links to outputs (Drive, GitHub), next steps
- Paul checks Toodledo. If it's not there, he doesn't see it.

### Bitwarden
- **CLI:** `bw` installed, account henry@heth.ca
- **Master password:** stored at `~/.bw_master` (chmod 600)
- **Unlock:** `export BW_SESSION=$(bw unlock "$(cat ~/.bw_master)" --raw)`
- **Search:** `bw list items --search "sitename" --session "$BW_SESSION"`
- **Note:** Not truly secure from local access — use for convenience credentials only (not banking)

### Snow-Forecast.com
- **Account:** paul@heth.ca (in Bitwarden)
- **Premium member** — has 16-day forecast access
- **Quick Access resorts:** Mt Seymour, Whistler Blackcomb, Crescent Spur, Grouse Mountain, Cypress Mountain, Kicking Horse, Revelstoke

### Brave Browser Extension (Chrome Relay)
- **Installed:** yes, loaded unpacked from `~/.clawdbot/browser/chrome-extension`
- **Desktop shortcut:** `~/Desktop/clawdbot-extension`
- **Usage:** Paul must click extension icon on a tab to connect it — per-tab, per-session

### Browser Automation (SOLVED 2026-02-01)
- **USE THIS:** `puppeteer-core` connecting directly via CDP to `http://127.0.0.1:18800`
- **DO NOT USE:** Clawdbot browser proxy (http://127.0.0.1:18791) — it times out constantly
- **Installed:** `npm install puppeteer-core` in `/Users/henry_notabot/clawd`
- **Browser:** Brave at port 18800, persistent profile at `~/.clawdbot/browser/clawd/user-data`
- **Cookies persist** between sessions — log in once per site, stay logged in
- **Pattern:**
```js
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:18800', defaultViewport: null });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
// ... do stuff, be PATIENT with timeouts ...
browser.disconnect(); // NOT browser.close()
```
- **CAPTCHAs:** Screenshot → send to Paul on Telegram → wait for reply → enter. One-time per site if cookies persist.
- **BE PATIENT:** Browser ops are slow. Use 30s+ timeouts. Don't thrash between approaches.

### Email (Gmail via gog)
- **Account:** henry@heth.ca
- **Unlock:** `GOG_KEYRING_PASSWORD="henrybot"`
- **Safety wrapper:** `gog` is aliased to `scripts/gog-safe` (via ~/.zshrc)
  - **What it does:** Intercepts `gmail send --account paul@heth.ca` → converts to `drafts create` automatically
  - **Why:** Henry must NEVER send as Paul. No override, no bypass. Paul reviews and sends drafts from Gmail himself.
  - **Affects:** Only `gmail send` + `paul@heth.ca`. All other gog commands (search, calendar, henry@heth.ca sends) pass through unchanged.
  - **Location:** `/Users/henry_notabot/clawd/scripts/gog-safe`
  - **If removed/broken:** The alias in ~/.zshrc must be restored. Without it, there's no safety net.
- **ALWAYS reply in-thread** — never compose fresh when responding to an existing email:
  ```
  gog gmail send --to "recipient" --subject "Re: ..." --body "..." \
    --reply-to-message-id=<ORIGINAL_MSG_ID> \
    --thread-id=<THREAD_ID> \
    --account henry@heth.ca
  ```
- **For reply-all:** Add `--reply-all` (auto-populates recipients from original)
- **Forwarding:** Include the original email content in the body so the thread is preserved
- **Paul's Gmail (paul@heth.ca):** Create drafts only. Never send directly without explicit permission.
- **Email Rules:**
  1. Read ALL unread emails every heartbeat
  2. Act only on emails from Paul
  3. Follow up on emails I sent on Paul's behalf — report back on replies/next steps
  4. Ignore everything else
  5. Do NOT let emails sit unread for hours

### Telegram Formatting
- **Double line breaks before every heading/section** — single breaks collapse in Telegram
- Bold headers get merged with prior content without the extra break
- This is critical for Paul's readability (dyslexia)
- Use bar charts (█████) over bullet lists wherever possible

### Meeting Summaries
- **Actions section at the TOP** — not buried at the bottom
- Use `- [ ]` checkboxes for each action item
- Include owner, priority, and timeline

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH
- home-server → 192.168.1.100, user: admin

### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
