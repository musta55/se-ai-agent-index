# SE AI Agent Index

A dataset and retrieval tool for analyzing **Software Engineering (SE) practices** of AI agents, built using a semi-automated approach that combines LLM-assisted information extraction with qualitative analysis and manual validation.

---

## Dataset

### Final Index (XLSX)

- **Location:** [`data/dataset/Index.xlsx`](data/dataset/Index.xlsx) or [`data/dataset/Index.pdf`](data/dataset/Index.pdf)
- Manually curated and validated final index
- 13 agents × 7 SE dimensions in a structured table
- Each cell contains information items (summarized findings with source evidence)

### Final JSON

- **Location:** [`data/Indexing/`](data/Indexing/) — one JSON file per agent
- Machine-readable format with embedded `q_id` fields for direct lookup
- Contains raw summaries, verbatim evidence quotes, and source citations

---

### How to Use the Final Index

The Final Index is organized as a table with agent metadata followed by SE dimension columns:

- **Rows (13):** One row per indexed agent — name, description, and repository metadata
- **Columns:** Agent description, metadata, then 7 SE dimensions — SE Methodology, Code Review, Testing, CI/CD, Issue Resolution, Communication, and Documentation

13 agents indexed across 7 SE dimensions. Each dimension contains information about four sub-dimensions: **Practices**, **Tools**, **Stakeholders**, and **Others**.

---

### How to Use the Final JSON

Each file in [`data/Indexing/`](data/Indexing/) follows this structure. Every summary object has a `q_id` as its first field for direct lookup by dimension and sub-dimension:

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
    "Holistic_Documentation":                { ... }
  },
  "References": { "[1]": { "Website_Type": "...", "Link": "...", "Date_Created": "...", "Date_Pulled": "YYYY-MM-DD" } }
}
```

---

### Examples Used in the Paper

| Agent Name              | Example In the Paper                                                                                                                                                                                                                                                                                | Reference                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HubSpot Breeze Studio   | Adopts the [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) strategy, prioritizing integration tests as the best balance between confidence and maintenance cost                                                                                         | [kentcdodds.com/blog/the-testing-trophy-and-testing-classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)                                   |
| IBM WatsonX Orchestrate | Uses [OpenTelemetry](https://opentelemetry.io/) to trace agent trajectories and monitor hallucinations and token usage                                                                                                                                                                               | [community.ibm.com/.../debug-with-confidence](https://community.ibm.com/community/user/blogs/bruno-fernandes-dos-santos/2026/04/13/debug-with-confidence-the-new-debug-experience) |
| Browser Use             | Supports two sandboxing strategies: (1) only risky operations run in a sandbox while the agent runs on the backend, or (2) the entire agent runs in a sandbox with a proxy holding all API keys; migrated from (1) to (2) for scalability and security                                              | [browser-use.com/posts/two-ways-to-sandbox-agents](https://browser-use.com/posts/two-ways-to-sandbox-agents)                                                                       |
| IBM WatsonX Orchestrate | The [Agent Development Kit (ADK)](https://developer.watson-orchestrate.ibm.com/) ships with a built-in red-teaming command that simulates 15+ attack types, including prompt injection and instruction override                                                                                      | [developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability](https://developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability)                                         |
| HubSpot Breeze Studio   | Migrated its code-review system from [Sidekick](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) to [Aviator](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution), a Java-based agent framework; the migration reduced time-to-feedback by 90% | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                               |
| Browser Use             | Uses [Gemini 2.5 Flash](https://deepmind.google/models/gemini/) as an [LLM-as-judge](https://arxiv.org/abs/2306.05685) to evaluate whether web agents successfully completed browsing tasks, achieving 87% alignment with human labels                                                                | [browser-use.com/posts/our-browser-agent-evaluation-system](https://browser-use.com/posts/our-browser-agent-evaluation-system)                                                     |
| HubSpot Breeze Studio   | Uses [LLM-as-judge](https://arxiv.org/abs/2306.05685) to evaluate code-review comments produced by the [Aviator](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) pipeline                                                                                               | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                               |
| HubSpot Breeze Studio   | The [Aviator](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) pipeline reviewed 50,000+ pull requests; CI/CD restructuring cut build times from 10–15 minutes to 2–3 minutes using caching and a [Kubernetes](https://kubernetes.io/)-backed setup                    | [product.hubspot.com/blog/cloud-coding-agents-at-hubspot](https://product.hubspot.com/blog/cloud-coding-agents-at-hubspot)                                                         |
| Glean Agents            | Evaluates agents against curated datasets of real-world examples graded on binary sub-metrics: completeness, tone, and groundedness                                                                                                                                                                 | [glean.com/blog/enterprise-agent-evaluation-guide](https://www.glean.com/blog/enterprise-agent-evaluation-guide)                                                                   |
| Glean Agents            | PR Review agents scan code changes, flag risk areas, and produce prioritized checklists to keep review quality consistent at scale                                                                                                                                                                  | [glean.com/agent-library/pull-request-review](https://www.glean.com/agent-library/pull-request-review)                                                                             |
| Anthropic Claude Code   | Illustrates rapid development and deployment: the team builds functional prototypes daily using parallel agents and iterative feedback and refinement rather than relying on heavy and static mocks/Figma designs and Product Requirement Documents (PRDs)                                          | [newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny)                     |

---

### Indexed Agents

See [AGENTS.md](AGENTS.md) for the list of 13 indexed agents with descriptions.

---

## Retrieval Tool

A retrieval tool for querying the SE index by agent and `q_id`. Clone the repository and run the shell script to look up any agent's practices, tools, stakeholders, or evidence quotes directly from the JSON files.

```bash
git clone https://github.com/musta55/se-ai-agent-index.git
cd se-ai-agent-index
./se_index.sh query "Agent Name" "q-5"
```

### Tool Structure

```
se-ai-agent-index/
├── se_index.sh                  Main CLI (run from project root)
├── index_prompt.md              Research methodology & JSON schema
├── data/
│   ├── dataset/                 Master dataset (Index.xlsx, Index.pdf)
│   ├── Indexing/                Raw SE index JSON files (one per agent)
│   │   ├── <Agent_Name>_se_index.json   SE index output per agent
│   │   └── pull_sources.py              Downloads reference URLs into data/web_sources/
│   └── web_sources/             Cached reference files — auto-populated after index creation
│       └── <Agent_Name>/        One folder per agent ([N].html / [N].md / [N].yml)
└── tool/
    ├── se_index_core.py         Shared q-id logic
    ├── agents_config.json       Agent registry (id, name, status, reviewed)
    ├── build_query_index.py     Builds query_index.json from curated Excel
    ├── query_index.json         Generated: (agent, q-id) → summary + evidence
    └── query_runner.py          Query backend (called by se_index.sh)
