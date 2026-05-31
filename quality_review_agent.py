#!/usr/bin/env python3
"""
LLM-as-Judge Quality Review Agent for SE Index JSON files.
Evaluates each agent's SE index against the Quality Review Checklist in prompts/index_prompt.md.

Usage:
    python quality_review_agent.py "Glean Agents"
    python quality_review_agent.py --all
    ANTHROPIC_API_KEY=sk-... python quality_review_agent.py "Glean Agents"
"""

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

import anthropic

BASE_DIR = Path(__file__).parent
INDEXING_DIR = BASE_DIR / "Indexing"
CHECKLIST_DIR = BASE_DIR / "quality_checklist"
AGENTS_CONFIG = BASE_DIR / "agents_config.json"
LLM_PROMPT_FILE = BASE_DIR / "prompts" / "llm_judge_prompt.txt"

REQUIRED_SE_AREAS = [
    "Testing_and_Reliability",
    "Integration_and_Infrastructure_CICD",
    "Code_Review_Process",
    "Bug_Solving_Approaches",
    "Software_Engineering_Methodology",
    "Team_Communication",
    "Holistic_Documentation",
    "LLM_Integration_and_Prompt_Management",
]
# Alternate key names used in earlier-indexed files
SE_AREA_ALIASES = {
    "Testing_and_Evaluation":         "Testing_and_Reliability",
    "CICD_and_Deployment":            "Integration_and_Infrastructure_CICD",
    "Code_Review":                    "Code_Review_Process",
    "Bug_Solving_and_Issue_Tracking": "Bug_Solving_Approaches",
    "SE_Methodology":                 "Software_Engineering_Methodology",
}
REQUIRED_SUBSECTIONS = ["Practices", "Tools", "Stakeholders", "Others"]
REQUIRED_REPO_STATS = ["Lines_of_Code", "Stars", "Contributors", "Update_Frequency", "Primary_Language"]


# ── File discovery ────────────────────────────────────────────────────────────

