# Open-coding codebook: Practices items

Scope: rows of the **Agreement Index** tab where `sub_dimension` is Practices. That is 273 items across 14 agents and 7 SE dimensions.

## Method

1. **Open coding.** Each item gets one to four short descriptive codes taken from its own wording. When an item means the same as an earlier one, the earlier code is reused (constant comparison), so similar practices share a code across agents.
2. **Categories, scoped to a dimension (round 5).** Each SE dimension has its own set of categories, and each category names one *approach* to that dimension that an agent's team either shows or does not show. A code belongs to exactly one category within each dimension it is used in, so the same code can sit in different categories in different dimensions (for example `staged rollout` is *Progressive exposure and rollback* in CI/CD but *Dogfooding and live-user validation* in Testing).
3. **Patterns.** For each (dimension, category) the Categories tab counts how many of the 14 agents have at least one item coded with it. That supports statements of the form "in code review, *k* of 14 agents …".

The scheme lives in `open_coding_categories.json`: for each dimension, its categories, their meanings and their codes.

## Where things are

- **Agreement Index L–O** (`annotation_1` … `annotation_4`): one code per cell, at most four per item. **P** holds the memo. The categories never touch this tab.
- **Codebook tab** (it feeds the L–O dropdowns from column A):
  - A code; B live use count;
  - C–I the code's category in each dimension (Code review, CI/CD, Testing, Bug solving, SE methodology, Developer communication, Documentation). The cell is blank where the code is not used in that dimension;
  - J the item ids that use the code.
- **Categories tab**: one row per (dimension, category). Columns: meaning; a live count of codes; items; agents (of 14); agents counting only agent-specific items (items where neither Company nor Marketing piece is yes); agents per group (chat of 5, browser of 3, enterprise of 6); then one column per agent with its item count, shaded when it is above zero.
- **Codebook-r4**: the round-4 codebook (17 cross-dimension categories), kept for reference.
- **Adding a code:** type it below the last row of Codebook column A, then add it to a category in `open_coding_categories.json` and re-run the category script. Until then it shows as `(uncategorised)`.

## Coding rules

- Code only what the item text says. If a code depends on another item or on the quote, say so in the memo.
- At most four codes per item. If an item names more practices, keep the four most specific ones and note the rest in the memo.
- Reuse an existing code before making a new one. Keep codes general enough to recur: "unit tests", not "Vitest".
- Code absent practices too (`no automated ci`, `no formal pr review`). Each dimension has a category for the absence where the data shows one.
- A category must separate agents. A category that nearly every agent has, or that only restates the dimension (such as "release and rollout" for CI/CD), says nothing about differences between agents. Split it into approaches.

## Categories by dimension

Agents (of 14) counts agents with at least one item in that category; the number in brackets leaves out company-wide and marketing items.

### Code review

