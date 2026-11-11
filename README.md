# SE AI Agent Index

The **SE AI Agent Index** is a structured dataset of the publicly reported software engineering (SE) practices of **14 industrial AI agents**, a stratified sample of the 30 agents in the [2025 AI Agent Index](https://arxiv.org/abs/2602.17753). It contains **624 information items** across **seven SE dimensions**. Each item is traceable to verbatim quotations from publicly available sources.

The dataset was built with a semi-automated method. An LLM extracted the initial information, the first author synthesized and refined it by hand, and a second author validated it.

---

## Dataset

### Agents

The 14 agents were sampled across the three categories of the 2025 AI Agent Index, roughly in proportion to each category's size:

| Category                             | Sampled | Agents                                                                                                       |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------ |
| Chat-based agents with tool access   | 5 of 12 | Anthropic Claude Code, OpenAI Codex, Google Gemini CLI, Google Gemini, Kimi OK Computer                      |
| Browser-based agents                 | 3 of 5  | Opera Neon, Perplexity Comet, Alibaba Mobile Agent                                                           |
| Enterprise workflow agent platforms  | 6 of 13 | Google Gemini Enterprise, Glean Agents, IBM watsonx Orchestrate, HubSpot Breeze Studio, Browser Use, n8n     |

See [AGENTS.md](AGENTS.md) for links and a short description of each agent.

### Information Items and Dimensions

An **information item** is a specific fact about how an agent is developed and maintained. Each item belongs to one of four categories: **practices**, **tools**, **stakeholders**, and **others** (other relevant information). Items are organized into seven dimensions. The first five follow the phases of the software development life cycle (planning, implementation and review, testing, deployment, and maintenance). The last two, communication and documentation, cover concerns that span all phases.

| Dimension                    | What it covers                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| SE Methodologies             | Overall development/maintenance workflows, including sprint organization, team size, and planning |
| Code Review                  | Pull request policies, approval requirements, and code/pull request quality checks              |
| Testing                      | Verification and validation, including test frameworks, coverage targets, and evaluation strategies |
| CI/CD                        | Continuous integration/deployment pipelines, release practices, and rollback procedures         |
| Issue Resolution             | Issue triage workflows, debugging approaches, and recurring engineering problems                |
| Communication and onboarding | Developers' internal communication channels and contributor onboarding                          |
| Documentation                | Documentation culture, knowledge-sharing blogs, and related topics                              |

The index also records contextual information about each agent: a description of the agent and its features, whether it is open- or closed-source, its programming languages, and metadata such as the number of contributors, releases, and stars.

### Statistics

As of November 6, 2026:

- **14 agents** and **624 information items** (31 to 73 per agent, 44.6 on average)
- **415 distinct sources** (8 to 58 per agent, 29.6 on average), retrieved between April and November 2026
- Source types: GitHub repositories, issues, and repository records (48.0%); official documentation and engineering blogs of the agents' organizations (39.3%); other sources such as technical papers, practitioner interviews and podcasts, and news articles (12.8%)

---

## Files

### Index (spreadsheet)

- **Location:** [`data/dataset/Index.xlsx`](data/dataset/Index.xlsx) (also [`data/dataset/Index.pdf`](data/dataset/Index.pdf))
- Each **row** is an agent. Each **column** is one information category within a dimension (e.g., CI/CD practices or code review tools). The seven dimensions each span four columns: Practices, Tools, Stakeholders, and Others.
- Each cell holds a list of textual statements, one per information item. Statements cite q-ids (e.g., `[q-15]`), which link them to their quotations and sources in the JSON file.

### Evidence (JSON, one file per agent)

- **Location:** [`data/Indexing/`](data/Indexing/), named `<agent_name>_se_index.json`
- Stores the summaries, the verbatim quotations that support them, and the source references, organized into the same seven dimensions and four categories
- Each summary has a `q_id` (e.g., `q_15`), the same id cited in the spreadsheet
- Each source has a number (e.g., `[4]`) and two dates: the **creation date** (taken from the source when available) and the **retrieved date** (when we processed the source)

```jsonc
{
  "Agent_Name": "...",
  "Description": [{ "q_id": "q_1", "Summary": "...", "evidence": [{ "quote": "...", "citation": "[1]" }] }],
  "Repository_Statistics": { "Stars": [...], "Contributors": [...], "Lines_of_Code": [...], "Update_Frequency": [...], "Primary_Language": [...] },
  "SE_Practices": {
    "SE_Methodology":                 { "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "Code_Review":                    { ... },
    "Testing_and_Evaluation":         { ... },
    "CICD_and_Deployment":            { ... },
    "Bug_Solving_and_Issue_Tracking": { "Issues": [...], "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "Team_Communication":             { ... },
    "Holistic_Documentation":         { ... }
  },
  "References": { "[1]": { "Website_Type": "...", "Link": "...", "Date_Created": "...", "Date_Pulled": "YYYY-MM-DD" } }
}
```

Each item inside a category list has the form `{ "q_id": "q_15", "Summary": "...", "evidence": [{ "quote": "...", "citation": "[4]" }] }`.

Some files use an older set of dimension key names. The retrieval tool accepts both:

| Dimension in the paper       | JSON key                         | Older JSON key                        |
| ---------------------------- | -------------------------------- | ------------------------------------- |
| SE Methodologies             | `SE_Methodology`                 | `Software_Engineering_Methodology`    |
| Code Review                  | `Code_Review`                    | `Code_Review_Process`                 |
| Testing                      | `Testing_and_Evaluation`         | `Testing_and_Reliability`             |
| CI/CD                        | `CICD_and_Deployment`            | `Integration_and_Infrastructure_CICD` |
| Issue Resolution             | `Bug_Solving_and_Issue_Tracking` | `Bug_Solving_Approaches`              |
| Communication and onboarding | `Team_Communication`             | —                                     |
| Documentation                | `Holistic_Documentation`         | —                                     |

---

## Construction Methodology

1. **LLM-assisted initial indexing.** A structured prompt ([`index_prompt.md`](index_prompt.md)) was run with Claude Sonnet 4.6 in the Claude Code CLI, using web search, to produce an initial JSON index for each agent. The first and third authors refined the prompt on three of the 14 agents: Claude Code, Browser Use, and Glean Agents.
2. **Synthesis and refinement.** The first author reviewed every generated summary, quotation, and source, and turned the validated summaries into the information items in the spreadsheet. Non-SE content was excluded, such as product features, marketing, and end-user functionality. The author also fixed extraction errors and removed inaccessible sources. Where the model found no information, the author searched the web by hand.
3. **Index validation.** The second author independently checked:

   | Task                                                    | Sample                          | Agreement     |
   | ------------------------------------------------------- | ------------------------------- | ------------- |
   | Correctness of each information item                    | all 624 items                   | 592 (94.9%)   |
   | LLM summaries excluded in Phase 2                        | 57 summaries (stratified)       | 44 (77.2%)    |
   | Sources (accessible, verbatim quotes, missing information) | 78 sources (stratified)       | 69 (88.5%)    |

   The samples were stratified random samples at a 95% confidence level with a 10% margin of error. The first and second authors then discussed every disagreement until they reached consensus and updated the index.

---

## Examples Used in the Paper

The paper omits source citations for space. These are the same examples with their references. Look up a q-id with `./se_index.sh query "<Agent>" <q-id>` to see its quotations and sources.

### AI agent developers

| Use                                       | Agent                   | Example                                                                                                                                                                                                                      | q-id         | Reference                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assess practices against mature teams      | OpenAI Codex            | The Codex team reviews every pull request with its own code-review model, but still requires careful human review for critical code such as the core agent and the open-source components                                   | q-15, q-16   | [newsletter.pragmaticengineer.com/p/how-codex-is-built](https://newsletter.pragmaticengineer.com/p/how-codex-is-built)                                                                                                                                                                                    |
| Identify tools for AI-specific challenges  | Browser Use             | Stores every token, prompt, and cost of its evaluation runs in [Laminar](https://www.lmnr.ai/) (ClickHouse) for observability                                                                                                | q-4, q-7     | [browser-use.com/posts/our-browser-agent-evaluation-system](https://browser-use.com/posts/our-browser-agent-evaluation-system)                                                                                                                                                                            |
| Identify tools for AI-specific challenges  | HubSpot Breeze Studio   | Uses dashboards that track token usage, API costs, and failure counts for each tool                                                                                                                                          | q-67, q-68   | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                                                                                                                                                      |
| Identify tools for AI-specific challenges  | IBM watsonx Orchestrate | Uses [OpenTelemetry](https://opentelemetry.io/) traces to inspect each step of an agent run                                                                                                                                  | q-51         | [developer.watson-orchestrate.ibm.com/traces/overview](https://developer.watson-orchestrate.ibm.com/traces/overview)                                                                                                                                                                                      |
| Strengthen security against attacks        | IBM watsonx Orchestrate | The Agent Development Kit (ADK) ships with a built-in red-teaming command that simulates more than 15 attack types, including prompt injection and instruction override                                                      | q-6          | [developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability](https://developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability)                                                                                                                                                                |

### Researchers

| Use                                   | Agent                 | Example                                                                                                                                                         | q-id   | Reference                                                                                                                                                                                                                       |
| ------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agents are used to build agents        | OpenAI Codex          | More than 90% of the Codex app's code is written by Codex                                                                                                       | q-27   | [newsletter.pragmaticengineer.com/p/how-codex-is-built](https://newsletter.pragmaticengineer.com/p/how-codex-is-built)                                                                                                         |
| Agents are used to build agents        | OpenAI Codex          | Codex reviews essentially every internal pull request at OpenAI                                                                                                 | q-16   | [cerebralvalley.beehiiv.com/p/openai-s-codex-lets-one-engineer-ship-like-a-team-of-ten](https://cerebralvalley.beehiiv.com/p/openai-s-codex-lets-one-engineer-ship-like-a-team-of-ten)                                         |
| LLM as a judge                         | Browser Use           | Uses Gemini 2.5 Flash as an LLM judge to decide whether web agents completed their tasks, with 87% alignment with human labels                                 | q-5    | [browser-use.com/posts/our-browser-agent-evaluation-system](https://browser-use.com/posts/our-browser-agent-evaluation-system)                                                                                                 |
| LLM as a judge                         | HubSpot Breeze Studio | A Judge Agent evaluates the AI code reviewer's comments for succinctness, accuracy, and actionability before they are posted                                   | q-61   | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                                                                           |

### Educators

| Use                         | Agent        | Example                                                                                                                                              | q-id   | Reference                                                                                                                   |
| --------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Case study: testing         | Glean Agents | Evaluates agents against curated datasets of real-world examples graded on binary sub-metrics (completeness, tone, groundedness)                     | q-58   | [glean.com/blog/enterprise-agent-evaluation-guide](https://www.glean.com/blog/enterprise-agent-evaluation-guide)            |
| Case study: code review     | Glean Agents | Pull request review agents scan code changes, flag risk areas, and produce prioritized checklists to keep review quality consistent at scale         | q-68   | [glean.com/agent-library/pull-request-review](https://www.glean.com/agent-library/pull-request-review)                      |

---

## Retrieval Tool

Each information item has a q-id. The retrieval script returns the item's summary, verbatim quotations, and sources:

```bash
git clone https://github.com/musta55/se-ai-agent-index.git
cd se-ai-agent-index
./se_index.sh query <agent_name> <q-id>
./se_index.sh query "OpenAI Codex" "q-15"
```

### Setup

No API key is needed to query the index:

```bash
python3 -m venv venv && source venv/bin/activate
pip install openpyxl
```

### Usage

```bash
# Look up an information item by agent and q-id
./se_index.sh query "Browser Use" "q-5"

# List all q-ids for an agent
./se_index.sh list-queries "Browser Use"

# List the 14 indexed agents
./se_index.sh agents

# Rebuild tool/query_index.json (used by list-queries and agents) from the JSON files
python3 tool/build_query_index.py
```

### Repository Structure

```
se-ai-agent-index/
├── se_index.sh                  Main CLI (run from project root)
├── index_prompt.md              Indexing prompt & JSON schema (Phase 1)
├── AGENTS.md                    The 14 indexed agents
├── data/
│   ├── dataset/                 Final index (Index.xlsx, Index.pdf)
│   ├── Indexing/                Evidence JSON files (one per agent)
│   │   ├── <agent_name>_se_index.json
│   │   └── pull_sources.py      Downloads reference URLs into data/web_sources/
│   └── web_sources/             Local cache of reference sources (not tracked)
└── tool/
    ├── se_index_core.py         Shared q-id logic and agent → JSON map
    ├── agents_config.json       Agent registry (id, name, status, reviewed)
    ├── build_query_index.py     Builds query_index.json from the JSON files
    ├── query_index.json         Generated: (agent, q-id) → summary + evidence
    └── query_runner.py          Query backend (called by se_index.sh)
```

---

## Extending the Dataset

The prompts and tools are released so the index can be updated as agent practices change. To index a new agent you need an Anthropic API key and the Claude Code CLI:

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY=sk-ant-...
python3 -m venv venv && source venv/bin/activate
pip install anthropic openpyxl
# install Claude Code CLI: https://claude.ai/download
```

1. **Index (Phase 1):** `./se_index.sh index "New Agent"` researches the agent and writes `data/Indexing/new_agent_se_index.json` with embedded q-ids. It then downloads the reference sources to `data/web_sources/New_Agent/`.
2. **Synthesize (Phase 2):** Check each summary against the downloaded sources, then add the validated information items, with their q-ids, to `data/dataset/Index.xlsx`.
3. **Validate (Phase 3):** Have a second person independently check the items against their quotations and sources.
4. **Register:** Add the agent to `AGENT_JSON_MAP` in `tool/se_index_core.py`, run `python3 tool/build_query_index.py`, and check the result with `./se_index.sh query "New Agent" "q-1"`.

```bash
# Re-download reference sources
./se_index.sh sources "Agent Name"
./se_index.sh sources --all
```

---

## Limitations

- Some practices are documented only at the organization level. We attributed them to an agent only when no evidence contradicted them, but individual teams may deviate.
- The 14 agents are prominent and well documented, so the findings may not generalize to smaller or less transparent teams.
- The index reflects evidence available up to November 6, 2026, and agent practices change quickly.

---

## License

Research use only. Data derived from publicly available sources.
