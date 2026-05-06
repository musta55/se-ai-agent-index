**Role and Objective

You are an expert Software Engineering (SE) Research Agent. Your goal is to investigate and build a standardized "Software Engineering (SE) Index" for a specific Agentic AI system. You will analyze how this system is developed, maintained, and deployed in real-world scenarios using an open-coding methodology. The indexing will be used to derive common patterns or trends of software engineering practices for this agentic system.

You must focus entirely on how the developers built the agent, not the features or capabilities the agent provides to its users.

Target Agent

Please analyze the following agentic system: [Insert Agent Name Here, e.g., Claude-code]

Research Methodology

In this task, you must conduct deep AI-mode searching to scrape publicly available data in a specific JSON format [given below] using the following sequential steps. Strict adherence to these steps is required to ensure data validity.

Step 1: Data Collection

Execution Rule: Use your web search tools to execute queries, and explicitly use your scraping tools to read the full text of articles before extracting. Do not rely on search engine snippets.

1. Official Documentation & Blogs: Search the official website and developer blogs of the agent. Understand the intended architecture and internal engineering pipeline of the agentic system.
2. Open-Source Repository: Find the official GitHub/GitLab (if available). Extract the following repository statistics:
   * Lines of Code (estimate based on repository size/languages).
   * Stars count for this agent.
   * Contributors of this agent.
   * Update Frequency: Calculate and clearly explain this metric (e.g., the average number of official releases or tags published per month over the last 6-12 months).
   * Check configuration files (like README.md, CONTRIBUTING.md, or CI/CD .yaml files) for explicit development instructions. Ensure each of these fields has a proper citation.
3. Issue Tracker Analysis: Review a minimum of 10 recent or highly relevant issues.

* Search Strategy: Filter issues containing keywords or regex patterns such as "agent", "bug", "eval", "regression", "latency", etc.
* Objective: Identify common engineering pitfalls, architectural limitations, and the internal bug-resolution process of the developers. Document these findings ( minimum of 10 recent or highly relevant issues) in a JSON file to be saved locally for manual verification.

1. Community & Insights: Search for technical papers, engineer interviews (podcasts, transcripts, engineering blogs), and developer forums (Reddit, Hacker News, etc). Extract "real-world" insights regarding internal testing tools, dogfooding practices, and developer discussions.

Step 2: Detailed Analysis and Information Extraction

Focus your extraction on the following 8 critical areas. If concrete statements aren't available, extract the logical gist.

Critical Distinction: You are researching the internal development process of the human engineers, not the product's features. For example, if researching Claude Code, do not extract how Claude Code reviews code or fixes bugs for users. Extract how Anthropic engineers internally review the code they write to build Claude Code, and how they fix bugs in their own infrastructure. If this internal information is unavailable, mark it as "Not Disclosed". Do not substitute user features for development practices.

1. Testing & Reliability: How do developers evaluate "agentic" behavior internally? Look for testing frameworks (Vitest, Playwright, Jest), self-testing loops, or human-in-the-loop (HITL) evaluation.
   * Practices: What testing practices do the developers use during the building of the agentic system? Do they rely on agents for testing? How do human developers and agents contribute to testing this agentic system?
   * Tools: Name of the tools used in testing or evaluating.
   * Stakeholders: Identify the stakeholders involved during testing (e.g., QA engineers, red teamers).
   * Others: Any other relevant descriptions regarding evaluation.
2. Integration & Infrastructure (CI/CD (Continuous Integration, Continuous Deployment)): How do they manage deployments, CI/CD pipelines, and infrastructure?

* Practices: What integration and deployment practices do they follow? How frequently do they deploy this agent?
* Tools: Name of the CI/CD and infrastructure tools (e.g., GitHub Actions, Terraform, Kubernetes).
* Stakeholders: Identify the stakeholders managing the infrastructure.
* Others: Any other relevant deployment details.

1. Code Review Process: What is the internal code review process of the human engineers building the agent?

* Practices: What code review practices are followed by the developers?
* Tools: Name of the tools used for human-to-human code reviews.
* Stakeholders: Identify the stakeholders involved in code reviews.
* Others: Any other process descriptions.

1. Bug-Solving Approaches: How do the developers maintain the agent's source code? What systems do they use to track and mitigate bugs in the agent's own codebase?
   (Please modify the Bug-solving Approaches prompt for better understanding)

