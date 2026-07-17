// Same deployed Apps Script Web App used to submit the form (js/form.js) — reused
// here for reads so the raw Sheet never has to be shared "Anyone with the link".
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyE400Me1cgiMb_PQwT9cNqb9x_X9uNa0mYUYlvIrUQxL29IqC8RJJhfblsTjXmvkUtQw/exec';

// localStorage key shared with any page that wants to read the cached data
// (e.g. map.html) via: JSON.parse(localStorage.getItem('ccSheetData')).
const SHEET_CACHE_KEY = 'ccSheetData';

async function fetchAllSheets() {
  const response = await fetch(`${GAS_WEB_APP_URL}?action=read`);
  const json = await response.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'Failed to read sheet data');
  }

  const data = {
    submission: json.submission,
    project_year: json.project_year,
    target_area: json.target_area,
    fetchedAt: Date.now()
  };

  localStorage.setItem(SHEET_CACHE_KEY, JSON.stringify(data));

  //console.log('Submission:', data.submission);
  //console.log('Project_Year:', data.project_year);
  //console.log('Target_Area:', data.target_area);

  // Fetch is async, so anything reading the cache on page load (e.g. data-transform.js)
  // may run before this resolves — notify listeners once the fresh data actually lands.
  window.dispatchEvent(new CustomEvent('ccSheetDataReady', { detail: data }));

  return data;
}

fetchAllSheets().catch(err => console.error('fetchAllSheets failed:', err));
