/**
 * Restores author_1, author_2 and agreement (columns F:H) and the row colours (A:K) on
 * "Agreement Index" from "Agreement-old", for every information item that existed before
 * the 2026-11-03 rebuild. New items keep blank F:H and get no row colour, for manual coding.
 *
 * Old and new rows are matched in advance (same agent/dimension/sub-dimension, same or
 * reworded text; ids were renumbered in places). See agreement_restore_map.csv.
 *
 * 1. Run checkRestore()   -> reads both tabs, writes nothing, logs a report.
 * 2. Run applyRestore()   -> repeats every check; writes only if all of them pass.
 *
 * Safe to re-run: rows that already hold the old values are skipped. Rows where someone has
 * already typed into F:H are never overwritten.
 */

function checkRestore() {
  const plan = restorePlan_();
  console.log(plan.report.join('\n'));
  console.log(plan.problems.length
    ? 'CHECK FAILED: ' + plan.problems.length + ' problem(s). Nothing was written.'
    : 'CHECK PASSED. Nothing was written. Run applyRestore() to apply.');
}

function applyRestore() {
  const plan = restorePlan_();
  console.log(plan.report.join('\n'));
  if (plan.problems.length) {
    throw new Error('Stopped before writing: ' + plan.problems.length +
      ' problem(s), see log above. Nothing was written.');
  }
  const n = RESTORE.last_row - 1;
  plan.cur.getRange(2, 6, n, 3).setValues(plan.values);       // F2:H{last}
  plan.cur.getRange(2, 1, n, 11).setBackgrounds(plan.colours); // A2:K{last}
  SpreadsheetApp.flush();

  const after = restorePlan_();
  console.log(after.problems.length === 0 && after.toWrite === 0
    ? 'DONE. Restored ' + plan.toWrite + ' item(s); re-read confirms every value is in place.'
    : 'WARNING: re-read found differences:\n' + after.report.join('\n'));
}

// ---------------------------------------------------------------------------

function rnorm_(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function colour_(c) {
  return (!c || c.toLowerCase() === '#ffffff') ? null : c;
}

function restorePlan_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = [], problems = [];
  const plan = { report: report, problems: problems, toWrite: 0 };
  function problem(msg) { problems.push(msg); report.push('  PROBLEM ' + msg); }

  if (ss.getId() !== RESTORE.spreadsheet_id) {
    problem('This script is attached to spreadsheet ' + ss.getId() + ', expected ' + RESTORE.spreadsheet_id + '.');
    return plan;
  }
  const cur = ss.getSheetByName('Agreement Index');
  const old = ss.getSheetByName('Agreement-old');
  if (!cur) problem('"Agreement Index" tab not found.');
  if (!old) problem('"Agreement-old" tab not found. Run applyPush() first.');
  if (!cur || !old) return plan;
  plan.cur = cur;

  const last = RESTORE.last_row, n = last - 1;
  const curVals = cur.getRange(2, 1, n, 11).getValues();
  const curCols = cur.getRange(2, 1, n, 11).getBackgrounds();

  // Old rows by agent + info_item_id
  const oldLast = old.getLastRow();
  const oldVals = old.getRange(2, 1, oldLast - 1, 11).getValues();
  const oldCols = old.getRange(2, 1, oldLast - 1, 11).getBackgrounds();
  const oldIndex = {};
  oldVals.forEach(function (r, i) { if (r[3]) oldIndex[rnorm_(r[0]) + '|' + r[3]] = i; });

  // Every new row must still be the pushed item
  const byRow = {};
  RESTORE.items.forEach(function (m) { byRow[m.row] = m; });
  let mismatchedRows = 0;
  RESTORE.ids.forEach(function (id, i) {
    if (curVals[i][3] !== id) {
      mismatchedRows++;
      if (mismatchedRows <= 5) problem('Agreement Index row ' + (i + 2) + ' holds "' + curVals[i][3] + '", expected "' + id + '".');
    }
  });
  if (mismatchedRows) {
    if (mismatchedRows > 5) problem('... ' + (mismatchedRows - 5) + ' more row(s) do not match the pushed layout.');
    return plan;
  }

  const values = [], colours = [];
  let restored = 0, already = 0, newRows = 0, kept = 0;
  for (let i = 0; i < n; i++) {
    const rowNo = i + 2, m = byRow[rowNo];
    const curFH = [curVals[i][5], curVals[i][6], curVals[i][7]];
    const curEmpty = curFH.every(function (v) { return v === '' || v === null; });

    if (!m) {                                   // new item: leave values, drop stale colour if uncoded
      newRows++;
      values.push(curFH);
      colours.push(curEmpty ? new Array(11).fill(null) : curCols[i].map(colour_));
      continue;
    }
    const oi = oldIndex[rnorm_(m.agent) + '|' + m.old_id];
    if (oi === undefined) {
      problem('row ' + rowNo + ' (' + m.new_id + '): old item ' + m.old_id + ' not found in Agreement-old.');
      values.push(curFH); colours.push(curCols[i].map(colour_)); continue;
    }
    if (rnorm_(oldVals[oi][4]) !== rnorm_(m.old_text)) {
      problem('row ' + rowNo + ' (' + m.new_id + '): Agreement-old row ' + (oi + 2) + ' (' + m.old_id +
              ') text changed since the snapshot.');
      values.push(curFH); colours.push(curCols[i].map(colour_)); continue;
    }
    const oldFH = [oldVals[oi][5], oldVals[oi][6], oldVals[oi][7]];
    if (curEmpty) { restored++; plan.toWrite++; }
    else if (curFH.every(function (v, k) { return rnorm_(v) === rnorm_(oldFH[k]); })) { already++; }
    else {
      kept++;
      report.push('  note: row ' + rowNo + ' (' + m.new_id + ') already has different F:H values; left as is.');
      values.push(curFH); colours.push(curCols[i].map(colour_)); continue;
    }
    values.push(oldFH);
    colours.push(oldCols[oi].map(colour_));
  }
  plan.values = values;
  plan.colours = colours;

  report.push('Agreement Index restore (' + n + ' items):');
  report.push('  ' + restored + ' to restore from Agreement-old, ' + already + ' already restored, ' +
              kept + ' left as typed, ' + newRows + ' new item(s) left blank for manual coding.');
  return plan;
}

