# Sightglass v2 — Claude Code Hook Spec

## What This Is

A Claude Code `PreToolUse` hook that intercepts dependency install decisions, evaluates them using a grounded LLM call, and injects better alternatives + documentation links back into the agent's context. The agent goes from unconscious recall to informed buyer.

## The Problem

AI coding agents choose dependencies based on training data popularity, not fitness for purpose. 73% of choices are pure recall — no alternatives considered. Sightglass v2 fixes this by injecting a deliberation step at the moment of decision.

## Architecture

```
Developer using Claude Code
  │
  ▼
Agent decides: `npm install moment`
  │
  ▼
PreToolUse hook fires (matcher: "Bash")
  │
  ▼
Sightglass intercepts, detects `npm install <package>`
  │
  ▼
Grounded LLM call (web search enabled):
  "Evaluate <package> for: maintenance status, known CVEs,
   bundle size, deprecation status. Suggest up to 3 current
   alternatives with documentation links. Be concise."
  │
  ▼
Hook returns exit code 2 (blocks the install) +
  injects evaluation context back into agent conversation
  │
  ▼
Agent reconsiders with real 2026 data, not 2023 recall
  │
  ▼
Decision + outcome logged to local Sightglass DB
```

## Implementation

### 1. Hook Registration

In `.claude/settings.json` (or `~/.claude/settings.json` for global):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/sightglass/hooks/pre-install-eval.js",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 2. Hook Script: `pre-install-eval.js`

**Input:** Receives JSON on stdin from Claude Code with this shape:

```json
{
  "session_id": "abc123",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm install moment",
    "description": "Install moment for date formatting"
  },
  "cwd": "/Users/dev/project"
}
```

**Logic:**

1. Parse stdin JSON
2. Extract the command from `tool_input.command`
3. Detect if it's a package install command. Match patterns:
   - `npm install <pkg>`, `npm i <pkg>`
   - `yarn add <pkg>`
   - `pnpm add <pkg>`
   - `pip install <pkg>`
   - `cargo add <pkg>`
   - Also catch multiple packages: `npm install express cors helmet`
4. If NOT a package install → exit 0 (allow, pass through)
5. If IS a package install → for each package:
   a. Make a grounded LLM call to evaluate the package (see Section 3)
   b. Collect results
6. Output JSON to stdout with the evaluation context
7. Exit code 2 (block the install, return context to agent)

**Output format** (JSON to stdout):

```json
{
  "decision": "block",
  "reason": "Sightglass evaluation available",
  "additionalContext": "## Sightglass Dependency Evaluation\n\nYou're about to install `moment`. Before proceeding, consider:\n\n**moment.js** — ⚠️ In maintenance mode since Sept 2020. The maintainers recommend alternatives for new projects.\n\n**Alternatives:**\n1. **date-fns** (6.2KB gzipped) — Modular, tree-shakeable. Docs: https://date-fns.org/docs/Getting-Started\n2. **Luxon** (21KB gzipped) — By a Moment maintainer, immutable by default. Docs: https://moment.github.io/luxon/#/\n3. **Temporal API** — Stage 3 TC39 proposal, native to JS. Docs: https://tc39.es/proposal-temporal/docs/\n\n**Recommendation:** Re-evaluate whether `moment` is the best choice for this project's needs. If you still want moment, re-run the install command and Sightglass will allow it on second attempt.\n\nPlease evaluate these alternatives and choose the best fit, or confirm you want to proceed with the original package."
}
```

### 3. Grounded LLM Evaluation Call

