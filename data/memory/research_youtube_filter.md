# Research Report: YouTube "Slop Reduction" Strategy for Paul

**Date:** February 1, 2026
**Subject:** Technical Feasibility & Strategy for Intentional YouTube Viewing

## Executive Summary
We can significantly reduce Paul's "mindless" viewing by combining **programmatic playlist curation** (using the YouTube API) with **browser-side interface filtering** (using extensions). 

**The Core Strategy:**
1.  **Eliminate Discovery:** Use browser extensions to hide the Home Feed, Sidebar Recommendations, and Comments. YouTube becomes a "Search & Library" only tool.
2.  **Automate Intent:** We write a script to generate a daily "Paul's Brief" playlist containing only fresh, high-quality videos from a vetted whitelist of channels.
3.  **Track by Exception:** Since the API cannot read watch history, we assume any time spent *outside* the curated playlist is "slop" (or we use broad RescueTime "Time on Site" metrics).

---

## 1. YouTube Data API v3: Capabilities & Limits

### ✅ What We Can Do (Programmatically)
*   **Manage Playlists:** Full control (Create, Delete, Insert Videos, Reorder). This is the backbone of our strategy.
*   **Read Subscriptions:** We can pull his current subscription list to help build the initial "Whitelist."
*   **Search (Scoped):** We can search for the latest videos *only* from specific channels (acting as a custom feed builder).
*   **Likes:** We can read his "Liked Videos" playlist (requires OAuth).

### ❌ What We Cannot Do
*   **Read Watch History:** 🛑 **Deprecated since 2016.** The API endpoint `channels.list(part='contentDetails')` no longer returns the `history` playlist ID. We cannot programmatically analyze what he watched yesterday.
*   **"Not Interested" / Block Channels:** There is no public API endpoint to mark videos as "Not Interested" or block channels. This must be done manually in the UI.
*   **Algo Manipulation:** We cannot directly "massage" the algorithm via API calls (other than indirectly by liking/subscribing).

### 🔑 Authentication
*   **OAuth 2.0:** Required for all user-specific data (playlists, subs). Paul will need to authorize our application once.

---

## 2. Technical Strategy: "Paul's Daily Brief"

Instead of fighting the algorithm, we ignore it. We build a custom feed.

### The Mechanism (Clawdbot Script)
1.  **Input:** A user-defined `whitelist.json` of Channel IDs (e.g., "Veritasium", "PBS Space Time").
2.  **Fetch:** Every morning (e.g., 6 AM cron), the script queries the API for the latest uploads from these channels.
3.  **Filter:** Apply "Anti-Slop" logic:
    *   *Duration:* > 10 minutes (filter out Shorts/clips).
    *   *Keywords:* Exclude titles with "Reaction", "Teaser", etc.
    *   *Freshness:* Published in the last 24-48 hours.
4.  **Curate:**
    *   Clear the existing "Paul's Daily Brief" playlist.
    *   Insert the filtered videos.
5.  **Result:** Paul opens YouTube, ignores the blank homepage, and clicks "Playlists > Paul's Daily Brief".

---

## 3. Browser-Side Filtering (The "Unhook" Method)

To prevent him from falling into the "rabbit hole" after the playlist ends, we need to strip the UI.

**Recommended Tool: "Unhook" (Browser Extension)**
*   **Effect:** Hides the Home Feed, Related Videos (sidebar), Comments, and Shorts tab.
*   **Result:** YouTube looks empty. No thumbnails screaming for attention.
*   **Platform:** Available for Chrome, Edge, Firefox (Desktop).
*   **Mobile:** Harder to implement. On iOS/Android, the official app is resistant to this. Recommendation: Use a third-party client or strict Digital Wellbeing app timers.

**Alternative: DF Tube (Distraction Free for YouTube)**
*   Functionally similar, but Unhook is currently more actively maintained.

---

## 4. Measurement & Tracking

### The "Missing History" Problem
Since we can't read his watch history via API, we can't generate a "Slop vs. Intentional" report automatically.

**Workarounds:**
1.  **RescueTime:** Good for "Total Time on YouTube." If he spends 2 hours on YouTube but the "Daily Brief" was only 30 minutes, we know ~1.5h was likely unstructured.
    *   *Note:* RescueTime generally does not capture video titles without complex setups.
2.  **Google Takeout:** Once a month, Paul could manually export his YouTube data (JSON format) for us to analyze. (High friction).
3.  **Honor System:** The strategy relies on *environment design* (removing the options) rather than *surveillance*.

---

## 5. Implementation Plan

### Phase 1: The Cleanse
1.  **Install "Unhook" extension** on Paul's desktop browser.
2.  **Configure Unhook:** Hide Home Feed, Sidebar, Comments, Shorts.
3.  **Audit Subscriptions:** Paul (or us) reviews his subs and creates the initial "High Signal" whitelist.

### Phase 2: The Builder (We Build This)
1.  **Setup Google Cloud Project:** Enable YouTube Data API v3.
2.  **Develop Script:** `youtube_curator.py`
    *   Auth flow (OAuth).
    *   Fetcher logic (Channels -> Videos).
    *   Playlist logic (Update "Daily Brief").
3.  **Schedule:** Run daily via Clawdbot/Cron.

---

## Credentials & Access Needed

To proceed with **Phase 2**, Paul needs to provide:

1.  **Google Account Permission:** He will need to click an OAuth link we generate to authorize the script to manage his YouTube account.
2.  *(Optional but recommended)*: He needs to create a Google Cloud Project (free tier is sufficient) and provide the `client_secrets.json` file so we aren't rate-limited by shared quotas.

**Decision Point for Paul:**
*   Does he want to proceed with the **Programmatic Playlist** approach?
*   Is he willing to install the **Unhook extension** immediately?
