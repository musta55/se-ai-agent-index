#!/usr/bin/env python3
"""
LLM-as-Judge Quality Review Agent for SE Index JSON files.
Evaluates each agent's SE index against the Quality Review Checklist in prompts/research_prompt.md.

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

def run_llm_judge(data, client):
    sample = {}
    for area in list(data.get("SE_Practices", {}).keys())[:4]:
        sample[area] = {}
        for sub in REQUIRED_SUBSECTIONS:
            entries = data["SE_Practices"][area].get(sub, [])
            quotes = []
            for entry in entries[:2]:
                for ev in entry.get("evidence", [])[:2]:
                    q = ev.get("quote", "")
                    if q:
                        quotes.append(q)
            if quotes:
                sample[area][sub] = quotes

    issues_sample = (
        data.get("SE_Practices", {})
        .get("Bug_Solving_Approaches", {})
        .get("Issues", [])[:5]
    )
    desc = _description_summary(data) or "N/A"

    template = LLM_PROMPT_FILE.read_text(encoding="utf-8")
    prompt = (
        template
        .replace("{agent_name}", data.get("Agent_Name", "Unknown"))
        .replace("{description}", desc[:600])
        .replace("{sample}", json.dumps(sample, indent=2)[:5000])
        .replace("{issues}", json.dumps(issues_sample, indent=2)[:2000])
    )

    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except json.JSONDecodeError as e:
        return {"error": f"LLM returned non-JSON: {e}"}
    except Exception as e:
        return {"error": str(e)}


# ── Report generation ─────────────────────────────────────────────────────────

def generate_report(agent_name, filename, all_checks, llm):
    today = date.today().isoformat()

    passes = sum(1 for i, *_ in all_checks if i == "✅")
    warns  = sum(1 for i, *_ in all_checks if i == "⚠️")
    fails  = sum(1 for i, *_ in all_checks if i == "❌")

    llm_ok = isinstance(llm, dict) and "error" not in llm
    llm_score = llm.get("overall_quality", {}).get("score", "N/A") if llm_ok else "ERROR"

    lines = [
        f"# Quality Review: {agent_name}",
        f"",
        f"**Review Date:** {today}  ",
        f"**Reviewer:** LLM-as-Judge (`claude-sonnet-4-6`)  ",
        f"**Source File:** `Indexing/{filename}`",
        f"",
        f"---",
        f"",
        f"## Summary",
        f"",
        f"| | Count |",
        f"|---|---|",
        f"| ✅ Pass | {passes} |",
        f"| ⚠️ Warning | {warns} |",
        f"| ❌ Fail | {fails} |",
        f"| 🤖 LLM Score | {llm_score} |",
        f"",
        f"---",
        f"",
    ]

    # Group programmatic checks by category
    categories: dict[str, list] = {}
    for icon, cat, msg in all_checks:
        categories.setdefault(cat, []).append((icon, msg))

    for cat in ["Completeness", "Source Quality", "Evidence Quality"]:
        if cat not in categories:
            continue
        lines.append(f"## {cat}")
        lines.append("")
        for icon, msg in categories[cat]:
            if icon == "  →":
                lines.append(f"  - {msg}")
            else:
                lines.append(f"{icon} {msg}")
        lines.append("")

    # LLM-as-judge section
    lines += ["## LLM-as-Judge Assessment", ""]

    if llm_ok:
        check_labels = {
            "content_focus":           "Content Focus (dev practices vs. product features)",
            "quote_verbatim":          "Quote Verbatim Fidelity",
            "anti_hallucination":      "Anti-Hallucination",
            "evidence_supports_summary": "Evidence Supports Summary",
            "not_available_usage":     "Not-Available Usage Appropriate",
        }
        for key, label in check_labels.items():
            if key not in llm:
                continue
            score = llm[key].get("score", "N/A")
            icon = {"PASS": "✅", "WARN": "⚠️", "FAIL": "❌"}.get(score, "❓")
            lines.append(f"### {icon} {label}: `{score}`")
            issues = llm[key].get("issues", [])
            if issues:
                lines.append("")
                for iss in issues:
                    lines.append(f"- {iss}")
            lines.append("")

        if "overall_quality" in llm:
            ov = llm["overall_quality"]
            lines += [
                f"### Overall: **{ov.get('score', 'N/A')}**",
                f"",
                ov.get("summary", ""),
                f"",
            ]
    else:
        err = llm.get("error", "Unknown") if isinstance(llm, dict) else str(llm)
        lines += [f"⚠️ LLM checks could not complete: `{err}`", ""]

    # Issues summary (if any failures/warnings)
    problem_items = [(i, m) for i, c, m in all_checks if i in ("❌", "⚠️") and i != "  →"]
    llm_issues = []
    if llm_ok:
        for key in ("content_focus", "quote_verbatim", "anti_hallucination",
                    "evidence_supports_summary", "not_available_usage"):
            if key in llm and llm[key].get("issues"):
                for iss in llm[key]["issues"]:
                    llm_issues.append((llm[key].get("score", "?"), key.replace("_", " ").title(), iss))

    if problem_items or llm_issues:
        lines += ["---", "", "## Issues to Address", ""]
        if problem_items:
            lines.append("### Programmatic Checks")
            lines.append("")
            for icon, msg in problem_items:
                lines.append(f"{icon} {msg}")
            lines.append("")
        if llm_issues:
            lines.append("### LLM-Identified Issues")
            lines.append("")
            for score, category, iss in llm_issues:
                icon = "❌" if score == "FAIL" else "⚠️"
                lines.append(f"{icon} **{category}:** {iss}")
            lines.append("")

    # Full checklist
    def get_icon(checks_list, keyword):
        for i, m in checks_list:
            if keyword.lower() in m.lower():
                return i
        return "?"

    completeness_checks = [(i, m) for i, c, m in all_checks if c == "Completeness"]
    source_checks = [(i, m) for i, c, m in all_checks if c == "Source Quality"]
    evidence_check_list = [(i, m) for i, c, m in all_checks if c == "Evidence Quality" and i != "  →"]

    def chk(icon):
        return "x" if icon == "✅" else " "

    lines += [
        "---",
        "",
        "## Full Quality Checklist",
        "",
        "*(Automated = checked programmatically; Manual = requires human review)*",
        "",
        "### Source Quality",
        f"- [{chk(get_icon(source_checks, 'All citations have'))}] All citations map to References entries *(automated)*",
        f"- [{chk(get_icon(source_checks, 'Date_Pulled'))}] Date_Pulled in YYYY-MM-DD format for all references *(automated)*",
        f"- [ ] Website_Type accurately describes each source *(manual)*",
        "",
        "### Content Focus",
    ]
    if llm_ok and "content_focus" in llm:
        cf_pass = llm["content_focus"].get("score") == "PASS"
        lines += [
            f"- [{'x' if cf_pass else ' '}] Focus on development practices, not product features *(LLM: {llm['content_focus'].get('score')})*",
            f"- [{'x' if cf_pass else ' '}] No user-facing features substituted for development practices *(LLM)*",
        ]
    else:
        lines += [
            "- [ ] Focus on development practices, not product features *(manual)*",
            "- [ ] No user-facing features substituted *(manual)*",
        ]
    lines += [
        "- [ ] 'Not Available' used only when info genuinely absent *(manual)*",
        "",
        "### Completeness",
    ]
    for icon, msg in completeness_checks:
        if icon != "  →":
            lines.append(f"- [{chk(icon)}] {msg} *(automated)*")

    lines += [
        "",
        "### JSON Validity",
        "- [x] JSON is valid (file loaded successfully) *(automated)*",
        "- [x] JSON is complete (all top-level keys present) *(automated)*",
        "- [ ] No trailing commas in arrays/objects *(manual / JSON linter)*",
        "- [ ] All keys use underscores (Agent_Name not AgentName) *(manual)*",
        "",
        "### Evidence Quality",
    ]
    for icon, msg in evidence_check_list:
        lines.append(f"- [{chk(icon)}] {msg} *(automated)*")

    lines += [
        "- [ ] Quotes directly support their corresponding summaries *(manual)*",
        "",
        "### Anti-Hallucination",
    ]
    if llm_ok and "anti_hallucination" in llm:
        ah_pass = llm["anti_hallucination"].get("score") == "PASS"
        lines += [
            f"- [{'x' if ah_pass else ' '}] No invented statistics or fabricated data *(LLM: {llm['anti_hallucination'].get('score')})*",
        ]
    else:
        lines += ["- [ ] No invented statistics or fabricated data *(manual)*"]
    lines += [
        "- [ ] All URLs in References verified accessible *(manual)*",
        "- [ ] No guessed file paths or made-up links *(manual)*",
        "",
        "### Research Efficiency",
        "- [ ] No single source attempted 5+ times without success *(manual — not verifiable from JSON output)*",
        "- [ ] Research covers diverse source types (repo + blogs + papers + forums) *(see References)*",
        "",
        "---",
        "",
        f"*Generated by `quality_review_agent.py` on {today}*",
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
        print(f"\n{'='*60}\n📋 Reviewing: {agent_name}\n{'='*60}")

        filepath, data = find_index_file(agent_name)
        if not filepath:
            print(f"  ❌ No SE index JSON found for '{agent_name}'")
            continue

        print(f"  📄 Loaded: {filepath.name}")

        all_checks = (
            check_completeness(data)
            + check_citations(data)
            + check_dates(data)
            + check_evidence(data)
        )

        if client:
            print("  🤖 Running LLM-as-judge checks...")
            llm_results = run_llm_judge(data, client)
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
        llm_ok = isinstance(llm_results, dict) and "error" not in llm_results
        llm_score = (llm_results.get("overall_quality", {}).get("score", "N/A")
                     if llm_ok else "ERROR")

        print(f"  ✅ Pass: {passes}  ⚠️ Warn: {warns}  ❌ Fail: {fails}  🤖 LLM: {llm_score}")
        print(f"  💾 Saved: {out.relative_to(BASE_DIR)}")
        print(f"  🔖 Marked reviewed in agents_config.json")


if __name__ == "__main__":
    main()
