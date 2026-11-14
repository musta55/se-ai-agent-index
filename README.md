# SE AI Agent Index

A dataset and retrieval tool for analyzing **Software Engineering (SE) practices** of AI agents, built using a semi-automated approach that combines LLM-assisted information extraction with qualitative analysis and manual validation.

---

## Dataset

### Final Index (XLSX)

- **Location:** [`data/dataset/Index.xlsx`](data/dataset/Index.xlsx) or [`data/dataset/Index.pdf`](data/dataset/Index.pdf)
- Manually curated and validated final index
- 14 agents × 7 SE dimensions in a structured table, with 624 information items
- Each cell contains information items (summarized findings with source evidence), each citing its q-id (e.g., `[q-15]`)

### Final JSON

- **Location:** [`data/Indexing/`](data/Indexing/) — one JSON file per agent
- Machine-readable format with embedded `q_id` fields for direct lookup
- Contains raw summaries, verbatim evidence quotes, and source citations

---

### How to Use the Final Index

The Final Index is organized as a table with agent metadata followed by SE dimension columns:

- **Rows (14):** One row per indexed agent — name, description, and repository metadata
- **Columns:** Agent description, metadata, then 7 SE dimensions — SE Methodology, Code Review, Testing, CI/CD, Issue Resolution, Communication, and Documentation

14 agents indexed across 7 SE dimensions. Each dimension contains information about four sub-dimensions: **Practices**, **Tools**, **Stakeholders**, and **Others**.

---

### How to Use the Final JSON

Each file in [`data/Indexing/`](data/Indexing/) follows this structure. Every summary object has a `q_id` as its first field for direct lookup by dimension and sub-dimension:

```jsonc
{
  "Agent_Name": "...",
  "Description": [{ "q_id": "q_1", "Summary": "...", "evidence": [{ "quote": "...", "citation": "[1]" }] }],
  "Repository_Statistics": { "Stars": [...], "Contributors": [...], "Lines_of_Code": [...], "Update_Frequency": [...], "Primary_Language": [...] },
  "SE_Practices": {
    "Testing_and_Evaluation":          { "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "CICD_and_Deployment":             { ... },
    "Code_Review":                     { ... },
    "Bug_Solving_and_Issue_Tracking":  { "Issues": [...], "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "SE_Methodology":                  { ... },
    "Team_Communication":              { ... },
    "Holistic_Documentation":          { ... }
  },
  "References": { "[1]": { "Website_Type": "...", "Link": "...", "Date_Created": "...", "Date_Pulled": "YYYY-MM-DD" } }
}
```

Some files use the older dimension keys (`Testing_and_Reliability`, `Integration_and_Infrastructure_CICD`, `Code_Review_Process`, `Bug_Solving_Approaches`, `Software_Engineering_Methodology`); the retrieval tool accepts both.

---

### Examples Used in the Paper

These are the examples from Section IV (Index Usage Scenarios and Examples) of the paper, grouped by the same audiences and scenarios, with the references the paper omits for space.

**AI agent developers**

