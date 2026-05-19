# SE Agent Index

A structured dataset and toolchain for analyzing **Software Engineering practices** of AI coding agents. Each agent is researched using open-coding methodology and stored as a validated JSON index — covering testing, CI/CD, code review, bug solving, methodology, team communication, documentation, and LLM integration.

---

## Dataset

| # | Agent | Status | Review Score |
|---|-------|--------|-------------|
| 1 | Glean Agents | completed | GOOD |
| 2 | IBM watsonx Orchestrate | completed | GOOD |
| 3 | HubSpot Breeze Studio | completed | GOOD |
| 4 | Google Gemini CLI | completed | NEEDS_IMPROVEMENT |
| 5 | Google Gemini | completed | GOOD |
| 6 | Google Gemini Enterprise | completed | NEEDS_IMPROVEMENT |
| 7 | Kimi Ok Computer | completed | NEEDS_IMPROVEMENT |
| 8 | Browser Use | completed | GOOD |
| 9 | Opera Neon | completed | GOOD |
| 10 | Alibaba Mobile Agent | completed | GOOD |
| 11 | Perplexity Comet | completed | EXCELLENT |
| 12 | Anthropic Claude Code | completed | GOOD |
| 13 | Amazon Q Developer | completed | NEEDS_IMPROVEMENT |

---

## Quick Start — 3 Commands

### Prerequisites

```bash
# 1. Copy .env and paste your Anthropic API key
cp .env.example .env
# Edit .env → ANTHROPIC_API_KEY=sk-ant-...

# 2. Install Python dependencies (for review command)
python3 -m venv venv && source venv/bin/activate
pip install anthropic

# 3. Ensure Claude Code CLI is installed
# https://claude.ai/download
```

### The 3 commands

```bash
# Index — register + research a new agent (Claude Code browses the web autonomously)
./se_index.sh index "Agent Name"

# Review — LLM quality check on the SE index JSON
./se_index.sh review "Agent Name"
./se_index.sh review --all

# Sources — download all reference URLs locally for offline verification
./se_index.sh sources "Agent Name"
./se_index.sh sources --all
```

---

## Project Structure

```
SE Indexing Tool/
├── se_index.sh                     Main CLI (index / review / sources)
├── prompts/
│   ├── prompts/research_prompt.md          Research methodology & JSON schema spec
│   └── quality_checklist_template.md   Manual review checklist template
├── agents_config.json              Agent registry (id, name, status, reviewed)
├── quality_review_agent.py         LLM-as-judge quality review script
│
├── Indexing/
│   ├── pull_sources.py             Downloads references into web_sources/
│   ├── GleanAgents_se_index.json
│   ├── watsonx_orchestrate_se_index.json
│   ├── hubspot_breeze_se_index.json
│   ├── gemini_cli_se_index.json
│   ├── gemini_se_index.json
│   ├── gemini_enterprise_se_index.json
│   ├── kimi_okcomputer_se_index.json
│   ├── browser_use_se_index.json
│   ├── opera_neon_se_index.json
│   ├── alibaba_mobile_agent_se_index.json
│   ├── perplexity_comet_se_index.json
│   ├── claude_code_se_index.json
│   └── AmazonQseindex.json
│
├── quality_checklist/
│   ├── glean_agents_review.md
│   └── ...                         (one .md per agent)
│
├── web_sources/                    Downloaded reference files (gitignored)
│   ├── Glean_Agents/
│   │   ├── [1].html
│   │   ├── [9].md
│   │   └── ...
│   └── ...
│
├── "SE AI Agent Index.xlsx"        Analysis spreadsheet
└── venv/                           Python virtual environment
```

---

## Command Reference

### `./se_index.sh index "Agent Name"`

Registers the agent in `agents_config.json`, then **runs Claude Code autonomously** to research and produce the SE index JSON. Claude uses WebSearch and WebFetch to browse the web following the methodology in `prompts/research_prompt.md`.

```bash
./se_index.sh index "OpenAI Codex"
```

**What happens:**
1. Agent is registered in `agents_config.json` (`indexing_status: pending`)
2. `prompts/research_prompt.md` is substituted with the agent name and piped to `claude -p`
3. Claude browses GitHub, blogs, docs, and papers (3–10 min)
4. The JSON response is extracted and saved to `Indexing/openai_codex_se_index.json`
5. `indexing_status` is updated to `completed` (or `failed` on error)

**Requires:** `ANTHROPIC_API_KEY` in `.env` and `claude` CLI installed.

---

### `./se_index.sh review "Agent Name"`

