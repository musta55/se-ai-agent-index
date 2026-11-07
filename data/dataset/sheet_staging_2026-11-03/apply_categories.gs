/**
 * Writes the round-5 open-coding categories to "Analysis of SE AI Agent Index".
 * Runs after applyAnnotations(). It does NOT write to the Agreement Index; it only reads it.
 *
 * 1. Run checkCategories()  -> reads the sheet, writes nothing, logs a report.
 * 2. Run applyCategories()  -> repeats every check; writes only if all of them pass.
 *
 * Categories are scoped to one SE dimension: a code can sit in a different category in each
 * dimension it is used in. What it writes:
 *   - "Codebook" tab, rewritten in place so the Agreement Index dropdowns (Codebook!A2:A1000)
 *     keep working: A code, B live use count, C..I the code's category in each dimension,
 *     J item ids. The round-4 Codebook is first copied to "Codebook-r4".
 *   - "Categories" tab: one row per (dimension, category) with its meaning, a live code count,
 *     and how many items and agents use it, overall, per agent group and per agent.
 * Item and agent counts are computed from the live Agreement Index when the script runs;
 * re-run applyCategories() after recoding to refresh them. Safe to re-run.
 */

function checkCategories() {
  const plan = catPreflight_();
  console.log(plan.report.join('\n'));
  console.log(plan.problems.length
    ? 'CHECK FAILED: ' + plan.problems.length + ' problem(s). Nothing was written.'
    : 'CHECK PASSED. Nothing was written. Run applyCategories() to apply.');
}

function applyCategories() {
  const plan = catPreflight_();
  console.log(plan.report.join('\n'));
  if (plan.problems.length) {
    throw new Error('Stopped before writing: ' + plan.problems.length +
      ' problem(s), see log above. Nothing was written.');
  }
  const ss = plan.ss;

  // 1. Keep the round-4 Codebook as "Codebook-r4" before rewriting it.
  let cb = plan.cb;
  if (plan.backup) {
    const copy = cb.copyTo(ss).setName(CAT_BACKUP_NAME);
    ss.setActiveSheet(copy);
    ss.moveActiveSheet(cb.getIndex() + 1);
    console.log('Copied the round-4 Codebook to "' + CAT_BACKUP_NAME + '".');
  }
  if (!cb) {
    cb = ss.insertSheet('Codebook', plan.ai.getIndex());
    console.log('Created the "Codebook" tab.');
  }

  // 2. Codebook, written over its whole old extent so no round-4 cell is left behind.
  catWriteGrid_(cb, plan.codebook);
  cb.getRange(1, 1, 1, plan.codebook[0].length).setFontWeight('bold');
  cb.getRange(2, 3, Math.max(plan.codebook.length - 1, 1), 8).setWrap(true).setVerticalAlignment('top');
  cb.setFrozenRows(1);
  cb.setFrozenColumns(1);
  [260, 50, 200, 200, 200, 200, 200, 200, 200, 420].forEach(function (w, i) { cb.setColumnWidth(i + 1, w); });
  console.log('Wrote the Codebook: ' + (plan.codebook.length - 1) + ' codes x ' + CAT.dimensions.length + ' dimensions.');

  // 3. Categories tab.
  let ct = ss.getSheetByName('Categories');
  if (!ct) {
    ct = ss.insertSheet('Categories', (ss.getSheetByName(CAT_BACKUP_NAME) || cb).getIndex());
    console.log('Created the "Categories" tab.');
  }
  catWriteGrid_(ct, plan.categories);
  const nRows = plan.categoryRows, nAg = plan.agents.length, firstAg = CAT_FIXED_COLS + 1;
  ct.getRange(1, 1, 1, plan.categories[0].length).setFontWeight('bold').setWrap(true).setVerticalAlignment('top');
  ct.getRange(2, 1, nRows, 3).setWrap(true).setVerticalAlignment('top');
  ct.getRange(2, firstAg, nRows, nAg).setBackgrounds(plan.categories.slice(1, nRows + 1).map(function (row) {
    return row.slice(CAT_FIXED_COLS, CAT_FIXED_COLS + nAg).map(function (v) { return v ? '#d9ead3' : null; });
  }));
  ct.setFrozenRows(1);
  ct.setFrozenColumns(2);
  [130, 230, 420, 50, 50, 60, 70, 50, 50, 60].forEach(function (w, i) { ct.setColumnWidth(i + 1, w); });
  for (let j = 0; j < nAg; j++) ct.setColumnWidth(firstAg + j, 70);
  SpreadsheetApp.flush();
  console.log('Wrote the Categories tab: ' + nRows + ' categories, ' + nAg + ' agents.');
  console.log('DONE. The Agreement Index was not changed.');
}

function catNorm_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

