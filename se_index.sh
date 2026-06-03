#!/usr/bin/env bash
# se_index.sh — SE Agent Index toolkit
#
# Usage (run from project root):
#   ./se_index.sh index   "Agent Name"      Register + research a new agent (runs Claude Code)
#   ./se_index.sh sources "Agent Name"      Download reference web sources for one agent
#   ./se_index.sh sources --all             Download reference web sources for all agents
#   ./se_index.sh query   "Agent Name" "q-{id}"   Fetch summary + evidence for a query ID

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_CONFIG="$SCRIPT_DIR/tool/agents_config.json"
PULL_SOURCES="$SCRIPT_DIR/data/Indexing/pull_sources.py"
RESEARCH_PROMPT="$SCRIPT_DIR/index_prompt.md"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}${BOLD}ℹ  $*${RESET}"; }
success() { echo -e "${GREEN}✅ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${RESET}"; }
error()   { echo -e "${RED}❌ $*${RESET}"; exit 1; }
divider() { echo -e "${BOLD}$(printf '=%.0s' {1..60})${RESET}"; }

# ── Shared helpers ────────────────────────────────────────────────────────────

load_env() {
    if [[ -f "$ENV_FILE" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "$ENV_FILE"
        set +a
    fi
}

ensure_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        [[ -f "$ENV_EXAMPLE" ]] && cp "$ENV_EXAMPLE" "$ENV_FILE"
        error ".env not found — created from .env.example.\n   Edit $ENV_FILE and set ANTHROPIC_API_KEY, then re-run."
    fi
    load_env
    if [[ -z "${ANTHROPIC_API_KEY:-}" ]] || [[ "$ANTHROPIC_API_KEY" == sk-ant-your-key-here ]]; then
        error "ANTHROPIC_API_KEY not set.\n   Edit $ENV_FILE and paste your Anthropic API key."
    fi
}

check_python() {
    command -v python3 &>/dev/null || error "python3 not found. Install Python 3.9+ and try again."
}

check_claude_cli() {
    command -v claude &>/dev/null || \
        error "'claude' CLI not found.\n   Install Claude Code: https://claude.ai/download"
}

activate_venv() {
    [[ -f "$SCRIPT_DIR/venv/bin/activate" ]] && source "$SCRIPT_DIR/venv/bin/activate"
}

# Convert "Agent Name" → "agent_name" for filenames
safe_filename() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//;s/_$//'
}