Runs `quality_review_agent.py` against the agent's SE index JSON. Performs programmatic checks and an LLM-as-judge assessment, then writes a markdown report to `quality_checklist/`.

```bash
./se_index.sh review "Glean Agents"
./se_index.sh review --all
```

**What it checks:**

| Category | Checks |
|---|---|
| Completeness | Description, Repository_Statistics (5 fields), all 8 SE areas, 4 subsections each, ≥10 bug issues, 15–20 references |
| Citation mapping | Every `[N]` in evidence maps to a References entry |
| Date format | All `Date_Pulled` in `YYYY-MM-DD` |
| Evidence quality | No URL-as-quote, no filename-as-quote, no quotes < 5 words or > 50 words |
| LLM-as-judge | Content focus, verbatim fidelity, anti-hallucination, evidence↔summary alignment, Not Available usage |

**Output scores:** `EXCELLENT` / `GOOD` / `NEEDS_IMPROVEMENT` / `POOR`

Reports saved to: `quality_checklist/<agent_slug>_review.md`

After a successful review, the agent's `reviewed` flag is set to `true` in `agents_config.json`.

---

### `./se_index.sh sources "Agent Name"`

Runs `Indexing/pull_sources.py` to download every URL in the agent's `References` section into `web_sources/{agent_name}/`.

```bash
./se_index.sh sources "Glean Agents"
./se_index.sh sources --all
```

**Download rules:**

| URL type | Output |
|---|---|
| GitHub repo root (e.g. `github.com/owner/repo`) | Downloads `README.md` as `[N].md` |
| GitHub blob `.md` / `.yml` / `.yaml` / `.json` | Downloads raw file with matching extension |
| Any other URL | Downloads page HTML as `[N].html` |

Files are named by reference number: `[1].html`, `[9].md`, `[19].yml`, etc.

The `web_sources/` folder is gitignored — it is a local cache only.

---

## Full Workflow: Adding a New Agent

### Prerequisites

