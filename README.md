# SE AI Agent Index

A research dataset and toolchain for analyzing **Software Engineering (SE) practices** of AI coding agents, built using open-coding methodology. 13 agents indexed across 7 SE areas: SE Methodology, Code Review, Testing, CI/CD,, Issue Reolution, Communication, Documentation.

## Dataset

Primary dataset: [`dataset/Index.xlsx`](dataset/Index.xlsx) — manually curated and human-verified.

Raw JSON indexes live in `Indexing/` (one per agent, with embedded q-ids).

## Example Used In the Paper

| Agent Name              | Example In the Paper                                                                                                                                                                                                                                                                                  | Reference                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HubSpot Breeze Studio   | HubSpot's Breeze Studio developers adopted the Testing Trophy strategy                                                                                                                                                                                                                                | [kentcdodds.com/blog/the-testing-trophy-and-testing-classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)                                   |
| IBM WatsonX Orchestrate | Developers use OpenTelemetry to trace and analyze agent trajectories to monitor and correct hallucinations and token usage                                                                                                                                                                            | [community.ibm.com/.../debug-with-confidence](https://community.ibm.com/community/user/blogs/bruno-fernandes-dos-santos/2026/04/13/debug-with-confidence-the-new-debug-experience) |
| Browser Use             | Describes two sandboxing strategies for code-executing agents: (1) only risky operations isolated in a sandbox while the agent runs on the backend, or (2) the entire agent runs in a sandbox with a proxy service holding all API keys; migrated from (1) to (2) for better scalability and security | [browser-use.com/posts/two-ways-to-sandbox-agents](https://browser-use.com/posts/two-ways-to-sandbox-agents)                                                                       |
| IBM WatsonX Orchestrate | The Agent Development Kit (ADK) ships with a built-in red-teaming command that simulates 15+ attack types, including prompt injection and instruction override                                                                                                                                        | [developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability](https://developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability)                                         |
| HubSpot Breeze Studio   | Rewrote its old code-review system (Sidekick) on Aviator, a Java-based agent framework for code review; the migration reduced time-to-feedback by 90%                                                                                                                                                 | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                               |
| Browser Use             | Uses Gemini 2.5 Flash as an LLM-as-judge for code reviews, supplementing traditional test suites                                                                                                                                                                                                      | [browser-use.com/posts/our-browser-agent-evaluation-system](https://browser-use.com/posts/our-browser-agent-evaluation-system)                                                     |
| HubSpot Breeze Studio   | Uses LLM-as-judge to evaluate code-review comments produced by the Aviator pipeline                                                                                                                                                                                                                   | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                               |
| HubSpot Breeze Studio   | AI-assisted code review pipeline (Aviator with a Judge Agent) yielded a 90% reduction in time-to-feedback across 50,000+ pull requests; CI/CD restructuring cut build times from 10–15 minutes to 2–3 minutes using caching and a Kubernetes-backed in-house setup                                  | [product.hubspot.com/blog/cloud-coding-agents-at-hubspot](https://product.hubspot.com/blog/cloud-coding-agents-at-hubspot)                                                         |
| Glean Agents            | Agents are evaluated against curated evalsets of real-world examples graded on binary sub-metrics (completeness, tone, groundedness); dedicated PR Review agents scan code changes, flag risk areas, and produce prioritized checklists to keep review quality consistent at scale                    | [glean.com/agent-library/pull-request-review](https://www.glean.com/agent-library/pull-request-review)                                                                             |
| Anthropic Claude Code   | The team iterates through functional prototypes daily using parallel agents rather than traditional PRDs, shipping up to 100 internal releases per day                                                                                                                                                | [anthropic.com/engineering/april-23-postmortem](https://www.anthropic.com/engineering/april-23-postmortem)                                                                         |

---

## Tool Structure

```
SE Indexing Tool/
├── index_prompt.md          Research methodology & JSON schema
├── dataset/                 Master dataset (Index.xlsx, Index.pdf)
├── Indexing/                Raw SE index JSON files (one per agent)
│   └── pull_sources.py      Downloads reference URLs into web_sources/
└── Tool/
    ├── se_index.sh          Main CLI
    ├── se_index_core.py     Shared q-id logic
    ├── agents_config.json   Agent registry (id, name, status, reviewed)
    ├── build_query_index.py Builds query_index.json from curated Excel
    ├── query_index.json     Generated: (agent, q-id) → summary + evidence
    └── query_runner.py      Query backend (called by se_index.sh)
```

---

## Setup

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY=sk-ant-...
python3 -m venv venv && source venv/bin/activate
pip install anthropic openpyxl
# install Claude Code CLI: https://claude.ai/download
```

---

## Commands

```bash
# Index a new agent (research + auto-download sources, 3–10 min)
./Tool/se_index.sh index "Agent Name"

# Re-download reference sources
./Tool/se_index.sh sources "Agent Name"
./Tool/se_index.sh sources --all

# Query the index
./Tool/se_index.sh query "Agent Name" "q-5"
./Tool/se_index.sh list-queries "Agent Name"
./Tool/se_index.sh agents

# Rebuild query_index.json from the curated Excel
python3 Tool/build_query_index.py
```

---

## Workflow: Adding a New Agent

1. **Index** — `./Tool/se_index.sh index "New Agent"` researches the agent and writes `Indexing/new_agent_se_index.json` with embedded q-ids, then downloads all reference sources to `web_sources/New_Agent/`.
2. **Curate** — Manually transfer data into `dataset/Index.xlsx`, verifying each claim against downloaded sources in `web_sources/`.
3. **Build index** — `python3 Tool/build_query_index.py` rebuilds `Tool/query_index.json`.
4. **Verify** — `./Tool/se_index.sh query "New Agent" "q-1"`.

---

## JSON Schema

Each file in `Indexing/` follows this structure:

```jsonc
{
  "Agent_Name": "...",
  "Description": [{ "q_id": "q_1", "Summary": "...", "evidence": [{ "quote": "...", "citation": "[1]" }] }],
  "Repository_Statistics": { "Stars": [...], "Contributors": [...], "Lines_of_Code": [...], "Update_Frequency": [...], "Primary_Language": [...] },
  "SE_Practices": {
    "Testing_and_Reliability":               { "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "Integration_and_Infrastructure_CICD":   { ... },
    "Code_Review_Process":                   { ... },
    "Bug_Solving_Approaches":                { "Issues": [...], "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "Software_Engineering_Methodology":      { ... },
    "Team_Communication":                    { ... },
    "Holistic_Documentation":                { ... },
    "LLM_Integration_and_Prompt_Management": { ... }
  },
  "References": { "[1]": { "Website_Type": "...", "Link": "...", "Date_Created": "...", "Date_Pulled": "YYYY-MM-DD" } }
}
```

**Evidence rules:** verbatim quotes only (5–50 words), every claim cited, document SE *practices* not product features, use `"Not Available"` with empty evidence when a field cannot be sourced. Every summary object must have a `q_id` as its first field.

---

## License

Research use only. Data derived from publicly available sources.
