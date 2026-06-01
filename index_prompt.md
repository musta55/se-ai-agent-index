# Software Engineering Research Task

## Role and Objective

You are an expert Software Engineering (SE) Research Agent. Your goal is to investigate and build a standardized "Software Engineering (SE) Index" for the following agentic AI system:

**Target Agent: {agent_name}**

Your mission is to analyze **how this system is developed, maintained, and deployed** by its engineering team using rigorous open-coding methodology. The indexing will be used to study SE practices for this agentic system.

## Research Methodology

In this task, you must conduct deep AI-mode searching to scrape publicly available data in a specific JSON format [given below] using the following sequential steps. **Strict adherence to these steps is required to ensure data validity.**

**Execution Rule:** Use your web search tools to execute queries, and explicitly use your scraping tools to read the full text of articles before extracting. **Do not rely on search engine snippets.**

### Step 0: Agent Description

**Objective:** Before any repository research, establish what this agentic system actually does for its users.

**Actions:**

1. **Identify the agent's category, company name and purpose:**
   - Is it a coding agent, conversational chatbot, computer-use/browser agent, sales/CRM agent, enterprise workflow platform, or other?
   - What tasks does it automate or assist with?
   - Which company build this agent?
   - What is the deployment surface (CLI tool, web app, IDE plugin, API, enterprise SaaS)?
2. **Find a concise description from an authoritative source** (official product page, repository README, or press release).
3. **Output** a `Description` field following the same Summary + evidence (quote, citation) format as all other fields.

---

### Step 1: Repository Discovery & Statistics

**Objective:** Locate the official repository and extract baseline metrics.

**Actions:**

1. **Find the Official Repository:**

   - Search for the official GitHub repository for {agent_name}
   - Look for actual code repositories with format
   - Verify the repository matches the agent name (check README, description)
2. **Extract Repository Statistics** (each must have proper citation):

   - **Lines of Code:** Estimate based on repository size/languages shown on GitHub
   - **Stars:** Current star count from repository page
   - **Contributors:** Number of contributors
   - **Primary Language:** Main programming language(s) used
   - **Update Frequency:** Average number of official releases or tags published per month over the last 6 months
   - **Last Updated:** Most recent commit date
3. **Read Configuration Files:**

   - README.md thoroughly
   - CONTRIBUTING.md (if available)
   - .github/ folder for workflow files, templates, guidelines
   - Any DEVELOPMENT.md, TESTING.md, or similar engineering docs
   - CI/CD .yaml files for explicit deployment instructions

**Evidence Required:** Each statistic must have a verbatim quote from the repository page or about page, plus citation number (Details refer to Evidence Format section).

**If Repository Not Found:** After 10 search attempts, if no public repository exists:

- Mark Repository_Statistics sections as "Not Available - No Public Repository" or "Not Available - Closed Source Product"
- **For closed-source products:** Intensify search for external engineering blogs, conference talks, technical papers, and official documentation that may reveal development practices
- Continue with Step 2 using other sources (documentation, blogs, papers, talks, forums)
- Focus on finding indirect evidence of SE practices through public-facing engineering communications

### Step 2: Official Documentation & Engineering Blogs Analysis

**Objective:** Read official documentation and external sources to understand the engineering pipeline.

**Actions:**

1. **Read Official Documentation:**

   - Search for official website and developer documentation
   - Read README.md and CONTRIBUTING.md thoroughly
   - Review architecture documentation and internal engineering pipeline descriptions
   - Check for testing frameworks, code review requirements, CI/CD practices,software engineering methodology practices mentioned
2. **CRITICAL - Search for Engineering Blog Posts & External Sources:**

- **MANDATORY:** Search "{agent_name} blog" or "{agent_name} engineering blog"
- Look for developer blogs (e.g., aws.amazon.com/blogs/devops, engineering.github.com, medium.com)
- Search for conference talks on YouTube (re:Invent, AWS Summit, KubeCon, etc.)
- Check for technical papers or research posts (arxiv.org, Amazon Science, etc.)
- Look for "What's New" announcements or release posts
- Search for architecture deep-dives or behind-the-scenes articles
- Check developer forums (Reddit, Hacker News, Stack Overflow, LinkedIn etc.)
- Search for engineer interviews, podcasts, or transcripts
- **MINIMUM REQUIREMENT:** Find at least **5-10 external blog posts/articles**
- **TARGET:** 15-20 total references with mix of GitHub + external sources

3. **Explore Multi-Chapter Authoritative Sources (If Found):**