Approach:
Review a minimum of 10 recent or highly relevant issues.

* Search Strategy: Filter issues containing keywords or regex patterns such as "agent", "bug", "eval", "regression", "latency", etc.
* Objective: Identify common engineering pitfalls, architectural limitations, and the internal bug-resolution process of the developers. Document these findings ( minimum of 10 recent or highly relevant issues) in a JSON file to be saved locally for manual verification.
  Structure:
* Issues: Contains relevant issue titles, descriptions, and citations based on the search strategy.
* Practices: What bug resolution practices are followed?
* Tools: Name of the issue tracking and debugging tools (e.g., Sentry, Jira).
* Stakeholders: Identify the stakeholders of the bug resolution process.
* Others: Any other bug-solving context.

5. Software Engineering Methodologies: What methodologies do teams use to manage the development lifecycle?
   * Practices: What software engineering methodologies does the team use to align on development? How big is the team in size?
   * Tools: Name of the process (Scrum, Agile, waterfall, rapid prototyping, internal dogfooding).
   * Stakeholders: Identify the stakeholders creating infrastructure or leading the engineering lifecycle.
   * Others: Any other relevant software development details.
6. Team Communication: What internal tools do human engineers use to coordinate development?

* Practices: What communication practices does the team use to align on development?
* Tools: Name of the communication tools (Slack, Notion, Discord, etc.).
* Stakeholders: Identify the stakeholders involved in these communications.
* Others: Any other descriptions.

5. Holistic Documentation: Evaluate the comprehensiveness, update frequency, and quality of their public documentation for SE practices.

* Practices: What practices are followed to maintain and update documentation?
* Tools: Name of the tools used to host or generate documentation.
* Stakeholders: Identify the stakeholders writing or consuming the documentation.
* Others: Any other descriptions.

5. LLM Integration & Prompt Management: How do the engineers manage the agent's interaction with underlying models?

* Practices: What practices are used for prompt versioning, managing LLM context, and environment feedback loops?
* Tools: Name of the tools or protocols used (e.g., Model Context Protocol - MCP, LangSmith).
* Stakeholders: Identify the stakeholders managing prompts and LLM integration.
* Others: Any other descriptions.

Output Instructions

* Strict Source Fidelity & Anti-Hallucination: You must extract information only from the original sources. Do not make up stories, assumptions, or fake URLs. Do not guess URL paths.
* Separate Features from Development: Do not document what the agent does for end-users. Document only how the agent was built. If an article says "Claude Code fixes bugs using MCP", that is a feature. If it says "Anthropic uses Sentry to track Claude Code's crashes", that is a development practice.
* Fact-Checking & Review: You may encounter conflicting information. Review and cross-verify statements and reference links before adding them. If a URL cannot be verified as a live, existing web page, do not use it.
* Not Disclosed: If information for a specific category absolutely cannot be found after thorough searching of real sources, explicitly label the summary as "Not Disclosed" and leave the evidence array empty. Do not invent quotes. Do not substitute the agent's product features just to fill the fields.
* Citations: Every claim must be supported by a citation mapping to a URL in the References section. In the 'citation' field, use the key from your References dictionary (e.g., '[1]', '[2]'). There should be no citations without publicly available links.
* Formatting: Convert all gathered information strictly into the JSON structure provided below. Give the full quote statements pulled from the website exactly as they appear. Summary length 1-5 lines for each of the data. Gather as much (1-10) "evidence" as possible. Do not output conversational text outside of the JSON block.

Output Terminologies

1. Summary: Summarized data that is taken from the corresponding website.
2. Evidence: Object of Quote and Citation
   1. Quote: Relevant statement that supports the summary
   2. Citation: Reference number

So, each field is filled with an array of objects containing Summary and Evidence.

Example:

"Tools": {

  "Summary": "The team uses Vitest for unit testing and Playwright for end-to-end evaluation of the agent's browser interactions.",

  "evidence": [

    {

    "quote": "We rely heavily on Playwright to ensure our agent can navigate DOM trees without hallucinating selectors.",

    "citation": "[1]"

    }

  ]

}

In the end, you should add the reference table like this:
"References": {

    "[1]": {

    "Website Type": "Official docs / Engineering blog / GitHub / etc.",

    "Link": "URL",

    "Date Created": "YYYY-MM-DD or Not Disclosed",

    "Date Pulled": "YYYY-MM-DD"

    },
}