// Writes grid at A1, blanking whatever the sheet held beyond it.
function catWriteGrid_(sh, grid) {
  const nr = Math.max(grid.length, sh.getLastRow());
  const nc = Math.max(grid[0].length, sh.getLastColumn());
  const out = [];
  for (let r = 0; r < nr; r++) {
    const row = [];
    for (let c = 0; c < nc; c++) row.push(r < grid.length && c < grid[r].length ? grid[r][c] : '');
    out.push(row);
  }
  sh.getRange(1, 1, nr, nc).setValues(out);
  if (nc > grid[0].length) sh.getRange(1, grid[0].length + 1, nr, nc - grid[0].length).clearFormat();
}

function catPreflight_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = ['Round-5 categories: check of ' + ss.getName() + ' (' + new Date() + ')'];
  const problems = [], warnings = [];
  const plan = { ss: ss, report: report, problems: problems };
  function problem(msg) { problems.push(msg); report.push('  PROBLEM ' + msg); }
  function warn(msg) { warnings.push(msg); report.push('  WARNING ' + msg); }

  if (ss.getId() !== CAT_SPREADSHEET_ID) {
    problem('This script is attached to spreadsheet ' + ss.getId() + ', expected ' + CAT_SPREADSHEET_ID + '.');
    return plan;
  }
  const ai = ss.getSheetByName('Agreement Index');
  if (!ai) { problem('No "Agreement Index" tab.'); return plan; }
  plan.ai = ai;

  // Agreement Index columns are found by header, so moved columns still work.
  const last = ai.getLastRow(), width = ai.getLastColumn();
  const vals = ai.getRange(1, 1, Math.max(last, 1), width).getValues();
  const head = vals[0].map(catNorm_);
  const col = {};
  ['agent_name', 'dimension', 'info_item_id', 'Marketing piece', 'Company'].forEach(function (h) {
    col[h] = head.indexOf(h);
    if (col[h] < 0) problem('Agreement Index has no "' + h + '" column in row 1.');
  });
  const tagCols = [];
  head.forEach(function (h, j) { if (/^annotation_\d+$/.test(h)) tagCols.push(j); });
  if (!tagCols.length) problem('Agreement Index has no annotation_1.. columns in row 1.');
  if (problems.length) return plan;
  report.push('  Agreement Index: ' + (last - 1) + ' rows, tags in ' +
    tagCols.map(function (j) { return catCol_(j + 1); }).join(', ') + ' (read only).');

  // Category of each (dimension, code) pair.
  const catOf = {}, dimIdx = {};
  CAT.dimensions.forEach(function (d, i) {
    dimIdx[d.dimension] = i;
    d.categories.forEach(function (c) { c.codes.forEach(function (code) { catOf[d.dimension + '\u0001' + code] = c.category; }); });
  });
  CAT.not_practice.pairs.forEach(function (p) { catOf[p.dimension + '\u0001' + p.code] = CAT.not_practice.category; });

  const groupOf = {}, agents = [];
  CAT.agent_groups.forEach(function (g) { g.agents.forEach(function (a) { groupOf[a] = g.group; agents.push(a); }); });

  // Read every coded item.
  const uses = {}, idsOf = {}, liveDims = {}, unmapped = {}, cells = {}, specific = {};
  let coded = 0;
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const codes = tagCols.map(function (j) { return catNorm_(row[j]); }).filter(String);
    if (!codes.length) continue;
    coded++;
    const agent = catNorm_(row[col.agent_name]), dim = catNorm_(row[col.dimension]), id = catNorm_(row[col.info_item_id]);
    if (!(agent in groupOf)) { groupOf[agent] = 'other'; agents.push(agent); warn('Agent "' + agent + '" is not in any agent group; counted under "other".'); }
    codes.forEach(function (code) {
      uses[code] = (uses[code] || 0) + 1;
      (idsOf[code] = idsOf[code] || []).indexOf(id) < 0 && idsOf[code].push(id);
    });
    if (!(dim in dimIdx)) { warn('Row ' + (r + 1) + ' (' + id + ') has codes but dimension "' + dim + '" has no categories; not counted.'); continue; }
    const isSpecific = catNorm_(row[col.Company]).toLowerCase() !== 'yes' && catNorm_(row[col['Marketing piece']]).toLowerCase() !== 'yes';
    const seen = {};
    codes.forEach(function (code) {
      (liveDims[code] = liveDims[code] || {})[dim] = true;
      let cat = catOf[dim + '\u0001' + code];
      if (!cat) {
        cat = CAT_UNCATEGORISED;
        (unmapped[dim + '\u0001' + code] = unmapped[dim + '\u0001' + code] || []).push(id);
      }
      if (seen[cat]) return;
      seen[cat] = true;
      const key = dim + '\u0001' + cat;
      const c = cells[key] = cells[key] || {};
      c[agent] = (c[agent] || 0) + 1;
      if (isSpecific) (specific[key] = specific[key] || {})[agent] = true;
    });
  }
  report.push('  ' + coded + ' coded items, ' + Object.keys(uses).length + ' distinct codes.');
  Object.keys(unmapped).forEach(function (k) {
    const p = k.split('\u0001');
    warn('Code "' + p[1] + '" has no category in ' + p[0] + ' (' + unmapped[k].join(', ') +
      '); shown as ' + CAT_UNCATEGORISED + '. Add it to open_coding_categories.json and rebuild.');
  });

  // Codebook: rewrite in place only if it is the round-4 layout, this layout, or empty.
  const cb = ss.getSheetByName('Codebook');
  plan.cb = cb;
  let oldCodes = [];
  if (cb) {
    const top = cb.getRange(1, 1, 1, 4).getValues()[0].map(catNorm_).join('|');
    if (top === CAT_R4_HEADER) {
      if (ss.getSheetByName(CAT_BACKUP_NAME)) {
        problem('Codebook is still the round-4 layout but a "' + CAT_BACKUP_NAME + '" tab already exists. Rename or delete that tab, then re-run.');
      } else {
        plan.backup = true;
        report.push('  Codebook is the round-4 layout: it will be copied to "' + CAT_BACKUP_NAME + '", then rewritten.');
      }
    } else if (top === CAT.codebook_header.slice(0, 4).join('|')) {
      report.push('  Codebook already has the round-5 layout: it will be refreshed.');
    } else if (cb.getLastRow() > 0) {
      problem('Codebook row 1 is "' + top + '", which is neither the round-4 nor the round-5 layout. Nothing was written.');
    }
    if (cb.getLastRow() > 1) oldCodes = cb.getRange(2, 1, cb.getLastRow() - 1, 1).getValues().map(function (r) { return catNorm_(r[0]); }).filter(String);
  } else {
    report.push('  No Codebook tab: it will be created.');
  }
  const ct = ss.getSheetByName('Categories');
  if (ct && ct.getLastRow() > 0 && catNorm_(ct.getRange(1, 1).getValue()) !== CAT.categories_header[0]) {
    problem('A "Categories" tab exists but A1 is not "' + CAT.categories_header[0] + '". Rename that tab, then re-run.');
  }

  // Codebook rows: scheme codes, live codes and any code already listed (it feeds the dropdowns).
  const schemeDims = {}, rank = {};
  CAT.dimensions.forEach(function (d, i) {
    d.categories.forEach(function (c, k) {
      c.codes.forEach(function (code) {
        (schemeDims[code] = schemeDims[code] || {})[d.dimension] = true;
        if (!(code in rank)) rank[code] = [i, k];
      });
    });
  });
  CAT.not_practice.pairs.forEach(function (p) {
    (schemeDims[p.code] = schemeDims[p.code] || {})[p.dimension] = true;
    if (!(p.code in rank)) rank[p.code] = [dimIdx[p.dimension], 99];
  });
  const all = {};
  Object.keys(schemeDims).concat(Object.keys(uses), oldCodes).forEach(function (c) { all[c] = true; });
  const codes = Object.keys(all).sort(function (a, b) {
    const ra = rank[a] || [98, 0], rb = rank[b] || [98, 0];
    return ra[0] - rb[0] || ra[1] - rb[1] || (a < b ? -1 : a > b ? 1 : 0);
  });
  const extra = codes.filter(function (c) { return !(c in schemeDims) && !(c in uses); });
  if (extra.length) report.push('  ' + extra.length + ' code(s) listed in the Codebook but unused and uncategorised are kept at the end: ' + extra.join(', '));

  const codebook = [CAT.codebook_header.slice()];
  codes.forEach(function (code, i) {
    const row = [code, "=COUNTIF('Agreement Index'!$L$2:$O$1000,A" + (i + 2) + ')'];
    CAT.dimensions.forEach(function (d) {
      const k = d.dimension + '\u0001' + code;
      row.push(catOf[k] || ((liveDims[code] || {})[d.dimension] ? CAT_UNCATEGORISED : ''));
    });
    row.push((idsOf[code] || []).join(', '));
    codebook.push(row);
  });
  plan.codebook = codebook;

  // Categories rows.
  const groups = CAT.agent_groups.map(function (g) { return g.group; });
  if (agents.some(function (a) { return groupOf[a] === 'other'; })) groups.push('other');
  const groupSize = {};
  agents.forEach(function (a) { groupSize[groupOf[a]] = (groupSize[groupOf[a]] || 0) + 1; });
  const header = CAT.categories_header.slice(0, 7)
    .concat(groups.map(function (g) { return g + ' (of ' + groupSize[g] + ')'; }), agents);
  header[5] = 'agents (of ' + agents.length + ')';
  const fixed = 7 + groups.length;
  const categories = [header];
  const dimCol = {};
  CAT.dimensions.forEach(function (d, i) { dimCol[d.dimension] = catCol_(3 + i); });
  CAT.dimensions.forEach(function (d) {
    const list = d.categories.map(function (c) { return [c.category, c.meaning]; });
    if (CAT.not_practice.pairs.some(function (p) { return p.dimension === d.dimension; })) list.push([CAT.not_practice.category, CAT.not_practice.meaning]);
    if (Object.keys(unmapped).some(function (k) { return k.split('\u0001')[0] === d.dimension; })) list.push([CAT_UNCATEGORISED, 'Codes used in this dimension that have no category yet.']);
    list.forEach(function (c) {
      const key = d.dimension + '\u0001' + c[0], hit = cells[key] || {};
      const r = categories.length + 1;
      const row = [d.label, c[0], c[1],
        '=COUNTIF(Codebook!$' + dimCol[d.dimension] + '$2:$' + dimCol[d.dimension] + '$1000,B' + r + ')',
        agents.reduce(function (s, a) { return s + (hit[a] || 0); }, 0),
        agents.filter(function (a) { return hit[a]; }).length,
        Object.keys(specific[key] || {}).length];
      groups.forEach(function (g) { row.push(agents.filter(function (a) { return hit[a] && groupOf[a] === g; }).length); });
      agents.forEach(function (a) { row.push(hit[a] || ''); });
      categories.push(row);
    });
  });
  plan.categoryRows = categories.length - 1;
  const width2 = header.length, blank = function () { return header.map(function () { return ''; }); };
  categories.push(blank());
  CAT.notes.forEach(function (n) { const row = blank(); row[0] = n; categories.push(row); });
  categories.forEach(function (row) { while (row.length < width2) row.push(''); });
  plan.categories = categories;
  plan.agents = agents;
  CAT_FIXED_COLS = fixed;

  report.push('  Codebook: ' + codes.length + ' codes. Categories: ' + plan.categoryRows + ' rows over ' +
    CAT.dimensions.length + ' dimensions, ' + agents.length + ' agents.');
  if (warnings.length) report.push('  ' + warnings.length + ' warning(s); they do not stop the run.');
  return plan;
}