| Scenario | Agent Name | Example In the Paper | Reference |
| --- | --- | --- | --- |
| Assess internal engineering practices | OpenAI Codex | The Codex team reviews every pull request with its own code-review model, but still requires careful human review for critical code such as the core agent and the open-source components | [newsletter.pragmaticengineer.com/p/how-codex-is-built](https://newsletter.pragmaticengineer.com/p/how-codex-is-built) |
| Identify tools for AI-specific challenges | Browser Use | Stores every token, prompt, and cost of its evaluation runs in [Laminar](https://www.lmnr.ai/) (ClickHouse) for observability | [browser-use.com/posts/our-browser-agent-evaluation-system](https://browser-use.com/posts/our-browser-agent-evaluation-system) |
| Identify tools for AI-specific challenges | HubSpot Breeze Studio | Uses dashboards that track token usage, API costs, and failure counts for each tool | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) |
| Identify tools for AI-specific challenges | IBM watsonx Orchestrate | Uses [OpenTelemetry](https://opentelemetry.io/) traces to inspect each step of an agent run | [developer.watson-orchestrate.ibm.com/traces/overview](https://developer.watson-orchestrate.ibm.com/traces/overview) |
| Strengthen security against adversarial attacks | IBM watsonx Orchestrate | The [Agent Development Kit (ADK)](https://developer.watson-orchestrate.ibm.com/) ships with a built-in red-teaming command that simulates 15+ attack types, including prompt injection and instruction override | [developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability](https://developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability) |

**Researchers**

| Scenario | Agent Name | Example In the Paper | Reference |
| --- | --- | --- | --- |
| Cross-analysis of agent engineering | OpenAI Codex | More than 90% of the Codex app's code is written by Codex | [newsletter.pragmaticengineer.com/p/how-codex-is-built](https://newsletter.pragmaticengineer.com/p/how-codex-is-built) |
| Cross-analysis of agent engineering | Browser Use | Uses [Gemini 2.5 Flash](https://deepmind.google/models/gemini/) as an [LLM-as-judge](https://arxiv.org/abs/2306.05685) to evaluate whether web agents completed their tasks, achieving 87% alignment with human labels | [browser-use.com/posts/our-browser-agent-evaluation-system](https://browser-use.com/posts/our-browser-agent-evaluation-system) |
| Cross-analysis of agent engineering | HubSpot Breeze Studio | A Judge Agent evaluates the AI code reviewer's comments for succinctness, accuracy, and actionability before they are posted | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) |
| Evaluate engineering decisions | Google Gemini CLI | A new integration test must pass at least 5 runs of the deflake (flakiness) check before it can join the CI pipeline | [geminicli.com/docs/integration-tests](https://geminicli.com/docs/integration-tests) |
| Evaluate engineering decisions | Browser Use | Moved from sandboxing only its tools to running the entire agent in a zero-secret sandbox behind a credential-holding control plane, so the agent can be killed, restarted, and scaled independently | [browser-use.com/posts/two-ways-to-sandbox-agents](https://browser-use.com/posts/two-ways-to-sandbox-agents) |

**Educators**

| Scenario | Agent Name | Example In the Paper | Reference |
| --- | --- | --- | --- |
| Case studies of industrial AI agents | n8n | Tests its AI Agent node against mocked LLM chat-completion and tool-call responses, so its integration tests stay deterministic in CI | [n8n-io/n8n: agent-v3.workflow.test.ts](https://github.com/n8n-io/n8n/blob/master/packages/@n8n/nodes-langchain/nodes/agents/Agent/test/integration/agent-v3.workflow.test.ts) |
| Case studies of industrial AI agents | n8n | Runs its LLM-based evaluations separately from the regular tests, once per pull-request state change rather than on every push, because running them on every push made the cost untenable | [n8n-io/n8n: .github/WORKFLOWS.md](https://github.com/n8n-io/n8n/blob/master/.github/WORKFLOWS.md) |

---

### Indexed Agents

See [AGENTS.md](AGENTS.md) for the list of 14 indexed agents with descriptions.

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
├── AGENTS.md                    The 14 indexed agents
├── data/
│   ├── dataset/                 Master dataset (Index.xlsx, Index.pdf)
│   ├── Indexing/                Raw SE index JSON files (one per agent)
│   │   ├── <agent_name>_se_index.json   SE index output per agent
│   │   └── pull_sources.py              Downloads reference URLs into data/web_sources/
│   └── web_sources/             Cached reference files — local only, not tracked
│       └── <Agent_Name>/        One folder per agent ([N].html / [N].md / [N].yml)
└── tool/
    ├── se_index_core.py         Shared q-id logic and agent → JSON map
    ├── agents_config.json       Agent registry (id, name, status, reviewed)
    ├── build_query_index.py     Builds query_index.json from the JSON files
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
# → Alibaba Mobile Agent, Anthropic Claude Code, Browser Use, Glean Agents, ...

# Rebuild query_index.json from the JSON files
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
3. **Build index** — Add the agent to `AGENT_JSON_MAP` in `tool/se_index_core.py`, then run `python3 tool/build_query_index.py` to rebuild `tool/query_index.json`.
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

This project is released under the [MIT License](LICENSE). The index summarizes publicly available sources. The quoted excerpts and linked sources remain the property of their respective owners.
