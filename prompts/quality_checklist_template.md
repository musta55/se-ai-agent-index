# SE Index Quality Review Checklist

Use this template to evaluate any SE Index JSON file against the methodology in `research_prompt.md`.

**Agent Name:** _______________  
**Review Date:** _______________  
**Reviewer:** _______________  
**Source File:** _______________

---

## 1. Source Quality

- [ ] All quotes are VERBATIM (copy-pasted exactly from sources — not paraphrased or reworded)
- [ ] Every citation `[1]`, `[2]`, etc. has a corresponding entry in the `References` section
- [ ] All URLs in `References` are real, accessible links (not guessed paths or invented URLs)
- [ ] `Date_Pulled` is in `YYYY-MM-DD` format for every reference
- [ ] `Website_Type` accurately describes each source (e.g., "Engineering Blog", "GitHub Repository")

---

## 2. Content Focus

- [ ] Research focuses on **development practices** (how engineers built the agent), not product features
- [ ] No user-facing features substituted for internal development practices
  - ❌ Wrong: "The agent uses MCP to communicate with tools"
  - ✅ Correct: "Engineers version prompts using LangSmith before deployment"
- [ ] If internal information is unavailable, it is marked `"Not Available"` rather than substituted
- [ ] Clear distinction between "how developers built it" vs "what it does for users"

---

## 3. Completeness

- [ ] `Description` field is populated with agent category, primary capabilities, and deployment surface
- [ ] `Repository_Statistics` is complete with evidence, or marked "Not Available" with reason
  - Required fields: `Lines_of_Code`, `Stars`, `Contributors`, `Update_Frequency`, `Primary_Language`
- [ ] `Bug_Solving_Approaches.Issues` contains **minimum 10 issues** with titles, descriptions, citations
- [ ] All **8 SE_Practices areas** are populated (or marked "Not Available"):
  - `Testing_and_Reliability`
  - `Integration_and_Infrastructure_CICD`
  - `Code_Review_Process`
  - `Bug_Solving_Approaches`
  - `Software_Engineering_Methodology`
  - `Team_Communication`
  - `Holistic_Documentation`
  - `LLM_Integration_and_Prompt_Management`
- [ ] Each SE practice area has **all 4 subsections**: `Practices`, `Tools`, `Stakeholders`, `Others`
- [ ] **Minimum 15–20 total references** in the `References` section
- [ ] **At least 5–10 external sources** (blogs, papers, conference talks — not just GitHub)

---

## 4. JSON Validity

- [ ] JSON is valid (no syntax errors, parseable by `json.loads`)
- [ ] JSON is complete (not truncated or cut off mid-structure)
- [ ] No trailing commas in arrays or objects
- [ ] All strings are properly quoted with double quotes
- [ ] All keys use underscores (`Agent_Name`, not `AgentName`)

---

## 5. Evidence Quality

- [ ] No file names used as quotes (e.g., `"CONTRIBUTING.md"`)
- [ ] No URLs used as quotes (e.g., `"https://..."`)
- [ ] No single-word or tool-name-only quotes (e.g., `"GitHub Actions"`)
- [ ] No webpage titles used as quotes (e.g., `"About Us"`)
- [ ] All quotes are **complete sentences or meaningful excerpts** (5–50 words)
- [ ] Quotes **directly support** their corresponding summaries

---

## 6. Anti-Hallucination

- [ ] No made-up URLs or guessed file paths in `References`
- [ ] No invented statistics or numeric data without citations
- [ ] No assumptions presented as confirmed facts
- [ ] All information is traceable to a cited, accessible source
- [ ] When uncertain, information is marked `"Not Available"` rather than guessed

---

## 7. Research Efficiency

- [ ] No single website was attempted more than 5 times without success
- [ ] When a source failed 5 times, research moved to alternative sources
- [ ] Failed sources are marked `"Not Available"` with explanation (if visible in output)
- [ ] No infinite loops on the same extraction attempts
- [ ] Research covers diverse source types (repo + blogs + papers + forums)

---

## Issues Found

| # | Category | Severity | Description |
|---|----------|----------|-------------|
| 1 | | ❌/⚠️ | |
| 2 | | ❌/⚠️ | |

---

## Overall Assessment

- [ ] **PASS** — Ready for analysis; minor issues only
- [ ] **NEEDS REVISION** — Significant issues require correction before use
- [ ] **FAIL** — Major structural or data quality problems

**Notes:**
