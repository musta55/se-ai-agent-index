# Quality Review: browser use

Review Date: 2026-05-23
Reviewer: LLM-as-Judge (claude-sonnet-4-6)
Source File: Indexing/browser_use_se_index.json

---

## Summary

Programmatic checks: 10 pass, 4 warn, 0 fail
LLM unit evaluation: 74 units checked, 5 FAIL, 21 WARN
Overall LLM score: GOOD

---

## Completeness

PASS  Description field populated with agent category/capabilities/deployment surface
PASS  Repository_Statistics has all 5 required fields
PASS  All 8 SE_Practices areas present
PASS  All SE areas have 4 subsections (Practices, Tools, Stakeholders, Others)
PASS  Bug_Solving_Approaches has 15 issues (>=10)
PASS  References count: 17 (above 15 target)
PASS  External (non-GitHub) sources: 9 (>=5)

## Source Quality

PASS  All citations map to References entries (74 citations verified)
WARN  Unused References (no citation points to them): [17], [4]
WARN  All Date_Pulled in YYYY-MM-DD format — bad/missing in: [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17]

## Evidence Quality

PASS  No URL-as-quote violations
PASS  No filename-as-quote violations
WARN  No short quotes (<5 words) — 9 found
WARN  No overlong quotes (>50 words — should use '...') — 5 found

---

## LLM-as-Judge Findings

Overall assessment: Evaluated 74 units across all SE areas. Found 5 FAIL and 21 WARN issues. The index contains several entries where summaries assert specific facts (commit counts, continuation caps, trace counts, named architectural patterns) that are absent from the cited evidence, indicating the summaries were written with additional knowledge not captured in the quotes. A recurring pattern is the use of reformatted YAML fragments as quotes, and a cluster of Team_Communication and Holistic_Documentation entries that describe product-facing features rather than engineering practices.

### FAIL

| q_id  | Attribute                  | Issue                                                                                                                                                                                                                                                                                                                                                     |
| ----- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| q_60  | Content Focus              | The quote ("ChatBrowserUse offers the fastest and most cost-effective models, completing tasks 3-5x faster. Get your API key at cloud.browser-use.com") is product marketing and has no connection to the Summary, which is about documentation consumption patterns.                                                                                     |
| q_60  | Evidence-Summary Alignment | The quote describes a product offering and pricing; it is entirely unrelated to the Summary's claim that "quickstart guides enable a working agent in under 5 minutes, while parameter references support advanced customization."                                                                                                                        |
| q_91  | Evidence-Summary Alignment | The Summary asserts specific recurring bug categories — "race conditions in distributed state, async event loop misuse, memory leaks from non-singleton HTTP clients, and cascading config failures" — but the quote discusses only abstract personal mistake patterns ("I assumed instead of checking...") and names none of these specific bug types. |
| q_110 | Content Focus              | The entry documents an enterprise customer support email address, which is a product/customer service feature; it does not describe any software engineering practice or developer workflow.                                                                                                                                                              |
| q_111 | Content Focus              | A public status page for end users is a product transparency feature, not a software engineering practice; no engineering process related to incident detection, alerting, or resolution is described.                                                                                                                                                    |

### WARN

