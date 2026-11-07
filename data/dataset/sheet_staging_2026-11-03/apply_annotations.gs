/**
 * Writes the open-coding annotations to "Analysis of SE AI Agent Index".
 * Run AFTER applyPush() (apply_push.gs) and applyRestore() (restore_agreement.gs).
 *
 * 1. Run checkAnnotations()  -> reads the sheet, writes nothing, logs a report.
 * 2. Run applyAnnotations()  -> repeats every check; writes only if all of them pass.
 *
 * What it writes:
 *   - Agreement Index headers annotation_1..N and annotation_memo, starting at column L, and the
 *     codes for each coded item, found by info_item_id (column D), not by row number;
 *   - the agreement summary block in its new place;
 *   - the "Codebook" tab: created if missing, extended with missing codes if it exists, and
 *     replaced if it comes from an earlier round (that one is kept as "Codebook-<round>");
 *   - a dropdown on the tag columns fed by Codebook column A that still accepts new values.
 *
 * The annotation area (row 1 to the last row, column L to the last column any round used) may
 * hold only blanks, this round's values, or the values an earlier round wrote in that cell
 * (apply_push.gs summary, round 1, round 3). Those are replaced. Anything else, such as a code
 * typed by hand, stops the run and nothing is written. Safe to re-run.
 */

function checkAnnotations() {
  const plan = annPreflight_();
  console.log(plan.report.join('\n'));
  console.log(plan.problems.length
    ? 'CHECK FAILED: ' + plan.problems.length + ' problem(s). Nothing was written.'
    : 'CHECK PASSED. Nothing was written. Run applyAnnotations() to apply.');
}

