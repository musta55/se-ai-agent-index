#!/usr/bin/env python3
"""
Direct Research Agent - No Browser Required
Generates SE Index using OpenAI GPT-4o based on training knowledge and documented sources.
Replaces browser-use for fast, headless index generation.

Usage:
    python direct_research.py "Watson Orchestrate"
    python direct_research.py "Watson Orchestrate" --model gpt-4o
"""

import os
import sys
import json
import asyncio
import argparse
from pathlib import Path
from datetime import datetime
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs"
LOGS_DIR = BASE_DIR / "logs"
RESEARCH_PROMPT_FILE = BASE_DIR / "research_prompt.md"
AGENTS_CONFIG_FILE = BASE_DIR / "agents_config.json"

OUTPUT_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


DIRECT_SYSTEM_PROMPT = """You are an expert Software Engineering Research Analyst with deep knowledge of AI agent development practices, IBM products, cloud platforms, and enterprise software engineering.

Your task is to produce a complete Software Engineering (SE) Index JSON for a specific AI agent or tool by drawing on:
1. Your training knowledge about the agent's public GitHub repositories, official documentation, and known engineering practices
2. IBM's published engineering standards, developer blog posts, and conference talks (when applicable)
3. Any open-source SDKs, client libraries, or related repositories associated with the agent

CRITICAL RULES YOU MUST FOLLOW:
- Only cite URLs that actually exist and are publicly accessible (no fabricated paths)
- Quotes must be verbatim text from real sources (5-50 words, exact phrasing)
- If information is genuinely not available, mark as "Not Available" with empty evidence array
- Never substitute product features (what the agent DOES for users) for engineering practices (how the TEAM builds it)
- Bug_Solving_Approaches MUST include an "Issues" array with minimum 10 real issues from GitHub issue trackers
- All citations [1], [2], etc. must correspond to entries in the References section
- Output ONLY valid JSON — no markdown, no explanatory text before or after the JSON
- Target 15-20 total references mixing GitHub repos, official docs, engineering blogs, and external sources"""


def load_research_prompt() -> str:
    """Load the research_prompt.md template."""
    with open(RESEARCH_PROMPT_FILE, "r", encoding="utf-8") as f:
        return f.read()


def build_task_prompt(agent_name: str, research_template: str) -> str:
    """Build the full research task prompt for the given agent."""
    task = research_template.replace("{agent_name}", agent_name)
    
    # Add direct-research-mode instruction at the top
    preamble = f"""# Direct Research Mode (No Browser)

You are generating the SE Index for: **{agent_name}**

Since this is direct research (no live browser), use your training knowledge of:
- The official GitHub organization and repositories
- Public documentation and developer guides
- Published engineering blog posts and technical papers  
- Known open-source SDKs/libraries associated with this product
- Publicly documented engineering practices for this team/company

Apply the full research methodology below to produce a complete, accurate SE Index.

---

"""
    return preamble + task


