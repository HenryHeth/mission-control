# Research Notes: Anthropic Authentication Fix (2026-01-31)

## status
- **Current State:** Direct Anthropic models (`direct-sonnet`, `claude-opus`) are "not allowed".
- **Authentication:** OAuth Token `sk-ant-oat01...` is successfully loaded into env var `CLAUDE_CODE_OAUTH_TOKEN`.
- **Gateway:** `anthropic` provider reports "Healthy" and lists the token profile.

## Failures & Findings

### 1. The Environment Variable Mismatch
- **Issue:** We originally used `ANTHROPIC_MAX_TOKEN`.
- **Fix:** Switched to `CLAUDE_CODE_OAUTH_TOKEN` per Claude Code CLI instructions.
- **Result:** Provider now sees the token (status: ok).

### 2. The "Invalid Config" Error
- **Attempt:** Tried to link models to the token profile by adding `authProfileId` to `agents.defaults.models` via `config.patch` and `config.apply`.
- **Failure:** returned "invalid config".
- **Cause:** Recent Clawdbot versions (Jan 2026) strictly enforce config schema. `agents.defaults.models` does **not** accept `authProfileId` as a property. It only accepts `alias`.
- **Implication:** We cannot link auth profiles to models in this specific config section.

### 3. The "Model Not Allowed" Error
- **Status:** Despite `models status` showing models in the `allowed` list, `session_status { model: ... }` fails.
- **Theory:** This might be a "Safeguard" compaction policy blocking the switch, or (more likely) the internal provider initialization failing silently and returning a generic "not allowed" when it can't match the specific model ID to the credentials.

## Next Steps (For Tomorrow)
1.  **Stop patching `agents.defaults.models`.** It violates schema.
2.  **Investigate `auth.bindings` or `provider` specific config.** There must be a different place to map `model ID -> auth profile`.
3.  **Test simpler CLI invocation.** Try `clawdbot exec --model ...` to see if it works outside of the session context.