function applyAnnotations() {
  let plan = annPreflight_();
  console.log(plan.report.join('\n'));
  if (plan.problems.length) {
    throw new Error('Stopped before writing: ' + plan.problems.length +
      ' problem(s), see log above. Nothing was written.');
  }
  const ss = plan.ss, cur = plan.cur, A = ANNOT, F = A.first_col, W = A.headers.length;
  const S = A.summary.col, L = plan.lastCol;

  // 0. Columns right of the memo column that still hold earlier-round values are deleted rather than
  //    cleared, so a Sheets table over them shrinks (a table rejects blank header cells). The
  //    preflight has checked that they hold nothing else; the summary is rewritten below.
  if (plan.dropCols.length) {
    const cols = plan.dropCols.map(annCol_).join(', ');
    plan.dropCols.slice().reverse().forEach(function (c) { cur.deleteColumn(c); });
    if (cur.getMaxColumns() < L) cur.insertColumnsAfter(cur.getMaxColumns(), L - cur.getMaxColumns());
    SpreadsheetApp.flush();
    console.log('Deleted column(s) ' + cols + ' (earlier-round values only).');
    plan = annPreflight_();
    console.log(plan.report.join('\n'));
    if (plan.problems.length) {
      throw new Error('After deleting the old columns the sheet does not match the expected layout: ' +
        plan.problems.length + ' problem(s), see log above. Nothing else was written; send this log.');
    }
  }
  const n = plan.lastRow;

  // 1. Annotation area: header row cell by cell (a table rejects blank headers), then the item rows
  if (plan.cellsToChange) {
    try {
      plan.target[0].forEach(function (v, j) {
        if (v !== plan.liveTop[j]) cur.getRange(1, F + j).setValue(v);
      });
      cur.getRange(2, F, n - 1, L - F + 1).setValues(plan.target.slice(1));
      SpreadsheetApp.flush();   // surface a rejected write here, before anything else changes
    } catch (e) {
      if (/table/i.test(String(e.message))) {
        throw new Error('The write to ' + annCol_(F) + '1:' + annCol_(L) + n + ' was rejected (' + e.message + '). ' +
          'A Sheets table on Agreement Index covers columns this script needs to clear. Send this log.');
      }
      throw e;
    }
    console.log('Wrote ' + plan.cellsToChange + ' cell(s) in ' + annCol_(F) + '1:' + annCol_(L) + n + '.');
  }
  cur.getRange('K1').copyTo(cur.getRange(1, F, 1, W), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  if (F + W <= L) cur.getRange(1, F + W, 1, L - F - W + 1).clearFormat();   // old round headers
  cur.getRange(4, S + 1).setNumberFormat('0.0%');
  cur.getRange(2, F, n - 1, W).setWrap(true).setVerticalAlignment('top');
  for (let c = F; c < F + W - 1; c++) cur.setColumnWidth(c, 220);
  cur.setColumnWidth(F + W - 1, 320);
  for (let c = F + W; c <= L; c++) cur.setColumnWidth(c, c === S ? 120 : 100);

  // 2. Codebook tab
  let cb = ss.getSheetByName('Codebook');
  if (plan.codebookReplace) {
    cb.setName(plan.codebookReplace);
    console.log('Renamed the earlier "Codebook" to "' + plan.codebookReplace + '".');
    cb = null;
  }
  if (!cb) {
    cb = ss.insertSheet('Codebook', cur.getIndex());   // right after Agreement Index
    const g = A.codebook;
    cb.getRange(1, 1, g.length, g[0].length).setValues(g);
    cb.getRange('A1:D1').setFontWeight('bold');
    cb.getRange('F1:I1').setFontWeight('bold');
    cb.getRange(2, 7, A.n_categories + 3, 1).setWrap(true);
    cb.getRange(A.n_categories + 3, 6).setWrap(true);
    [260, 220, 50, 420, 20, 220, 520, 50, 50].forEach(function (w, i) { cb.setColumnWidth(i + 1, w); });
    cb.setFrozenRows(1);
    console.log('Created "Codebook" with ' + (g.length - 1) + ' code(s) in ' + A.n_categories + ' categories.');
  } else if (plan.codebookAppend.length) {
    const start = plan.codebookLastRow + 1;
    cb.getRange(start, 1, plan.codebookAppend.length, 4).setValues(plan.codebookAppend);
    console.log('Appended ' + plan.codebookAppend.length + ' code(s) to "Codebook" from row ' + start + '.');
  }

  // 3. Dropdown on the tag columns (new values allowed)
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(cb.getRange(A.dropdown_source), true)
    .setAllowInvalid(true)
    .build();
  cur.getRange(2, F, n - 1, L - F + 1).clearDataValidations();
  cur.getRange(2, F, n - 1, A.n_tags).setDataValidation(rule);
  console.log('Dropdown set on ' + annCol_(F) + '2:' + annCol_(F + A.n_tags - 1) + n + '.');

  SpreadsheetApp.flush();

  const after = annPreflight_();
  const ok = after.problems.length === 0 && after.cellsToChange === 0 && !after.codebookMissing &&
    !after.codebookReplace && after.codebookAppend.length === 0;
  console.log(ok ? 'DONE. Re-read confirms every annotation is in place.'
                 : 'WARNING: re-read found differences:\n' + after.report.join('\n'));
}

// ---------------------------------------------------------------------------

const ANN_SPREADSHEET_ID = '10WMkTy7Zw0rovq8NDnlKH5yIBJhKT2MtId45aMb05RM';
// Summary block as apply_push.gs writes it to M1:N5 (no annotation columns yet).
const ANN_PUSH_LAYOUT = { round: 'push', headers: [], items: {}, summary_col: 13, summary_formulas: [
  '=COUNTIF(H2:H563,"Agree")', '=COUNTIF(H2:H563,"Disagree")', '=COUNTA(D2:D563)-N1-N2',
  '=IF(N1+N2=0,"",N1/(N1+N2))', '=COUNTIF(I2:I563,"yes")'] };

function annNorm_(v) {
  if (v instanceof Date) return v.toISOString();
  return String(v === null || v === undefined ? '' : v).replace(/\r\n?/g, '\n').trim();
}

function annCol_(c) {
  let s = '';
  for (; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + (c - 1) % 26) + s;
  return s;
}

// The cell values a layout puts in the annotation area: {"row,col": value}.
function annLayoutCells_(lay, rowOf, labels) {
  const F = ANNOT.first_col, out = {};
  lay.headers.forEach(function (h, j) { out['1,' + (F + j)] = h; });
  Object.keys(lay.items).forEach(function (id) {
    const hit = rowOf[id];
    if (!hit || hit.dup) return;
    lay.items[id].forEach(function (v, j) { if (annNorm_(v)) out[hit.row + ',' + (F + j)] = annNorm_(v); });
  });
  (lay.summary_labels || labels).forEach(function (l, i) {
    out[(i + 1) + ',' + lay.summary_col] = l;
    out[(i + 1) + ',' + (lay.summary_col + 1)] = lay.summary_formulas[i];
  });
  return out;
}

function annPreflight_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const A = ANNOT, F = A.first_col;
  const report = [], problems = [];
  const plan = { ss: ss, report: report, problems: problems, cur: null, lastRow: 0, lastCol: A.last_col,
                 target: null, liveTop: [], dropCols: [], cellsToChange: 0,
                 codebookMissing: false, codebookReplace: '', codebookAppend: [], codebookLastRow: 0 };
  function problem(msg) { problems.push(msg); report.push('  PROBLEM ' + msg); }

  if (ss.getId() !== ANN_SPREADSHEET_ID) {
    problem('This script is attached to spreadsheet ' + ss.getId() + ', expected ' + ANN_SPREADSHEET_ID + '.');
    return plan;
  }
  const cur = ss.getSheetByName('Agreement Index');
  if (!cur) { problem('"Agreement Index" tab not found.'); return plan; }
  if (!ss.getSheetByName('Agreement-old')) {
    problem('"Agreement-old" not found: run applyPush() (apply_push.gs) and applyRestore() first.');
    return plan;
  }
  if (annNorm_(cur.getRange('D1').getValue()) !== 'info_item_id') {
    problem('Agreement Index D1 is not "info_item_id"; the tab layout is not the rebuilt one.');
    return plan;
  }
  plan.cur = cur;
  const n = plan.lastRow = Math.max(cur.getLastRow(), 6);
  const L = plan.lastCol;

  // 1. Items, matched by info_item_id
  report.push('Items (' + A.items.length + ' coded):');
  const ids = cur.getRange(2, 1, n - 1, 4).getValues();
  const rowOf = {};
  ids.forEach(function (r, i) {
    const id = annNorm_(r[3]);
    if (!id) return;
    if (rowOf[id]) rowOf[id].dup = true; else rowOf[id] = { row: i + 2, agent: annNorm_(r[0]) };
  });
  let found = 0;
  A.items.forEach(function (it) {
    const hit = rowOf[it.id];
    if (!hit) { problem(it.id + ': not found in column D.'); return; }
    if (hit.dup) { problem(it.id + ': appears more than once in column D.'); return; }
    if (hit.agent !== annNorm_(it.agent)) {
      problem(it.id + ' (row ' + hit.row + '): agent is "' + hit.agent + '", expected "' + it.agent + '".');
      return;
    }
    found++;
  });
  report.push('  ' + found + ' found in column D.');
  if (problems.length) return plan;

  // 2. Annotation area, cell by cell
  report.push('Annotation area ' + annCol_(F) + '1:' + annCol_(L) + n + ':');
  const items = {};
  A.items.forEach(function (it) { items[it.id] = it.values; });
  const want = annLayoutCells_({ headers: A.headers, items: items, summary_col: A.summary.col,
                                 summary_formulas: A.summary.formulas }, rowOf, A.summary.labels);
  // An earlier round with more tag columns, as it looks after its spare tag columns are deleted.
  const shrunk = A.prev.filter(function (p) { return p.headers.length > A.headers.length; }).map(function (p) {
    const cut = function (v) { return v.slice(0, A.n_tags).concat([v[v.length - 1]]); };
    const its = {};
    Object.keys(p.items).forEach(function (id) { its[id] = cut(p.items[id]); });
    return { round: p.round, headers: cut(p.headers), items: its, summary_labels: p.summary_labels,
             summary_col: p.summary_col - (p.headers.length - A.headers.length),
             summary_formulas: A.summary.formulas };
  });
  // The summary block in any column (columns may have been inserted or deleted by hand); its
  // formulas then point at the column next to the labels.
  const moved = [];
  for (let c = F; c < L; c++) {
    const x = annCol_(c + 1);
    moved.push({ round: 'summary', headers: [], items: {}, summary_col: c, summary_formulas: [
      '=COUNTIF(H2:H563,"Agree")', '=COUNTIF(H2:H563,"Disagree")', '=COUNTA(D2:D563)-' + x + '1-' + x + '2',
      '=IF(' + x + '1+' + x + '2=0,"",' + x + '1/(' + x + '1+' + x + '2))', '=COUNTIF(I2:I563,"yes")'] });
  }
  const earlier = [ANN_PUSH_LAYOUT].concat(A.prev, shrunk, moved).map(function (lay) {
    return { round: lay.round, cells: annLayoutCells_(lay, rowOf, A.summary.labels) };
  });
  const range = cur.getRange(1, F, n, L - F + 1);
  const vals = range.getValues(), forms = range.getFormulas();
  const top = vals[0].map(function (v, j) { return forms[0][j] ? annNorm_(forms[0][j]) : annNorm_(v); });
  plan.liveTop = top;
  plan.target = [];
  const replaced = {}, clashes = [];
  for (let r = 1; r <= n; r++) {
    const row = [];
    for (let c = F; c <= L; c++) {
      const key = r + ',' + c, w = want[key] || '';
      const f = forms[r - 1][c - F], v = f ? annNorm_(f) : annNorm_(vals[r - 1][c - F]);
      row.push(w);
      if (v === w) continue;
      plan.cellsToChange++;
      if (v === '') continue;
      const from = earlier.filter(function (e) { return e.cells[key] === v; })[0];
      if (from) replaced[from.round] = (replaced[from.round] || 0) + 1;
      else clashes.push(annCol_(c) + r + ' holds "' + v + '"' + (w ? ', expected "' + w + '"' : ', expected empty'));
    }
    plan.target.push(row);
  }
  clashes.slice(0, 25).forEach(problem);
  if (clashes.length > 25) problem('... and ' + (clashes.length - 25) + ' more cell(s) like these.');
  if (clashes.length) {
    report.push('  These cells hold values no annotation round wrote (for example codes typed by hand). ' +
                'Copy them somewhere safe and clear them, or add them to the local xlsx and rebuild this script.');
  }
  // Old columns right of the memo column (earlier tag columns, an old summary): see applyAnnotations step 0.
  if (plan.cellsToChange && !clashes.length) {
    for (let c = F + A.headers.length; c <= L; c++) {
      let used = false;
      for (let r = 0; r < n && !used; r++) used = annNorm_(forms[r][c - F]) !== '' || annNorm_(vals[r][c - F]) !== '';
      if (used) plan.dropCols.push(c);
    }
    if (plan.dropCols.length) {
      report.push('  will first delete column(s) ' + plan.dropCols.map(annCol_).join(', ') +
                  ', which hold only earlier-round values; the summary is then rewritten at ' +
                  annCol_(A.summary.col) + '1:' + annCol_(A.summary.col + 1) + '5.');
    }
  }
  const rep = Object.keys(replaced).map(function (k) { return replaced[k] + ' from ' + k; }).join(', ');
  report.push('  ' + (plan.cellsToChange ? plan.cellsToChange + ' cell(s) to write' +
              (rep ? ' (replacing earlier values: ' + rep + ')' : '') + '.' : 'already applied.'));

  // 3. Codebook
  report.push('Codebook:');
  const cb = ss.getSheetByName('Codebook');
  if (!cb) {
    plan.codebookMissing = true;
    report.push('  tab missing; will create it with ' + (A.codebook.length - 1) + ' code(s).');
  } else {
    const head = annNorm_(cb.getRange('A1').getValue());
    const old = A.prev.filter(function (p) { return p.codebook_header === head; })[0];
    if (head === annNorm_(A.codebook[0][0])) {
      const colA = cb.getRange(1, 1, Math.max(cb.getLastRow(), 1), 1).getValues().map(function (r) { return annNorm_(r[0]); });
      let last = 0;
      colA.forEach(function (v, i) { if (v) last = i + 1; });
      plan.codebookLastRow = last;
      const have = {};
      colA.forEach(function (v) { have[v] = true; });
      A.codebook.slice(1).forEach(function (r) {
        if (r[0] && !have[annNorm_(r[0])]) plan.codebookAppend.push(r.slice(0, 4));
      });
      // the use-count formulas point at their own row, so re-point appended ones
      plan.codebookAppend.forEach(function (r, i) {
        r[2] = String(r[2]).replace(/A\d+\)$/, 'A' + (last + 1 + i) + ')');
      });
      report.push('  tab exists; ' + plan.codebookAppend.length + ' code(s) to append after row ' + last + '.');
    } else if (old) {
      const name = 'Codebook-' + old.round;
      if (ss.getSheetByName(name)) {
        problem('"Codebook" is the ' + old.round + ' codebook, but "' + name + '" already exists. Rename or delete it first.');
      } else {
        plan.codebookReplace = name;
        report.push('  ' + old.round + ' codebook; will rename it to "' + name + '" and create the new one.');
      }
    } else {
      problem('"Codebook" A1 is "' + head + '", which matches no annotation round.');
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Generated by build_annotation_push.py from the local xlsx; do not edit by hand.
const ANNOT = {
 "source": "Analysis of SE AI Agent Index.xlsx",
 "first_col": 12,
 "last_col": 23,
 "n_tags": 4,
 "headers": [
  "annotation_1",
  "annotation_2",
  "annotation_3",
  "annotation_4",
  "annotation_memo"
 ],
 "items": [
  {
   "id": "CLAUDE-TEST-PRA-01",
   "agent": "Anthropic Claude Code",
   "values": [
    "unit tests",
    "llm-as-judge",
    "internal dogfooding",
    "a/b testing in production",
    "Also names end-to-end tests"
   ]
  },
  {
   "id": "CLAUDE-TEST-PRA-02",
   "agent": "Anthropic Claude Code",
   "values": [
    "eval definition",
    "",
    "",
    "",
    "Definition of an eval, not a team practice"
   ]
  },
  {
   "id": "CLAUDE-TEST-PRA-03",
   "agent": "Anthropic Claude Code",
   "values": [
    "single- and multi-turn evals",
    "tests verify agent outcome",
    "",
    "",
    "Anthropic-wide eval approach (MCP-server example), not specific to Claude Code"
   ]
  },
  {
   "id": "CLAUDE-TEST-PRA-04",
   "agent": "Anthropic Claude Code",
   "values": [
    "eval definition",
    "",
    "",
    "",
    "Mostly a definition"
   ]
  },
  {
   "id": "CLAUDE-TEST-PRA-05",
   "agent": "Anthropic Claude Code",
   "values": [
    "internal dogfooding",
    "internal user feedback",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CLAUDE-CICD-PRA-01",
   "agent": "Anthropic Claude Code",
   "values": [
    "frequent release cadence",
    "internal-first release",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CLAUDE-CODEREV-PRA-01",
   "agent": "Anthropic Claude Code",
   "values": [
    "review findings turned into lint rules",
    "",
    "",
    "",
    "Rooted in one engineer's career history; the link to Claude Code is asserted, not shown"
   ]
  },
  {
   "id": "CLAUDE-CODEREV-PRA-02",
   "agent": "Anthropic Claude Code",
   "values": [
    "ai code review",
    "agent reviews its own codebase",
    "multi-agent review",
    "human merge approval",
    ""
   ]
  },
  {
   "id": "CLAUDE-BUG-PRA-01",
   "agent": "Anthropic Claude Code",
   "values": [
    "public issue tracker",
    "stale issue and assignment automation",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CLAUDE-SEMETH-PRA-01",
   "agent": "Anthropic Claude Code",
   "values": [
    "rapid prototyping and iteration",
    "agent writes its own product code",
    "rapid iteration on feedback",
    "internal user feedback",
    ""
   ]
  },
  {
   "id": "CLAUDE-SEMETH-PRA-02",
   "agent": "Anthropic Claude Code",
   "values": [
    "flat roles",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "CLAUDE-SEMETH-PRA-03",
   "agent": "Anthropic Claude Code",
   "values": [
    "frequent release cadence",
    "rapid prototyping and iteration",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CLAUDE-DEVCOM-PRA-01",
   "agent": "Anthropic Claude Code",
   "values": [
    "agent as team knowledge source",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CLAUDE-DOC-PRA-01",
   "agent": "Anthropic Claude Code",
   "values": [
    "agent context files",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-01",
   "agent": "OpenAI Codex",
   "values": [
    "agent-runnable tests",
    "agent context files",
    "modular architecture",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-02",
   "agent": "OpenAI Codex",
   "values": [
    "agent tests its own product",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-03",
   "agent": "OpenAI Codex",
   "values": [
    "nightly scheduled agent runs",
    "agent finds and fixes its own bugs",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-04",
   "agent": "OpenAI Codex",
   "values": [
    "ci on every pr",
    "pre-merge vs post-merge checks",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-05",
   "agent": "OpenAI Codex",
   "values": [
    "flaky-test handling",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-06",
   "agent": "OpenAI Codex",
   "values": [
    "team bug bashes",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-07",
   "agent": "OpenAI Codex",
   "values": [
    "agent tests its own product",
    "test evidence in pr",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-TEST-PRA-08",
   "agent": "OpenAI Codex",
   "values": [
    "internal eval framework",
    "a/b testing in production",
    "internal dogfooding",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CICD-PRA-01",
   "agent": "OpenAI Codex",
   "values": [
    "single merge-blocking ci gate",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CICD-PRA-02",
   "agent": "OpenAI Codex",
   "values": [
    "pre-merge vs post-merge checks",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CICD-PRA-03",
   "agent": "OpenAI Codex",
   "values": [
    "automated release pipeline",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CICD-PRA-04",
   "agent": "OpenAI Codex",
   "values": [
    "frequent release cadence",
    "package-manager distribution",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CICD-PRA-05",
   "agent": "OpenAI Codex",
   "values": [
    "internal-first release",
    "feature flags",
    "",
    "",
    "Company-wide (Codex cloud launch)"
   ]
  },
  {
   "id": "CODEX-CODEREV-PRA-01",
   "agent": "OpenAI Codex",
   "values": [
    "ai code review",
    "custom-trained review model",
    "ai code review on every pr",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CODEREV-PRA-02",
   "agent": "OpenAI Codex",
   "values": [
    "human review for critical code",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CODEREV-PRA-03",
   "agent": "OpenAI Codex",
   "values": [
    "ai code review on every pr",
    "",
    "",
    "",
    "Company-wide (all OpenAI PRs)"
   ]
  },
  {
   "id": "CODEX-CODEREV-PRA-04",
   "agent": "OpenAI Codex",
   "values": [
    "ai review before human review",
    "review overload",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-CODEREV-PRA-05",
   "agent": "OpenAI Codex",
   "values": [
    "descriptive pr descriptions",
    "small single-purpose changes",
    "modular architecture",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-BUG-PRA-01",
   "agent": "OpenAI Codex",
   "values": [
    "bug pattern: security and privacy",
    "bug pattern: resource and dependency leaks",
    "bug pattern: api and contract mismatch",
    "bug pattern: version and platform regressions",
    "Bug categories, not a practice"
   ]
  },
  {
   "id": "CODEX-BUG-PRA-02",
   "agent": "OpenAI Codex",
   "values": [
    "public incident report",
    "architectural redesign",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-BUG-PRA-03",
   "agent": "OpenAI Codex",
   "values": [
    "structured issue templates",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-BUG-PRA-04",
   "agent": "OpenAI Codex",
   "values": [
    "ai issue triage",
    "logs shared for reproduction",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-BUG-PRA-05",
   "agent": "OpenAI Codex",
   "values": [
    "community bug reports",
    "community root-cause analysis",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-BUG-PRA-06",
   "agent": "OpenAI Codex",
   "values": [
    "agent finds and fixes its own bugs",
    "nightly scheduled agent runs",
    "human oversight of agent output",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-BUG-PRA-07",
   "agent": "OpenAI Codex",
   "values": [
    "agent finds and fixes its own bugs",
    "nightly scheduled agent runs",
    "tracing and monitoring",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-SEMETH-PRA-01",
   "agent": "OpenAI Codex",
   "values": [
    "agent writes its own product code",
    "engineers manage agents",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-SEMETH-PRA-02",
   "agent": "OpenAI Codex",
   "values": [
    "monorepo",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-SEMETH-PRA-03",
   "agent": "OpenAI Codex",
   "values": [
    "small autonomous teams",
    "bottom-up decision-making",
    "experiment-driven development",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "CODEX-SEMETH-PRA-04",
   "agent": "OpenAI Codex",
   "values": [
    "plan-first with agent",
    "human oversight of agent output",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-SEMETH-PRA-05",
   "agent": "OpenAI Codex",
   "values": [
    "rapid prototyping and iteration",
    "organisational goal-setting",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "CODEX-SEMETH-PRA-06",
   "agent": "OpenAI Codex",
   "values": [
    "architectural redesign",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DEVCOM-PRA-01",
   "agent": "OpenAI Codex",
   "values": [
    "chat-based communication",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "CODEX-DEVCOM-PRA-02",
   "agent": "OpenAI Codex",
   "values": [
    "open internal channels and records",
    "agent as team knowledge source",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DEVCOM-PRA-03",
   "agent": "OpenAI Codex",
   "values": [
    "in-person and synchronous collaboration",
    "flat roles",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DEVCOM-PRA-04",
   "agent": "OpenAI Codex",
   "values": [
    "agent as team knowledge source",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DEVCOM-PRA-05",
   "agent": "OpenAI Codex",
   "values": [
    "structured onboarding",
    "agent-assisted onboarding",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DOC-PRA-01",
   "agent": "OpenAI Codex",
   "values": [
    "agent context files",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DOC-PRA-02",
   "agent": "OpenAI Codex",
   "values": [
    "agent context files",
    "docs updated with code",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DOC-PRA-03",
   "agent": "OpenAI Codex",
   "values": [
    "agent-readable documentation",
    "structured issue templates",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DOC-PRA-04",
   "agent": "OpenAI Codex",
   "values": [
    "tests as documentation",
    "descriptive pr descriptions",
    "",
    "",
    ""
   ]
  },
  {
   "id": "CODEX-DOC-PRA-05",
   "agent": "OpenAI Codex",
   "values": [
    "agent-readable documentation",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMCLI-TEST-PRA-01",
   "agent": "Gemini CLI",
   "values": [
    "unit tests",
    "integration tests",
    "sandboxed execution",
    "lint and static checks",
    ""
   ]
  },
  {
   "id": "GEMCLI-TEST-PRA-02",
   "agent": "Gemini CLI",
   "values": [
    "flaky-test handling",
    "performance, memory and stress tests",
    "nightly scheduled test runs",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-CICD-PRA-01",
   "agent": "Gemini CLI",
   "values": [
    "automated release pipeline",
    "ci on every pr",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-CICD-PRA-02",
   "agent": "Gemini CLI",
   "values": [
    "frequent release cadence",
    "manual release trigger",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-CICD-PRA-03",
   "agent": "Gemini CLI",
   "values": [
    "ci on every pr",
    "cross-platform test matrix",
    "lint and static checks",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-CODEREV-PRA-01",
   "agent": "Gemini CLI",
   "values": [
    "small single-purpose changes",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-CODEREV-PRA-02",
   "agent": "Gemini CLI",
   "values": [
    "ai code review",
    "agent reviews its own codebase",
    "contributor license agreement",
    "",
    "Self-review comes from q-67: the tool runs inside a Gemini CLI session (/review-frontend)"
   ]
  },
  {
   "id": "GEMCLI-CODEREV-PRA-03",
   "agent": "Gemini CLI",
   "values": [
    "code-health approval standard",
    "",
    "",
    "",
    "Company-wide guideline"
   ]
  },
  {
   "id": "GEMCLI-CODEREV-PRA-04",
   "agent": "Gemini CLI",
   "values": [
    "response-time targets",
    "",
    "",
    "",
    "Company-wide guideline"
   ]
  },
  {
   "id": "GEMCLI-BUG-PRA-01",
   "agent": "Gemini CLI",
   "values": [
    "bug pattern: version and platform regressions",
    "bug pattern: agent loop and model handling",
    "bug pattern: concurrency and lifecycle",
    "bot-driven issue assignment",
    "Bug categories plus one practice (bot-driven assignment); input-parsing bugs also listed"
   ]
  },
  {
   "id": "GEMCLI-BUG-PRA-02",
   "agent": "Gemini CLI",
   "values": [
    "stale issue and assignment automation",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-BUG-PRA-03",
   "agent": "Gemini CLI",
   "values": [
    "issue-based roadmap",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-SEMETH-PRA-01",
   "agent": "Gemini CLI",
   "values": [
    "trunk-based development",
    "",
    "",
    "",
    "Company-wide philosophy"
   ]
  },
  {
   "id": "GEMCLI-SEMETH-PRA-02",
   "agent": "Gemini CLI",
   "values": [
    "monorepo",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-SEMETH-PRA-03",
   "agent": "Gemini CLI",
   "values": [
    "agent design principles",
    "",
    "",
    "",
    "Marketing"
   ]
  },
  {
   "id": "GEMCLI-DEVCOM-PRA-01",
   "agent": "Gemini CLI",
   "values": [
    "bot-driven issue assignment",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMCLI-DOC-PRA-01",
   "agent": "Gemini CLI",
   "values": [
    "docs updated with code",
    "documentation standards",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMINI-TEST-PRA-01",
   "agent": "Google Gemini",
   "values": [
    "benchmark evaluation",
    "red-teaming and adversarial testing",
    "internal dogfooding",
    "public model cards and research papers",
    ""
   ]
  },
  {
   "id": "GEMINI-TEST-PRA-02",
   "agent": "Google Gemini",
   "values": [
    "responsibility review board",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMINI-CICD-PRA-01",
   "agent": "Google Gemini",
   "values": [
    "staged rollout",
    "versioning and compatibility policy",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMINI-CODEREV-PRA-01",
   "agent": "Google Gemini",
   "values": [
    "mandatory human code review",
    "readability certification",
    "code owners",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-CODEREV-PRA-02",
   "agent": "Google Gemini",
   "values": [
    "small single-purpose changes",
    "tests required with change",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-CODEREV-PRA-03",
   "agent": "Google Gemini",
   "values": [
    "response-time targets",
    "non-blocking review comments",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-CODEREV-PRA-04",
   "agent": "Google Gemini",
   "values": [
    "review rubric and style authority",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-CODEREV-PRA-05",
   "agent": "Google Gemini",
   "values": [
    "code-health approval standard",
    "non-blocking review comments",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-CODEREV-PRA-06",
   "agent": "Google Gemini",
   "values": [
    "review as knowledge sharing",
    "non-blocking review comments",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-BUG-PRA-01",
   "agent": "Google Gemini",
   "values": [
    "issue routing to owners",
    "cross-team coordination",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMINI-SEMETH-PRA-01",
   "agent": "Google Gemini",
   "values": [
    "structured team meetings",
    "post-mortem review",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-SEMETH-PRA-02",
   "agent": "Google Gemini",
   "values": [
    "defined roles",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-DEVCOM-PRA-01",
   "agent": "Google Gemini",
   "values": [
    "open internal channels and records",
    "chat-based communication",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-DEVCOM-PRA-02",
   "agent": "Google Gemini",
   "values": [
    "async communication",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-DEVCOM-PRA-03",
   "agent": "Google Gemini",
   "values": [
    "design docs before implementation",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMINI-DEVCOM-PRA-04",
   "agent": "Google Gemini",
   "values": [
    "structured team meetings",
    "post-mortem review",
    "",
    "",
    "Company-wide; overlaps GEMINI-SEMETH-PRA-01"
   ]
  },
  {
   "id": "GEMINI-DOC-PRA-01",
   "agent": "Google Gemini",
   "values": [
    "public model cards and research papers",
    "public release notes",
    "",
    "",
    ""
   ]
  },
  {
   "id": "KIMI-TEST-PRA-01",
   "agent": "Kimi ok Computer",
   "values": [
    "internal eval framework",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "KIMI-TEST-PRA-02",
   "agent": "Kimi ok Computer",
   "values": [
    "benchmark evaluation",
    "repeated eval runs",
    "internal dogfooding",
    "third-party evaluation",
    "Also names a long-running stress test"
   ]
  },
  {
   "id": "KIMI-CICD-PRA-01",
   "agent": "Kimi ok Computer",
   "values": [
    "agent tests its own product",
    "published operational worklog",
    "generated docs and release notes",
    "bilingual docs",
    "Mixes three separate practices"
   ]
  },
  {
   "id": "KIMI-BUG-PRA-01",
   "agent": "Kimi ok Computer",
   "values": [
    "runtime validation and recovery",
    "",
    "",
    "",
    "Describes product behaviour, not a team practice"
   ]
  },
  {
   "id": "KIMI-SEMETH-PRA-01",
   "agent": "Kimi ok Computer",
   "values": [
    "internal dogfooding",
    "agent runs team's own operations",
    "usage data guides development",
    "",
    ""
   ]
  },
  {
   "id": "KIMI-DEVCOM-PRA-01",
   "agent": "Kimi ok Computer",
   "values": [
    "community support channels",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "KIMI-DEVCOM-PRA-02",
   "agent": "Kimi ok Computer",
   "values": [
    "public engineering blog",
    "community outreach",
    "public model cards and research papers",
    "",
    ""
   ]
  },
  {
   "id": "KIMI-DEVCOM-PRA-03",
   "agent": "Kimi ok Computer",
   "values": [
    "published operational worklog",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "KIMI-DOC-PRA-01",
   "agent": "Kimi ok Computer",
   "values": [
    "public model cards and research papers",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-TEST-PRA-01",
   "agent": "Opera Neon",
   "values": [
    "security review and pen-testing",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-TEST-PRA-02",
   "agent": "Opera Neon",
   "values": [
    "staged rollout",
    "usage data guides development",
    "community bug reports",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-TEST-PRA-03",
   "agent": "Opera Neon",
   "values": [
    "bug bounty program",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-CICD-PRA-01",
   "agent": "Opera Neon",
   "values": [
    "staged rollout",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-CICD-PRA-02",
   "agent": "Opera Neon",
   "values": [
    "sandboxed execution",
    "",
    "",
    "",
    "Describes product architecture"
   ]
  },
  {
   "id": "OPERA-CODEREV-PRA-01",
   "agent": "Opera Neon",
   "values": [
    "security review and pen-testing",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-CODEREV-PRA-02",
   "agent": "Opera Neon",
   "values": [
    "post-mortem review",
    "public incident report",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-BUG-PRA-01",
   "agent": "Opera Neon",
   "values": [
    "bug bounty program",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-BUG-PRA-02",
   "agent": "Opera Neon",
   "values": [
    "rapid security fix deployment",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-BUG-PRA-03",
   "agent": "Opera Neon",
   "values": [
    "vulnerability disclosure process",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-SEMETH-PRA-01",
   "agent": "Opera Neon",
   "values": [
    "rapid prototyping and iteration",
    "research-gated releases",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-SEMETH-PRA-02",
   "agent": "Opera Neon",
   "values": [
    "human approval for sensitive actions",
    "",
    "",
    "",
    "Describes product design"
   ]
  },
  {
   "id": "OPERA-SEMETH-PRA-03",
   "agent": "Opera Neon",
   "values": [
    "sandboxed execution",
    "",
    "",
    "",
    "Describes a product feature"
   ]
  },
  {
   "id": "OPERA-DEVCOM-PRA-01",
   "agent": "Opera Neon",
   "values": [
    "vulnerability disclosure process",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-DOC-PRA-01",
   "agent": "Opera Neon",
   "values": [
    "public security documentation",
    "public incident report",
    "",
    "",
    ""
   ]
  },
  {
   "id": "OPERA-DOC-PRA-02",
   "agent": "Opera Neon",
   "values": [
    "public security documentation",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-TEST-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "benchmark evaluation",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-TEST-PRA-02",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "end-to-end tests",
    "cross-platform test matrix",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-TEST-PRA-03",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "community bug reports",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-TEST-PRA-04",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "unit tests",
    "no automated ci",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-CICD-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "no automated ci",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-CODEREV-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "no formal pr review",
    "direct commits by maintainers",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-BUG-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "best-effort issue response",
    "community root-cause analysis",
    "direct commits by maintainers",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-BUG-PRA-02",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "logs shared for reproduction",
    "best-effort issue response",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-BUG-PRA-03",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "no issue triage labels",
    "best-effort issue response",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-BUG-PRA-04",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "community root-cause analysis",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-SEMETH-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "research-gated releases",
    "public model cards and research papers",
    "per-version readme",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-DEVCOM-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "public model cards and research papers",
    "public release notes",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-DEVCOM-PRA-02",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "bilingual docs",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "ALIBABA-DOC-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "values": [
    "per-version readme",
    "public model cards and research papers",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-TEST-PRA-01",
   "agent": "Perplexity Comet",
   "values": [
    "red-teaming and adversarial testing",
    "failures fed back into training",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-TEST-PRA-02",
   "agent": "Perplexity Comet",
   "values": [
    "failures fed back into training",
    "bug bounty program",
    "red-teaming and adversarial testing",
    "",
    ""
   ]
  },
  {
   "id": "COMET-TEST-PRA-03",
   "agent": "Perplexity Comet",
   "values": [
    "failures fed back into training",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-TEST-PRA-04",
   "agent": "Perplexity Comet",
   "values": [
    "red-teaming and adversarial testing",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-CICD-PRA-01",
   "agent": "Perplexity Comet",
   "values": [
    "frequent release cadence",
    "public release notes",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-BUG-PRA-01",
   "agent": "Perplexity Comet",
   "values": [
    "vulnerability disclosure process",
    "bug bounty program",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "COMET-BUG-PRA-02",
   "agent": "Perplexity Comet",
   "values": [
    "failures fed back into training",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-SEMETH-PRA-01",
   "agent": "Perplexity Comet",
   "values": [
    "security-first design",
    "",
    "",
    "",
    "Marketing quote"
   ]
  },
  {
   "id": "COMET-DEVCOM-PRA-01",
   "agent": "Perplexity Comet",
   "values": [
    "public release notes",
    "public engineering blog",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-DOC-PRA-01",
   "agent": "Perplexity Comet",
   "values": [
    "documentation portal",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-DOC-PRA-02",
   "agent": "Perplexity Comet",
   "values": [
    "public security documentation",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "COMET-DOC-PRA-03",
   "agent": "Perplexity Comet",
   "values": [
    "documentation portal",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-TEST-PRA-01",
   "agent": "Browser Use",
   "values": [
    "agent eval on every pr",
    "parallel test and eval runs",
    "llm-as-judge",
    "runtime validation and recovery",
    ""
   ]
  },
  {
   "id": "BROWSER-TEST-PRA-02",
   "agent": "Browser Use",
   "values": [
    "eval set from real user data",
    "llm-labelled eval data",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-TEST-PRA-03",
   "agent": "Browser Use",
   "values": [
    "repeated eval runs",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-TEST-PRA-04",
   "agent": "Browser Use",
   "values": [
    "unit tests",
    "integration tests",
    "parallel test and eval runs",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-TEST-PRA-05",
   "agent": "Browser Use",
   "values": [
    "tracing and monitoring",
    "cost and token observability",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-CICD-PRA-01",
   "agent": "Browser Use",
   "values": [
    "lint and static checks",
    "ci on every pr",
    "agent eval on every pr",
    "automated release pipeline",
    ""
   ]
  },
  {
   "id": "BROWSER-CICD-PRA-02",
   "agent": "Browser Use",
   "values": [
    "sandboxed execution",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-CICD-PRA-03",
   "agent": "Browser Use",
   "values": [
    "architectural redesign",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-CICD-PRA-04",
   "agent": "Browser Use",
   "values": [
    "architectural redesign",
    "",
    "",
    "",
    "Reasoning about a design choice, not a practice"
   ]
  },
  {
   "id": "BROWSER-CICD-PRA-05",
   "agent": "Browser Use",
   "values": [
    "build and execution infrastructure",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-CICD-PRA-06",
   "agent": "Browser Use",
   "values": [
    "sandboxed execution",
    "build and execution infrastructure",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-CODEREV-PRA-01",
   "agent": "Browser Use",
   "values": [
    "pre-commit and presubmit checks",
    "lint and static checks",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-CODEREV-PRA-02",
   "agent": "Browser Use",
   "values": [
    "agent eval on every pr",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-BUG-PRA-01",
   "agent": "Browser Use",
   "values": [
    "public issue tracker",
    "issue labels",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-BUG-PRA-02",
   "agent": "Browser Use",
   "values": [
    "public engineering blog",
    "bug pattern: concurrency and lifecycle",
    "bug pattern: resource and dependency leaks",
    "bug pattern: configuration and environment",
    ""
   ]
  },
  {
   "id": "BROWSER-SEMETH-PRA-01",
   "agent": "Browser Use",
   "values": [
    "agent design principles",
    "architectural redesign",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-SEMETH-PRA-02",
   "agent": "Browser Use",
   "values": [
    "rapid iteration on feedback",
    "fix forward",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-SEMETH-PRA-03",
   "agent": "Browser Use",
   "values": [
    "agent design principles",
    "",
    "",
    "",
    "Marketing-style claim"
   ]
  },
  {
   "id": "BROWSER-SEMETH-PRA-04",
   "agent": "Browser Use",
   "values": [
    "start permissive then restrict",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-SEMETH-PRA-05",
   "agent": "Browser Use",
   "values": [
    "start permissive then restrict",
    "eval-driven improvement loop",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-DEVCOM-PRA-01",
   "agent": "Browser Use",
   "values": [
    "public engineering blog",
    "public incident report",
    "",
    "",
    ""
   ]
  },
  {
   "id": "BROWSER-DOC-PRA-01",
   "agent": "Browser Use",
   "values": [
    "documentation portal",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GLEAN-TEST-PRA-01",
   "agent": "Glean Agents",
   "values": [
    "eval set from real user data",
    "eval metrics design",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GLEAN-TEST-PRA-02",
   "agent": "Glean Agents",
   "values": [
    "eval set from real user data",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GLEAN-TEST-PRA-03",
   "agent": "Glean Agents",
   "values": [
    "eval-driven improvement loop",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GLEAN-TEST-PRA-04",
   "agent": "Glean Agents",
   "values": [
    "eval-driven improvement loop",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GLEAN-TEST-PRA-05",
   "agent": "Glean Agents",
   "values": [
    "single- and multi-turn evals",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GLEAN-CICD-PRA-01",
   "agent": "Glean Agents",
   "values": [
    "continuous deployment",
    "internal-first release",
    "staged rollout",
    "fast rollback",
    ""
   ]
  },
  {
   "id": "GLEAN-CODEREV-PRA-01",
   "agent": "Glean Agents",
   "values": [
    "ai code review",
    "agent reviews its own codebase",
    "ai review findings aggregated and prioritised",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GLEAN-BUG-PRA-01",
   "agent": "Glean Agents",
   "values": [
    "bug pattern: security and privacy",
    "bug pattern: resource and dependency leaks",
    "bug pattern: configuration and environment",
    "bug pattern: api and contract mismatch",
    "Bug categories, not a practice"
   ]
  },
  {
   "id": "GLEAN-BUG-PRA-02",
   "agent": "Glean Agents",
   "values": [
    "public issue tracker",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GLEAN-SEMETH-PRA-01",
   "agent": "Glean Agents",
   "values": [
    "experiment-driven development",
    "internal-first release",
    "frequent release cadence",
    "usage data guides development",
    ""
   ]
  },
  {
   "id": "GLEAN-DEVCOM-PRA-01",
   "agent": "Glean Agents",
   "values": [
    "internal dogfooding",
    "agent runs team's own operations",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GLEAN-DEVCOM-PRA-02",
   "agent": "Glean Agents",
   "values": [
    "public engineering blog",
    "community outreach",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GLEAN-DOC-PRA-01",
   "agent": "Glean Agents",
   "values": [
    "public engineering blog",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-TEST-PRA-01",
   "agent": "Gemini Enterprise",
   "values": [
    "staged rollout",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-TEST-PRA-02",
   "agent": "Gemini Enterprise",
   "values": [
    "slo-based quality gates",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-TEST-PRA-03",
   "agent": "Gemini Enterprise",
   "values": [
    "tracing and monitoring",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-TEST-PRA-04",
   "agent": "Gemini Enterprise",
   "values": [
    "build and execution infrastructure",
    "hermetic tests",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-CICD-PRA-01",
   "agent": "Gemini Enterprise",
   "values": [
    "continuous deployment",
    "public release notes",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-CICD-PRA-02",
   "agent": "Gemini Enterprise",
   "values": [
    "product renaming",
    "",
    "",
    "",
    "Not a practice"
   ]
  },
  {
   "id": "GEMENT-CICD-PRA-03",
   "agent": "Gemini Enterprise",
   "values": [
    "automated release pipeline",
    "fast rollback",
    "feature flags",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-CICD-PRA-04",
   "agent": "Gemini Enterprise",
   "values": [
    "large-scale automated code changes",
    "pre-commit and presubmit checks",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-CODEREV-PRA-01",
   "agent": "Gemini Enterprise",
   "values": [
    "code-health approval standard",
    "non-blocking review comments",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-CODEREV-PRA-02",
   "agent": "Gemini Enterprise",
   "values": [
    "review rubric and style authority",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-CODEREV-PRA-03",
   "agent": "Gemini Enterprise",
   "values": [
    "response-time targets",
    "small single-purpose changes",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-CODEREV-PRA-04",
   "agent": "Gemini Enterprise",
   "values": [
    "code owners",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-BUG-PRA-01",
   "agent": "Gemini Enterprise",
   "values": [
    "bug pattern: security and privacy",
    "bug pattern: configuration and environment",
    "bug pattern: agent loop and model handling",
    "bug pattern: api and contract mismatch",
    "Bug categories, not a practice"
   ]
  },
  {
   "id": "GEMENT-BUG-PRA-02",
   "agent": "Gemini Enterprise",
   "values": [
    "public release notes",
    "rapid security fix deployment",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-SEMETH-PRA-01",
   "agent": "Gemini Enterprise",
   "values": [
    "feature flags",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-SEMETH-PRA-02",
   "agent": "Gemini Enterprise",
   "values": [
    "versioning and compatibility policy",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-SEMETH-PRA-03",
   "agent": "Gemini Enterprise",
   "values": [
    "trunk-based development",
    "monorepo",
    "small single-purpose changes",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-SEMETH-PRA-04",
   "agent": "Gemini Enterprise",
   "values": [
    "large-scale automated code changes",
    "pre-commit and presubmit checks",
    "",
    "",
    "Company-wide; overlaps GEMENT-CICD-PRA-04"
   ]
  },
  {
   "id": "GEMENT-DEVCOM-PRA-01",
   "agent": "Gemini Enterprise",
   "values": [
    "open internal channels and records",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-DEVCOM-PRA-02",
   "agent": "Gemini Enterprise",
   "values": [
    "build and execution infrastructure",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-DEVCOM-PRA-03",
   "agent": "Gemini Enterprise",
   "values": [
    "in-person and synchronous collaboration",
    "decision records",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "GEMENT-DOC-PRA-01",
   "agent": "Gemini Enterprise",
   "values": [
    "public release notes",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-DOC-PRA-02",
   "agent": "Gemini Enterprise",
   "values": [
    "documentation standards",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "GEMENT-DOC-PRA-03",
   "agent": "Gemini Enterprise",
   "values": [
    "docs updated with code",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "HUBSPOT-TEST-PRA-01",
   "agent": "Hubspot breeze Studio",
   "values": [
    "user-focused ui tests",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-TEST-PRA-02",
   "agent": "Hubspot breeze Studio",
   "values": [
    "test framework migration",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-TEST-PRA-03",
   "agent": "Hubspot breeze Studio",
   "values": [
    "integration-first testing",
    "testing guidelines",
    "test framework migration",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-TEST-PRA-04",
   "agent": "Hubspot breeze Studio",
   "values": [
    "internal eval framework",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-CICD-PRA-01",
   "agent": "Hubspot breeze Studio",
   "values": [
    "build and execution infrastructure",
    "",
    "",
    "",
    "Company-wide; describes scale, not a practice"
   ]
  },
  {
   "id": "HUBSPOT-CICD-PRA-02",
   "agent": "Hubspot breeze Studio",
   "values": [
    "cloud coding agents",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-CICD-PRA-03",
   "agent": "Hubspot breeze Studio",
   "values": [
    "build and execution infrastructure",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-CICD-PRA-04",
   "agent": "Hubspot breeze Studio",
   "values": [
    "build and execution infrastructure",
    "",
    "",
    "",
    "Company-wide; describes infrastructure, not a practice"
   ]
  },
  {
   "id": "HUBSPOT-CODEREV-PRA-01",
   "agent": "Hubspot breeze Studio",
   "values": [
    "ai code review",
    "judge agent filters ai review",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-CODEREV-PRA-02",
   "agent": "Hubspot breeze Studio",
   "values": [
    "ai code review",
    "",
    "",
    "",
    "Company-wide; marketing"
   ]
  },
  {
   "id": "HUBSPOT-CODEREV-PRA-03",
   "agent": "Hubspot breeze Studio",
   "values": [
    "judge agent filters ai review",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-CODEREV-PRA-04",
   "agent": "Hubspot breeze Studio",
   "values": [
    "developer feedback improves ai reviewer",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-BUG-PRA-01",
   "agent": "Hubspot breeze Studio",
   "values": [
    "fast rollback",
    "incident response",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-BUG-PRA-02",
   "agent": "Hubspot breeze Studio",
   "values": [
    "plan-first with agent",
    "human oversight of agent output",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-SEMETH-PRA-01",
   "agent": "Hubspot breeze Studio",
   "values": [
    "rapid prototyping and iteration",
    "",
    "",
    "",
    "Company-wide; marketing"
   ]
  },
  {
   "id": "HUBSPOT-SEMETH-PRA-02",
   "agent": "Hubspot breeze Studio",
   "values": [
    "small autonomous teams",
    "flat roles",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-SEMETH-PRA-03",
   "agent": "Hubspot breeze Studio",
   "values": [
    "ai tools in daily workflow",
    "ai code review",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-SEMETH-PRA-04",
   "agent": "Hubspot breeze Studio",
   "values": [
    "tracing and monitoring",
    "cost and token observability",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-DEVCOM-PRA-01",
   "agent": "Hubspot breeze Studio",
   "values": [
    "developer feedback improves ai reviewer",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "HUBSPOT-DEVCOM-PRA-02",
   "agent": "Hubspot breeze Studio",
   "values": [
    "team culture norms",
    "",
    "",
    "",
    "Company-wide; marketing"
   ]
  },
  {
   "id": "HUBSPOT-DOC-PRA-01",
   "agent": "Hubspot breeze Studio",
   "values": [
    "documentation portal",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "WATSONX-TEST-PRA-01",
   "agent": "WatsonX Orchestrate",
   "values": [
    "local developer environment",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-TEST-PRA-02",
   "agent": "WatsonX Orchestrate",
   "values": [
    "simulated user conversations before release",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-TEST-PRA-03",
   "agent": "WatsonX Orchestrate",
   "values": [
    "tracing and monitoring",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-TEST-PRA-04",
   "agent": "WatsonX Orchestrate",
   "values": [
    "red-teaming and adversarial testing",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-TEST-PRA-05",
   "agent": "WatsonX Orchestrate",
   "values": [
    "trajectory evaluation",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-CICD-PRA-01",
   "agent": "WatsonX Orchestrate",
   "values": [
    "frequent release cadence",
    "local developer environment",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-CODEREV-PRA-01",
   "agent": "WatsonX Orchestrate",
   "values": [
    "code owners",
    "human merge approval",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-CODEREV-PRA-02",
   "agent": "WatsonX Orchestrate",
   "values": [
    "structured commit and pr title convention",
    "generated docs and release notes",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-BUG-PRA-01",
   "agent": "WatsonX Orchestrate",
   "values": [
    "bug pattern: configuration and environment",
    "bug pattern: input and data handling",
    "bug pattern: security and privacy",
    "bug pattern: api and contract mismatch",
    "Bug categories, not a practice"
   ]
  },
  {
   "id": "WATSONX-BUG-PRA-02",
   "agent": "WatsonX Orchestrate",
   "values": [
    "community bug reports",
    "public release notes",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-BUG-PRA-03",
   "agent": "WatsonX Orchestrate",
   "values": [
    "community support channels",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-SEMETH-PRA-01",
   "agent": "WatsonX Orchestrate",
   "values": [
    "eval-driven improvement loop",
    "",
    "",
    "",
    "Introduces WATSONX-SEMETH-PRA-02; split item"
   ]
  },
  {
   "id": "WATSONX-SEMETH-PRA-02",
   "agent": "WatsonX Orchestrate",
   "values": [
    "eval-driven improvement loop",
    "trajectory evaluation",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-SEMETH-PRA-03",
   "agent": "WatsonX Orchestrate",
   "values": [
    "build and execution infrastructure",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-DEVCOM-PRA-01",
   "agent": "WatsonX Orchestrate",
   "values": [
    "async communication",
    "code owners",
    "structured commit and pr title convention",
    "",
    ""
   ]
  },
  {
   "id": "WATSONX-DOC-PRA-01",
   "agent": "WatsonX Orchestrate",
   "values": [
    "documentation portal",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-TEST-PRA-01",
   "agent": "N8N Agents",
   "values": [
    "tests required with change",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-TEST-PRA-02",
   "agent": "N8N Agents",
   "values": [
    "test evidence in pr",
    "author accountability for code",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-TEST-PRA-03",
   "agent": "N8N Agents",
   "values": [
    "unit tests",
    "end-to-end tests",
    "integration tests",
    "",
    ""
   ]
  },
  {
   "id": "N8N-TEST-PRA-04",
   "agent": "N8N Agents",
   "values": [
    "mocked llm responses in tests",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-TEST-PRA-05",
   "agent": "N8N Agents",
   "values": [
    "internal eval framework",
    "mocked llm responses in tests",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-TEST-PRA-06",
   "agent": "N8N Agents",
   "values": [
    "eval cost management",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-TEST-PRA-07",
   "agent": "N8N Agents",
   "values": [
    "agent-runnable tests",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CICD-PRA-01",
   "agent": "N8N Agents",
   "values": [
    "least-privilege ci",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CICD-PRA-02",
   "agent": "N8N Agents",
   "values": [
    "least-privilege ci",
    "ci on every pr",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CICD-PRA-03",
   "agent": "N8N Agents",
   "values": [
    "automated release pipeline",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CICD-PRA-04",
   "agent": "N8N Agents",
   "values": [
    "versioning and compatibility policy",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CICD-PRA-05",
   "agent": "N8N Agents",
   "values": [
    "frequent release cadence",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CICD-PRA-06",
   "agent": "N8N Agents",
   "values": [
    "trunk-based development",
    "feature flags",
    "versioning and compatibility policy",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CODEREV-PRA-01",
   "agent": "N8N Agents",
   "values": [
    "mandatory human code review",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CODEREV-PRA-02",
   "agent": "N8N Agents",
   "values": [
    "small single-purpose changes",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CODEREV-PRA-03",
   "agent": "N8N Agents",
   "values": [
    "response-time targets",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CODEREV-PRA-04",
   "agent": "N8N Agents",
   "values": [
    "ai code review",
    "ai review findings aggregated and prioritised",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CODEREV-PRA-05",
   "agent": "N8N Agents",
   "values": [
    "ai review before human review",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-CODEREV-PRA-06",
   "agent": "N8N Agents",
   "values": [
    "author accountability for code",
    "ai-use disclosure",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-BUG-PRA-01",
   "agent": "N8N Agents",
   "values": [
    "structured issue templates",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-BUG-PRA-02",
   "agent": "N8N Agents",
   "values": [
    "issue routing to owners",
    "public release notes",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-BUG-PRA-03",
   "agent": "N8N Agents",
   "values": [
    "bug pattern: api and contract mismatch",
    "bug pattern: agent loop and model handling",
    "bug pattern: version and platform regressions",
    "",
    "Bug categories, not a practice"
   ]
  },
  {
   "id": "N8N-SEMETH-PRA-01",
   "agent": "N8N Agents",
   "values": [
    "small autonomous teams",
    "two-week sprints",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "N8N-SEMETH-PRA-02",
   "agent": "N8N Agents",
   "values": [
    "branch per ticket",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-SEMETH-PRA-03",
   "agent": "N8N Agents",
   "values": [
    "versioning and compatibility policy",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-SEMETH-PRA-04",
   "agent": "N8N Agents",
   "values": [
    "ai tools in daily workflow",
    "agent context files",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-DEVCOM-PRA-01",
   "agent": "N8N Agents",
   "values": [
    "distributed team",
    "async communication",
    "in-person and synchronous collaboration",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "N8N-DEVCOM-PRA-02",
   "agent": "N8N Agents",
   "values": [
    "team culture norms",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "N8N-DEVCOM-PRA-03",
   "agent": "N8N Agents",
   "values": [
    "decision records",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "N8N-DEVCOM-PRA-04",
   "agent": "N8N Agents",
   "values": [
    "bottom-up decision-making",
    "",
    "",
    "",
    "Company-wide"
   ]
  },
  {
   "id": "N8N-DEVCOM-PRA-05",
   "agent": "N8N Agents",
   "values": [
    "design docs before implementation",
    "descriptive pr descriptions",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-DOC-PRA-01",
   "agent": "N8N Agents",
   "values": [
    "docs-as-code",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-DOC-PRA-02",
   "agent": "N8N Agents",
   "values": [
    "docs updated with code",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-DOC-PRA-03",
   "agent": "N8N Agents",
   "values": [
    "docs updated with code",
    "",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-DOC-PRA-04",
   "agent": "N8N Agents",
   "values": [
    "generated docs and release notes",
    "documentation standards",
    "",
    "",
    ""
   ]
  },
  {
   "id": "N8N-DOC-PRA-05",
   "agent": "N8N Agents",
   "values": [
    "structured commit and pr title convention",
    "generated docs and release notes",
    "human oversight of agent output",
    "",
    ""
   ]
  }
 ],
 "codebook": [
  [
   "code",
   "category",
   "uses",
   "item ids (as coded 2026-11-03)",
   "",
   "category",
   "meaning",
   "codes",
   "uses"
  ],
  [
   "agent as team knowledge source",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A2)",
   "CLAUDE-DEVCOM-PRA-01, CODEX-DEVCOM-PRA-02, CODEX-DEVCOM-PRA-04",
   "",
   "Agent self-use",
   "The agent or AI tools are used in the team's own work: dogfooding, the agent writes, reviews, tests or fixes its own product, answers team questions, runs internal operations; plus the codebase prepared for agents (context files, agent-runnable tests).",
   "=COUNTIF($B$2:$B$1000,F2)",
   "=SUMIF($B$2:$B$1000,F2,$C$2:$C$1000)"
  ],
  [
   "agent context files",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A3)",
   "CLAUDE-DOC-PRA-01, CODEX-TEST-PRA-01, CODEX-DOC-PRA-01, CODEX-DOC-PRA-02, N8N-SEMETH-PRA-04",
   "",
   "AI-generated review",
   "An AI agent or model produces the review or judgement on code or issues: AI code review, multi-agent or judge-filtered review, AI triage, and how the AI reviewer is improved.",
   "=COUNTIF($B$2:$B$1000,F3)",
   "=SUMIF($B$2:$B$1000,F3,$C$2:$C$1000)"
  ],
  [
   "agent finds and fixes its own bugs",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A4)",
   "CODEX-TEST-PRA-03, CODEX-BUG-PRA-06, CODEX-BUG-PRA-07",
   "",
   "Human review and oversight",
   "People review, approve or own the work: mandatory human review, code owners, merge approval, human oversight of agent output, accountability for AI-written code, review boards.",
   "=COUNTIF($B$2:$B$1000,F4)",
   "=SUMIF($B$2:$B$1000,F4,$C$2:$C$1000)"
  ],
  [
   "agent reviews its own codebase",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A5)",
   "CLAUDE-CODEREV-PRA-02, GEMCLI-CODEREV-PRA-02, GLEAN-CODEREV-PRA-01",
   "",
   "Change and review norms",
   "Rules for what a change looks like and how review runs: small changes, PR descriptions, tests or evidence with the change, approval standard, comment style, response-time targets, commit conventions.",
   "=COUNTIF($B$2:$B$1000,F5)",
   "=SUMIF($B$2:$B$1000,F5,$C$2:$C$1000)"
  ],
  [
   "agent runs team's own operations",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A6)",
   "KIMI-SEMETH-PRA-01, GLEAN-DEVCOM-PRA-01",
   "",
   "Automated testing",
   "Deterministic test suites and how they are run: unit, integration, end-to-end, performance, cross-platform, flaky-test handling, mocked LLM calls, testing guidelines.",
   "=COUNTIF($B$2:$B$1000,F6)",
   "=SUMIF($B$2:$B$1000,F6,$C$2:$C$1000)"
  ],
  [
   "agent tests its own product",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A7)",
   "CODEX-TEST-PRA-02, CODEX-TEST-PRA-07, KIMI-CICD-PRA-01",
   "",
   "Agent evaluation",
   "Evaluating the agent's or model's behaviour: eval frameworks and sets, benchmarks, LLM-as-judge, trajectory evals, repeated runs, eval metrics, eval-driven improvement.",
   "=COUNTIF($B$2:$B$1000,F7)",
   "=SUMIF($B$2:$B$1000,F7,$C$2:$C$1000)"
  ],
  [
   "agent writes its own product code",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A8)",
   "CLAUDE-SEMETH-PRA-01, CODEX-SEMETH-PRA-01",
   "",
   "CI and quality gates",
   "Automated checks before or after merge and the build infrastructure behind them: CI on every PR, lint, pre-commit/presubmit, merge gates, CI security, large-scale automated changes.",
   "=COUNTIF($B$2:$B$1000,F8)",
   "=SUMIF($B$2:$B$1000,F8,$C$2:$C$1000)"
  ],
  [
   "agent-assisted onboarding",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A9)",
   "CODEX-DEVCOM-PRA-05",
   "",
   "Release and rollout",
   "How versions ship: release cadence, release automation, continuous deployment, versioning, staged or internal-first rollout, feature flags, rollback, research-gated releases.",
   "=COUNTIF($B$2:$B$1000,F9)",
   "=SUMIF($B$2:$B$1000,F9,$C$2:$C$1000)"
  ],
  [
   "agent-readable documentation",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A10)",
   "CODEX-DOC-PRA-03, CODEX-DOC-PRA-05",
   "",
   "Security assurance",
   "Finding and fixing security and safety problems: pen-tests, security review, red-teaming, bug bounty and disclosure, rapid security fixes, sandboxing, retraining on attacks.",
   "=COUNTIF($B$2:$B$1000,F10)",
   "=SUMIF($B$2:$B$1000,F10,$C$2:$C$1000)"
  ],
  [
   "agent-runnable tests",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A11)",
   "CODEX-TEST-PRA-01, N8N-TEST-PRA-07",
   "",
   "Issue management",
   "How bugs and requests are tracked and handled: issue trackers, templates, labels, assignment bots, stale automation, routing to owners, reproduction logs, response level.",
   "=COUNTIF($B$2:$B$1000,F11)",
   "=SUMIF($B$2:$B$1000,F11,$C$2:$C$1000)"
  ],
  [
   "ai tools in daily workflow",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A12)",
   "HUBSPOT-SEMETH-PRA-03, N8N-SEMETH-PRA-04",
   "",
   "Community and user feedback",
   "Feedback from users and the community shapes the product: community bug reports and diagnosis, internal user feedback, A/B tests, usage data, support channels.",
   "=COUNTIF($B$2:$B$1000,F12)",
   "=SUMIF($B$2:$B$1000,F12,$C$2:$C$1000)"
  ],
  [
   "cloud coding agents",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A13)",
   "HUBSPOT-CICD-PRA-02",
   "",
   "Observability and incident response",
   "Watching the running agent and reacting to failures: tracing, monitoring, cost tracking, SLO gates, incident response, post-mortems, fix forward, runtime recovery.",
   "=COUNTIF($B$2:$B$1000,F13)",
   "=SUMIF($B$2:$B$1000,F13,$C$2:$C$1000)"
  ],
  [
   "engineers manage agents",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A14)",
   "CODEX-SEMETH-PRA-01",
   "",
   "Development process and architecture",
   "How the work is organised and designed over time: prototyping and iteration, experiment-driven work, trunk-based development, monorepo, sprints, design principles, redesigns.",
   "=COUNTIF($B$2:$B$1000,F14)",
   "=SUMIF($B$2:$B$1000,F14,$C$2:$C$1000)"
  ],
  [
   "internal dogfooding",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A15)",
   "CLAUDE-TEST-PRA-01, CLAUDE-TEST-PRA-05, CODEX-TEST-PRA-08, GEMINI-TEST-PRA-01, KIMI-TEST-PRA-02, KIMI-SEMETH-PRA-01, GLEAN-DEVCOM-PRA-01",
   "",
   "Team organisation and communication",
   "Team structure and how people communicate and decide: small or flat teams, roles, chat and async communication, meetings, onboarding, design docs, decision records, culture.",
   "=COUNTIF($B$2:$B$1000,F15)",
   "=SUMIF($B$2:$B$1000,F15,$C$2:$C$1000)"
  ],
  [
   "internal user feedback",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A16)",
   "CLAUDE-TEST-PRA-05, CLAUDE-SEMETH-PRA-01",
   "",
   "Documentation",
   "How documentation is written and kept current: docs updated with code, docs-as-code, standards, portals, generated docs and release notes, bilingual docs.",
   "=COUNTIF($B$2:$B$1000,F16)",
   "=SUMIF($B$2:$B$1000,F16,$C$2:$C$1000)"
  ],
  [
   "nightly scheduled agent runs",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A17)",
   "CODEX-TEST-PRA-03, CODEX-BUG-PRA-06, CODEX-BUG-PRA-07",
   "",
   "Public transparency",
   "Publishing engineering information: blogs, release notes, model cards and papers, security documentation, incident reports, worklogs, community outreach.",
   "=COUNTIF($B$2:$B$1000,F17)",
   "=SUMIF($B$2:$B$1000,F17,$C$2:$C$1000)"
  ],
  [
   "plan-first with agent",
   "Agent self-use",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A18)",
   "CODEX-SEMETH-PRA-04, HUBSPOT-BUG-PRA-02",
   "",
   "Bug patterns",
   "Categories of bugs reported for the agent. Not a practice; kept so failure types can be compared across agents.",
   "=COUNTIF($B$2:$B$1000,F18)",
   "=SUMIF($B$2:$B$1000,F18,$C$2:$C$1000)"
  ],
  [
   "ai code review",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A19)",
   "CLAUDE-CODEREV-PRA-02, CODEX-CODEREV-PRA-01, GEMCLI-CODEREV-PRA-02, GLEAN-CODEREV-PRA-01, HUBSPOT-CODEREV-PRA-01, HUBSPOT-CODEREV-PRA-02, HUBSPOT-SEMETH-PRA-03, N8N-CODEREV-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "ai code review on every pr",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A20)",
   "CODEX-CODEREV-PRA-01, CODEX-CODEREV-PRA-03",
   "",
   "Up to 4 codes per item (Agreement Index L-O). To add a code, type it below the last row of column A and give it a category in column B; it then appears in the annotation dropdowns.",
   "",
   "",
   ""
  ],
  [
   "ai issue triage",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A21)",
   "CODEX-BUG-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "ai review findings aggregated and prioritised",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A22)",
   "GLEAN-CODEREV-PRA-01, N8N-CODEREV-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "custom-trained review model",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A23)",
   "CODEX-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "developer feedback improves ai reviewer",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A24)",
   "HUBSPOT-CODEREV-PRA-04, HUBSPOT-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "judge agent filters ai review",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A25)",
   "HUBSPOT-CODEREV-PRA-01, HUBSPOT-CODEREV-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "multi-agent review",
   "AI-generated review",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A26)",
   "CLAUDE-CODEREV-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "ai review before human review",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A27)",
   "CODEX-CODEREV-PRA-04, N8N-CODEREV-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "ai-use disclosure",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A28)",
   "N8N-CODEREV-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "author accountability for code",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A29)",
   "N8N-TEST-PRA-02, N8N-CODEREV-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "code owners",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A30)",
   "GEMINI-CODEREV-PRA-01, GEMENT-CODEREV-PRA-04, WATSONX-CODEREV-PRA-01, WATSONX-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "direct commits by maintainers",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A31)",
   "ALIBABA-CODEREV-PRA-01, ALIBABA-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "human merge approval",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A32)",
   "CLAUDE-CODEREV-PRA-02, WATSONX-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "human oversight of agent output",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A33)",
   "CODEX-BUG-PRA-06, CODEX-SEMETH-PRA-04, HUBSPOT-BUG-PRA-02, N8N-DOC-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "human review for critical code",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A34)",
   "CODEX-CODEREV-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "mandatory human code review",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A35)",
   "GEMINI-CODEREV-PRA-01, N8N-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "no formal pr review",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A36)",
   "ALIBABA-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "readability certification",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A37)",
   "GEMINI-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "responsibility review board",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A38)",
   "GEMINI-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "review overload",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A39)",
   "CODEX-CODEREV-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "team bug bashes",
   "Human review and oversight",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A40)",
   "CODEX-TEST-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "branch per ticket",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A41)",
   "N8N-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "code-health approval standard",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A42)",
   "GEMCLI-CODEREV-PRA-03, GEMINI-CODEREV-PRA-05, GEMENT-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "contributor license agreement",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A43)",
   "GEMCLI-CODEREV-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "descriptive pr descriptions",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A44)",
   "CODEX-CODEREV-PRA-05, CODEX-DOC-PRA-04, N8N-DEVCOM-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "non-blocking review comments",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A45)",
   "GEMINI-CODEREV-PRA-03, GEMINI-CODEREV-PRA-05, GEMINI-CODEREV-PRA-06, GEMENT-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "response-time targets",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A46)",
   "GEMCLI-CODEREV-PRA-04, GEMINI-CODEREV-PRA-03, GEMENT-CODEREV-PRA-03, N8N-CODEREV-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "review as knowledge sharing",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A47)",
   "GEMINI-CODEREV-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "review rubric and style authority",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A48)",
   "GEMINI-CODEREV-PRA-04, GEMENT-CODEREV-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "small single-purpose changes",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A49)",
   "CODEX-CODEREV-PRA-05, GEMCLI-CODEREV-PRA-01, GEMINI-CODEREV-PRA-02, GEMENT-CODEREV-PRA-03, GEMENT-SEMETH-PRA-03, N8N-CODEREV-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "structured commit and pr title convention",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A50)",
   "WATSONX-CODEREV-PRA-02, WATSONX-DEVCOM-PRA-01, N8N-DOC-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "test evidence in pr",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A51)",
   "CODEX-TEST-PRA-07, N8N-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "tests required with change",
   "Change and review norms",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A52)",
   "GEMINI-CODEREV-PRA-02, N8N-TEST-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "cross-platform test matrix",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A53)",
   "GEMCLI-CICD-PRA-03, ALIBABA-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "end-to-end tests",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A54)",
   "ALIBABA-TEST-PRA-02, N8N-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "flaky-test handling",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A55)",
   "CODEX-TEST-PRA-05, GEMCLI-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "hermetic tests",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A56)",
   "GEMENT-TEST-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "integration tests",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A57)",
   "GEMCLI-TEST-PRA-01, BROWSER-TEST-PRA-04, N8N-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "integration-first testing",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A58)",
   "HUBSPOT-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "mocked llm responses in tests",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A59)",
   "N8N-TEST-PRA-04, N8N-TEST-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "nightly scheduled test runs",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A60)",
   "GEMCLI-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "parallel test and eval runs",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A61)",
   "BROWSER-TEST-PRA-01, BROWSER-TEST-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "performance, memory and stress tests",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A62)",
   "GEMCLI-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "test framework migration",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A63)",
   "HUBSPOT-TEST-PRA-02, HUBSPOT-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "testing guidelines",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A64)",
   "HUBSPOT-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "tests verify agent outcome",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A65)",
   "CLAUDE-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "unit tests",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A66)",
   "CLAUDE-TEST-PRA-01, GEMCLI-TEST-PRA-01, ALIBABA-TEST-PRA-04, BROWSER-TEST-PRA-04, N8N-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "user-focused ui tests",
   "Automated testing",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A67)",
   "HUBSPOT-TEST-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "agent eval on every pr",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A68)",
   "BROWSER-TEST-PRA-01, BROWSER-CICD-PRA-01, BROWSER-CODEREV-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "benchmark evaluation",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A69)",
   "GEMINI-TEST-PRA-01, KIMI-TEST-PRA-02, ALIBABA-TEST-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "eval cost management",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A70)",
   "N8N-TEST-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "eval definition",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A71)",
   "CLAUDE-TEST-PRA-02, CLAUDE-TEST-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "eval metrics design",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A72)",
   "GLEAN-TEST-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "eval set from real user data",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A73)",
   "BROWSER-TEST-PRA-02, GLEAN-TEST-PRA-01, GLEAN-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "eval-driven improvement loop",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A74)",
   "BROWSER-SEMETH-PRA-05, GLEAN-TEST-PRA-03, GLEAN-TEST-PRA-04, WATSONX-SEMETH-PRA-01, WATSONX-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "internal eval framework",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A75)",
   "CODEX-TEST-PRA-08, KIMI-TEST-PRA-01, HUBSPOT-TEST-PRA-04, N8N-TEST-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "llm-as-judge",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A76)",
   "CLAUDE-TEST-PRA-01, BROWSER-TEST-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "llm-labelled eval data",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A77)",
   "BROWSER-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "repeated eval runs",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A78)",
   "KIMI-TEST-PRA-02, BROWSER-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "simulated user conversations before release",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A79)",
   "WATSONX-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "single- and multi-turn evals",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A80)",
   "CLAUDE-TEST-PRA-03, GLEAN-TEST-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "third-party evaluation",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A81)",
   "KIMI-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "trajectory evaluation",
   "Agent evaluation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A82)",
   "WATSONX-TEST-PRA-05, WATSONX-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "build and execution infrastructure",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A83)",
   "BROWSER-CICD-PRA-05, BROWSER-CICD-PRA-06, GEMENT-TEST-PRA-04, GEMENT-DEVCOM-PRA-02, HUBSPOT-CICD-PRA-01, HUBSPOT-CICD-PRA-03, HUBSPOT-CICD-PRA-04, WATSONX-SEMETH-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "ci on every pr",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A84)",
   "CODEX-TEST-PRA-04, GEMCLI-CICD-PRA-01, GEMCLI-CICD-PRA-03, BROWSER-CICD-PRA-01, N8N-CICD-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "large-scale automated code changes",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A85)",
   "GEMENT-CICD-PRA-04, GEMENT-SEMETH-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "least-privilege ci",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A86)",
   "N8N-CICD-PRA-01, N8N-CICD-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "lint and static checks",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A87)",
   "GEMCLI-TEST-PRA-01, GEMCLI-CICD-PRA-03, BROWSER-CICD-PRA-01, BROWSER-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "local developer environment",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A88)",
   "WATSONX-TEST-PRA-01, WATSONX-CICD-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "no automated ci",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A89)",
   "ALIBABA-TEST-PRA-04, ALIBABA-CICD-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "pre-commit and presubmit checks",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A90)",
   "BROWSER-CODEREV-PRA-01, GEMENT-CICD-PRA-04, GEMENT-SEMETH-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "pre-merge vs post-merge checks",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A91)",
   "CODEX-TEST-PRA-04, CODEX-CICD-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "review findings turned into lint rules",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A92)",
   "CLAUDE-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "single merge-blocking ci gate",
   "CI and quality gates",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A93)",
   "CODEX-CICD-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "automated release pipeline",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A94)",
   "CODEX-CICD-PRA-03, GEMCLI-CICD-PRA-01, BROWSER-CICD-PRA-01, GEMENT-CICD-PRA-03, N8N-CICD-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "continuous deployment",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A95)",
   "GLEAN-CICD-PRA-01, GEMENT-CICD-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "fast rollback",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A96)",
   "GLEAN-CICD-PRA-01, GEMENT-CICD-PRA-03, HUBSPOT-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "feature flags",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A97)",
   "CODEX-CICD-PRA-05, GEMENT-CICD-PRA-03, GEMENT-SEMETH-PRA-01, N8N-CICD-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "frequent release cadence",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A98)",
   "CLAUDE-CICD-PRA-01, CLAUDE-SEMETH-PRA-03, CODEX-CICD-PRA-04, GEMCLI-CICD-PRA-02, COMET-CICD-PRA-01, GLEAN-SEMETH-PRA-01, WATSONX-CICD-PRA-01, N8N-CICD-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "internal-first release",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A99)",
   "CLAUDE-CICD-PRA-01, CODEX-CICD-PRA-05, GLEAN-CICD-PRA-01, GLEAN-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "manual release trigger",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A100)",
   "GEMCLI-CICD-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "package-manager distribution",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A101)",
   "CODEX-CICD-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "product renaming",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A102)",
   "GEMENT-CICD-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "research-gated releases",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A103)",
   "OPERA-SEMETH-PRA-01, ALIBABA-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "staged rollout",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A104)",
   "GEMINI-CICD-PRA-01, OPERA-TEST-PRA-02, OPERA-CICD-PRA-01, GLEAN-CICD-PRA-01, GEMENT-TEST-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "versioning and compatibility policy",
   "Release and rollout",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A105)",
   "GEMINI-CICD-PRA-01, GEMENT-SEMETH-PRA-02, N8N-CICD-PRA-04, N8N-CICD-PRA-06, N8N-SEMETH-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug bounty program",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A106)",
   "OPERA-TEST-PRA-03, OPERA-BUG-PRA-01, COMET-TEST-PRA-02, COMET-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "failures fed back into training",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A107)",
   "COMET-TEST-PRA-01, COMET-TEST-PRA-02, COMET-TEST-PRA-03, COMET-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "human approval for sensitive actions",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A108)",
   "OPERA-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "rapid security fix deployment",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A109)",
   "OPERA-BUG-PRA-02, GEMENT-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "red-teaming and adversarial testing",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A110)",
   "GEMINI-TEST-PRA-01, COMET-TEST-PRA-01, COMET-TEST-PRA-02, COMET-TEST-PRA-04, WATSONX-TEST-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "sandboxed execution",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A111)",
   "GEMCLI-TEST-PRA-01, OPERA-CICD-PRA-02, OPERA-SEMETH-PRA-03, BROWSER-CICD-PRA-02, BROWSER-CICD-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "security review and pen-testing",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A112)",
   "OPERA-TEST-PRA-01, OPERA-CODEREV-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "security-first design",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A113)",
   "COMET-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "vulnerability disclosure process",
   "Security assurance",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A114)",
   "OPERA-BUG-PRA-03, OPERA-DEVCOM-PRA-01, COMET-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "best-effort issue response",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A115)",
   "ALIBABA-BUG-PRA-01, ALIBABA-BUG-PRA-02, ALIBABA-BUG-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bot-driven issue assignment",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A116)",
   "GEMCLI-BUG-PRA-01, GEMCLI-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "issue labels",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A117)",
   "BROWSER-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "issue routing to owners",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A118)",
   "GEMINI-BUG-PRA-01, N8N-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "issue-based roadmap",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A119)",
   "GEMCLI-BUG-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "logs shared for reproduction",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A120)",
   "CODEX-BUG-PRA-04, ALIBABA-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "no issue triage labels",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A121)",
   "ALIBABA-BUG-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "public issue tracker",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A122)",
   "CLAUDE-BUG-PRA-01, BROWSER-BUG-PRA-01, GLEAN-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "stale issue and assignment automation",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A123)",
   "CLAUDE-BUG-PRA-01, GEMCLI-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "structured issue templates",
   "Issue management",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A124)",
   "CODEX-BUG-PRA-03, CODEX-DOC-PRA-03, N8N-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "a/b testing in production",
   "Community and user feedback",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A125)",
   "CLAUDE-TEST-PRA-01, CODEX-TEST-PRA-08",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "community bug reports",
   "Community and user feedback",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A126)",
   "CODEX-BUG-PRA-05, OPERA-TEST-PRA-02, ALIBABA-TEST-PRA-03, WATSONX-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "community root-cause analysis",
   "Community and user feedback",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A127)",
   "CODEX-BUG-PRA-05, ALIBABA-BUG-PRA-01, ALIBABA-BUG-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "community support channels",
   "Community and user feedback",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A128)",
   "KIMI-DEVCOM-PRA-01, WATSONX-BUG-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "rapid iteration on feedback",
   "Community and user feedback",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A129)",
   "CLAUDE-SEMETH-PRA-01, BROWSER-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "usage data guides development",
   "Community and user feedback",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A130)",
   "KIMI-SEMETH-PRA-01, OPERA-TEST-PRA-02, GLEAN-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "cost and token observability",
   "Observability and incident response",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A131)",
   "BROWSER-TEST-PRA-05, HUBSPOT-SEMETH-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "fix forward",
   "Observability and incident response",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A132)",
   "BROWSER-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "incident response",
   "Observability and incident response",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A133)",
   "HUBSPOT-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "post-mortem review",
   "Observability and incident response",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A134)",
   "GEMINI-SEMETH-PRA-01, GEMINI-DEVCOM-PRA-04, OPERA-CODEREV-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "runtime validation and recovery",
   "Observability and incident response",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A135)",
   "KIMI-BUG-PRA-01, BROWSER-TEST-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "slo-based quality gates",
   "Observability and incident response",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A136)",
   "GEMENT-TEST-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "tracing and monitoring",
   "Observability and incident response",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A137)",
   "CODEX-BUG-PRA-07, BROWSER-TEST-PRA-05, GEMENT-TEST-PRA-03, HUBSPOT-SEMETH-PRA-04, WATSONX-TEST-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "agent design principles",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A138)",
   "GEMCLI-SEMETH-PRA-03, BROWSER-SEMETH-PRA-01, BROWSER-SEMETH-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "architectural redesign",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A139)",
   "CODEX-BUG-PRA-02, CODEX-SEMETH-PRA-06, BROWSER-CICD-PRA-03, BROWSER-CICD-PRA-04, BROWSER-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "experiment-driven development",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A140)",
   "CODEX-SEMETH-PRA-03, GLEAN-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "modular architecture",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A141)",
   "CODEX-TEST-PRA-01, CODEX-CODEREV-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "monorepo",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A142)",
   "CODEX-SEMETH-PRA-02, GEMCLI-SEMETH-PRA-02, GEMENT-SEMETH-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "rapid prototyping and iteration",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A143)",
   "CLAUDE-SEMETH-PRA-01, CLAUDE-SEMETH-PRA-03, CODEX-SEMETH-PRA-05, OPERA-SEMETH-PRA-01, HUBSPOT-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "start permissive then restrict",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A144)",
   "BROWSER-SEMETH-PRA-04, BROWSER-SEMETH-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "trunk-based development",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A145)",
   "GEMCLI-SEMETH-PRA-01, GEMENT-SEMETH-PRA-03, N8N-CICD-PRA-06",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "two-week sprints",
   "Development process and architecture",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A146)",
   "N8N-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "async communication",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A147)",
   "GEMINI-DEVCOM-PRA-02, WATSONX-DEVCOM-PRA-01, N8N-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bottom-up decision-making",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A148)",
   "CODEX-SEMETH-PRA-03, N8N-DEVCOM-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "chat-based communication",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A149)",
   "CODEX-DEVCOM-PRA-01, GEMINI-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "cross-team coordination",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A150)",
   "GEMINI-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "decision records",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A151)",
   "GEMENT-DEVCOM-PRA-03, N8N-DEVCOM-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "defined roles",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A152)",
   "GEMINI-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "design docs before implementation",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A153)",
   "GEMINI-DEVCOM-PRA-03, N8N-DEVCOM-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "distributed team",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A154)",
   "N8N-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "flat roles",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A155)",
   "CLAUDE-SEMETH-PRA-02, CODEX-DEVCOM-PRA-03, HUBSPOT-SEMETH-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "in-person and synchronous collaboration",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A156)",
   "CODEX-DEVCOM-PRA-03, GEMENT-DEVCOM-PRA-03, N8N-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "open internal channels and records",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A157)",
   "CODEX-DEVCOM-PRA-02, GEMINI-DEVCOM-PRA-01, GEMENT-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "organisational goal-setting",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A158)",
   "CODEX-SEMETH-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "small autonomous teams",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A159)",
   "CODEX-SEMETH-PRA-03, HUBSPOT-SEMETH-PRA-02, N8N-SEMETH-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "structured onboarding",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A160)",
   "CODEX-DEVCOM-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "structured team meetings",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A161)",
   "GEMINI-SEMETH-PRA-01, GEMINI-DEVCOM-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "team culture norms",
   "Team organisation and communication",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A162)",
   "HUBSPOT-DEVCOM-PRA-02, N8N-DEVCOM-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bilingual docs",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A163)",
   "KIMI-CICD-PRA-01, ALIBABA-DEVCOM-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "docs updated with code",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A164)",
   "CODEX-DOC-PRA-02, GEMCLI-DOC-PRA-01, GEMENT-DOC-PRA-03, N8N-DOC-PRA-02, N8N-DOC-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "docs-as-code",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A165)",
   "N8N-DOC-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "documentation portal",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A166)",
   "COMET-DOC-PRA-01, COMET-DOC-PRA-03, BROWSER-DOC-PRA-01, HUBSPOT-DOC-PRA-01, WATSONX-DOC-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "documentation standards",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A167)",
   "GEMCLI-DOC-PRA-01, GEMENT-DOC-PRA-02, N8N-DOC-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "generated docs and release notes",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A168)",
   "KIMI-CICD-PRA-01, WATSONX-CODEREV-PRA-02, N8N-DOC-PRA-04, N8N-DOC-PRA-05",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "per-version readme",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A169)",
   "ALIBABA-SEMETH-PRA-01, ALIBABA-DOC-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "tests as documentation",
   "Documentation",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A170)",
   "CODEX-DOC-PRA-04",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "community outreach",
   "Public transparency",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A171)",
   "KIMI-DEVCOM-PRA-02, GLEAN-DEVCOM-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "public engineering blog",
   "Public transparency",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A172)",
   "KIMI-DEVCOM-PRA-02, COMET-DEVCOM-PRA-01, BROWSER-BUG-PRA-02, BROWSER-DEVCOM-PRA-01, GLEAN-DEVCOM-PRA-02, GLEAN-DOC-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "public incident report",
   "Public transparency",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A173)",
   "CODEX-BUG-PRA-02, OPERA-CODEREV-PRA-02, OPERA-DOC-PRA-01, BROWSER-DEVCOM-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "public model cards and research papers",
   "Public transparency",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A174)",
   "GEMINI-TEST-PRA-01, GEMINI-DOC-PRA-01, KIMI-DEVCOM-PRA-02, KIMI-DOC-PRA-01, ALIBABA-SEMETH-PRA-01, ALIBABA-DEVCOM-PRA-01, ALIBABA-DOC-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "public release notes",
   "Public transparency",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A175)",
   "GEMINI-DOC-PRA-01, ALIBABA-DEVCOM-PRA-01, COMET-CICD-PRA-01, COMET-DEVCOM-PRA-01, GEMENT-CICD-PRA-01, GEMENT-BUG-PRA-02, GEMENT-DOC-PRA-01, WATSONX-BUG-PRA-02, N8N-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "public security documentation",
   "Public transparency",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A176)",
   "OPERA-DOC-PRA-01, OPERA-DOC-PRA-02, COMET-DOC-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "published operational worklog",
   "Public transparency",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A177)",
   "KIMI-CICD-PRA-01, KIMI-DEVCOM-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: agent loop and model handling",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A178)",
   "GEMCLI-BUG-PRA-01, GEMENT-BUG-PRA-01, N8N-BUG-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: api and contract mismatch",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A179)",
   "CODEX-BUG-PRA-01, GLEAN-BUG-PRA-01, GEMENT-BUG-PRA-01, WATSONX-BUG-PRA-01, N8N-BUG-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: concurrency and lifecycle",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A180)",
   "GEMCLI-BUG-PRA-01, BROWSER-BUG-PRA-02",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: configuration and environment",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A181)",
   "BROWSER-BUG-PRA-02, GLEAN-BUG-PRA-01, GEMENT-BUG-PRA-01, WATSONX-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: input and data handling",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A182)",
   "WATSONX-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: resource and dependency leaks",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A183)",
   "CODEX-BUG-PRA-01, BROWSER-BUG-PRA-02, GLEAN-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: security and privacy",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A184)",
   "CODEX-BUG-PRA-01, GLEAN-BUG-PRA-01, GEMENT-BUG-PRA-01, WATSONX-BUG-PRA-01",
   "",
   "",
   "",
   "",
   ""
  ],
  [
   "bug pattern: version and platform regressions",
   "Bug patterns",
   "=COUNTIF('Agreement Index'!$L$2:$O$563,A185)",
   "CODEX-BUG-PRA-01, GEMCLI-BUG-PRA-01, N8N-BUG-PRA-03",
   "",
   "",
   "",
   "",
   ""
  ]
 ],
 "n_categories": 17,
 "dropdown_source": "A2:A1000",
 "summary": {
  "col": 18,
  "labels": [
   "Agree",
   "Disagree",
   "Not yet coded",
   "% agreement",
   "Marketing items"
  ],
  "formulas": [
   "=COUNTIF(H2:H563,\"Agree\")",
   "=COUNTIF(H2:H563,\"Disagree\")",
   "=COUNTA(D2:D563)-S1-S2",
   "=IF(S1+S2=0,\"\",S1/(S1+S2))",
   "=COUNTIF(I2:I563,\"yes\")"
  ]
 },
 "prev": [
  {
   "round": "v1",
   "headers": [
    "annotation_1",
    "annotation_2",
    "annotation_3",
    "annotation_4",
    "annotation_5",
    "annotation_memo"
   ],
   "items": {
    "CLAUDE-TEST-PRA-01": [
     "SELF: internal dogfooding",
     "AGENT-EVAL: model-based classifiers grade output",
     "AUTO: unit/end-to-end tests",
     "HUMAN-VALIDATION: A/B testing with real users in production",
     "",
     ""
    ],
    "CLAUDE-TEST-PRA-02": [
     "",
     "",
     "",
     "",
     "",
     "Definition of an eval; grader type (code, model or human) not stated, so no approach tag"
    ],
    "CLAUDE-TEST-PRA-03": [
     "AUTO: unit tests verify multi-turn agent outcome",
     "",
     "",
     "",
     "",
     "Single-turn grader type not stated. Anthropic-wide eval approach (MCP-server example), not specific to Claude Code"
    ],
    "CLAUDE-TEST-PRA-04": [
     "",
     "",
     "",
     "",
     "",
     "Definition of an eval suite; no approach tag"
    ],
    "CLAUDE-TEST-PRA-05": [
     "SELF: internal dogfooding",
     "HUMAN-VALIDATION: internal users give continuous feedback",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-CICD-PRA-01": [
     "SELF: internal releases used by the team before public release",
     "",
     "",
     "",
     "",
     "The item does not say who uses the internal releases; link to dogfooding comes from TEST-PRA-05"
    ],
    "CLAUDE-CODEREV-PRA-01": [
     "HUMAN-VALIDATION: human review comments tracked for recurring patterns",
     "AUTO: recurring review criteria converted into lint rules",
     "",
     "",
     "",
     "Rooted in one engineer's career history; the link to Claude Code is asserted, not shown"
    ],
    "CLAUDE-CODEREV-PRA-02": [
     "SELF: the agent reviews its own project's PRs",
     "AGENT-EVAL: AI first-pass PR review",
     "AGENT-EVAL: parallel specialised review subagents",
     "AGENT-EVAL: writer and reviewer are separate agents",
     "HUMAN-VALIDATION: human approves the final merge",
     ""
    ],
    "CLAUDE-BUG-PRA-01": [
     "HUMAN-VALIDATION: users report bugs in a public issue tracker",
     "AUTO: bot closes inactive issues",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-SEMETH-PRA-01": [
     "SELF: parallel agents build the product's prototypes",
     "HUMAN-VALIDATION: direct feedback on prototypes",
     "HUMAN-VALIDATION: internal adoption used as the product specification",
     "",
     "",
     ""
    ],
    "CLAUDE-SEMETH-PRA-02": [
     "",
     "",
     "",
     "",
     "",
     "no approach tag; describes team structure"
    ],
    "CLAUDE-SEMETH-PRA-03": [
     "",
     "",
     "",
     "",
     "",
     "no approach tag; describes pace (releases per engineer)"
    ],
    "CLAUDE-DEVCOM-PRA-01": [
     "SELF: the agent answers the team's questions instead of colleagues",
     "",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-DOC-PRA-01": [
     "SELF: project docs written for the agent to read",
     "",
     "",
     "",
     "",
     "Weaker fit; the agent is the reader of the docs (CLAUDE.md), not the actor"
    ],
    "GEMCLI-TEST-PRA-01": [
     "AUTO: unit tests",
     "AUTO: integration tests in sandboxed containers",
     "AUTO: lint and style checks",
     "",
     "",
     ""
    ],
    "GEMCLI-TEST-PRA-02": [
     "AUTO: tests re-run several times to catch flakiness",
     "AUTO: memory regression tests against committed baselines",
     "AUTO: performance regression tests with a tolerance",
     "AUTO: nightly CI run of regression suites",
     "",
     ""
    ],
    "GEMCLI-CICD-PRA-01": [
     "AUTO: bot-run release pipeline",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CICD-PRA-02": [
     "AUTO: scheduled nightly releases",
     "HUMAN-VALIDATION: maintainers trigger official releases by hand",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CICD-PRA-03": [
     "AUTO: CI on every PR push",
     "AUTO: test matrix across OS and runtime versions",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CODEREV-PRA-01": [
     "",
     "",
     "",
     "",
     "",
     "Small, atomic PRs; no approach tag (the item does not say who reviews)"
    ],
    "GEMCLI-CODEREV-PRA-02": [
     "AGENT-EVAL: AI review tool flags anti-patterns, testing issues and best practices",
     "SELF: the agent reviews its own project's PRs",
     "",
     "",
     "",
     "SELF comes from q-67: the tool runs inside a Gemini CLI session (/review-frontend). The CLA requirement has no approach tag"
    ],
    "GEMCLI-CODEREV-PRA-03": [
     "HUMAN-VALIDATION: reviewers approve changes that improve code health",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CODEREV-PRA-04": [
     "HUMAN-VALIDATION: reviewers respond within one business day",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-BUG-PRA-01": [
     "AUTO: bot handles issue assignment commands",
     "",
     "",
     "",
     "",
     "The issue-category list describes failure types, not an approach"
    ],
    "GEMCLI-BUG-PRA-02": [
     "AUTO: bot unassigns contributors with no linked PR after 7 days",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-BUG-PRA-03": [
     "",
     "",
     "",
     "",
     "",
     "no approach tag; issue hierarchy used as the roadmap"
    ],
    "GEMCLI-SEMETH-PRA-01": [
     "",
     "",
     "",
     "",
     "",
     "no approach tag; trunk-based development"
    ],
    "GEMCLI-SEMETH-PRA-02": [
     "",
     "",
     "",
     "",
     "",
     "no approach tag; monorepo structure"
    ],
    "GEMCLI-SEMETH-PRA-03": [
     "",
     "",
     "",
     "",
     "",
     "no approach tag; guiding principles (marketing)"
    ],
    "GEMCLI-DEVCOM-PRA-01": [
     "AUTO: bot handles issue assignment commands",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-DOC-PRA-01": [
     "",
     "",
     "",
     "",
     "",
     "no approach tag; contributors must update docs and follow a style guide, but no check is stated"
    ]
   },
   "codebook_header": "tag (dropdown list)",
   "summary_col": 19,
   "summary_labels": [
    "Agree",
    "Disagree",
    "Not yet coded",
    "% agreement",
    "Marketing items"
   ],
   "summary_formulas": [
    "=COUNTIF(H2:H563,\"Agree\")",
    "=COUNTIF(H2:H563,\"Disagree\")",
    "=COUNTA(D2:D563)-T1-T2",
    "=IF(T1+T2=0,\"\",T1/(T1+T2))",
    "=COUNTIF(I2:I563,\"yes\")"
   ]
  },
  {
   "round": "r3",
   "headers": [
    "annotation_1",
    "annotation_2",
    "annotation_3",
    "annotation_4",
    "annotation_5",
    "annotation_6",
    "annotation_7",
    "annotation_8",
    "annotation_memo"
   ],
   "items": {
    "CLAUDE-TEST-PRA-01": [
     "layered evaluation",
     "unit tests",
     "end-to-end tests",
     "model-based grading",
     "internal dogfooding",
     "a/b testing in production",
     "",
     "",
     ""
    ],
    "CLAUDE-TEST-PRA-02": [
     "eval definition",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Definition of an eval, not a team practice"
    ],
    "CLAUDE-TEST-PRA-03": [
     "single-turn evals",
     "multi-turn agentic evals",
     "tests verify agent outcome",
     "",
     "",
     "",
     "",
     "",
     "Anthropic-wide eval approach (MCP-server example), not specific to Claude Code"
    ],
    "CLAUDE-TEST-PRA-04": [
     "eval suites by capability",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Mostly a definition"
    ],
    "CLAUDE-TEST-PRA-05": [
     "internal dogfooding",
     "continuous internal feedback",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-CICD-PRA-01": [
     "frequent release cadence",
     "internal-first release",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-CODEREV-PRA-01": [
     "review comments mined for patterns",
     "review rules turned into lint",
     "",
     "",
     "",
     "",
     "",
     "",
     "Rooted in one engineer's career history; the link to Claude Code is asserted, not shown"
    ],
    "CLAUDE-CODEREV-PRA-02": [
     "ai code review",
     "agent reviews its own project's code",
     "parallel specialised review agents",
     "writer/reviewer separation",
     "human merge approval",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-BUG-PRA-01": [
     "public issue tracker",
     "stale-issue automation",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-SEMETH-PRA-01": [
     "prototype-driven development",
     "agent builds its own product",
     "parallel agents for development",
     "rapid iteration on feedback",
     "internal adoption as validation",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-SEMETH-PRA-02": [
     "flat roles",
     "cross-functional contribution",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "CLAUDE-SEMETH-PRA-03": [
     "frequent release cadence",
     "rapid prototyping",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-DEVCOM-PRA-01": [
     "agent as knowledge source",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CLAUDE-DOC-PRA-01": [
     "agent context files",
     "concise agent context",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-01": [
     "tests structured for agent self-checking",
     "agent context files",
     "clear module boundaries",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-02": [
     "agent tests its own product",
     "agent skill for testing",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-03": [
     "nightly scheduled agent runs",
     "agent finds bugs in its own codebase",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-04": [
     "ci on every pr",
     "checks on merge commit",
     "pre-merge vs post-merge split",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-05": [
     "flaky-test handling",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-06": [
     "team bug bashes",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-07": [
     "agent finds issues before launch",
     "agent tests its own product",
     "screenshot evidence on pr",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-TEST-PRA-08": [
     "evals",
     "a/b testing in production",
     "internal dogfooding",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CICD-PRA-01": [
     "single merge-blocking ci gate",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CICD-PRA-02": [
     "pre-merge vs post-merge split",
     "fast pr feedback",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CICD-PRA-03": [
     "tag-driven release",
     "version consistency check",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CICD-PRA-04": [
     "frequent release cadence",
     "package-manager distribution",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CICD-PRA-05": [
     "internal-first release",
     "feature flags",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide (Codex cloud launch)"
    ],
    "CODEX-CODEREV-PRA-01": [
     "ai code review",
     "custom-trained review model",
     "automatic ai review on pr state change",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CODEREV-PRA-02": [
     "human code review for critical code",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CODEREV-PRA-03": [
     "ai code review on every pr",
     "mandatory ai review",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide (all OpenAI PRs)"
    ],
    "CODEX-CODEREV-PRA-04": [
     "two-round review (agent output, then peers)",
     "review overload",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-CODEREV-PRA-05": [
     "pr description explains motivation",
     "small single-purpose changes",
     "keep core module small",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-BUG-PRA-01": [
     "bug pattern: sandbox and security regressions",
     "bug pattern: resource leaks",
     "bug pattern: client/backend contract mismatch",
     "bug pattern: release and packaging regressions",
     "",
     "",
     "",
     "",
     "Bug categories, not a practice"
    ],
    "CODEX-BUG-PRA-02": [
     "maintainers acknowledge regressions publicly",
     "architectural fix for recurring failures",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-BUG-PRA-03": [
     "structured issue templates",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-BUG-PRA-04": [
     "ai issue triage",
     "user uploads logs and sessions",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-BUG-PRA-05": [
     "community bug reports",
     "community root-cause analysis",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-BUG-PRA-06": [
     "agent finds bugs in its own codebase",
     "nightly scheduled agent runs",
     "humans review agent-proposed fixes",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-BUG-PRA-07": [
     "agent finds and fixes bugs autonomously",
     "nightly scheduled agent runs",
     "observability-driven bug fixing",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-SEMETH-PRA-01": [
     "agent-generated code majority",
     "engineers as agent managers",
     "agent builds its own product",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-SEMETH-PRA-02": [
     "single repo for internal and public versions",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-SEMETH-PRA-03": [
     "small autonomous teams",
     "bottom-up ideas",
     "experiment-then-launch selection",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "CODEX-SEMETH-PRA-04": [
     "plan-first with agent",
     "human in the loop on agent code",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-SEMETH-PRA-05": [
     "rapid build to launch",
     "organisational goal-setting",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "CODEX-SEMETH-PRA-06": [
     "incremental rewrite with parallel maintenance",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DEVCOM-PRA-01": [
     "chat-based communication",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "CODEX-DEVCOM-PRA-02": [
     "open/public channels",
     "agent connected to team knowledge",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DEVCOM-PRA-03": [
     "spontaneous meetings",
     "in-person collaboration",
     "accessible leadership",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DEVCOM-PRA-04": [
     "agent as knowledge source",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DEVCOM-PRA-05": [
     "pairing onboarding",
     "ship on first day",
     "agent-assisted onboarding",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DOC-PRA-01": [
     "agent context files",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DOC-PRA-02": [
     "nested agent context files",
     "docs kept in sync with code",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DOC-PRA-03": [
     "machine-readable docs for agents",
     "docs issue template",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DOC-PRA-04": [
     "tests as documentation",
     "pr description summary",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "CODEX-DOC-PRA-05": [
     "artifacts readable by humans and agents",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMCLI-TEST-PRA-01": [
     "unit tests",
     "integration tests",
     "sandboxed test environment",
     "lint and static checks",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-TEST-PRA-02": [
     "flaky-test handling",
     "memory regression tests",
     "performance regression tests",
     "nightly scheduled runs",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CICD-PRA-01": [
     "bot-run release pipeline",
     "ci pipeline",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CICD-PRA-02": [
     "nightly scheduled releases",
     "manual release trigger",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CICD-PRA-03": [
     "ci on every pr",
     "test matrix across platforms",
     "lint and static checks",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CODEREV-PRA-01": [
     "small single-purpose changes",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-CODEREV-PRA-02": [
     "ai code review",
     "agent reviews its own project's code",
     "contributor license agreement",
     "",
     "",
     "",
     "",
     "",
     "Self-review comes from q-67: the tool runs inside a Gemini CLI session (/review-frontend)"
    ],
    "GEMCLI-CODEREV-PRA-03": [
     "code-health approval standard",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide guideline"
    ],
    "GEMCLI-CODEREV-PRA-04": [
     "review response-time target",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide guideline"
    ],
    "GEMCLI-BUG-PRA-01": [
     "bug pattern: platform-specific regressions",
     "bug pattern: model fallback and quota",
     "bug pattern: edge-case input parsing",
     "bug pattern: background process lifecycle",
     "bot-driven issue assignment",
     "issue assignment limit",
     "",
     "",
     ""
    ],
    "GEMCLI-BUG-PRA-02": [
     "stale-assignment automation",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-BUG-PRA-03": [
     "issue hierarchy as roadmap",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-SEMETH-PRA-01": [
     "trunk-based development",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide philosophy"
    ],
    "GEMCLI-SEMETH-PRA-02": [
     "monorepo",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-SEMETH-PRA-03": [
     "published guiding principles",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Marketing"
    ],
    "GEMCLI-DEVCOM-PRA-01": [
     "bot-driven issue assignment",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMCLI-DOC-PRA-01": [
     "docs required with code change",
     "documentation style guide",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMINI-TEST-PRA-01": [
     "benchmark evaluation",
     "staged evaluation (pre- and post-training)",
     "safety evaluation",
     "red-teaming",
     "internal dogfooding",
     "public model cards and tech reports",
     "",
     "",
     ""
    ],
    "GEMINI-TEST-PRA-02": [
     "impact assessment by responsibility team",
     "council review",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMINI-CICD-PRA-01": [
     "staged rollout",
     "versioned model releases",
     "documented deprecation lifecycle",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMINI-CODEREV-PRA-01": [
     "mandatory pre-submit code review",
     "readability certification",
     "code owners",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-CODEREV-PRA-02": [
     "small single-purpose changes",
     "tests included with change",
     "separate refactors from features",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-CODEREV-PRA-03": [
     "review response-time target",
     "approve with minor comments",
     "multiple review rounds per day",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-CODEREV-PRA-04": [
     "review rubric",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-CODEREV-PRA-05": [
     "code-health approval standard",
     "non-blocking review comments",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-CODEREV-PRA-06": [
     "review as knowledge sharing",
     "non-blocking review comments",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-BUG-PRA-01": [
     "issue routing by component owner",
     "cross-team coordination",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMINI-SEMETH-PRA-01": [
     "structured production meetings",
     "post-mortem review",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-SEMETH-PRA-02": [
     "defined roles",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-DEVCOM-PRA-01": [
     "open/public channels",
     "chat-based communication",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-DEVCOM-PRA-02": [
     "mailing lists",
     "async communication",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-DEVCOM-PRA-03": [
     "design docs before implementation",
     "stakeholder consensus",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMINI-DEVCOM-PRA-04": [
     "structured production meetings",
     "post-mortem review",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide; overlaps GEMINI-SEMETH-PRA-01"
    ],
    "GEMINI-DOC-PRA-01": [
     "public model cards and tech reports",
     "public release notes",
     "public safety documentation",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "KIMI-TEST-PRA-01": [
     "internal benchmarks",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "KIMI-TEST-PRA-02": [
     "benchmark evaluation",
     "repeated eval runs",
     "internal dogfooding",
     "long-running stress test",
     "third-party evaluation",
     "",
     "",
     "",
     ""
    ],
    "KIMI-CICD-PRA-01": [
     "pre-release production trial by agent",
     "published operational worklog",
     "automated issue translation",
     "bilingual docs",
     "ai-generated docs",
     "",
     "",
     "",
     "Mixes three separate practices"
    ],
    "KIMI-BUG-PRA-01": [
     "runtime self-recovery of agent",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Describes product behaviour, not a team practice"
    ],
    "KIMI-SEMETH-PRA-01": [
     "internal dogfooding",
     "agent runs team's own operations",
     "usage data fed back into development",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "KIMI-DEVCOM-PRA-01": [
     "public community channels",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "KIMI-DEVCOM-PRA-02": [
     "public engineering blog",
     "social media outreach",
     "published benchmarks",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "KIMI-DEVCOM-PRA-03": [
     "published operational worklog",
     "transparency to community",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "KIMI-DOC-PRA-01": [
     "public model cards and tech reports",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-TEST-PRA-01": [
     "security pen-testing",
     "pre-launch hardening",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-TEST-PRA-02": [
     "staged rollout",
     "real-world usage feedback",
     "community security testing",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-TEST-PRA-03": [
     "bug bounty program",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-CICD-PRA-01": [
     "staged rollout",
     "invite-only release",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-CICD-PRA-02": [
     "isolated execution environments",
     "local vs cloud execution split",
     "",
     "",
     "",
     "",
     "",
     "",
     "Describes product architecture"
    ],
    "OPERA-CODEREV-PRA-01": [
     "security design review",
     "prompt-injection safeguards review",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-CODEREV-PRA-02": [
     "cross-team incident review",
     "public incident report",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-BUG-PRA-01": [
     "bug bounty program",
     "manual review of auto-rejected reports",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-BUG-PRA-02": [
     "rapid vulnerability response",
     "same-day fix deployment",
     "external fix verification",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-BUG-PRA-03": [
     "cve assignment",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-SEMETH-PRA-01": [
     "iterative development",
     "staged releases from research to product",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-SEMETH-PRA-02": [
     "human in the loop for sensitive actions",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Describes product design"
    ],
    "OPERA-SEMETH-PRA-03": [
     "isolated task workspaces",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Describes a product feature"
    ],
    "OPERA-DEVCOM-PRA-01": [
     "responsible disclosure coordination",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-DOC-PRA-01": [
     "public security documentation",
     "public incident report",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "OPERA-DOC-PRA-02": [
     "public security documentation",
     "transparency report",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-TEST-PRA-01": [
     "benchmark evaluation",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-TEST-PRA-02": [
     "end-to-end task success in live environments",
     "real or emulated device testing",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-TEST-PRA-03": [
     "community bug reports as testing",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-TEST-PRA-04": [
     "unit tests",
     "tests not run in ci",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-CICD-PRA-01": [
     "no automated ci for code",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-CODEREV-PRA-01": [
     "no formal pr review",
     "direct commits by core team",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-BUG-PRA-01": [
     "best-effort issue response",
     "community root-cause analysis",
     "maintainer direct fix commit",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-BUG-PRA-02": [
     "maintainer shares eval logs for reproduction",
     "environment issues closed by reporter",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-BUG-PRA-03": [
     "no issue triage labels",
     "long-open architectural issues",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-BUG-PRA-04": [
     "community support in issues",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-SEMETH-PRA-01": [
     "research-gated releases",
     "paper-accompanied releases",
     "version-per-directory",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-DEVCOM-PRA-01": [
     "early publication of research",
     "readme release announcements",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-DEVCOM-PRA-02": [
     "bilingual docs",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "ALIBABA-DOC-PRA-01": [
     "per-version readme",
     "paper-accompanied releases",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-TEST-PRA-01": [
     "adversarial benchmark",
     "prompt-injection evaluation",
     "attack taxonomy guides training data",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-TEST-PRA-02": [
     "continuous retraining on new attacks",
     "bug bounty program",
     "red-teaming",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-TEST-PRA-03": [
     "benchmark findings change training data",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-TEST-PRA-04": [
     "robustness testing with distractors",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-CICD-PRA-01": [
     "frequent release cadence",
     "public changelog",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-BUG-PRA-01": [
     "vulnerability disclosure program",
     "bug bounty program",
     "ai-specific issues out of scope",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "COMET-BUG-PRA-02": [
     "failures turned into training data",
     "continuous retraining on new attacks",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-SEMETH-PRA-01": [
     "security-first design",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Marketing quote"
    ],
    "COMET-DEVCOM-PRA-01": [
     "public changelog",
     "public engineering blog",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-DOC-PRA-01": [
     "user documentation hub",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-DOC-PRA-02": [
     "public security documentation",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "COMET-DOC-PRA-03": [
     "privacy and security faq for enterprise",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-TEST-PRA-01": [
     "per-pr agent evaluation",
     "parallel eval runs",
     "llm-as-judge",
     "runtime validation layer",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-TEST-PRA-02": [
     "eval tasks from real user data",
     "llm-labelled eval data",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-TEST-PRA-03": [
     "repeated eval runs",
     "statistical aggregation of eval results",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-TEST-PRA-04": [
     "unit tests",
     "integration tests",
     "parallel test execution",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-TEST-PRA-05": [
     "tracing agent runs",
     "cost and token observability",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-CICD-PRA-01": [
     "lint and static checks",
     "ci on every pr",
     "per-pr agent evaluation",
     "tag-driven release",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-CICD-PRA-02": [
     "sandboxed agent execution",
     "zero-secret sandbox",
     "credentials held in control plane",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-CICD-PRA-03": [
     "architecture change for security and scale",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-CICD-PRA-04": [
     "architecture trade-off reasoning",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Reasoning about a design choice, not a practice"
    ],
    "BROWSER-CICD-PRA-05": [
     "queue-based task execution",
     "serverless workers",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-CICD-PRA-06": [
     "managed micro-vm sandboxes",
     "infrastructure as code",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-CODEREV-PRA-01": [
     "pre-commit checks",
     "lint and static checks",
     "type checking",
     "spell checking",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-CODEREV-PRA-02": [
     "per-pr agent evaluation",
     "eval score posted on pr",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-BUG-PRA-01": [
     "public issue tracker",
     "bug labels",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-BUG-PRA-02": [
     "public sharing of bug patterns",
     "bug pattern: race conditions",
     "bug pattern: async misuse",
     "bug pattern: resource leaks",
     "bug pattern: configuration failures",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-SEMETH-PRA-01": [
     "minimal-agent design",
     "rebuild from scratch",
     "learning from other agents",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-SEMETH-PRA-02": [
     "rapid iteration on feedback",
     "fix forward",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-SEMETH-PRA-03": [
     "design belief: complete action space",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Marketing-style claim"
    ],
    "BROWSER-SEMETH-PRA-04": [
     "start permissive then restrict",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-SEMETH-PRA-05": [
     "start permissive then restrict",
     "eval-driven restriction of the agent",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-DEVCOM-PRA-01": [
     "public engineering blog",
     "public incident report",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "BROWSER-DOC-PRA-01": [
     "user documentation hub",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-TEST-PRA-01": [
     "curated eval set of real-world examples",
     "binary sub-metrics",
     "north-star metric",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-TEST-PRA-02": [
     "eval tasks from real user data",
     "user feedback in eval set",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-TEST-PRA-03": [
     "structured improvement loop",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-TEST-PRA-04": [
     "failure pattern review after eval",
     "ordered fix priority (prompt before model)",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-TEST-PRA-05": [
     "eval set prioritises complex multi-step tasks",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-CICD-PRA-01": [
     "hot deployment without restart",
     "nightly internal rollout",
     "weekly customer rollout",
     "instant rollback",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-CODEREV-PRA-01": [
     "ai code review",
     "agent reviews its own project's code",
     "ai aggregates review comments",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GLEAN-BUG-PRA-01": [
     "bug pattern: pii exposure",
     "bug pattern: dependency leaks",
     "bug pattern: configuration failures",
     "bug pattern: missing test sandbox",
     "bug pattern: schema and doc inconsistencies",
     "",
     "",
     "",
     "Bug categories, not a practice"
    ],
    "GLEAN-BUG-PRA-02": [
     "public issue tracker",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-SEMETH-PRA-01": [
     "experiment-driven development",
     "nightly internal rollout",
     "frequent release cadence",
     "traces feed product improvement",
     "",
     "",
     "",
     "",
     ""
    ],
    "GLEAN-DEVCOM-PRA-01": [
     "internal dogfooding",
     "agent runs team's own operations",
     "agent summarises team activity",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GLEAN-DEVCOM-PRA-02": [
     "public engineering blog",
     "social media outreach",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GLEAN-DOC-PRA-01": [
     "public engineering blog",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-TEST-PRA-01": [
     "staged rollout",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-TEST-PRA-02": [
     "slo-based quality gates",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-TEST-PRA-03": [
     "production monitoring and tracing",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-TEST-PRA-04": [
     "large-scale automated testing platform",
     "hermetic tests",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-CICD-PRA-01": [
     "continuous deployment",
     "public release notes",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-CICD-PRA-02": [
     "product renaming",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Not a practice"
    ],
    "GEMENT-CICD-PRA-03": [
     "release candidates from green head",
     "one-click rollback",
     "feature flags",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-CICD-PRA-04": [
     "large-scale automated code changes",
     "automated review of generated changes",
     "presubmit checks",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-CODEREV-PRA-01": [
     "code-health approval standard",
     "non-blocking review comments",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-CODEREV-PRA-02": [
     "data over opinion in review",
     "style guide authority",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-CODEREV-PRA-03": [
     "review response-time target",
     "small single-purpose changes",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-CODEREV-PRA-04": [
     "code owners",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-BUG-PRA-01": [
     "bug pattern: sandbox and security regressions",
     "bug pattern: configuration failures",
     "bug pattern: agent orchestration",
     "bug pattern: api and ui consistency",
     "",
     "",
     "",
     "",
     "Bug categories, not a practice"
    ],
    "GEMENT-BUG-PRA-02": [
     "public release notes",
     "automatic server-side security fixes",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-SEMETH-PRA-01": [
     "admin-gated preview features",
     "feature flags",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-SEMETH-PRA-02": [
     "backward compatibility",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-SEMETH-PRA-03": [
     "trunk-based development",
     "one-version rule",
     "small incremental commits",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-SEMETH-PRA-04": [
     "large-scale automated code changes",
     "presubmit checks",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide; overlaps GEMENT-CICD-PRA-04"
    ],
    "GEMENT-DEVCOM-PRA-01": [
     "open bug history for all engineers",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-DEVCOM-PRA-02": [
     "unified test reporting",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-DEVCOM-PRA-03": [
     "escalation to synchronous discussion",
     "decisions recorded on the change",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "GEMENT-DOC-PRA-01": [
     "public release notes",
     "machine-readable release notes",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-DOC-PRA-02": [
     "documentation structured by audience",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "GEMENT-DOC-PRA-03": [
     "docs released with feature",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "HUBSPOT-TEST-PRA-01": [
     "ui component tests",
     "user-focused tests",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-TEST-PRA-02": [
     "test framework migration",
     "runtime metrics guide migration",
     "browser-based test execution",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-TEST-PRA-03": [
     "integration-first testing strategy",
     "test-writing guides",
     "migration tracking tool",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-TEST-PRA-04": [
     "internal eval framework for coding agents",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-CICD-PRA-01": [
     "large-scale ci/cd platform",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide; describes scale, not a practice"
    ],
    "HUBSPOT-CICD-PRA-02": [
     "containerised cloud coding agents",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-CICD-PRA-03": [
     "build caching",
     "dedicated build node pool",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-CICD-PRA-04": [
     "auto-scaling infrastructure",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide; describes infrastructure, not a practice"
    ],
    "HUBSPOT-CODEREV-PRA-01": [
     "ai code review",
     "ai review gated by a judge agent",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-CODEREV-PRA-02": [
     "ai code review",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide; marketing"
    ],
    "HUBSPOT-CODEREV-PRA-03": [
     "ai review gated by a judge agent",
     "review quality criteria",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-CODEREV-PRA-04": [
     "developer reactions as ai review feedback",
     "continuous improvement of ai reviewer",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-BUG-PRA-01": [
     "automated rollback",
     "incident response",
     "monitoring blind spot",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-BUG-PRA-02": [
     "ai-generated plan from issue",
     "human edits agent plan",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-SEMETH-PRA-01": [
     "rapid execution over planning",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide; marketing"
    ],
    "HUBSPOT-SEMETH-PRA-02": [
     "small autonomous teams",
     "hands-on tech leads",
     "low bureaucracy",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-SEMETH-PRA-03": [
     "mandatory ai fluency",
     "ai tools in daily workflow",
     "ai code review",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-SEMETH-PRA-04": [
     "tracing agent runs",
     "cost and token observability",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-DEVCOM-PRA-01": [
     "developer reactions as ai review feedback",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "HUBSPOT-DEVCOM-PRA-02": [
     "psychological safety",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide; marketing"
    ],
    "HUBSPOT-DOC-PRA-01": [
     "documented mcp servers",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "WATSONX-TEST-PRA-01": [
     "local build and test before production",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-TEST-PRA-02": [
     "simulated user conversations before release",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-TEST-PRA-03": [
     "step-level trace inspection",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-TEST-PRA-04": [
     "red-teaming",
     "built-in adversarial testing",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-TEST-PRA-05": [
     "trajectory evaluation against reference data",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-CICD-PRA-01": [
     "frequent release cadence",
     "containerised developer edition",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-CODEREV-PRA-01": [
     "code owners",
     "human merge approval",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-CODEREV-PRA-02": [
     "structured commit and pr title convention",
     "release-notes generation",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-BUG-PRA-01": [
     "bug pattern: environment and connectivity",
     "bug pattern: configuration failures",
     "bug pattern: data import and export",
     "bug pattern: authentication",
     "bug pattern: api and ui consistency",
     "",
     "",
     "",
     "Bug categories, not a practice"
    ],
    "WATSONX-BUG-PRA-02": [
     "community bug reports",
     "known issues in release notes",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-BUG-PRA-03": [
     "vendor support channel",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-SEMETH-PRA-01": [
     "prescribed iterative agent lifecycle",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Introduces WATSONX-SEMETH-PRA-02; split item"
    ],
    "WATSONX-SEMETH-PRA-02": [
     "develop-evaluate-analyse-improve loop",
     "trajectory evaluation against reference data",
     "failure pattern review after eval",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-SEMETH-PRA-03": [
     "developer tooling investment",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-DEVCOM-PRA-01": [
     "async coordination via prs",
     "code owners",
     "structured commit and pr title convention",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "WATSONX-DOC-PRA-01": [
     "developer documentation portal",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-TEST-PRA-01": [
     "regression tests required for bug fixes",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-TEST-PRA-02": [
     "manual testing steps in pr",
     "author accountability for code",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-TEST-PRA-03": [
     "unit tests",
     "end-to-end tests",
     "integration tests",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-TEST-PRA-04": [
     "mocked llm responses in tests",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-TEST-PRA-05": [
     "internal eval harness",
     "llm-generated mock responses",
     "eval of agent-built artifacts",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-TEST-PRA-06": [
     "eval cost management",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-TEST-PRA-07": [
     "agent-runnable test commands",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CICD-PRA-01": [
     "secret-free ci for forks",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CICD-PRA-02": [
     "least-privilege ci permissions",
     "ci as the full check",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CICD-PRA-03": [
     "release via release pr",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CICD-PRA-04": [
     "immutable published versions",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CICD-PRA-05": [
     "frequent release cadence",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CICD-PRA-06": [
     "trunk-based development",
     "feature flags",
     "label-driven backports",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CODEREV-PRA-01": [
     "human code review on every pr",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CODEREV-PRA-02": [
     "small single-purpose changes",
     "stacked prs",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CODEREV-PRA-03": [
     "contributor response deadline",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CODEREV-PRA-04": [
     "ai code review",
     "prioritised review findings",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CODEREV-PRA-05": [
     "resolve ai review before human review",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-CODEREV-PRA-06": [
     "author accountability for code",
     "ai-use disclosure",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-BUG-PRA-01": [
     "structured issue templates",
     "reproduction steps required",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-BUG-PRA-02": [
     "internal ticket for confirmed issues",
     "notify reporter on release",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-BUG-PRA-03": [
     "bug pattern: provider api drift",
     "bug pattern: agent-loop state handling",
     "bug pattern: version regressions",
     "",
     "",
     "",
     "",
     "",
     "Bug categories, not a practice"
    ],
    "N8N-SEMETH-PRA-01": [
     "small autonomous teams",
     "two-week sprints",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "N8N-SEMETH-PRA-02": [
     "branch per ticket",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-SEMETH-PRA-03": [
     "semantic versioning",
     "planned major releases",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-SEMETH-PRA-04": [
     "ai tools in daily workflow",
     "shared agent configuration",
     "ai-assisted contributions welcome",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-DEVCOM-PRA-01": [
     "distributed team",
     "async communication",
     "regular offsites",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "N8N-DEVCOM-PRA-02": [
     "written culture code",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "N8N-DEVCOM-PRA-03": [
     "architecture decision records",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "N8N-DEVCOM-PRA-04": [
     "engineer input on technical decisions",
     "working groups",
     "",
     "",
     "",
     "",
     "",
     "",
     "Company-wide"
    ],
    "N8N-DEVCOM-PRA-05": [
     "discuss feature before building",
     "link ticket in pr",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-DOC-PRA-01": [
     "docs-as-code",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-DOC-PRA-02": [
     "docs required with code change",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-DOC-PRA-03": [
     "docs required for ci workflows",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-DOC-PRA-04": [
     "generated docs",
     "diagrams in docs",
     "",
     "",
     "",
     "",
     "",
     "",
     ""
    ],
    "N8N-DOC-PRA-05": [
     "structured commit and pr title convention",
     "release-notes generation",
     "human review of generated release notes",
     "",
     "",
     "",
     "",
     "",
     ""
    ]
   },
   "codebook_header": "code (dropdown list)",
   "summary_col": 22,
   "summary_labels": [
    "Agree",
    "Disagree",
    "Not yet coded",
    "% agreement",
    "Marketing items"
   ],
   "summary_formulas": [
    "=COUNTIF(H2:H563,\"Agree\")",
    "=COUNTIF(H2:H563,\"Disagree\")",
    "=COUNTA(D2:D563)-W1-W2",
    "=IF(W1+W2=0,\"\",W1/(W1+W2))",
    "=COUNTIF(I2:I563,\"yes\")"
   ]
  }
 ]
};