def update_agents_config(agent_name: str, status: str):
    """Update or insert agent status in agents_config.json."""
    try:
        with open(AGENTS_CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception:
        config = []

    # Find existing entry
    entry = next((a for a in config if a.get("agent_name") == agent_name), None)
    
    if entry:
        entry["status"] = status
        entry["last_updated"] = datetime.now().isoformat()
    else:
        new_id = max((a.get("id", 0) for a in config), default=0) + 1
        config.append({
            "id": new_id,
            "agent_name": agent_name,
            "status": status,
            "priority": 1,
            "notes": f"Added by direct_research.py at {datetime.now().isoformat()}"
        })

    with open(AGENTS_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def extract_json_from_response(text: str) -> str:
    """Extract JSON content from LLM response, stripping any markdown fences."""
    text = text.strip()
    if text.startswith("```json"):
        start = text.find("```json") + 7
        end = text.rfind("```")
        return text[start:end].strip()
    elif text.startswith("```"):
        start = text.find("```") + 3
        end = text.rfind("```")
        return text[start:end].strip()
    return text


async def research_agent_direct(agent_name: str, model: str = "gpt-4o") -> dict:
    """
    Generate SE Index for an agent using GPT-4o directly (no browser).
    
    Args:
        agent_name: Name of the agent to research (e.g., "Watson Orchestrate")
        model: OpenAI model to use
        
    Returns:
        Parsed SE Index as a dict
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not found in .env file")

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    print(f"\n{'='*70}")
    print(f"  Direct Research Agent")
    print(f"  Target: {agent_name}")
    print(f"  Model:  {model}")
    print(f"  Mode:   Headless (no browser display)")
    print(f"{'='*70}\n")

    # Build prompt
    research_template = load_research_prompt()
    task_prompt = build_task_prompt(agent_name, research_template)

    print("Calling OpenAI API... (this may take 1-3 minutes)\n")
    update_agents_config(agent_name, "in-progress")

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": DIRECT_SYSTEM_PROMPT},
            {"role": "user", "content": task_prompt}
        ],
        temperature=0.1,
        max_tokens=16000,
        response_format={"type": "json_object"}  # Force valid JSON output
    )

    raw_output = response.choices[0].message.content.strip()

    # Log raw output for debugging
    log_path = LOGS_DIR / f"{agent_name.replace(' ', '_')}_raw_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(raw_output)
    print(f"Raw output logged to: {log_path.name}")

    # Parse JSON
    try:
        json_text = extract_json_from_response(raw_output)
        research_data = json.loads(json_text)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print("Attempting fallback parse...")
        # Try to find the JSON object boundaries
        start = raw_output.find("{")
        end = raw_output.rfind("}") + 1
        if start != -1 and end > start:
            research_data = json.loads(raw_output[start:end])
        else:
            raise ValueError(f"Could not extract valid JSON from response: {e}")

    # Save output
    output_file = OUTPUT_DIR / f"{agent_name.replace(' ', '_')}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(research_data, f, indent=2, ensure_ascii=False)

    update_agents_config(agent_name, "completed")

    print(f"\n{'='*70}")
    print(f"  Research Complete!")
    print(f"  Output: {output_file}")
    print(f"  Tokens used: {response.usage.total_tokens:,}")
    print(f"{'='*70}\n")

    return research_data


def validate_se_index(data: dict, agent_name: str) -> list[str]:
    """
    Validate the SE index against research_prompt.md requirements.
    Returns list of warnings (empty = all good).
    """
    warnings = []
    required_areas = [
        "Testing_and_Reliability",
        "Integration_and_Infrastructure_CICD",
        "Code_Review_Process",
        "Bug_Solving_Approaches",
        "Software_Engineering_Methodology",
        "Team_Communication",
        "Holistic_Documentation",
        "LLM_Integration_and_Prompt_Management"
    ]

    se_practices = data.get("SE_Practices", {})

    for area in required_areas:
        if area not in se_practices:
            warnings.append(f"MISSING SE area: {area}")

    # Check Bug_Solving issues
    bug_solving = se_practices.get("Bug_Solving_Approaches", {})
    issues = bug_solving.get("Issues", [])
    if len(issues) < 10:
        warnings.append(f"Bug_Solving Issues: {len(issues)} found, minimum 10 required")

    # Check references
    references = data.get("References", {})
    if len(references) < 5:
        warnings.append(f"References: {len(references)} found, target 15-20")

    # Check agent name
    if data.get("Agent_Name", "") != agent_name:
        warnings.append(f"Agent_Name mismatch: got '{data.get('Agent_Name')}', expected '{agent_name}'")

    return warnings


async def main():
    parser = argparse.ArgumentParser(description="Generate SE Index directly via GPT-4o (no browser)")
    parser.add_argument("agent_name", help="Name of the agent to research")
    parser.add_argument("--model", default="gpt-4o", help="OpenAI model (default: gpt-4o)")
    args = parser.parse_args()

    agent_name = args.agent_name
    model = args.model

    try:
        result = await research_agent_direct(agent_name, model)

        # Validate output
        warnings = validate_se_index(result, agent_name)
        if warnings:
            print("Validation warnings:")
            for w in warnings:
                print(f"  - {w}")
        else:
            print("Validation passed: All required sections present")

        # Print summary stats
        se_practices = result.get("SE_Practices", {})
        issues_count = len(se_practices.get("Bug_Solving_Approaches", {}).get("Issues", []))
        refs_count = len(result.get("References", {}))
        print(f"\nSummary:")
        print(f"  SE Practice Areas: {len(se_practices)}/8")
        print(f"  Issues analyzed:   {issues_count}")
        print(f"  References:        {refs_count}")

    except Exception as e:
        print(f"\nError: {e}")
        update_agents_config(agent_name, "failed")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
