# Integration Feasibility Report (2026-01-31)

## 1. Home Assistant (House & Boat)
- **Status:** **High Feasibility** (Official Support).
- **Tool:** Home Assistant has a native `Model Context Protocol Server` integration.
- **Connection:** `mcporter` to HA instance.

## 2. YouTube (Curation & "Slop" Filter)
- **Status:** **API Blocked (Read-Only History)**
- **Issue:** YouTube Data API v3 *removed* access to user Watch History in 2016.
- **Workarounds:**
  1.  **Google Takeout:** Manual JSON export (high friction).
  2.  **Browser Extension:** Custom extension to capture URLs visited on `youtube.com` and send to Clawdbot.
  3.  **Playlist curation:** We *can* read "Watch Later" or "Liked" playlists via API. (Strategy: You add to "Watch Later", I filter that list and move "Good" stuff to a "Henry Approved" playlist).

## 3. RescueTime (Digital Health)
- **Status:** **High Feasibility**.
- **Tool:** RescueTime Daily Summary API.
- **Auth:** API Key.
- **Metrics:** Productivity Pulse, focus duration, uncategorized %.

## Next Actions
- **YouTube:** Decide on strategy (Playlist filtering vs. Browser tracking).
- **Home Assistant:** Install "Model Context Protocol Server" addon.
- **RescueTime:** Generate API Key at `rescuetime.com/anapi/manage`.
