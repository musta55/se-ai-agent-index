# SE AI Agent Index

A dataset and tool for analyzing **Software Engineering (SE) practices** of AI agents.

To build the system, we adopted a semi-automated approach that combines LLM-assisted information
extraction with qualitative analysis and manual validation.

 13 agents indexed across 7 SE dimensions: SE Methodology, Code Review, Testing, CI/CD, Issue Resolution, Communication, and Documentation.

## Dataset

Primary dataset: [`data/dataset/Index.xlsx`](data/dataset/Index.xlsx) — manually curated and validated.

Raw JSON indexes live in `data/Indexing/` (one per agent, with embedded q-ids).

## Example Used In the Paper

| Agent Name              | Example In the Paper                                                                                                                                                                                                                                                                           | Reference                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HubSpot Breeze Studio   | Adopts the [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) strategy, prioritizing integration tests as the best balance between confidence and maintenance cost                                                                                       | [kentcdodds.com/blog/the-testing-trophy-and-testing-classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)                                   |
| IBM WatsonX Orchestrate | Uses [OpenTelemetry](https://opentelemetry.io/) to trace agent trajectories and monitor hallucinations and token usage                                                                                                                                                                             | [community.ibm.com/.../debug-with-confidence](https://community.ibm.com/community/user/blogs/bruno-fernandes-dos-santos/2026/04/13/debug-with-confidence-the-new-debug-experience) |
| Browser Use             | Supports two sandboxing strategies: (1) only risky operations run in a sandbox while the agent runs on the backend, or (2) the entire agent runs in a sandbox with a proxy holding all API keys; migrated from (1) to (2) for scalability and security                                         | [browser-use.com/posts/two-ways-to-sandbox-agents](https://browser-use.com/posts/two-ways-to-sandbox-agents)                                                                       |
| IBM WatsonX Orchestrate | The [Agent Development Kit (ADK)](https://developer.watson-orchestrate.ibm.com/) ships with a built-in red-teaming command that simulates 15+ attack types, including prompt injection and instruction override                                                                                    | [developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability](https://developer.watson-orchestrate.ibm.com/evaluate/llm_vulnerability)                                         |
| HubSpot Breeze Studio   | Migrated its code-review system from [Sidekick](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) to [Aviator](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution), a Java-based agent framework; the migration reduced time-to-feedback by 90% | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                               |
| Browser Use             | Uses [Gemini 2.5 Flash](https://deepmind.google/models/gemini/) as an [LLM-as-judge](https://arxiv.org/abs/2306.05685) to evaluate whether web agents successfully completed browsing tasks, achieving 87% alignment with human labels                                                                | [browser-use.com/posts/our-browser-agent-evaluation-system](https://browser-use.com/posts/our-browser-agent-evaluation-system)                                                     |
| HubSpot Breeze Studio   | Uses [LLM-as-judge](https://arxiv.org/abs/2306.05685) to evaluate code-review comments produced by the [Aviator](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) pipeline                                                                                               | [product.hubspot.com/blog/automated-code-review-the-6-month-evolution](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution)                               |
| HubSpot Breeze Studio   | The [Aviator](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) pipeline reviewed 50,000+ pull requests; CI/CD restructuring cut build times from 10–15 minutes to 2–3 minutes using caching and a [Kubernetes](https://kubernetes.io/)-backed setup                    | [product.hubspot.com/blog/cloud-coding-agents-at-hubspot](https://product.hubspot.com/blog/cloud-coding-agents-at-hubspot)                                                         |
| Glean Agents            | Evaluates agents against curated datasets of real-world examples graded on binary sub-metrics: completeness, tone, and groundedness                                                                                                                                                            | [glean.com/blog/enterprise-agent-evaluation-guide](https://www.glean.com/blog/enterprise-agent-evaluation-guide)                                                                   |
| Glean Agents            | PR Review agents scan code changes, flag risk areas, and produce prioritized checklists to keep review quality consistent at scale                                                                                                                                                             | [glean.com/agent-library/pull-request-review](https://www.glean.com/agent-library/pull-request-review)                                                                             |
| Anthropic Claude Code   | Illustrates rapid development and deployment: the team builds functional prototypes daily using parallel agents and iterative feedback and refinement rather than relying on heavy and static mocks/Figma designs and Product Requirement Documents (PRDs) | [newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny](https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny) |

---

## Indexed Agents

| Agent                                                                    | Description                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [HubSpot Breeze Studio](https://www.hubspot.com/products/breeze-ai)         | CRM-integrated platform for creating and deploying AI agents across sales, marketing, and customer service workflows.                                                                                                               |
| [IBM WatsonX Orchestrate](https://www.ibm.com/products/watsonx-orchestrate) | Enterprise AI platform for building, deploying, and managing AI agents that automate business processes across HR, IT, and finance.                                                                                                 |
| [Google Gemini Enterprise](https://cloud.google.com/gemini)                 | Enterprise AI agent platform on Google Cloud for workplace knowledge retrieval, multi-step workflow automation, and organizational productivity at scale.                                                                           |
| [Glean Agents](https://www.glean.com/agents)                                | Enterprise AI agent platform that automates knowledge-work tasks—engineering standup reports, code review, sales prospecting—by reasoning over company data from tools like Slack, GitHub, and Jira.                              |
| [Amazon Q Developer](https://aws.amazon.com/q/developer/)                   | AWS's AI-powered coding agent that assists developers with code generation, debugging, code transformation, and technical Q&A through IDE integrations, a CLI, and a chat interface.                                                |
| [Google Gemini CLI](https://github.com/google-gemini/gemini-cli)            | Open-source, terminal-based AI coding agent that brings Gemini model capabilities directly to the command line for development tasks.                                                                                               |
| [Anthropic Claude Code](https://claude.ai/code)                             | Agentic coding CLI tool by Anthropic that lives in the terminal, understands full codebases, and autonomously executes multi-step engineering tasks via natural language.                                                           |
| [Kimi Ok Computer](https://kimi.ai/)                                        | Chat-based AI agent by Moonshot AI that autonomously operates a cloud computing environment to complete complex multi-step tasks including web browsing, code execution, and deep research.                                         |
| [Google Gemini](https://gemini.google.com/)                                 | Google's multimodal AI assistant powered by the Gemini model family, capable of processing text, images, audio, video, and code across Google products and services.                                                                |
| [Browser Use](https://browser-use.com/)                                     | Open-source framework that connects LLMs to a real Chromium browser, making websites accessible to AI agents by extracting page structure and screenshots at each interaction step.                                                 |
| [Opera Neon](https://www.opera.com/one)                                     | Subscription-based AI agentic browser by Opera Software that combines in-browser automation (Neon Do), conversational AI (Neon Chat), and cloud-based content creation (Neon Make).                                                 |
| [Alibaba Mobile Agent](https://github.com/X-PLUG/MobileAgent)               | Open-source cross-platform mobile GUI automation agent by Tongyi Lab at Alibaba, using a vision-language model in a four-role multi-agent framework (Manager, Worker, Reflector, Notetaker) to automate tasks on real devices.      |
| [Perplexity Comet](https://www.perplexity.ai/)                              | Chromium-based AI browser that combines traditional web browsing with autonomous agentic task execution through a two-layer AI architecture: an assistant for reading and summarizing, and an agent for multi-step task automation. |

---

## Tool Structure

```
SE Indexing Tool/
├── se_index.sh                  Main CLI (run from project root)
├── index_prompt.md              Research methodology & JSON schema
├── data/
│   ├── dataset/                 Master dataset (Index.xlsx, Index.pdf)
│   ├── Indexing/                Raw SE index JSON files (one per agent)
│   │   ├── <Agent_Name>_se_index.json   SE index output per agent
│   │   └── pull_sources.py              Downloads reference URLs into data/web_sources/
│   └── web_sources/             Cached reference files — gitignored, auto-populated
│       └── <Agent_Name>/        One folder per agent ([N].html / [N].md / [N].yml)
└── Tool/
    ├── se_index_core.py         Shared q-id logic
    ├── agents_config.json       Agent registry (id, name, status, reviewed)
    ├── build_query_index.py     Builds query_index.json from curated Excel
    ├── query_index.json         Generated: (agent, q-id) → summary + evidence
    └── query_runner.py          Query backend (called by se_index.sh)
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
./se_index.sh index "Agent Name"

# Re-download reference sources
./se_index.sh sources "Agent Name"
./se_index.sh sources --all

# Query the index
./se_index.sh query "Agent Name" "q-5"
./se_index.sh list-queries "Agent Name"
./se_index.sh agents

# Rebuild query_index.json from the curated Excel
python3 Tool/build_query_index.py
```

---

## Workflow: Adding a New Agent

1. **Index** — `./se_index.sh index "New Agent"` researches the agent and writes `data/Indexing/new_agent_se_index.json` with embedded q-ids, then automatically downloads all reference sources to `data/web_sources/New_Agent/`.
2. **Curate** — Manually transfer data into `data/dataset/Index.xlsx`, verifying each claim against downloaded sources in `data/web_sources/`.
3. **Build index** — `python3 Tool/build_query_index.py` rebuilds `Tool/query_index.json`.
4. **Verify** — `./se_index.sh query "New Agent" "q-1"`.

---

## JSON Schema

Each file in `data/Indexing/` follows this structure:

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

**Evidence rules:** verbatim quotes only (5–50 words), every claim cited, document SE *practices* not product features, use `"Not Available"` with empty evidence when a field cannot be sourced. Every summary object must have a `q_id` as its first field.

---

## License

Research use only. Data derived from publicly available sources.