```

### Setup

No API key is required to query the existing index:

```bash
python3 -m venv venv && source venv/bin/activate
pip install openpyxl
```

### Usage

```bash
# Query the index by agent and q-id
./se_index.sh query "Agent Name" "q-5"
./se_index.sh query "Browser Use" "q-5"

# List all available q-ids for an agent
./se_index.sh list-queries "Agent Name"
./se_index.sh list-queries "Browser Use"

# List all indexed agents
./se_index.sh agents
# → HubSpot Breeze Studio, IBM WatsonX Orchestrate, Anthropic Claude Code, ...

# Rebuild query_index.json from the curated Excel
python3 tool/build_query_index.py
```

---

## Dataset Extension

To index a new agent and extend the dataset, you need an Anthropic API key and the Claude Code CLI.

**Install dependencies:**

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY=sk-ant-...
python3 -m venv venv && source venv/bin/activate
pip install anthropic openpyxl
# install Claude Code CLI: https://claude.ai/download
```

**Workflow:**

1. **Index** — `./se_index.sh index "New Agent"` researches the agent and writes `data/Indexing/new_agent_se_index.json` with embedded q-ids, then automatically downloads all reference sources to `data/web_sources/New_Agent/`.
2. **Curate** — Manually transfer data into `data/dataset/Index.xlsx`, verifying each claim against downloaded sources in `data/web_sources/`.
3. **Build index** — `python3 tool/build_query_index.py` rebuilds `tool/query_index.json`.
4. **Verify** — `./se_index.sh query "New Agent" "q-1"`.

```bash
# Index a new agent (research + auto-download sources, 3–10 min)
./se_index.sh index "Agent Name"

# Re-download reference sources
./se_index.sh sources "Agent Name"
./se_index.sh sources --all
```

---

## License

Research use only. Data derived from publicly available sources.
