# Indexed Agents

14 industrial AI agents indexed across 7 SE dimensions. The agents are a stratified sample of the 30 agents in the [2025 AI Agent Index](https://arxiv.org/abs/2602.17753), drawn from its three categories roughly in proportion to their size: 5 of 12 chat-based agents with tool access, 3 of 5 browser-based agents, and 6 of 13 enterprise workflow agent platforms.

The descriptions and languages below summarize the description and metadata columns of [`data/dataset/Index.xlsx`](data/dataset/Index.xlsx). The index also records stars, contributors, and update frequency for each agent, along with the q-ids of the supporting evidence.

### Chat-based agents with tool access (5 of 12)

| Agent | Description | Language |
| --- | --- | --- |
| [Anthropic Claude Code](https://claude.ai/code) | Agentic coding CLI tool by Anthropic that lives in the terminal, understands a full codebase, and autonomously executes tasks, such as reading files and running commands, via natural language. Created by Boris Cherny in September 2024 as a solo prototype, it reached general availability (v1.0.0) in May 2025. It is distributed as an npm package and integrates with VS Code, JetBrains, a desktop app, the web, and GitHub Actions. | TypeScript |
| [OpenAI Codex](https://github.com/openai/codex) | Cloud-based software engineering agent by OpenAI that writes features, fixes bugs, and proposes pull requests. The Codex CLI runs the agent locally on the user's computer. OpenAI develops key parts of Codex in the open on GitHub. | Rust |
| [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) | Open-source, terminal-based AI coding agent by Google, with frequent stable, preview, and nightly releases. | TypeScript |
| [Google Gemini](https://gemini.google.com/) | Closed-source family of multimodal large language models by Google DeepMind that powers the Gemini chatbot at gemini.google.com. It processes text, images, audio, video, and code, serves as the foundation model across Google AI products, and is deployed through Vertex AI, the Gemini API, and Google AI Studio. | Not reported |
| [Kimi OK Computer](https://kimi.ai/) | Closed-source, chat-based AI agent by Moonshot AI that autonomously operates a cloud computing environment to complete complex multi-step tasks, including web browsing, code execution, image generation, and deep research. It was released on 26 September 2025 as Kimi's first Agent mode. | Python (open-source kimi-agent-sdk) |

### Browser-based agents (3 of 5)

| Agent | Description | Language |
| --- | --- | --- |
| [Opera Neon](https://www.opera.com/one) | Closed-source, subscription-based AI agentic browser by Opera Software, built on Chromium. It combines local in-browser automation (Neon Do), conversational AI (Neon Chat), and cloud-based creation (Neon Make). Its model-agnostic AI engine selects among OpenAI, Google, and specialized models depending on the task. | C++ (Chromium) |
| [Perplexity Comet](https://www.perplexity.ai/) | Closed-source, Chromium-based AI browser by Perplexity that unifies web browsing with agentic task execution through two AI layers: the Comet Assistant for reading, summarizing, and answering questions, and the Comet Agent for autonomously executing multi-step tasks such as booking appointments and drafting emails. Perplexity's search engine powers it. | Not reported |
| [Alibaba Mobile Agent](https://github.com/X-PLUG/MobileAgent) | Open-source, cross-platform GUI automation agent (Mobile-Agent v3) by Tongyi Lab at Alibaba Group. Its core is GUI-Owl, a vision-language model built on Qwen2.5-VL, wrapped in a four-role multi-agent framework (Manager, Worker, Reflector, Notetaker) that automates tasks on Android phones, PCs, and web browsers without app-specific training. Mobile-Agent v3.5, built on GUI-Owl-1.5, was added in February 2026. | Python |

### Enterprise workflow agent platforms (6 of 13)

| Agent | Description | Language |
| --- | --- | --- |
| [Google Gemini Enterprise](https://cloud.google.com/gemini) | Closed-source enterprise AI agent platform on Google Cloud (also marketed as Google Agentspace) for deploying and orchestrating AI agents for workplace knowledge retrieval, multi-step workflow automation, and productivity at scale. It offers prebuilt connectors for Confluence, Jira, SharePoint, and ServiceNow, and Agent Designer for building custom agents. It is delivered as SaaS with no public source repository. | Not reported |
| [Glean Agents](https://www.glean.com/agents) | Closed-source enterprise AI agent platform, with some elements open-sourced, that automates knowledge-work tasks such as engineering standup reports, sales prospecting, code review assistance, and employee onboarding by indexing and reasoning over company data from tools like Slack, GitHub, and Jira. | Java (core Index Server), TypeScript (public repositories) |
| [IBM watsonx Orchestrate](https://www.ibm.com/products/watsonx-orchestrate) | Enterprise AI workflow orchestration platform by IBM for building, deploying, and managing AI agents that automate business processes across HR, IT, and finance. The core platform is closed-source; its Agent Development Kit (ADK) is publicly available. | Python (ADK) |
| [HubSpot Breeze Studio](https://www.hubspot.com/products/breeze-ai) | Closed-source, CRM-integrated platform for creating AI agents across sales, marketing, and customer service. | Java, TypeScript, JavaScript |
| [Browser Use](https://browser-use.com/) | Open-source agentic system that makes websites accessible to AI agents. It connects LLMs to a Chromium browser through the Chrome DevTools Protocol (CDP), extracts the DOM and screenshots at each step, and executes LLM-decided actions until the task is complete. It is available as a pip package, a CLI tool, and a cloud API. | Python |
| [n8n](https://github.com/n8n-io/n8n) | Fair-code platform to build and deploy AI agents and workflows. Its AI Agent node lets users build an agent by connecting a chat model and one or more tools, and the agent decides which tools to call to complete a task. Agents live alongside workflows as first-class artifacts in a project. | TypeScript |

Browser Use is listed as an enterprise workflow platform because that is its category in the 2025 AI Agent Index.