- If you discover comprehensive engineering handbooks or books (e.g., Google SWE Book, Amazon Builders' Library):
  - Check the **table of contents** for relevant chapters across different SE practice areas
  - Explore **multiple chapters** that align with the 7 research areas:
    - Testing/CI chapters → Testing_and_Reliability, Integration_and_Infrastructure
    - Code review chapters → Code_Review_Process
    - Documentation chapters → Holistic_Documentation
    - Communication/collaboration chapters → Team_Communication
  - Don't stop after finding one useful chapter - these comprehensive sources often have 10-30+ chapters
  - Extract practices that are broadly applicable to the company's engineering culture
- **Note:** Most agents won't have such comprehensive sources - only search if you discover them

**Focus Areas:** After gather the sources, look for explicit mentions of:

- Testing frameworks and evaluation practices (Vitest, Playwright, Jest, Pytest)
- Code review requirements and practices
- CI/CD pipeline tools and deployment practices
- Software development workflow and methodologies (Agile, Scrum, etc.)
- Contribution guidelines and team structure
- Engineering team insights from blog posts
- Architecture decisions from technical articles
- Internal testing tools, dogfooding practices
- Developer discussions about challenges and solutions

### Step 3: Issue Tracker Analysis

**Objective:** Identify recurring engineering pitfalls and architectural limitations from the issue tracker — not just list tickets.

**Actions:**

1. **Browse open AND closed issues:**

   - Closed issues reveal how the team actually resolves problems; do not skip them
   - Look for issues that expose engineering challenges: dependency failures, async bugs, security gaps, missing test infrastructure, API contract mismatches, schema errors
   - Avoid issues that are purely user feature requests with no engineering insight
   - Select **10–15 issues** that together cover 3–5 distinct problem categories
2. **For Each Issue, Extract:**

   - Exact issue title
   - Issue number
   - Status (Open / Closed)
   - 1–2 sentence description of the engineering problem and why it matters
   - Citation (reference number linked to the issue URL)
3. **Synthesize Patterns:**

   - What categories of bugs recur? (e.g., dependency leaks, async issues, security gaps)
   - What do the patterns reveal about architectural weak spots or process gaps?
   - Are there systemic gaps in testing, sandboxing, or schema validation?

**Output:** Populate the `Issues` array in `Bug_Solving_Approaches`. In the `Practices` sub-section, synthesize the issues into recurring problem categories — this is more valuable than a raw issue count.

### Step 4: Deep Analysis Across 7 SE Practice Areas

**Objective:** Extract detailed SE practices across all categories by analyzing all collected sources.

**For Each of the 7 Areas Below:**

Extract information in this structure:

- **Practices:** What practices do the developers follow?
- **Tools:** What specific tools/frameworks/services do they use?
- **Stakeholders:** Who is involved? (e.g., QA engineers, DevOps, maintainers)
- **Others:** Any other relevant details

**Evidence Format:**

- **Summary:** 1-5 sentence overview of findings. For each field summary can be multiple. Summary can come from multiple quotes from different websites.
- **Evidence array:** Each item must have:
  - **quote:** EXACT verbatim text from source (5-50 words). It must be a complete statement or sentence from the text that supports the summary. It must not be a file name, URL, or webpage title.
  - **citation:** Reference number [1], [2], etc.

## 7 Critical Research Areas

### 1. Testing & Reliability

**What This Area Covers:**
How do developers evaluate "agentic" behavior internally? Look for testing frameworks, self-testing loops, or human-in-the-loop (HITL) evaluation.

**What to Look For:**

- Testing frameworks used (Jest, Pytest, Vitest, Playwright, Selenium, Cypress, etc.)
- Test coverage requirements or practices (e.g., "minimum 80% coverage")
- Types of tests implemented (unit, integration, e2e, regression, performance)
- CI/CD integration for automated testing
- Evaluation of "agentic" behavior (HITL evaluation, automated evals, benchmarks)
- Quality assurance processes and practices
- Testing for LLM outputs, hallucination detection, accuracy metrics
- Red teaming or adversarial testing practices

**Questions to Answer:**

- **Practices:** What testing practices do the developers use during the building of the agentic system? Do they rely on agents for testing? How do human developers and agents contribute to testing this agentic system?
- **Tools:** What are the names of the tools used in testing or evaluating? (e.g., Playwright, Pytest, GitHub Actions for CI)
- **Stakeholders:** Who is involved during testing? (e.g., QA engineers, red teamers, core maintainers)
- **Others:** Any other relevant descriptions regarding evaluation, test coverage, or quality gates

**Example Evidence:**

```json
"Tools": [{
  "Summary": "Team uses Playwright for end-to-end testing with minimum 80% coverage requirement",
  "evidence": [{
    "quote": "All pull requests must maintain at least 80% test coverage and include Playwright e2e tests for user-facing features.",
    "citation": "[3]"
  }]
}]
```

### 2. Integration & Infrastructure (CI/CD)

**What This Area Covers:**
How do they manage deployments, CI/CD pipelines, and infrastructure? What are the Continuous Integration and Continuous Deployment practices?

**What to Look For:**

- CI/CD pipeline setup and tools (GitHub Actions, Jenkins, CircleCI, GitLab CI, etc.)
- Deployment frequency and processes (daily, weekly, continuous deployment)
- Infrastructure tools and platforms (Docker, Kubernetes, Terraform, AWS, Azure, etc.)
- Staging/production environments and deployment strategies
- Deployment automation and rollback procedures
- Infrastructure as Code (IaC) practices
- Monitoring and observability tools (Datadog, New Relic, Prometheus, etc.)

**Questions to Answer:**

- **Practices:** What integration and deployment practices do they follow? How frequently do they deploy this agent? What deployment strategies are used (blue-green, canary, rolling)?
- **Tools:** What are the names of the CI/CD and infrastructure tools? (e.g., GitHub Actions, Terraform, Kubernetes, Docker)
- **Stakeholders:** Who manages the infrastructure? (e.g., DevOps engineers, SRE team, platform engineers)
- **Others:** Any other relevant deployment details, infrastructure configuration, or operational practices

### 3. Code Review Process

**What This Area Covers:**
What is the internal code review process of the human engineers/ developers building the agent?

**What to Look For:**

- Pull request requirements and approval workflows
- Code review guidelines and standards (in CONTRIBUTING.md or similar)
- Review approval processes (e.g., "2 approvals required", "1 maintainer approval")
- Automated code review tools (linters, static analysis, security scanners)
- Merge strategies (squash, rebase, merge commits)
- Code review checklist or quality gates
- Pair programming or mob programming practices

**Questions to Answer:**

- **Practices:** What code review practices are followed by the developers? Are there specific review requirements or guidelines?
- **Tools:** What tools facilitate human-to-human code reviews? (e.g., GitHub Pull Requests, Merge Requests, Gerrit, Phabricator)
- **Stakeholders:** Who performs code reviews? Who has merge permissions? (e.g., core maintainers, senior engineers, designated reviewers)
- **Others:** Any other process descriptions, review timelines, or quality standards

### 4. Bug-Solving Approaches

**What This Area Covers:**
How do the developers track, triage, and resolve bugs in the agent's own codebase? The goal is to identify **recurring engineering pitfalls and architectural limitations**, not just list individual tickets.

**What to Look For:**

- Issue tracking system used (GitHub Issues, Jira, Linear, etc.)
- How bugs are triaged and prioritized (labels, milestones, assignees)
- Debugging and observability tools (Sentry, structured logging, error tracing)
- Fix workflow: how bugs move from open → diagnosed → resolved
- Patterns across issues: what categories of problems recur?

**Issue Search Strategy:**

- Browse both **open and closed** issues — closed issues reveal how bugs were actually resolved
- Look for issues that expose **engineering challenges**, not just user requests: dependency failures, API contract mismatches, async/concurrency bugs, security gaps, missing test infrastructure, schema errors
- Prioritize issues that say something about *how the team builds the system*, not just what features users want
- Extract **10–15 issues** that together illustrate 3–5 recurring problem categories

**Issue Schema (per issue):**

```json
{
  "Issue_Title": "Exact title from issue tracker",
  "Issue_Number": 123,
  "Status": "Open | Closed",
  "Description": "1-2 sentences: what is the problem and why does it matter engineering-wise.",
  "Citation": "[N]"
}
```

**Questions to Answer:**

- **Issues:** 10–15 issues selected to reveal engineering patterns, not for completeness
- **Practices:** Synthesize the issues into 2–4 recurring problem categories. What does the pattern of bugs tell you about this team's engineering challenges, architectural weak spots, or process gaps?
- **Tools:** What issue tracking and debugging tools are used? (e.g., GitHub Issues, Sentry, structured logs)
- **Stakeholders:** Who triages and resolves bugs? (e.g., core maintainers, platform team, community contributors)
- **Others:** Any architectural limitations, systemic gaps, or quality anti-patterns that appear across multiple issues

**Objective:** Surface the *classes* of engineering problems this team repeatedly encounters — not a raw issue list.

### 5. Software Engineering Methodology

**What This Area Covers:**
What methodologies do teams use to manage the development lifecycle?

**What to Look For:**

- Development methodologies and frameworks (Agile, Scrum, Kanban, Waterfall, etc.)
- Sprint cycles or release cadences (2-week sprints, monthly releases, etc.)
- Project management approaches and tools
- Team structure and size (how many engineers, team composition)
- Development lifecycle practices (planning, execution, retrospectives)
- Rapid prototyping or internal dogfooding practices
- Feature planning and roadmap management

**Questions to Answer:**

- **Practices:** What software engineering methodologies does the team use to align on development of this agent? How big is the team in size? What development lifecycle do they follow?
- **Tools:** What is the name of the process or methodology? (e.g., Scrum, Agile, Kanban, waterfall, rapid prototyping, internal dogfooding)
- **Stakeholders:** Who creates infrastructure or leads the engineering lifecycle? (e.g., engineering managers, tech leads, scrum masters)
- **Others:** Any other relevant software development details, team organization, or process descriptions

### 6. Team Communication

**What This Area Covers:**
How developers communicate and collaborate with each other during development. Focus on interpersonal communication channels, decision-making processes, and knowledge sharing. Also include automation/bots that facilitate communication workflows if available.

**IMPORTANT DISTINCTION:**

- **PRIMARY FOCUS:** Human-to-human communication practices (design docs, RFCs, Slack channels, email lists, meetings, decision-making discussions, knowledge sharing)
- **ALSO INCLUDE:** Communication-related automation/bots if mentioned (e.g., Slack bots for notifications, PR comment bots, automated meeting summaries)
- **EXCLUDE:** Pure workflow automation without human communication aspect (CI/CD triggers, deployment automation unrelated to team communication)

**What to Look For:**

- **Human Communication Channels:** Slack, Discord, Microsoft Teams, email lists, mailing lists, forums
- **Collaborative Decision-Making:** RFCs (Request for Comments), design docs, ADRs (Architecture Decision Records), proposal reviews
- **Knowledge Sharing Practices:** Internal wikis, Q&A platforms, office hours, presentations, newsletters, documentation collaboration
- **Meeting Structures:** Standups, retrospectives, planning meetings, design reviews, sync meetings
- **Contributor Onboarding:** Mentorship programs, onboarding documentation, welcome processes
- **Communication Automation (if mentioned):** Bots for notifications, PR reviewers assignment, meeting scheduling, status updates

**Questions to Answer:**

- **Practices:** What communication practices does the team use to align on development? How do they onboard new contributors? How are decisions made through human discussion and collaboration?
- **Tools:** What are the names of the communication tools and platforms? (e.g., Slack, Discord, Google Docs for design docs, YAQS, mailing lists)
- **Stakeholders:** Who is involved in these communications? (e.g., core team, community contributors, maintainers, technical leads)
- **Others:** Any other descriptions of communication workflows, meeting cadences, collaboration practices, or communication-facilitating automation

### 7. Holistic Documentation

**What This Area Covers:**
The comprehensive documentation culture, systems, and practices. How is documentation treated as a first-class engineering artifact? Not just "what tools host docs" but "how do engineers approach documentation throughout the development lifecycle."

**EMPHASIS:** Focus on documentation **culture, standards, and systematic practices** - how the team values, creates, maintains, and enforces documentation quality across the entire project.

**What to Look For:**

- **Documentation Culture:** Documentation-as-code practices, docs treated like production code, required before merging
- **Documentation Standards:** Code comment requirements, documentation review processes, quality gates, style guides
- **Maintenance Practices:** Update frequency, freshness policies, staleness detection, ownership models, deprecation handling
- **Documentation Types:** API docs, tutorials, design docs, architecture docs, runbooks, conceptual guides, onboarding materials
- **Review and Quality:** Documentation review processes (technical review, clarity review, writing review), approval workflows
- **Tooling and Infrastructure:** Hosting platforms (ReadTheDocs, GitBook, GitHub Pages, Docusaurus), generation tools (Swagger, OpenAPI, JSDoc, Sphinx)
- **Accessibility and Discoverability:** Search functionality, navigation, cross-linking, versioning, multi-language support
- **Technical Writer Involvement:** Role of technical writers, collaboration with engineers, documentation ownership
- **Testing and Validation:** Doc testing, example code validation, link checking, accessibility audits

**Questions to Answer:**

- **Practices:** What documentation culture and practices are followed? How is documentation created, reviewed, and maintained? What standards are enforced? How frequently is documentation updated and validated?
- **Tools:** What tools are used to create, host, generate, and maintain documentation? (e.g., g3doc, ReadTheDocs, GitBook, Sphinx, Docusaurus, freshness metadata systems)
- **Stakeholders:** Who writes, reviews, and maintains documentation? What roles are involved? (e.g., technical writers, document owners, engineers, reviewers)
- **Others:** Any other descriptions of documentation workflows, comprehensive documentation systems, quality processes, or cultural practices around documentation

## Anti-Hallucination Rules & Output Instructions

### Rule 1: Strict Source Fidelity

- Extract information **ONLY** from original sources you have actually accessed and read
- Do **NOT** make up stories, assumptions, or fake URLs
- Do **NOT** guess URL paths or make up reference links
- If you cannot verify a URL exists and is accessible, do **NOT** use it
- Every piece of information must be traceable to a real, accessible source

### Rule 2: Verbatim Quotes Only

- Extract **Exactly sentences** from source documents. If the sentence is too long(more than 50 words, add "..." with some of the words. Main reason behind is to verify the summary and quote whether the eveidence is right or wrong)
- Do **NOT** paraphrase, summarize, or reword ANY quotes in the evidence section
- Copy text **exactly** as it appears, character-for-character
- Include full sentences or meaningful excerpts (5-50 words ideal)
- Quotes must be substantive statements that support the summary
- **INVALID quotes:** File names, URLs, webpage titles, single words

**Example of VALID quote:**

```json
{
  "quote": "All pull requests must maintain at least 80% test coverage and include Playwright e2e tests for user-facing features.",
  "citation": "[3]"
}
```

**Examples of INVALID quotes:**

```json
{"quote": "CONTRIBUTING.md", "citation": "[1]"}  // File name - NOT ALLOWED
{"quote": "GitHub Actions", "citation": "[2]"}    // Tool name only - NOT ALLOWED
{"quote": "https://...", "citation": "[3]"}       // URL - NOT ALLOWED
{"quote": "Testing", "citation": "[4]"}           // Single word - NOT ALLOWED
```

### Rule 3: Cross-Verification & Fact-Checking

- Review and cross-verify statements before adding them
- If you encounter conflicting information, note it or choose the most authoritative source
- Every citation [1], [2], etc. must map to a real, accessible URL in References
- Verify dates are accurate (Date Created and Date Pulled)
- Check that quotes actually appear in the linked sources

### Rule 4: "Not Available" for Missing Data - LAST RESORT ONLY

**EXHAUSTIVE SEARCH REQUIRED** before marking "Not Available":

1. Search GitHub repository thoroughly (README, CONTRIBUTING, .github/, docs/, all config files)
2. Search external blogs, papers, conference talks (minimum 5-10 sources)
3. For major tech companies, search published engineering practice sites:

- Google: google.github.io/eng-practices, abseil.io/resources/swe-book
- Amazon: AWS blogs, Amazon Builders' Library
- Meta: engineering.fb.com, Meta open source guides
- Microsoft: microsoft.github.io, Azure architecture guides
- Note: Not all agents will have these - only applicable for major company products

4. If comprehensive multi-chapter handbooks found, explore MULTIPLE relevant chapters
5. Try alternative search terms, related SE practice areas, and cross-references

**Only after exhausting ALL avenues above:**

- Mark Summary as **"Not Available"**
- Leave evidence array **empty** `[]` for that section
- Do **not** invent quotes or substitute product features to fill fields
- Do **not** make up information to complete the JSON
- It is better to have "Not Available" than hallucinated content

**Example:**

```json
"Others": [{
  "Summary": "Not Available",
  "evidence": []
}]
```

### Rule 5: Complete JSON Output

- Ensure the entire JSON is complete - do **not** truncate
- Double-check JSON syntax: proper commas, balanced braces, valid structure
- All citations [1], [2], etc. must have corresponding entries in References section
- All 7 SE_Practices areas must be present with all 4 subsections each
- Repository_Statistics must have all required fields
- Bug_Solving_Approaches must include an Issues array with 10–15 issues selected to reveal recurring engineering patterns

### Rule 6: Repository Not Found Handling

- If after 10+ search attempts you cannot find a public code repository:
  - Try searching for related repositories (CLI tool, VSCode extension, SDK, API client)
  - Try alternative search terms ("{agent_name} source code", "{agent_name} github")
  - If **no public repository exists** anywhere:
    - Mark Repository_Statistics sections as **"Not Available - No Public Repository"**
    - Complete the JSON structure with "Not Available" for sections requiring repository access
    - **Continue with other sources** (documentation, blogs, papers, forums)
    - Use the `done` action with the completed JSON (all sections must be present)

### Rule 7: External Sources are MANDATORY

- Do **NOT** rely only on the GitHub repository
- You **MUST** search for and extract from external sources:
  - Engineering blogs (aws.amazon.com/blogs, engineering.github.com, medium.com/@company, etc.)
  - Conference talks (YouTube, Vimeo - search for keynotes, presentations, demos)
  - Technical papers and research posts (arxiv.org, Amazon Science, Google Research, etc.)
  - Official documentation sites (separate from GitHub README)
  - "What's New" announcements and release blog posts
  - Developer community posts (Reddit r/programming, Hacker News, Dev.to)
  - Podcast transcripts and engineer interviews
  - **Company engineering practice sites and handbooks** (when applicable):
    - Google: google.github.io/eng-practices, abseil.io/resources/swe-book
    - Amazon: Amazon Builders' Library, AWS best practices documentation
    - Meta: engineering.fb.com, Meta open source engineering guides
    - Microsoft: microsoft.github.io, Azure architecture center
    - **Note:** These are only relevant for products from major tech companies; most agents won't have such resources
- **TARGET:** Minimum **15-20 total references**, with at least **5-10 from external sources**
- External sources often contain the most valuable SE practice details, team insights, and development workflows

### Rule 8: Distinguish Development Practices from Product Features

**MOST IMPORTANT RULE:**

You are researching the **internal development process of the human engineers**, NOT the product's user-facing features.

**WRONG Examples (Product Features - DO NOT EXTRACT):**

- "Claude Code helps users review code"
- "Amazon Q provides code suggestions to developers"
- "GitHub Copilot fixes bugs for developers"
- "The agent uses MCP to communicate" (feature, not development practice)

**CORRECT Examples (Development Practices - EXTRACT THESE):**

- "Anthropic engineers use Playwright for end-to-end testing of Claude Code"
- "Amazon Q team follows Agile methodology with 2-week sprints"
- "GitHub uses Sentry to track crashes in Copilot's infrastructure"
- "Engineers use LangSmith to version and test prompts during development"

**If internal development information is unavailable, mark it as "Not Available". Never substitute user features for development practices.**

## Output Terminologies

### Summary

A brief 1-5 sentence overview of the extracted data from the corresponding website(s). Synthesizes information from one or multiple sources. Should be factual and concise.

### Evidence

An array of objects, each containing:

1. **Quote:**

   - EXACT verbatim text from the source (5-50 words)
   - Must be a complete, meaningful statement or sentence
   - Must support the summary with concrete details
   - Must NOT be a file name, URL, or webpage title
   - Copy-pasted exactly as it appears in the source
2. **Citation:**

   - Reference number in format [1], [2], [3], etc.
   - Must correspond to an entry in the References section
   - Each citation must have a real, accessible URL

### Structure

Each field is filled with an **array of objects** containing a query ID (q_id), Summary, and Evidence.

**IMPORTANT:** Every summary object MUST include a unique `q_id` field at the top level (as a sibling to "Summary" and "evidence"). The q_id should follow the format `q_N` where N is an incrementing number starting from 1 for each agent.

**Example:**

```json
"Tools": [{
  "q_id": "q_7",
  "Summary": "The team uses Vitest for unit testing and Playwright for end-to-end evaluation of the agent's browser interactions.",
  "evidence": [
    {
      "quote": "We rely heavily on Playwright to ensure our agent can navigate DOM trees without hallucinating selectors.",
      "citation": "[1]"
    },
    {
      "quote": "Our test suite runs on GitHub Actions with parallel execution across 5 runners.",
      "citation": "[3]"
    }
  ]
}]
```

**Q-ID Assignment Rules:**

1. Start with `q_1` for the Description field
2. Increment sequentially across all SE_Practices categories and fields
3. Each summary object gets exactly one q_id
4. Q-IDs must be unique within each agent's JSON file
5. The q_id field should be placed as the **first field** in each summary object (before "Summary" and "evidence")

## References Section

At the end of your JSON, include a References section with this structure:

```json
"References": {
  "[1]": {
    "Website_Type": "GitHub Repository",
    "Link": "https://github.com/example/agent",
    "Date_Created": "2023-01-15",
    "Date_Pulled": "2024-04-25"
  },
  "[2]": {
    "Website_Type": "Engineering Blog",
    "Link": "https://aws.amazon.com/blogs/devops/example-post",
    "Date_Created": "2023-11-20",
    "Date_Pulled": "2024-04-25"
  },
  "[3]": {
    "Website_Type": "CONTRIBUTING.md",
    "Link": "https://github.com/example/agent/blob/main/CONTRIBUTING.md",
    "Date_Created": "Not Disclosed",
    "Date_Pulled": "2024-04-25"
  }
}
```

**Website_Type Examples:**

- GitHub Repository
- Engineering Blog
- Official Documentation
- CONTRIBUTING.md
- README.md
- GitHub Issue
- Conference Talk (YouTube)
- Technical Paper
- Podcast Transcript
- Developer Forum (Reddit, HN)

## Required JSON Output Format

Return a **complete, valid JSON object** with this exact structure. Do NOT truncate or abbreviate any sections.

```json
{
  "Agent_Name": "{agent_name}",
  "Description": [
    {
      "q_id": "q_1",
      "Summary": "Brief 2-3 sentence description of what the system does: its category (coding agent, chatbot, computer-use agent, CRM/sales agent, enterprise workflow platform, etc.), primary capabilities, and deployment surface (CLI, web app, IDE plugin, API, SaaS).",
      "evidence": [
        {
          "quote": "Exact verbatim sentence from official product page, README, or authoritative source describing the agent's purpose.",
          "citation": "[1]"
        }
      ]
    }
  ],
  "Repository_Statistics": {
    "Lines_of_Code": [
      {
        "Summary": "Estimated 50K+ lines across Python and TypeScript based on repository language breakdown",
        "evidence": [
          {
            "quote": "The repository contains approximately 45,231 lines of Python code and 12,450 lines of TypeScript.",
            "citation": "[1]"
          }
        ]
      }
    ],
    "Stars": [
      {
        "Summary": "14,523 stars on GitHub as of April 2024",
        "evidence": [
          {
            "quote": "14.5k stars",
            "citation": "[1]"
          }
        ]
      }
    ],
    "Contributors": [
      {
        "Summary": "87 contributors to the main repository",
        "evidence": [
          {
            "quote": "87 contributors",
            "citation": "[1]"
          }
        ]
      }
    ],
    "Update_Frequency": [
      {
        "Summary": "Updated weekly with approximately 3-4 releases per month based on release history from Jan-Apr 2024",
        "evidence": [
          {
            "quote": "We publish new releases approximately every 1-2 weeks based on feature completion and testing cycles.",
            "citation": "[2]"
          }
        ]
      }
    ],
    "Primary_Language": [
      {
        "Summary": "Python (75%), TypeScript (20%), other (5%)",
        "evidence": [
          {
            "quote": "Python 75.3%",
            "citation": "[1]"
          }
        ]
      }
    ]
  },
  "SE_Practices": {
    "Testing_and_Reliability": {
      "Practices": [
        {
          "q_id": "q_2",
          "Summary": "Team uses Playwright for end-to-end testing with minimum 80% coverage requirement. All PRs must include tests before merge.",
          "evidence": [
            {
              "quote": "All pull requests must maintain at least 80% test coverage and include Playwright e2e tests for user-facing features.",
              "citation": "[3]"
            },
            {
              "quote": "We run a comprehensive test suite on every commit, including unit tests, integration tests, and end-to-end browser tests.",
              "citation": "[4]"
            }
          ]
        }
      ],
      "Tools": [
        {
          "q_id": "q_3",
          "Summary": "Playwright for e2e testing, Pytest for unit tests, GitHub Actions for CI automation",
          "evidence": [
            {
              "quote": "We rely heavily on Playwright to ensure our agent can navigate DOM trees without hallucinating selectors.",
              "citation": "[4]"
            },
            {
              "quote": "Our test suite runs on GitHub Actions with parallel execution across 5 runners to speed up CI.",
              "citation": "[3]"
            }
          ]
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_4",
          "Summary": "QA engineers and core maintainers review test coverage before merge. Red team conducts adversarial testing quarterly.",
          "evidence": [
            {
              "quote": "All tests must be reviewed by at least one QA engineer before merging to ensure comprehensive coverage.",
              "citation": "[3]"
            }
          ]
        }
      ],
      "Others": [
        {
          "q_id": "q_5",
          "Summary": "Not Available",
          "evidence": []
        }
      ]
    },
    "Integration_and_Infrastructure_CICD": {
      "Practices": [
        {
          "q_id": "q_6",
          "Summary": "...",
          "evidence": [
            {
              "quote": "...",
              "citation": "[X]"
            }
          ]
        }
      ],
      "Tools": [
        {
          "q_id": "q_7",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_8",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Others": [
        {
          "q_id": "q_9",
          "Summary": "...",
          "evidence": []
        }
      ]
    },
    "Code_Review_Process": {
      "Practices": [
        {
          "q_id": "q_10",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Tools": [
        {
          "q_id": "q_11",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_12",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Others": [
        {
          "q_id": "q_13",
          "Summary": "...",
          "evidence": []
        }
      ]
    },
    "Bug_Solving_Approaches": {
      "Issues": [
        {
          "Issue_Title": "Agent fails to handle nested JSON responses",
          "Description": "Parser crashes when LLM returns deeply nested JSON structures exceeding 10 levels of nesting",
          "Citation": "[5]"
        },
        {
          "Issue_Title": "Memory leak in long-running sessions",
          "Description": "Agent consumes excessive memory after 100+ interactions due to improper context cleanup",
          "Citation": "[6]"
        },
        {
          "Issue_Title": "...",
          "Description": "...",
          "Citation": "[X]"
        }
        // ... minimum 10 total issues required
      ],
      "Practices": [
        {
          "q_id": "q_14",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Tools": [
        {
          "q_id": "q_15",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_16",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Others": [
        {
          "q_id": "q_17",
          "Summary": "...",
          "evidence": []
        }
      ]
    },
    "Software_Engineering_Methodology": {
      "Practices": [
        {
          "q_id": "q_18",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Tools": [
        {
          "q_id": "q_19",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_20",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Others": [
        {
          "q_id": "q_21",
          "Summary": "...",
          "evidence": []
        }
      ]
    },
    "Team_Communication": {
      "Practices": [
        {
          "q_id": "q_22",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Tools": [
        {
          "q_id": "q_23",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_24",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Others": [
        {
          "q_id": "q_25",
          "Summary": "...",
          "evidence": []
        }
      ]
    },
    "Holistic_Documentation": {
      "Practices": [
        {
          "q_id": "q_26",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Tools": [
        {
          "q_id": "q_27",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_28",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Others": [
        {
          "q_id": "q_29",
          "Summary": "...",
          "evidence": []
        }
      ]
    },
    "LLM_Integration_and_Prompt_Management": {
      "Practices": [
        {
          "q_id": "q_30",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Tools": [
        {
          "q_id": "q_31",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Stakeholders": [
        {
          "q_id": "q_32",
          "Summary": "...",
          "evidence": []
        }
      ],
      "Others": [
        {
          "q_id": "q_33",
          "Summary": "...",
          "evidence": []
        }
      ]
    }
  },
  "References": {
    "[1]": {
      "Website_Type": "GitHub Repository",
      "Link": "https://github.com/example/agent",
      "Date_Created": "2023-01-15",
      "Date_Pulled": "2024-04-25"
    },
    "[2]": {
      "Website_Type": "Engineering Blog",
      "Link": "https://example.com/engineering/release-process",
      "Date_Created": "2023-11-20",
      "Date_Pulled": "2024-04-25"
    },
    "[3]": {
      "Website_Type": "CONTRIBUTING.md",
      "Link": "https://github.com/example/agent/blob/main/CONTRIBUTING.md",
      "Date_Created": "Not Disclosed",
      "Date_Pulled": "2024-04-25"
    },
    "[4]": {
      "Website_Type": "Conference Talk (YouTube)",
      "Link": "https://youtube.com/watch?v=example",
      "Date_Created": "2024-03-10",
      "Date_Pulled": "2024-04-25"
    }
    // ... all citations [1] through [N] must have entries
  }
}
```

**IMPORTANT OUTPUT REQUIREMENTS:**

1. **Complete Structure:** All sections must be present, even if marked "Not Available"
2. **Valid JSON:** Must be parsable JSON with proper syntax (commas, braces, quotes)
3. **No Truncation:** Do not cut off the JSON - include all sections fully
4. **Minimum 10 Issues:** Bug_Solving_Approaches must have at least 10 issues
5. **All 7 Areas:** All SE_Practices areas must be populated with all 4 subsections each
6. **Complete References:** Every citation [1], [2], etc. must have a References entry
7. **Verbatim Quotes:** All quotes must be exact text from sources
8. **Real URLs:** All Links must be real, accessible URLs (no made-up paths)
9. **Q-ID Required:** Every summary object (Description and all SE_Practices fields) must include a `q_id` field in format `q_N` (starting from q_1), placed as the first field before "Summary" and "evidence"

## Common Pitfalls to Avoid

### Pitfall 1: Confusing Product Features with Development Practices

**WRONG:**

```json
{
  "Summary": "Amazon Q uses AI to provide code suggestions",
  "evidence": [{"quote": "Amazon Q helps developers write code faster", "citation": "[1]"}]
}
```

**CORRECT:**

```json
{
  "q_id": "q_15",
  "Summary": "Amazon Q team uses automated testing with 80% coverage requirement",
  "evidence": [{"quote": "All pull requests must maintain at least 80% test coverage before merge", "citation": "[1]"}]
}
```

### Pitfall 2: Using Non-Quote Text as Evidence

**WRONG:**

```json
{
  "evidence": [
    {"quote": "README.md", "citation": "[1]"},           // File name
    {"quote": "GitHub Actions", "citation": "[2]"},      // Tool name only
    {"quote": "https://github.com/...", "citation": "[3]"} // URL
  ]
}
```

**CORRECT:**

```json
{
  "evidence": [
    {"quote": "We use GitHub Actions for continuous integration with automated test runs on every commit.", "citation": "[1]"}
  ]
}
```

### Pitfall 3: Paraphrasing Instead of Verbatim Quotes

**WRONG (paraphrased):**

```json
{
  "quote": "They use two-week sprints for development",
  "citation": "[1]"
}
```

**CORRECT (verbatim from source):**

```json
{
  "quote": "Our team operates on two-week sprint cycles with weekly stand-ups and bi-weekly retrospectives",
  "citation": "[1]"
}
```

### Pitfall 4: Making Up Information to Fill Gaps

**WRONG (hallucinated):**

```json
{
  "Summary": "Team uses Jira for issue tracking",
  "evidence": [{"quote": "Jira is used for tracking bugs", "citation": "[1]"}]
}
// When this was never actually stated in source [1]
```

**CORRECT (honest about gaps):**

```json
{
  "Summary": "Not Available",
  "evidence": []
}
```

### Pitfall 5: Stopping at GitHub Only

**WRONG APPROACH:**

- Only searches GitHub repository
- Only reads README and issues
- Stops after 13 GitHub references
- Misses blog posts, talks, papers

**CORRECT APPROACH:**

- Searches GitHub repository AND external sources
- Reads README, issues, AND engineering blogs
- Finds 15-20+ references including external sources
- Includes AWS blogs, YouTube talks, technical papers

### Pitfall 6: Guessing URL Paths

**WRONG (guessed URL):**

```json
{
  "Link": "https://github.com/example/agent/blob/main/TESTING.md"
}
// When you haven't verified this file actually exists
```

**CORRECT (verified URL):**

```json
{
  "Link": "https://github.com/example/agent/blob/main/CONTRIBUTING.md"
}
// After actually navigating to this page and confirming it exists
```

### Pitfall 7: Incomplete JSON Structure

**WRONG (missing sections):**

```json
{
  "Agent_Name": "Example Agent",
  "SE_Practices": {
    "Testing_and_Reliability": {
      "Practices": [{"Summary": "...", "evidence": []}]
      // Missing: Tools, Stakeholders, Others
    }
  }
}
```

**CORRECT (complete structure):**

```json
{
  "Agent_Name": "Example Agent",
  "Description": [
    {
      "q_id": "q_1",
      "Summary": "Example Agent is an open-source coding agent that assists developers with code generation, refactoring, and debugging through an IDE plugin and CLI interface.",
      "evidence": [
        {
          "quote": "Example Agent is an AI-powered coding assistant that integrates directly into your IDE to help you write, review, and fix code.",
          "citation": "[1]"
        }
      ]
    }
  ],
  "SE_Practices": {
    "Testing_and_Reliability": {
      "Practices": [{"q_id": "q_2", "Summary": "...", "evidence": []}],
      "Tools": [{"q_id": "q_3", "Summary": "...", "evidence": []}],
      "Stakeholders": [{"q_id": "q_4", "Summary": "...", "evidence": []}],
      "Others": [{"q_id": "q_5", "Summary": "Not Available", "evidence": []}]
    }
  }
}
```

### OUTPUT FORMAT REQUIREMENT:

Your final output MUST be **ONLY the JSON structure**, starting with `{` and ending with `}`.

**NO markdown code blocks, NO explanatory text before or after the JSON.**

The JSON must include:

- Agent_Name
- Description (agent category, capabilities, and deployment surface)
- Repository_Statistics (with complete evidence arrays for ALL metrics)
- SE_Practices (ALL 7 areas populated with Practices, Tools, Stakeholders, Others subsections)
- Bug_Solving_Approaches.Issues (MINIMUM 10 issues, each with title, description, citation)
- References (every citation [1], [2], etc. must have an entry)

If you cannot find information for a section, mark it as "Not Available" but the structure MUST be complete.

**Begin your research now for: {agent_name}**
