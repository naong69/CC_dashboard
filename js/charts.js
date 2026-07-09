async function renderChart() {
  const rows = await fetchSheetData();

  // Example: extract labels (col 0) and values (col 1) from form responses
  const categories = rows.map(r => r.c[0]?.v ?? '');
  const values     = rows.map(r => Number(r.c[1]?.v) ?? 0);

  Highcharts.chart('chart-container', {
    chart: { type: 'bar' },
    title: { text: 'Survey Results' },
    xAxis: { categories },
    yAxis: { title: { text: 'Count' } },
    series: [{ name: 'Responses', data: values }]
  });
}

renderChart();