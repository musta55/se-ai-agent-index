#!/usr/bin/env python3
"""
Reorder JSON fields to place q_id as the first field in each summary object.
"""

import json
from pathlib import Path
from collections import OrderedDict

def reorder_summary_fields(obj):
    """Reorder fields to place q_id first, then Summary, then evidence."""
    if isinstance(obj, dict):
        # Check if this is a summary object (has Summary and evidence)
        if 'Summary' in obj and 'evidence' in obj:
            # Create ordered dict with q_id first
            ordered = OrderedDict()
            if 'q_id' in obj:
                ordered['q_id'] = obj['q_id']
            ordered['Summary'] = obj['Summary']
            ordered['evidence'] = obj['evidence']

            # Add any other fields
            for key, value in obj.items():
                if key not in ordered:
                    ordered[key] = value

            return ordered
        else:
            # Recursively process nested objects
            return {k: reorder_summary_fields(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [reorder_summary_fields(item) for item in obj]
    else:
        return obj

def process_json_file(json_path):
    """Reorder fields in a JSON file."""
    print(f"Processing: {json_path.name}")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Reorder fields
    reordered_data = reorder_summary_fields(data)

    # Write back
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(reordered_data, f, indent=2, ensure_ascii=False)

    print(f"  ✅ Reordered fields in {json_path.name}")

def main():
    indexing_dir = Path("/Users/mustahidhasan/Downloads/2nd Semester/Research/AI agent Index/SE Indexing Tool/Indexing")
    json_files = list(indexing_dir.glob("*_se_index.json"))

    print(f"Found {len(json_files)} JSON files to process\n")

    for json_file in sorted(json_files):
        process_json_file(json_file)

    print(f"\n{'='*60}")
    print(f"Completed reordering fields in {len(json_files)} files")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
