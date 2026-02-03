# Mission Control — Design Document
**Date:** 2026-02-02
**Status:** Proposed (pending 7:15 PM review)

## Vision
One app, one URL, one bookmark. Everything Paul needs to manage his day without sitting at a desk.

## Architecture

```
Morning Briefing (email) → highlight reel + link
        ↓
   Mission Control (web app) → single pane of glass
        ↓ drill-down links
   Toodledo | RescueTime | Home Assistant | Calendar
```

## Tabs

### 🏠 Mission Control (homepage)
Live metrics dashboard with bar charts:
```
DESK       6.5h █████▌    Goal: <4h     ← Home Assistant
COMPUTER   3.2h ███                     ← RescueTime
MOBILE     5.1h █████                   ← RescueTime  
YOUTUBE    1.2h █                       ← RescueTime
PULSE      72 ████████░░               ← RescueTime
TASKS DUE  3  |  OVERDUE  1            ← Toodledo
```
- 7-day sitting bar chart + YTD avg
- Productivity pulse trend
- Drill-down links to source systems

### ✅ Tasks
- Due today / overdue / completed
- Velocity (done vs added)
- Links to Toodledo for actual task management

### 📂 Projects
- Longer-term project tracking
- Status overview

### 🧠 Memory
- Daily notes (memory/YYYY-MM-DD.md)
- MEMORY.md long-term context
- Searchable

### 📸 Captures
- Telegram conversation logs
- Phone call transcripts (Call Script Viewer design)
- Voice session logs
- Searchable, filterable by date/type

### 📄 Docs
- Research reports
- Design documents
- Journals, newsletters
- File type filters (.md, .json, .mobi, .epub)

### 👥 People
- Contacts context

## Data Sources
| Source | Data | Update Frequency |
|--------|------|-----------------|
| Home Assistant | Sitting at desk (sensor.sitting_at_desk) | Real-time via WebSocket |
| RescueTime | Screen time, productivity, app breakdown | Daily API pull |
| Toodledo | Tasks, due dates, folders, priorities | Real-time API |
| Google Calendar | Events, family schedules | Real-time API |
| Local files | Memory, docs, transcripts | File system watch |

## Morning Briefing Integration
Email contains:
- Key metrics as bar charts (desk, computer, mobile, youtube, pulse)
- Tasks due + overdue count
- Link to Mission Control for full dashboard

## Tech Stack (TBD)
- Locally hosted on Mac Mini
- Accessible from phone (mobile-first design)
- Paul's preferred bar chart visual style
- Dark theme (matching screenshot)

## Key Design Principles
- Bar charts over bullets (accessibility/dyslexia)
- Double line breaks between sections
- Visual, instant, no reading required
- Mobile-first (reduce desk time)
- One URL to rule them all 👑

## Open Questions for 7:15 Review
1. Host as static site or need a backend server?
2. Auth needed? (local network only vs accessible outside)
3. Priority order for building tabs?
4. Real-time updates or periodic refresh?
5. Integration with existing henry-dashboard project?
