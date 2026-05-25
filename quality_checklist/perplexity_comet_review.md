# Quality Review: Perplexity Comet

Review Date: 2026-05-23
Reviewer: LLM-as-Judge (claude-sonnet-4-6)
Source File: Indexing/perplexity_comet_se_index.json

---

## Summary

Programmatic checks: 12 pass, 2 warn, 0 fail
LLM unit evaluation: 41 units checked, 0 FAIL, 16 WARN
Overall LLM score: GOOD

---

## Completeness

PASS  Description field populated with agent category/capabilities/deployment surface
PASS  Repository_Statistics has all 5 required fields
PASS  All 8 SE_Practices areas present
PASS  All SE areas have 4 subsections (Practices, Tools, Stakeholders, Others)
PASS  Bug_Solving_Approaches has 10 issues (>=10)
PASS  References count: 17 (above 15 target)
PASS  External (non-GitHub) sources: 14 (>=5)

## Source Quality

PASS  All citations map to References entries
WARN  Unused References (no citation points to them): [10], [12], [14], [15], [17], [18], [19], [2]
PASS  Date_Pulled in YYYY-MM-DD format for all references

## Evidence Quality

PASS  No URL-as-quote violations
PASS  No filename-as-quote violations
WARN  No short quotes (<5 words) — 4 found
PASS  No overlong quotes (>50 words)

---

## LLM-as-Judge Findings

Overall assessment: Perplexity Comet is a closed-source product, and this constraint is generally handled well — Code_Review and CI/CD sections correctly use "Not Available" with clear justification. The security-focused Testing and Bug sections are among the strongest, backed by technical arXiv-linked research. The main weakness is in the Team_Communication and Holistic_Documentation areas, where scraped UI navigation text is used as quotes, and in LLM_Integration_and_Prompt_Management, where several entries describe user-facing product features (memory controls, reasoning mode selection, permission controls) rather than engineering practices for building the integration layer.

### WARN

| q_id | Attribute | Issue |
|------|-----------|-------|
| q_43 | Evidence-Summary Alignment | The Summary claims the engineering team "owns the release pipeline and publishes the weekly changelog," but the quote ("Written by Perplexity Team") is a generic authorship tag that does not support pipeline ownership. |
| q_48 | Evidence-Summary Alignment | The Summary claims the weekly shipping cadence is an indirect signal of code review practices, but the quote is a changelog entry about shipping Comet Enterprise and does not demonstrate any code review process. |
| q_52 | Evidence-Summary Alignment | The Summary is about undisclosed bug tracking tools and external VDP disclosures, but the quote about organization admins reviewing Comet telemetry data is about enterprise usage monitoring and is unrelated to bug tracking. |
| q_54 | Evidence-Summary Alignment | The Summary claims issues surface through community blog posts and security channels, but the quote is about working with security researchers around the clock, not about how issues are surfaced through blogs. |
| q_56 | Evidence-Summary Alignment | The Summary states internal methodology tools (Agile, Scrum, Kanban) are not publicly disclosed, but the quote is a changelog entry about shipping Comet iOS, which does not confirm or deny the use of any methodology tools. |
| q_26 | Evidence-Summary Alignment | The Summary claims multiple communication channels (weekly changelog, engineering blog, email), but the quote provides only an email address and does not support the broader channel claims. |
| q_59 | Quote Correctness | "Give Feedback — perplexity.typeform.com/feedbackpplx" is scraped UI navigation text from the product page, not a verbatim prose quote from documentation. |
| q_28 | Quote Correctness | "Discord — discord.gg/perplexity-ai" is scraped navigation link text, not a verbatim prose quote from documentation. |
| q_60 | Evidence-Summary Alignment | The Summary describes communication channels for end users and enterprise admins, but the quote is about the VDP scope for security disclosures — a different topic entirely. |
| q_29 | Quote Correctness | The quote ("Closest available documentations appears to be the resource hub at perplexity.ai...") reads like a researcher observation or paraphrase rather than verbatim text from the source being cited. |
| q_30 | Evidence-Summary Alignment | The Summary claims security documentation receives dedicated treatment with specific publications, but the quote is a call-to-action link to an arXiv paper and does not demonstrate a broader documentation practice. |
| q_31 | Evidence-Summary Alignment | The Summary is about the Comet Data Privacy FAQ documenting data handling in granular detail, but the quote ("Comet's approach sets a new standard for AI browsers: agentic, powerful, and fundamentally private") is a product marketing tagline unrelated to documentation content. |
| q_62 | Content Focus | The Summary describes a user memory system and reasoning mode switching — both are end-user product features rather than engineering practices for building the LLM integration layer. |
| q_37 | Quote Correctness | "MCP support — Comet for Enterprise" is scraped UI or section-header text, not a verbatim prose quote from documentation. |
| q_38 | Quote Correctness | "Agent Permission Controls - Control AI capabilities including website restrictions" reads as scraped UI header text rather than a verbatim prose quote from a source document. |
| q_39 | Content Focus | Memory disabled in incognito mode and user memory-control settings are end-user privacy product features, not LLM integration engineering practices. |

---

## Programmatic Issues to Address

WARN  Unused References (no citation points to them): [10], [12], [14], [15], [17], [18], [19], [2]
WARN  No short quotes (<5 words) — 4 found

---

*Generated by quality_review_agent.py on 2026-05-23*
