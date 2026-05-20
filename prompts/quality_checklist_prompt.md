# SE Index LLM-as-Judge Prompt

> The live prompt is in `prompts/llm_judge_prompt.txt`.
> This file documents the structure, inputs, and scoring criteria for reference.

---

## Input Context Passed to the Model

| Field           | Source                                                 | Limit           |
| --------------- | ------------------------------------------------------ | --------------- |
| `agent_name`  | `Agent_Name` key in index JSON                       | —              |
| `description` | `Description[0].Summary` or `.value`               | first 600 chars |
| `sample`      | Up to 2 quotes per subsection, first 4 SE areas        | 5,000 chars     |
| `issues`      | First 5 entries from `Bug_Solving_Approaches.Issues` | 2,000 chars     |

---

## Prompt Sent to the Model

```
You are an expert SE research quality reviewer. Evaluate this SE Index JSON excerpt
against the Quality Review Checklist criteria.

Agent: {agent_name}

DESCRIPTION SUMMARY:
{description}

SAMPLE EVIDENCE (up to 2 quotes per subsection, from the first 4 SE areas):
{sample}

SAMPLE ISSUES (first 5 from Bug_Solving_Approaches):
{issues}

Respond with ONLY valid JSON — no markdown fences, no extra text:
{
  "content_focus":             { "score": "PASS|WARN|FAIL", "issues": [] },
  "quote_verbatim":            { "score": "PASS|WARN|FAIL", "issues": [] },
  "anti_hallucination":        { "score": "PASS|WARN|FAIL", "issues": [] },
  "evidence_supports_summary": { "score": "PASS|WARN|FAIL", "issues": [] },
  "not_available_usage":       { "score": "PASS|WARN|FAIL", "issues": [] },
  "overall_quality":           { "score": "EXCELLENT|GOOD|NEEDS_IMPROVEMENT|POOR",
                                 "summary": "2-3 sentences" }
}
```

---

## Scoring Criteria

### 1. content_focus

- **FAIL** — Any summary or quote describes what the agent does *for users* (product
  feature) rather than how engineers built it (dev practice).
- **WARN** — Borderline cases where it is unclear whether the entry describes a
  development practice or a product capability.

### 2. quote_verbatim

- **WARN** — A quote reads like a paraphrase rather than copy-pasted text.
- **FAIL** — A quote is clearly reworded or reconstructed from memory.

### 3. anti_hallucination

- **FAIL** — Specific statistics or claims appear fabricated or lack citations.
- **WARN** — Suspicious figures or statements that are unconfirmed but not
  definitively invented.

### 4. evidence_supports_summary

- **WARN** — A summary claims X but the quoted text does not clearly demonstrate X.
- **FAIL** — The quote contradicts or is entirely unrelated to its summary.

### 5. not_available_usage

- **WARN** — `"Not Available"` appears in a major SE area where public engineering
  information almost certainly exists (e.g., a well-documented open-source project
  marking Testing as Not Available).

### Overall Quality

| Score                 | Meaning                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `EXCELLENT`         | All dimensions PASS; entry is publication-ready                       |
| `GOOD`              | Minor WARNs only; acceptable with light review                        |
| `NEEDS_IMPROVEMENT` | One or more WARNs or a single FAIL; requires researcher revision      |
| `POOR`              | Multiple FAILs; entry must be re-collected or substantially rewritten |

---

## Model Used

`claude-sonnet-4-6` — configured in `quality_review_agent.py` at the
`client.messages.create(model=...)` call (line ~356).
