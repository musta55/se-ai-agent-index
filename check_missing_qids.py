#!/usr/bin/env python3
"""
Check for missing q-ids in SE index JSON files and report statistics.
"""

import json
from pathlib import Path

def count_summaries(obj, path="", missing_qids=None, total_count=None):
    """Recursively count summaries with and without q-ids."""
    if missing_qids is None:
        missing_qids = []
    if total_count is None:
        total_count = [0]

    if isinstance(obj, dict):
        # Check if this is a summary object
        if 'Summary' in obj and 'evidence' in obj:
            total_count[0] += 1
            if 'q_id' not in obj:
                missing_qids.append({
                    'path': path,
                    'summary_preview': obj['Summary'][:80] + "..." if len(obj['Summary']) > 80 else obj['Summary']
                })

        # Recurse into nested objects
        for key, value in obj.items():
            new_path = f"{path}.{key}" if path else key
            count_summaries(value, new_path, missing_qids, total_count)

    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            new_path = f"{path}[{idx}]"
            count_summaries(item, new_path, missing_qids, total_count)

    return missing_qids, total_count[0]

def analyze_json_file(json_path):
    """Analyze a single JSON file for missing q-ids."""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    agent_name = data.get("Agent_Name", "Unknown")
    missing_qids, total = count_summaries(data)

    return {
        'agent_name': agent_name,
        'file': json_path.name,
        'total_summaries': total,
        'missing_qids': len(missing_qids),
        'has_qids': total - len(missing_qids),
        'missing_details': missing_qids
    }

def main():
    indexing_dir = Path("/Users/mustahidhasan/Downloads/2nd Semester/Research/AI agent Index/SE Indexing Tool/Indexing")
    json_files = list(indexing_dir.glob("*_se_index.json"))

    print(f"Analyzing {len(json_files)} JSON files for missing q-ids...\n")
    print(f"{'='*80}")

    all_results = []
    total_missing = 0
    total_summaries = 0

    for json_file in sorted(json_files):
        result = analyze_json_file(json_file)
        all_results.append(result)
        total_missing += result['missing_qids']
        total_summaries += result['total_summaries']

        status = "✅" if result['missing_qids'] == 0 else "⚠️ "
        print(f"{status} {result['agent_name']:30s} | Total: {result['total_summaries']:3d} | Has q-id: {result['has_qids']:3d} | Missing: {result['missing_qids']:3d}")

    print(f"{'='*80}")
    print(f"\nSUMMARY:")
    print(f"  Total summaries across all agents: {total_summaries}")
    print(f"  Summaries with q-ids: {total_summaries - total_missing}")
    print(f"  Summaries missing q-ids: {total_missing}")
    print(f"  Completion rate: {((total_summaries - total_missing) / total_summaries * 100):.1f}%")

    # Show details for agents with missing q-ids
    print(f"\n{'='*80}")
    print(f"AGENTS WITH MISSING Q-IDS:")
    print(f"{'='*80}")

    for result in all_results:
        if result['missing_qids'] > 0:
            print(f"\n{result['agent_name']} ({result['missing_qids']} missing):")
            for idx, missing in enumerate(result['missing_details'][:5], 1):  # Show first 5
                print(f"  {idx}. {missing['path']}")
                print(f"     → {missing['summary_preview']}")
            if len(result['missing_details']) > 5:
                print(f"  ... and {len(result['missing_details']) - 5} more")

if __name__ == "__main__":
    main()