| Category | Meaning | Codes | Agents (of 14) | Which agents |
|---|---|---|---|---|
| AI agent reviews PRs | An AI agent produces review comments on pull requests, including the agent reviewing its own product's code and engineered AI reviewers (multi-agent, judge-filtered, ranked findings, custom-trained, tuned on developer feedback). | `ai code review`, `ai code review on every pr`, `agent reviews its own codebase`, `multi-agent review`, `judge agent filters ai review`, `ai review findings aggregated and prioritised`, `custom-trained review model`, `developer feedback improves ai reviewer` | 6 (3 agent-specific) | Claude Code, Codex, Gemini CLI, Glean, HubSpot, n8n |
| Human approval gate | A person must approve before merge: mandatory peer review, human merge approval, code owners, readability approval, careful human review of critical code. | `mandatory human code review`, `human merge approval`, `human review for critical code`, `code owners`, `readability certification` | 6 (3 agent-specific) | Claude Code, Codex, Gemini, Gemini Ent., watsonx, n8n |
| Human accountable for AI-assisted changes | Rules for how people handle AI output in review: resolve the AI review before asking a colleague, author must understand and own AI-written code, disclose AI use; includes the review load this creates. | `ai review before human review`, `review overload`, `author accountability for code`, `ai-use disclosure` | 2 (2 agent-specific) | Codex, n8n |
| Codified reviewer guidelines | Written rules for reviewers: approval standard (code health), non-blocking nits, response-time targets, review rubric and style authority, review as mentoring. | `code-health approval standard`, `non-blocking review comments`, `response-time targets`, `review rubric and style authority`, `review as knowledge sharing` | 4 (1 agent-specific) | Gemini CLI, Gemini, Gemini Ent., n8n |
| Small, self-describing changes | Rules for what a submitted change looks like: small single-purpose PRs, motivation in the PR body, commit and title conventions, tests included, contributor agreement. | `small single-purpose changes`, `descriptive pr descriptions`, `structured commit and pr title convention`, `tests required with change`, `contributor license agreement`, `modular architecture`, `generated docs and release notes` | 6 (4 agent-specific) | Codex, Gemini CLI, Gemini, Gemini Ent., watsonx, n8n |
| Automated checks before review | Machine checks run before a human or AI reviews: pre-commit hooks, lint and type checks, agent evaluation on each PR, recurring review comments turned into lint rules. | `pre-commit and presubmit checks`, `lint and static checks`, `agent eval on every pr`, `review findings turned into lint rules` | 2 (1 agent-specific) | Claude Code, Browser Use |
| Security and incident review | Review led by a security team or held after an incident, rather than routine PR review. | `security review and pen-testing`, `post-mortem review`, `public incident report` | 1 (1 agent-specific) | Opera Neon |
| No formal review | Evidence that changes are not reviewed through PRs: maintainers commit directly, no review policy. | `no formal pr review`, `direct commits by maintainers` | 1 (1 agent-specific) | Alibaba |

### CI/CD

| Category | Meaning | Codes | Agents (of 14) | Which agents |
|---|---|---|---|---|
| CI checks on every change | Automated lint, build and test runs on each push or PR, including cross-platform matrices, presubmits, a single merge-blocking gate, split pre-/post-merge checks and agent evals in CI. | `ci on every pr`, `lint and static checks`, `cross-platform test matrix`, `pre-commit and presubmit checks`, `pre-merge vs post-merge checks`, `single merge-blocking ci gate`, `agent eval on every pr`, `nightly scheduled test runs`, `trunk-based development`, `large-scale automated code changes` | 5 (4 agent-specific) | Codex, Gemini CLI, Browser Use, Gemini Ent., n8n |
| Isolated, least-privilege execution | CI jobs or agent runs are isolated from secrets and the host: least-privilege workflow permissions, secret-free fork CI, sandboxed agent execution. | `least-privilege ci`, `sandboxed execution` | 3 (3 agent-specific) | Opera Neon, Browser Use, n8n |
| Build and agent-run infrastructure | Investment in the machinery that builds code or runs agents at scale: build clusters and caches, queue-and-worker agent runners, cloud coding agents, local dev servers, redesigns of that infrastructure. | `build and execution infrastructure`, `cloud coding agents`, `architectural redesign`, `local developer environment` | 3 (2 agent-specific) | Browser Use, HubSpot, watsonx |
| Automated release pipeline | Releases are built and published by automation: tag- or PR-triggered publishing, continuous deployment, package-manager distribution. | `automated release pipeline`, `continuous deployment`, `package-manager distribution` | 6 (6 agent-specific) | Codex, Gemini CLI, Browser Use, Glean, Gemini Ent., n8n |
| Manual steps or no CI | Release or verification still needs a manual trigger, or no automated CI exists. | `manual release trigger`, `no automated ci` | 2 (2 agent-specific) | Gemini CLI, Alibaba |
| High-frequency releases | A stated release cadence of daily to every few weeks. | `frequent release cadence` | 6 (6 agent-specific) | Claude Code, Codex, Gemini CLI, Comet, watsonx, n8n |
| Internal-first release | The team or company uses a build internally (including running the agent on its own operations) before external users get it. | `internal-first release`, `agent tests its own product` | 4 (2 agent-specific) | Claude Code, Codex, Kimi, Glean |
| Progressive exposure and rollback | Limiting who gets a change and undoing it fast: staged or invite-only rollout, feature flags, one-click or config rollback. | `staged rollout`, `feature flags`, `fast rollback` | 6 (4 agent-specific) | Codex, Gemini, Opera Neon, Glean, Gemini Ent., n8n |
| Versioning and release communication | Version and compatibility rules, and publishing what each release contains: release notes, worklogs, generated or bilingual release docs. | `versioning and compatibility policy`, `public release notes`, `published operational worklog`, `generated docs and release notes`, `bilingual docs` | 5 (4 agent-specific) | Gemini, Kimi, Comet, Gemini Ent., n8n |
| Not a practice | Definitions and product events coded for completeness; excluded from pattern counts. | `product renaming` | 1 (0 agent-specific) | Gemini Ent. |

