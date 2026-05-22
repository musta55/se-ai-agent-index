#!/usr/bin/env python3
"""
Fill in missing q-ids for all summaries across all agent JSON files.
Assigns sequential q-ids starting from the highest existing q-id for each agent.
"""

import json
import re
from pathlib import Path
from collections import OrderedDict

def get_highest_qid(obj):
    """Find the highest q-id number in a JSON object."""
    max_qid = 0

    def recurse(item):
        nonlocal max_qid
        if isinstance(item, dict):
            if 'q_id' in item:
                # Extract number from q_id like "q_15" -> 15
                match = re.match(r'q_(\d+)', item['q_id'])
                if match:
                    qid_num = int(match.group(1))
                    max_qid = max(max_qid, qid_num)

            for value in item.values():
                recurse(value)
        elif isinstance(item, list):
            for element in item:
                recurse(element)

    recurse(obj)
    return max_qid

def assign_missing_qids(obj, next_qid_ref):
    """Recursively assign q-ids to all summaries that don't have one."""
    if isinstance(obj, dict):
        # Check if this is a summary object
        if 'Summary' in obj and 'evidence' in obj:
            if 'q_id' not in obj:
                # Assign new q-id
                new_qid = f"q_{next_qid_ref[0]}"

                # Create ordered dict with q_id first
                ordered = OrderedDict()
                ordered['q_id'] = new_qid
                ordered['Summary'] = obj['Summary']
                ordered['evidence'] = obj['evidence']

                # Add any other fields
                for key, value in obj.items():
                    if key not in ordered:
                        ordered[key] = value

                next_qid_ref[0] += 1
                return ordered
            else:
                # Already has q_id, just ensure proper ordering
                ordered = OrderedDict()
                ordered['q_id'] = obj['q_id']
                ordered['Summary'] = obj['Summary']
                ordered['evidence'] = obj['evidence']

                for key, value in obj.items():
                    if key not in ordered:
                        ordered[key] = value

                return ordered
        else:
            # Regular object, recurse into it
            return {k: assign_missing_qids(v, next_qid_ref) for k, v in obj.items()}

    elif isinstance(obj, list):
        return [assign_missing_qids(item, next_qid_ref) for item in obj]

    else:
        return obj

def process_json_file(json_path):
    """Process a single JSON file to fill missing q-ids."""
    print(f"\nProcessing: {json_path.name}")

    # Read JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    agent_name = data.get("Agent_Name", "Unknown")

    # Find highest existing q-id
    highest_qid = get_highest_qid(data)
    print(f"  Agent: {agent_name}")
    print(f"  Highest existing q-id: q_{highest_qid}")

    # Count current summaries without q-ids
    missing_before = count_missing_qids(data)
    total_summaries = count_total_summaries(data)

    print(f"  Summaries before: {total_summaries} total, {missing_before} missing q-ids")

    # Assign missing q-ids starting from highest + 1
    next_qid = [highest_qid + 1]
    updated_data = assign_missing_qids(data, next_qid)

    # Count after
    missing_after = count_missing_qids(updated_data)
    assigned_count = next_qid[0] - highest_qid - 1

    print(f"  Assigned {assigned_count} new q-ids (q_{highest_qid + 1} to q_{next_qid[0] - 1})")
    print(f"  Summaries after: {total_summaries} total, {missing_after} missing q-ids")

    # Write back
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, indent=2, ensure_ascii=False)

    print(f"  ✅ Updated: {json_path.name}")

    return {
        'agent_name': agent_name,
        'assigned': assigned_count,
        'total': total_summaries
    }

def count_missing_qids(obj):
    """Count summaries without q-ids."""
    count = [0]

    def recurse(item):
        if isinstance(item, dict):
            if 'Summary' in item and 'evidence' in item and 'q_id' not in item:
                count[0] += 1
            for value in item.values():
                recurse(value)
        elif isinstance(item, list):
            for element in item:
                recurse(element)

    recurse(obj)
    return count[0]

def count_total_summaries(obj):
    """Count total summaries."""
    count = [0]

    def recurse(item):
        if isinstance(item, dict):
            if 'Summary' in item and 'evidence' in item:
                count[0] += 1
            for value in item.values():
                recurse(value)
        elif isinstance(item, list):
            for element in item:
                recurse(element)

    recurse(obj)
    return count[0]

def main():
    indexing_dir = Path("/Users/mustahidhasan/Downloads/2nd Semester/Research/AI agent Index/SE Indexing Tool/Indexing")
    json_files = list(indexing_dir.glob("*_se_index.json"))

    print(f"{'='*80}")
    print(f"FILLING MISSING Q-IDS FOR {len(json_files)} AGENTS")
    print(f"{'='*80}")

    results = []
    total_assigned = 0

    for json_file in sorted(json_files):
        result = process_json_file(json_file)
        results.append(result)
        total_assigned += result['assigned']

    print(f"\n{'='*80}")
    print(f"SUMMARY")
    print(f"{'='*80}")
    print(f"\nTotal new q-ids assigned across all agents: {total_assigned}\n")

    for result in results:
        if result['assigned'] > 0:
            print(f"  {result['agent_name']:30s} | Assigned: {result['assigned']:3d} new q-ids")

    print(f"\n{'='*80}")
    print(f"✅ All agents now have complete q-id coverage!")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
