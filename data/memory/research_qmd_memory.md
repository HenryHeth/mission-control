# Research: QMD (Quick Markdown Search) for Enhanced Memory Recall

## Context
User Paul identified a gap in the AI assistant's ability to recall information ("recall things is still a little bit lacking") and pointed to a technique discussed in a video (OpenClaw use cases) around the 12:27 mark. The file naming convention (`research_qmd_memory.md`) and subsequent research confirm the technique involves **QMD** (Quick Markdown Search).

## The Technique: QMD (Quick Markdown Search)

QMD is a local search engine designed specifically for Markdown notes, documentation, and knowledge bases. Unlike the assistant's internal memory (which tracks conversation history and facts in `MEMORY.md`), QMD indexes a user's *external* local files and makes them searchable via keyword (BM25) or semantic (vector) search.

### Key Capabilities
- **Local Indexing**: Scans and indexes local markdown collections (e.g., `~/notes`, `~/documents`).
- **Hybrid Search**:
  - **`qmd search`**: Fast keyword matching (BM25). Instant and reliable for exact terms.
  - **`qmd vsearch`**: Vector-based semantic search. Useful when keywords fail but requires loading a local embedding model (slower).
  - **`qmd query`**: Hybrid search with LLM reranking (highest quality but slowest).
- **Agent Integration**: Can be exposed as a tool/skill to the AI, allowing it to "read" the user's personal knowledge base on demand.

## Application to AI Assistant (Clawdbot/Henry)

This technique addresses the "recall gap" by giving the AI access to a broader, static knowledge base that exists outside of its session context.

### Current vs. Enhanced Memory
| Feature | **Internal Memory** (`MEMORY.md` / `memory_search`) | **QMD** (External Knowledge Base) |
| :--- | :--- | :--- |
| **Source** | Conversation logs, self-curated facts | User's existing notes, project docs, journals |
| **Scope** | What the *AI* remembers | What the *User* knows/has written |
| **Update** | Automatic during sessions | Manual or scheduled indexing (`qmd update`) |
| **Use Case** | "What did we discuss yesterday?" | "Find my notes on the React project architecture" |

### Concrete Suggestions for Implementation

1.  **Install & Index**:
    - Install `qmd` (requires Bun).
    - Create a collection pointing to the user's primary notes directory:
      ```bash
      qmd collection add /Users/henry_notabot/clawd/notes --name main_notes --mask "**/*.md"
      ```

2.  **Enable the Skill**:
    - Add `qmd-skill` to the agent's capabilities.
    - Define trigger phrases: "search my notes", "check the docs", "find in knowledge base".

3.  **Maintenance Routine**:
    - Configure a cron job or heartbeat task to keep the index fresh:
      - **Hourly**: `qmd update` (updates keyword index).
      - **Nightly**: `qmd embed` (updates vector embeddings for semantic search).

4.  **Usage Strategy**:
    - Default to `qmd search` (keyword) for speed.
    - Fallback to `qmd vsearch` (semantic) only if no results are found or the query is abstract.
    - Use `qmd get` to retrieve the full content of a relevant note once identified.

## Conclusion
QMD acts as a "second brain" connector, allowing the AI to recall information that it never personally experienced but which resides in the user's files. This significantly expands the "recall" horizon beyond the agent's own context window and `MEMORY.md`.