### Testing

| Category | Meaning | Codes | Agents (of 14) | Which agents |
|---|---|---|---|---|
| Conventional test suites | Deterministic unit, integration, end-to-end, UI, performance and cross-platform tests, and how they are organised (test strategy, guidelines, framework migration, hermetic tests). | `unit tests`, `integration tests`, `end-to-end tests`, `integration-first testing`, `user-focused ui tests`, `cross-platform test matrix`, `performance, memory and stress tests`, `hermetic tests`, `testing guidelines`, `test framework migration` | 7 (5 agent-specific) | Claude Code, Gemini CLI, Alibaba, Browser Use, Gemini Ent., HubSpot, n8n |
| Controlling LLM non-determinism | Techniques that make tests of LLM-based code repeatable: mocked model responses, retries and deflake runs, repeated eval runs with statistics. | `mocked llm responses in tests`, `flaky-test handling`, `repeated eval runs` | 5 (4 agent-specific) | Codex, Gemini CLI, Kimi, Browser Use, n8n |
| Automated test execution | Where and when tests run: on every PR, split pre-/post-merge, nightly, in parallel, in sandboxes or local dev servers, with eval cost limits; includes having no CI. | `ci on every pr`, `pre-merge vs post-merge checks`, `agent eval on every pr`, `parallel test and eval runs`, `nightly scheduled test runs`, `lint and static checks`, `build and execution infrastructure`, `eval cost management`, `sandboxed execution`, `local developer environment`, `no automated ci` | 7 (6 agent-specific) | Codex, Gemini CLI, Alibaba, Browser Use, Gemini Ent., watsonx, n8n |
| Agent tests its own product | The agent runs the product's tests, clicks through the app, or hunts for bugs in its own codebase; the codebase is laid out so it can. | `agent tests its own product`, `agent finds and fixes its own bugs`, `agent-runnable tests`, `agent context files`, `nightly scheduled agent runs`, `modular architecture` | 2 (2 agent-specific) | Codex, n8n |
| Benchmark and eval-suite evaluation | The agent or model is scored on eval suites: internal eval frameworks, public or third-party benchmarks, single/multi-turn and trajectory evals, simulated users, eval sets from real user data, eval metrics and eval-driven fixes. | `internal eval framework`, `benchmark evaluation`, `third-party evaluation`, `single- and multi-turn evals`, `tests verify agent outcome`, `trajectory evaluation`, `simulated user conversations before release`, `eval metrics design`, `eval set from real user data`, `eval-driven improvement loop`, `public model cards and research papers` | 10 (7 agent-specific) | Claude Code, Codex, Gemini, Kimi, Alibaba, Browser Use, Glean, HubSpot, watsonx, n8n |
| LLM-as-judge grading | A model grades the agent's output or labels the eval data. | `llm-as-judge`, `llm-labelled eval data` | 2 (2 agent-specific) | Claude Code, Browser Use |
| Dogfooding and live-user validation | Quality is judged from real use before or after general release: internal dogfooding, A/B tests, early access or preview stages, SLO gates on a limited release, user and community reports. | `internal dogfooding`, `internal user feedback`, `a/b testing in production`, `staged rollout`, `slo-based quality gates`, `usage data guides development`, `community bug reports` | 7 (6 agent-specific) | Claude Code, Codex, Gemini, Kimi, Opera Neon, Alibaba, Gemini Ent. |
| Runtime tracing and monitoring | Traces, step-level debugging, token and cost tracking of agent runs, and runtime self-checks. | `tracing and monitoring`, `cost and token observability`, `runtime validation and recovery` | 3 (3 agent-specific) | Browser Use, Gemini Ent., watsonx |
| Adversarial and security testing | Red-teaming, attack benchmarks, pen-tests and bug bounties, with failures fed back into training. | `red-teaming and adversarial testing`, `security review and pen-testing`, `bug bounty program`, `failures fed back into training` | 4 (4 agent-specific) | Gemini, Opera Neon, Comet, watsonx |
| Human test sign-off | People confirm quality: bug bashes, manual test steps or screenshots in the PR, regression test required with a fix, author sign-off, a review board. | `team bug bashes`, `test evidence in pr`, `tests required with change`, `author accountability for code`, `responsibility review board` | 3 (3 agent-specific) | Codex, Gemini, n8n |
| Not a practice | Definitions and product events coded for completeness; excluded from pattern counts. | `eval definition` | 1 (0 agent-specific) | Claude Code |