def find_index_file(agent_name):
    """Return (Path, dict) for the agent's SE index JSON, or (None, None)."""
    target = agent_name.lower()
    for fp in INDEXING_DIR.glob("*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            # Support both "Agent_Name" and "Agent Name" key variants
            name = data.get("Agent_Name") or data.get("Agent Name", "")
            if name.lower() == target:
                return fp, data
        except Exception:
            pass
    return None, None


# ── Programmatic checks — each returns list of (icon, category, message) ─────

def _normalize_refs(data):
    """Return References as a dict keyed by citation string, handling list and dict formats."""
    refs = data.get("References", {})
    if isinstance(refs, dict):
        return refs
    # List format: [{id: "[1]", title: "...", url: "..."}]
    result = {}
    for item in refs:
        key = item.get("id", "")
        if not key:
            continue
        result[key] = {
            "Website_Type": item.get("title", ""),
            "Link": item.get("url", item.get("link", "")),
            "Date_Created": item.get("Date_Created", "Not Disclosed"),
            "Date_Pulled": item.get("Date_Pulled", item.get("date_pulled", "")),
        }
    return result


def _description_summary(data):
    """Extract Description summary regardless of list-vs-dict/value schema."""
    d = data.get("Description")
    if isinstance(d, list) and d:
        item = d[0]
        return item.get("Summary") or item.get("value", "")
    if isinstance(d, dict):
        return d.get("Summary") or d.get("value", "")
    return ""


def _normalize_repo_stats(data):
    """Return Repository_Statistics handling both underscore and space key variants."""
    repo = data.get("Repository_Statistics") or data.get("Repository Statistics", {})
    # Normalize space-keyed sub-fields
    normalized = {}
    for k, v in repo.items():
        normalized[k.replace(" ", "_")] = v
    return normalized


def check_completeness(data):
    items = []

    # Description
    desc = _description_summary(data)
    ok = bool(desc and desc.strip() not in ("", "Not Available"))
    items.append(("✅" if ok else "❌", "Completeness",
                  "Description field populated with agent category/capabilities/deployment surface"))

    # Repository Statistics
    repo = _normalize_repo_stats(data)
    missing_stats = [s for s in REQUIRED_REPO_STATS if s not in repo]
    if not missing_stats:
        items.append(("✅", "Completeness",
                      f"Repository_Statistics has all {len(REQUIRED_REPO_STATS)} required fields"))
    else:
        items.append(("⚠️", "Completeness",
                      f"Repository_Statistics missing: {', '.join(missing_stats)}"))

    # SE areas present — normalize aliases to canonical names
    raw_se = data.get("SE_Practices", {})
    se = {}
    for k, v in raw_se.items():
        canonical = SE_AREA_ALIASES.get(k, k)
        se[canonical] = v

    missing_areas = [a for a in REQUIRED_SE_AREAS if a not in se]
    items.append(("✅" if not missing_areas else "❌", "Completeness",
                  "All 8 SE_Practices areas present" +
                  (f" — missing: {', '.join(missing_areas)}" if missing_areas else "")))

    # All 4 subsections per area
    sub_issues = []
    for area in [a for a in REQUIRED_SE_AREAS if a in se]:
        miss = [s for s in REQUIRED_SUBSECTIONS if s not in se[area]]
        if miss:
            sub_issues.append(f"{area}: missing {', '.join(miss)}")
    items.append(("✅" if not sub_issues else "❌", "Completeness",
                  "All SE areas have 4 subsections (Practices, Tools, Stakeholders, Others)" +
                  (f" — {'; '.join(sub_issues)}" if sub_issues else "")))

    # Issues count — check both canonical and alias key
    bug_area = se.get("Bug_Solving_Approaches", {})
    issues = bug_area.get("Issues", [])
    n = len(issues)
    items.append(("✅" if n >= 10 else "❌", "Completeness",
                  f"Bug_Solving_Approaches has {n} issues ({'≥10 ✓' if n >= 10 else f'only {n} — minimum 10 required'})"))

    # References count
    refs = _normalize_refs(data)
    rc = len(refs)
    items.append(("✅" if rc >= 15 else ("⚠️" if rc >= 10 else "❌"), "Completeness",
                  f"References count: {rc} ({'✓' if rc >= 15 else '⚠ below 15'}) — target 15–20"))

    # External (non-GitHub) sources
    external = sum(
        1 for r in refs.values()
        if not r.get("Website_Type", "").startswith("GitHub")
        and "github.com" not in r.get("Link", "")
    )
    items.append(("✅" if external >= 5 else "⚠️", "Completeness",
                  f"External (non-GitHub) sources: {external} ({'≥5 ✓' if external >= 5 else '⚠ below 5'}) — target 5–10"))

    return items


def check_citations(data):
    items = []
    refs = set(_normalize_refs(data).keys())
    used = set()

    def collect(obj):
        if isinstance(obj, dict):
            c = obj.get("citation", "")
            if c and c.strip():
                used.add(c.strip())
            for v in obj.values():
                collect(v)
        elif isinstance(obj, list):
            for x in obj:
                collect(x)

    collect(data)

    missing = used - refs
    orphans = refs - used

    items.append(("✅" if not missing else "❌", "Source Quality",
                  f"All citations have References entries" +
                  (f" — unmapped: {', '.join(sorted(missing))}" if missing else f" ({len(used)} citations verified)")))

    if orphans:
        items.append(("⚠️", "Source Quality",
                      f"Unused References (no citation points to them): {', '.join(sorted(orphans))}"))

    return items


def check_dates(data):
    DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    bad = [k for k, r in _normalize_refs(data).items()
           if not DATE_RE.match(r.get("Date_Pulled", ""))]
    return [("✅" if not bad else "⚠️", "Source Quality",
             "All Date_Pulled in YYYY-MM-DD format" +
             (f" — bad/missing in: {', '.join(bad)}" if bad else ""))]


def check_evidence(data):
    items = []
    URL_RE = re.compile(r"^https?://")
    FILE_EXT = (".md", ".yaml", ".yml", ".json", ".py", ".ts", ".js", ".txt", ".sh", ".toml")

    url_q, file_q, short_q, long_q = [], [], [], []

    def scan(obj):
        if isinstance(obj, dict):
            if "quote" in obj:
                q = (obj["quote"] or "").strip()
                if not q:
                    return
                if URL_RE.match(q):
                    url_q.append(q)
                elif q.endswith(FILE_EXT) and " " not in q:
                    file_q.append(q)
                else:
                    words = q.split()
                    if len(words) < 5:
                        short_q.append(q)
                    elif len(words) > 50:
                        long_q.append(q)
            for v in obj.values():
                scan(v)
        elif isinstance(obj, list):
            for x in obj:
                scan(x)

    scan(data)

    items.append(("✅" if not url_q else "❌", "Evidence Quality",
                  f"No URL-as-quote violations" + (f" — {len(url_q)} found" if url_q else "")))
    for q in url_q[:3]:
        items.append(("  →", "Evidence Quality", f"`{q[:80]}`"))

    items.append(("✅" if not file_q else "❌", "Evidence Quality",
                  f"No filename-as-quote violations" + (f" — {len(file_q)} found" if file_q else "")))
    for q in file_q[:3]:
        items.append(("  →", "Evidence Quality", f"`{q}`"))

    items.append(("✅" if not short_q else "⚠️", "Evidence Quality",
                  f"No short quotes (<5 words)" + (f" — {len(short_q)} found" if short_q else "")))
    for q in short_q[:3]:
        items.append(("  →", "Evidence Quality", f"`{q}` ({len(q.split())} words)"))

    items.append(("✅" if not long_q else "⚠️", "Evidence Quality",
                  f"No overlong quotes (>50 words — should use '...')" +
                  (f" — {len(long_q)} found" if long_q else "")))
    for q in long_q[:2]:
        items.append(("  →", "Evidence Quality", f"`{q[:70]}...` ({len(q.split())} words)"))

    return items


# ── LLM-as-judge ──────────────────────────────────────────────────────────────

BATCH_SIZE = 20
SCORE_ORDER = ["EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT", "POOR"]


def extract_units(data):
    """Return all entries with a q_id from SE_Practices, with area/subsection context."""
    units = []
    se = data.get("SE_Practices", {})
    for area, area_data in se.items():
        if not isinstance(area_data, dict):
            continue
        canonical_area = SE_AREA_ALIASES.get(area, area)
        for sub in REQUIRED_SUBSECTIONS:
            for entry in area_data.get(sub, []):
                if isinstance(entry, dict) and "q_id" in entry:
                    units.append({
                        "q_id": entry["q_id"],
                        "area": canonical_area,
                        "subsection": sub,
                        "Summary": entry.get("Summary", ""),
                        "evidence": entry.get("evidence", []),
                    })
    return units


def _call_llm_batch(batch, client, template):
    prompt = template.replace("{units_json}", json.dumps(batch, indent=2))
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except json.JSONDecodeError as e:
        return {"findings": [], "overall_quality": {"score": "POOR",
                "summary": f"LLM returned non-JSON: {e}"}, "error": str(e)}
    except Exception as e:
        return {"findings": [], "overall_quality": {"score": "POOR",
                "summary": str(e)}, "error": str(e)}


def run_llm_judge_units(data, client):
    """Evaluate every unit with a q_id in batches.

    Returns a dict:
      {
        "findings": [...],          # all WARN/FAIL entries across batches
        "overall_quality": {...},   # aggregated score + summary
        "total_units": int,
        "errors": [...],            # any batch-level errors
      }
    """
    units = extract_units(data)
    if not units:
        return {
            "findings": [],
            "overall_quality": {"score": "N/A", "summary": "No units with q_id found."},
            "total_units": 0,
            "errors": [],
        }

    template = LLM_PROMPT_FILE.read_text(encoding="utf-8")
    all_findings = []
    batch_scores = []
    errors = []

    for i in range(0, len(units), BATCH_SIZE):
        batch = units[i:i + BATCH_SIZE]
        result = _call_llm_batch(batch, client, template)
        all_findings.extend(result.get("findings", []))
        ov = result.get("overall_quality", {})
        score = ov.get("score", "GOOD")
        if score in SCORE_ORDER:
            batch_scores.append((score, ov.get("summary", "")))
        if "error" in result:
            errors.append(result["error"])

    # Worst score across all batches
    worst_idx = max((SCORE_ORDER.index(s) for s, _ in batch_scores), default=1)
    overall_score = SCORE_ORDER[worst_idx]

    fail_count = sum(1 for f in all_findings if f.get("score") == "FAIL")
    warn_count = sum(1 for f in all_findings if f.get("score") == "WARN")
    overall_summary = (
        f"Evaluated {len(units)} units across all SE areas. "
        f"Found {fail_count} FAIL and {warn_count} WARN issues. "
    )
    # Append the narrative from the worst batch for context
    worst_narrative = next(
        (s for sc, s in batch_scores if sc == overall_score and s), ""
    )
    if worst_narrative:
        overall_summary += worst_narrative

    return {
        "findings": all_findings,
        "overall_quality": {"score": overall_score, "summary": overall_summary},
        "total_units": len(units),
        "errors": errors,
    }


# ── Report generation ─────────────────────────────────────────────────────────

def generate_report(agent_name, filename, all_checks, llm):
    today = date.today().isoformat()

    prog_passes = sum(1 for i, *_ in all_checks if i == "✅")
    prog_warns  = sum(1 for i, *_ in all_checks if i == "⚠️")
    prog_fails  = sum(1 for i, *_ in all_checks if i == "❌")

    llm_ok = isinstance(llm, dict) and "findings" in llm
    total_units  = llm.get("total_units", 0) if llm_ok else 0
    findings     = llm.get("findings", []) if llm_ok else []
    llm_fails    = sum(1 for f in findings if f.get("score") == "FAIL")
    llm_warns    = sum(1 for f in findings if f.get("score") == "WARN")
    ov           = llm.get("overall_quality", {}) if llm_ok else {}
    llm_score    = ov.get("score", "ERROR")

    lines = [
        f"# Quality Review: {agent_name}",
        f"",
        f"Review Date: {today}",
        f"Reviewer: LLM-as-Judge (claude-sonnet-4-6)",
        f"Source File: Indexing/{filename}",
        f"",
        f"---",
        f"",
        f"## Summary",
        f"",
        f"Programmatic checks: {prog_passes} pass, {prog_warns} warn, {prog_fails} fail",
        f"LLM unit evaluation: {total_units} units checked, {llm_fails} FAIL, {llm_warns} WARN",
        f"Overall LLM score: {llm_score}",
        f"",
        f"---",
        f"",
    ]

    # Programmatic checks grouped by category
    categories: dict[str, list] = {}
    for icon, cat, msg in all_checks:
        categories.setdefault(cat, []).append((icon, msg))

    icon_label = {"✅": "PASS", "⚠️": "WARN", "❌": "FAIL", "  →": "    "}

    for cat in ["Completeness", "Source Quality", "Evidence Quality"]:
        if cat not in categories:
            continue
        lines.append(f"## {cat}")
        lines.append("")
        for icon, msg in categories[cat]:
            prefix = icon_label.get(icon, icon)
            if prefix == "    ":
                lines.append(f"    {msg}")
            else:
                lines.append(f"{prefix}  {msg}")
        lines.append("")

    # LLM-as-judge section
    lines += ["---", "", "## LLM-as-Judge Findings", ""]

    if llm_ok:
        lines += [
            f"Overall assessment: {ov.get('summary', '')}",
            "",
        ]

        if findings:
            # Group by score level: FAIL first, then WARN
            fail_entries = [f for f in findings if f.get("score") == "FAIL"]
            warn_entries = [f for f in findings if f.get("score") == "WARN"]

            attr_label = {
                "content_focus":             "Content Focus",
                "quote_correctness":         "Quote Correctness",
                "anti_hallucination":        "Anti-Hallucination",
                "evidence_summary_alignment": "Evidence-Summary Alignment",
                "unavailability_check":      "Unavailability Check",
            }

            if fail_entries:
                lines.append("### FAIL")
                lines.append("")
                lines.append("| q_id | Attribute | Issue |")
                lines.append("|------|-----------|-------|")
                for f in fail_entries:
                    attr = attr_label.get(f.get("attribute", ""), f.get("attribute", ""))
                    lines.append(f"| {f.get('q_id', '')} | {attr} | {f.get('issue', '')} |")
                lines.append("")

            if warn_entries:
                lines.append("### WARN")
                lines.append("")
                lines.append("| q_id | Attribute | Issue |")
                lines.append("|------|-----------|-------|")
                for f in warn_entries:
                    attr = attr_label.get(f.get("attribute", ""), f.get("attribute", ""))
                    lines.append(f"| {f.get('q_id', '')} | {attr} | {f.get('issue', '')} |")
                lines.append("")
        else:
            lines += ["No issues found across all units.", ""]

        if llm.get("errors"):
            lines += ["### Batch Errors", ""]
            for err in llm["errors"]:
                lines.append(f"- {err}")
            lines.append("")
    else:
        err_msg = llm.get("error", "Unknown error") if isinstance(llm, dict) else str(llm)
        lines += [f"LLM checks could not complete: {err_msg}", ""]

    # Programmatic issues to address
    prog_problems = [(i, m) for i, c, m in all_checks if i in ("❌", "⚠️")]
    if prog_problems:
        lines += ["---", "", "## Programmatic Issues to Address", ""]
        for icon, msg in prog_problems:
            prefix = icon_label.get(icon, icon)
            lines.append(f"{prefix}  {msg}")
        lines.append("")

    lines += [
        "---",
        "",
        f"*Generated by quality_review_agent.py on {today}*",
    ]

    return "\n".join(lines)


# ── Config update ─────────────────────────────────────────────────────────────

def mark_reviewed(agent_name):
    """Set reviewed=true for agent_name in agents_config.json."""
    try:
        with open(AGENTS_CONFIG, encoding="utf-8") as f:
            config = json.load(f)
        for entry in config:
            if entry.get("agent_name", "").lower() == agent_name.lower():
                entry["reviewed"] = True
                break
        with open(AGENTS_CONFIG, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"  ⚠️  Could not update agents_config.json: {e}", file=sys.stderr)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="LLM-as-Judge Quality Review Agent for SE Index JSON files"
    )
    parser.add_argument("agent_name", nargs="?",
                        help="Agent name to review (e.g., 'Glean Agents')")
    parser.add_argument("--all", action="store_true",
                        help="Review all agents in agents_config.json")
    args = parser.parse_args()

    if not args.agent_name and not args.all:
        parser.print_help()
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("⚠️  ANTHROPIC_API_KEY not set — LLM checks will be skipped.", file=sys.stderr)
        client = None
    else:
        client = anthropic.Anthropic(api_key=api_key)

    CHECKLIST_DIR.mkdir(exist_ok=True)

    if args.all:
        with open(AGENTS_CONFIG, encoding="utf-8") as f:
            config = json.load(f)
        agents = [a["agent_name"] for a in config]
    else:
        agents = [args.agent_name]

    for agent_name in agents:
        print(f"\n{'='*60}")
        print(f"Reviewing: {agent_name}")
        print(f"{'='*60}")

        filepath, data = find_index_file(agent_name)
        if not filepath:
            print(f"  ERROR: No SE index JSON found for '{agent_name}'")
            continue

        print(f"  Loaded: {filepath.name}")

        all_checks = (
            check_completeness(data)
            + check_citations(data)
            + check_dates(data)
            + check_evidence(data)
        )

        if client:
            units = extract_units(data)
            print(f"  Running LLM-as-judge on {len(units)} units "
                  f"({(len(units) + BATCH_SIZE - 1) // BATCH_SIZE} batch(es))...")
            llm_results = run_llm_judge_units(data, client)
        else:
            llm_results = {"error": "ANTHROPIC_API_KEY not set — LLM checks skipped"}

        report = generate_report(agent_name, filepath.name, all_checks, llm_results)

        safe = agent_name.lower().replace(" ", "_").replace("/", "_")
        out = CHECKLIST_DIR / f"{safe}_review.md"
        out.write_text(report, encoding="utf-8")
        mark_reviewed(agent_name)

        passes = sum(1 for i, *_ in all_checks if i == "✅")
        warns  = sum(1 for i, *_ in all_checks if i == "⚠️")
        fails  = sum(1 for i, *_ in all_checks if i == "❌")
        llm_ok = isinstance(llm_results, dict) and "findings" in llm_results
        llm_score = (llm_results.get("overall_quality", {}).get("score", "N/A")
                     if llm_ok else "ERROR")
        llm_fails = sum(1 for f in llm_results.get("findings", []) if f.get("score") == "FAIL")
        llm_warns = sum(1 for f in llm_results.get("findings", []) if f.get("score") == "WARN")

        print(f"  Programmatic: {passes} pass, {warns} warn, {fails} fail")
        print(f"  LLM: {llm_score} ({llm_fails} FAIL, {llm_warns} WARN across units)")
        print(f"  Saved: {out.relative_to(BASE_DIR)}")


if __name__ == "__main__":
    main()
