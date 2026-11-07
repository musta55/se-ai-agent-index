# Re-indexing check: is the original index still valid?

**Question.** The original indexes were pulled between April and May 2026, 6–7 months before this check. Are they still valid, and do their links still work?

**Decision: keep the original indexes, with minor modifications. No re-indexing is needed.** No original claim was contradicted, and every original reference still resolves. The differences fall into three groups:
- numbers that change over time (expected for a dated snapshot);
- one repository that was archived after the pull (Kimi's `kimi-cli`);
- a few gaps and inconsistencies that were already in the original JSONs;
- a small number of real practice changes after the pull: Browser Use's sandbox and browser infrastructure, and Alibaba's first unit tests. These affect about four items; see "What actually changed since the pull".

| Agent | Original refs that resolve | Original claims contradicted | Verdict |
| --- | --- | --- | --- |
| Browser Use | 17 / 17 (2 now redirect) | 0 | Keep. Fix 2 links; optionally widen one CI/CD item |
| Alibaba Mobile Agent | 13 / 13 | 0 | Keep with minor fixes (repo-stats dates, v3.5, issue citations) |
| Kimi OK Computer | 26 / 26 | 0 | Keep the original. The re-run drifted to another product. Annotate the `kimi-cli` items |

## What actually changed since the pull (checked against primary sources)

A difference between the old index and the re-run is **not** the same as a change in the real world. Most differences come from the re-run choosing other sources. The biggest real change (Browser Use's infrastructure) was **not** picked up by the re-run, because the re-run did not read the engineering blog. The changes below were checked directly against GitHub history and the vendors' own posts.

| Agent | Real change after the pull | Old items affected |
| --- | --- | --- |
| Browser Use | Cloud browsers moved from Unikraft to self-built Firecracker microVMs on EC2 (blog, 2026-06-15). | q_77 (Unikraft); q_74 (`sandbox_mode: docker \| ukc`) |
| Browser Use | Agent sandboxes moved to AWS Bedrock AgentCore micro-VMs, managed with Terraform; the control plane still runs on ECS Fargate (blog, 2026-07-12). The zero-secret, control-plane design is unchanged ("The abstraction is still what protects the fleet"). | q_77; q_116–q_118 still hold. Check q_72/q_73/q_76 (SQS→Lambda); the new post does not mention it |
| Browser Use | CI: `cloud_evals.yml` removed; `publish.yml` now pins actions by SHA; `lint`/`test`/`pre-commit` effectively unchanged; `AGENTS.md` has only example edits. | none |
| Alibaba | First project-specific unit tests, added through community PRs in Oct 2026: `Mobile-Agent-E/tests/test_agents_json.py`, `test_api.py`, `android_world/agents/gui_owl_test.py`. There is still no CI to run them. The ~120 `*_test.py` files present at the pull date belong to Google's vendored `android_world` benchmark. | q_2 ("no conventional unit or integration test suite") |
| Alibaba | 6 community PRs merged after the pull (#286, #290, #294, #297, #298, #300), against 21 in the whole period before it. MiniMax provider added to Mobile-Agent-E. | q_50 ("rarely merges community patches") is weaker |
| Kimi | `MoonshotAI/kimi-cli` archived on 2026-09-21 and replaced by `MoonshotAI/kimi-code`. | `kimi-cli` items (see below) |
| Kimi | The models moved from K2.6 to K3 (Jul 2026) and K3.1 Pro. The evaluation practice is unchanged: internal benchmarks (e.g. Kimi Code Bench), multi-run averaging and in-house harnesses. `kimi.com/agent` now redirects to `kimi.com/?agent=1`; the help centre still describes OK Computer as Kimi's Agent mode. `kimi-agent-internals` (0 commits since) and `kimi-agent-sdk` (same workflows, including `kimi-review.yml`) are unchanged. | Description ("Kimi K2.x model family") |

**Links.** No old link has disappeared from the web. Links missing from the re-run were simply not chosen by it, and some are the same file under another URL form (`raw.githubusercontent.com` vs `github.com/.../blob/`, or a docs page that now redirects).

Most links added by the re-run point to pages that already existed at the pull date. Only a few are content created after the pull:
- Browser Use: about 7–10 GitHub issues from Oct 2026.
- Alibaba: issues #282, #285 and #287.
- Kimi: everything about `kimi-code`.

| Agent | Old links | Re-run links | Exact URL shared | Re-run links created after the pull |
| --- | --- | --- | --- | --- |
| Browser Use | 17 | 38 | 4 | ~7–10 (recent issues) |
| Alibaba | 13 | 28 | 3 | 3 (issues) |
| Kimi | 26 | 22 | 0 | `kimi-code` repo, releases and files |

## Method

1. **Re-index.** We re-ran the original pipeline for each agent: `index_prompt.md` unchanged, the same `claude -p` flags as `se_index.sh` (`--allowedTools "WebSearch WebFetch Read" --permission-mode bypassPermissions`), pinned to `--model claude-sonnet-4-6` (Claude Code 2.1.314), on 2026-11-02. The outputs in this folder are the raw re-index results. They have not been curated and are not registered in `AGENT_JSON_MAP`. Their `q_id`s are numbered per file and do **not** match the COLUMN_MAP q-ids.
   - The current prompt also produces an 8th category, `LLM_Integration_and_Prompt_Management`. It is ignored here; only the paper's 7 SE dimensions are compared.
   - In bypass mode the runs wrote their JSON to a file instead of only printing it. For Alibaba the printed and written versions differ slightly in `Repository_Statistics` and `SE_Practices`; the written file is the one kept here.
2. **Old vs new.** The original JSON in `data/Indexing/`, including the 2026-11-02 curated additions, was compared with the re-index, sub-dimension by sub-dimension.
3. **Live check of the original evidence** (`link_check_old_index.json`). Every original reference URL was fetched again, and each evidence quote was matched against the live page text. For GitHub pages the raw file was fetched as well. Disputed points were then checked directly against the GitHub API.

**On the quote-match rates.** Automated quote matching found 112/131 Kimi quotes, 59/123 Browser Use quotes and 5/47 Alibaba quotes on the live pages. The low rates are mostly artefacts of the check:
- GitHub UI strings ("94.1k stars", "Contributors 22") are not in the served HTML.
- Some quotes join several fragments with "…".
- Some quotes are English translations of Chinese pages (Aliyun docs, Chinese issues).
- Issue-thread quotes are cited to the issue *list* page.

Spot checks confirmed the content is real. For example, the Alibaba issue quotes are found in #203, #238, #265 and #182 (#182 is still open with 19 comments). The browser-use tool versions in `pyproject.toml` and `.pre-commit-config.yaml` (pytest 9.0.2, ruff 0.14.14, ruff hook v0.12.10) are unchanged on `main`.

## Browser Use

**Agreement.** The two indexes agree on all of the repository-side practice:
- testing: pytest, pytest-asyncio, pytest-xdist;
- code quality: ruff, pyright, uv and pre-commit;
- CI/CD: GitHub Actions `lint.yml` / `test.yaml` / `publish.yml`, plus per-PR agent evaluation;
- bugs: GitHub Issues with a `bug` label;
- community: Discord;
- docs: `docs.browser-use.com` and `AGENTS.md`.

Nothing is contradicted. The original's blog-derived findings are not repeated in the re-index, but they are not contradicted either: the eval pipeline (Laminar/ClickHouse, the Gemini judge), the SQS→Lambda→Fargate production stack, the sandbox Pattern 1→2 move and Playwright→CDP. All six blog posts are live, and 41 of their 55 quotes match the live text automatically; most of the misses are quotes joined with "…".

**Changed since the pull (expected).**
- Stars: 94.1k → ~119.9k.
- Bug-labelled issues: 863 closed / 24 open → 878 / 53.
- `cloud_evals.yml` has since been removed from `.github/workflows`.

**Needs a fix.** Two docs links now return a 308 redirect:
- `docs.browser-use.com/development/monitoring/telemetry` → `/open-source/development/monitoring/telemetry`
- `docs.browser-use.com/development/setup/local-setup` → `/open-source/development/setup/local-setup`

**Gap in the original (not staleness).** q_71 calls `lint` / `test` / `publish` "a three-workflow pipeline". At the pull date (commit `933e28c`, 2026-05-16) the repo already had 11 workflow files, one of them disabled. These included `claude.yml` (AI-assisted changes with a test-first rule), `eval-on-pr.yml`, `docker.yml` and `stale-bot.yml`, which the re-index picked up. Consider rewording q_71 so it does not claim completeness.

**Re-index error.** The re-index says Browser Use is "built on top of Playwright". That is wrong: `pyproject.toml` depends on `cdp-use==1.4.5`, and the Playwright test dependency is commented out. The original is correct here.

## Alibaba Mobile Agent

**Agreement.** Agreement is high in every dimension:
- there is no CI (the repo has no `.github/` directory; only GitHub's automatic Pages build runs);
- testing is benchmark-only (AndroidWorld, OSWorld, ScreenSpot);
- code review is through PRs, with no CONTRIBUTING file, and is mainly done by `junyangwang0410`;
- GitHub Issues is the only tracker;
- development is research/paper-driven, with one subdirectory per version;
- the README is in English and Chinese.

Nothing is contradicted.

**Needs fixes (problems that were already in the original JSON).**
- **Stale snapshot.** The README evidence ([1]) is pinned to commit `cf78d5cd` of 2025-12-02, but `Mobile-Agent-v3.5` / GUI-Owl-1.5 was added on 2026-02-14, before the May 2026 pull. As a result:
  - the Description says "Mobile-Agent (v3)";
  - q_58 lists versions only up to v3.

  The re-index covers v3.5 (arXiv 2602.16855).
- **Internal inconsistency.** `Repository_Statistics.Last_Updated` = 2025-11-25 and `Update_Frequency` = "last commit November 2025", but the original's own q_66 (commits API) shows a commit on 2026-05-14.
- **Issue counts disagree.** q_4 has 185 open / 96 closed; q_53 has 183 / 67.
- **Citation granularity.** Issue-thread quotes cite `…/MobileAgent/issues` (the list page). They are verifiable but should cite the specific issue URLs.
- **Quote correctness.** Two "quotes" are not verbatim. The [12] quote is a paraphrase ("Alibaba's Mobile Use docs define…"). The [3] quotes are translations from a Chinese page.

**Changed since the pull (expected).** Stars: 8.7k → ~9.35k.

## Kimi OK Computer

**No source overlap (0 of 14 source hosts are shared).** OK Computer is closed source. The re-index chose `MoonshotAI/kimi-code` as its proxy repository; nearly all of its SE findings are about that repo (Vitest, Changesets, `pnpm`, `/approve` gating). Kimi Code CLI is a separate coding-CLI product, created on 2026-05-22, after the original pull. This is a change of scope, not evidence against the original, so the re-index should **not** replace the original.

**Original evidence holds.** The OK Computer-specific sources are live, and 85% of quotes match automatically:
- the K2.6 blog;
- the Agent Swarm blog;
- the K2.5 technical report (arXiv 2602.02276);
- the community reverse-engineering repo `kimi-agent-internals`.

The few overlapping claims agree: Discord, forum.moonshot.ai, GitHub Issues and bilingual docs.

**Changed since the pull.** `MoonshotAI/kimi-cli` is now archived. Its README says: "[Archived] Legacy Python Kimi CLI, no longer maintained", replaced by `kimi-code`. The original's `kimi-cli` items cite pinned commits and were true on 2026-04-30, so they remain valid as a dated snapshot. These are q_54, q_56, q_58–q_64, q_68–q_69 and q_72. Add a note that the repo has since been archived rather than deleting them.

**Threat to validity (applies to both versions).** Both versions rely on proxy sources for a closed-source product. Consider stating this in the paper.

## Files in this folder

- `<agent>_se_index.json`: raw Sonnet 4.6 re-index output (not curated).
- `link_check_old_index.json`: for each original reference, the HTTP status and per-quote match score against the live page.
