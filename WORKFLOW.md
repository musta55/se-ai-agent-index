# SE Agent Index - Complete Workflow

## Overview

This document describes the complete workflow for creating, verifying, and querying SE agent indexes with embedded q-ids and automatic source downloading.

---

## 🔄 **Complete Pipeline**

### **Step 1: Generate Agent Index (Automatic)**

```bash
./se_index.sh index "Agent Name"
```

**What happens automatically:**
1. ✅ Registers agent in `agents_config.json`
2. ✅ Claude Code researches agent (3-10 minutes)
3. ✅ Generates `Indexing/<name>_se_index.json` **with embedded q-ids**
4. ✅ **Auto-downloads all reference web sources** to `web_sources/<name>/`
5. ✅ Updates indexing status to "completed"

**Output:**
- `Indexing/<agent_name>_se_index.json` - Complete SE index with q-ids
- `web_sources/<agent_name>/[1].html`, `[2].md`, etc. - Downloaded sources

---

### **Step 2: Quality Review (Optional but Recommended)**

```bash
./se_index.sh review "Agent Name"
```

**What happens:**
- LLM-as-a-judge validates the index against 5 semantic rules
- Generates report in `quality_checklist/<name>_review.md`
- Identifies any issues with evidence quality, quotes, or citations

---

### **Step 3: Manual Curation (Human-in-the-Loop)**

**Researcher manually:**
1. Opens generated JSON file: `Indexing/<agent_name>_se_index.json`
2. Reviews each summary with its q-id
3. Creates/updates Excel spreadsheet: `Analysis of SE AI Agent Index.xlsx`
4. Includes q-ids in the spreadsheet for traceability
5. Filters out information that fails semantic validation
6. Verifies sources using downloaded web pages in `web_sources/`

**Key Point:** The JSON already has q-ids embedded, so researchers can directly reference them in the spreadsheet without a separate annotation step.

---

### **Step 4: Build Query Index**

```bash
python3 build_query_index.py
```

**What happens:**
- Reads the manually curated Excel spreadsheet
- Extracts q-id mappings
- Generates `query_index.json` for fast lookup
- Maps (agent_name, q-id) → (summary, evidence, references)

---

### **Step 5: Query & Validate**

```bash
# Query specific summary by q-id
./se_index.sh query "Agent Name" "q-15"

# List all q-ids for an agent
./se_index.sh list-queries "Agent Name"

# List all agents in index
./se_index.sh agents
```

**Use cases:**
- Verify source links for specific summaries
- Cross-check evidence against downloaded web pages
- Trace claims back to original sources
- Share specific findings with team (cite by q-id)

---

## 📋 **Quick Reference**

### One Agent (Full Pipeline)
```bash
# 1. Generate index + download sources (automatic)
./se_index.sh index "New Agent"

# 2. Review quality (optional)
./se_index.sh review "New Agent"

# 3. Manually curate spreadsheet from JSON (human)
#    → Edit: Analysis of SE AI Agent Index.xlsx

# 4. Build query index from spreadsheet
python3 build_query_index.py

# 5. Query for verification
./se_index.sh query "New Agent" "q-10"
```

### Multiple Agents
```bash
# Review all agents at once
./se_index.sh review --all

# Re-download sources for all agents
./se_index.sh sources --all
```

---

## 🗂️ **File Organization**

```
SE Indexing Tool/
├── Indexing/
│   └── <agent_name>_se_index.json      # Generated JSON with q-ids
│
├── web_sources/                         # Auto-downloaded (gitignored)
│   └── <agent_name>/
│       ├── [1].html                     # Reference [1]
│       ├── [2].md                       # Reference [2]
│       └── ...
│
├── quality_checklist/
│   └── <agent_name>_review.md          # LLM quality report
│
├── Analysis of SE AI Agent Index.xlsx  # MAIN DATASET (manually curated)
│
└── query_index.json                     # Generated from Excel
```

---

## 🎯 **Key Features**

### ✅ **Embedded Q-IDs**
- Every summary has a unique `q_id` field (e.g., `q_15`)
- Generated automatically during index creation
- No separate annotation step needed
- Researchers copy q-ids directly from JSON to Excel

### ✅ **Automatic Source Download**
- Triggered automatically after successful index creation
- Downloads HTML, Markdown, YAML, JSON from references
- Stored locally for offline verification
- No manual source downloading needed

### ✅ **Traceable Verification**
- Query any q-id to see full summary + evidence + citations
- Cross-reference with downloaded web pages
- Verify claims against original sources
- Share findings with team using q-id references

---

## 🚫 **Removed Legacy Components**

The following files were removed as they're no longer needed:

- ❌ `Analysis of SE AI Agent Index.backup.xlsx` - No longer used
- ❌ `qid_mappings.json` - Excel extraction output (obsolete)
- ❌ `extract_qid_mappings.py` - Excel extraction script (obsolete)
- ❌ `add_qids_to_json.py` - One-time migration script (completed)

**Why:** Q-IDs are now generated directly in JSON during index creation, eliminating the need for separate extraction and mapping.

---

## 🛠️ **Utility Scripts**

Still available for maintenance:

```bash
# Check for missing q-ids (should be 0 after generation)
python3 check_missing_qids.py

# Fill gaps if summaries added without q-ids
python3 fill_missing_qids.py

# Ensure q-id is always first field
python3 reorder_qid_fields.py
```

---

## 📖 **Documentation**

- **Research Methodology:** `prompts/research_prompt.md`
- **Quality Checklist:** `prompts/quality_checklist_prompt.md`
- **Main README:** `README.md`
- **CLI Help:** `./se_index.sh help`

---

## 🎉 **Summary**

The workflow is now streamlined:

1. **Generate** → JSON with q-ids + auto-download sources (1 command)
2. **Review** → LLM quality check (1 command)
3. **Curate** → Manual Excel creation from JSON (human)
4. **Build** → Query index from Excel (1 command)
5. **Query** → Verify sources by q-id (1 command)

No separate annotation step, no manual source downloading, no Excel extraction scripts needed!
