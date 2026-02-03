# Design Document: Call Script Viewer & Management System

## 1. Overview
A specialized interface for managing, viewing, and searching voice call scripts/transcripts. This system effectively acts as a "Second Brain" or Obsidian-like vault specifically for voice interactions, ensuring valuable conversation data is accessible and organized.

## 2. Requirements
- **Storage:** All call scripts/transcripts saved as `.md` files.
- **Interface:** Organized, Obsidian-like viewer (sidebar navigation, clean reading view).
- **Search:** Full-text search across all scripts.
- **Telegram Integration:** Summaries continue to be sent to Telegram automatically.
- **Reference:** Based on "Mission Control" concepts from video analysis (Alex Finn), specifically the "Document Viewer" for past conversations.

## 3. Architecture

### A. Storage Layer (File System)
- **Location:** `/Users/henry_notabot/clawd/memory/voice-scripts/`
- **Format:** Markdown (`.md`)
- **Naming Convention:** `YYYY-MM-DD_HH-mm_Topic.md` (e.g., `2026-02-02_14-30_Ngrok-Setup.md`)
- **Metadata (Frontmatter):**
  ```yaml
  ---
  date: 2026-02-02 14:30
  participants: [Paul, Henry]
  tags: [voice, architecture, ngrok]
  summary: "Setup of permanent ngrok tunnel"
  ---
  ```

### B. Frontend Application ("Henry Dashboard")
This will be a module within the existing `henry-dashboard` project (Vite + React).

**UI Components:**
1.  **Sidebar (Navigation):**
    - Folder/Tree structure (Year > Month > Script).
    - "Recent Calls" quick access.
    - "Search" input field.
2.  **Main View (Document Panel):**
    - Markdown renderer (using `react-markdown`).
    - Syntax highlighting for code blocks.
    - Clean typography (Atkinson Hyperlegible font for readability).
3.  **Search Interface:**
    - Real-time filtering of file list.
    - Full-text search results highlighting.

### C. Backend / API
- **Technology:** Node.js (Express or Fastify) running locally.
- **Endpoints:**
    - `GET /api/scripts`: List all `.md` files in the directory.
    - `GET /api/scripts/:filename`: Read content of a specific file.
    - `POST /api/search`: Server-side grep/search (optional, or client-side if dataset is small).

## 4. Workflow Integration

### Automatic Capture (The "Pipeline")
1.  **Voice Call Ends:** Voice server (`voice-realtime/index.js`) saves raw transcript.
2.  **Processing:**
    - LLM generates a summary and extracts tags/title.
    - Content formatted as Markdown with YAML frontmatter.
    - File saved to `memory/voice-scripts/`.
3.  **Notification:**
    - Summary sent to Telegram immediately (existing behavior).
    - Link to view full script in Dashboard included (e.g., `http://localhost:5173/scripts/2026-02-02...`).

## 5. Comparison to Video "Best Practices"
- **Obsidian Style:** The video highlights a "Mission Control" where documents are first-class citizens. This design replicates that with a dedicated "Docs" tab.
- **"Muscles" vs "Brain":** The viewer is a "muscle" (tool) that allows the "brain" (Henry) and the user (Paul) to reference past context easily.
- **Proactive:** Instead of Paul searching raw text files, the system proactively organizes them into a browseable UI.

## 6. Implementation Plan (Next Steps)
1.  **Create Directory:** Ensure `memory/voice-scripts/` exists.
2.  **Update Voice Server:** Modify post-call logic to save formatted `.md` files in addition to the current raw logs.
3.  **Dashboard API:** Add `scripts` endpoints to the dashboard backend.
4.  **Dashboard UI:** Build the "Script Viewer" component in React.
