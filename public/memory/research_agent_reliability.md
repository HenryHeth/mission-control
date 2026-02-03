# Research: AI Agent Rule-Following & Reliability

**Date:** 2026-02-03
**Context:** Investigating how Clawdbot/OpenClaw community and broader AI agent ecosystem solve the "groundhog day" problem — rules written in AGENTS.md/SOUL.md aren't consistently followed across sessions.

---

## The Core Problem

LLM agents are fundamentally **stateless**. Each session starts from zero. Rules written in config files (AGENTS.md, SOUL.md, CLAUDE.md) compete for limited "attention budget" with actual work context. As sessions grow longer, instruction-following degrades. When compaction or session resets occur, accumulated context is lost.

Key finding from HumanLayer research (analyzing 100k developer sessions): there's a **"dumb zone"** in the middle 40-60% of context windows where model recall degrades and reasoning falters. Past 40% capacity, diminishing returns kick in.

---

## 1. Prompt Engineering Techniques

### 1a. Less Is More (Instruction Budget)
**Source:** HumanLayer "Writing a good CLAUDE.md", research on instruction-following limits

- Frontier thinking LLMs can follow **~150-200 instructions** with reasonable consistency
- Smaller models exhibit **exponential decay** in instruction-following; larger frontier thinking models show **linear decay**
- Claude Code's system prompt already contains **~50 instructions** — that's 1/3 of budget before your rules even load
- As instruction count increases, following quality **decreases uniformly** across ALL instructions (not just new ones)
- **Recommendation:** AGENTS.md/SOUL.md should contain <50 universally-applicable instructions. Move everything else to separate files.

### 1b. Progressive Disclosure (Load Rules On-Demand)
**Source:** HumanLayer, Builder.io CLAUDE.md guide

Instead of cramming everything into AGENTS.md:
```
agent_docs/
  ├── building_rules.md
  ├── communication_style.md  
  ├── safety_protocols.md
  └── tool_usage.md
```
- Keep AGENTS.md lean with **pointers, not copies**
- Instruct agent to read relevant files before starting work
- Claude Code supports `@imports` syntax for this
- **OpenClaw equivalent:** Skills with SKILL.md files (already doing this partially)

### 1c. Emphasis for Critical Instructions
**Source:** Builder.io guide, community patterns

- Use **IMPORTANT:**, **NEVER:**, **ALWAYS:** prefixes for critical rules
- LLMs bias toward instructions at **peripheries** of the prompt (beginning and end)
- Place most-critical rules at the **very top** of AGENTS.md
- Consider XML tags or markdown headers to delineate sections clearly

### 1d. The "System Reminder" Problem
**Source:** HumanLayer reverse-engineering of Claude Code

Claude Code injects this around CLAUDE.md content:
```
<system-reminder>
IMPORTANT: this context may or may not be relevant to your tasks.
You should not respond to this context unless it is highly relevant to your task.
</system-reminder>
```
This means Claude will **actively ignore** CLAUDE.md content it deems irrelevant. The more non-universally-applicable instructions you have, the more likely ALL instructions get ignored. **Keep it focused.**

---

## 2. Memory Reinforcement Patterns

### 2a. Two-Layer Memory Architecture
**Source:** OpenClaw official design, community consensus

OpenClaw's built-in approach:
- **Daily logs** (`memory/YYYY-MM-DD.md`): append-only, read today + yesterday at session start
- **Curated long-term** (`MEMORY.md`): distilled insights, preferences, lessons learned
- Agent explicitly told: "Mental notes don't survive. Write to file."

### 2b. Pre-Compaction Memory Flush
**Source:** OpenClaw docs, GitHub issue #5429 (45-hour context loss incident)

Official mechanism:
```json
{
  "compaction": {
    "memoryFlush": {
      "enabled": true,
      "softThresholdTokens": 4000,
      "systemPrompt": "Session nearing compaction. Store durable memories now.",
      "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY."
    }
  }
}
```
**Critical issue:** This is **not enabled by default** and **still relies on agent compliance**. The agent can ignore the flush prompt.

### 2c. Real-Time Logging Rule (Community Workaround)
**Source:** OpenClaw issue #5429

After losing 45 hours of context, user implemented:
> "After completing ANY significant work item, immediately append it to memory/YYYY-MM-DD.md. Do not batch. Do not wait until end of session."

Added as a **non-negotiable rule** in AGENTS.md. Key insight: **don't trust the agent to batch-save later** — compaction can happen at any time.

### 2d. The Session Protocol (TODO.md Pattern)
**Source:** dev.to "The Session Protocol"

Structured handoff file designed for AI consumption:
1. **Quick Context** — 30-second bootstrap (project, tech, lifecycle stage)
2. **Completion Log** — dated breadcrumbs (gives temporal awareness)
3. **Current Milestone** — focus laser with explicit "Deferred (Not This Slice)" section
4. **Backlog** — de-emphasized at bottom, under "Not Prioritised" header
5. **Handover Prompt** — copy-paste continuation prompt for new sessions