function catCol_(c) {
  let s = '';
  for (; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + (c - 1) % 26) + s;
  return s;
}

const CAT_SPREADSHEET_ID = '10WMkTy7Zw0rovq8NDnlKH5yIBJhKT2MtId45aMb05RM';
const CAT_BACKUP_NAME = 'Codebook-r4';
const CAT_R4_HEADER = 'code|category|uses|item ids (as coded 2026-11-03)';
const CAT_UNCATEGORISED = '(uncategorised)';
let CAT_FIXED_COLS = 10;
const CAT = {
 "dimensions": [
  {
   "dimension": "Code Review Process",
   "label": "Code review",
   "categories": [
    {
     "category": "AI agent reviews PRs",
     "meaning": "An AI agent produces review comments on pull requests, including the agent reviewing its own product's code and engineered AI reviewers (multi-agent, judge-filtered, ranked findings, custom-trained, tuned on developer feedback).",
     "codes": [
      "ai code review",
      "ai code review on every pr",
      "agent reviews its own codebase",
      "multi-agent review",
      "judge agent filters ai review",
      "ai review findings aggregated and prioritised",
      "custom-trained review model",
      "developer feedback improves ai reviewer"
     ]
    },
    {
     "category": "Human approval gate",
     "meaning": "A person must approve before merge: mandatory peer review, human merge approval, code owners, readability approval, careful human review of critical code.",
     "codes": [
      "mandatory human code review",
      "human merge approval",
      "human review for critical code",
      "code owners",
      "readability certification"
     ]
    },
    {
     "category": "Human accountable for AI-assisted changes",
     "meaning": "Rules for how people handle AI output in review: resolve the AI review before asking a colleague, author must understand and own AI-written code, disclose AI use; includes the review load this creates.",
     "codes": [
      "ai review before human review",
      "review overload",
      "author accountability for code",
      "ai-use disclosure"
     ]
    },
    {
     "category": "Codified reviewer guidelines",
     "meaning": "Written rules for reviewers: approval standard (code health), non-blocking nits, response-time targets, review rubric and style authority, review as mentoring.",
     "codes": [
      "code-health approval standard",
      "non-blocking review comments",
      "response-time targets",
      "review rubric and style authority",
      "review as knowledge sharing"
     ]
    },
    {
     "category": "Small, self-describing changes",
     "meaning": "Rules for what a submitted change looks like: small single-purpose PRs, motivation in the PR body, commit and title conventions, tests included, contributor agreement.",
     "codes": [
      "small single-purpose changes",
      "descriptive pr descriptions",
      "structured commit and pr title convention",
      "tests required with change",
      "contributor license agreement",
      "modular architecture",
      "generated docs and release notes"
     ]
    },
    {
     "category": "Automated checks before review",
     "meaning": "Machine checks run before a human or AI reviews: pre-commit hooks, lint and type checks, agent evaluation on each PR, recurring review comments turned into lint rules.",
     "codes": [
      "pre-commit and presubmit checks",
      "lint and static checks",
      "agent eval on every pr",
      "review findings turned into lint rules"
     ]
    },
    {
     "category": "Security and incident review",
     "meaning": "Review led by a security team or held after an incident, rather than routine PR review.",
     "codes": [
      "security review and pen-testing",
      "post-mortem review",
      "public incident report"
     ]
    },
    {
     "category": "No formal review",
     "meaning": "Evidence that changes are not reviewed through PRs: maintainers commit directly, no review policy.",
     "codes": [
      "no formal pr review",
      "direct commits by maintainers"
     ]
    }
   ]
  },
  {
   "dimension": "CI/CD Pipeline Practices",
   "label": "CI/CD",
   "categories": [
    {
     "category": "CI checks on every change",
     "meaning": "Automated lint, build and test runs on each push or PR, including cross-platform matrices, presubmits, a single merge-blocking gate, split pre-/post-merge checks and agent evals in CI.",
     "codes": [
      "ci on every pr",
      "lint and static checks",
      "cross-platform test matrix",
      "pre-commit and presubmit checks",
      "pre-merge vs post-merge checks",
      "single merge-blocking ci gate",
      "agent eval on every pr",
      "nightly scheduled test runs",
      "trunk-based development",
      "large-scale automated code changes"
     ]
    },
    {
     "category": "Isolated, least-privilege execution",
     "meaning": "CI jobs or agent runs are isolated from secrets and the host: least-privilege workflow permissions, secret-free fork CI, sandboxed agent execution.",
     "codes": [
      "least-privilege ci",
      "sandboxed execution"
     ]
    },
    {
     "category": "Build and agent-run infrastructure",
     "meaning": "Investment in the machinery that builds code or runs agents at scale: build clusters and caches, queue-and-worker agent runners, cloud coding agents, local dev servers, redesigns of that infrastructure.",
     "codes": [
      "build and execution infrastructure",
      "cloud coding agents",
      "architectural redesign",
      "local developer environment"
     ]
    },
    {
     "category": "Automated release pipeline",
     "meaning": "Releases are built and published by automation: tag- or PR-triggered publishing, continuous deployment, package-manager distribution.",
     "codes": [
      "automated release pipeline",
      "continuous deployment",
      "package-manager distribution"
     ]
    },
    {
     "category": "Manual steps or no CI",
     "meaning": "Release or verification still needs a manual trigger, or no automated CI exists.",
     "codes": [
      "manual release trigger",
      "no automated ci"
     ]
    },
    {
     "category": "High-frequency releases",
     "meaning": "A stated release cadence of daily to every few weeks.",
     "codes": [
      "frequent release cadence"
     ]
    },
    {
     "category": "Internal-first release",
     "meaning": "The team or company uses a build internally (including running the agent on its own operations) before external users get it.",
     "codes": [
      "internal-first release",
      "agent tests its own product"
     ]
    },
    {
     "category": "Progressive exposure and rollback",
     "meaning": "Limiting who gets a change and undoing it fast: staged or invite-only rollout, feature flags, one-click or config rollback.",
     "codes": [
      "staged rollout",
      "feature flags",
      "fast rollback"
     ]
    },
    {
     "category": "Versioning and release communication",
     "meaning": "Version and compatibility rules, and publishing what each release contains: release notes, worklogs, generated or bilingual release docs.",
     "codes": [
      "versioning and compatibility policy",
      "public release notes",
      "published operational worklog",
      "generated docs and release notes",
      "bilingual docs"
     ]
    }
   ]
  },
  {
   "dimension": "Testing Methodologies",
   "label": "Testing",
   "categories": [
    {
     "category": "Conventional test suites",
     "meaning": "Deterministic unit, integration, end-to-end, UI, performance and cross-platform tests, and how they are organised (test strategy, guidelines, framework migration, hermetic tests).",
     "codes": [
      "unit tests",
      "integration tests",
      "end-to-end tests",
      "integration-first testing",
      "user-focused ui tests",
      "cross-platform test matrix",
      "performance, memory and stress tests",
      "hermetic tests",
      "testing guidelines",
      "test framework migration"
     ]
    },
    {
     "category": "Controlling LLM non-determinism",
     "meaning": "Techniques that make tests of LLM-based code repeatable: mocked model responses, retries and deflake runs, repeated eval runs with statistics.",
     "codes": [
      "mocked llm responses in tests",
      "flaky-test handling",
      "repeated eval runs"
     ]
    },
    {
     "category": "Automated test execution",
     "meaning": "Where and when tests run: on every PR, split pre-/post-merge, nightly, in parallel, in sandboxes or local dev servers, with eval cost limits; includes having no CI.",
     "codes": [
      "ci on every pr",
      "pre-merge vs post-merge checks",
      "agent eval on every pr",
      "parallel test and eval runs",
      "nightly scheduled test runs",
      "lint and static checks",
      "build and execution infrastructure",
      "eval cost management",
      "sandboxed execution",
      "local developer environment",
      "no automated ci"
     ]
    },
    {
     "category": "Agent tests its own product",
     "meaning": "The agent runs the product's tests, clicks through the app, or hunts for bugs in its own codebase; the codebase is laid out so it can.",
     "codes": [
      "agent tests its own product",
      "agent finds and fixes its own bugs",
      "agent-runnable tests",
      "agent context files",
      "nightly scheduled agent runs",
      "modular architecture"
     ]
    },
    {
     "category": "Benchmark and eval-suite evaluation",
     "meaning": "The agent or model is scored on eval suites: internal eval frameworks, public or third-party benchmarks, single/multi-turn and trajectory evals, simulated users, eval sets from real user data, eval metrics and eval-driven fixes.",
     "codes": [
      "internal eval framework",
      "benchmark evaluation",
      "third-party evaluation",
      "single- and multi-turn evals",
      "tests verify agent outcome",
      "trajectory evaluation",
      "simulated user conversations before release",
      "eval metrics design",
      "eval set from real user data",
      "eval-driven improvement loop",
      "public model cards and research papers"
     ]
    },
    {
     "category": "LLM-as-judge grading",
     "meaning": "A model grades the agent's output or labels the eval data.",
     "codes": [
      "llm-as-judge",
      "llm-labelled eval data"
     ]
    },
    {
     "category": "Dogfooding and live-user validation",
     "meaning": "Quality is judged from real use before or after general release: internal dogfooding, A/B tests, early access or preview stages, SLO gates on a limited release, user and community reports.",
     "codes": [
      "internal dogfooding",
      "internal user feedback",
      "a/b testing in production",
      "staged rollout",
      "slo-based quality gates",
      "usage data guides development",
      "community bug reports"
     ]
    },
    {
     "category": "Runtime tracing and monitoring",
     "meaning": "Traces, step-level debugging, token and cost tracking of agent runs, and runtime self-checks.",
     "codes": [
      "tracing and monitoring",
      "cost and token observability",
      "runtime validation and recovery"
     ]
    },
    {
     "category": "Adversarial and security testing",
     "meaning": "Red-teaming, attack benchmarks, pen-tests and bug bounties, with failures fed back into training.",
     "codes": [
      "red-teaming and adversarial testing",
      "security review and pen-testing",
      "bug bounty program",
      "failures fed back into training"
     ]
    },
    {
     "category": "Human test sign-off",
     "meaning": "People confirm quality: bug bashes, manual test steps or screenshots in the PR, regression test required with a fix, author sign-off, a review board.",
     "codes": [
      "team bug bashes",
      "test evidence in pr",
      "tests required with change",
      "author accountability for code",
      "responsibility review board"
     ]
    }
   ]
  },
  {
   "dimension": "Bug Solving Process",
   "label": "Bug solving",
   "categories": [
    {
     "category": "Structured public issue tracking",
     "meaning": "Bugs go through a public tracker with forms, templates, labels or a roadmap view.",
     "codes": [
      "public issue tracker",
      "structured issue templates",
      "issue labels",
      "issue-based roadmap"
     ]
    },
    {
     "category": "Bot or AI triage",
     "meaning": "Automation triages issues: AI duplicate detection, stale-issue closing, bot-driven assignment.",
     "codes": [
      "ai issue triage",
      "stale issue and assignment automation",
      "bot-driven issue assignment"
     ]
    },
    {
     "category": "Routing to owning teams",
     "meaning": "Confirmed bugs are routed to the team that owns the area, or tracked in an internal ticket system.",
     "codes": [
      "issue routing to owners",
      "cross-team coordination"
     ]
    },
    {
     "category": "Community-assisted diagnosis",
     "meaning": "Reporters and community members supply reproduction logs, root-cause analysis or first-line support.",
     "codes": [
      "community bug reports",
      "community root-cause analysis",
      "community support channels",
      "logs shared for reproduction"
     ]
    },
    {
     "category": "Agent finds and fixes bugs",
     "meaning": "The agent hunts for bugs, plans or drafts fixes, and engineers review what it produced.",
     "codes": [
      "agent finds and fixes its own bugs",
      "nightly scheduled agent runs",
      "plan-first with agent",
      "human oversight of agent output"
     ]
    },
    {
     "category": "Vulnerability intake and fast patching",
     "meaning": "Security bugs come through bug bounty or disclosure programs and are patched quickly; attacks are turned into training data.",
     "codes": [
      "bug bounty program",
      "vulnerability disclosure process",
      "rapid security fix deployment",
      "failures fed back into training"
     ]
    },
    {
     "category": "Incident response and rollback",
     "meaning": "Production failures are traced, rolled back or recovered automatically.",
     "codes": [
      "incident response",
      "fast rollback",
      "tracing and monitoring",
      "runtime validation and recovery"
     ]
    },
    {
     "category": "Public fix communication",
     "meaning": "Fixes, incidents and their redesigns are reported publicly: release notes, incident write-ups, engineering blog.",
     "codes": [
      "public release notes",
      "public incident report",
      "public engineering blog",
      "architectural redesign"
     ]
    },
    {
     "category": "Best-effort, untriaged handling",
     "meaning": "No SLA, labels or assignees; maintainers fix what they can, sometimes by direct commit.",
     "codes": [
      "best-effort issue response",
      "no issue triage labels",
      "direct commits by maintainers"
     ]
    },
    {
     "category": "Bug patterns (not a practice)",
     "meaning": "Categories of bugs reported for the agent; kept so failure types can be compared across agents.",
     "codes": [
      "bug pattern: agent loop and model handling",
      "bug pattern: api and contract mismatch",
      "bug pattern: concurrency and lifecycle",
      "bug pattern: configuration and environment",
      "bug pattern: input and data handling",
      "bug pattern: resource and dependency leaks",
      "bug pattern: security and privacy",
      "bug pattern: version and platform regressions"
     ]
    }
   ]
  },
  {
   "dimension": "SE Methodology",
   "label": "SE methodology",
   "categories": [
    {
     "category": "Agents do the development work",
     "meaning": "Engineers develop the product with AI agents: the agent writes most code, engineers plan with and manage agents, AI is mandatory in daily work, agent runs are monitored, repos ship agent config.",
     "codes": [
      "agent writes its own product code",
      "engineers manage agents",
      "plan-first with agent",
      "ai tools in daily workflow",
      "agent context files",
      "ai code review",
      "human oversight of agent output",
      "tracing and monitoring",
      "cost and token observability"
     ]
    },
    {
     "category": "Dogfooding-driven development",
     "meaning": "What gets built is steered by the team's own use of the agent and by usage data.",
     "codes": [
      "internal dogfooding",
      "agent runs team's own operations",
      "internal user feedback",
      "usage data guides development",
      "rapid iteration on feedback"
     ]
    },
    {
     "category": "Prototype- and experiment-first",
     "meaning": "Many quick prototypes or experiments instead of up-front specs; ship, learn, fix forward.",
     "codes": [
      "rapid prototyping and iteration",
      "experiment-driven development",
      "start permissive then restrict",
      "fix forward"
     ]
    },
    {
     "category": "Eval-driven development",
     "meaning": "A develop-evaluate-refine loop where eval results decide the next change.",
     "codes": [
      "eval-driven improvement loop",
      "trajectory evaluation"
     ]
    },
    {
     "category": "Research-gated releases",
     "meaning": "Each version follows a research milestone and ships with a paper or tech report.",
     "codes": [
      "research-gated releases",
      "public model cards and research papers",
      "per-version readme"
     ]
    },
    {
     "category": "Trunk-based monorepo workflow",
     "meaning": "One repository and trunk, short branches, small changes gated by presubmits, large-scale automated changes, shared dev tooling.",
     "codes": [
      "trunk-based development",
      "monorepo",
      "small single-purpose changes",
      "pre-commit and presubmit checks",
      "large-scale automated code changes",
      "branch per ticket",
      "build and execution infrastructure"
     ]
    },
    {
     "category": "Release-train discipline",
     "meaning": "Methodology defined by how releases flow: fixed cadence, internal-first, feature flags, semantic versioning and compatibility.",
     "codes": [
      "frequent release cadence",
      "internal-first release",
      "feature flags",
      "versioning and compatibility policy"
     ]
    },
    {
     "category": "Small autonomous flat teams",
     "meaning": "Two-to-four-person teams, one engineer title, ideas bottom-up, broad goals set from the top.",
     "codes": [
      "small autonomous teams",
      "flat roles",
      "bottom-up decision-making",
      "organisational goal-setting"
     ]
    },
    {
     "category": "Defined roles and planned cadence",
     "meaning": "Named roles, sprints and recurring structured meetings with post-mortems.",
     "codes": [
      "defined roles",
      "two-week sprints",
      "structured team meetings",
      "post-mortem review"
     ]
    },
    {
     "category": "Stated design principles",
     "meaning": "Published principles for the agent's design, including security-first and human-in-the-loop design and redesigns that follow them.",
     "codes": [
      "agent design principles",
      "architectural redesign",
      "security-first design",
      "human approval for sensitive actions",
      "sandboxed execution"
     ]
    }
   ]
  },
  {
   "dimension": "Developer Communication",
   "label": "Developer communication",
   "categories": [
    {
     "category": "Agent as a communication channel",
     "meaning": "Engineers ask the agent instead of colleagues, onboard with it, give feedback to an AI tool in-thread, or let it run team operations.",
     "codes": [
      "agent as team knowledge source",
      "agent-assisted onboarding",
      "agent runs team's own operations",
      "internal dogfooding",
      "developer feedback improves ai reviewer"
     ]
    },
    {
     "category": "Open chat and shared records",
     "meaning": "Communication defaults to open chat channels, documents and logs anyone can read.",
     "codes": [
      "chat-based communication",
      "open internal channels and records",
      "build and execution infrastructure"
     ]
    },
    {
     "category": "Written, asynchronous decisions",
     "meaning": "Decisions travel in writing: mailing lists, design docs before work, decision records, written culture, a distributed team.",
     "codes": [
      "async communication",
      "design docs before implementation",
      "decision records",
      "distributed team",
      "bottom-up decision-making",
      "team culture norms"
     ]
    },
    {
     "category": "Synchronous and in-person coordination",
     "meaning": "Spontaneous or scheduled face-to-face meetings, escalation to video, shadowing-based onboarding.",
     "codes": [
      "in-person and synchronous collaboration",
      "structured team meetings",
      "post-mortem review",
      "flat roles",
      "structured onboarding"
     ]
    },
    {
     "category": "Communication through repository artifacts",
     "meaning": "PR descriptions, commit conventions, code-owner requests and issue bot commands carry coordination.",
     "codes": [
      "descriptive pr descriptions",
      "structured commit and pr title convention",
      "code owners",
      "bot-driven issue assignment"
     ]
    },
    {
     "category": "Public engineering communication",
     "meaning": "The team talks to the outside through blogs, tech reports, release notes, worklogs and outreach.",
     "codes": [
      "public engineering blog",
      "community outreach",
      "public incident report",
      "public model cards and research papers",
      "public release notes",
      "published operational worklog",
      "bilingual docs"
     ]
    },
    {
     "category": "Community and researcher channels",
     "meaning": "Two-way channels with users and security researchers: forums, Discord, coordinated disclosure.",
     "codes": [
      "community support channels",
      "vulnerability disclosure process"
     ]
    }
   ]
  },
  {
   "dimension": "Hollistic Documentation",
   "label": "Documentation",
   "categories": [
    {
     "category": "Documentation written for agents",
     "meaning": "Context files (CLAUDE.md, AGENTS.md) and machine-readable docs aimed at coding agents.",
     "codes": [
      "agent context files",
      "agent-readable documentation"
     ]
    },
    {
     "category": "Docs change with the code",
     "meaning": "Docs live in the repo and must be updated in the same or a paired PR, follow a standard, or are the tests themselves.",
     "codes": [
      "docs updated with code",
      "docs-as-code",
      "documentation standards",
      "tests as documentation",
      "structured issue templates"
     ]
    },
    {
     "category": "Generated docs and release notes",
     "meaning": "Docs or release notes are generated from code, migrations, commit titles or PRs, with human review.",
     "codes": [
      "generated docs and release notes",
      "structured commit and pr title convention",
      "descriptive pr descriptions",
      "human oversight of agent output"
     ]
    },
    {
     "category": "Developer portal",
     "meaning": "A hosted documentation site or per-version READMEs for users and builders.",
     "codes": [
      "documentation portal",
      "per-version readme"
     ]
    },
    {
     "category": "Research papers and model cards",
     "meaning": "Tech reports, papers and model cards document the model and agent design.",
     "codes": [
      "public model cards and research papers"
     ]
    },
    {
     "category": "Release notes and engineering blog",
     "meaning": "Changes and internals are documented in release notes and blog posts.",
     "codes": [
      "public release notes",
      "public engineering blog"
     ]
    },
    {
     "category": "Public security documentation",
     "meaning": "Security model, policies and incidents are documented publicly.",
     "codes": [
      "public security documentation",
      "public incident report"
     ]
    }
   ]
  }
 ],
 "not_practice": {
  "category": "Not a practice",
  "meaning": "Definitions and product events coded for completeness; excluded from pattern counts.",
  "pairs": [
   {
    "dimension": "CI/CD Pipeline Practices",
    "code": "product renaming"
   },
   {
    "dimension": "Testing Methodologies",
    "code": "eval definition"
   }
  ]
 },
 "agent_groups": [
  {
   "group": "chat",
   "agents": [
    "Anthropic Claude Code",
    "OpenAI Codex",
    "Gemini CLI",
    "Google Gemini",
    "Kimi ok Computer"
   ]
  },
  {
   "group": "browser",
   "agents": [
    "Opera Neon",
    "Perplexity Comet",
    "Alibaba Mobile Agent"
   ]
  },
  {
   "group": "enterprise",
   "agents": [
    "Browser Use",
    "Glean Agents",
    "Gemini Enterprise",
    "Hubspot breeze Studio",
    "WatsonX Orchestrate",
    "N8N Agents"
   ]
  }
 ],
 "codebook_header": [
  "code",
  "uses",
  "Code review",
  "CI/CD",
  "Testing",
  "Bug solving",
  "SE methodology",
  "Developer communication",
  "Documentation",
  "item ids (at last run)"
 ],
 "categories_header": [
  "dimension",
  "category",
  "meaning",
  "codes",
  "items",
  "agents",
  "agents, agent-specific items"
 ],
 "notes": [
  "items: Practices items in this dimension with at least one code of this category. agents: how many agents have such an item. agents, agent-specific items: the same, leaving out items marked Company = yes or Marketing piece = yes.",
  "Per-agent columns give the number of items. codes is live; the other counts were computed by apply_categories.gs from the Agreement Index when it last ran, so re-run it after recoding.",
  "Categories are scoped to one dimension; Codebook columns C to I give each code's category in each dimension it is used in. Scheme: data/dataset/open_coding_categories.json."
 ]
};
