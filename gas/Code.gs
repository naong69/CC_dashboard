/**
 * Apps Script backend for the ACE/MARS survey form.
 *
 * Setup (works from ANY Google account, independent of which account owns the target Sheet):
 *   1. In the target Google Sheet's URL, copy the ID between /d/ and /edit —
 *      paste it into SHEET_ID below.
 *   2. Share that Sheet (Editor access) with whichever Google account will run this script,
 *      if it isn't already the owner.
 *   3. Go to script.google.com (logged in as the account that will run/own the deployment),
 *      create a new standalone project, paste this file in as Code.gs.
 *   4. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *   5. Paste the resulting /exec URL into GAS_WEB_APP_URL in js/form.js.
 *
 * Expects three sheets already present in SHEET_ID with header rows matching:
 *   Submission:   submission_id, timestamp, project_name, project_important,
 *                 public, private, people, N, E, T, C, A, P, MARS
 *   Project_Year: submission_id, year
 *   Target_Area:  submission_id, area_no, province_name, node, region,
 *                 L1, L2, L3, L4, L5, L6
 */

const SHEET_ID = '1q5au591A-UNJka_0jGM7dEIdyQFigH20F8PsEcqz4ks';

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!SHEET_ID || SHEET_ID.includes('PASTE_YOUR')) {
      throw new Error('SHEET_ID is not set in Code.gs');
    }

    // Hidden-iframe form POST delivers the JSON as e.parameter.payload (form-encoded);
    // a direct fetch() with a raw JSON body delivers it as e.postData.contents. Support both.
    const raw = (e.parameter && e.parameter.payload) || (e.postData && e.postData.contents);
    const data = JSON.parse(raw);
    const ss = SpreadsheetApp.openById(SHEET_ID);

    const submissionId = Utilities.getUuid();
    const timestamp = new Date();

    appendSubmission_(ss, submissionId, timestamp, data);
    appendProjectYears_(ss, submissionId, data.years || []);
    appendTargetAreas_(ss, submissionId, data.areas || []);

    return jsonResponse_({ status: 'success', submission_id: submissionId });
  } catch (err) {
    return jsonResponse_({ status: 'error', message: err.message });
  } finally {
    lock.releaseLock();
  }
}

// GET /exec               -> health check (open the Web App URL in a browser to confirm it's live)
// GET /exec?action=read   -> returns { submission, project_year, target_area } row arrays
function doGet(e) {
  if (e.parameter && e.parameter.action === 'read') {
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      return jsonResponse_({
        status: 'success',
        submission: getSheet_(ss, 'Submission').getDataRange().getValues(),
        project_year: getSheet_(ss, 'Project_Year').getDataRange().getValues(),
        target_area: getSheet_(ss, 'Target_Area').getDataRange().getValues(),
      });
    } catch (err) {
      return jsonResponse_({ status: 'error', message: err.message });
    }
  }
  return jsonResponse_({ status: 'ok', message: 'Form submission endpoint is running.' });
}

function appendSubmission_(ss, submissionId, timestamp, data) {
  const sheet = getSheet_(ss, 'Submission');
  sheet.appendRow([
    submissionId,
    timestamp,
    data.project_name || '',
    data.project_important || '',
    data.public || '',
    data.private || '',
    data.people || '',
    data.N || '',
    data.E || '',
    data.T || '',
    data.C || '',
    data.A || '',
    data.P || '',
    data.MARS || '',
  ]);
}

function appendProjectYears_(ss, submissionId, years) {
  if (!years.length) return;
  const sheet = getSheet_(ss, 'Project_Year');
  const rows = years.map(year => [submissionId, year]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function appendTargetAreas_(ss, submissionId, areas) {
  if (!areas.length) return;
  const sheet = getSheet_(ss, 'Target_Area');
  const rows = areas.map(area => [
    submissionId,
    area.area_no,
    area.province_name || '',
    area.node || '',
    area.region || '',
    !!area.L1,
    !!area.L2,
    !!area.L3,
    !!area.L4,
    !!area.L5,
    !!area.L6,
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function getSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" not found`);
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
