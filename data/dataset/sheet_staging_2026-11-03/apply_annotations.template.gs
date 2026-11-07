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
const ANNOT = /*__ANNOT__*/null;