// ---------------------------------------------------------------------------
// Generated from google_push.json and the Agreement-old snapshot; do not edit by hand.
const RESTORE = {
 "spreadsheet_id": "10WMkTy7Zw0rovq8NDnlKH5yIBJhKT2MtId45aMb05RM",
 "last_row": 563,
 "ids": [
  "CLAUDE-SYS-DESC-01",
  "CLAUDE-SYS-DESC-02",
  "CLAUDE-TEST-PRA-01",
  "CLAUDE-TEST-PRA-02",
  "CLAUDE-TEST-PRA-03",
  "CLAUDE-TEST-PRA-04",
  "CLAUDE-TEST-PRA-05",
  "CLAUDE-TEST-TOO-01",
  "CLAUDE-TEST-STK-01",
  "CLAUDE-TEST-OTH-01",
  "CLAUDE-CICD-PRA-01",
  "CLAUDE-CICD-TOO-01",
  "CLAUDE-CICD-STK-01",
  "CLAUDE-CICD-OTH-01",
  "CLAUDE-CODEREV-PRA-01",
  "CLAUDE-CODEREV-PRA-02",
  "CLAUDE-CODEREV-TOO-01",
  "CLAUDE-CODEREV-STK-01",
  "CLAUDE-CODEREV-STK-02",
  "CLAUDE-CODEREV-OTH-01",
  "CLAUDE-BUG-PRA-01",
  "CLAUDE-BUG-TOO-01",
  "CLAUDE-BUG-STK-01",
  "CLAUDE-BUG-OTH-01",
  "CLAUDE-SEMETH-PRA-01",
  "CLAUDE-SEMETH-PRA-02",
  "CLAUDE-SEMETH-PRA-03",
  "CLAUDE-SEMETH-TOO-01",
  "CLAUDE-SEMETH-STK-01",
  "CLAUDE-SEMETH-OTH-01",
  "CLAUDE-DEVCOM-PRA-01",
  "CLAUDE-DEVCOM-TOO-01",
  "CLAUDE-DEVCOM-TOO-02",
  "CLAUDE-DEVCOM-STK-01",
  "CLAUDE-DEVCOM-OTH-01",
  "CLAUDE-DOC-PRA-01",
  "CLAUDE-DOC-TOO-01",
  "CLAUDE-DOC-STK-01",
  "CLAUDE-DOC-OTH-01",
  "CODEX-SYS-DESC-01",
  "CODEX-SYS-DESC-02",
  "CODEX-TEST-PRA-01",
  "CODEX-TEST-PRA-02",
  "CODEX-TEST-PRA-03",
  "CODEX-TEST-PRA-04",
  "CODEX-TEST-PRA-05",
  "CODEX-TEST-PRA-06",
  "CODEX-TEST-PRA-07",
  "CODEX-TEST-PRA-08",
  "CODEX-TEST-TOO-01",
  "CODEX-TEST-STK-01",
  "CODEX-TEST-OTH-01",
  "CODEX-TEST-OTH-02",
  "CODEX-CICD-PRA-01",
  "CODEX-CICD-PRA-02",
  "CODEX-CICD-PRA-03",
  "CODEX-CICD-PRA-04",
  "CODEX-CICD-PRA-05",
  "CODEX-CICD-TOO-01",
  "CODEX-CICD-STK-01",
  "CODEX-CICD-OTH-01",
  "CODEX-CICD-OTH-02",
  "CODEX-CODEREV-PRA-01",
  "CODEX-CODEREV-PRA-02",
  "CODEX-CODEREV-PRA-03",
  "CODEX-CODEREV-PRA-04",
  "CODEX-CODEREV-PRA-05",
  "CODEX-CODEREV-TOO-01",
  "CODEX-CODEREV-STK-01",
  "CODEX-CODEREV-OTH-01",
  "CODEX-CODEREV-OTH-02",
  "CODEX-BUG-PRA-01",
  "CODEX-BUG-PRA-02",
  "CODEX-BUG-PRA-03",
  "CODEX-BUG-PRA-04",
  "CODEX-BUG-PRA-05",
  "CODEX-BUG-PRA-06",
  "CODEX-BUG-PRA-07",
  "CODEX-BUG-TOO-01",
  "CODEX-BUG-STK-01",
  "CODEX-BUG-OTH-01",
  "CODEX-BUG-OTH-02",
  "CODEX-BUG-OTH-03",
  "CODEX-SEMETH-PRA-01",
  "CODEX-SEMETH-PRA-02",
  "CODEX-SEMETH-PRA-03",
  "CODEX-SEMETH-PRA-04",
  "CODEX-SEMETH-PRA-05",
  "CODEX-SEMETH-PRA-06",
  "CODEX-SEMETH-TOO-01",
  "CODEX-SEMETH-STK-01",
  "CODEX-SEMETH-OTH-01",
  "CODEX-SEMETH-OTH-02",
  "CODEX-SEMETH-OTH-03",
  "CODEX-DEVCOM-PRA-01",
  "CODEX-DEVCOM-PRA-02",
  "CODEX-DEVCOM-PRA-03",
  "CODEX-DEVCOM-PRA-04",
  "CODEX-DEVCOM-PRA-05",
  "CODEX-DEVCOM-TOO-01",
  "CODEX-DEVCOM-STK-01",
  "CODEX-DEVCOM-OTH-01",
  "CODEX-DEVCOM-OTH-02",
  "CODEX-DEVCOM-OTH-03",
  "CODEX-DOC-PRA-01",
  "CODEX-DOC-PRA-02",
  "CODEX-DOC-PRA-03",
  "CODEX-DOC-PRA-04",
  "CODEX-DOC-PRA-05",
  "CODEX-DOC-TOO-01",
  "CODEX-DOC-STK-01",
  "CODEX-DOC-OTH-01",
  "GEMCLI-SYS-DESC-01",
  "GEMCLI-TEST-PRA-01",
  "GEMCLI-TEST-PRA-02",
  "GEMCLI-TEST-TOO-01",
  "GEMCLI-TEST-STK-01",
  "GEMCLI-CICD-PRA-01",
  "GEMCLI-CICD-PRA-02",
  "GEMCLI-CICD-PRA-03",
  "GEMCLI-CICD-TOO-01",
  "GEMCLI-CICD-STK-01",
  "GEMCLI-CODEREV-PRA-01",
  "GEMCLI-CODEREV-PRA-02",
  "GEMCLI-CODEREV-PRA-03",
  "GEMCLI-CODEREV-PRA-04",
  "GEMCLI-CODEREV-TOO-01",
  "GEMCLI-CODEREV-STK-01",
  "GEMCLI-BUG-PRA-01",
  "GEMCLI-BUG-PRA-02",
  "GEMCLI-BUG-PRA-03",
  "GEMCLI-BUG-TOO-01",
  "GEMCLI-BUG-STK-01",
  "GEMCLI-SEMETH-PRA-01",
  "GEMCLI-SEMETH-PRA-02",
  "GEMCLI-SEMETH-PRA-03",
  "GEMCLI-SEMETH-TOO-01",
  "GEMCLI-SEMETH-STK-01",
  "GEMCLI-DEVCOM-PRA-01",
  "GEMCLI-DEVCOM-STK-01",
  "GEMCLI-DOC-PRA-01",
  "GEMCLI-DOC-TOO-01",
  "GEMCLI-DOC-STK-01",
  "GEMINI-SYS-DESC-01",
  "GEMINI-TEST-PRA-01",
  "GEMINI-TEST-PRA-02",
  "GEMINI-TEST-TOO-01",
  "GEMINI-TEST-STK-01",
  "GEMINI-CICD-PRA-01",
  "GEMINI-CICD-TOO-01",
  "GEMINI-CICD-STK-01",
  "GEMINI-CODEREV-PRA-01",
  "GEMINI-CODEREV-PRA-02",
  "GEMINI-CODEREV-PRA-03",
  "GEMINI-CODEREV-PRA-04",
  "GEMINI-CODEREV-PRA-05",
  "GEMINI-CODEREV-PRA-06",
  "GEMINI-CODEREV-TOO-01",
  "GEMINI-CODEREV-STK-01",
  "GEMINI-BUG-PRA-01",
  "GEMINI-BUG-TOO-01",
  "GEMINI-BUG-STK-01",
  "GEMINI-SEMETH-PRA-01",
  "GEMINI-SEMETH-PRA-02",
  "GEMINI-SEMETH-TOO-01",
  "GEMINI-DEVCOM-PRA-01",
  "GEMINI-DEVCOM-PRA-02",
  "GEMINI-DEVCOM-PRA-03",
  "GEMINI-DEVCOM-PRA-04",
  "GEMINI-DEVCOM-TOO-01",
  "GEMINI-DEVCOM-STK-01",
  "GEMINI-DOC-PRA-01",
  "GEMINI-DOC-TOO-01",
  "GEMINI-DOC-STK-01",
  "KIMI-SYS-DESC-01",
  "KIMI-SYS-DESC-02",
  "KIMI-TEST-PRA-01",
  "KIMI-TEST-PRA-02",
  "KIMI-TEST-TOO-01",
  "KIMI-TEST-STK-01",
  "KIMI-TEST-OTH-01",
  "KIMI-CICD-PRA-01",
  "KIMI-CICD-STK-01",
  "KIMI-CICD-OTH-01",
  "KIMI-BUG-PRA-01",
  "KIMI-BUG-TOO-01",
  "KIMI-BUG-STK-01",
  "KIMI-SEMETH-PRA-01",
  "KIMI-SEMETH-STK-01",
  "KIMI-DEVCOM-PRA-01",
  "KIMI-DEVCOM-PRA-02",
  "KIMI-DEVCOM-PRA-03",
  "KIMI-DEVCOM-TOO-01",
  "KIMI-DEVCOM-STK-01",
  "KIMI-DEVCOM-OTH-01",
  "KIMI-DOC-PRA-01",
  "KIMI-DOC-TOO-01",
  "KIMI-DOC-STK-01",
  "KIMI-DOC-OTH-01",
  "OPERA-SYS-DESC-01",
  "OPERA-SYS-DESC-02",
  "OPERA-TEST-PRA-01",
  "OPERA-TEST-PRA-02",
  "OPERA-TEST-PRA-03",
  "OPERA-TEST-STK-01",
  "OPERA-TEST-OTH-01",
  "OPERA-CICD-PRA-01",
  "OPERA-CICD-PRA-02",
  "OPERA-CICD-TOO-01",
  "OPERA-CICD-STK-01",
  "OPERA-CICD-OTH-01",
  "OPERA-CODEREV-PRA-01",
  "OPERA-CODEREV-PRA-02",
  "OPERA-CODEREV-TOO-01",
  "OPERA-CODEREV-STK-01",
  "OPERA-CODEREV-OTH-01",
  "OPERA-BUG-PRA-01",
  "OPERA-BUG-PRA-02",
  "OPERA-BUG-PRA-03",
  "OPERA-BUG-TOO-01",
  "OPERA-BUG-STK-01",
  "OPERA-BUG-OTH-01",
  "OPERA-SEMETH-PRA-01",
  "OPERA-SEMETH-PRA-02",
  "OPERA-SEMETH-PRA-03",
  "OPERA-SEMETH-TOO-01",
  "OPERA-SEMETH-STK-01",
  "OPERA-SEMETH-OTH-01",
  "OPERA-DEVCOM-PRA-01",
  "OPERA-DEVCOM-TOO-01",
  "OPERA-DEVCOM-STK-01",
  "OPERA-DEVCOM-OTH-01",
  "OPERA-DOC-PRA-01",
  "OPERA-DOC-PRA-02",
  "OPERA-DOC-TOO-01",
  "OPERA-DOC-STK-01",
  "OPERA-DOC-OTH-01",
  "ALIBABA-SYS-DESC-01",
  "ALIBABA-SYS-DESC-02",
  "ALIBABA-TEST-PRA-01",
  "ALIBABA-TEST-PRA-02",
  "ALIBABA-TEST-PRA-03",
  "ALIBABA-TEST-PRA-04",
  "ALIBABA-TEST-TOO-01",
  "ALIBABA-TEST-STK-01",
  "ALIBABA-TEST-OTH-01",
  "ALIBABA-CICD-PRA-01",
  "ALIBABA-CICD-TOO-01",
  "ALIBABA-CICD-STK-01",
  "ALIBABA-CICD-OTH-01",
  "ALIBABA-CODEREV-PRA-01",
  "ALIBABA-CODEREV-TOO-01",
  "ALIBABA-CODEREV-STK-01",
  "ALIBABA-CODEREV-OTH-01",
  "ALIBABA-CODEREV-OTH-02",
  "ALIBABA-BUG-PRA-01",
  "ALIBABA-BUG-PRA-02",
  "ALIBABA-BUG-PRA-03",
  "ALIBABA-BUG-PRA-04",
  "ALIBABA-BUG-TOO-01",
  "ALIBABA-BUG-STK-01",
  "ALIBABA-BUG-OTH-01",
  "ALIBABA-SEMETH-PRA-01",
  "ALIBABA-SEMETH-TOO-01",
  "ALIBABA-SEMETH-STK-01",
  "ALIBABA-SEMETH-OTH-01",
  "ALIBABA-DEVCOM-PRA-01",
  "ALIBABA-DEVCOM-PRA-02",
  "ALIBABA-DEVCOM-TOO-01",
  "ALIBABA-DEVCOM-STK-01",
  "ALIBABA-DEVCOM-OTH-01",
  "ALIBABA-DOC-PRA-01",
  "ALIBABA-DOC-TOO-01",
  "ALIBABA-DOC-STK-01",
  "ALIBABA-DOC-OTH-01",
  "COMET-SYS-DESC-01",
  "COMET-SYS-DESC-02",
  "COMET-TEST-PRA-01",
  "COMET-TEST-PRA-02",
  "COMET-TEST-PRA-03",
  "COMET-TEST-PRA-04",
  "COMET-TEST-TOO-01",
  "COMET-TEST-STK-01",
  "COMET-TEST-OTH-01",
  "COMET-CICD-PRA-01",
  "COMET-CICD-STK-01",
  "COMET-CICD-OTH-01",
  "COMET-CODEREV-OTH-01",
  "COMET-BUG-PRA-01",
  "COMET-BUG-PRA-02",
  "COMET-BUG-TOO-01",
  "COMET-BUG-STK-01",
  "COMET-BUG-OTH-01",
  "COMET-SEMETH-PRA-01",
  "COMET-SEMETH-TOO-01",
  "COMET-SEMETH-STK-01",
  "COMET-SEMETH-OTH-01",
  "COMET-DEVCOM-PRA-01",
  "COMET-DEVCOM-TOO-01",
  "COMET-DEVCOM-STK-01",
  "COMET-DEVCOM-OTH-01",
  "COMET-DOC-PRA-01",
  "COMET-DOC-PRA-02",
  "COMET-DOC-PRA-03",
  "COMET-DOC-TOO-01",
  "COMET-DOC-STK-01",
  "COMET-DOC-OTH-01",
  "BROWSER-SYS-DESC-01",
  "BROWSER-TEST-PRA-01",
  "BROWSER-TEST-PRA-02",
  "BROWSER-TEST-PRA-03",
  "BROWSER-TEST-PRA-04",
  "BROWSER-TEST-PRA-05",
  "BROWSER-TEST-TOO-01",
  "BROWSER-TEST-STK-01",
  "BROWSER-TEST-OTH-01",
  "BROWSER-CICD-PRA-01",
  "BROWSER-CICD-PRA-02",
  "BROWSER-CICD-PRA-03",
  "BROWSER-CICD-PRA-04",
  "BROWSER-CICD-PRA-05",
  "BROWSER-CICD-PRA-06",
  "BROWSER-CICD-TOO-01",
  "BROWSER-CICD-STK-01",
  "BROWSER-CODEREV-PRA-01",
  "BROWSER-CODEREV-PRA-02",
  "BROWSER-CODEREV-TOO-01",
  "BROWSER-CODEREV-TOO-02",
  "BROWSER-CODEREV-STK-01",
  "BROWSER-CODEREV-OTH-01",
  "BROWSER-BUG-PRA-01",
  "BROWSER-BUG-PRA-02",
  "BROWSER-BUG-TOO-01",
  "BROWSER-BUG-STK-01",
  "BROWSER-BUG-OTH-01",
  "BROWSER-SEMETH-PRA-01",
  "BROWSER-SEMETH-PRA-02",
  "BROWSER-SEMETH-PRA-03",
  "BROWSER-SEMETH-PRA-04",
  "BROWSER-SEMETH-PRA-05",
  "BROWSER-SEMETH-TOO-01",
  "BROWSER-SEMETH-STK-01",
  "BROWSER-SEMETH-OTH-01",
  "BROWSER-DEVCOM-PRA-01",
  "BROWSER-DEVCOM-TOO-01",
  "BROWSER-DEVCOM-STK-01",
  "BROWSER-DEVCOM-OTH-01",
  "BROWSER-DOC-PRA-01",
  "BROWSER-DOC-TOO-01",
  "BROWSER-DOC-STK-01",
  "BROWSER-DOC-STK-02",
  "BROWSER-DOC-OTH-01",
  "GLEAN-SYS-DESC-01",
  "GLEAN-SYS-DESC-02",
  "GLEAN-SYS-DESC-03",
  "GLEAN-TEST-PRA-01",
  "GLEAN-TEST-PRA-02",
  "GLEAN-TEST-PRA-03",
  "GLEAN-TEST-PRA-04",
  "GLEAN-TEST-PRA-05",
  "GLEAN-TEST-TOO-01",
  "GLEAN-TEST-STK-01",
  "GLEAN-TEST-OTH-01",
  "GLEAN-CICD-PRA-01",
  "GLEAN-CICD-STK-01",
  "GLEAN-CICD-OTH-01",
  "GLEAN-CICD-OTH-02",
  "GLEAN-CODEREV-PRA-01",
  "GLEAN-CODEREV-TOO-01",
  "GLEAN-CODEREV-STK-01",
  "GLEAN-CODEREV-OTH-01",
  "GLEAN-BUG-PRA-01",
  "GLEAN-BUG-PRA-02",
  "GLEAN-BUG-TOO-01",
  "GLEAN-SEMETH-PRA-01",
  "GLEAN-SEMETH-STK-01",
  "GLEAN-SEMETH-OTH-01",
  "GLEAN-DEVCOM-PRA-01",
  "GLEAN-DEVCOM-PRA-02",
  "GLEAN-DEVCOM-TOO-01",
  "GLEAN-DEVCOM-STK-01",
  "GLEAN-DEVCOM-OTH-01",
  "GLEAN-DOC-PRA-01",
  "GLEAN-DOC-TOO-01",
  "GLEAN-DOC-STK-01",
  "GEMENT-SYS-DESC-01",
  "GEMENT-TEST-PRA-01",
  "GEMENT-TEST-PRA-02",
  "GEMENT-TEST-PRA-03",
  "GEMENT-TEST-PRA-04",
  "GEMENT-TEST-TOO-01",
  "GEMENT-TEST-TOO-02",
  "GEMENT-CICD-PRA-01",
  "GEMENT-CICD-PRA-02",
  "GEMENT-CICD-PRA-03",
  "GEMENT-CICD-PRA-04",
  "GEMENT-CICD-TOO-01",
  "GEMENT-CICD-STK-01",
  "GEMENT-CODEREV-PRA-01",
  "GEMENT-CODEREV-PRA-02",
  "GEMENT-CODEREV-PRA-03",
  "GEMENT-CODEREV-PRA-04",
  "GEMENT-CODEREV-STK-01",
  "GEMENT-BUG-PRA-01",
  "GEMENT-BUG-PRA-02",
  "GEMENT-SEMETH-PRA-01",
  "GEMENT-SEMETH-PRA-02",
  "GEMENT-SEMETH-PRA-03",
  "GEMENT-SEMETH-PRA-04",
  "GEMENT-SEMETH-TOO-01",
  "GEMENT-DEVCOM-PRA-01",
  "GEMENT-DEVCOM-PRA-02",
  "GEMENT-DEVCOM-PRA-03",
  "GEMENT-DOC-PRA-01",
  "GEMENT-DOC-PRA-02",
  "GEMENT-DOC-PRA-03",
  "GEMENT-DOC-TOO-01",
  "HUBSPOT-SYS-DESC-01",
  "HUBSPOT-SYS-DESC-02",
  "HUBSPOT-TEST-PRA-01",
  "HUBSPOT-TEST-PRA-02",
  "HUBSPOT-TEST-PRA-03",
  "HUBSPOT-TEST-PRA-04",
  "HUBSPOT-TEST-TOO-01",
  "HUBSPOT-TEST-STK-01",
  "HUBSPOT-TEST-OTH-01",
  "HUBSPOT-TEST-OTH-02",
  "HUBSPOT-CICD-PRA-01",
  "HUBSPOT-CICD-PRA-02",
  "HUBSPOT-CICD-PRA-03",
  "HUBSPOT-CICD-PRA-04",
  "HUBSPOT-CICD-TOO-01",
  "HUBSPOT-CICD-STK-01",
  "HUBSPOT-CICD-OTH-01",
  "HUBSPOT-CODEREV-PRA-01",
  "HUBSPOT-CODEREV-PRA-02",
  "HUBSPOT-CODEREV-PRA-03",
  "HUBSPOT-CODEREV-PRA-04",
  "HUBSPOT-CODEREV-TOO-01",
  "HUBSPOT-CODEREV-STK-01",
  "HUBSPOT-CODEREV-OTH-01",
  "HUBSPOT-BUG-PRA-01",
  "HUBSPOT-BUG-PRA-02",
  "HUBSPOT-BUG-TOO-01",
  "HUBSPOT-BUG-STK-01",
  "HUBSPOT-BUG-OTH-01",
  "HUBSPOT-SEMETH-PRA-01",
  "HUBSPOT-SEMETH-PRA-02",
  "HUBSPOT-SEMETH-PRA-03",
  "HUBSPOT-SEMETH-PRA-04",
  "HUBSPOT-SEMETH-TOO-01",
  "HUBSPOT-SEMETH-STK-01",
  "HUBSPOT-SEMETH-OTH-01",
  "HUBSPOT-DEVCOM-PRA-01",
  "HUBSPOT-DEVCOM-PRA-02",
  "HUBSPOT-DEVCOM-TOO-01",
  "HUBSPOT-DEVCOM-STK-01",
  "HUBSPOT-DEVCOM-OTH-01",
  "HUBSPOT-DOC-PRA-01",
  "HUBSPOT-DOC-STK-01",
  "HUBSPOT-DOC-OTH-01",
  "WATSONX-SYS-DESC-01",
  "WATSONX-SYS-DESC-02",
  "WATSONX-TEST-PRA-01",
  "WATSONX-TEST-PRA-02",
  "WATSONX-TEST-PRA-03",
  "WATSONX-TEST-PRA-04",
  "WATSONX-TEST-PRA-05",
  "WATSONX-TEST-TOO-01",
  "WATSONX-TEST-STK-01",
  "WATSONX-TEST-OTH-01",
  "WATSONX-CICD-PRA-01",
  "WATSONX-CICD-TOO-01",
  "WATSONX-CICD-STK-01",
  "WATSONX-CICD-OTH-01",
  "WATSONX-CODEREV-PRA-01",
  "WATSONX-CODEREV-PRA-02",
  "WATSONX-CODEREV-TOO-01",
  "WATSONX-CODEREV-STK-01",
  "WATSONX-CODEREV-OTH-01",
  "WATSONX-BUG-PRA-01",
  "WATSONX-BUG-PRA-02",
  "WATSONX-BUG-PRA-03",
  "WATSONX-BUG-TOO-01",
  "WATSONX-BUG-STK-01",
  "WATSONX-SEMETH-PRA-01",
  "WATSONX-SEMETH-PRA-02",
  "WATSONX-SEMETH-PRA-03",
  "WATSONX-SEMETH-TOO-01",
  "WATSONX-SEMETH-STK-01",
  "WATSONX-DEVCOM-PRA-01",
  "WATSONX-DEVCOM-TOO-01",
  "WATSONX-DEVCOM-STK-01",
  "WATSONX-DEVCOM-OTH-01",
  "WATSONX-DOC-PRA-01",
  "WATSONX-DOC-TOO-01",
  "WATSONX-DOC-STK-01",
  "WATSONX-DOC-OTH-01",
  "N8N-SYS-DESC-01",
  "N8N-SYS-DESC-02",
  "N8N-TEST-PRA-01",
  "N8N-TEST-PRA-02",
  "N8N-TEST-PRA-03",
  "N8N-TEST-PRA-04",
  "N8N-TEST-PRA-05",
  "N8N-TEST-PRA-06",
  "N8N-TEST-PRA-07",
  "N8N-TEST-TOO-01",
  "N8N-TEST-STK-01",
  "N8N-TEST-OTH-01",
  "N8N-CICD-PRA-01",
  "N8N-CICD-PRA-02",
  "N8N-CICD-PRA-03",
  "N8N-CICD-PRA-04",
  "N8N-CICD-PRA-05",
  "N8N-CICD-PRA-06",
  "N8N-CICD-TOO-01",
  "N8N-CICD-STK-01",
  "N8N-CICD-OTH-01",
  "N8N-CICD-OTH-02",
  "N8N-CODEREV-PRA-01",
  "N8N-CODEREV-PRA-02",
  "N8N-CODEREV-PRA-03",
  "N8N-CODEREV-PRA-04",
  "N8N-CODEREV-PRA-05",
  "N8N-CODEREV-PRA-06",
  "N8N-CODEREV-TOO-01",
  "N8N-CODEREV-STK-01",
  "N8N-CODEREV-OTH-01",
  "N8N-CODEREV-OTH-02",
  "N8N-BUG-PRA-01",
  "N8N-BUG-PRA-02",
  "N8N-BUG-PRA-03",
  "N8N-BUG-TOO-01",
  "N8N-BUG-STK-01",
  "N8N-BUG-OTH-01",
  "N8N-SEMETH-PRA-01",
  "N8N-SEMETH-PRA-02",
  "N8N-SEMETH-PRA-03",
  "N8N-SEMETH-PRA-04",
  "N8N-SEMETH-TOO-01",
  "N8N-SEMETH-STK-01",
  "N8N-SEMETH-OTH-01",
  "N8N-DEVCOM-PRA-01",
  "N8N-DEVCOM-PRA-02",
  "N8N-DEVCOM-PRA-03",
  "N8N-DEVCOM-PRA-04",
  "N8N-DEVCOM-PRA-05",
  "N8N-DEVCOM-TOO-01",
  "N8N-DEVCOM-STK-01",
  "N8N-DEVCOM-OTH-01",
  "N8N-DEVCOM-OTH-02",
  "N8N-DEVCOM-OTH-03",
  "N8N-DOC-PRA-01",
  "N8N-DOC-PRA-02",
  "N8N-DOC-PRA-03",
  "N8N-DOC-PRA-04",
  "N8N-DOC-PRA-05",
  "N8N-DOC-TOO-01",
  "N8N-DOC-STK-01",
  "N8N-DOC-OTH-01",
  "N8N-DOC-OTH-02"
 ],
 "items": [
  {
   "row": 2,
   "new_id": "CLAUDE-SYS-DESC-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SYS-DESC-01",
   "old_text": "Claude Code is an agentic coding CLI tool built by Anthropic that lives in the terminal, understands a full codebase, and autonomously executes tasks, including reading files and running commands, via natural language. It was created by Boris Cherny in September 2024 as a solo prototype and grew to a full product team by 2025, reaching GA with version 1.0.0 in May 2025. It is distributed as an npm package and also integrates with VS Code, JetBrains, a Desktop app, a web browser, and GitHub Actions."
  },
  {
   "row": 3,
   "new_id": "CLAUDE-SYS-DESC-02",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SYS-DESC-02",
   "old_text": "Loc and programming language: 512,000 lines of TypeScript\n  stars: 124,000\n  Contributors: 51\n  Update Frequency: Claude Code ships approximately one external release per day, with roughly 60-100 internal (npm) releases pushed daily. Engineers averaged five pull requests per day during the summer of 2025. [q-1]"
  },
  {
   "row": 4,
   "new_id": "CLAUDE-TEST-PRA-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-PRA-01",
   "old_text": "Anthropic uses a multi-layered eval strategy for Claude Code combining automated unit/end-to-end tests, model-based classifiers, dogfooding ('antfooding'), and A/B testing in production. [q-2]"
  },
  {
   "row": 5,
   "new_id": "CLAUDE-TEST-PRA-02",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-PRA-02",
   "old_text": "An evaluation (“eval”) is a test for an AI system: give an AI an input, then apply grading logic to its output to measure success."
  },
  {
   "row": 6,
   "new_id": "CLAUDE-TEST-PRA-03",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-PRA-03",
   "old_text": "The anthropic team adopts 2 types of evals - a) single-turn evaluations and b) Multi-turn evaluations. \n  In a simple eval, an agent processes a prompt, and a grader checks if the output matches expectations. For a more complex multi-turn eval, a coding agent receives tools, a task, and an environment, executes an \"agent loop\" (tool calls and reasoning), and updates the environment with the implementation. Grading then uses unit tests to verify the working MCP server."
  },
  {
   "row": 7,
   "new_id": "CLAUDE-TEST-PRA-04",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-PRA-04",
   "old_text": "An evaluation suite is a collection of tasks designed to measure specific capabilities or behaviors. Tasks in a suite typically share a broad goal. [q-3]"
  },
  {
   "row": 8,
   "new_id": "CLAUDE-TEST-PRA-05",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-PRA-05",
   "old_text": "Anthropic's internal 'antfooding' practice—where Anthropic engineers ('ants') use Claude Code in daily work—serves as a continuous dogfooding loop. [q-4]"
  },
  {
   "row": 9,
   "new_id": "CLAUDE-TEST-TOO-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-TOO-01",
   "old_text": "The Claude Code GitHub Actions integration (anthropics/claude-code-action@v1) enables CI-level automated code review, test generation, and issue triage [q-6] [q-7]"
  },
  {
   "row": 10,
   "new_id": "CLAUDE-TEST-STK-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-STK-01",
   "old_text": "Anthropic's product engineering team, data science team, and security engineering team. [q-8]"
  },
  {
   "row": 11,
   "new_id": "CLAUDE-TEST-OTH-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-TEST-OTH-01",
   "old_text": "A quality regression in April 2026 was diagnosed using Claude's own Code Review tool with Opus 4.7 reviewing the buggy pull requests—'the Code Review tool with Opus 4.7 found the bug, while Opus 4.6 didn't.' This demonstrates using newer model versions to catch issues in code changes. [q-9]"
  },
  {
   "row": 12,
   "new_id": "CLAUDE-CICD-PRA-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CICD-PRA-01",
   "old_text": "Claude Code ships approximately one public release per day, with 60-100 internal npm package releases daily. [q-63]"
  },
  {
   "row": 13,
   "new_id": "CLAUDE-CICD-TOO-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CICD-TOO-01",
   "old_text": "The build uses Bun as the bundler, producing a single self-contained cli.js file with zero external dependencies [q-67] [q-68]"
  },
  {
   "row": 14,
   "new_id": "CLAUDE-CICD-STK-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CICD-STK-01",
   "old_text": "Deployment stakeholders include: Anthropic's product engineering team (release pipeline), infrastructure/DevOps for enterprise managed settings, and package ecosystem maintainers (Homebrew, WinGet). Cat Wu serves as founding product manager overseeing release coordination. [q-69]"
  },
  {
   "row": 15,
   "new_id": "CLAUDE-CICD-OTH-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CICD-OTH-01",
   "old_text": "The 32 build-time feature flags and 26 hidden slash commands in the codebase enable staged rollouts and controlled exposure of experimental features. Environment variables such as DISABLE_COMMAND_INJECTION_CHECK (labeled DANGEROUS) and CLAUDE_CODE_ABLATION_BASELINE (disables all safety features) provide engineering escape hatches for testing. [q-70]"
  },
  {
   "row": 16,
   "new_id": "CLAUDE-CODEREV-PRA-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CODEREV-PRA-01",
   "old_text": "Boris Cherny (CEO of Anthropic) systematized code review feedback early in his career: he tracked recurring review comments in a spreadsheet and converted patterns reaching 3-4 occurrences into automated lint rules. This practice of automating repeatable review criteria is now applied to Claude Code's own development."
  },
  {
   "row": 17,
   "new_id": "CLAUDE-CODEREV-PRA-02",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CODEREV-PRA-02",
   "old_text": "At Anthropic, Claude Code performs initial pull request reviews via a /code-review command. Humans approve final merges. They run multiple specialized subagents in parallel during review: one checks style guidelines, another examines project history, another flags obvious bugs. This Writer/Reviewer parallel-agent pattern is also documented in official best practices. [q-71] [q-72] [q-73]"
  },
  {
   "row": 18,
   "new_id": "CLAUDE-CODEREV-TOO-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CODEREV-TOO-01",
   "old_text": "GitHub's code review interface, the /code-review slash command within Claude Code, the claude-code-action GitHub Action for automated PR reviews, and the internal Code Review tool (built on Claude Opus 4.7) used for diagnostic code review of regressions. [q-74]"
  },
  {
   "row": 19,
   "new_id": "CLAUDE-CODEREV-STK-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CODEREV-STK-01",
   "old_text": "Code review stakeholders include engineers submitting PRs, Claude Code (automated first-pass review), and human approvers for final merge decisions."
  },
  {
   "row": 20,
   "new_id": "CLAUDE-CODEREV-STK-02",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CODEREV-STK-02",
   "old_text": "The team ships PRDs by prototype, not document: 'PRDs are dead on the Claude Code team: prototypes replaced them.' Boris builds 5-10+ functional prototypes daily using parallel Claude agents, iterating rapidly based on feedback rather than writing specifications first."
  },
  {
   "row": 21,
   "new_id": "CLAUDE-CODEREV-OTH-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-CODEREV-OTH-01",
   "old_text": "The team ships PRDs by prototype, not document: 'PRDs are dead on the Claude Code team: prototypes replaced them.' Boris builds 5-10+ functional prototypes daily using parallel Claude agents, iterating rapidly based on feedback rather than writing specifications first. [q-76]"
  },
  {
   "row": 22,
   "new_id": "CLAUDE-BUG-PRA-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-BUG-PRA-01",
   "old_text": "Anthropic uses GitHub Issues as the primary bug tracker for Claude Code, with a stale-issue-manager automation that closes issues inactive for 60 days. [q-77]"
  },
  {
   "row": 23,
   "new_id": "CLAUDE-BUG-TOO-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-BUG-TOO-01",
   "old_text": "GitHub Issues for formal bug tracking. Claude Developers Discord for peer support. [q-79]"
  },
  {
   "row": 24,
   "new_id": "CLAUDE-BUG-STK-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-BUG-STK-01",
   "old_text": "Bug resolution stakeholders include the Claude Code product engineering team, Anthropic's security engineering team, the data infrastructure team (for infrastructure incidents), and the broader developer community filing issues on GitHub. [q-80]"
  },
  {
   "row": 25,
   "new_id": "CLAUDE-BUG-OTH-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-BUG-OTH-01",
   "old_text": "An April 2026 postmortem publicly documented three overlapping quality regressions (reasoning effort default change, thinking cache bug, verbosity prompt) that degraded output quality. Anthropic committed to ensuring 'a larger share of internal staff use the exact public build of Claude Code' to prevent configuration drift between internal and public versions masking bugs. [q-81]"
  },
  {
   "row": 26,
   "new_id": "CLAUDE-SEMETH-PRA-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SEMETH-PRA-01",
   "old_text": "The Claude Code team uses prototype-driven development rather than traditional PRDs. Boris Cherny builds 5-10+ functional prototypes per day using parallel Claude agents, iterating based on direct feedback. The tool itself was validated by giving engineers access to the filesystem and observing rapid organic adoption (20% day one, 50% by day five) as the product specification. [q-82]"
  },
  {
   "row": 27,
   "new_id": "CLAUDE-SEMETH-PRA-02",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SEMETH-PRA-02",
   "old_text": "Anthropic uses a flat organizational structure with the uniform title 'Member of Technical Staff' (MTS) for all engineers. This eliminates role-based hierarchies and establishes the expectation that everyone contributes across product, design, infrastructure, and research domains. [q-83]"
  },
  {
   "row": 28,
   "new_id": "CLAUDE-SEMETH-PRA-03",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SEMETH-PRA-03",
   "old_text": "The team is working at rapid pace, with around 5 releases per engineer each day. Prototyping is done surprisingly quickly. [q-84]"
  },
  {
   "row": 29,
   "new_id": "CLAUDE-SEMETH-TOO-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SEMETH-TOO-01",
   "old_text": "Development tools: Bun (build), TypeScript (language), React+Ink (terminal UI), Yoga (layout), git (version control), npm (distribution), GitHub (repository/issue tracking), VS Code, and Claude Code itself for ~90% of code written on the project. [q-86] [q-87]"
  },
  {
   "row": 30,
   "new_id": "CLAUDE-SEMETH-STK-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SEMETH-STK-01",
   "old_text": "Anthropic engineering leadership [q-88]"
  },
  {
   "row": 31,
   "new_id": "CLAUDE-SEMETH-OTH-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-SEMETH-OTH-01",
   "old_text": "Migration discipline is a core engineering principle: 'always make sure that when you start a migration, you finish the migration.' Partial migrations confuse both humans and AI models, leading to inconsistent code states. Engineers spend over $1,000 monthly on AI-assisted code migrations, using parallel subagents to execute large-scale refactors. [q-89]"
  },
  {
   "row": 32,
   "new_id": "CLAUDE-DEVCOM-PRA-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DEVCOM-PRA-01",
   "old_text": "Claude has become 'the first stop for questions that once went to colleagues.' {quote 1} [q-36] [q-37] [q-38]"
  },
  {
   "row": 33,
   "new_id": "CLAUDE-DEVCOM-TOO-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DEVCOM-TOO-01",
   "old_text": "External community communication is managed through Claude Developers Discord and GitHub Issues. The Claude Code GitHub page has over 5,000 open issues."
  },
  {
   "row": 34,
   "new_id": "CLAUDE-DEVCOM-TOO-02",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DEVCOM-TOO-02",
   "old_text": "Slack (internal, inferred from feedback channel references), GitHub Issues (external bug tracker), Claude Developers Discord (community support), and the /bug in-product command for direct issue reporting [q-39]"
  },
  {
   "row": 35,
   "new_id": "CLAUDE-DEVCOM-STK-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DEVCOM-STK-01",
   "old_text": "Communication stakeholders include: the core Claude Code team (10+ engineers), the broader Anthropic engineering organization (antfooding users), external developer community on Discord and GitHub, enterprise customers, and partner integrators (VS Code marketplace, JetBrains Marketplace). [q-90]"
  },
  {
   "row": 36,
   "new_id": "CLAUDE-DEVCOM-OTH-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DEVCOM-OTH-01",
   "old_text": "Parallel agent architecture changes how engineers communicate work: Boris Cherny runs 5 instances of Claude Code simultaneously in terminal tabs with separate git checkouts, using system notifications to know when any Claude needs input. This shifts the communication model from deep serial focus to rapid context-switching across multiple parallel workstreams. [q-91]"
  },
  {
   "row": 37,
   "new_id": "CLAUDE-DOC-PRA-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DOC-PRA-01",
   "old_text": "Claude Code uses CLAUDE.md as its primary persistent documentation layer. \n  Anthropic recommends keeping CLAUDE.md short [q-40] [q-41] [q-42] [q-43]"
  },
  {
   "row": 38,
   "new_id": "CLAUDE-DOC-TOO-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DOC-TOO-01",
   "old_text": "CLAUDE.md files [q-44]"
  },
  {
   "row": 39,
   "new_id": "CLAUDE-DOC-STK-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DOC-STK-01",
   "old_text": "individual engineers (CLAUDE.local.md personal notes), project teams (shared CLAUDE.md), IT/DevOps administrators (managed policy CLAUDE.md), and Anthropic's technical writing team [q-45]"
  },
  {
   "row": 40,
   "new_id": "CLAUDE-DOC-OTH-01",
   "agent": "Anthropic Claude Code",
   "old_id": "CLAUDE-DOC-OTH-01",
   "old_text": "Block-level HTML comments in CLAUDE.md files are stripped before injection into context, enabling maintainer notes that consume no context tokens. LLM-oriented code comments are written throughout the codebase 'for AI agents working on the codebase rather than human readers,' representing a shift in documentation audience. [q-46]"
  },
  {
   "row": 114,
   "new_id": "GEMCLI-SYS-DESC-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-SYS-DESC-01",
   "old_text": "Google Gemini CLI is an open-source, terminal-based AI coding agent\n  250k+ loc\n  98% typescript\n  1000+ contributors\n  stars: 102k+ \n  high update frequency - 10 releases in 14 days (April 12–25, 2026) [q-69]"
  },
  {
   "row": 115,
   "new_id": "GEMCLI-TEST-PRA-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-TEST-PRA-01",
   "old_text": "Gemini CLI engineers run a layered test suite with Vitest for unit tests\n  and integration tests run on Docker/Podman sandboxes to check the functionality with the file system. [q-1] \n  Styling and Lints (Static Analysis tool)"
  },
  {
   "row": 116,
   "new_id": "GEMCLI-TEST-PRA-02",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-TEST-PRA-02",
   "old_text": "In integration testing, run 5 times with the deflake script to confirm the implementation is not flaky. [q-4]\n  Memory regression tests detect heap growth and leaks by comparing against committed baselines with a 10% tolerance; performance regression tests measure wall-clock time, CPU usage, and event loop delay with a 15% tolerance. Both suites run nightly in CI but are excluded from the default preflight check. [q-56]\n  source: contributors.md"
  },
  {
   "row": 117,
   "new_id": "GEMCLI-TEST-TOO-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-TEST-TOO-02",
   "old_text": "Testing: Vitest. Linting/Formatting: ESLint, Prettier [q-7]"
  },
  {
   "row": 118,
   "new_id": "GEMCLI-TEST-STK-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-TEST-STK-01",
   "old_text": "Core Gemini CLI maintainers, contributors at Google [q-7]"
  },
  {
   "row": 119,
   "new_id": "GEMCLI-CICD-PRA-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CICD-PRA-01",
   "old_text": "GitHub Actions pipeline by the gemini-cli-robot bot. \n  Generic CI/CD pipelines by GitHub Actions. \n  maintainers approve cherry-picks for release branches [q-59]"
  },
  {
   "row": 120,
   "new_id": "GEMCLI-CICD-PRA-02",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CICD-PRA-02",
   "old_text": "A daily schedule handles nightly releases; official patch/minor releases are triggered manually [q-59]"
  },
  {
   "row": 121,
   "new_id": "GEMCLI-CICD-PRA-03",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CICD-PRA-03",
   "old_text": "The CI workflow runs on every push to a pull request and performs linting, the full suite of automated tests across macOS, Windows, and Linux on multiple Node.js versions [q-60]"
  },
  {
   "row": 122,
   "new_id": "GEMCLI-CICD-TOO-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CICD-TOO-01",
   "old_text": "Github actions, gemini-cli-robot [q-62]"
  },
  {
   "row": 123,
   "new_id": "GEMCLI-CICD-STK-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CICD-STK-01",
   "old_text": "open source contributors, internal engineers [q-63]"
  },
  {
   "row": 124,
   "new_id": "GEMCLI-CODEREV-PRA-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CODEREV-PRA-01",
   "old_text": "Contributors submit small, atomic PRs that address single issues following Google's small CL philosophy."
  },
  {
   "row": 125,
   "new_id": "GEMCLI-CODEREV-PRA-02",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CODEREV-PRA-02",
   "old_text": "Provides an automated code review tool for finding anti-patterns, testing issues, and best practices. [q-66]\n  Contributions require signing a Contributor License Agreement (CLA). (contributors.md)"
  },
  {
   "row": 126,
   "new_id": "GEMCLI-CODEREV-PRA-03",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CODEREV-PRA-03",
   "old_text": "Reviewers should approve changes that improve the system's overall code health."
  },
  {
   "row": 127,
   "new_id": "GEMCLI-CODEREV-PRA-04",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CODEREV-PRA-04",
   "old_text": "Code reviews target one business day maximum response time to maintain development velocity [q-70]"
  },
  {
   "row": 128,
   "new_id": "GEMCLI-CODEREV-TOO-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CODEREV-TOO-02",
   "old_text": "scripts/review.sh (AI-assisted review using Gemini)\n you can run the tool directly from the CLI prompt: /review-frontend <PR_NUMBER> [q-20]"
  },
  {
   "row": 129,
   "new_id": "GEMCLI-CODEREV-STK-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-CODEREV-STK-01",
   "old_text": "Google-Gemini maintainers as code owners, open source contributors [q-72]"
  },
  {
   "row": 130,
   "new_id": "GEMCLI-BUG-PRA-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-BUG-PRA-01",
   "old_text": "From the 10 issues analyzed, common engineering pitfalls include: (1) platform-specific regressions, (2) model fallback and quota handling failures, (3) parsing vulnerabilities with edge-case inputs (large text paste, code logs), (4) background process lifecycle management\n  The team uses bot-driven triage with /assign and /unassign commands allowing contributors to self-assign up to 3 issues concurrently. [q-75]"
  },
  {
   "row": 131,
   "new_id": "GEMCLI-BUG-PRA-02",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-BUG-PRA-02",
   "old_text": "External contributors who are assigned a 'help wanted' issue but have not opened a linked pull request within 7 days are automatically unassigned [q-76]"
  },
  {
   "row": 132,
   "new_id": "GEMCLI-BUG-PRA-03",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-BUG-PRA-03",
   "old_text": "Github issues as a roadmap. Issues are organized to provide key information at a glance: Target Quarter, Feature Area, Issue Type,_Workstream_ => _Epics_ => _Features_ => _Tasks Bugs"
  },
  {
   "row": 133,
   "new_id": "GEMCLI-BUG-TOO-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-BUG-TOO-01",
   "old_text": "GitHub issues, automated trage bot by Gemini [q-79]"
  },
  {
   "row": 134,
   "new_id": "GEMCLI-BUG-STK-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-BUG-STK-01",
   "old_text": "Gemini-team maintainer [q-80]"
  },
  {
   "row": 135,
   "new_id": "GEMCLI-SEMETH-PRA-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-SEMETH-PRA-01",
   "old_text": "Trunk-based development following Google's philosophy of 'one repository, no dev branches' [q-82]"
  },
  {
   "row": 136,
   "new_id": "GEMCLI-SEMETH-PRA-02",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-SEMETH-PRA-02",
   "old_text": "The project uses a monorepo structure via npm workspaces [q-84]"
  },
  {
   "row": 137,
   "new_id": "GEMCLI-SEMETH-PRA-03",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-SEMETH-PRA-03",
   "old_text": "Four guiding principles published in ROADMAP.md\n  1. Power and Simplicity \n  2. Extensibility\n  3. Intelligent\n  4. Free and Open source"
  },
  {
   "row": 138,
   "new_id": "GEMCLI-SEMETH-TOO-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-SEMETH-TOO-01",
   "old_text": "npm workspaces monorepo; semantic versioning with preview tags; conventional commit prefixes (fix, feat, chore); ESLint-enforced cross-package import restrictions; Apache-2.0 license header enforcement by ESLint. [q-88]"
  },
  {
   "row": 139,
   "new_id": "GEMCLI-SEMETH-STK-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-SEMETH-STK-01",
   "old_text": "Open source contributors [q-89]"
  },
  {
   "row": 140,
   "new_id": "GEMCLI-DEVCOM-PRA-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-DEVCOM-PRA-01",
   "old_text": "Contributors self-assign issues using /assign and /unassign commands.\n  Specific platform names not found like slack, discord. [q-37] [q-38] [q-39] [q-40] [q-41]"
  },
  {
   "row": 141,
   "new_id": "GEMCLI-DEVCOM-STK-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-DEVCOM-STK-01",
   "old_text": "Core Google team, external maintainers, community contributors, and automated bots (gemini-cli-robot, triage bot, PR audit bot). [q-91]"
  },
  {
   "row": 142,
   "new_id": "GEMCLI-DOC-PRA-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-DOC-PRA-02",
   "old_text": "Contributors must also update the relevant documentation in the /docs directory when a PR introduces a new command. \n  Documentation follows the Google Developer Documentation Style Guide [q-93]"
  },
  {
   "row": 143,
   "new_id": "GEMCLI-DOC-TOO-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-DOC-TOO-01",
   "old_text": "Markdown docs in-repo under /docs; official documentation site at geminicli.com; GEMINI.md for AI-agent context; release notes auto-generated and attached to each GitHub Release tag; Prettier for markdown formatting enforced by preflight. [q-47]"
  },
  {
   "row": 144,
   "new_id": "GEMCLI-DOC-STK-01",
   "agent": "Gemini CLI",
   "old_id": "GEMCLI-DOC-STK-01",
   "old_text": "Google DevRel and the Gemini CLI engineering team, plus community PR authors who must update docs alongside any code changes they submit. [q-48]"
  },
  {
   "row": 145,
   "new_id": "GEMINI-SYS-DESC-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-SYS-DESC-01",
   "old_text": "Google Gemini is a family of closed-source multimodal large language models (LLMs) developed by Google DeepMind, powering the Gemini conversational AI chatbot accessible at gemini.google.com. It processes text, images, audio, video, and code, and serves as the foundation model across Google AI products and APIs. Deployed via Vertex AI, Gemini API, and Google AI Studio. [q-31]"
  },
  {
   "row": 146,
   "new_id": "GEMINI-TEST-PRA-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-TEST-PRA-01",
   "old_text": "Google DeepMind evaluates Gemini with a multi-stage benchmark and red-team pipeline: pre-training capability evals (MMLU, HumanEval), post-training safety/responsibility evals, and dogfooding inside Google products. Each Gemini release is accompanied by a model card and a tech report listing eval suites and scores. [q-18]"
  },
  {
   "row": 147,
   "new_id": "GEMINI-TEST-PRA-02",
   "agent": "Google Gemini",
   "old_id": "GEMINI-TEST-PRA-02",
   "old_text": "Model impact assessments are conducted by the Google DeepMind Responsible Development and Innovation team, and are reviewed by the Google DeepMind Responsibility and Safety Council. {Quote 1, Summary 1}"
  },
  {
   "row": 148,
   "new_id": "GEMINI-TEST-TOO-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-TEST-TOO-01",
   "old_text": "Internal Google evaluation infrastructure; public benchmarks (MMLU, HumanEval, BIG-Bench-Hard, MATH); Vertex AI Evaluation Service for downstream agent eval; golden datasets curated per product surface. [q-2]"
  },
  {
   "row": 149,
   "new_id": "GEMINI-TEST-STK-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-TEST-STK-01",
   "old_text": "Google DeepMind research engineers, the Gemini model team, Google DeepMind Responsibility & Safety Council, Google Cloud Vertex AI team. [q-3]"
  },
  {
   "row": 150,
   "new_id": "GEMINI-CICD-PRA-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CICD-PRA-01",
   "old_text": "Gemini models are trained on TPUs using JAX and the Pathways system, then deployed via Vertex AI and the Gemini API with progressive rollouts. Model versions are tagged (e.g., gemini-2.5-pro-001, -002, -latest) and deprecated through documented lifecycles on the Google Cloud release notes page. [q-34]"
  },
  {
   "row": 151,
   "new_id": "GEMINI-CICD-TOO-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CICD-TOO-01",
   "old_text": "TPU accelerators (v4/v5p/v6 Trillium), JAX, Pathways training system, Vertex AI Model Garden, Gemini API endpoints, A/B traffic splitters, Google Cloud release notes for version lifecycle tracking. [q-35]"
  },
  {
   "row": 152,
   "new_id": "GEMINI-CICD-STK-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CICD-STK-01",
   "old_text": "DeepMind training infrastructure team, Google Cloud Vertex AI release engineers, the Gemini API product team. [q-36]"
  },
  {
   "row": 153,
   "new_id": "GEMINI-CODEREV-PRA-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-PRA-01",
   "old_text": "Internal to Google: Gemini engineers use Google's monorepo (google3) with mandatory pre-submit code review (Critique), readability certifications per language, and OWNERS files. No public PR review surface exists for the model itself. [q-38]"
  },
  {
   "row": 154,
   "new_id": "GEMINI-CODEREV-PRA-02",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-PRA-02",
   "old_text": "Small CL Philosophy: Typical CL size is ~100 lines (1,000+ is too large). Each CL addresses one self-contained change, includes related tests, and can be independently reviewed. Refactorings must be separated from feature/bug-fix CLs. [q-39]"
  },
  {
   "row": 155,
   "new_id": "GEMINI-CODEREV-PRA-03",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-PRA-03",
   "old_text": "Review Speed Targets: Reviewers must respond within one business day. LGTM-with-comments used for minor issues to avoid timezone delays. A typical CL should get multiple review rounds within a single day. [q-40]"
  },
  {
   "row": 156,
   "new_id": "GEMINI-CODEREV-PRA-04",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-PRA-04",
   "old_text": "Review Focus Areas: Reviewers evaluate 8 dimensions — Design, Functionality, Complexity, Tests, Naming, Comments, Style, Documentation. [q-41]"
  },
  {
   "row": 157,
   "new_id": "GEMINI-CODEREV-PRA-05",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-PRA-05",
   "old_text": "Progressive Improvement Standard: Approve if the CL improves overall code health, not only if perfect. 'Nit:' prefix marks non-blocking polish suggestions. [q-42]"
  },
  {
   "row": 158,
   "new_id": "GEMINI-CODEREV-PRA-06",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-PRA-06",
   "old_text": "Mentoring Through Code Review: Reviewers leave educational 'Nit:' comments to help developers learn new language features, frameworks, or design principles — sharing knowledge is part of improving code health over time. [q-43]"
  },
  {
   "row": 159,
   "new_id": "GEMINI-CODEREV-TOO-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-TOO-01",
   "old_text": "Critique (Google internal code review tool), google3 monorepo, OWNERS files, language readability reviewers, presubmit triggers via TAP (Test Automation Platform). [q-44]"
  },
  {
   "row": 160,
   "new_id": "GEMINI-CODEREV-STK-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-CODEREV-STK-01",
   "old_text": "DeepMind and Google research engineers, language readability reviewers, ML infrastructure SREs. [q-45]"
  },
  {
   "row": 161,
   "new_id": "GEMINI-BUG-PRA-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-BUG-PRA-02",
   "old_text": "Practice: Bug resolution follows a triage workflow routing issues to SDK maintainers (client libs), Vertex AI support (quota/infra), or DeepMind (model behavior). Persistent bugs require cross-team coordination. [q-47]"
  },
  {
   "row": 162,
   "new_id": "GEMINI-BUG-TOO-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-BUG-TOO-01",
   "old_text": "Google Issue Tracker (issuetracker.google.com, component 1166207), GitHub Issues on google-gemini/* and googleapis/python-genai, Google Cloud Status Dashboard for incidents, Google Cloud support cases. [q-49]"
  },
  {
   "row": 163,
   "new_id": "GEMINI-BUG-STK-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-BUG-STK-01",
   "old_text": "Vertex AI / Gemini API support engineers, DeepMind on-call rotation, googleapis SDK maintainers (python-genai repo). [q-50]"
  },
  {
   "row": 164,
   "new_id": "GEMINI-SEMETH-PRA-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-SEMETH-PRA-01",
   "old_text": "Google engineering teams use structured weekly production meetings (30-60 min) to coordinate service development. Agenda items: upcoming production changes, metrics review, outage post-mortems, paging events analysis, nonpaging events, and prior action items follow-up. [q-52]"
  },
  {
   "row": 165,
   "new_id": "GEMINI-SEMETH-PRA-02",
   "agent": "Google Gemini",
   "old_id": "GEMINI-SEMETH-PRA-02",
   "old_text": "Google engineering follows defined role structures: tech lead (TL) for technical direction and consensus-building, SRE manager (SRM) for performance management, and project manager (PM/TPM/PgM) for cross-functional coordination and deliverable tracking. [q-53]"
  },
  {
   "row": 166,
   "new_id": "GEMINI-SEMETH-TOO-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-SEMETH-TOO-01",
   "old_text": "google3 monorepo for code and documentation management (g3doc directories, Code Search integration); Markdown for documentation formatting; Google Docs for collaborative design documents requiring real-time multi-author editing. [q-54]"
  },
  {
   "row": 167,
   "new_id": "GEMINI-DEVCOM-PRA-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DEVCOM-PRA-01",
   "old_text": "Google engineering teams use topic-driven group chats that are typically open access, allowing anyone to drop in and ask questions. Chats enable synchronous collaboration for quick problem-solving and informal technical discussions. [q-22]"
  },
  {
   "row": 168,
   "new_id": "GEMINI-DEVCOM-PRA-02",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DEVCOM-PRA-02",
   "old_text": "Google engineers extensively use mailing lists (topic-users@, topic-discuss@ Google Groups) for asynchronous technical discussions and decision-making. Any engineer can join or email these lists. [q-23]"
  },
  {
   "row": 169,
   "new_id": "GEMINI-DEVCOM-PRA-03",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DEVCOM-PRA-03",
   "old_text": "Most teams require an approved design document before starting any major project. Design docs outline architecture, implementation approach, and technical decisions, requiring stakeholder feedback and consensus before implementation begins. [q-24]"
  },
  {
   "row": 170,
   "new_id": "GEMINI-DEVCOM-PRA-04",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DEVCOM-PRA-04",
   "old_text": "Production meetings follow structured agendas: upcoming production changes, metrics, outage post-mortems, paging events, nonpaging events, and prior action items follow-up. [q-25]"
  },
  {
   "row": 171,
   "new_id": "GEMINI-DEVCOM-TOO-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DEVCOM-TOO-01",
   "old_text": "Google Chat for real-time topic-driven group communication; Google Groups mailing lists (topic-users@, topic-discuss@) for asynchronous discussions; google3 monorepo g3doc directories (accessible via Code Search) for technical documentation; Google Docs for collaborative design documents with real-time multi-author editing. [q-26]"
  },
  {
   "row": 172,
   "new_id": "GEMINI-DEVCOM-STK-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DEVCOM-STK-01",
   "old_text": "Google engineering communication involves tech leads who provide technical direction and build consensus in teams, engineering managers who handle performance management and catchall responsibilities, project managers who coordinate cross-functional work and track deliverables, SRE teams who run production meetings and articulate service state to stakeholders, and engineers across the organization who participate in group chats, mailing list discussions, and design document reviews. [q-57]"
  },
  {
   "row": 173,
   "new_id": "GEMINI-DOC-PRA-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DOC-PRA-01",
   "old_text": "Each Gemini release ships with: a tech report (arxiv), a model card (capability/eval/safety summaries), a Google Cloud release-notes entry, and updated developer docs at ai.google.dev. The DeepMind 'Responsible Development of Gemini' post documents red-teaming and assurance practices publicly. [q-27]"
  },
  {
   "row": 174,
   "new_id": "GEMINI-DOC-TOO-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DOC-TOO-01",
   "old_text": "arxiv.org for tech reports; model cards on ai.google.dev; ai.google.dev/gemini-api/docs for developer documentation; Google Cloud Vertex AI release notes; DeepMind blog for research disclosures. [q-28]"
  },
  {
   "row": 175,
   "new_id": "GEMINI-DOC-STK-01",
   "agent": "Google Gemini",
   "old_id": "GEMINI-DOC-STK-01",
   "old_text": "Gemini research authors (tech reports, model cards), Google DevRel docs writers (developer documentation), model-card reviewers. [q-29]"
  },
  {
   "row": 176,
   "new_id": "KIMI-SYS-DESC-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-SYS-DESC-01",
   "old_text": "Kimi Ok Computer is a closed-source chat-based AI agent by Moonshot AI. It autonomously operates a cloud computing environment to complete complex multi-step tasks, including web browsing, code execution, image generation, deep research, etc"
  },
  {
   "row": 177,
   "new_id": "KIMI-SYS-DESC-02",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-SYS-DESC-02",
   "old_text": "Repo is closed source - but added related repository: kimi-agent-sdk\n  Primary language: Python\n  50+ team member as contributors [q-49]"
  },
  {
   "row": 178,
   "new_id": "KIMI-TEST-PRA-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-TEST-PRA-01",
   "old_text": "Internal reliability testing, benchmark - \n  - Kimi code bench\n  - kimi design bench\n  - Claw bench"
  },
  {
   "row": 179,
   "new_id": "KIMI-TEST-PRA-02",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-TEST-PRA-02",
   "old_text": "External benchmark performance - in-house evaluation framework adapted from SWE-agent [q-1]\n  For the robustness check, they averaged over 10 independent checks [q-2]\n  MoonshotAI employs systematic dogfooding as a reliability testing practice; ran 4k+ tool calls, over 12 hours of continuous execution as stress testing [q-3]\n  Third-party enterprise evaluators independently validate model improvements using domain-specific benchmarks [q-4]"
  },
  {
   "row": 180,
   "new_id": "KIMI-TEST-TOO-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-TEST-TOO-02",
   "old_text": "Internal proprietary benchmark suites, external industry-standard benchmarks (SWE-Bench series, Terminal-Bench, OSWorld, BrowseComp), and runtime output validators for document formats [q-5]"
  },
  {
   "row": 181,
   "new_id": "KIMI-TEST-STK-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-TEST-STK-01",
   "old_text": "MoonshotAI RL infrastructure team , model development team, third-party enterprise evaluators [q-6]"
  },
  {
   "row": 182,
   "new_id": "KIMI-TEST-OTH-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-TEST-OTH-01",
   "old_text": "When Agent Swarm mode is enabled on Ok Computer, parallel execution delivers a measurable lift on research-intensive retrieval tasks: BrowseComp rises from 83.2 (single-agent) to 86.3 (Agent Swarm), showing that horizontal scaling across sub-agents improves research breadth and accuracy beyond what a single agent can achieve. Benchmark reproducibility across these comparisons is controlled through versioned evaluation configurations—Claw Eval specifically runs at version 1.1 with max-tokens-per-step capped at 16,384. [q-7]"
  },
  {
   "row": 184,
   "new_id": "KIMI-CICD-STK-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-CICD-STK-01",
   "old_text": "MoonshotAI model and infrastructure teams manage deployment internally; enterprise evaluators (CodeBuddy, Factory.ai, Vercel AI) publish independent pre-release benchmark results that function as external validation before general availability. [q-10]"
  },
  {
   "row": 187,
   "new_id": "KIMI-BUG-TOO-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-BUG-TOO-01",
   "old_text": "Runtime fault-tolerance tools identified via community analysis: psutil for kernel process health monitoring, IPython KernelManager for lifecycle management and restart, and Playwright with Chrome DevTools Protocol for browser crash recovery. [q-13]"
  },
  {
   "row": 188,
   "new_id": "KIMI-BUG-STK-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-BUG-STK-01",
   "old_text": "Bug resolution is handled internally by MoonshotAI; the RL infrastructure team's 5-day pre-release autonomous agent run generates operational failure signals ahead of external release. [q-14]"
  },
  {
   "row": 189,
   "new_id": "KIMI-SEMETH-PRA-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-SEMETH-PRA-01",
   "old_text": "MoonshotAI practices systematic dogfooding as a development methodology. The marketing team uses Claw Groups (Agent Swarm research preview) to run end-to-end content production campaigns, \n  RL infrastructure team uses K2.6-backed agents for 24/7 autonomous operations — feeding real-world reliability and workflow data back into product development"
  },
  {
   "row": 190,
   "new_id": "KIMI-SEMETH-STK-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-SEMETH-STK-01",
   "old_text": "Methodology stakeholders include the RL infrastructure team (autonomous operations and PARL training), the marketing team (dogfooding Claw Groups for content production), the broader Kimi Team research contributors, and third-party developers building agentic workflows on the agent SDK. [q-18]"
  },
  {
   "row": 191,
   "new_id": "KIMI-DEVCOM-PRA-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DEVCOM-PRA-01",
   "old_text": "MoonshotAI maintains multiple public community communication channels: GitHub Discussions on kimi-cli for technical Q&A, a Discord server (discord.gg/FBDhVhVH7M) for real-time chat, a community forum at forum.moonshot.ai for longer-form discussions, and a Reddit community at r/kimi for broader community engagement. [q-19]"
  },
  {
   "row": 192,
   "new_id": "KIMI-DEVCOM-PRA-02",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DEVCOM-PRA-02",
   "old_text": "Official product announcements and engineering deep-dives are published on kimi.com/blog with each major model and product release, including full benchmark tables, architecture descriptions, and third-party evaluator testimonials. MoonshotAI uses X (@Kimi_Moonshot) and Instagram (@kimiai.official) for social media outreach. [q-20]"
  },
  {
   "row": 193,
   "new_id": "KIMI-DEVCOM-PRA-03",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DEVCOM-PRA-03",
   "old_text": "With each major model release, MoonshotAI publishes an anonymized operational worklog alongside the announcement—the K2.6 release included a redacted 5-day autonomous run record from the RL infrastructure team to let the broader engineering community audit the agent's real-world behavior. This practice of sharing edited-but-authentic operational records, rather than only synthetic benchmarks, functions as a transparency mechanism that bridges internal engineering decisions and public trust. [q-21]"
  },
  {
   "row": 194,
   "new_id": "KIMI-DEVCOM-TOO-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DEVCOM-TOO-01",
   "old_text": "GitHub discussion, Kimi-cli, discord, reddit [q-22]"
  },
  {
   "row": 195,
   "new_id": "KIMI-DEVCOM-STK-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DEVCOM-STK-01",
   "old_text": "Communication stakeholders span the MoonshotAI engineering and product teams, active open-source contributors, enterprise partners publishing public evaluations, and dual Chinese and international developer communities reflecting the product's global reach. [q-47]"
  },
  {
   "row": 196,
   "new_id": "KIMI-DEVCOM-OTH-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DEVCOM-OTH-01",
   "old_text": "Technical support for model deployment questions is routed to support@moonshot.cn per the Kimi K2.5 official repository. The platform.kimi.ai developer API provides an OpenAI/Anthropic-compatible endpoint for integration, with a Kimi Vendor Verifier (KVV) tool available to validate third-party provider deployment accuracy. [q-48]"
  },
  {
   "row": 197,
   "new_id": "KIMI-DOC-PRA-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DOC-PRA-01",
   "old_text": "MoonshotAI publishes detailed technical reports for each major model release, covering model architecture, training methodology, and Agent Swarm design, providing transparent academic-grade documentation of the model powering Ok Computer [q-23] [q-24] [q-25]"
  },
  {
   "row": 198,
   "new_id": "KIMI-DOC-TOO-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DOC-TOO-01",
   "old_text": "Documentation for Ok Computer is distributed through technical reports, the API developer portal at platform.moonshot.ai, and the community-maintained kimi-agent-internals reverse-engineering repository. [q-26]"
  },
  {
   "row": 199,
   "new_id": "KIMI-DOC-STK-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DOC-STK-01",
   "old_text": "Documentation stakeholders include the MoonshotAI research team, community analysts who independently document Ok Computer's internal architecture, and the broader developer community consuming API and integration documentation. [q-27]"
  },
  {
   "row": 200,
   "new_id": "KIMI-DOC-OTH-01",
   "agent": "Kimi ok Computer",
   "old_id": "KIMI-DOC-OTH-01",
   "old_text": "Agent behavior documentation for Kimi Ok Computer is embedded in the SKILL.md files themselves. SKILL.md files serve simultaneously as runtime instructions for the agent and as behavioral documentation for the system, making the documentation executable. The community analyst who reverse-engineered this architecture captured the design principle: 'New capabilities come down to documentation. Write a thorough manual, put it in the right directory, and the agent is an expert in that domain.' This tight coupling means documentation quality directly determines capability quality—unusual in traditional software, where documentation and behavior are maintained independently. [q-28]"
  },
  {
   "row": 201,
   "new_id": "OPERA-SYS-DESC-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-SYS-DESC-01",
   "old_text": "Opera Neon is a closed-source, subscription-based AI agentic browser by Opera Software. Built on Chromium, it combines local in-browser automation (Neon Do), conversational AI (Neon Chat), and cloud-based creation (Neon Make) — letting users browse, act on the web, and build digital outputs directly from their browser. Its model-agnostic AI engine selects from OpenAI, Google, and specialized models depending on task type."
  },
  {
   "row": 202,
   "new_id": "OPERA-SYS-DESC-02",
   "agent": "Opera Neon",
   "old_id": "OPERA-SYS-DESC-02",
   "old_text": "Primary Language: C++ (Chromium-based browser engine) [q-1]"
  },
  {
   "row": 203,
   "new_id": "OPERA-TEST-PRA-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-TEST-PRA-01",
   "old_text": "The Opera security team conducted hundreds of internal pen-tests on Opera Neon before and during Early Access. This pre-launch hardening cycle was designed to surface and address key vulnerabilities in the AI agentic components before wider user exposure. [q-2]"
  },
  {
   "row": 204,
   "new_id": "OPERA-TEST-PRA-02",
   "agent": "Opera Neon",
   "old_id": "OPERA-TEST-PRA-02",
   "old_text": "Opera launched Opera Neon in an Early Access phase to gather real-world usage insights l and to invite the broader security community to help identify gaps [q-3]"
  },
  {
   "row": 205,
   "new_id": "OPERA-TEST-PRA-03",
   "agent": "Opera Neon",
   "old_id": "OPERA-TEST-PRA-03",
   "old_text": "Opera runs a public bug bounty program via BugCrowd as a structural complement to internal testing. It allows independent security researchers to report vulnerabilities ethically and to the mutual benefit of all parties. [q-4]"
  },
  {
   "row": 206,
   "new_id": "OPERA-TEST-STK-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-TEST-STK-01",
   "old_text": "Internal Security Team, External security researchers [q-7]"
  },
  {
   "row": 207,
   "new_id": "OPERA-TEST-OTH-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-TEST-OTH-01",
   "old_text": "Their thoughts on agentic testing - \"Testing is ongoing and expected to expand: the security team explicitly states that securing AI systems is tricky and unpredictable, calling for wider and more extended testing as the product matures\" [q-8]"
  },
  {
   "row": 208,
   "new_id": "OPERA-CICD-PRA-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CICD-PRA-01",
   "old_text": "Opera Neon uses a phased rollout approach: the Early Access launch released to a limited number of invited users first, with more invitations following. This limits exposure surface during the validation period before wider availability. [q-55]"
  },
  {
   "row": 209,
   "new_id": "OPERA-CICD-PRA-02",
   "agent": "Opera Neon",
   "old_id": "OPERA-CICD-PRA-02",
   "old_text": "Neon Make executes creation tasks on cloud virtual machines hosted on European servers, which keeps creation workloads separate from the user's local browser state. Neon Do, by contrast, operates fully locally in the user's running browser session. [q-56]"
  },
  {
   "row": 210,
   "new_id": "OPERA-CICD-TOO-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CICD-TOO-01",
   "old_text": "The virtual machine employed by Opera Neon is hosted on our secure European servers [q-57]"
  },
  {
   "row": 211,
   "new_id": "OPERA-CICD-STK-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CICD-STK-01",
   "old_text": "Opera's engineering team and infrastructure team [q-58]"
  },
  {
   "row": 212,
   "new_id": "OPERA-CICD-OTH-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CICD-OTH-01",
   "old_text": "The prompt injection fix was confirmed functional by external researchers on October 21, 2025 — one day after deployment — demonstrating a full fix-verify loop within a 24-hour window. [q-59]"
  },
  {
   "row": 213,
   "new_id": "OPERA-CODEREV-PRA-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CODEREV-PRA-01",
   "old_text": "Opera's security team actively reviews AI component designs for safeguards against malicious injection, collaborating with product teams throughout development.\n  Security review includes analysis of how prompts are constructed and how user context is separated from web content. [q-60]"
  },
  {
   "row": 214,
   "new_id": "OPERA-CODEREV-PRA-02",
   "agent": "Opera Neon",
   "old_id": "OPERA-CODEREV-PRA-02",
   "old_text": "Cross-team review during security incidents brings security, product, and engineering teams together. They shared their critical incident in the blog post, all relevant internal teams were brought in to review the vulnerability and the proposed fix before it was deployed. [q-61]"
  },
  {
   "row": 215,
   "new_id": "OPERA-CODEREV-TOO-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CODEREV-TOO-01",
   "old_text": "Internal code review tooling is not publicly disclosed. Code review is supplemented by: pen-testing as a validation layer, BugCrowd for external security review [q-62]"
  },
  {
   "row": 216,
   "new_id": "OPERA-CODEREV-STK-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CODEREV-STK-01",
   "old_text": "Security team and product team [q-63]"
  },
  {
   "row": 217,
   "new_id": "OPERA-CODEREV-OTH-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-CODEREV-OTH-01",
   "old_text": "Opera Neon is fully closed-source. No public code review is visible. The only externally observable code quality signals come from incident post-mortems, security blog posts, and the external bug bounty program. [q-64]"
  },
  {
   "row": 218,
   "new_id": "OPERA-BUG-PRA-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-BUG-PRA-01",
   "old_text": "Opera uses BugCrowd as its public bug tracking channel for external vulnerability reports. The team performs routine manual reviews of auto-rejected tickets. This is how the prompt injection report was recovered after being auto-dismissed. [q-65]"
  },
  {
   "row": 219,
   "new_id": "OPERA-BUG-PRA-02",
   "agent": "Opera Neon",
   "old_id": "OPERA-BUG-PRA-02",
   "old_text": "On confirmation of a valid vulnerability, Opera follows a rapid response process: immediate acknowledgment, internal investigation, PoC reproduction, fix development, and same-day deployment — followed by external verification before public disclosure. [q-66]"
  },
  {
   "row": 220,
   "new_id": "OPERA-BUG-PRA-03",
   "agent": "Opera Neon",
   "old_id": "OPERA-BUG-PRA-03",
   "old_text": "Opera holds CNA (CVE Numbering Authority) membership to evaluate submitted vulnerabilities and formally assign CVEs where criteria are met [q-67]"
  },
  {
   "row": 221,
   "new_id": "OPERA-BUG-TOO-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-BUG-TOO-01",
   "old_text": "Bug tracking uses BugCrowd (public bug bounty) [q-69]"
  },
  {
   "row": 222,
   "new_id": "OPERA-BUG-STK-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-BUG-STK-01",
   "old_text": "The security team owns vulnerability triage, PoC reproduction, and fix validation. The product team is notified and involved in implementing fixes during active incidents. External security researchers contribute via BugCrowd. The MITRE CNA program provides formal vulnerability classification. [q-70]"
  },
  {
   "row": 223,
   "new_id": "OPERA-BUG-OTH-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-BUG-OTH-01",
   "old_text": "Neon Make uses a multi-agent orchestration model: one agent acts as a conductor, decomposes tasks into smaller steps, and coordinates specialist agents to execute each step. When the cloud agent encounters errors, it attempts to self-correct autonomously. [q-71]"
  },
  {
   "row": 224,
   "new_id": "OPERA-SEMETH-PRA-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-SEMETH-PRA-01",
   "old_text": "Opera Neon was developed iteratively over two years. It began as internal agentic AI research, debuted publicly as 'Browser Operator' in March 2025, launched as Opera Neon waitlist in May 2025, and shipped in Early Access in September 2025 with interface and safety mechanics improved between each stage. [q-72]"
  },
  {
   "row": 225,
   "new_id": "OPERA-SEMETH-PRA-02",
   "agent": "Opera Neon",
   "old_id": "OPERA-SEMETH-PRA-02",
   "old_text": "Opera Neon is designed with a 'human-in-the-loop' approach, meaning it will generally pause and request user interaction when actions such as completing a transaction or downloading a file require confirmation. [q-73]"
  },
  {
   "row": 226,
   "new_id": "OPERA-SEMETH-PRA-03",
   "agent": "Opera Neon",
   "old_id": "OPERA-SEMETH-PRA-03",
   "old_text": "Tasks are self-contained workspaces in Opera Neon that allow you to work on a specific project using multiple sources of reference...without affecting or accessing other open Tasks or any other information elsewhere in Opera Neon. [q-74]"
  },
  {
   "row": 227,
   "new_id": "OPERA-SEMETH-TOO-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-SEMETH-TOO-01",
   "old_text": "Chromium as the browser base cloud VMs for Neon Make, DOM tree parsing for web interaction, the Cards system for user-defined prompt customization, and human-in-the-loop gating for sensitive actions [q-77]"
  },
  {
   "row": 228,
   "new_id": "OPERA-SEMETH-STK-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-SEMETH-STK-01",
   "old_text": "The engineering team, security team, and product team collaborate on iterative feature development as stakeholder [q-78]"
  },
  {
   "row": 229,
   "new_id": "OPERA-SEMETH-OTH-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-SEMETH-OTH-01",
   "old_text": "Neon Make uses a multi-agent orchestration model: one agent acts as a conductor, decomposes tasks into smaller steps, and coordinates specialist agents to execute each step. When the cloud agent encounters errors, it attempts to self-correct autonomously. [q-79]"
  },
  {
   "row": 230,
   "new_id": "OPERA-DEVCOM-PRA-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DEVCOM-PRA-01",
   "old_text": "Opera follows responsible disclosure with external researchers: after receiving a report, they coordinate directly with the researcher, ask for a temporary hold on public disclosure while investigating, and confirm fixes before the researcher goes public. [q-34] [q-35] [q-36]"
  },
  {
   "row": 231,
   "new_id": "OPERA-DEVCOM-TOO-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DEVCOM-TOO-01",
   "old_text": "External communication uses BugCrowd for vulnerability submissions and a dedicated security inquiry portal about the bug bounty program [q-37]"
  },
  {
   "row": 232,
   "new_id": "OPERA-DEVCOM-STK-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DEVCOM-STK-01",
   "old_text": "Internal communication flows between the security team, product team, and engineering team during incidents. External communication is with security researchers (via BugCrowd and direct contact) and the broader user community (via security blog). [q-80]"
  },
  {
   "row": 233,
   "new_id": "OPERA-DEVCOM-OTH-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DEVCOM-OTH-01",
   "old_text": "The October 2025 disclosure timeline shows the full communication cycle: Oct 14 (report submitted) → Oct 17 (auto-rejected) → Oct 20 (Opera reopens and contacts researcher, requests hold) → Oct 21 (fix confirmed by researcher) → Oct 23 (Opera publishes public blog). [q-81]"
  },
  {
   "row": 234,
   "new_id": "OPERA-DOC-PRA-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DOC-PRA-01",
   "old_text": "Opera maintains a dedicated security blog series tagged 'Agentic Browser Security', which covers the security model of Opera Neon in detail: safeguard mechanisms, incident reports, and forward-looking recommendations. This is proactive public documentation rather than reactive disclosure. [q-38]"
  },
  {
   "row": 235,
   "new_id": "OPERA-DOC-PRA-02",
   "agent": "Opera Neon",
   "old_id": "OPERA-DOC-PRA-02",
   "old_text": "Opera's security.opera.com hosts formal documentation covering: vulnerability policy, bug bounty scope and process, CNA membership details, security advisories, and a transparency report which forms a comprehensive security governance reference. [q-39]"
  },
  {
   "row": 236,
   "new_id": "OPERA-DOC-TOO-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DOC-TOO-01",
   "old_text": "Documentation is spread across: blogs.opera.com/security (security blog), blogs.opera.com/news (feature and release blog), operaneon.com/faq (product FAQ), security.opera.com (formal vulnerability and policy documentation), and press.opera.com (press releases). [q-41]"
  },
  {
   "row": 237,
   "new_id": "OPERA-DOC-STK-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DOC-STK-01",
   "old_text": "security team , marketing team [q-42]"
  },
  {
   "row": 238,
   "new_id": "OPERA-DOC-OTH-01",
   "agent": "Opera Neon",
   "old_id": "OPERA-DOC-OTH-01",
   "old_text": "Opera publishes incident post-mortems within days of resolution. The October 2025 prompt injection blog was published October 23, 2025 — two days after the fix was confirmed. No public API documentation exists as Opera Neon is a closed commercial product. [q-43]"
  },
  {
   "row": 239,
   "new_id": "ALIBABA-SYS-DESC-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-SYS-DESC-01",
   "old_text": "Mobile-Agent (v3) is an open-source, cross-platform GUI automation agent developed by Tongyi Lab at Alibaba Group. Its core is GUI-Owl — a foundational vision-language model built on Qwen2.5-VL, wrapped in a four-role multi-agent framework (Manager, Worker, Reflector, Notetaker) that automates tasks on Android phones, PCs, and web browsers without requiring app-specific training."
  },
  {
   "row": 240,
   "new_id": "ALIBABA-SYS-DESC-02",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-SYS-DESC-02",
   "old_text": "Primary Language: Python\n  Stars: 8700\n  Contributors: 22\n  Update Frequency: Active — major v3 release in August 2025; last commit November 2025. [q-1]"
  },
  {
   "row": 241,
   "new_id": "ALIBABA-TEST-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-TEST-PRA-01",
   "old_text": "The team evaluates GUI-Owl across ten public benchmarks covering grounding, single-step decision, question answering, and online interactive task completion. Benchmarks include ScreenSpot-v2, ScreenSpot-Pro, OSWorld-Verified, etc. [q-2]"
  },
  {
   "row": 242,
   "new_id": "ALIBABA-TEST-PRA-02",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-TEST-PRA-02",
   "old_text": "Agent behaviour is validated by running the full agent stack against AndroidWorld and OSWorld interactive environments. They launch live agent sessions against real or emulated devices and measure end-to-end task success rate. [q-3]"
  },
  {
   "row": 243,
   "new_id": "ALIBABA-TEST-PRA-03",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-TEST-PRA-03",
   "old_text": "The team relies on issue reports to detect runtime failures that would otherwise require live device testing. [q-4]"
  },
  {
   "row": 245,
   "new_id": "ALIBABA-TEST-TOO-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-TEST-TOO-01",
   "old_text": "AndroidWorld and OSWorld as live benchmark environments [q-5]"
  },
  {
   "row": 246,
   "new_id": "ALIBABA-TEST-STK-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-TEST-STK-01",
   "old_text": "Evaluation is run by the Tongyi Lab research team at Alibaba Group [q-6]"
  },
  {
   "row": 247,
   "new_id": "ALIBABA-TEST-OTH-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-TEST-OTH-01",
   "old_text": "The runtime code includes error-handling patterns: a 5-attempt retry loop for screenshot capture, try/except around JSON parsing with ast.literal_eval as fallback for Python-style dict outputs (introduced after PR #272), and RuntimeError raises for failed LLM API calls. These are guards against runtime failures, not test assertions. [q-7]"
  },
  {
   "row": 248,
   "new_id": "ALIBABA-CICD-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CICD-PRA-01",
   "old_text": "The only automated GitHub Actions workflow is pages-build-deployment, which rebuilds the project's GitHub Pages static website on every push to main. As of May 2026 there have been 258 runs of this workflow. [q-42]"
  },
  {
   "row": 249,
   "new_id": "ALIBABA-CICD-TOO-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CICD-TOO-01",
   "old_text": "GitHub Actions is the sole CI tool that used for website hosting, not code CI. Model artifacts are distributed via HuggingFace and ModelScope [q-43]"
  },
  {
   "row": 250,
   "new_id": "ALIBABA-CICD-STK-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CICD-STK-01",
   "old_text": "The Tongyi Lab core team [q-44]"
  },
  {
   "row": 251,
   "new_id": "ALIBABA-CICD-OTH-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CICD-OTH-01",
   "old_text": "The absence of a CI pipeline means that community pull requests are not automatically validated before review. Merged PRs were reviewed and merged by core maintainers manually, with no automated check on code correctness, style, or compatibility. Users have filed issues requesting better version control of remotely downloaded resources, reflecting the gap left by the manual release process. [q-45]"
  },
  {
   "row": 252,
   "new_id": "ALIBABA-CODEREV-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CODEREV-PRA-01",
   "old_text": "The repository has only 2 active pull requests, which suggests most code changes are committed directly by the core team rather than going through a formal PR review workflow. There is no public CONTRIBUTING.md or documented code review policy. [q-46]"
  },
  {
   "row": 253,
   "new_id": "ALIBABA-CODEREV-TOO-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CODEREV-TOO-01",
   "old_text": "GitHub Pull Requests is the code review surface. [q-48]"
  },
  {
   "row": 254,
   "new_id": "ALIBABA-CODEREV-STK-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CODEREV-STK-01",
   "old_text": "22 contributors are listed on GitHub. The core team is from Tongyi Lab, Alibaba Group. [q-49]"
  },
  {
   "row": 255,
   "new_id": "ALIBABA-CODEREV-OTH-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-CODEREV-OTH-01",
   "old_text": "With 183 open issues and only 2 open pull requests, the project operates as a research artifact rather than a product codebase. External contributions are minimal; the team responds to selected issues but rarely merges community patches. [q-50]"
  },
  {
   "row": 257,
   "new_id": "ALIBABA-BUG-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-BUG-PRA-01",
   "old_text": "The core team (primarily maintainer junyangwang0410) responds to issues on a best-effort basis with no formal SLA. For critical code bugs — where a community member provides a precise code-level diagnosis — the maintainer pushes a direct fix commit referencing the issue and closes it, often within one to two days. Issue #265 (smart_resize factor mismatch) followed this exact path: diagnosis in issue thread, commit pushed with 'Fix the bug in #265' message, issue closed the same day. [q-51]"
  },
  {
   "row": 258,
   "new_id": "ALIBABA-BUG-PRA-02",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-BUG-PRA-02",
   "old_text": "For benchmark reproducibility issues — the second most common category — the resolution pattern is different. The maintainer responds with internal evaluation logs and trajectory files to help the user compare outputs. If the root cause turns out to be an outdated inference dependency (vLLM version), no code fix is applied; the reporter closes the issue themselves after upgrading their environment. Issues #203 and #238 both followed this path. [q-52]"
  },
  {
   "row": 259,
   "new_id": "ALIBABA-BUG-PRA-03",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-BUG-PRA-03",
   "old_text": "Issues are not triaged with labels, milestones, or assignees. There is no visible prioritisation system: all issues sit in a single unlabelled queue. The 183 open vs. 67 closed ratio (73% open) reflects selective triage — issues get closed when either a code fix is committed or a reporter self-resolves. Architectural and recurring concerns (coordinate precision in #182, #278; context overflow in #266) remain open indefinitely because they have no single-commit fix. [q-53]"
  },
  {
   "row": 260,
   "new_id": "ALIBABA-BUG-PRA-04",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-BUG-PRA-04",
   "old_text": "Active community members provide first-line support for common setup and configuration questions, reducing the maintainer's response burden. In issue #238, community member BUPTyj posted a correct vLLM API parameter workaround before the core team responded. This peer-to-peer support in issue threads is the project's de facto help desk, filling the gap left by the absence of a documentation site or Discord channel. [q-54]"
  },
  {
   "row": 261,
   "new_id": "ALIBABA-BUG-TOO-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-BUG-TOO-01",
   "old_text": "\"GitHub Issues is the only public bug tracker [q-55]"
  },
  {
   "row": 262,
   "new_id": "ALIBABA-BUG-STK-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-BUG-STK-01",
   "old_text": "Bug reports come from the open-source community, researchers and developers. The core team responds to selected issues, primarily those affecting benchmark reproducibility or API usage. [q-56]"
  },
  {
   "row": 263,
   "new_id": "ALIBABA-BUG-OTH-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-BUG-OTH-01",
   "old_text": "The most persistent class of unresolved bugs is coordinate precision across all versions: #182 (19 comments, still open), #278 (coordinate offset in thinking model), and the historic #265 (smart_resize mismatch, now fixed). Each arises from the same root cause — the gap between the model's training resolution and the user's device resolution at runtime — but each version introduces a new variant. The --coor_type CLI flag introduced in v3 is the engineering mitigation, but issues continue to surface. [q-57]"
  },
  {
   "row": 264,
   "new_id": "ALIBABA-SEMETH-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-SEMETH-PRA-01",
   "old_text": "The team follows a research-gated, version-per-subdirectory development model. Each major iteration is developed as a self-contained module in its own directory and released alongside an academic paper. Each release is triggered by a research milestone rather than a sprint cycle or feature roadmap. [q-58]"
  },
  {
   "row": 265,
   "new_id": "ALIBABA-SEMETH-TOO-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-SEMETH-TOO-01",
   "old_text": "Version control is managed via Git on GitHub (X-PLUG organization). Python is the primary language. The only project-management surface visible publicly is GitHub Issues and GitHub Pull Requests — no Jira, Linear, Notion, or similar tool is referenced anywhere in the repository. [q-60]"
  },
  {
   "row": 266,
   "new_id": "ALIBABA-SEMETH-STK-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-SEMETH-STK-01",
   "old_text": "22 GitHub contributors [q-61]"
  },
  {
   "row": 267,
   "new_id": "ALIBABA-SEMETH-OTH-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-SEMETH-OTH-01",
   "old_text": "The codebase supports both Android (via ADB) and HarmonyOS (via HDC) device backends through a runtime flag (--adb_path vs --hdc_path). HarmonyOS support was added in the last known commit (b763787, 7 months before May 2026), indicating the team extends platform support incrementally after the initial release rather than bundling all platforms at launch. [q-62]"
  },
  {
   "row": 268,
   "new_id": "ALIBABA-DEVCOM-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DEVCOM-PRA-01",
   "old_text": "Research findings are published before formal conference submission, giving the community early access. Each release is announced via GitHub README updates, with dated news entries for every version milestone. [q-28]"
  },
  {
   "row": 269,
   "new_id": "ALIBABA-DEVCOM-PRA-02",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DEVCOM-PRA-02",
   "old_text": "The README is maintained in both English and Simplified Chinese, reflecting the team's audience across Chinese research institutions and the broader international community. [q-29]"
  },
  {
   "row": 270,
   "new_id": "ALIBABA-DEVCOM-TOO-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DEVCOM-TOO-01",
   "old_text": "Guithub Issues [q-30]"
  },
  {
   "row": 271,
   "new_id": "ALIBABA-DEVCOM-STK-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DEVCOM-STK-01",
   "old_text": "The Tongyi Lab core team communicates with the academic community through conference presentations and arXiv papers. External users reach the team via GitHub Issues. [q-63]"
  },
  {
   "row": 272,
   "new_id": "ALIBABA-DEVCOM-OTH-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DEVCOM-OTH-01",
   "old_text": "Demo videos for each supported platform (phone, PC, and web) are embedded in the GitHub README, giving external collaborators a practical visual reference for the agent's capabilities. [q-64]"
  },
  {
   "row": 273,
   "new_id": "ALIBABA-DOC-PRA-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DOC-PRA-01",
   "old_text": "Each version of Mobile-Agent is documented through its own subdirectory README and a corresponding paper. [q-31] [q-32]"
  },
  {
   "row": 274,
   "new_id": "ALIBABA-DOC-TOO-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DOC-TOO-01",
   "old_text": "Documentation is hosted on GitHub (README files) [q-33]"
  },
  {
   "row": 275,
   "new_id": "ALIBABA-DOC-STK-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DOC-STK-01",
   "old_text": "Tongyi Lab team [q-34]"
  },
  {
   "row": 276,
   "new_id": "ALIBABA-DOC-OTH-01",
   "agent": "Alibaba Mobile Agent",
   "old_id": "ALIBABA-DOC-OTH-01",
   "old_text": "The action space for mobile and desktop are each formally documented in a dedicated table inside the technical paper (Tables 9 and 10), specifying every allowed action (key, click, long_press, swipe, type, open, terminate, etc.) with plain-language descriptions. [q-35]"
  },
  {
   "row": 277,
   "new_id": "COMET-SYS-DESC-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-SYS-DESC-01",
   "old_text": "Perplexity Comet is a closed-source, Chromium-based AI browser that unifies traditional web browsing with agentic task execution. It contains two distinct AI layers: the Comet Assistant for reading, summarizing, and answering questions; and the Comet Agent, which autonomously executes multi-step tasks such as booking appointments, drafting emails, and managing workflows. \n  Perplexity's search engine powers Comet, and the product targets both individual users and enterprise teams who seek intelligent workflow automation."
  },
  {
   "row": 278,
   "new_id": "COMET-SYS-DESC-02",
   "agent": "Perplexity Comet",
   "old_id": "COMET-SYS-DESC-02",
   "old_text": "Primary Language: TypeScript and C++ are typical for Chromium-based browser development\n  Update Frequency: Active - Weekly changelog updates; Comet iOS, Comet Enterprise launched March 2026, prior feature releases shipping monthly throughout 2025 [q-1]"
  },
  {
   "row": 279,
   "new_id": "COMET-TEST-PRA-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-TEST-PRA-01",
   "old_text": "Perplexity developed BrowseSafe-Bench, a public evaluation suite of 14,719 real-world-style examples for benchmarking AI browser agent security. \n  The benchmark checks prompt injection attacks: attack type, injection strategy, and linguistic style (how the instruction is phrased). This three-axis taxonomy helps the security team target training data gaps and systematically harden detection models. [q-2]"
  },
  {
   "row": 280,
   "new_id": "COMET-TEST-PRA-02",
   "agent": "Perplexity Comet",
   "old_id": "COMET-TEST-PRA-02",
   "old_text": "Their models are continuously updated on new attack vectors discovered through their bug bounty program, red team exercises, and real-world detection events, ensuring they evolve faster than the threat landscape. [q-3]"
  },
  {
   "row": 281,
   "new_id": "COMET-TEST-PRA-03",
   "agent": "Perplexity Comet",
   "old_id": "COMET-TEST-PRA-03",
   "old_text": "BrowseSafe-Bench evaluation showed that attacks hidden in visible webpage text, such as footers and tables, were harder for models to detect than attacks hidden inside HTML comments or metadata. This unexpected result changed how the team designed their training data."
  },
  {
   "row": 282,
   "new_id": "COMET-TEST-PRA-04",
   "agent": "Perplexity Comet",
   "old_id": "COMET-TEST-PRA-04",
   "old_text": "They also discovered that adding only three harmless distractor elements reduced detection accuracy from over 90% to about 81%, showing that the models were sensitive to realistic webpage noise and distractions. [q-4]"
  },
  {
   "row": 283,
   "new_id": "COMET-TEST-TOO-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-TEST-TOO-01",
   "old_text": "BrowseSafe and BrowseSafe-Bench as their security benchmark [q-5]"
  },
  {
   "row": 284,
   "new_id": "COMET-TEST-STK-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-TEST-STK-01",
   "old_text": "The Perplexity Security Team. \n  External security researchers participate via the Vulnerability Disclosure Program and private bug bounty program, contributing new attack patterns to the retraining pipeline [q-6]"
  },
  {
   "row": 285,
   "new_id": "COMET-TEST-OTH-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-TEST-OTH-01",
   "old_text": "BrowseSafe-Bench includes 11 attack types, 9 injection strategies [q-7]"
  },
  {
   "row": 286,
   "new_id": "COMET-CICD-PRA-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-CICD-PRA-01",
   "old_text": "Comet ships on a weekly release, with each release documented publicly in a rolling changelog. The team publishes a 'What We Shipped' entry every week, covering both individual and enterprise capabilities.[q-41]"
  },
  {
   "row": 287,
   "new_id": "COMET-CICD-STK-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-CICD-STK-01",
   "old_text": "The Perplexity engineering team owns the release pipeline and publishes the weekly changelog. The security team has a parallel ownership stake in the BrowseSafe model deployment cycle, coordinating classifier updates independently of the browser release schedule. [q-43]"
  },
  {
   "row": 288,
   "new_id": "COMET-CICD-OTH-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-CICD-OTH-01",
   "old_text": "Comet expanded from a desktop-only (macOS, Windows) product to iOS within nine months of launch. [q-44]"
  },
  {
   "row": 289,
   "new_id": "COMET-CODEREV-OTH-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-CODEREV-OTH-01",
   "old_text": "The only indirect signal is the weekly shipping cadence visible in the public changelog. Consistent weekly releases across desktop, enterprise, and iOS targets suggest a development workflow with short integration cycles, though the underlying review and merge process is not disclosed. [q-48]"
  },
  {
   "row": 290,
   "new_id": "COMET-BUG-PRA-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-BUG-PRA-01",
   "old_text": "Perplexity uses a Vulnerability Disclosure Program (VDP) to track its bugs. Researchers submit findings through a formal submission form. \n  Valid disclosures earn acknowledgment, rewards and invitations to a private bug bounty program. AI-specific issues such as hallucinations and model safety are explicitly out of scope."
  },
  {
   "row": 291,
   "new_id": "COMET-BUG-PRA-02",
   "agent": "Perplexity Comet",
   "old_id": "COMET-BUG-PRA-02",
   "old_text": "Security problems are continuously used to improve the classifier. Edge cases found in production, red team testing, and bug bounty reports are turned into synthetic training data. The security team then re-trains BrowseSafe to detect new attack patterns before they become common. [q-50]"
  },
  {
   "row": 292,
   "new_id": "COMET-BUG-TOO-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-BUG-TOO-01",
   "old_text": "Audit logs (available for organizations with 50+ Enterprise Pro seats) provide usage and activity tracking for enterprise incident investigation [q-52]"
  },
  {
   "row": 293,
   "new_id": "COMET-BUG-STK-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-BUG-STK-01",
   "old_text": "The Perplexity Security Team, research community [q-53]"
  },
  {
   "row": 294,
   "new_id": "COMET-BUG-OTH-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-BUG-OTH-01",
   "old_text": "Comet is closed-source with no public issue tracker. Security incidents and compatibility issues surface through external security research reports, help center FAQ updates, and changelog entries rather than through a public GitHub issue list. [q-54]"
  },
  {
   "row": 295,
   "new_id": "COMET-SEMETH-PRA-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-SEMETH-PRA-01",
   "old_text": "\"Experience has taught us that security isn't a feature to bolt on after launch, but a foundational requirement that requires reimagining how malicious action is conceived and where those attacks will come from.\" {Quote 1} [q-55]"
  },
  {
   "row": 296,
   "new_id": "COMET-SEMETH-TOO-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-SEMETH-TOO-01",
   "old_text": "Agile, Scrum, Kanban, sprint structure, and internal project management tooling are not publicly disclosed. The weekly 'What We Shipped' changelog format is indirect evidence of a continuous delivery process. Chromium as base platform reduces engineering scope by providing a mature browser foundation, allowing the team to direct velocity toward the AI layer rather than low-level browser infrastructure. [q-56]"
  },
  {
   "row": 297,
   "new_id": "COMET-SEMETH-STK-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-SEMETH-STK-01",
   "old_text": "All blog posts and changelog entries are attributed collectively as 'Perplexity Team' or 'Perplexity Security Team'. [q-57]"
  },
  {
   "row": 298,
   "new_id": "COMET-SEMETH-OTH-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-SEMETH-OTH-01",
   "old_text": "Perplexity piloted Comet under an invite-only model before broad release. New users received a limited number of invites to share, creating a controlled rollout mechanism that limits blast radius from bugs or security issues at initial launch. [q-58]"
  },
  {
   "row": 299,
   "new_id": "COMET-DEVCOM-PRA-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DEVCOM-PRA-01",
   "old_text": "Perplexity communicates product updates through a public weekly changelog, an engineering and product blog at perplexity.ai/hub/blog [q-26]"
  },
  {
   "row": 300,
   "new_id": "COMET-DEVCOM-TOO-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DEVCOM-TOO-01",
   "old_text": "X/Twitter, LinkedIn, Instagram, Threads, YouTube [q-28]"
  },
  {
   "row": 301,
   "new_id": "COMET-DEVCOM-STK-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DEVCOM-STK-01",
   "old_text": "End users receive product news via changelog and blog posts. Enterprise administrators interact through the admin dashboard and dedicated support email. External security researchers engage through the VDP. The broader developer community engages through Discord and the public API documentation. [q-60]"
  },
  {
   "row": 302,
   "new_id": "COMET-DEVCOM-OTH-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DEVCOM-OTH-01",
   "old_text": "Internal team communication practices are not publicly disclosed. Comet's launch blog post and enterprise announcement blog post are authored collectively as 'Perplexity Team', with no individual author attribution, reflecting a team-first public communication style. [q-61]"
  },
  {
   "row": 303,
   "new_id": "COMET-DOC-PRA-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DOC-PRA-01",
   "old_text": "Perplexity maintains a dedicated Comet Resources hub at perplexity.ai/comet/resources as the primary user-facing documentation source. [q-29]"
  },
  {
   "row": 304,
   "new_id": "COMET-DOC-PRA-02",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DOC-PRA-02",
   "old_text": "Security documentation receives dedicated treatment. The prompt injection defense architecture is publicly documented across two blog posts (the blog post on mitigating prompt injection and the BrowseSafe research post) [q-30]"
  },
  {
   "row": 305,
   "new_id": "COMET-DOC-PRA-03",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DOC-PRA-03",
   "old_text": "The Comet Data Privacy and Security FAQ documents data handling at a level of granularity suitable for enterprise procurement reviews [q-31]"
  },
  {
   "row": 306,
   "new_id": "COMET-DOC-TOO-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DOC-TOO-01",
   "old_text": "Documentation tooling includes the Comet Resources article hub, Perplexity Help Center (intercom-based), the public Hub engineering blog, Perplexity Trust Center at trust.perplexity.ai, and Security Documentation at perplexity.ai/hub/security. Compliance certifications (SOC 2 Type II, GDPR, PCI) are documented in the Trust Center. [q-32]"
  },
  {
   "row": 307,
   "new_id": "COMET-DOC-STK-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DOC-STK-01",
   "old_text": "Help center articles are authored by Perplexity support staff .Security documentation is published by the Perplexity Security Team. Research papers and technical blog posts are attributed to the Perplexity Team or Perplexity Research [q-33]"
  },
  {
   "row": 308,
   "new_id": "COMET-DOC-OTH-01",
   "agent": "Perplexity Comet",
   "old_id": "COMET-DOC-OTH-01",
   "old_text": "There is no public developer API or SDK documentation for Comet specifically. The Perplexity API documentation at docs.perplexity.ai covers the search API, not the browser agent. Comet's enterprise integration relies on Chromium policy documentation rather than a Comet-specific developer reference. [q-34]"
  },
  {
   "row": 309,
   "new_id": "BROWSER-SYS-DESC-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-SYS-DESC-01",
   "old_text": "Browser Use is an open-source agentic system that makes websites accessible to AI agents. It connects large language models to a Chromium browser via CDP (Chromium DevTool Protocol), extracting the DOM (Document Object Model) and screenshots on each step, then executing LLM-decided actions until the task is complete. Available as a pip package, a CLI tool, and a cloud API.\n  Programming Language: Python.\n  Stars: 94.1 stars\n  Contributors: 318\n  Update Frequency: Avg, 7 releases per month [q-77]"
  },
  {
   "row": 310,
   "new_id": "BROWSER-TEST-PRA-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-PRA-01",
   "old_text": "Using Blacksmith runners on GitHub Actions, they achieve insane scaling, evaluating the agent on 100 complex web tasks in parallel in under 5 minutes end-to-end. \n  They built the LLM judge directly into the agent code itself, running after the agent returns done. They also have a real-time validation layer built into the system. [q-1]"
  },
  {
   "row": 311,
   "new_id": "BROWSER-TEST-PRA-02",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-PRA-02",
   "old_text": "They sourced their evaluation tasks from LLM-labeled user spans rather than synthetic sites. [q-2]"
  },
  {
   "row": 312,
   "new_id": "BROWSER-TEST-PRA-03",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-PRA-03",
   "old_text": "Statistical rigor is applied to evaluation: each task is run multiple times, and results are aggregated with statistical bootstrapping, because single-run deterministic tests are unsuitable. [q-3]"
  },
  {
   "row": 313,
   "new_id": "BROWSER-TEST-PRA-04",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-PRA-04",
   "old_text": "Unit and integration tests are defined under tests/ci/ and executed in parallel, with isolated failure reporting for the core test suite. [q-4]"
  },
  {
   "row": 314,
   "new_id": "BROWSER-TEST-PRA-05",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-PRA-05",
   "old_text": "They stream every token, prompt, and cost directly into ClickHouse via Laminar for observability"
  },
  {
   "row": 315,
   "new_id": "BROWSER-TEST-TOO-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-TOO-01",
   "old_text": "Github Actions, Blacksmith runners, gemini-2.5-flash as llm as judge, pytest for automated test suite, Laminar for observability [q-5] [q-6] [q-7]"
  },
  {
   "row": 316,
   "new_id": "BROWSER-TEST-STK-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-STK-01",
   "old_text": "Engineering team [q-8] [q-9]"
  },
  {
   "row": 317,
   "new_id": "BROWSER-TEST-OTH-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-TEST-OTH-01",
   "old_text": "Pitfall experience: Initially, they tried embedding and clustering the failed traces to find common issues. It was a complete failure—the clusters didn't represent actionable product improvements [q-10]"
  },
  {
   "row": 318,
   "new_id": "BROWSER-CICD-PRA-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-CICD-PRA-01",
   "old_text": "A three-workflow GitHub Actions pipeline covers the full delivery lifecycle: \n  1. lint.yml (syntax, style, types on every push), \n  2. test.yaml (matrix unit tests plus per-PR agent evaluation), and \n  3. publish.yml (PyPI release triggered on a new GitHub release tag). [q-71]"
  },
  {
   "row": 319,
   "new_id": "BROWSER-CICD-PRA-02",
   "agent": "Browser Use",
   "old_id": "BROWSER-CICD-PRA-02",
   "old_text": "They scaled their infrastructure in 2 patterns - \n  Pattern 1: Single backend with agent loop and isolated terminal uses a sandbox (Docker) for tool-calling via HTTP.\n  Pattern 2: Isolate the agent. The entire agent runs in a sandbox with zero secrets. It talks to the outside world through a control plane that holds all the credentials."
  },
  {
   "row": 320,
   "new_id": "BROWSER-CICD-PRA-03",
   "agent": "Browser Use",
   "old_id": "BROWSER-CICD-PRA-03",
   "old_text": "They switched from pattern 1 to 2 for scalability, decoupling, and security. [q-74]"
  },
  {
   "row": 321,
   "new_id": "BROWSER-CICD-PRA-04",
   "agent": "Browser Use",
   "old_id": "BROWSER-CICD-PRA-04",
   "old_text": "The tradeoff is an extra network hop (control plane) on every operation and three services to deploy instead of one.\n  In practice, the latency is noise compared to LLM response times, and the operational complexity is the kind that ops teams already know how to handle."
  },
  {
   "row": 322,
   "new_id": "BROWSER-CICD-PRA-05",
   "agent": "Browser Use",
   "old_id": "BROWSER-CICD-PRA-05",
   "old_text": "Their cloud service receives task requests, stores them in Amazon S3, sends them to an SQS (Amazon's Queue Service) queue, and returns an HTTP 202 response. \n  A Lambda worker (serverless process runner) then processes each queued task and runs the agent until completion. [q-72]"
  },
  {
   "row": 324,
   "new_id": "BROWSER-CICD-TOO-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-CICD-TOO-01",
   "old_text": "Github Actions, per-PR agent evaluation via Blacksmith runners. \n  AWS SQS, Lambda, ALB, and S3 form the core cloud production stack. SQS decouples ingestion from execution; S3 stores agent checkpoints, screenshots, and output files; \n  The DLQ serves as a failure incident tracker [q-75] [q-76] [q-77] [q-78]"
  },
  {
   "row": 325,
   "new_id": "BROWSER-CICD-STK-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-CICD-STK-01",
   "old_text": "The cloud infrastructure team, Python developers and open-source contributors [q-79] [q-80]"
  },
  {
   "row": 326,
   "new_id": "BROWSER-CODEREV-PRA-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-CODEREV-PRA-01",
   "old_text": "All contributors must run pre-commit before submitting a PR. The pre-commit pipeline enforces check format (with auto-fix), Pyright type checking, codespell spell-check, and a suite of file integrity checks. [q-82]"
  },
  {
   "row": 327,
   "new_id": "BROWSER-CODEREV-PRA-02",
   "agent": "Browser Use",
   "old_id": "BROWSER-CODEREV-PRA-02",
   "old_text": "Pull requests automatically trigger the evaluate-tasks in the GitHub Actions job, which posts the evaluation score as a PR comment to assess whether a change improves or regresses agent performance. [q-83]"
  },
  {
   "row": 328,
   "new_id": "BROWSER-CODEREV-TOO-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-CODEREV-TOO-01",
   "old_text": "Github, Ruff - for formatting"
  },
  {
   "row": 329,
   "new_id": "BROWSER-CODEREV-TOO-02",
   "agent": "Browser Use",
   "old_id": "BROWSER-CODEREV-TOO-02",
   "old_text": "AI coding agents (e.g., Claude Code, Cursor) are explicitly supported as contributors via AGENTS.md, which provides embedded documentation and coding rules they must follow when generating code for this repository. [q-85] [q-86]"
  },
  {
   "row": 330,
   "new_id": "BROWSER-CODEREV-STK-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-CODEREV-STK-01",
   "old_text": "Developers, open-source contributors [q-87] [q-88]"
  },
  {
   "row": 331,
   "new_id": "BROWSER-CODEREV-OTH-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-CODEREV-OTH-01",
   "old_text": "check-added-large-files hook (maxkb=600) prevents oversized assets from being committed. pyupgrade enforces Python 3.11+ syntax constructs uniformly across the codebase. [q-89]"
  },
  {
   "row": 332,
   "new_id": "BROWSER-BUG-PRA-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-BUG-PRA-01",
   "old_text": "GitHub Issues is the primary bug tracker with a dedicated 'bug' label. As of May 2026, 863 bug-labeled issues have been closed, and 24 remain open, reflecting an active triage and resolution process. [q-90]"
  },
  {
   "row": 333,
   "new_id": "BROWSER-BUG-PRA-02",
   "agent": "Browser Use",
   "old_id": "BROWSER-BUG-PRA-02",
   "old_text": "Engineering blog shares recurring bug patterns: race conditions in distributed state, async event loop misuse, memory leaks from non-singleton HTTP clients, and cascading config failures. [q-91]"
  },
  {
   "row": 334,
   "new_id": "BROWSER-BUG-TOO-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-BUG-TOO-01",
   "old_text": "Github issue with triage [q-93] [q-94] [q-95]"
  },
  {
   "row": 335,
   "new_id": "BROWSER-BUG-STK-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-BUG-STK-01",
   "old_text": "The engineering team, open source community [q-96] [q-97]"
  },
  {
   "row": 336,
   "new_id": "BROWSER-BUG-OTH-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-BUG-OTH-01",
   "old_text": "Bug solving story: Memory leak from non-singleton HTTP clients required seven commits in one day to fully resolve. [q-98]"
  },
  {
   "row": 337,
   "new_id": "BROWSER-SEMETH-PRA-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-PRA-01",
   "old_text": "Browser Use adopts a minimal-agent philosophy: 'An agent is just a for-loop of messages.' Their development story reveals that their original first agent was discarded and rebuilt from scratch after the team reverse-engineered Claude Code and Gemini CLI, discovering that fewer abstractions produce more reliable agents. [q-100]"
  },
  {
   "row": 338,
   "new_id": "BROWSER-SEMETH-PRA-02",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-PRA-02",
   "old_text": "Fast iteration with systematic learning: the cloud infrastructure was built through 4,000+ commits in one year. Mistakes were shipped, analyzed, and fixed forward. The gap between a working demo and production reliability defined the team's engineering maturity curve."
  },
  {
   "row": 339,
   "new_id": "BROWSER-SEMETH-PRA-03",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-PRA-03",
   "old_text": "Agent frameworks fail not because models are weak, but because their action spaces are incomplete."
  },
  {
   "row": 340,
   "new_id": "BROWSER-SEMETH-PRA-04",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-PRA-04",
   "old_text": "Instead of defining every possible action up front, start from the opposite assumption: the model can do almost anything. Then restrict."
  },
  {
   "row": 341,
   "new_id": "BROWSER-SEMETH-PRA-05",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-PRA-05",
   "old_text": "Based on their development experiences, they state: \"Give the LLM as much freedom as possible, then vibe-restrict based on evals.\" [q-101]"
  },
  {
   "row": 342,
   "new_id": "BROWSER-SEMETH-TOO-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-TOO-01",
   "old_text": "agent-sdk [q-104] [q-105]"
  },
  {
   "row": 343,
   "new_id": "BROWSER-SEMETH-STK-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-STK-01",
   "old_text": "product and engineering team [q-106] [q-107]"
  },
  {
   "row": 344,
   "new_id": "BROWSER-SEMETH-OTH-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-SEMETH-OTH-01",
   "old_text": "Key lesson: less abstraction, let the model decide and reason in every step, access them to raw data to reason, analyze, and based on the evaluated data, add evaluation constraints."
  },
  {
   "row": 345,
   "new_id": "BROWSER-DEVCOM-PRA-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DEVCOM-PRA-01",
   "old_text": "The engineering blog (browser-use.com/posts) functions as a long-form knowledge-sharing and incident retrospective channel, publishing detailed post-mortems and architecture deep-dives accessible to the broader community. [q-48] [q-49] [q-50]"
  },
  {
   "row": 346,
   "new_id": "BROWSER-DEVCOM-TOO-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DEVCOM-TOO-01",
   "old_text": "Slack (main), Discord, GitHub Issues and Pull Requests Twitter/X, and LinkedIn [q-51] [q-52] [q-53]"
  },
  {
   "row": 347,
   "new_id": "BROWSER-DEVCOM-STK-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DEVCOM-STK-01",
   "old_text": "The engineering team uses Slack as its internal communication layer for evaluation-driven decision-making — deciding model upgrades, prompt changes, and code fixes based on Claude-generated analysis. [q-109]"
  },
  {
   "row": 348,
   "new_id": "BROWSER-DEVCOM-OTH-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DEVCOM-OTH-01",
   "old_text": "A public status page at status.browser-use.com provides real-time incident transparency for all users of the cloud service. [q-111]"
  },
  {
   "row": 349,
   "new_id": "BROWSER-DOC-PRA-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DOC-PRA-01",
   "old_text": "They support plenty of documentation. docs.browser-use.com provides structured developer documentation covering quickstart, agent configuration (all parameters), browser configuration, tool customization, production deployment, and API references. It serves both local developers and cloud API consumers. [q-54]"
  },
  {
   "row": 350,
   "new_id": "BROWSER-DOC-TOO-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DOC-TOO-01",
   "old_text": "PostHog collects anonymous usage to help the team understand library adoption patterns and prioritize bug fixes. [q-57] [q-58]"
  },
  {
   "row": 351,
   "new_id": "BROWSER-DOC-STK-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DOC-STK-01",
   "old_text": "The documentation team maintains docs.browser-use.com and the engineering blog, ensuring end users, integrators, and contributors have up-to-date references and architectural context. [q-59]"
  },
  {
   "row": 352,
   "new_id": "BROWSER-DOC-STK-02",
   "agent": "Browser Use",
   "old_id": "BROWSER-DOC-STK-02",
   "old_text": "End users and developers are primary documentation consumers: quickstart guides enable a working agent in under 5 minutes, while parameter references support advanced customization without source-code reading. [q-60]"
  },
  {
   "row": 353,
   "new_id": "BROWSER-DOC-OTH-01",
   "agent": "Browser Use",
   "old_id": "BROWSER-DOC-OTH-01",
   "old_text": "The MIT license and transparent telemetry opt-out policy together reflect an open-source trust stance: the library is free, the data collection is disclosed, and the telemetry code is publicly available for inspection. [q-61]"
  },
  {
   "row": 354,
   "new_id": "GLEAN-SYS-DESC-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-SYS-DESC-01",
   "old_text": "Glean Agents is a closed-source enterprise AI agent. \n  It automates knowledge-work tasks such as engineering standup reports, sales prospecting, code review assistance, and employee onboarding \n  by indexing and reasoning over company data from tools like Slack, GitHub, and Jira."
  },
  {
   "row": 355,
   "new_id": "GLEAN-SYS-DESC-02",
   "agent": "Glean Agents",
   "old_id": "GLEAN-SYS-DESC-02",
   "old_text": "Glean maintains ~35 public auxiliary repositories under the Gleanwork GitHub organization.\n  Primary language: Glean's core Index Server is written in Java. Glean's public tooling repositories are predominantly TypeScript"
  },
  {
   "row": 356,
   "new_id": "GLEAN-SYS-DESC-03",
   "agent": "Glean Agents",
   "old_id": "GLEAN-SYS-DESC-03",
   "old_text": "Glean ships customer-facing releases on a monthly 'Drops' cadence [q-1]"
  },
  {
   "row": 357,
   "new_id": "GLEAN-TEST-PRA-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-PRA-01",
   "old_text": "Glean engineers run structured evaluations on agents using curated evalsets (a set of user instructions and ideal responses) of ~20 real-world examples with ideal responses, graded on a small set of binary sub-metrics (completeness, personalization, tone, groundedness) under a single 'north star' metric."
  },
  {
   "row": 358,
   "new_id": "GLEAN-TEST-PRA-02",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-PRA-02",
   "old_text": "They continuously sample real user queries and feedback (upvotes/downvotes) into the evalset to keep evaluations aligned with evolving usage. [q-2]"
  },
  {
   "row": 359,
   "new_id": "GLEAN-TEST-PRA-03",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-PRA-03",
   "old_text": "The most impactful improvements to AI agents come from a structured feedback loop: refining instructions, structuring context, tuning model parameters, and selecting the right language models. {quote 1}"
  },
  {
   "row": 360,
   "new_id": "GLEAN-TEST-PRA-04",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-PRA-04",
   "old_text": "After each eval run, Glean engineers review failing examples for patterns, then apply fixes in a strict priority order: refine instructions first, then restructure context (point to specific sources, use sub-agents), then tune LLM parameters (e.g. temperature), and only swap the model last [q-3]"
  },
  {
   "row": 361,
   "new_id": "GLEAN-TEST-PRA-05",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-PRA-05",
   "old_text": "Glean advises building evalsets around complex, multi-step tasks first, not simple happy-path queries, because users routinely push agents across multiple sources and reasoning steps, making these the highest-value validation cases. [q-4]"
  },
  {
   "row": 362,
   "new_id": "GLEAN-TEST-TOO-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-TOO-01",
   "old_text": "LLM-as-judge graders aligned to human SME feedback are used alongside continuously running platform-level metrics (accuracy, relevance, completeness, groundedness). [q-5]"
  },
  {
   "row": 363,
   "new_id": "GLEAN-TEST-STK-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-STK-01",
   "old_text": "subject-matter experts (e.g., the sales team for a sales-prospecting agent) [q-6]"
  },
  {
   "row": 364,
   "new_id": "GLEAN-TEST-OTH-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-TEST-OTH-01",
   "old_text": "Glean's published benchmarks show Agentic Engine 2 achieved 94% task completeness, a 21% query increase in testing [q-7] [q-9]"
  },
  {
   "row": 365,
   "new_id": "GLEAN-CICD-PRA-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-CICD-PRA-01",
   "old_text": "Glean built a custom dynamic-deployment mechanism that loads the server from Cloud Storage without restarting, enabling nightly internal rollouts, weekly customer rollouts, and instant rollback via configuration change. [q-38]"
  },
  {
   "row": 366,
   "new_id": "GLEAN-CICD-STK-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-CICD-STK-01",
   "old_text": "Internal engineers [q-10]"
  },
  {
   "row": 367,
   "new_id": "GLEAN-CICD-OTH-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-CICD-OTH-01",
   "old_text": "Each release tag is isolated from other experiments and associated with its own errors, enabling strong versioning across simultaneously running code versions. [q-39]"
  },
  {
   "row": 368,
   "new_id": "GLEAN-CICD-OTH-02",
   "agent": "Glean Agents",
   "old_id": "GLEAN-CICD-OTH-02",
   "old_text": "Glean's hot-swap mechanism is built on custom Java ClassLoaders and ObjectWeb ASM for class-package remapping, loading JAR files from Cloud Storage in seconds. The platform is deployed in single-tenant isolated environments on AWS, Azure, or GCP. [q-40]"
  },
  {
   "row": 369,
   "new_id": "GLEAN-CODEREV-PRA-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-CODEREV-PRA-01",
   "old_text": "GitHub is the code-review platform, augmented by Glean's own PR Review and Resolve GitHub PR Feedback agents. \n  Glean's PR Review agents scan code changes, flag risk areas, aggregate unresolved comments, and produce prioritized checklists to keep review quality consistent as the team scales. [q-12]"
  },
  {
   "row": 371,
   "new_id": "GLEAN-CODEREV-STK-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-CODEREV-STK-01",
   "old_text": "Distributed engineering reviewers; agents support reviewers rather than replace them, with humans still resolving threads. [q-41]"
  },
  {
   "row": 372,
   "new_id": "GLEAN-CODEREV-OTH-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-CODEREV-OTH-01",
   "old_text": "Pull request reviews are identified as one of the most common sources of delay. As teams scale, review quality becomes uneven and feedback cycles lengthen. The automated agent helps reduce iteration times and improve code quality by gathering context from various sources and providing actionable insights. [q-42]"
  },
  {
   "row": 373,
   "new_id": "GLEAN-BUG-PRA-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-BUG-PRA-01",
   "old_text": "Public issues reveal five problem categories: \n  1. security/PII exposure in tool outputs, \n  2. package dependency leaks, \n  3. configuration gaps, \n  4. absent CI test sandboxes requiring live production credentials, and \n  5. schema or documentation inconsistencies causing API rejections. [q-14] [q-15]"
  },
  {
   "row": 375,
   "new_id": "GLEAN-BUG-TOO-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-BUG-TOO-01",
   "old_text": "ObjectWeb ASM tooling and Cloud Storage handle JAR distribution; online config flags enable rollback. Enterprise memory uses reinforcement learning to grade agent runs and derive better tool-use strategies. [q-16]"
  },
  {
   "row": 376,
   "new_id": "GLEAN-SEMETH-PRA-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-SEMETH-PRA-01",
   "old_text": "Glean follows a fast-iteration, experiment-driven methodology: nightly internal rollouts, weekly customer rollouts, and monthly public 'Drops', with every agent run producing context traces that improve the platform's orchestration layer. [q-43]"
  },
  {
   "row": 377,
   "new_id": "GLEAN-SEMETH-STK-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-SEMETH-STK-01",
   "old_text": "Engineering, Product, and PMM contributors co-author public engineering posts, indicating cross-functional ownership of engineering decisions. [q-19]"
  },
  {
   "row": 378,
   "new_id": "GLEAN-SEMETH-OTH-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-SEMETH-OTH-01",
   "old_text": "Glean intentionally avoids monolithic platform design, using a horizontally layered open agent stack (context, models, orchestration, interfaces, security) so each layer evolves independently. [q-20]"
  },
  {
   "row": 379,
   "new_id": "GLEAN-DEVCOM-PRA-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DEVCOM-PRA-01",
   "old_text": "Glean's engineering team uses its own agents as customer-zero: \n  standup agents summarize prior-day PRs and tickets;"
  },
  {
   "row": 380,
   "new_id": "GLEAN-DEVCOM-PRA-02",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DEVCOM-PRA-02",
   "old_text": "Glean shares engineering work via a public blog, LinkedIn, and YouTube channel. [q-44] [q-45]"
  },
  {
   "row": 381,
   "new_id": "GLEAN-DEVCOM-TOO-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DEVCOM-TOO-01",
   "old_text": "Internal coordination uses Slack, GitHub, and Jira (all indexed by Glean); external channels include the engineering blog, LinkedIn, YouTube, and the Gleaniverse community forum. [q-21]"
  },
  {
   "row": 382,
   "new_id": "GLEAN-DEVCOM-STK-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DEVCOM-STK-01",
   "old_text": "All team members participate in collaborative editing of team pages. Engineering teams, product teams, and customer success teams communicate cross-functionally. Meeting participants use AI note-taking tools to capture decisions and action items. [q-47]"
  },
  {
   "row": 383,
   "new_id": "GLEAN-DEVCOM-OTH-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DEVCOM-OTH-01",
   "old_text": "Meetings often take up over 50% of the work week, and key decisions, priorities, and action items often get trapped in meetings or lost entirely. Team pages reduce time spent searching for basic organizational information and provide consistent organizational context. There is a culture of transparency and continuous learning throughout the organization. [q-48]"
  },
  {
   "row": 384,
   "new_id": "GLEAN-DOC-PRA-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DOC-PRA-01",
   "old_text": "Glean engineers publish engineering blog posts covering deployment internals, evaluation methodology, and agent architecture [q-22]"
  },
  {
   "row": 385,
   "new_id": "GLEAN-DOC-TOO-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DOC-TOO-01",
   "old_text": "A Launch Documentation agent assembles release notes from specs, tickets, and merged changes; each public blog post includes an auto-generated 'AI Summary by Glean' [q-23]"
  },
  {
   "row": 386,
   "new_id": "GLEAN-DOC-STK-01",
   "agent": "Glean Agents",
   "old_id": "GLEAN-DOC-STK-01",
   "old_text": "Engineering, Product Management, and Product Marketing contributors [q-24]"
  },
  {
   "row": 387,
   "new_id": "GEMENT-SYS-DESC-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-SYS-DESC-01",
   "old_text": "Google Gemini Enterprise (also marketed as Google Agentspace) is a closed-source enterprise AI agent platform built on Google Cloud that enables organizations to deploy and orchestrate intelligent AI agents for workplace knowledge retrieval, multi-step workflow automation, and enterprise productivity at scale. It offers prebuilt connectors for Confluence, Jira, SharePoint, and ServiceNow, and includes Agent Designer for building custom agents. Deployed as a SaaS on Google Cloud with no public source repository. [q-63]"
  },
  {
   "row": 388,
   "new_id": "GEMENT-TEST-PRA-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-TEST-PRA-01",
   "old_text": "Gemini Enterprise uses a staged feature lifecycle — Private Preview → Public Preview → GA (General Availability)— as a quality gate before features reach all users. Agent Designer went from Private Preview (April 2025) to GA (January 2026), a 9-month staged rollout. [q-1]"
  },
  {
   "row": 389,
   "new_id": "GEMENT-TEST-PRA-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-TEST-PRA-02",
   "old_text": "SLO (Service Level Objective) monitoring is used to assess model quality for newly launched model tiers. After releasing Gemini 3.1 Pro and 3 Flash in Limited Availability, the team explicitly stated it was determining long-term SLOs, indicating SLO-based quality gates for model releases. [q-2]"
  },
  {
   "row": 390,
   "new_id": "GEMENT-TEST-PRA-03",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-TEST-PRA-03",
   "old_text": "Administrator-facing observability tooling (Metrics Explorer, Trace Explorer) allows monitoring of platform quality metrics and distributed traces in production. [q-3]"
  },
  {
   "row": 391,
   "new_id": "GEMENT-TEST-PRA-04",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-TEST-PRA-04",
   "old_text": "[Google-wide, not confirmed Gemini Enterprise-specific]: Google's Test Automation Platform (TAP) handles 50,000+ unique changes and 4 billion test cases per day. Hermetic testing (self-contained environments with no external dependencies) reduces instability."
  },
  {
   "row": 392,
   "new_id": "GEMENT-TEST-TOO-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-TEST-TOO-01",
   "old_text": "Metrics Explorer and Trace Explorer (Google Cloud Observability) for admin-facing quality monitoring in production. [q-4]"
  },
  {
   "row": 393,
   "new_id": "GEMENT-TEST-TOO-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-TEST-TOO-02",
   "old_text": "[Google-wide, not confirmed Gemini Enterprise-specific]: TAP (Test Automation Platform) for CI/CD, Forge for distributed build execution across Google's datacenters."
  },
  {
   "row": 394,
   "new_id": "GEMENT-CICD-PRA-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CICD-PRA-01",
   "old_text": "Gemini Enterprise practices continuous deployment to production, evidenced by near-daily public release notes since January 2025. [q-42]"
  },
  {
   "row": 395,
   "new_id": "GEMENT-CICD-PRA-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CICD-PRA-02",
   "old_text": "Product was formally renamed from Google Agentspace to Gemini Enterprise on October 9, 2025, signaling milestone-based product management. [q-44]"
  },
  {
   "row": 396,
   "new_id": "GEMENT-CICD-PRA-03",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CICD-PRA-03",
   "old_text": "[Google-wide]: Release automation assembles release candidates (RCs) from green head. Any change to Google's codebase can be rolled back with two clicks. Feature flags and experiments are used for selective continuous deployment. [q-45]"
  },
  {
   "row": 397,
   "new_id": "GEMENT-CICD-PRA-04",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CICD-PRA-04",
   "old_text": "[Google-wide]: Large-scale automated code changes across the monorepo use the Rosie tool, which splits changes into separate CLs and sends them out for automated review with presubmit checks. [q-46]"
  },
  {
   "row": 398,
   "new_id": "GEMENT-CICD-TOO-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CICD-TOO-01",
   "old_text": "[Google-wide, not confirmed Gemini Enterprise-specific]: TAP (Test Automation Platform) for CI, Forge for distributed build execution, Rosie for large-scale automated changes across the monorepo. Specific Gemini Enterprise CI/CD tooling is Not Disclosed. [q-47]"
  },
  {
   "row": 399,
   "new_id": "GEMENT-CICD-STK-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CICD-STK-01",
   "old_text": "At Google, each team assigns a “Build Cop” who monitors the build system, ensures all tests pass, and rolls back changes if something breaks. Gemini Enterprise-specific DevOps/SRE team structure is Not Disclosed. [q-48]"
  },
  {
   "row": 400,
   "new_id": "GEMENT-CODEREV-PRA-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CODEREV-PRA-01",
   "old_text": "[Google-wide]: Reviewers approve a CL once it definitely improves overall code health, even if not perfect. Non-mandatory polish comments are prefixed 'Nit:'."
  },
  {
   "row": 401,
   "new_id": "GEMENT-CODEREV-PRA-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CODEREV-PRA-02",
   "old_text": "[Google-wide]: Technical facts and data override personal preferences in code review decisions; on style matters, the official style guide is authoritative. [q-52]"
  },
  {
   "row": 402,
   "new_id": "GEMENT-CODEREV-PRA-03",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CODEREV-PRA-03",
   "old_text": "[Google-wide]: Code reviews should receive a first response within one business day. Large CLs should be split into smaller, reviewable units. [q-54]"
  },
  {
   "row": 403,
   "new_id": "GEMENT-CODEREV-PRA-04",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CODEREV-PRA-04",
   "old_text": "[Google-wide]: Code ownership enforced via OWNERS files at every level of the monorepo file hierarchy, providing granular ownership that scales across thousands of engineers. [q-55]"
  },
  {
   "row": 404,
   "new_id": "GEMENT-CODEREV-STK-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-CODEREV-STK-01",
   "old_text": "[Google-wide]: OWNERS file holders have approval rights for their repository subtrees."
  },
  {
   "row": 405,
   "new_id": "GEMENT-BUG-PRA-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-BUG-PRA-01",
   "old_text": "Bug incidents extracted from public release notes reveal 4 recurring engineering problem categories:\n  1. Security vulnerabilities\n  2. Connector data quality and configuration\n  3. Agent orchestration bugs\n  4. API naming and UI consistency"
  },
  {
   "row": 406,
   "new_id": "GEMENT-BUG-PRA-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-BUG-PRA-02",
   "old_text": "Practice: Bug fixes, security patches, breaking changes, and known issues are all documented in public release notes. Critical security issues are fixed automatically server-side with no user action required. [q-59]"
  },
  {
   "row": 407,
   "new_id": "GEMENT-SEMETH-PRA-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-SEMETH-PRA-01",
   "old_text": "Gemini Enterprise uses admin-controlled feature toggles for model availability, requiring administrator action to enable preview model tiers. (New or experimental AI models are turned off by default, and only an admin can turn them on.) [q-63]"
  },
  {
   "row": 408,
   "new_id": "GEMENT-SEMETH-PRA-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-SEMETH-PRA-02",
   "old_text": "Backward compatibility is explicitly maintained when new platform capabilities are introduced. Existing agent configurations are preserved on the prior editor when new UI experiences are introduced for newly created agents. [q-64]"
  },
  {
   "row": 409,
   "new_id": "GEMENT-SEMETH-PRA-03",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-SEMETH-PRA-03",
   "old_text": "[Google-wide]: Trunk-based development with no long-lived dev branches. The One-Version Rule mandates that developers must never have a choice of which version of a component to depend upon. Work is committed in small increments against the trunk regularly. [q-66]"
  },
  {
   "row": 410,
   "new_id": "GEMENT-SEMETH-PRA-04",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-SEMETH-PRA-04",
   "old_text": "[Google-wide]: Large-scale automated changes across the monorepo executed using Rosie; presubmit checks gate all changes before landing. [q-67]"
  },
  {
   "row": 411,
   "new_id": "GEMENT-SEMETH-TOO-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-SEMETH-TOO-01",
   "old_text": "[Google-wide, not confirmed Gemini Enterprise-specific]: Rosie (large-scale automated changes), Piper (internal centralized VCS), Blaze/Forge (build system)."
  },
  {
   "row": 412,
   "new_id": "GEMENT-DEVCOM-PRA-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-DEVCOM-PRA-01",
   "old_text": "[Google-wide]: Bug reports and issues are open with full comment history visible to all engineers (excluding customer PII), enabling cross-team learning from integration failures. [q-22]"
  },
  {
   "row": 413,
   "new_id": "GEMENT-DEVCOM-PRA-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-DEVCOM-PRA-02",
   "old_text": "[Google-wide]: A unified test reporting system is available so any engineer can look up any build or test run, including all logs, supporting cross-team debugging and collaboration. [q-24]"
  },
  {
   "row": 414,
   "new_id": "GEMENT-DEVCOM-PRA-03",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-DEVCOM-PRA-03",
   "old_text": "[Google-wide]: Code review conflicts that cannot be resolved via comment threads are escalated to face-to-face or video discussions; results must be recorded as a comment on the CL for future readers. [q-72]"
  },
  {
   "row": 415,
   "new_id": "GEMENT-DOC-PRA-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-DOC-PRA-01",
   "old_text": "Gemini Enterprise maintains structured public release notes documenting all production updates: new features, bug fixes, known issues, breaking changes, and deprecated functionality. Release notes are also available as Atom feed, RSS feed, and via BigQuery for programmatic access. [q-25]"
  },
  {
   "row": 416,
   "new_id": "GEMENT-DOC-PRA-02",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-DOC-PRA-02",
   "old_text": "Official documentation is organized into structured sections: Overview, Concepts, How-to guides, API and reference, and Resources — supporting different user profiles (conceptual readers, task-oriented practitioners, API integrators). [q-26]"
  },
  {
   "row": 417,
   "new_id": "GEMENT-DOC-PRA-03",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-DOC-PRA-03",
   "old_text": "New observability metrics are documented at release time with references to monitored resources and metrics pages, indicating documentation is released alongside each feature. [q-27]"
  },
  {
   "row": 418,
   "new_id": "GEMENT-DOC-TOO-01",
   "agent": "Gemini Enterprise",
   "old_id": "GEMENT-DOC-TOO-01",
   "old_text": "Google Cloud documentation platform hosts all official Gemini Enterprise documentation. Release notes distributed via Atom feed, RSS feed, and BigQuery export. [q-28]"
  },
  {
   "row": 419,
   "new_id": "HUBSPOT-SYS-DESC-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SYS-DESC-01",
   "old_text": "Closed-source\n  HubSpot Breeze studio is a CRM-integrated AI agent creation platform in sales, marketing, and customer service with various agents."
  },
  {
   "row": 420,
   "new_id": "HUBSPOT-SYS-DESC-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SYS-DESC-03",
   "old_text": "Java (MCP server, backend infrastructure), TypeScript (developer tools), JavaScript (UI components) [q-1]"
  },
  {
   "row": 421,
   "new_id": "HUBSPOT-TEST-PRA-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-PRA-01",
   "old_text": "HubSpot's testing practice is to use React Testing Library as its official UI testing framework.\n They emphasize user-focused tests over implementation details."
  },
  {
   "row": 422,
   "new_id": "HUBSPOT-TEST-PRA-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-PRA-02",
   "old_text": "In the testing migration, they collected runtime usage metrics across the team and then categorized packages into buckets. The company migrated more than 76,000 tests from Enzyme to React Testing Library and runs frontend tests in the browser rather than JSDOM [q-2]"
  },
  {
   "row": 423,
   "new_id": "HUBSPOT-TEST-PRA-03",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-PRA-03",
   "old_text": "Migration Story: The HubSpot testing team adopts the Testing Trophy strategy when embracing React Testing Library. The Testing Trophy is a testing strategy that prioritizes integration tests as the best balance between confidence and maintenance cost, while still using static, unit, and end-to-end tests appropriately. At first, they documented guides for writing tests with common libraries and developed tools to minimize test fixtures. By adopting this philosophy, teams felt empowered to take on the migration. Then, while maintaining documentation and planning to migrate tests for quarters, they created separate tickets to track the work. But that was a lot of manual effort, so they built an internal system called Monarch as a centralized hub [q-3]"
  },
  {
   "row": 424,
   "new_id": "HUBSPOT-TEST-PRA-04",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-PRA-04",
   "old_text": "Crucible (AI security test agent: Hallucination detection, Agent handoff, token optimization) has served as the foundation for an internal evaluation framework for coding agents [q-4]"
  },
  {
   "row": 425,
   "new_id": "HUBSPOT-TEST-TOO-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-TOO-01",
   "old_text": "React testing library, Monarch, Crucible [q-7] [q-8]"
  },
  {
   "row": 426,
   "new_id": "HUBSPOT-TEST-STK-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-STK-01",
   "old_text": "developers [q-9]"
  },
  {
   "row": 427,
   "new_id": "HUBSPOT-TEST-OTH-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-OTH-01",
   "old_text": "The testing migration spanned 2.5 years with 76,000 tests migrated, peaking at 4,000+ tests per month. Migration was completed in February 2025 using runtime metrics instrumentation rather than static analysis. [q-10]"
  },
  {
   "row": 428,
   "new_id": "HUBSPOT-TEST-OTH-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-TEST-OTH-02",
   "old_text": "CD adoption required ~9 months and ~20 new test suites across 4 repositories. HubSpot deploys up to 100 times per day. [q-11]"
  },
  {
   "row": 429,
   "new_id": "HUBSPOT-CICD-PRA-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CICD-PRA-01",
   "old_text": "HubSpot operates a Kubernetes-based CI/CD system, running over 1 million builds per day across 3,000 EC2 instances that host tens of thousands of microservices. [q-53]"
  },
  {
   "row": 430,
   "new_id": "HUBSPOT-CICD-PRA-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CICD-PRA-02",
   "old_text": "Cloud coding agents use Kubernetes Jobs with custom Docker images that contain Claude Code and developer tooling preinstalled."
  },
  {
   "row": 431,
   "new_id": "HUBSPOT-CICD-PRA-03",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CICD-PRA-03",
   "old_text": "The team reduced slow Java build times by running build agents on a dedicated Kubernetes node pool and reusing a host-mounted build cache, which cuts build times from 10–15 minutes to 2–3 minutes. [q-54]"
  },
  {
   "row": 432,
   "new_id": "HUBSPOT-CICD-PRA-04",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CICD-PRA-04",
   "old_text": "The platform leverages enterprise-grade features like auto-scaling, observability, and region-aware API routing via Cloudflare Workers.\n  HubSpot- company-specific, not specific, agent-based *"
  },
  {
   "row": 433,
   "new_id": "HUBSPOT-CICD-TOO-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CICD-TOO-02",
   "old_text": "An internal build and deploy system built on top of Kubernetes [q-15]"
  },
  {
   "row": 434,
   "new_id": "HUBSPOT-CICD-STK-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CICD-STK-01",
   "old_text": "Infrastructure teams, platform engineering teams, and Developer Experience AI team [q-58]"
  },
  {
   "row": 435,
   "new_id": "HUBSPOT-CICD-OTH-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CICD-OTH-01",
   "old_text": "They build an internal platform for executing cloud coding agents [q-59] [q-60]"
  },
  {
   "row": 436,
   "new_id": "HUBSPOT-CODEREV-PRA-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CODEREV-PRA-01",
   "old_text": "HubSpot uses Sidekick AI code reviewer with Judge Agent quality gate."
  },
  {
   "row": 437,
   "new_id": "HUBSPOT-CODEREV-PRA-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CODEREV-PRA-02",
   "old_text": "Their AI code reviewer catches real issues, understands HubSpot-specific context, and maintains a high signal to noise ratio."
  },
  {
   "row": 438,
   "new_id": "HUBSPOT-CODEREV-PRA-03",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CODEREV-PRA-03",
   "old_text": "After Sidekick drafts a review, the agent receives that output and evaluates it against three core criteria: \n  Succinctness: Is the feedback clear and to the point? \n  Accuracy: Is the suggestion technically correct within the context of the codebase and change? \n  Actionability: If the feedback includes a code suggestion, can it be applied directly without additional modification?"
  },
  {
   "row": 439,
   "new_id": "HUBSPOT-CODEREV-PRA-04",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CODEREV-PRA-04",
   "old_text": "Sidekick uses emoji reaction feedback (👍/👎) and thread replies for continuous improvement, \n  achieving over 80% thumbs up approval rate. The system was rewritten using Aviator, HubSpot's internal Java-based agent framework. [q-61] [q-62]"
  },
  {
   "row": 440,
   "new_id": "HUBSPOT-CODEREV-TOO-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CODEREV-TOO-02",
   "old_text": "Sidekick (AI code review bot), Judge Agent for quality filtering, Aviator (internal Java-based agent framework), multiple AI models (Claude, GPT, Gemini), GitHub CLI, and emoji-based feedback mechanisms [q-22]"
  },
  {
   "row": 441,
   "new_id": "HUBSPOT-CODEREV-STK-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CODEREV-STK-01",
   "old_text": "developers [q-64]"
  },
  {
   "row": 442,
   "new_id": "HUBSPOT-CODEREV-OTH-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-CODEREV-OTH-01",
   "old_text": "Sidekick has reviewed 50,000+ pull requests with 90% time-to-feedback reduction and 80%+ approval rate. The Judge Agent filters reviews based on succinctness, accuracy, and actionability criteria before posting. [q-65]"
  },
  {
   "row": 443,
   "new_id": "HUBSPOT-BUG-PRA-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-BUG-PRA-01",
   "old_text": "HubSpot's bug solving process relies on rapid tracing and automated rollbacks when standard monitoring fails. During the Feb 2026 incident, standard health checks failed to detect a permissions error because endpoints returned successful HTTP 200 responses with incorrect data. The incident was declared 16 minutes after full rollout due to customer support surges, and engineers resolved it via a full automated rollback within 37 minutes total. [q-66]"
  },
  {
   "row": 444,
   "new_id": "HUBSPOT-BUG-PRA-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-BUG-PRA-02",
   "old_text": "Users can easily trigger a planning step on a GitHub issue by directly mentioning our internal bot (\"@SidekickAI create a plan\"). \n  The plan will then be posted as a comment on the issue, where it can be edited by the user before moving on to the implementation step."
  },
  {
   "row": 445,
   "new_id": "HUBSPOT-BUG-TOO-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-BUG-TOO-01",
   "old_text": "comprehensive metrics dashboards for token/API cost monitoring, Monarch for migration campaign tracking, and emoji reaction feedback for continuous improvement of AI agents [q-68]"
  },
  {
   "row": 446,
   "new_id": "HUBSPOT-BUG-STK-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-BUG-STK-01",
   "old_text": "Infrastructure Team, reliability Engineer authored incident report [q-69]"
  },
  {
   "row": 447,
   "new_id": "HUBSPOT-BUG-OTH-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-BUG-OTH-01",
   "old_text": "HubSpot Breeze is closed-source with no public issue tracker. The Feb 2026 incident revealed that HTTP 200 responses with incorrect data bypassed standard error-rate monitoring — prompting a shift to response-correctness metrics. [q-70]"
  },
  {
   "row": 448,
   "new_id": "HUBSPOT-SEMETH-PRA-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SEMETH-PRA-01",
   "old_text": "They prioritize rapid execution over perfect planning, moving from ideation to shipped product in hours or days."
  },
  {
   "row": 449,
   "new_id": "HUBSPOT-SEMETH-PRA-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SEMETH-PRA-02",
   "old_text": "Work is driven by small, highly focused units of 3-4 engineers. Technical leaders act as hands-on, active contributors rather than traditional managers. Teams prioritize shipping quickly over perfect planning, with calculated risk-taking and low bureaucracy tolerance. [q-72]"
  },
  {
   "row": 450,
   "new_id": "HUBSPOT-SEMETH-PRA-03",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SEMETH-PRA-03",
   "old_text": "AI fluency is a mandatory baseline for all engineers. They have deeply embedded AI agents into their daily workflows, PRs, and code reviews, and identify test vulnerabilities to ship faster and with higher confidence. [q-71]"
  },
  {
   "row": 451,
   "new_id": "HUBSPOT-SEMETH-PRA-04",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SEMETH-PRA-04",
   "old_text": "They use Crucible Agent to track the execution of history, input and output tokens, the API server, and Kubernetes jobs, mainly for tracking their agentic products and deployments. [q-74]"
  },
  {
   "row": 452,
   "new_id": "HUBSPOT-SEMETH-TOO-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SEMETH-TOO-01",
   "old_text": "Crucible Agent [q-75]"
  },
  {
   "row": 453,
   "new_id": "HUBSPOT-SEMETH-STK-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SEMETH-STK-01",
   "old_text": "Tech leads, Engineering leads [q-76]"
  },
  {
   "row": 454,
   "new_id": "HUBSPOT-SEMETH-OTH-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-SEMETH-OTH-01",
   "old_text": "They move fast and take calculated risks. [q-77]"
  },
  {
   "row": 455,
   "new_id": "HUBSPOT-DEVCOM-PRA-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DEVCOM-PRA-01",
   "old_text": "HubSpot uses emoji reactions (like, dislike) and thread replies for feedback on code reviews,"
  },
  {
   "row": 456,
   "new_id": "HUBSPOT-DEVCOM-PRA-02",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DEVCOM-PRA-02",
   "old_text": "Team culture emphasizes psychological safety, mutual support, and continuous feedback."
  },
  {
   "row": 457,
   "new_id": "HUBSPOT-DEVCOM-TOO-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DEVCOM-TOO-01",
   "old_text": "Github,Discord, and slack [q-38]"
  },
  {
   "row": 458,
   "new_id": "HUBSPOT-DEVCOM-STK-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DEVCOM-STK-01",
   "old_text": "All HubSpot engineers participate in team communication, supported by Developer Experience AI team, product teams, and engineering leadership fostering psychologically safe environment. [q-78]"
  },
  {
   "row": 459,
   "new_id": "HUBSPOT-DEVCOM-OTH-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DEVCOM-OTH-01",
   "old_text": "Communication philosophy prioritizes reducing friction by meeting users in their existing tools (GitHub, Slack) rather than requiring new platforms. Feedback culture is continuous with emphasis on psychological safety and constant improvement. [q-79]"
  },
  {
   "row": 460,
   "new_id": "HUBSPOT-DOC-PRA-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DOC-PRA-01",
   "old_text": "HubSpot offers two distinct MCP servers (one for CRM access, one for Developer Platform) with comprehensive documentation at developers.hubspot.com/mcp. [q-39] [q-40]"
  },
  {
   "row": 461,
   "new_id": "HUBSPOT-DOC-STK-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DOC-STK-01",
   "old_text": "developers [q-42]"
  },
  {
   "row": 462,
   "new_id": "HUBSPOT-DOC-OTH-01",
   "agent": "Hubspot breeze Studio",
   "old_id": "HUBSPOT-DOC-OTH-01",
   "old_text": "Documentation strategy includes two MCP servers (remote CRM access + local Developer Platform), comprehensive NPM package documentation, testing guides for common libraries, EPIC Week annual conference for knowledge sharing, and example-driven documentation optimized for AI model integration. [q-43]"
  },
  {
   "row": 463,
   "new_id": "WATSONX-SYS-DESC-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-SYS-DESC-01",
   "old_text": "IBM Watsonx Orchestrate is an enterprise AI workflow orchestration platform that \n  enables organizations to build, deploy, and manage AI agents automating business processes across domains such as HR, IT, and finance."
  },
  {
   "row": 464,
   "new_id": "WATSONX-SYS-DESC-02",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-SYS-DESC-02",
   "old_text": "Programming language: Python. The core WatsonX Orchestrate platform itself is closed-source; only the Agent Development Kit (ADK) is publicly available.\n  Update Frequency: 1 bi-weekly release, 61 contributors, 153 stars (ADK). [q-49]"
  },
  {
   "row": 465,
   "new_id": "WATSONX-TEST-PRA-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-PRA-01",
   "old_text": "The IBM Watsonx Orchestrate Agent Development Kit (ADK) is a set of tools designed to make it easy to build and deploy agents using IBM Watsonx Orchestrate. Contributors run, build, and test the ADK locally with new feature, enhancement. After that, they can connect to a production instance of watsonx orchestrate. [q-2]"
  },
  {
   "row": 466,
   "new_id": "WATSONX-TEST-PRA-02",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-PRA-02",
   "old_text": "Build-Time Evaluation Experience — a simulation engine that lets builders run hundreds of synthetic conversations against an agent from within the UI before any real user sees it. [q-3]"
  },
  {
   "row": 467,
   "new_id": "WATSONX-TEST-PRA-03",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-PRA-03",
   "old_text": "The developer can navigate a structured execution timeline and inspect the input, reasoning, and output at each individual step in the Debug Experience."
  },
  {
   "row": 468,
   "new_id": "WATSONX-TEST-PRA-04",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-PRA-04",
   "old_text": "The ADK ships a built-in red-teaming command group that simulates 15+ adversarial attack types against an agent. (prompt injection, instruction override). Builders run a subset of attacks first to validate their setup, then expand for broader variant coverage. [q-6]"
  },
  {
   "row": 469,
   "new_id": "WATSONX-TEST-PRA-05",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-PRA-05",
   "old_text": "The evaluation framework in the ADK is designed to assess agent behavior by comparing simulated agent interactions, referred to as trajectories, against a predefined set of reference data. [q-50]"
  },
  {
   "row": 470,
   "new_id": "WATSONX-TEST-TOO-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-TOO-01",
   "old_text": "Hatch (Python testing tool), OpenTelemetry (OTEL) spans power the Debug Experience and trace view [q-51]"
  },
  {
   "row": 471,
   "new_id": "WATSONX-TEST-STK-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-STK-01",
   "old_text": "Product engineers. [q-9]"
  },
  {
   "row": 472,
   "new_id": "WATSONX-TEST-OTH-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-TEST-OTH-01",
   "old_text": "The developers define and assess success criteria such as expected tool calls with desired parameters and final response quality [q-10]"
  },
  {
   "row": 473,
   "new_id": "WATSONX-CICD-PRA-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CICD-PRA-01",
   "old_text": "Average 2 minor releases per month, \n  The Developer Edition ships as a Docker Compose application managed through the `orchestrate server` CLI. [q-11] [q-12] [q-13]"
  },
  {
   "row": 474,
   "new_id": "WATSONX-CICD-TOO-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CICD-TOO-01",
   "old_text": "Github release, Docker Compose [q-14]"
  },
  {
   "row": 475,
   "new_id": "WATSONX-CICD-STK-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CICD-STK-01",
   "old_text": "Internal developers [q-16]"
  },
  {
   "row": 476,
   "new_id": "WATSONX-CICD-OTH-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CICD-OTH-01",
   "old_text": "The 2.0.0 release in November 2025 was the most structurally disruptive, requiring users to delete their entire local Developer Edition install (docker system prune -a --volumes) before upgrading. The team removed all default credentials for Developer Edition services and hardened the default security posture — a deliberate choice to eliminate shared-secret anti-patterns even at the cost of a one-time migration burden for existing developers. [q-15]"
  },
  {
   "row": 477,
   "new_id": "WATSONX-CODEREV-PRA-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CODEREV-PRA-01",
   "old_text": "GitHub pull requests are the main code review channel. Every change, whether it is a security fix, a documentation update, or a new release; requires at least one peer approval before it can be merged. [q-17]\n  Commit messages follow a consistent structured format that identifies what type of change was made and which part of the system it affected. This makes it straightforward to track what changed, generate release notes automatically, and separate documentation updates from functional changes. [q-18]"
  },
  {
   "row": 478,
   "new_id": "WATSONX-CODEREV-PRA-02",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CODEREV-PRA-01",
   "old_text": "GitHub pull requests are the main code review channel. Every change, whether it is a security fix, a documentation update, or a new release; requires at least one peer approval before it can be merged. [q-17]\n  Commit messages follow a consistent structured format that identifies what type of change was made and which part of the system it affected. This makes it straightforward to track what changed, generate release notes automatically, and separate documentation updates from functional changes. [q-18]"
  },
  {
   "row": 479,
   "new_id": "WATSONX-CODEREV-TOO-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CODEREV-TOO-01",
   "old_text": "GitHub pull requests, contributors [q-20]"
  },
  {
   "row": 480,
   "new_id": "WATSONX-CODEREV-STK-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CODEREV-STK-01",
   "old_text": "specific team members designated as owners for different parts of the codebase [q-21]"
  },
  {
   "row": 481,
   "new_id": "WATSONX-CODEREV-OTH-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-CODEREV-OTH-01",
   "old_text": "The code review process is intentionally lightweight — one approval, clear ownership, and consistent commit message formatting. This keeps the review process fast without sacrificing accountability, allowing the team to ship updates frequently. [q-53]"
  },
  {
   "row": 482,
   "new_id": "WATSONX-BUG-PRA-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-BUG-PRA-01",
   "old_text": "Issues resolved by the team fall into five recurring categories: (1) Environment and connectivity (2) Agent configuration and behavior (3) Data import and export (4) Authentication (5) UI inconsistencies [q-22]"
  },
  {
   "row": 483,
   "new_id": "WATSONX-BUG-PRA-02",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-BUG-PRA-02",
   "old_text": "The IBM community forum functions as an external bug-signal channel: builders report issues that the engineering team monitors and typically addresses in the next release cycle. Known issues are explicitly called out in release notes. [q-23]"
  },
  {
   "row": 484,
   "new_id": "WATSONX-BUG-PRA-03",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-BUG-PRA-03",
   "old_text": "Customers of watsonx Orchestrate can raise issues with the ADK or the Developer Edition server to IBM Support {Quote 3}"
  },
  {
   "row": 485,
   "new_id": "WATSONX-BUG-TOO-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-BUG-TOO-01",
   "old_text": "IBM Support portal for enterprise customer tickets [q-24]"
  },
  {
   "row": 486,
   "new_id": "WATSONX-BUG-STK-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-BUG-STK-01",
   "old_text": "Core Maintainers [q-25]"
  },
  {
   "row": 487,
   "new_id": "WATSONX-SEMETH-PRA-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-SEMETH-PRA-01",
   "old_text": "The ADK documentation formalizes a four-stage iterative development lifecycle that every builder follows before deploying an agent to production:"
  },
  {
   "row": 488,
   "new_id": "WATSONX-SEMETH-PRA-02",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-SEMETH-PRA-02",
   "old_text": "(1) Develop — build and configure the agent using the ADK CLI and Python tools; \n  (2) Evaluate — run the trajectory evaluation suite against a ground-truth dataset to measure Journey Success; \n  (3) Analyze — inspect failing trajectories to identify whether bugs lie in tool definitions, agent instructions, or parameter routing; \n  (4) Improve - update the relevant artifact, re-run evaluations, and watch the score change. This loop is designed to repeat as many times as needed within the Developer Edition before production deployment ever occurs [q-26]"
  },
  {
   "row": 489,
   "new_id": "WATSONX-SEMETH-PRA-03",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-SEMETH-PRA-03",
   "old_text": "Developer tooling investment, like enhancing VS Code extension features, agent communication directly from CLI, reflects a philosophy of eliminating friction at every stage of the engineering loop."
  },
  {
   "row": 490,
   "new_id": "WATSONX-SEMETH-TOO-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-SEMETH-TOO-01",
   "old_text": "The ADK added Agent-to-Agent (A2A) protocol support, enabling external agents to communicate natively with watsonx Orchestrate agents through a standardized interface. [q-30]"
  },
  {
   "row": 491,
   "new_id": "WATSONX-SEMETH-STK-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-SEMETH-STK-01",
   "old_text": "The methodology is shaped by a 61-contributor team distributed across IBM's enterprise AI organization. Flow-builder specialists own the workflow authoring subsystem. Community feedback from 461 forum threads shapes the product roadmap through the Gustavo Villegas Technical Touchpoint newsletter. [q-31]"
  },
  {
   "row": 492,
   "new_id": "WATSONX-DEVCOM-PRA-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DEVCOM-PRA-01",
   "old_text": "The most visible form of internal team coordination is through GitHub itself. Pull request descriptions, reviewer assignments via module ownership, and structured commit messages serve as the team's asynchronous coordination layer [q-32] [q-33] [q-34]"
  },
  {
   "row": 493,
   "new_id": "WATSONX-DEVCOM-TOO-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DEVCOM-TOO-01",
   "old_text": "Github pull request is the primary source\n  IBM's internal communication platforms (such as Slack, Microsoft Teams, or internal wikis) are not publicly disclosed. [q-35]"
  },
  {
   "row": 494,
   "new_id": "WATSONX-DEVCOM-STK-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DEVCOM-STK-01",
   "old_text": "Internal coordination involves the module owners defined in CODEOWNERS, the release engineers who consolidate multi-squad contributions, and the feature engineers who author PRs. IBM does not publicly disclose whether it uses engineering managers, scrum masters, or designated leads to facilitate internal team communication. [q-57]"
  },
  {
   "row": 495,
   "new_id": "WATSONX-DEVCOM-OTH-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DEVCOM-OTH-01",
   "old_text": "The team does maintain external communication channels — a monthly community newsletter, a public community forum, and live Ask Me Anything sessions tied to major product events. These channels are IBM-to-community communication, not internal team communication. IBM's internal communication practices (meetings, design docs, RFCs, chat tools) are not publicly available. [q-58]"
  },
  {
   "row": 496,
   "new_id": "WATSONX-DOC-PRA-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DOC-PRA-01",
   "old_text": "The IBM team maintains a comprehensive developer documentation portal at developer.watson-orchestrate.ibm.com that covers the full builder journey end to end: ADK CLI reference, Developer Edition setup, agent authoring patterns, evaluation framework, and red-teaming. [q-36] [q-37] [q-38] [q-39]"
  },
  {
   "row": 497,
   "new_id": "WATSONX-DOC-TOO-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DOC-TOO-01",
   "old_text": "Documentation stack: developer.watson-orchestrate.ibm.com (primary ADK developer docs), IBM Docs at ibm.com/docs/en/watsonx/watson-orchestrate (official product documentation), GitHub Releases (technical changelog and migration guides), IBM community forum (126 practitioner blogs) [q-40]"
  },
  {
   "row": 498,
   "new_id": "WATSONX-DOC-STK-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DOC-STK-01",
   "old_text": "Documentation is maintained by a distributed group: Darragh-McGonigle and Alex Haynes own the README; @Eric-Grehan and @erifsx manage CODEOWNERS and release notes; Bruno Fernandes Dos Santos, Kelly To, and Alex Straley author feature announcement blog posts in the IBM community; and the IBM technical writing team handles IBM Docs and IBM Style compliance. All documentation changes flow through the same PR review gate as code. [q-41]"
  },
  {
   "row": 499,
   "new_id": "WATSONX-DOC-OTH-01",
   "agent": "WatsonX Orchestrate",
   "old_id": "WATSONX-DOC-OTH-01",
   "old_text": "The ADK developer documentation spans multiple content types: conceptual guides, CLI reference pages, how-to walkthroughs, evaluation framework schema definitions, red-teaming attack catalog, and per-version release notes. As of May 2026, a dedicated ADK release notes page (developer.watson-orchestrate.ibm.com/release/release) documents the full feature and bug-fix history from 2.0.0 through the current release, making it the authoritative changelog for builders who need to understand what changed between versions. [q-42]"
  }
 ]
};