Use Anthropic API with web search tool enabled for real-time data:

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: `Evaluate the npm package "${packageName}" for use in a project.

Return a concise evaluation covering:
1. **Status**: Active, maintenance-only, or deprecated?
2. **Security**: Any known CVEs or security advisories?
3. **Size**: Bundle/install size
4. **Last publish date**
5. **Alternatives**: Up to 3 current, actively maintained alternatives with:
   - Name and brief description
   - Size comparison
   - Link to official documentation (not npm page — the actual docs)
6. **Recommendation**: Should a developer use this package today, or switch?

Be concise. No preamble. Format as structured text.`
    }]
  })
});
```

**Important:**
- API key should come from env var `SIGHTGLASS_API_KEY` or `ANTHROPIC_API_KEY`
- Timeout the LLM call at 15 seconds — if it fails, exit 0 (allow the install, don't block the developer)
- Cache results locally so the same package doesn't trigger a lookup twice in the same session

### 4. Second Attempt Bypass

If the agent (or developer) retries the same install after seeing the evaluation, allow it. Simple approach:

- Write each evaluated package to a local temp file: `/tmp/sightglass-allowed-<session_id>.json`
- On hook fire, check if the package is already in the allowed list
- If yes, exit 0 (allow)
- Clear the file on session end

### 5. Decision Logging

Log every intercept to a local JSONL file (`~/.sightglass/decisions.jsonl`):

```json
{
  "timestamp": "2026-02-27T22:30:00Z",
  "session_id": "abc123",
  "package_manager": "npm",
  "package": "moment",
  "version": "latest",
  "agent": "claude-code",
  "action": "blocked",
  "alternatives_suggested": ["date-fns", "luxon", "temporal-api"],
  "final_choice": null,
  "project_dir": "/Users/dev/project"
}
```

Update `final_choice` when the agent makes its follow-up decision (via PostToolUse hook on the subsequent install).

### 6. PostToolUse Logger (Companion Hook)

Register a second hook to capture what the agent actually installed after evaluation:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/sightglass/hooks/post-install-log.js"
          }
        ]
      }
    ]
  }
}
```

This captures the final decision — did the agent stick with the original package or switch? This data is the foundation of community intelligence.

## File Structure

```
sightglass/
├── package.json
├── bin/
│   └── sightglass-init.js          # npx sightglass init (registers hooks)
├── hooks/
│   ├── pre-install-eval.js          # Main PreToolUse hook
│   └── post-install-log.js          # PostToolUse decision logger
├── lib/
│   ├── detect-install.js            # Parse command → extract packages
│   ├── evaluate.js                  # Grounded LLM evaluation call
│   ├── cache.js                     # Local cache for evaluations
│   └── logger.js                    # JSONL decision logging
└── data/
    └── decisions.jsonl              # Local decision log
```

## CLI: `npx sightglass init`

Running `npx sightglass init` should:

1. Detect if Claude Code is installed (check for `~/.claude/`)
2. Add the hook entries to `~/.claude/settings.json` (global) or `.claude/settings.json` (project)
3. Prompt: "Install globally or for this project only?"
4. Check for `ANTHROPIC_API_KEY` or `SIGHTGLASS_API_KEY` in environment
5. If missing, prompt to enter one
6. Print: "Sightglass active. Your agent will now evaluate dependencies before installing."

## What NOT To Build (Yet)

- No web dashboard
- No community intelligence upload
- No vendor tier
- No team features
- No Codex/Cursor integration (Claude Code only for v2)
- No custom rules or policy engine
- No fancy UI — this is a CLI tool for developers

## Success Criteria

- Developer runs `npx sightglass init` and hooks are registered in < 30 seconds
- Agent attempts `npm install moment` → gets blocked with evaluation + alternatives + docs links
- Agent reconsiders and either switches or confirms original choice
- Decision is logged locally
- Total latency added: < 15 seconds (LLM eval call)
- If evaluation call fails for any reason, install proceeds normally (fail open)

## Extension Points (Future, Do Not Build Now)

- Support for Codex, Cursor, Windsurf hooks when available
- Community intelligence: anonymized decision data aggregation
- Vendor tier: surface vendor-sponsored alternatives at decision point
- Policy enforcement: team-level rules (e.g., "never install packages with known CVEs")
- pip, cargo, go module support with package-manager-specific evaluation prompts