# Register/check agent in agents_config.json; echoes "ADDED:<id>" or "EXISTS:<id>"
register_agent() {
    local agent_name="$1"
    python3 - "$AGENTS_CONFIG" "$agent_name" <<'PYEOF'
import json, sys
cfg_path, name = sys.argv[1], sys.argv[2]
with open(cfg_path, encoding="utf-8") as f:
    cfg = json.load(f)
for entry in cfg:
    if entry.get("agent_name", "").lower() == name.lower():
        print(f"EXISTS:{entry['id']}")
        sys.exit(0)
next_id = max((e["id"] for e in cfg), default=0) + 1
cfg.append({"id": next_id, "agent_name": name, "indexing_status": "pending", "reviewed": False})
with open(cfg_path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
print(f"ADDED:{next_id}")
PYEOF
}

update_indexing_status() {
    local agent_name="$1"
    local status="$2"
    python3 - "$AGENTS_CONFIG" "$agent_name" "$status" <<'PYEOF'
import json, sys
cfg_path, name, status = sys.argv[1], sys.argv[2], sys.argv[3]
with open(cfg_path, encoding="utf-8") as f:
    cfg = json.load(f)
for e in cfg:
    if e.get("agent_name", "").lower() == name.lower():
        e["indexing_status"] = status
with open(cfg_path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
PYEOF
}

# ── Command: query ────────────────────────────────────────────────────────────

cmd_query() {
    local agent_name="${1:-}"
    local query_id="${2:-}"
    [[ -z "$agent_name" || -z "$query_id" ]] && \
        error "Usage: $0 query \"Agent Name\" \"q-{id}\"\nExample: $0 query \"HubSpot Breeze Studio\" \"q-3\""

    check_python
    python3 "$SCRIPT_DIR/tool/query_runner.py" "$agent_name" "$query_id"
}

# ── Command: list queries for an agent ────────────────────────────────────────

cmd_list_queries() {
    local agent_name="${1:-}"
    [[ -z "$agent_name" ]] && \
        error "Usage: $0 list-queries \"Agent Name\""

    check_python
    local index_path="$SCRIPT_DIR/tool/query_index.json"
    if [[ ! -f "$index_path" ]]; then
        error "query_index.json not found. Run: python3 tool/build_query_index.py from the project root"
    fi

    python3 - "$agent_name" "$index_path" <<'PYEOF'
import json, sys
name_input, path = sys.argv[1], sys.argv[2]
with open(path) as f:
    index = json.load(f)
lower = name_input.lower()
matched = next((k for k in index if k.lower() == lower), None)
if not matched:
    matched = next((k for k in index if k.lower().startswith(lower) or lower.startswith(k.lower())), None)
if not matched:
    print(f"Agent '{name_input}' not found.", file=sys.stderr)
    sys.exit(1)
print(f"Agent: {matched}\n")
for qid, entry in sorted(index[matched].items(), key=lambda x: int(x[0].split('-')[1])):
    preview = (entry['summary'] or 'Not Available')[:80].replace('\n', ' ')
    print(f"  {qid:<8} [{entry['column_label']}]  {preview}...")
PYEOF
}

# ── Command: list available agents ────────────────────────────────────────────

cmd_agents() {
    check_python
    local index_path="$SCRIPT_DIR/tool/query_index.json"
    if [[ ! -f "$index_path" ]]; then
        error "query_index.json not found. Run: python3 tool/build_query_index.py from the project root"
    fi

    python3 - "$index_path" <<'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    index = json.load(f)
print("Available agents:")
for agent in sorted(index.keys()):
    count = len(index[agent])
    print(f"  {agent}  ({count} queries)")
PYEOF
}

# ── Command: index ────────────────────────────────────────────────────────────

cmd_index() {
    local agent_name="${1:-}"
    [[ -z "$agent_name" ]] && error "Usage: $0 index \"Agent Name\""

    check_python
    check_claude_cli
    ensure_env

    divider
    info "SE Agent Index: $agent_name"
    divider

    # Register
    local reg_result
    reg_result=$(register_agent "$agent_name")
    local agent_id
    case "$reg_result" in
        ADDED:*)
            agent_id="${reg_result#ADDED:}"
            success "Registered '$agent_name' (id=$agent_id, status: pending)"
            ;;
        EXISTS:*)
            agent_id="${reg_result#EXISTS:}"
            warn "'$agent_name' already registered (id=$agent_id). Re-running research..."
            ;;
        *)
            error "Unexpected output from config updater: $reg_result"
            ;;
    esac

    # Resolve output path
    local safe_name output_file
    safe_name=$(safe_filename "$agent_name")
    output_file="$SCRIPT_DIR/data/Indexing/${safe_name}_se_index.json"

    # Skip research if a valid JSON index already exists for this agent.
    # Checks both the canonical safe-name path AND any existing file in Indexing/
    # whose name fuzzy-matches the agent name (handles legacy naming like GleanAgents_).
    local existing_file
    existing_file=$(python3 - "$agent_name" "$SCRIPT_DIR/data/Indexing" <<'PYEOF'
import json, os, sys, re

name = sys.argv[1].lower()
indexing_dir = sys.argv[2]

def normalize(s):
    # lowercase, strip all non-alphanumeric, collapse to bare word sequence
    return re.sub(r'[^a-z0-9]', '', s.lower())

name_norm = normalize(name)

for fname in sorted(os.listdir(indexing_dir)):
    if not fname.endswith('.json'):
        continue
    # Strip known suffixes to get the agent stem
    stem = re.sub(r'_?se_?index\.json$', '', fname, flags=re.IGNORECASE)
    stem = re.sub(r'seindex\.json$', '', stem, flags=re.IGNORECASE)
    stem_norm = normalize(stem)
    if stem_norm == name_norm or name_norm in stem_norm or stem_norm in name_norm:
        fpath = os.path.join(indexing_dir, fname)
        try:
            json.load(open(fpath))
            print(fname)
        except Exception:
            pass
PYEOF
    )

    if [[ -n "$existing_file" ]]; then
        success "Index already exists: data/Indexing/$existing_file"
        info "To re-index, delete the file first:"
        echo "   rm \"$SCRIPT_DIR/data/Indexing/$existing_file\""
        divider
        return 0
    fi

    echo ""
    info "Output file : data/Indexing/${safe_name}_se_index.json"
    info "Research    : $(wc -l < "$RESEARCH_PROMPT" | tr -d ' ') line prompt → claude -p"
    echo ""
    warn "Starting research — this takes 3–10 minutes (Claude is browsing the web)..."
    divider

    # Build substituted prompt in a temp file (avoids shell ARG_MAX limits)
    local tmp_prompt tmp_raw
    tmp_prompt=$(mktemp /tmp/se_prompt.XXXXXX)
    tmp_raw=$(mktemp /tmp/se_raw.XXXXXX)
    trap 'rm -f "$tmp_prompt" "$tmp_raw"' EXIT

    sed "s/{agent_name}/${agent_name}/g" "$RESEARCH_PROMPT" > "$tmp_prompt"

    # Run Claude Code in non-interactive print mode.
    # --allowedTools restricts to read-only web tools (no file writes by Claude).
    # --permission-mode bypassPermissions suppresses interactive permission prompts.
    if ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" claude -p \
        --allowedTools "WebSearch WebFetch Read" \
        --permission-mode bypassPermissions \
        < "$tmp_prompt" > "$tmp_raw" 2>&1; then

        # Extract the JSON block from Claude's response (strip any preamble/postamble)
        python3 - "$tmp_raw" "$output_file" <<'PYEOF'
