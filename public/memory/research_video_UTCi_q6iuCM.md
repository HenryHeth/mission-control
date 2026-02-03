# Video Review: How to make ClawdBot 10x better (5 easy steps)
**Source:** [YouTube - Alex Finn](https://www.youtube.com/watch?v=UTCi_q6iuCM)
**Date:** Feb 2026 (Implied context)

## Overview
The video by Alex Finn outlines five specific strategies to optimize "ClawdBot" (also referred to as OpenClaw). The central thesis is treating the bot not as a search engine or simple chatbot, but as a proactive employee that needs context, proper tooling ("muscles"), and specific memory configurations to function effectively.

## Detailed Section Breakdown

### 1. Improving Memory (0:23)
**Problem:** Default memory compaction can cause the bot to "forget" the immediate context of a conversation (what was said 5 seconds ago) after a cleanup cycle.
**Solution:** Enable two specific experimental settings:
*   **Memory Flush:** Records the most important parts of the conversation *before* compaction so they persist immediately after.
*   **Session Memory Search:** Allows the bot to search through the entire session history (not just the compacted summary) when it needs context.
**Configuration mentioned:**
- `compaction.memoryFlush.enabled = true`
- `memorySearch.experimental.sessionMemory = true`

### 2. Use the Right Models ("Brain vs. Muscles") (1:39)
**Concept:** Use Claude Opus (or the strongest model) as the "Brain" for communication and reasoning, but delegate specific tasks to specialized "Muscle" models to save money and increase speed.
**Examples:**
- **Coding:** Codex CLI
- **Web Search:** Gemini API
- **Social Search:** Grok API
**Implementation:** Instruct the bot explicitly: *"Moving forward, I want to use Codex for all coding, Gemini for web search..."*. The bot should handle the API key setup and routing.

### 3. Set Expectations & Brain Dump (3:24)
**Philosophy:** Treat the bot like a new employee.
**Step A: Brain Dump:** Tell it *everything* about yourself—dreams, daily routines, relationships, hobbies. This provides the "why" behind tasks.
**Step B: Expectation Setting:** Define the working relationship.
- Example: *"I want you to be proactive. Work every night while I sleep. Surprise me in the morning."*
- Result mentioned: The bot started implementing its own phone number and voice to call the user in the morning.

### 4. Reverse Prompting (6:28)
**Concept:** Instead of commanding every step, ask the bot to generate its own tasks based on its knowledge of you.
**Prompts:**
- *"Based on what you know about me and my goals, what are some tasks you can do to get us closer to our missions?"*
- *"What other information can I provide you to improve our productivity?"*
**Benefit:** Leverages the model's intelligence to identify gaps or opportunities the user hasn't thought of.

### 5. Create Your Own Tooling (8:04)
**Key Insight:** ClawdBot is fully extensible and can "vibe code" its own tools.
**The "Mission Control" Dashboard:**
The video showcases a custom dashboard built by the bot upon request. Features shown include:
- **Kanban Task Board:** Tracking backlog, in-progress, and reviewed tasks.
- **Document Viewer:** A specific tool requested to "look back at past conversations." The bot built a viewer that indexes memories and tasks into readable documents.
- **CRM & Project Boards:** Visual interfaces for managing people and projects.
**How to get it:** Ask: *"What tooling can we build to improve our productivity? Build a task board so I can track your work."*

---

## Relevance to Our Setup

### The "Document Viewer" & Voice Transcripts
Paul specifically noted interest in the **Document Viewer** (9:15 in video).
*   **In the video:** The user asked for a way to look back at past conversations. The bot built a UI that presents these as documents.
*   **For Us:** We can replicate this for **voice call transcripts**. Instead of just having raw text files in `memory/`, we could ask the bot (or I can build) a simple HTML/React interface that:
    1.  Reads the transcript directory.
    2.  Presents them in a clean, searchable "Document Viewer" UI.
    3.  Tags them by date, speaker, or topic.
    This aligns perfectly with the "Custom Tooling" section. We don't need to wait for a feature update; we can build it as a local tool/dashboard.

### Memory Configuration
We should verify our current memory settings. If we experience "amnesia" during long sessions, enabling `memoryFlush` and `sessionMemory` (if available in our version of Clawd) would be a direct upgrade.

### Proactive "Employee" Mode
The video emphasizes "work while I sleep." This relates to our **Heartbeat** and **Cron** capabilities. We could set up a nightly cron job that:
1.  Reviews the day's notes.
2.  Synthesizes a "Morning Briefing."
3.  Proposes 3 tasks for the next day.
This moves us from "Reactive Chatbot" to "Proactive Assistant."
