# Research & Plan: Paul's Life OS (Dashboard Enhancements)

**Philosophy:** Efficiency for the sake of *living*, not just working.
**Goal:** Maximize time on the mountain/water/with kids. Minimize desk time.
**Target Audience:** Paul (56, Retired, Dyslexic, Data-Driven).

---

## 1. The "Chief of Staff" Briefing
Instead of starting with charts, the dashboard should start with a plain-English executive summary. Paul wants to know *what to do*, not just see data.

*   **Concept:** A text-based "Morning Briefing" card at the top.
*   **Content:**
    *   "Good morning, Paul. You're crushing the **Active** category this week (40% of completed tasks)."
    *   "**Warning:** You have 5 High-Priority tasks older than 30 days. They are becoming 'Desk Anchors'."
    *   "**Henry's Update:** I've handled 12 admin tasks this week, saving you approx 2 hours."

## 2. Core Metrics (The "Why")

### A. Life Balance Audit (The "Big 4" Alignment)
Does his task history reflect his stated priorities?
*   **Data Strategy:** Map Toodledo folders/tags to his 4 pillars:
    1.  **Dad:** (Tags: `Ailie`, `Parker`, `Soccer`, `School`, `Logistics`)
    2.  **Active:** (Tags: `Ski`, `Sail`, `Run`, `Tri`, `Health`)
    3.  **Social:** (Tags: `Friends`, `Dinner`, `Events`)
    4.  **Tech/Admin:** (Everything else)
*   **Visualization:** A **100% Stacked Bar Chart** (Weekly).
*   **Insight:** If "Tech/Admin" exceeds 30% of the bar, the dashboard flashes a gentle warning: *"Tech balance high. Time to unplug?"*

### B. The "Desk Anchor" (Latency & Stagnation)
Are things languishing?
*   **Metric:** **Average Task Age** (Creation Date vs. Completion Date).
*   **The "Rotting" Index:** Count of tasks > 60 days old that are NOT set to "Someday/Maybe".
*   **Action:** A specific view called **"The Graveyard"**. It shows these old tasks with two big buttons: **"Do Today"** or **"Delete Forever"**. This forces a decision to clear mental clutter.

### C. Henry vs. Paul (The "Offloading" Ratio)
Is the AI actually helping Paul retire harder?
*   **Metric:** Count of completed tasks starting with `Henry:` vs Total.
*   **Goal:** Trend line should show Henry's % increasing over time, specifically in the "Admin/Tech" category.
*   **Insight:** "Henry handled 40% of your admin this week. You spent that time [Insert Active Activity based on Season]."

### D. Seasonal Context Switching
Paul's life is seasonal. The dashboard should be too.
*   **Logic:**
    *   **Nov - Apr:** Highlight `Ski`, `Winter`, `Maintenance` tags. Hide `Sailing`.
    *   **May - Oct:** Highlight `Sailing`, `eFoil`, `Tri`. Hide `Ski`.
*   **Feature:** "Seasonal Prep Mode." 30 days before the season switch, surface the "Prep" list (e.g., "Wax skis" in Oct, "De-winterize boat" in April).

## 3. "Smarter" Analytics (Deep Dive)

*   **Completion Momentum:** A heatmap showing *time of day* tasks are completed.
    *   *Anti-Goal Check:* If tasks are being completed at 11 PM - 1 AM, flag it: **"Late Night detected. Impact on Sleep?"**
*   **Batching Efficiency:**
    *   Measure "Context Switching." Are "Calls" done in a cluster? Or spread out?
    *   *Insight:* "You did 5 calls on Tuesday morning. Great batching." vs "You did 1 admin task every day this week. Try batching to Friday."

## 4. UI/UX: Accessibility First (Dyslexia Friendly)

Paul needs scannable, low-friction UI. "Don't make me read."

*   **Typography:** **Atkinson Hyperlegible** is non-negotiable. Large base size (18px).
*   **Layout:** "Bento Box" Grid. Each metric is a self-contained card.
*   **Color Coding:** Use color *semantically* but sparingly.
    *   **Active:** Energetic Orange/Red.
    *   **Dad:** Warm Blue.
    *   **Admin/Henry:** Muted Slate (Background noise).
*   **Icons over Text:** Use distinct icons for Ski, Boat, Kids, Code. Easier to scan than reading the words.

## 5. Implementation Roadmap

### Phase 1: The "Life Balance" & "Henry" Report
*   [ ] Implement Tag Mapping (Group existing tags into the 4 Pillars).
*   [ ] Create the "Life Balance" Stacked Bar Chart.
*   [ ] Create the "Henry vs Paul" doughnut chart.

### Phase 2: The "Rotting" Analysis
*   [ ] Calculate Task Age for all open items.
*   [ ] Create "The Graveyard" view (Old tasks > Actionable/Delete).
*   [ ] Add "Average Completion Time" metric.

### Phase 3: The "Chief of Staff" Logic
*   [ ] Write simple heuristics to generate the text summary ("If Admin > 50%, warn user").
*   [ ] Add Seasonal filtering logic.

### Phase 4: Sleep & Batching
*   [ ] Analyze completion timestamps for "Late Night" warnings.
*   [ ] Analyze clustering of similar tasks.