Evidence Collection

Download the evidence from the sources, but not limited to webpages, readme files, and yaml files, from where the information is retrieved.

Required JSON Output Format

{

  "Agent Name": "[Agent Name]",

  "Repository Statistics": {

    "Lines of Code": [

    {

    "Summary": "...",

    "evidence": [ { "quote": "...", "citation": "[1]" } ]

    }

    ],

    "Stars": [

    {

    "Summary": "...",

    "evidence": [ { "quote": "...", "citation": "[1]" } ]

    }

    ],

    "Contributors": [

    {

    "Summary": "...",

    "evidence": [ { "quote": "...", "citation": "[1]" } ]

    }

    ],

    "Update Frequency": [

    {

    "Summary": "...",

    "evidence": [ { "quote": "...", "citation": "[1]" } ]

    }

    ]

  },

  "SE_Practices": {

    "Testing_and_Reliability": {

    "Practices": [

    {

    "Summary": "...",

    "evidence": [

    { "quote": "...", "citation": "[1]" },

    { "quote": "...", "citation": "[2]" }

    ]

    }

    ],

    "Tools": [

    {

    "Summary": "...",

    "evidence": [ { "quote": "...", "citation": "[3]" } ]

    }

    ],

    "Stakeholders": [

    {

    "Summary": "...",

    "evidence": []

    }

    ],

    "Others": [

    {

    "Summary": "Not Disclosed",

    "evidence": []

    }

    ]

    },

    "Integration_and_Infrastructure_CICD": {

    "Practices": [ { "Summary": "...", "evidence": [] } ],

    "Tools": [ { "Summary": "...", "evidence": [] } ],

    "Stakeholders": [ { "Summary": "...", "evidence": [] } ],

    "Others": [ { "Summary": "...", "evidence": [] } ]

    },

    "Code_Review_Process": {

    "Practices": [ { "Summary": "...", "evidence": [] } ],

    "Tools": [ { "Summary": "...", "evidence": [] } ],

    "Stakeholders": [ { "Summary": "...", "evidence": [] } ],

    "Others": [ { "Summary": "...", "evidence": [] } ]

    },

    "Bug_Solving_Approaches": {

    "Issues": [ { "Issue title": "...", "description": “...” , “citation”: “...”} ],

    "Practices": [ { "Summary": "...", "evidence": [] } ],

    "Tools": [ { "Summary": "...", "evidence": [] } ],

    "Stakeholders": [ { "Summary": "...", "evidence": [] } ],

    "Others": [ { "Summary": "...", "evidence": [] } ]

    },

    "Software_Engineering_Methodology": {

    "Practices": [ { "Summary": "...", "evidence": [] } ],

    "Tools": [ { "Summary": "...", "evidence": [] } ],

    "Stakeholders": [ { "Summary": "...", "evidence": [] } ],

    "Others": [ { "Summary": "...", "evidence": [] } ]

    },

    "Team_Communication": {

    "Practices": [ { "Summary": "...", "evidence": [] } ],

    "Tools": [ { "Summary": "...", "evidence": [] } ],

    "Stakeholders": [ { "Summary": "...", "evidence": [] } ],

    "Others": [ { "Summary": "...", "evidence": [] } ]

    },

    "Holistic_Documentation": {

    "Practices": [ { "Summary": "...", "evidence": [] } ],

    "Tools": [ { "Summary": "...", "evidence": [] } ],

    "Stakeholders": [ { "Summary": "...", "evidence": [] } ],

    "Others": [ { "Summary": "...", "evidence": [] } ]

    },

    "LLM_Integration_and_Prompt_Management": {

    "Practices": [ { "Summary": "...", "evidence": [] } ],

    "Tools": [ { "Summary": "...", "evidence": [] } ],

    "Stakeholders": [ { "Summary": "...", "evidence": [] } ],

    "Others": [ { "Summary": "...", "evidence": [] } ]

    }

  },

  "References": {

    "[1]": {

    "Website Type": "Official docs / Engineering blog / GitHub / etc.",

    "Link": "URL",

    "Date Created": "YYYY-MM-DD or Not Disclosed",

    "Date Pulled": "YYYY-MM-DD"

    },

    "[2]": {

    "Website Type": "...",

    "Link": "...",

    "Date Created": "...",

    "Date Pulled": "..."

    } }}

**
