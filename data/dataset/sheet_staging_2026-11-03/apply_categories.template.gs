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
const CAT = /*PAYLOAD*/;
