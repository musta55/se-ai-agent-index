# Quality Review: Glean Agents

Review Date: 2026-05-23
Reviewer: LLM-as-Judge (claude-sonnet-4-6)
Source File: Indexing/glean_agents_se_index.json

---

## Summary

Programmatic checks: 13 pass, 1 warn, 0 fail
LLM unit evaluation: 43 units checked, 2 FAIL, 8 WARN
Overall LLM score: GOOD

---

## Completeness

PASS  All required top-level fields present
PASS  All 7 SE areas present
PASS  All subsections (Practices, Tools, Stakeholders, Others) present in each area
PASS  Units with empty evidence have "Not Available" in Summary
PASS  No duplicate q_ids found
PASS  References count within target range (15–20)
PASS  All Date_Pulled values present in YYYY-MM-DD format
PASS  No overlong quotes (>50 words) found

## Source Quality

PASS  All citations use consistent [N] format
PASS  Reference list present and populated
WARN  Unused References (no citation points to them): [23]

## Evidence Quality

PASS  All non-"Not Available" units have at least one evidence entry
PASS  All evidence entries contain both a quote and a citation
PASS  All citations in evidence refer to entries in the reference list
PASS  No short quotes (<5 words) found

---

## LLM-as-Judge Findings

Overall assessment: The Glean Agents index draws on a broad and diverse set of sources and several units provide strong, well-grounded SE evidence. However, two units import evidence from a third-party company (Genio) as if it were Glean practice, and several units in the LLM and Team Communication areas describe user-facing product features rather than the engineering decisions behind them. A handful of summaries also add specific numbers or characterizations not present in the quoted evidence.

### FAIL

| q_id | Attribute | Issue |
|------|-----------|-------|
| q_7 | content_focus | The second quoted evidence is explicitly from "Genio" ("At Genio, they care deeply about making sure code is well tested"), a different company, yet the unit presents this as Glean's testing philosophy; evidence from a separate organization cannot substantiate a claim about Glean's practices. |
| q_24 | content_focus | Summary describes end-user product features — searching Slack messages and Glean answering questions in Slack channels — rather than how Glean engineers build, integrate, or operate the system; this is marketing/product documentation, not SE practice evidence. |

### WARN

| q_id | Attribute | Issue |
|------|-----------|-------|
| q_4 | quote_correctness | The quoted evidence ("Automated testing frameworks provide a robust solution for verifying AI workflows, facilitating thorough assessments by simulating a wide range of operational conditions") reads as generic promotional or guidance copy rather than a specific, attributable statement about Glean's actual test infrastructure. |
| q_23 | quote_correctness | The quote "Slack channels: Direct links to the team's primary communication channels" is scraped UI label text from a team page interface, not a prose statement about engineering communication practices. |
| q_30 | anti_hallucination | Summary claims the Model Hub supports "15+ LLMs", but the quoted evidence only lists provider names (OpenAI, Google, Anthropic, Amazon, Meta) and does not state a count of 15 or more models. |
| q_31 | evidence_summary_alignment | Summary states "AI/ML engineers and prompt engineers manage LLM integration" as the stakeholder claim, but the single quoted evidence describes the Work AI Institute (external researchers from Stanford, Harvard, etc.), not internal Glean engineering roles. |
| q_43 | quote_correctness | The quote "most don't appear to have public issue tracking enabled on GitHub, with support being directed through organizational channels instead" reads as a third-party analyst observation (citation [27]) rather than an authoritative Glean statement, making it a weak primary source for a factual claim. |
| q_52 | content_focus | Summary describes the unified agent builder as a user-facing product capability ("allowing users to seamlessly switch between natural language and step-by-step agent development") rather than documenting the engineering architecture or design decisions behind the builder. |
| q_49 | content_focus | Summary focuses on search indexing latency metrics visible to end users (content appearing "within a few minutes", crawl rate updating "every 5-10 minutes") rather than the team's documentation practices or documentation engineering processes. |
| q_9 | evidence_summary_alignment | Summary claims "continuous deployment with releases happening multiple times per day following automated testing", but the quoted evidence for this claim comes from the Genio-attributed source in citation [13], which is not confirmed as being about Glean's own deployment cadence. |

---

## Programmatic Issues to Address

WARN  Unused References (no citation points to them): [23] — reference [23] is listed but never cited in any evidence entry; either remove it or add a corresponding unit that uses it.

---

*Generated by quality_review_agent.py on 2026-05-23*
