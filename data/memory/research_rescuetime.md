# RescueTime API Integration Research

Research Date: February 1, 2026

## Executive Summary

RescueTime has a straightforward REST API. For personal use (Paul's account), all we need is an API key — no OAuth complexity. The API gives us activity data, productivity scores, daily summaries, and time breakdowns by app/website. Perfect for Paul's goals of reducing desk time, YouTube slop, and improving sleep.

## Authentication

Two options:
- API Key (personal use) — simple, just append to URL. Create at https://www.rescuetime.com/anapi/manage
- OAuth2 (multi-user apps) — overkill for us

We want the API key approach.

## Data Sync Timing

- Premium/paid plans: every 3 minutes
- Lite/free plan: every 30 minutes

This matters for real-time alerts. If Paul is on Free, we get 30-minute delayed data.

## Key API Endpoints

### 1. Analytic Data API
Base URL: https://www.rescuetime.com/anapi/data?key=API_KEY

Parameters:
- perspective: rank (summary) or interval (time series)
- resolution_time: month, week, day, hour
- restrict_kind: category, activity, productivity, overview
- restrict_begin / restrict_end: YYYY-MM-DD date range
- restrict_thing: filter to specific app/site (e.g., "youtube.com")
- format: json or csv

Example — YouTube time this week:
  GET /anapi/data?key=KEY&perspective=rank&restrict_kind=activity&restrict_thing=youtube.com&restrict_begin=2026-01-27&restrict_end=2026-02-01&format=json

Example — Productivity by hour today:
  GET /anapi/data?key=KEY&perspective=interval&resolution_time=hour&restrict_kind=productivity&restrict_begin=2026-02-01&format=json

### 2. Daily Summary Feed
URL: https://www.rescuetime.com/anapi/daily_summary_feed.json?key=API_KEY

Returns rolling 2 weeks of daily summaries with:
- total_hours, very_productive_hours, productive_hours
- distracting_hours, very_distracting_hours
- neutral_hours
- productivity_pulse (0-100 score)
- all_productive_percentage, all_distracting_percentage
- top categories with hours

This is the goldmine for daily reporting.

### 3. Alerts Feed (Premium only)
URL: https://www.rescuetime.com/anapi/alerts_feed.json?key=API_KEY
Returns triggered user-defined alerts.

### 4. Focus Session Trigger (Premium only)
Can start/stop focus sessions programmatically.

## Productivity Levels

RescueTime categorizes all activity:
- Very Productive (Focus Work)
- Productive (Other Work)
- Neutral
- Distracting (Personal)
- Very Distracting

## Rate Limits

Not explicitly documented but standard fair-use applies. For our use case (a few queries per heartbeat), no concern.

## Integration Plan

Step 1: Paul creates API key at https://www.rescuetime.com/anapi/manage
Step 2: Store key in ~/clawd/config/ or .env
Step 3: Build script (scripts/rescuetime.js) with functions:
  - getDailySummary() — today's productivity pulse, hours breakdown
  - getYouTubeTime(days) — YouTube-specific time tracking
  - getDeskTime(days) — total screen time trend
  - getProductivityTrend(days) — daily scores over time
  - getTopDistractions(days) — ranked time-wasters
Step 4: Add to heartbeat/morning briefing — surface key metrics
Step 5: Add to dashboard — charts for trends over time
Step 6: Set up alerts — if desk time exceeds X hours, or YouTube exceeds Y minutes

## Use Cases for Paul

1. Morning briefing: "Yesterday you were at the desk 6.2 hours, productivity pulse 72. YouTube was 45 minutes."
2. Weekly trend: "Desk time down 8% this week. YouTube slop down 20 minutes vs last week."
3. Real-time nudge: "You've been at the desk 4 hours today with only 1 break."
4. Sleep correlation: "On days you stop screens before 10pm, you average 7.2 hours sleep."
5. Dashboard widget: Productivity pulse trend, desk time chart, YouTube time tracker
6. Cross-reference with Toodledo: "You completed 12 tasks on high-productivity days vs 3 on low ones."

## What We Need From Paul

1. RescueTime API key — create at https://www.rescuetime.com/anapi/manage
2. Confirm plan tier (Free vs Premium) — affects data freshness and alert features
3. Any custom categories he's set up in RescueTime
4. Preferred thresholds (e.g., max desk hours/day, max YouTube minutes/day)