import json, sys, re

raw = open(sys.argv[1], encoding="utf-8").read()
out = sys.argv[2]

# Try strict JSON extraction: first { to last }
start = raw.find('{')
end   = raw.rfind('}') + 1

if start < 0 or end <= start:
    # No JSON block found — save raw and bail
    open(out, "w").write(raw)
    sys.stderr.write("ERROR: No JSON block found in Claude output\n")
    sys.exit(1)

candidate = raw[start:end]
try:
    parsed = json.loads(candidate)
    open(out, "w", encoding="utf-8").write(
        json.dumps(parsed, indent=2, ensure_ascii=False)
    )
    print("OK")
except json.JSONDecodeError as e:
    # Save raw output so the user can inspect it
    open(out, "w", encoding="utf-8").write(raw)
    sys.stderr.write(f"JSON parse error: {e}\n")
    sys.exit(1)
PYEOF

        # Confirm the saved file is valid JSON
        if python3 -c "import json; json.load(open('$output_file'))" 2>/dev/null; then
            success "SE index saved → data/Indexing/${safe_name}_se_index.json"
            update_indexing_status "$agent_name" "completed"
            success "Status updated → completed"
            echo ""

            # Automatically download web sources after successful index creation
            info "Downloading reference web sources..."
            divider
            if python3 "$PULL_SOURCES" "$agent_name" 2>&1; then
                success "Web sources cached → data/web_sources/${safe_name}/"
            else
                warn "Some sources failed to download (check web_sources/ for details)"
            fi

        else
            warn "File saved but failed JSON validation."
            warn "Inspect: $output_file"
            warn "Raw output: $tmp_raw"
            update_indexing_status "$agent_name" "failed"
            trap - EXIT  # keep temp files for inspection
        fi
    else
        error "Claude Code exited with an error. Raw output:\n$(head -20 "$tmp_raw")"
    fi

    divider
}

