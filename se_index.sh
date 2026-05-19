#!/usr/bin/env bash
# se_index.sh — SE Agent Index toolkit
#
# Usage:
#   ./se_index.sh index   "Agent Name"      Register + research a new agent (runs Claude Code)
#   ./se_index.sh review  "Agent Name"      LLM quality review for one agent
#   ./se_index.sh review  --all             LLM quality review for all agents
#   ./se_index.sh sources "Agent Name"      Download reference web sources for one agent
#   ./se_index.sh sources --all             Download reference web sources for all agents

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_CONFIG="$SCRIPT_DIR/agents_config.json"
QUALITY_REVIEW="$SCRIPT_DIR/quality_review_agent.py"
PULL_SOURCES="$SCRIPT_DIR/Indexing/pull_sources.py"
RESEARCH_PROMPT="$SCRIPT_DIR/prompts/research_prompt.md"
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
    output_file="$SCRIPT_DIR/Indexing/${safe_name}_se_index.json"

    echo ""
    info "Output file : Indexing/${safe_name}_se_index.json"
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
            success "SE index saved → Indexing/${safe_name}_se_index.json"
            update_indexing_status "$agent_name" "completed"
            success "Status updated → completed"
            echo ""
            info "Run quality review next:"
            echo "   $0 review \"$agent_name\""
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

# ── Command: review ───────────────────────────────────────────────────────────

cmd_review() {
    local arg="${1:-}"
    [[ -z "$arg" ]] && error "Usage: $0 review \"Agent Name\"\n       $0 review --all"

    check_python
    activate_venv
    ensure_env   # quality_review_agent.py reads ANTHROPIC_API_KEY from env

    divider
    if [[ "$arg" == "--all" ]]; then
        info "Quality review — ALL agents"
    else
        info "Quality review — $arg"
    fi
    divider

    if [[ "$arg" == "--all" ]]; then
        python3 "$QUALITY_REVIEW" --all
    else
        python3 "$QUALITY_REVIEW" "$arg"
    fi

    divider
    success "Review complete — reports in quality_checklist/"
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
    success "Sources saved → web_sources/"
}

# ── Help ──────────────────────────────────────────────────────────────────────

cmd_help() {
    cat <<EOF

${BOLD}se_index.sh${RESET} — SE Agent Index toolkit

${BOLD}SETUP (first time)${RESET}

  cp .env.example .env
  # Paste your Anthropic API key into .env

${BOLD}COMMANDS${RESET}

  ${CYAN}index${RESET}   "Agent Name"      Register agent + run Claude Code research autonomously
  ${CYAN}review${RESET}  "Agent Name"      Run LLM-as-judge quality review for one agent
  ${CYAN}review${RESET}  --all             Run quality review for all agents
  ${CYAN}sources${RESET} "Agent Name"      Download all reference URLs locally for one agent
  ${CYAN}sources${RESET} --all             Download reference URLs for all agents

${BOLD}FULL WORKFLOW${RESET}

  # First time setup
  cp .env.example .env && nano .env   # paste API key

  # For each new agent:
  ./se_index.sh index   "New Agent"   # research → Indexing/<name>_se_index.json
  ./se_index.sh review  "New Agent"   # quality check → quality_checklist/<name>_review.md
  ./se_index.sh sources "New Agent"   # cache refs → web_sources/<name>/

${BOLD}FILES${RESET}

  .env                        API key (gitignored)
  .env.example                Template — copy to .env
  agents_config.json          Registry: id, name, indexing_status, reviewed
  prompts/research_prompt.md          Research methodology + JSON schema (8 SE areas)
  Indexing/<name>_se_index.json        SE index output per agent
  quality_checklist/<name>_review.md   LLM review report per agent
  web_sources/<name>/[N].html|md       Cached reference files (gitignored)

${BOLD}NOTES${RESET}

  • 'index' runs Claude Code non-interactively (claude -p) — takes 3–10 min per agent
  • Web tools only (WebSearch, WebFetch, Read) — no filesystem writes by Claude
  • ANTHROPIC_API_KEY is read from .env for both 'index' and 'review'
  • 'sources' does not need an API key

EOF
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    index)   cmd_index   "$@" ;;
    review)  cmd_review  "$@" ;;
    sources) cmd_sources "$@" ;;
    help|--help|-h) cmd_help ;;
    *) error "Unknown command '$COMMAND'. Run: $0 help" ;;
esac
