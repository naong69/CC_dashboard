(() => {
  // Reads data.submission (header row + rows from the Submission sheet), counts
  // unique submission_id values, and saves the count into localStorage so
  // ui-chart.js can read it without re-touching the raw sheet data.
  function getProjectCountStat(data) {
    if (!data || !Array.isArray(data.submission) || data.submission.length < 2) return;

    const [header, ...rows] = data.submission;
    const idIndex = header.indexOf('submission_id');
    if (idIndex === -1) return;

    const uniqueSubmissionIds = new Set(rows.map(row => row[idIndex]));
    localStorage.setItem('projectCountStat', String(uniqueSubmissionIds.size));
  }

  // Reads data.project_year (header row + [submission_id, year] rows from the
  // Project_Year sheet), counts how many rows fall in each year, and saves the
  // sorted categories/series data (plus min/max year) into localStorage.
  function getProjectCountByYear(data) {
    if (!data || !Array.isArray(data.project_year) || data.project_year.length < 2) return;

    const [header, ...rows] = data.project_year;
    const yearIndex = header.indexOf('year');
    if (yearIndex === -1) return;

    const yearCounts = new Map();
    rows.forEach(row => {
      const year = row[yearIndex];
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    });

    const sortedYears = [...yearCounts.keys()].sort((a, b) => a - b);

    localStorage.setItem('projectCountByYear', JSON.stringify({
      categories: sortedYears.map(String),
      seriesData: sortedYears.map(year => yearCounts.get(year)),
      minYear: sortedYears[0],
      maxYear: sortedYears[sortedYears.length - 1]
    }));
  }

  // Reads data.target_area (header row + [submission_id, area_no, province_name,
  // node, region, L1..L6] rows from the Target_Area sheet). A submission can have
  // multiple target-area rows in the same region (different provinces), so first
  // dedupe to unique (submission_id, region) combinations before counting how many
  // submissions touch each region, then save the region -> count map to localStorage.
  function getProjectCountByRegion(data) {
    if (!data || !Array.isArray(data.target_area) || data.target_area.length < 2) return;

    const [header, ...rows] = data.target_area;
    const idIndex = header.indexOf('submission_id');
    const regionIndex = header.indexOf('region');
    if (idIndex === -1 || regionIndex === -1) return;

    const uniqueSubmissionRegions = new Set(
      rows.map(row => `${row[idIndex]}|${row[regionIndex]}`)
    );

    const regionCounts = {};
    uniqueSubmissionRegions.forEach(key => {
      const region = key.split('|')[1];
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    localStorage.setItem('projectCountByRegion', JSON.stringify(regionCounts));
  }

  // Reads data.submission (header row + rows from the Submission sheet). The
  // "public"/"private"/"people" columns hold the target-group textarea text when
  // that checkbox was ticked (see js/form.js buildSubmissionPayload) or '' otherwise,
  // so counting non-blank cells per column gives the count of submissions targeting
  // each group. Saves the { public, private, people } counts to localStorage.
  function getTargetGroupCount(data) {
    if (!data || !Array.isArray(data.submission) || data.submission.length < 2) return;

    const [header, ...rows] = data.submission;
    const columns = ['public', 'private', 'people'];
    const indexes = columns.map(col => header.indexOf(col));
    if (indexes.some(i => i === -1)) return;

    const isFilled = value => value !== undefined && value !== null && String(value).trim() !== '';

    const targetGroupCounts = {};
    columns.forEach((col, i) => {
      targetGroupCounts[col] = rows.filter(row => isFilled(row[indexes[i]])).length;
    });

    localStorage.setItem('targetGroupCounts', JSON.stringify(targetGroupCounts));
  }

  // Reads data.submission (header row + rows from the Submission sheet), counts
  // non-blank cells in each of the N/E/T/C/A/P columns, and saves the { N, E, T, C,
  // A, P } counts to localStorage.
  function getNETCAPCount(data) {
    if (!data || !Array.isArray(data.submission) || data.submission.length < 2) return;

    const [header, ...rows] = data.submission;
    const columns = ['N', 'E', 'T', 'C', 'A', 'P'];
    const indexes = columns.map(col => header.indexOf(col));
    if (indexes.some(i => i === -1)) return;

    const isFilled = value => value !== undefined && value !== null && String(value).trim() !== '';

    const netcapCounts = {};
    columns.forEach((col, i) => {
      netcapCounts[col] = rows.filter(row => isFilled(row[indexes[i]])).length;
    });

    localStorage.setItem('netcapCounts', JSON.stringify(netcapCounts));
  }

  // Reads data.submission (header row + rows from the Submission sheet). The
  // "MARS" column holds a single selected code per submission (the mars radio
  // group in js/form.js, e.g. "M1"), so this counts how many submissions picked
  // each of the M1-M6/A1-A8/R1-R8/S1-S5 codes and saves that map to localStorage.
  function getMARSCount(data) {
    if (!data || !Array.isArray(data.submission) || data.submission.length < 2) return;

    const [header, ...rows] = data.submission;
    const marsIndex = header.indexOf('MARS');
    if (marsIndex === -1) return;

    const marsCodes = [
      'M1', 'M2', 'M3', 'M4', 'M5', 'M6',
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
      'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8',
      'S1', 'S2', 'S3', 'S4', 'S5'
    ];

    const marsCounts = {};
    marsCodes.forEach(code => { marsCounts[code] = 0; });

    rows.forEach(row => {
      const code = row[marsIndex];
      if (marsCounts.hasOwnProperty(code)) marsCounts[code]++;
    });

    localStorage.setItem('marsCounts', JSON.stringify(marsCounts));
  }

  function prepareData(data) {
    if (!data) return;
    getProjectCountStat(data);
    getProjectCountByYear(data);
    getProjectCountByRegion(data);
    getTargetGroupCount(data);
    getNETCAPCount(data);
    getMARSCount(data);
    window.dispatchEvent(new CustomEvent('ccDataPrepared'));
  }

  // Prepare once immediately in case a cache already exists from a previous page
  // load, then again once js/sheet.js's async fetch actually lands (ccSheetDataReady).
  prepareData(JSON.parse(localStorage.getItem('ccSheetData') || 'null'));
  window.addEventListener('ccSheetDataReady', e => prepareData(e.detail));
})();