### Bug solving

| Category | Meaning | Codes | Agents (of 14) | Which agents |
|---|---|---|---|---|
| Structured public issue tracking | Bugs go through a public tracker with forms, templates, labels or a roadmap view. | `public issue tracker`, `structured issue templates`, `issue labels`, `issue-based roadmap` | 6 (6 agent-specific) | Claude Code, Codex, Gemini CLI, Browser Use, Glean, n8n |
| Bot or AI triage | Automation triages issues: AI duplicate detection, stale-issue closing, bot-driven assignment. | `ai issue triage`, `stale issue and assignment automation`, `bot-driven issue assignment` | 3 (3 agent-specific) | Claude Code, Codex, Gemini CLI |
| Routing to owning teams | Confirmed bugs are routed to the team that owns the area, or tracked in an internal ticket system. | `issue routing to owners`, `cross-team coordination` | 2 (2 agent-specific) | Gemini, n8n |
| Community-assisted diagnosis | Reporters and community members supply reproduction logs, root-cause analysis or first-line support. | `community bug reports`, `community root-cause analysis`, `community support channels`, `logs shared for reproduction` | 3 (3 agent-specific) | Codex, Alibaba, watsonx |
| Agent finds and fixes bugs | The agent hunts for bugs, plans or drafts fixes, and engineers review what it produced. | `agent finds and fixes its own bugs`, `nightly scheduled agent runs`, `plan-first with agent`, `human oversight of agent output` | 2 (1 agent-specific) | Codex, HubSpot |
| Vulnerability intake and fast patching | Security bugs come through bug bounty or disclosure programs and are patched quickly; attacks are turned into training data. | `bug bounty program`, `vulnerability disclosure process`, `rapid security fix deployment`, `failures fed back into training` | 3 (2 agent-specific) | Opera Neon, Comet, Gemini Ent. |
| Incident response and rollback | Production failures are traced, rolled back or recovered automatically. | `incident response`, `fast rollback`, `tracing and monitoring`, `runtime validation and recovery` | 3 (2 agent-specific) | Codex, Kimi, HubSpot |
| Public fix communication | Fixes, incidents and their redesigns are reported publicly: release notes, incident write-ups, engineering blog. | `public release notes`, `public incident report`, `public engineering blog`, `architectural redesign` | 5 (5 agent-specific) | Codex, Browser Use, Gemini Ent., watsonx, n8n |
| Best-effort, untriaged handling | No SLA, labels or assignees; maintainers fix what they can, sometimes by direct commit. | `best-effort issue response`, `no issue triage labels`, `direct commits by maintainers` | 1 (1 agent-specific) | Alibaba |
| Bug patterns (not a practice) | Categories of bugs reported for the agent; kept so failure types can be compared across agents. | `bug pattern: agent loop and model handling`, `bug pattern: api and contract mismatch`, `bug pattern: concurrency and lifecycle`, `bug pattern: configuration and environment`, `bug pattern: input and data handling`, `bug pattern: resource and dependency leaks`, `bug pattern: security and privacy`, `bug pattern: version and platform regressions` | 7 (7 agent-specific) | Codex, Gemini CLI, Browser Use, Glean, Gemini Ent., watsonx, n8n |