# ── Command: sources ──────────────────────────────────────────────────────────

cmd_sources() {
    local arg="${1:-}"
    [[ -z "$arg" ]] && error "Usage: $0 sources \"Agent Name\"\n       $0 sources --all"

    check_python
    activate_venv

    divider
    if [[ "$arg" == "--all" ]]; then
        info "Downloading sources — ALL agents"
    else
        info "Downloading sources — $arg"
    fi
    divider

    if [[ "$arg" == "--all" ]]; then
        python3 "$PULL_SOURCES" --all
    else
        python3 "$PULL_SOURCES" "$arg"
    fi

    divider
    success "Sources saved → data/web_sources/"
}

# ── Help ──────────────────────────────────────────────────────────────────────

cmd_help() {
    cat <<EOF

${BOLD}se_index.sh${RESET} — SE Agent Index toolkit

${BOLD}SETUP (first time)${RESET}

  cp .env.example .env      # paste your Anthropic API key

${BOLD}COMMANDS${RESET}

  ${CYAN}index${RESET}        "Agent Name"       Register agent + run research (auto-downloads sources)
  ${CYAN}sources${RESET}      "Agent Name"       Re-download reference URLs for one agent (manual)
  ${CYAN}sources${RESET}      --all              Re-download reference URLs for all agents (manual)

  ${CYAN}query${RESET}        "Agent" "q-{id}"   Fetch summary + evidence for a query ID
  ${CYAN}list-queries${RESET} "Agent Name"       List all query IDs for an agent
  ${CYAN}agents${RESET}                          List all agents in the query index

${BOLD}FULL WORKFLOW${RESET}

  # First time setup
  cp .env.example .env && nano .env   # paste API key

  # For each new agent:
  ./se_index.sh index   "New Agent"   # research + auto-download sources
                                      # → data/Indexing/<name>_se_index.json
                                      # → data/web_sources/<name>/

  # Manually curate Excel spreadsheet from JSON with q-ids
  # → data/dataset/Index.xlsx (manual curation + verification)

  # Build query index from curated spreadsheet:
  python3 tool/build_query_index.py   # builds tool/query_index.json from Excel

  # Query the index for verification:
  ./se_index.sh query        "HubSpot Breeze Studio" "q-3"
  ./se_index.sh list-queries "Anthropic Claude Code"
  ./se_index.sh agents

${BOLD}FILES${RESET}

  .env                                   API key (gitignored)
  .env.example                           Template — copy to .env
  index_prompt.md                        Research methodology + JSON schema (8 SE areas)
  tool/agents_config.json                Registry: id, name, indexing_status, reviewed
  tool/query_index.json                  Generated: (agent, q-id) → summary + evidence
  data/Indexing/<name>_se_index.json     SE index output per agent
  data/web_sources/<name>/[N].html|md    Cached reference files (gitignored)
  data/dataset/Index.xlsx                Master dataset (manually curated)

${BOLD}NOTES${RESET}

  • 'index' runs Claude Code research + auto-downloads sources (3–10 min per agent)
  • Web tools only (WebSearch, WebFetch, Read) — no filesystem writes by Claude
  • ANTHROPIC_API_KEY is read from .env for both 'index' and 'review'
  • Sources are downloaded automatically after successful index creation
  • 'sources' command available for manual re-download (no API key needed)
  • All q-ids are embedded in JSON during generation (see prompts/index_prompt.md)

EOF
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    index)        cmd_index         "$@" ;;
    sources)      cmd_sources       "$@" ;;
    query)        cmd_query         "$@" ;;
    list-queries) cmd_list_queries  "$@" ;;
    agents)       cmd_agents        "$@" ;;
    help|--help|-h) cmd_help ;;
    *) error "Unknown command '$COMMAND'. Run: $0 help" ;;
esac
