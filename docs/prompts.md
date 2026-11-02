# Prompt design

How LogLens asks the AI to analyze a log. The goal is a **predictable,
structured** answer the app can render and store — not free-form text.

## Strategy

1. **Parse first.** Only the relevant lines (errors, warnings, stack traces)
   are sent, not the whole file.
2. **Force JSON.** The model must reply with a single JSON object matching the
   schema below. With OpenAI we use JSON mode; with Ollama we use
   `format: "json"`.
3. **Validate.** The backend validates the JSON (with Zod) before saving. If it
   doesn't match, we retry once, then fail gracefully.

## System prompt

The source of truth is `server/src/ai/prompt.ts` (`SYSTEM_PROMPT`). In short:

- **Taxonomy:** five severity levels (`informational`, `low`, `medium`, `high`,
  `critical`) and a category label. Attacks and database/core-service failures
  are never below `high`; a successful or ongoing attack is `critical`.
- **Component inspection:** User-Agent (browser, legitimate bot, or scanner such
  as sqlmap or nmap), request payload (SQLi, XSS, path traversal, command
  injection), and the correlation of HTTP status and log level with severity.
- **Root cause:** describe what happened in the system, not what the model is
  missing. Generic answers ("does not match any known pattern") are forbidden.
- **Next steps:** concrete commands, configuration or code (WAF/firewall rules,
  Prepared Statements, JDBC pool checks).
- **Language:** human-readable text in Italian; technical terms, commands and
  log lines stay in their original form.
- **Output:** JSON object only, validated with Zod before it is saved.

## User prompt (template)

```text
Analyze the following log excerpt and return the JSON report.

LOG EXCERPT:
"""
{{relevantLines}}
"""
```

## Expected JSON schema

```jsonc
{
  "title": "string — short summary of the main problem",
  "severity": "informational | low | medium | high | critical",
  "category": "string — e.g. Database, Network, Runtime, Build, Config",
  "keyLines": ["string — the most important raw log lines"],
  "causes": ["string — probable root causes"],
  "debugSteps": ["string — concrete steps to investigate/fix"],
  "bugReportMarkdown": "string — a ready-to-paste GitHub Issue in Markdown",
}
```

## Example output

```json
{
  "title": "Unhandled TypeError: reading 'map' of undefined in report builder",
  "severity": "high",
  "category": "Runtime",
  "keyLines": [
    "TypeError: Cannot read properties of undefined (reading 'map')",
    "at buildReport (/app/server/src/services/report.ts:42:28)"
  ],
  "causes": [
    "A value expected to be an array is undefined when buildReport runs",
    "The upstream data (analysis.items) was never set or failed to load"
  ],
  "debugSteps": [
    "Add a guard / default ([]) before calling .map in report.ts:42",
    "Log the input to buildReport to confirm which field is undefined",
    "Check AnalysisService.create for the missing assignment"
  ],
  "bugReportMarkdown": "## Bug: Unhandled TypeError in report builder\n\n**Severity:** High\n\n**Category:** Runtime\n\n### What happens\nPOST /api/analyses returns 500 ...\n"
}
```

## Notes per provider

- **OpenAI** — `response_format: { type: "json_object" }`, model `gpt-4o-mini`
  is a good cheap default.
- **Ollama** — `format: "json"`, model `llama3.1`. Runs locally and free, ideal
  for trying the project without an API key.