Key insight: **The "Deferred" section eliminates distraction**. By explicitly listing what NOT to do, the agent stops suggesting backlog items.

### 2e. Vector Memory Search
**Source:** OpenClaw docs

OpenClaw now supports semantic search over memory files:
- Hybrid BM25 + vector search (good for both natural language and exact tokens)
- Auto-indexes MEMORY.md and memory/*.md files
- `memory_search` and `memory_get` tools for the agent
- Helps with the "I know I wrote this somewhere" problem

---

## 3. Checklist Systems

### 3a. HEARTBEAT.md as Periodic Self-Check
**Source:** OpenClaw official design

Default heartbeat runs every 30 minutes:
```
Read HEARTBEAT.md if it exists. Follow it strictly.
Do not infer or repeat old tasks from prior chats.
If nothing needs attention, reply HEARTBEAT_OK.
```

**Community pattern:** Use HEARTBEAT.md as a compliance checklist:
```markdown
# Heartbeat Checklist
- Memory health: does today's memory file exist and have >100 bytes?
- Check email for urgent messages
- Review calendar for events in next 2 hours
- If idle >8 hours, send check-in
```

### 3b. Session-Start Boot Sequence
**Source:** OpenClaw AGENTS.md template

The "Every Session" block acts as a mandatory checklist:
```
Before doing anything else:
1. Read SOUL.md — this is who you are
2. Read USER.md — this is who you're helping  
3. Read memory/YYYY-MM-DD.md (today + yesterday)
4. If in MAIN SESSION: Also read MEMORY.md
Don't ask permission. Just do it.
```

**Problem:** This relies on the agent actually executing these steps. No enforcement mechanism. The agent might skip steps when context is already large.

### 3c. Memory Health Checks During Heartbeats
**Source:** OpenClaw issue #5429 workaround

Add to HEARTBEAT.md:
```markdown
## Memory Health Check (EVERY heartbeat - do this first!)
1. Check if memory/YYYY-MM-DD.md exists for today
2. If missing or <100 bytes and there's been session activity → Alert user
```

A `memory-log` shell script provides:
- `memory-log "entry text"` — append timestamped entry
- `memory-log --check` — returns exit code 1 if file missing/sparse
- `memory-log -s "Section" "entry"` — append under section header

---

## 4. Automated Compliance Checks

### 4a. Context Usage Visibility
**Source:** OpenClaw issue #2597

**Problem:** Agent has no idea how full the context window is. Compaction blindsides it.

**Proposed solution:** Add `context=X%` to the Runtime line:
```
Runtime: agent=main | model=claude-opus-4-5 | context=45% | thinking=high
```
This gives agents passive awareness on every turn to proactively save state.

**Our existing rule (AGENTS.md):**
```
- At 50%: Alert. Flush notes to memory/YYYY-MM-DD.md
- At 70%: Strongly recommend /compact
- At 80%: URGENT. Write everything to disk NOW.
```

### 4b. Deterministic Validation (Don't Send LLM to Do a Linter's Job)
**Source:** HumanLayer, 12-Factor Agents

Key principle: **Use deterministic tools for deterministic checks.**
- Don't ask the LLM to verify its own compliance — use scripts
- Claude Code "stop hooks" can run formatters/linters after agent acts
- **For OpenClaw:** Could build a post-action hook that checks if memory was updated

### 4c. Policy-as-Prompt (Runtime Guardrails)
**Source:** "AI Agent Code of Conduct" research paper (arxiv 2509.23994)

Framework for automated compliance:
1. Ingest policy documents → build **policy tree** with categories (valid input, invalid input, valid output, invalid output)
2. Compile policy tree into **prompt-based classifiers**
3. Classifiers audit agent behavior at **runtime** on inputs AND outputs
4. Apply **least-privilege principle** — agent can only do what's explicitly allowed

### 4d. AgentSpec (Runtime Enforcement)
**Source:** ICSE 2026 paper

Customizable runtime enforcement for LLM agents:
- Encodes safety policies as formal specifications
- Monitors agent actions against specs in real-time
- Can halt/redirect agent behavior when violations detected
- More generalizable than hand-coded guardrails

---

## 5. Self-Auditing Patterns

### 5a. The 12-Factor Agents Framework
**Source:** HumanLayer (github.com/humanlayer/12-factor-agents)

Most relevant factors for our problem:

| Factor | Principle | Application |
|--------|-----------|-------------|
| Factor 3 | **Own your context window** | Curate what enters attention. Context is scarce. |
| Factor 5 | **Compact errors** | Distill failures into concise context, not verbose logs |
| Factor 8 | **Launch/pause/resume** | Suspension points for human intervention |
| Factor 10 | **Small, focused agents** | Narrow responsibilities over monolithic systems |
| Factor 13 | **Pre-fetch context** | Retrieve info upfront, not mid-execution |

**Key insight:** "Most successful AI products aren't purely agentic loops. They combine deterministic code with strategically placed LLM decision points."

### 5b. Periodic Memory Maintenance
**Source:** OpenClaw AGENTS.md template

Built into the template:
```
Periodically (every few days), use a heartbeat to:
1. Read through recent memory/YYYY-MM-DD.md files
2. Identify significant events, lessons, or insights
3. Update MEMORY.md with distilled learnings
4. Remove outdated info from MEMORY.md
```
Think journal review → update mental model.

### 5c. Context Rot Awareness
**Source:** Chroma research, Anthropic engineering blog

- **Context rot:** As tokens increase, recall accuracy decreases across ALL models
- Performance gradient, not cliff — but degradation is real
- Models have an "attention budget" — every token depletes it
- **Solution:** "Finding the smallest possible set of high-signal tokens that maximize the likelihood of desired outcome" (Anthropic)

### 5d. "Just-in-Time" Context Loading
**Source:** Anthropic "Effective Context Engineering"

Instead of pre-loading everything:
- Maintain lightweight identifiers (file paths, queries, links)
- Dynamically load data into context at runtime using tools
- Mirrors human cognition — we don't memorize corpuses, we use indexing systems
- Claude Code uses this: writes targeted queries, uses `head`/`tail` to analyze large data without loading it all

---

## 6. OpenClaw-Specific Community Patterns

### 6a. The Compaction Data Loss Problem
**Multiple GitHub issues:** #5429, #2597, #2624, #1594

Community repeatedly reports:
- Silent compaction erasing accumulated context
- No warning before compaction
- Agent "forgetting" even recent conversations
- Token burn from large tool outputs (especially config dumps)

**Community solutions:**
- Enable memoryFlush (not default)
- Add "REAL-TIME LOGGING RULE" to AGENTS.md
- Create memory-log skill for frictionless logging
- Add memory health check to HEARTBEAT.md
- Request context=X% in Runtime line

### 6b. SOUL.md for Identity Persistence
**Source:** Community templates, Medium articles

SOUL.md defines WHO the agent is — separate from operational rules (AGENTS.md):
- Personality traits
- Communication style  
- Values and priorities
- Relationship to user
- Read at session start → identity persists

**The 103k+ star trajectory shows identity persistence resonates** with users more than pure task management.

### 6c. Heartbeat-Driven State Management
**Source:** DataCamp tutorial, OpenClaw docs

Pattern: Use heartbeats not just for proactive messaging, but for **state management**:
- Verify memory files are current
- Check if current task state is saved
- Audit whether rules are being followed
- Update HEARTBEAT.md itself when checklist becomes stale

---

## 7. Actionable Recommendations for Our Setup

Based on this research, here are concrete improvements ranked by impact:

### High Impact (Implement Now)

1. **Trim AGENTS.md** — We're likely over the ~50 instruction budget. Audit and move non-universal rules to linked files.

2. **Enable memoryFlush** — Set `compaction.memoryFlush.enabled: true` in config. This is the #1 data loss prevention mechanism.

3. **Add context=% monitoring** — Our AGENTS.md already has the 50/70/80% rules but agent needs visibility. Check if OpenClaw now supports the Runtime context display from issue #2597.

4. **Create a compliance self-check script** — A shell script that heartbeat can call to verify:
   - Today's memory file exists and has >100 bytes
   - MEMORY.md was updated in last 7 days  
   - Last heartbeat-state.json check timestamps aren't stale

### Medium Impact (Implement This Week)

5. **Add explicit "Deferred/NOT NOW" section** to active task tracking — Prevents agent from wandering to backlog items.

6. **Implement handover prompt pattern** — A copy-paste prompt at bottom of TODO or task file for seamless session restart.

7. **Progressive disclosure** — Move tool-specific rules from AGENTS.md into their respective SKILL.md files. Only load when relevant.

8. **Strengthen session-start boot sequence** — Consider a verification step: "After reading boot files, list the 3 most important rules you'll follow this session."

### Lower Impact (Future Consideration)

9. **Build a pre-action hook** — Script that runs before the agent sends external messages, checking compliance with communication rules.

10. **Investigate MCP memory tools** — claude-code-memory and similar projects for cross-session persistence.

11. **Consider separate "compliance agent"** — A lightweight subagent that periodically audits main agent's behavior against rules.

---

## Key Sources

- [HumanLayer: Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [12-Factor Agents](https://github.com/humanlayer/12-factor-agents) 
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Builder.io: Complete Guide to CLAUDE.md](https://www.builder.io/blog/claude-md-guide)
- [OpenClaw Memory Docs](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw Issue #5429: 45-hour context loss](https://github.com/openclaw/openclaw/issues/5429)
- [OpenClaw Issue #2597: Context visibility](https://github.com/openclaw/openclaw/issues/2597)
- [The Session Protocol (dev.to)](https://dev.to/eddieajau/the-session-protocol-how-i-fixed-ai-memory-loss-with-a-todomd-2b4g)
- [Context Rot research (Chroma)](https://research.trychroma.com/context-rot)
- [PromptEngineering.org: 2026 Agentic Workflows Playbook](https://promptengineering.org/agents-at-work-the-2026-playbook-for-building-reliable-agentic-workflows/)
- [Policy-as-Prompt (arxiv 2509.23994)](https://arxiv.org/html/2509.23994v1)
