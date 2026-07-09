const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';  // ← replace this
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

async function fetchSheetData() {
  const response = await fetch(SHEET_URL);
  const text = await response.text();
  // Google wraps the JSON in a callback — strip it
  const json = JSON.parse(text.substring(47).slice(0, -2));
  return json.table.rows;
}