### SE methodology

| Category | Meaning | Codes | Agents (of 14) | Which agents |
|---|---|---|---|---|
| Agents do the development work | Engineers develop the product with AI agents: the agent writes most code, engineers plan with and manage agents, AI is mandatory in daily work, agent runs are monitored, repos ship agent config. | `agent writes its own product code`, `engineers manage agents`, `plan-first with agent`, `ai tools in daily workflow`, `agent context files`, `ai code review`, `human oversight of agent output`, `tracing and monitoring`, `cost and token observability` | 4 (2 agent-specific) | Claude Code, Codex, HubSpot, n8n |
| Dogfooding-driven development | What gets built is steered by the team's own use of the agent and by usage data. | `internal dogfooding`, `agent runs team's own operations`, `internal user feedback`, `usage data guides development`, `rapid iteration on feedback` | 4 (2 agent-specific) | Claude Code, Kimi, Browser Use, Glean |
| Prototype- and experiment-first | Many quick prototypes or experiments instead of up-front specs; ship, learn, fix forward. | `rapid prototyping and iteration`, `experiment-driven development`, `start permissive then restrict`, `fix forward` | 6 (4 agent-specific) | Claude Code, Codex, Opera Neon, Browser Use, Glean, HubSpot |
| Eval-driven development | A develop-evaluate-refine loop where eval results decide the next change. | `eval-driven improvement loop`, `trajectory evaluation` | 2 (2 agent-specific) | Browser Use, watsonx |
| Research-gated releases | Each version follows a research milestone and ships with a paper or tech report. | `research-gated releases`, `public model cards and research papers`, `per-version readme` | 2 (2 agent-specific) | Opera Neon, Alibaba |
| Trunk-based monorepo workflow | One repository and trunk, short branches, small changes gated by presubmits, large-scale automated changes, shared dev tooling. | `trunk-based development`, `monorepo`, `small single-purpose changes`, `pre-commit and presubmit checks`, `large-scale automated code changes`, `branch per ticket`, `build and execution infrastructure` | 5 (4 agent-specific) | Codex, Gemini CLI, Gemini Ent., watsonx, n8n |
| Release-train discipline | Methodology defined by how releases flow: fixed cadence, internal-first, feature flags, semantic versioning and compatibility. | `frequent release cadence`, `internal-first release`, `feature flags`, `versioning and compatibility policy` | 4 (4 agent-specific) | Claude Code, Glean, Gemini Ent., n8n |
| Small autonomous flat teams | Two-to-four-person teams, one engineer title, ideas bottom-up, broad goals set from the top. | `small autonomous teams`, `flat roles`, `bottom-up decision-making`, `organisational goal-setting` | 4 (0 agent-specific) | Claude Code, Codex, HubSpot, n8n |
| Defined roles and planned cadence | Named roles, sprints and recurring structured meetings with post-mortems. | `defined roles`, `two-week sprints`, `structured team meetings`, `post-mortem review` | 2 (0 agent-specific) | Gemini, n8n |
| Stated design principles | Published principles for the agent's design, including security-first and human-in-the-loop design and redesigns that follow them. | `agent design principles`, `architectural redesign`, `security-first design`, `human approval for sensitive actions`, `sandboxed execution` | 5 (3 agent-specific) | Codex, Gemini CLI, Opera Neon, Comet, Browser Use |

### Developer communication

| Category | Meaning | Codes | Agents (of 14) | Which agents |
|---|---|---|---|---|
| Agent as a communication channel | Engineers ask the agent instead of colleagues, onboard with it, give feedback to an AI tool in-thread, or let it run team operations. | `agent as team knowledge source`, `agent-assisted onboarding`, `agent runs team's own operations`, `internal dogfooding`, `developer feedback improves ai reviewer` | 4 (1 agent-specific) | Claude Code, Codex, Glean, HubSpot |
| Open chat and shared records | Communication defaults to open chat channels, documents and logs anyone can read. | `chat-based communication`, `open internal channels and records`, `build and execution infrastructure` | 3 (1 agent-specific) | Codex, Gemini, Gemini Ent. |
| Written, asynchronous decisions | Decisions travel in writing: mailing lists, design docs before work, decision records, written culture, a distributed team. | `async communication`, `design docs before implementation`, `decision records`, `distributed team`, `bottom-up decision-making`, `team culture norms` | 5 (2 agent-specific) | Gemini, Gemini Ent., HubSpot, watsonx, n8n |
| Synchronous and in-person coordination | Spontaneous or scheduled face-to-face meetings, escalation to video, shadowing-based onboarding. | `in-person and synchronous collaboration`, `structured team meetings`, `post-mortem review`, `flat roles`, `structured onboarding` | 4 (1 agent-specific) | Codex, Gemini, Gemini Ent., n8n |
| Communication through repository artifacts | PR descriptions, commit conventions, code-owner requests and issue bot commands carry coordination. | `descriptive pr descriptions`, `structured commit and pr title convention`, `code owners`, `bot-driven issue assignment` | 3 (3 agent-specific) | Gemini CLI, watsonx, n8n |
| Public engineering communication | The team talks to the outside through blogs, tech reports, release notes, worklogs and outreach. | `public engineering blog`, `community outreach`, `public incident report`, `public model cards and research papers`, `public release notes`, `published operational worklog`, `bilingual docs` | 5 (2 agent-specific) | Kimi, Comet, Alibaba, Browser Use, Glean |
| Community and researcher channels | Two-way channels with users and security researchers: forums, Discord, coordinated disclosure. | `community support channels`, `vulnerability disclosure process` | 2 (0 agent-specific) | Kimi, Opera Neon |