| q_id  | Attribute                  | Issue                                                                                                                                                                                                                                                                                 |
| ----- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| q_3   | Evidence-Summary Alignment | The Summary claims tests are "defined under tests/ci/ and each test file becomes an independent GitHub Actions job," but the quote ("Run ./bin/test.sh — Run the core test suite that's executed in CI") does not demonstrate the matrix build structure or the file-per-job layout. |
| q_5   | Anti-Hallucination         | The Summary states gemini-2.5-flash achieves "87% alignment with human labels across 200 hand-labeled traces," but neither quote mentions the 200-trace count; this specific figure is not supported by the cited evidence.                                                           |
| q_8   | Evidence-Summary Alignment | The Summary states failure-reason strings are "extracted by Claude Code," but the quote ("We sample and classify these failure modes every day to find low-hanging fruit") does not mention Claude Code or automated extraction.                                                      |
| q_49  | Quote Correctness          | "Issues 57 · Pull requests 171" is scraped UI counter text from the GitHub repository page, not a verbatim prose quote from documentation.                                                                                                                                           |
| q_52  | Content Focus              | The Summary includes product announcements via Twitter/X and LinkedIn as Team_Communication tools; external marketing communications are not engineering coordination practices and are outside the SE index scope.                                                                   |
| q_71  | Quote Correctness          | Both quotes ("jobs: syntax-errors / code-style / type-checker" and "on: release: types: [published] ... uv publish --trusted-publishing always") use "/" to merge separate YAML fields into single lines, indicating reformatted rather than verbatim source text.                    |
| q_73  | Anti-Hallucination         | The Summary states "Continuations are capped at 12 (~3 hours wall-clock)" but the quote does not mention any continuation cap or maximum duration; this limit is not substantiated by the evidence.                                                                                   |
| q_75  | Evidence-Summary Alignment | The Summary claims GitHub Actions orchestrates "per-PR agent evaluation via Blacksmith runners" and "PyPI publishing on release," but the quote only shows syntax-checking job names and does not support these additional claims.                                                    |
| q_76  | Evidence-Summary Alignment | The Summary lists Lambda, ECS Fargate, ALB, and S3 with specific roles, but the sole quote only addresses the DLQ function; the other AWS services' roles are not supported by any cited evidence.                                                                                    |
| q_85  | Evidence-Summary Alignment | The Summary claims ruff "replaces flake8 and black" and is "configured with auto-fix enabled and further parameterized via pyproject.toml," but the quote only shows the pre-commit repository and hook names without supporting these claims.                                        |
| q_89  | Quote Correctness          | "- id: check-added-large-files / args: [--maxkb=600] / - id: pyupgrade / args: [--py311-plus]" merges separate YAML stanza lines using "/" separators, indicating the quote was reformatted rather than copied verbatim.                                                              |
| q_90  | Quote Correctness          | "Open (24) Closed (863)" is scraped UI badge text from the GitHub Issues filter view, not a verbatim quote from documentation or a prose source.                                                                                                                                      |
| q_91  | Anti-Hallucination         | The Summary attributes specific bug pattern types (race conditions, async misuse, memory leaks) to citation [6], but the quote does not name any of these categories; they appear to be synthesized from other units (q_98, q_99, q_70) rather than extracted from this source.       |
| q_92  | Anti-Hallucination         | The Summary states the datetime timezone bug triggered "a 62-file refactor," but neither quote references the number of files changed; this specific figure is unsupported.                                                                                                           |
| q_93  | Quote Correctness          | The quotes appear to be scraped GitHub Issue titles with appended issue numbers ("Bug: sensitive_data redaction breaks... — #4609") rather than verbatim text from documentation.                                                                                                    |
| q_99  | Anti-Hallucination         | The Summary states the memory leak fix "required seven commits in one day," but the quote says only "An entire day to learn that HTTP clients should be singletons"; the specific commit count is not present in the source.                                                          |
| q_100 | Anti-Hallucination         | The Summary claims "the original first agent was discarded and rebuilt from scratch after the team reverse-engineered Claude Code and Gemini CLI," but neither quote mentions reverse-engineering or references Claude Code or Gemini CLI.                                            |
| q_100 | Evidence-Summary Alignment | The reverse-engineering claim is a specific factual assertion that is not supported by either quote, which discuss only the minimal-agent philosophy and abstraction avoidance.                                                                                                       |
| q_102 | Evidence-Summary Alignment | The Summary claims "a new event-driven watchdog architecture was introduced to respond to CDP events asynchronously," but neither quote mentions a watchdog architecture; both address only latency improvements from switching to raw CDP.                                           |
| q_104 | Evidence-Summary Alignment | The Summary describes cdp-use as "type-safe Python bindings auto-generated from official CDP protocol specifications," but the quote ("Check out the library here: github.com/browser-use/cdp-use") is a promotional reference that does not support these technical claims.          |
| q_105 | Evidence-Summary Alignment | The Summary lists agent-sdk primitives ("a complete action space, a for-loop, an explicit done tool, and context management") but the quote ("We're open-sourcing this as agent-sdk") does not describe any of these architectural details.                                           |

---

## Programmatic Issues to Address

WARN  Unused References (no citation points to them): [17], [4]
WARN  All Date_Pulled in YYYY-MM-DD format — bad/missing in: [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17]
WARN  No short quotes (<5 words) — 9 found
WARN  No overlong quotes (>50 words — should use '...') — 5 found

---

*Generated by quality_review_agent.py on 2026-05-23*
