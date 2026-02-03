# Meeting Summary: Task Process Review
**Date:** 2026-02-02, 7:15 PM - 10:00 PM PST
**Attendees:** Paul, Henry III

## ACTIONS
- [ ] Build Mission Control v1 (Docs tab first, Next.js + Tailwind, Vercel) — tonight, ready by tomorrow
- [ ] Fix outbound voice calling — urgent (TD #443138004)
- [ ] Research VVO/life planning frameworks — narrow to top 3, prefer ones with quiz/test scored output — this week (TD #443139302... needs update)
- [ ] Research AI agent rule-following/reliability in Clawdbot community (TD #443139302)
- [ ] Set up twice-weekly voice triage sessions — auto-scheduled into calendar gaps
- [ ] Create cron rule: when accepting calendar invite, immediately create cron 5 min before meeting
- [ ] Set up sprint planning process (2-week cycles)
- [ ] Tag treadmill tasks (dated but repeatedly bumped, added 3+ months ago)
- [x] Fix email threading — always use --reply-to-message-id and --thread-id (TOOLS.md)
- [x] Fix email monitoring — check ALL unread, not just from Paul (HEARTBEAT.md)
- [x] Log progress in BOTH TD task notes AND memory files (TOOLS.md)
- [x] Telegram formatting — double line breaks before headings (TOOLS.md)
- [x] Meeting summaries — actions at top with checkboxes (TOOLS.md)
- [x] Bulk-tag 254 tasks as "standby >1yr", Paul set to Someday status
- [x] Bulk-tag 161 undated tasks as "standby <1yr"
- [x] Vercel logged in and ready for deployment

---

## 1. Email Response Issues
- Henry wasn't reading all unread emails — only checking `from:paul@heth.ca`
- Paul's replies sat unread for 3+ hours
- Email replies missing thread history — composing fresh instead of replying in-thread
- **FIXED:** HEARTBEAT.md updated to check ALL unread
- **FIXED:** TOOLS.md updated with `--reply-to-message-id` and `--thread-id` rule
- **Email Rules:** Read all, act only on Paul's, follow up on sent-on-behalf, ignore rest

## 2. Mission Control Dashboard
- One app, one URL, all tabs
- **Tech:** Next.js + Tailwind, dark theme, hosted on Vercel
- **Vercel:** Logged in ✅ (Paul's GitHub account)
- **GitHub:** New repo under HenryHeth
- **Tabs:** MC homepage (bar charts), Tasks (summary + links to TD), Memory, Captures, Docs, People
- **Projects tab dropped** — covered by TD subtasks
- **VVO tab** — quarterly vision/values/objectives with goals cascading to tasks
- **Priority:** Docs tab first (research reports, phone transcripts, Telegram logs)
- **Design reference:** Screenshot from video — dark sidebar with file list, tag filters, file type badges, content pane on right
- **Timeline:** Build tonight, ready by tomorrow
- Links out to: Toodledo, RescueTime, Home Assistant, Calendar

## 3. Task Progress Logging
- ALWAYS log in BOTH Toodledo task notes AND memory files
- Paul checks Toodledo — if it's not there, he doesn't see it
- Include links to deliverables (Drive, GitHub, etc.)

## 4. Telegram Formatting
- Double line breaks before every heading/section
- Bold headers get merged with prior content without extra break
- Use bar charts (█████) over bullet lists wherever possible
- Critical for Paul's readability (dyslexia)

## 5. Meeting Summary Format
- Actions section at the TOP with checkboxes
- Include owner, priority, and timeline

## 6. Task Triage

### Current State After Triage:
```
TOTAL      581
Someday    254  standby >1yr  (parked, Someday status)
Undated    161  standby <1yr  (queued for voice triage)
ACTIVE     167  working set with dates
```

### Treadmill Tasks:
- 64 tasks due this week but added 3+ months ago
- Getting bumped to next Monday every week without progress
- Examples showed age doesn't equal irrelevant (kids financial plan = real project, health tracker = living project, spousal loan = legitimate recurring)
- Triage can't be fully automated — needs human context

### Voice Triage Sessions:
- Twice weekly, auto-scheduled into calendar gaps
- 10 tasks per session over voice call
- **Phase 1 mix** (until treadmill cleared): 6 treadmill + 2 standby >1yr + 2 standby <1yr
- **Phase 2 mix** (after treadmill): 5 standby >1yr + 5 standby <1yr
- Decisions per task: **keep / kill / someday / sprint it** (promote to next sprint with date)
- Henry reads full task notes when presenting — notes have valuable context

### Sprint Planning (Scrum-inspired):
- Two-week cycles
- Sprint Planning: pick tasks from backlog for next 2 weeks
- Daily standups: morning briefing
- Sprint Review: what got done
- Retrospective: what to improve
- VVO/Goals filter which tasks earn a sprint spot

## 7. VVO Framework
- Vision → Values → Objectives → Goals → Projects/Tasks
- Paul does the deep work on vision/values (most frameworks have a quiz/test)
- Henry researches frameworks and narrows to top 3
- Candidates: Covey 7 Habits, OKRs, Hyatt Best Year Ever, Sinek Golden Circle, others
- VVO tab in Mission Control for quarterly review
- Toodledo Goals and Status fields to be leveraged
- Hierarchy: VVO → Goals → Projects/Tasks (top-down cascade)
- Without VVO = no filter = all tasks feel equal

## 8. Calendar Meeting Reminders
- Henry missed the 7:15 meeting — no cron/alarm set, relied on "I'll remember"
- **Rule:** When accepting a calendar invite, immediately create a cron job 5 min before
- Outbound calling also failed — need to fix Twilio webhook for outbound

## 9. Integrations (earlier today, context for meeting)
- **RescueTime:** API connected ✅, productivity pulse + app breakdown working
- **Home Assistant:** Connected ✅ (192.168.1.96:8123), 446 entities, 86 days sitting history via WebSocket
- **Sitting at desk:** Added to morning briefing — 7-day bar chart + YTD avg + goal <4h
- **Android System:** Removed from RescueTime (ignore forever — noise)
- Morning briefing to include: desk, computer, mobile, youtube, pulse bars

## 10. Rule Following / Reliability
- Core issue: rules get written but not consistently followed
- Groundhog day problem — same conversations repeated
- Henry to research how Clawdbot community solves this (TD task created)
- Without reliability, productivity gains are just demos

## 11. Overnight Production
- Paul expects to see completed work in the morning without chasing it
- Progress must be visible in Toodledo task notes
- Research/deliverables surfaced in morning briefing or Mission Control (once built)