### Documentation

| Category | Meaning | Codes | Agents (of 14) | Which agents |
|---|---|---|---|---|
| Documentation written for agents | Context files (CLAUDE.md, AGENTS.md) and machine-readable docs aimed at coding agents. | `agent context files`, `agent-readable documentation` | 2 (2 agent-specific) | Claude Code, Codex |
| Docs change with the code | Docs live in the repo and must be updated in the same or a paired PR, follow a standard, or are the tests themselves. | `docs updated with code`, `docs-as-code`, `documentation standards`, `tests as documentation`, `structured issue templates` | 4 (4 agent-specific) | Codex, Gemini CLI, Gemini Ent., n8n |
| Generated docs and release notes | Docs or release notes are generated from code, migrations, commit titles or PRs, with human review. | `generated docs and release notes`, `structured commit and pr title convention`, `descriptive pr descriptions`, `human oversight of agent output` | 2 (2 agent-specific) | Codex, n8n |
| Developer portal | A hosted documentation site or per-version READMEs for users and builders. | `documentation portal`, `per-version readme` | 5 (4 agent-specific) | Comet, Alibaba, Browser Use, HubSpot, watsonx |
| Research papers and model cards | Tech reports, papers and model cards document the model and agent design. | `public model cards and research papers` | 3 (2 agent-specific) | Gemini, Kimi, Alibaba |
| Release notes and engineering blog | Changes and internals are documented in release notes and blog posts. | `public release notes`, `public engineering blog` | 3 (2 agent-specific) | Gemini, Glean, Gemini Ent. |
| Public security documentation | Security model, policies and incidents are documented publicly. | `public security documentation`, `public incident report` | 2 (2 agent-specific) | Opera Neon, Comet |

