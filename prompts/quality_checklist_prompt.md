# SE Index LLM-as-Judge Prompt

> The live prompt is in `prompts/llm_judge_prompt.txt`.
> This file documents the structure, inputs, and scoring criteria for reference.

---

## Unit Definition

A "unit" is any entry with a `q_id` field in the SE Index JSON. Each unit contains:

| Field       | Description                                      |
|-------------|--------------------------------------------------|
| `q_id`      | Unique identifier (e.g. `q_1`, `q_42`)          |
| `area`      | The SE area (e.g. `Testing_and_Reliability`)     |
| `subsection`| One of: Practices, Tools, Stakeholders, Others  |
| `Summary`   | 1–3 sentence description of the practice         |
| `evidence`  | List of `{quote, citation}` pairs                |

---

## How the LLM Judge Runs

All units are extracted from `SE_Practices` and sent to the LLM in batches of 20.
Each batch returns a JSON object with:

- `findings` — per-unit WARN/FAIL entries only (PASS is not listed)
- `overall_quality` — score and 2–3 sentence narrative for that batch

Findings from all batches are merged. The overall score is the worst score across batches.

---

## Prompt Inputs

| Placeholder    | Content                                      |
|----------------|----------------------------------------------|
| `{units_json}` | JSON array of up to 20 unit objects          |

---

## Five Quality Attributes

### 1. content_focus

- **PASS** — The Summary and quotes exclusively describe internal engineering practices,
  tooling choices, or process decisions made by the team building or operating the system.
- **WARN** — Borderline: partially describes a dev practice but bleeds into product-feature
  language.
- **FAIL** — The Summary or quote describes what the agent does *for end users* (product
  feature, user-facing capability) rather than how engineers *built or operate* it.

### 2. quote_correctness

- **PASS** — The quote is copied verbatim from the cited source, preserving original
  wording and punctuation; ellipsis markers (`...`) are used wherever text is omitted.
- **WARN** — The quote reads like a paraphrase or lightly edited rewrite rather than
  verbatim source text.
- **FAIL** — The quote is clearly reconstructed from memory, reworded, or merged from
  multiple sentences without ellipsis markers.

### 3. anti_hallucination

- **PASS** — All statistics, metrics, and factual claims in the Summary are directly
  present in the cited evidence or are unambiguously attributable to the linked source.
- **WARN** — A figure or assertion is suspicious or unverifiable but not definitively
  invented.
- **FAIL** — A specific statistic, metric, or factual claim in the Summary or quote
  appears fabricated, has no citation, or the cited source link is broken.

### 4. evidence_summary_alignment

- **PASS** — The quoted evidence directly and unambiguously supports the Summary with no
  inferential leap required.
- **WARN** — The Summary claims X but the quoted evidence does not clearly demonstrate X;
  the link is weak or requires a large inferential leap.
- **FAIL** — The quote contradicts the Summary, or is entirely unrelated to it.

### 5. unavailability_check

- **PASS** — Either "Not Available" does not appear in the unit, or its use is appropriate
  given the genuine absence of publicly accessible information.
- **WARN** — The Summary or evidence contains "Not Available" in an area where public
  engineering information almost certainly exists for this agent (e.g., a well-documented
  open-source project marking CI/CD practices as Not Available).
- Only flagged when "Not Available" explicitly appears in the unit text.

---

## Output Format (per batch)

```json
{
  "findings": [
    {
      "q_id": "q_N",
      "attribute": "content_focus|quote_correctness|anti_hallucination|evidence_summary_alignment|unavailability_check",
      "score": "WARN|FAIL",
      "issue": "one sentence describing the specific problem"
    }
  ],
  "overall_quality": {
    "score": "EXCELLENT|GOOD|NEEDS_IMPROVEMENT|POOR",
    "summary": "2-3 sentences on overall quality of this batch"
  }
}
```

PASS cases are not included in `findings`. If no issues are found, `findings` is an empty array.

---

## Overall Quality Scale

| Score               | Meaning                                                                |
|---------------------|------------------------------------------------------------------------|
| `EXCELLENT`         | No WARN or FAIL across all units                                       |
| `GOOD`              | Minor WARNs only; acceptable with light review                         |
| `NEEDS_IMPROVEMENT` | One or more WARNs or a single FAIL; requires researcher revision       |
| `POOR`              | Multiple FAILs; entry must be re-collected or substantially rewritten  |

---

## Report Structure

The generated report lists:

1. Summary table (programmatic pass/warn/fail counts + LLM score)
2. Programmatic checks (Completeness, Source Quality, Evidence Quality)
3. LLM-as-Judge section:
   - Overall assessment sentence
   - FAIL table: q_id | attribute | issue
   - WARN table: q_id | attribute | issue
   - PASS units are not listed
4. Programmatic issues to address

---

## Model Used

`claude-sonnet-4-6` — configured in `quality_review_agent.py` at the
`client.messages.create(model=...)` call inside `_call_llm_batch`.