- Python 3.9+ with `anthropic` package (`pip install anthropic`)
- `ANTHROPIC_API_KEY` set in `.env`
- `claude` CLI installed ([claude.ai/download](https://claude.ai/download))

### Step 1 — Index (register + research)

```bash
./se_index.sh index "New Agent Name"
```

This single command:
1. Adds the agent to `agents_config.json` (`indexing_status: pending`)
2. Substitutes `"New Agent Name"` into `prompts/research_prompt.md`
3. Runs `claude -p < prompts/research_prompt.md` non-interactively
4. Claude browses GitHub repos, engineering blogs, documentation, and issue trackers
5. Saves the JSON output to `Indexing/new_agent_name_se_index.json`
6. Sets `indexing_status: completed` on success

The research prompt guides Claude through:
- Step 0: Agent description (category, company, deployment surface)
- Step 1: Repository discovery & statistics (stars, contributors, LOC, language, update frequency)
- Step 2: Official documentation & engineering blog analysis
- Step 3: GitHub issues analysis (10–15 issues revealing engineering patterns)
- Steps 4–8: The 8 SE practice areas (see below)
- References: 15–20 sources (GitHub + external blogs, papers, talks)

**Takes 3–10 minutes per agent.**

### Step 2 — Quality review

```bash
./se_index.sh review "New Agent Name"
```

Open `quality_checklist/new_agent_name_review.md` and address any `⚠️` or `❌` items. If issues require re-research, re-run `index`.

### Step 3 — Download reference sources

```bash
./se_index.sh sources "New Agent Name"
```

Reference files are saved to `web_sources/New_Agent_Name/` for offline verification and manual spot-checking of quotes.

---

## SE Index JSON Schema

Each agent index is stored as a JSON file in `Indexing/`. The canonical schema:

```jsonc
{
  "Agent_Name": "Glean Agents",
  "Description": [
    {
      "Summary": "One-paragraph description of what the agent does, its category, company, and deployment surface.",
      "Evidence": [{ "Quote": "...", "Citation": "[1]" }]
    }
  ],
  "Repository_Statistics": {
    "Repository_URL":    { "value": "https://github.com/...", "citation": "[1]" },
    "Lines_of_Code":     { "value": "~50,000", "citation": "[2]" },
    "Stars":             { "value": "1,234", "citation": "[1]" },
    "Contributors":      { "value": "45", "citation": "[1]" },
    "Update_Frequency":  { "value": "2–3 releases/month", "citation": "[3]" },
    "Primary_Language":  { "value": "TypeScript", "citation": "[1]" }
  },
  "SE_Practices": {
    "Testing_and_Reliability": {
      "Practices":    [{ "name": "...", "summary": "...", "Evidence": [{ "Quote": "...", "Citation": "[4]" }] }],
      "Tools":        [...],
      "Stakeholders": [...],
      "Others":       [...]
    },
    "Integration_and_Infrastructure_CICD":  { ... },
    "Code_Review_Process":                  { ... },
    "Bug_Solving_Approaches":               { ... },
    "Software_Engineering_Methodology":     { ... },
    "Team_Communication":                   { ... },
    "Holistic_Documentation":               { ... },
    "LLM_Integration_and_Prompt_Management": { ... }
  },
  "References": {
    "[1]":  { "Website_Type": "GitHub Repository", "Link": "https://...", "Date_Created": "2023-01-01", "Date_Pulled": "2026-05-18" },
    "[2]":  { ... }
  }
}
```

### 8 SE Practice Areas

| Area | What to capture |
|---|---|
| **Testing_and_Reliability** | Unit/integration/E2E frameworks, CI test gates, coverage targets, reliability SLOs |
| **Integration_and_Infrastructure_CICD** | CI/CD pipelines, deployment tools, release cadence, infrastructure-as-code |
| **Code_Review_Process** | PR review policies, required reviewers, automated checks, review tooling |
| **Bug_Solving_Approaches** | Issue triage, debugging workflow, postmortems, bug tracking tools |
| **Software_Engineering_Methodology** | Agile/scrum practices, sprint structure, planning tools, versioning strategy |
| **Team_Communication** | Internal comms tools, async vs sync patterns, standup rituals, onboarding |
| **Holistic_Documentation** | Code docs, architecture docs, API references, changelogs, contributor guides |
| **LLM_Integration_and_Prompt_Management** | How LLMs are integrated, prompt versioning, model switching, evaluation |

Each area has four subsections: **Practices**, **Tools**, **Stakeholders**, **Others**.

### Evidence Format Rules

- Every claim must have a verbatim `Quote` + `Citation` number
- Quotes must be ≥ 5 words and ≤ 50 words (use `...` for longer excerpts)
- Quotes must be actual text from the source — not URLs, filenames, or UI labels
- If information is genuinely unavailable, use `"Not Available"` as the value with `[]` for evidence

---

## agents_config.json

Tracks the status of every agent in the dataset:

```json
[
  {
    "id": 1,
    "agent_name": "Glean Agents",
    "indexing_status": "completed",
    "reviewed": true
  }
]
```

| Field | Values |
|---|---|
| `indexing_status` | `pending` · `in-progress` · `completed` · `failed` |
| `reviewed` | `false` · `true` (set automatically after `review` completes) |

---

## Quality Review Scores

| Score | Meaning |
|---|---|
| **EXCELLENT** | No issues found; all checks pass; evidence is tight and on-target |
| **GOOD** | Minor warnings only; overall solid research |
| **NEEDS_IMPROVEMENT** | One or more significant issues (missing areas, bad evidence, low ref count) |
| **POOR** | Multiple failures; index should be re-researched |

Review reports are in `quality_checklist/`. Each report shows:
- Pass / Warning / Fail counts for all programmatic checks
- LLM-as-judge assessment across 5 dimensions
- A list of specific issues to address

---

## Environment Setup

```bash
# 1. Navigate to project
cd "SE Indexing Tool"

# 2. Copy .env template and add your API key
cp .env.example .env
# Edit .env:
#   ANTHROPIC_API_KEY=sk-ant-your-key-here
#   (used by both 'index' and 'review' commands)

# 3. Create Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install anthropic

# 4. Install Claude Code CLI (if not already installed)
# https://claude.ai/download

# 5. Verify
./se_index.sh help
```

### .env file

```bash
# .env (gitignored — never commit this file)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

The script reads `ANTHROPIC_API_KEY` from `.env` automatically. You do not need to `export` it manually.

---

## Research Standards

These rules apply to all SE index JSON files:

1. **Verbatim quotes only** — copy-paste from source; never paraphrase
2. **SE practices, not product features** — document how the *team* builds the agent, not what the agent does for users
3. **Evidence required** — every claim needs a quote + citation
4. **No hallucination** — if a fact cannot be found with evidence, mark it `Not Available`
5. **Correct source** — verify the GitHub repository matches the target agent before extracting statistics
6. **15–20 references** — diverse sources: repo + blogs + docs + papers + forums
7. **Date tracking** — all references must have `Date_Pulled` in `YYYY-MM-DD` format

---

## License

Research use only. SE index data is derived from publicly available sources. See individual AI agent repositories and websites for their respective licenses.