## Patterns across agents

Statements the Categories tab supports directly:

- **Code review.**
  - 6 of 14 agents have an AI agent review pull requests: Claude Code, Codex, Gemini CLI, Glean, HubSpot and n8n.
  - 3 of 14 combine that AI review with a required human approval: Claude Code, Codex and n8n. Codex and n8n also write down that the AI review comes first and that the author stays accountable.
  - 3 of 14 require human approval but show no AI review: Gemini, Gemini Enterprise and watsonx. For the two Google agents this comes from company-wide guidelines.
  - None of the 3 browser agents describes routine PR review. Opera Neon reports only security and incident review, and Alibaba commits directly.
- **CI/CD.**
  - 5 of 14 run CI checks on every change, and none of them is a browser agent.
  - 4 of 14 release internally before going public: Claude Code, Codex, Kimi and Glean. Three of these four are chat agents.
  - 6 of 14 limit exposure with staged rollouts, feature flags or fast rollback.
- **Testing.**
  - 10 of 14 score the agent on eval suites or benchmarks.
  - Only 2 use LLM-as-judge grading (Claude Code, Browser Use), and only 2 let the agent test its own product (Codex, n8n).
  - 5 of 14 report techniques for LLM non-determinism, such as mocked model responses, retries and repeated eval runs.
  - Adversarial and security testing is reported by 2 of the 3 browser agents (Opera Neon, Comet), plus Gemini and watsonx.
- **Bug solving.**
  - Bot or AI issue triage appears only in chat agents (3 of 5) and in no enterprise agent.
  - Security vulnerability intake is reported by 2 of the 3 browser agents.
- **SE methodology.**
  - 4 of 14 describe agents doing the development work: Claude Code, Codex, HubSpot and n8n.
  - 6 of 14 describe prototype- or experiment-first development.
  - The team-structure categories rest only on company-wide items (0 agent-specific).
- **Developer communication.**
  - 4 of 14 use the agent itself as a communication channel: Claude Code, Codex, Glean and HubSpot.
  - Most other categories here come from company-wide items. See open question 2.
- **Documentation.**
  - Only Claude Code and Codex write documentation for agents (CLAUDE.md, AGENTS.md).
  - 5 of 14 run a developer portal.

## Open questions for the coders

1. Should items whose memo says "not a practice" (definitions, bug-category lists, product behaviour, product renaming) count in the pattern analysis? Bug patterns and the two definition codes are already in their own categories.
2. Company-wide items (column K = yes) dominate Google Gemini, Gemini Enterprise and HubSpot. The "agent-specific" agent count shows how a pattern changes without them. Which count should the paper report?
3. A category with one agent (for example *No formal review*, *Security and incident review*) records a contrast rather than a pattern. Keep it, or fold it into a broader one?

## Change log

- 2026-11-03: round 1, Anthropic Claude Code (14 items), 10 categories.
- 2026-11-03: round 1 revised to four approach categories (SELF, PEER-EVAL, AUTO, HUMAN-VALIDATION).
- 2026-11-03: round 2. PEER-EVAL renamed AGENT-EVAL; five tag columns with dropdowns; Codebook tab; Gemini CLI coded.
- 2026-11-03: round 3, open coding of all 272 Practices items in eight tag columns (413 codes).
- 2026-11-03: round 4. At most four codes per item (L–O), 184 codes after merging near-duplicates (`open_coding_round4_merges.json`), 17 cross-dimension categories.
- 2026-11-04: coders verified all annotations and added GEMCLI-TEST-PRA-03 (273 items); codes unchanged otherwise.
- 2026-11-04: round 5. The 17 categories were too generic to compare agents within a dimension (for example *Release and rollout*, *Community and user feedback*, *Development process and architecture*). They were replaced by 61 dimension-scoped approach categories (7–10 per dimension) plus *Not a practice*, and the Categories tab was added. Codes in the Agreement Index were not changed.
