(() => {
  // Full list of province names ("จังหวัด"), loaded once from the same CSV js/form.js
  // uses for autocomplete. getProjectCountByProvince() needs this so every province
  // appears in its output (with value: 0) even if no submission touched it yet.
  let provinceNames = [];

  fetch('data/thailand_provinces.csv')
    .then(res => res.text())
    .then(text => {
      const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
      lines.shift(); // header: ลำดับ,จังหวัด,ภาค,Node,Region
      provinceNames = lines
        .map(line => line.split(',')[1]?.trim())
        .filter(Boolean);

      // The CSV may finish loading after data was already prepared once — re-run so
      // getProjectCountByProvince() gets a chance to run with the full province list.
      prepareData(JSON.parse(localStorage.getItem('ccSheetData') || 'null'));
    })
    .catch(err => console.warn('Could not load data/thailand_provinces.csv — getProjectCountByProvince disabled.', err));

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

  // Reads data.target_area (header row + [submission_id, area_no, province_name,
  // node, region, L1..L6] rows from the Target_Area sheet), counts how many rows
  // fall in each province, and maps that onto the full CSV province list (so every
  // province is present, defaulting to 0) as [{ name, value }, ...]. Saves that array
  // plus the max value found to localStorage.
  function getProjectCountByProvince(data) {
    if (!provinceNames.length) return; // CSV hasn't loaded yet
    if (!data || !Array.isArray(data.target_area) || data.target_area.length < 2) return;

    const [header, ...rows] = data.target_area;
    const provinceIndex = header.indexOf('province_name');
    if (provinceIndex === -1) return;

    const provinceCounts = new Map();
    rows.forEach(row => {
      const province = row[provinceIndex];
      if (!province) return;
      provinceCounts.set(province, (provinceCounts.get(province) || 0) + 1);
    });

    const result = provinceNames.map(name => ({
      name,
      value: provinceCounts.get(name) || 0
    }));

    const maxValue = Math.max(0, ...provinceCounts.values());

    localStorage.setItem('projectCountByProvince', JSON.stringify(result));
    localStorage.setItem('projectCountByProvinceMax', String(maxValue));
  }

  // Reads data.target_area (header row + [submission_id, area_no, province_name,
  // node, region, L1..L6] rows from the Target_Area sheet), counts how many rows
  // fall in each node, and maps that onto the full N0-N16 node list (so every node
  // is present, defaulting to 0). Saves the { N0: n, ..., N16: n } map to localStorage.
  function getProjectCountByNode(data) {
    if (!data || !Array.isArray(data.target_area) || data.target_area.length < 2) return;

    const [header, ...rows] = data.target_area;
    const nodeIndex = header.indexOf('node');
    if (nodeIndex === -1) return;

    const nodeList = Array.from({ length: 17 }, (_, i) => `N${i}`); // N0..N16

    const nodeCounts = {};
    nodeList.forEach(node => { nodeCounts[node] = 0; });

    rows.forEach(row => {
      const node = row[nodeIndex];
      if (nodeCounts.hasOwnProperty(node)) nodeCounts[node]++;
    });

    localStorage.setItem('projectCountByNode', JSON.stringify(nodeCounts));
  }

  // Reads data.target_area (header row + [submission_id, area_no, province_name,
  // node, region, L1..L6] rows) and links each row to its submission via
  // submission_id to read that submission's N/E/T/C/A/P columns from data.submission.
  // For every target_area row, tallies which of N/E/T/C/A/P are non-blank against
  // that row's province/node/region, producing [{ name, N, E, T, C, A, P, sum }, ...]
  // for each. Province is padded onto the full CSV province list (0-filled) — same
  // as getProjectCountByProvince — and its max "sum" is saved separately from
  // getProjectCountByProvince's own 'projectCountByProvinceMax' (different metric),
  // since a NETCAP-scaled map needs its own max. Node is padded onto N0-N16; region
  // only includes whichever region values actually appear in the data.
  function getNETCAPCountByProvince(data) {
    if (!provinceNames.length) return; // CSV hasn't loaded yet
    if (!data || !Array.isArray(data.target_area) || data.target_area.length < 2) return;
    if (!Array.isArray(data.submission) || data.submission.length < 2) return;

    const netcapColumns = ['N', 'E', 'T', 'C', 'A', 'P'];

    const [subHeader, ...subRows] = data.submission;
    const subIdIndex = subHeader.indexOf('submission_id');
    const netcapIndexes = netcapColumns.map(col => subHeader.indexOf(col));
    if (subIdIndex === -1 || netcapIndexes.some(i => i === -1)) return;

    const isFilled = value => value !== undefined && value !== null && String(value).trim() !== '';

    // submission_id -> { N: bool, E: bool, ... }
    const submissionNetcap = new Map();
    subRows.forEach(row => {
      const flags = {};
      netcapColumns.forEach((col, i) => { flags[col] = isFilled(row[netcapIndexes[i]]); });
      submissionNetcap.set(row[subIdIndex], flags);
    });

    const [taHeader, ...taRows] = data.target_area;
    const taIdIndex = taHeader.indexOf('submission_id');
    const provinceIndex = taHeader.indexOf('province_name');
    const nodeIndex = taHeader.indexOf('node');
    const regionIndex = taHeader.indexOf('region');
    if (taIdIndex === -1 || provinceIndex === -1 || nodeIndex === -1 || regionIndex === -1) return;

    const emptyCounts = () => {
      const counts = {};
      netcapColumns.forEach(col => { counts[col] = 0; });
      return counts;
    };

    const byProvince = new Map();
    const byNode = new Map();
    const byRegion = new Map();

    taRows.forEach(row => {
      const flags = submissionNetcap.get(row[taIdIndex]);
      if (!flags) return;

      [
        [byProvince, row[provinceIndex]],
        [byNode, row[nodeIndex]],
        [byRegion, row[regionIndex]]
      ].forEach(([map, key]) => {
        if (!key) return;
        if (!map.has(key)) map.set(key, emptyCounts());
        const counts = map.get(key);
        netcapColumns.forEach(col => { if (flags[col]) counts[col]++; });
      });
    });

    const toResult = (name, counts) => {
      const sum = netcapColumns.reduce((total, col) => total + counts[col], 0);
      return { name, ...counts, sum };
    };

    const provinceResult = provinceNames.map(name => toResult(name, byProvince.get(name) || emptyCounts()));
    const provinceMax = Math.max(0, ...provinceResult.map(p => p.sum));
    localStorage.setItem('NETCAPCountByProvince', JSON.stringify(provinceResult));
    localStorage.setItem('NETCAPCountByProvinceMax', String(provinceMax));

    const nodeList = Array.from({ length: 17 }, (_, i) => `N${i}`); // N0..N16
    const nodeResult = nodeList.map(name => toResult(name, byNode.get(name) || emptyCounts()));
    localStorage.setItem('NETCAPCountByNode', JSON.stringify(nodeResult));

    const regionResult = [...byRegion.entries()].map(([name, counts]) => toResult(name, counts));
    localStorage.setItem('NETCAPCountByRegion', JSON.stringify(regionResult));
  }

  function prepareData(data) {
    if (!data) return;
    getProjectCountStat(data);
    getProjectCountByYear(data);
    getProjectCountByRegion(data);
    getTargetGroupCount(data);
    getNETCAPCount(data);
    getMARSCount(data);
    getProjectCountByProvince(data);
    getProjectCountByNode(data);
    getNETCAPCountByProvince(data);
    window.dispatchEvent(new CustomEvent('ccDataPrepared'));
  }

  // Prepare once immediately in case a cache already exists from a previous page
  // load, then again once js/sheet.js's async fetch actually lands (ccSheetDataReady).
  prepareData(JSON.parse(localStorage.getItem('ccSheetData') || 'null'));
  window.addEventListener('ccSheetDataReady', e => prepareData(e.detail));
})();
