document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Highcharts === 'undefined' || !Highcharts.mapChart) {
    console.warn('ui-map.js: Highcharts Maps module not loaded (Highcharts.mapChart is undefined) — map will not render.');
    return;
  }

  const navy = getComputedStyle(document.documentElement).getPropertyValue('--navy').trim() || '#14382a';

  // ---------- Project count by province (thematic map) ----------
  // Reads the [{ name, value }, ...] prepared by js/data-transform.js's
  // getProjectCountByProvince() (and its accompanying max value) out of localStorage
  // and renders them as a colorAxis-scaled choropleth over the province polygons.
  // Passed straight to chart.map as raw GeoJSON — Highcharts.mapChart converts it
  // internally, so there's no need to pre-process it via Highcharts.geojson().
  const thailand_province = await fetch('./data/thailand_provinces.geojson').then(response => response.json());
  //console.log('ui-map.js: loaded', mapData.features.length, 'province polygons from geojson');
  const thailand_node_line = await fetch('./data/thailand_node_lines.geojson').then(response => response.json());
  const thailand_region_line = await fetch('./data/thailand_region_lines.geojson').then(response => response.json());
  
  function renderProjectCountMap() {
    const mapContainer = document.getElementById('map-project-container');
    if (!mapContainer || !thailand_province) return;

    const provinceCounts = JSON.parse(localStorage.getItem('projectCountByProvince') || 'null') || [];
    //console.log('Rendering project count map with', provinceCounts.length, 'province counts');
    var max_project_count_province = Number(localStorage.getItem('projectCountByProvinceMax')) || 0;
    max_project_count_province = Math.ceil(max_project_count_province / 10, 0) * 10;
    //console.log('Max project count by province:', max_project_count_province);
    
    try {
      Highcharts.mapChart('map-project-container', {
        chart: {
          map: thailand_province,
          backgroundColor: '#ffffff',
          borderWidth: 0.5,
          borderColor: '#0ffd1f',
          style: { fontFamily: 'Prompt, sans-serif' }
        },
        title: {
          text: 'จำนวนโครงการ แยกตามจังหวัด',
          style: { color: navy }
        },
        mapNavigation: {
          enabled: false,
          enableMouseWheelZoom: false,
          enableDoubleClickZoom: false,
          enableTouchZoom: false
        },
        colorAxis: {
          min: 0,
          max: max_project_count_province,
          // Gold theme (matches the "ภาคกลาง" region pill color) — distinct from
          // both the original green and the NETCAP map's blue theme.
          minColor: '#FBF6EC',
          maxColor: '#C9A961'
        },
        legend: {
          enabled: true,
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle',
          itemStyle: { color: navy }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{point.name}: <b>{point.value}</b> โครงการ',
          style: { color: navy }
        },
        credits: { enabled: false },
        accessibility: { enabled: false },
        series: [{
          name: 'จำนวนโครงการ',
          data: provinceCounts,
          joinBy: ['PRO_NAME_T', 'name'],
          zIndex: 1,
          states: {
            hover: { color: '#8f7635' }
          }
        }, {
            	type: 'mapline',
            	data: Highcharts.geojson(thailand_node_line, 'mapline'),
            	lineWidth: 1.5,
            	zIndex: 4,
            	enableMouseTracking: false,
        	}
        , {
            	type: 'mapline',
            	data: Highcharts.geojson(thailand_region_line, 'mapline'),
            	lineWidth: 3,
                color: '#ffffff',
                zIndex: 5,
                enableMouseTracking: false,
        	}]
      });
    } catch (err) {
      console.error('map-project-container failed to render:', err);
    }
  }

  // ---------- Project count by region (pie) ----------
  // Reads the region -> count map prepared by js/data-transform.js's
  // getProjectCountByRegion() out of localStorage and renders it as a pie, styled
  // like the index.html "จำนวน" pie chart (js/ui-chart.js's 3p-piechart-container).
  const REGION_DISPLAY = [
    { key: 'ภาคเหนือ', name: 'ภาคเหนือ', color: '#6B8E5A' },
    { key: 'ภาคตะวันออกเฉียงเหนือ', name: 'ภาคอีสาน', color: '#C97B3D' },
    { key: 'ภาคกลาง', name: 'ภาคกลาง', color: '#C9A961' },
    { key: 'ภาคตะวันออก', name: 'ภาคตะวันออก', color: '#3D8EC9' },
    { key: 'ภาคตะวันตก', name: 'ภาคตะวันตก', color: '#8B6F4E' },
    { key: 'ภาคใต้', name: 'ภาคใต้', color: '#3DAFA0' }
  ];

  function renderProjectCountRegionChart() {
    const regionContainer = document.getElementById('project-region-piechart-container');
    if (!regionContainer) return;

    const regionCounts = JSON.parse(localStorage.getItem('projectCountByRegion') || 'null') || {};

    const prepared = JSON.parse(localStorage.getItem('projectCountByYear') || 'null');
    const yearRange = prepared ? `${prepared.minYear} - ${prepared.maxYear}` : '';

    try {
      Highcharts.chart('project-region-piechart-container', {
        chart: {
          type: 'pie',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 420   
        },
        title: {
          text: 'จำนวนโครางการ<br>แยกตามภูมิภาค',
          style: { color: navy }
        },
        subtitle: {
            text: 'ปี ' + yearRange
        },
        tooltip: {
          enabled: false
        },
        colors: REGION_DISPLAY.map(region => region.color),
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            showInLegend: true,
            borderColor: '#ffffff',
            dataLabels: {
              enabled: true,
              distance: -40,
              allowOverlap: true,
              format: '{point.y}<br>({point.percentage:.1f}%)',
              style: {
                color: '#ffffff',
                textOutline: 'none',
                fontWeight: 'bold',
                fontSize: '13px'
              },
              filter: {
                property: 'percentage',
                operator: '>',
                value: 5
              }
            }
          }
        },
        legend: {
          enabled: true,
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemStyle: { color: navy }
        },
        series: [{
          name: 'จำนวน',
          colorByPoint: true,
          data: REGION_DISPLAY.map(region => ({
            name: region.name,
            y: regionCounts[region.key] || 0
          }))
        }]
      });
    } catch (err) {
      console.error('region-piechart-container failed to render:', err);
    }
  }


  // ---------- Project count by node (bar) ----------
  // Reads the { N0: n, ..., N16: n } map prepared by js/data-transform.js's
  // getProjectCountByNode() out of localStorage and renders it as a bar chart,
  // styled like ui-chart.js's netcap-barchart-container, ordered N0 (top) - N16 (bottom).
  const NODE_LIST = Array.from({ length: 17 }, (_, i) => `N${i}`); // N0..N16

  function renderProjectCountNodeChart() {
    const nodeContainer = document.getElementById('project-node-barchart-container');
    if (!nodeContainer) return;

    const nodeCounts = JSON.parse(localStorage.getItem('projectCountByNode') || 'null') || {};

    try {
      Highcharts.chart('project-node-barchart-container', {
        chart: {
          type: 'bar',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 500
        },
        title: {
          text: 'แยกตาม Node',
          style: { color: navy }
        },
        xAxis: {
          categories: NODE_LIST,
          // Category order follows the array (N0 first), reversed so N0 renders at
          // the top and N16 at the bottom — bar charts otherwise plot index 0 at the bottom.
          reversed: true,
          lineWidth: 0,
          tickLength: 0,
          labels: { style: { color: navy, fontWeight: 'bold' } }
        },
        yAxis: {
          title: { text: null },
          allowDecimals: false,
          min: 0,
          lineWidth: 0,
          gridLineWidth: 0,
          labels: { enabled: false }
        },
        legend: {
          enabled: false
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{point.category}: <b>{point.y}</b> โครงการ',
          style: { color: navy }
        },
        colors: ['#4CAF50'],
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          bar: {
            groupPadding: 0.1,
            pointPadding: 0.1,
            dataLabels: {
              enabled: true,
              style: { color: navy, textOutline: 'none' }
            }
          }
        },
        series: [{
          name: 'จำนวนโครงการ',
          data: NODE_LIST.map(node => nodeCounts[node] || 0)
        }]
      });
    } catch (err) {
      console.error('node-barchart-container failed to render:', err);
    }
  }


  // ---------- NETCAP sum by province (thematic map) ----------
  // Reads the [{ name, N, E, T, C, A, P, sum }, ...] prepared by js/data-transform.js's
  // getNETCAPCountByProvince() (and its accompanying max "sum") out of localStorage
  // and renders them as a colorAxis-scaled choropleth over the province polygons,
  // same structure as renderProjectCountMap but colored by the NETCAP "sum" field.
  function renderNETCAPCountMap() {
    const mapContainer = document.getElementById('map-netcap-container');
    if (!mapContainer || !thailand_province) return;

    const provinceCounts = JSON.parse(localStorage.getItem('NETCAPCountByProvince') || 'null') || [];
    var max_netcap_count_province = Number(localStorage.getItem('NETCAPCountByProvinceMax')) || 0;
    max_netcap_count_province = Math.ceil(max_netcap_count_province / 10, 0) * 10;

    try {
      Highcharts.mapChart('map-netcap-container', {
        chart: {
          map: thailand_province,
          backgroundColor: '#ffffff',
          borderWidth: 0.5,
          borderColor: '#0ffd1f',
          style: { fontFamily: 'Prompt, sans-serif' }
        },
        title: {
          text: 'จำนวนกิจกรรม ACE: NETCAP แยกตามจังหวัด',
          style: { color: navy }
        },
        mapNavigation: {
          enabled: false,
          enableMouseWheelZoom: false,
          enableDoubleClickZoom: false,
          enableTouchZoom: false
        },
        colorAxis: {
          min: 0,
          max: max_netcap_count_province,
          // Blue theme (matches the "ภาคตะวันออก" region pill color) so this map
          // reads as visually distinct from the green project-count map.
          minColor: '#E9F2FA',
          maxColor: '#3D8EC9'
        },
        legend: {
          enabled: true,
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle',
          itemStyle: { color: navy }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{point.name}: <b>{point.sum}</b><br>N: <b>{point.N}</b> E: <b>{point.E}</b> T: <b>{point.T}</b> C: <b>{point.C}</b> A: <b>{point.A}</b> P: <b>{point.P}</b>',
          style: { color: navy }
        },
        credits: { enabled: false },
        accessibility: { enabled: false },
        series: [{
          name: 'AEC Activities in',
          data: provinceCounts,
          joinBy: ['PRO_NAME_T', 'name'],
          colorKey: 'sum',
          zIndex: 1,
          states: {
            hover: { color: '#2c6690' }
          }
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_node_line, 'mapline'),
          lineWidth: 1.5,
          zIndex: 4,
          enableMouseTracking: false,
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_region_line, 'mapline'),
          lineWidth: 3,
          color: '#ffffff',
          zIndex: 5,
          enableMouseTracking: false,
        }]
      });
    } catch (err) {
      console.error('map-netcap-container failed to render:', err);
    }
  }

  

  // ---------- NETCAP sum by region (pie) ----------
  // Reads the [{ name, N, E, T, C, A, P, sum }, ...] prepared by js/data-transform.js's
  // getNETCAPCountByProvince() (the region breakdown it also saves) out of
  // localStorage and renders the "sum" per region as a pie, same styling as
  // renderProjectCountRegionChart.
  function renderNETCAPRegionChart() {
    const regionContainer = document.getElementById('netcap-region-piechart-container');
    if (!regionContainer) return;

    const netcapByRegion = JSON.parse(localStorage.getItem('NETCAPCountByRegion') || 'null') || [];
    const sumByRegion = {};
    netcapByRegion.forEach(region => { sumByRegion[region.name] = region.sum; });

    const prepared = JSON.parse(localStorage.getItem('projectCountByYear') || 'null');
    const yearRange = prepared ? `${prepared.minYear} - ${prepared.maxYear}` : '';

    try {
      Highcharts.chart('netcap-region-piechart-container', {
        chart: {
          type: 'pie',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 420
        },
        title: {
          text: 'จำนวนกิจกรรม ACE: NETCAP <br>แยกตามภูมิภาค',
          style: { color: navy }
        },
        subtitle: {
            text: 'ปี ' + yearRange
        },
        tooltip: {
          enabled: false
        },
        colors: REGION_DISPLAY.map(region => region.color),
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            showInLegend: true,
            borderColor: '#ffffff',
            dataLabels: {
              enabled: true,
              distance: -40,
              allowOverlap: true,
              format: '{point.y}<br>({point.percentage:.1f}%)',
              style: {
                color: '#ffffff',
                textOutline: 'none',
                fontWeight: 'bold',
                fontSize: '13px'
              },
              filter: {
                property: 'percentage',
                operator: '>',
                value: 5
              }
            }
          }
        },
        legend: {
          enabled: true,
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemStyle: { color: navy }
        },
        series: [{
          name: 'NETCAP',
          colorByPoint: true,
          data: REGION_DISPLAY.map(region => ({
            name: region.name,
            y: sumByRegion[region.key] || 0
          }))
        }]
      });
    } catch (err) {
      console.error('netcap-region-piechart-container failed to render:', err);
    }
  }

  // ---------- NETCAP sum by node (stacked bar) ----------
  // Reads the [{ name, N, E, T, C, A, P, sum }, ...] prepared by js/data-transform.js's
  // getNETCAPCountByProvince() (the node breakdown it also saves) out of localStorage
  // and renders N/E/T/C/A/P as a stacked bar per node, ordered N0 (top) - N16 (bottom).
  const NETCAP_COLUMNS = ['N', 'E', 'T', 'C', 'A', 'P'];
  const NETCAP_COLORS = ['#4CAF50', '#3D8EC9', '#C97B3D', '#C9A961', '#8B6F4E', '#3DAFA0'];

  function renderNETCAPCountNodeChart() {
    const nodeContainer = document.getElementById('netcap-node-barchart-container');
    if (!nodeContainer) return;

    const netcapByNode = JSON.parse(localStorage.getItem('NETCAPCountByNode') || 'null') || [];
    const countsByNode = {};
    netcapByNode.forEach(node => { countsByNode[node.name] = node; });

    try {
      Highcharts.chart('netcap-node-barchart-container', {
        chart: {
          type: 'bar',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 550
        },
        title: {
          text: 'แยกตาม Node',
          style: { color: navy }
        },
        xAxis: {
          categories: NODE_LIST,
          // Category order follows the array (N0 first), reversed so N0 renders at
          // the top and N16 at the bottom — bar charts otherwise plot index 0 at the bottom.
          reversed: true,
          lineWidth: 0,
          tickLength: 0,
          labels: { style: { color: navy, fontWeight: 'bold' } }
        },
        yAxis: {
          title: { text: null },
          allowDecimals: false,
          min: 0,
          lineWidth: 0,
          gridLineWidth: 0,
          labels: { enabled: false },
          // Bar charts default reversedStacks to true, which stacks the LAST series
          // (P) closest to the axis and the FIRST (N) outermost — the opposite of
          // series array order. false keeps N, E, T, C, A, P in that literal order.
          reversedStacks: false,
          // One label per bar, showing the stack's total at its outer end, instead
          // of a dataLabel on every individual N/E/T/C/A/P segment.
          stackLabels: {
            enabled: true,
            format: '{total}',
            style: { color: navy, fontWeight: 'bold', textOutline: 'none' }
          }
        },
        legend: {
          enabled: true,
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemDistance: 12,
          itemMarginTop: 0,
          itemMarginBottom: 0,
          itemStyle: { color: navy, fontSize: '13px' }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{series.name}: <b>{point.y}</b>',
          style: { color: navy }
        },
        colors: NETCAP_COLORS,
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          bar: {
            stacking: 'normal',
            groupPadding: 0.1,
            pointPadding: 0.1,
            dataLabels: {
              enabled: false
            }
          }
        },
        series: NETCAP_COLUMNS.map(col => ({
          name: col,
          data: NODE_LIST.map(node => (countsByNode[node] ? countsByNode[node][col] : 0))
        }))
      });
    } catch (err) {
      console.error('netcap-node-barchart-container failed to render:', err);
    }
  }


  // ---------- MARS count by province (thematic map) ----------
  // Reads the [{ name, SUM, M, A, R, S }, ...] prepared by js/data-transform.js's
  // getMARSCountByProvince() out of localStorage and renders it as a colorAxis-scaled
  // choropleth over the province polygons, same structure as renderProjectCountMap.
  // There's no stored max for MARS (unlike NETCAP/LBR), so it's computed here from
  // the data itself. By default colors by the overall "SUM"; when a submenu group
  // (M/A/R/S) has been picked via js/layout.js's ccMarsGroupSelected event, colors
  // by that group's own SUM instead — see selectedMarsGroup below.
  let selectedMarsGroup = null; // null = overall SUM, else 'M' | 'A' | 'R' | 'S'

  function renderMARSCountMap() {
    const mapContainer = document.getElementById('map-mars-container');
    if (!mapContainer || !thailand_province) return;

    const provinceCounts = JSON.parse(localStorage.getItem('MARSCountByProvince') || 'null') || [];

    // Flatten whichever metric is currently selected onto a plain "value" field —
    // Highcharts' colorKey only looks up a direct point property, not a nested path
    // like "M.SUM", so a fixed field name is needed regardless of the group picked.
    const seriesData = provinceCounts.map(p => ({
      ...p,
      value: selectedMarsGroup ? (p[selectedMarsGroup] ? p[selectedMarsGroup].SUM : 0) : (p.SUM || 0)
    }));

    var max_mars_count_province = Math.max(0, ...seriesData.map(p => p.value));
    max_mars_count_province = Math.ceil(max_mars_count_province / 10, 0) * 10;
    if (max_mars_count_province === 0) max_mars_count_province = 10;

    const groupLabel = selectedMarsGroup ? `: ${MARS_GROUP_NAMES[selectedMarsGroup]}` : '';

    // When a group is selected, break the tooltip down per sub-code (e.g. M1: 0
    // M2: 1 ...), same idea as the NETCAP map's N/E/T/C/A/P breakdown.
    const tooltipPointFormat = selectedMarsGroup
      ? `{point.name}: <b>{point.value}</b><br>${MARS_GROUP_CODES[selectedMarsGroup]
          .map(code => `${code}: <b>{point.${selectedMarsGroup}.${code}}</b>`)
          .join(' ')}`
      : '{point.name}: <b>{point.SUM}</b><br>M: <b>{point.M.SUM}</b> A: <b>{point.A.SUM}</b> R: <b>{point.R.SUM}</b> S: <b>{point.S.SUM}</b>';

    try {
      Highcharts.mapChart('map-mars-container', {
        chart: {
          map: thailand_province,
          backgroundColor: '#ffffff',
          borderWidth: 0.5,
          borderColor: '#0ffd1f',
          style: { fontFamily: 'Prompt, sans-serif' }
        },
        title: {
          text: `จำนวนกรอบและแผนงานวิจัย (MARS${groupLabel}) แยกตามจังหวัด`,
          style: { color: navy }
        },
        mapNavigation: {
          enabled: false,
          enableMouseWheelZoom: false,
          enableDoubleClickZoom: false,
          enableTouchZoom: false
        },
        colorAxis: {
          min: 0,
          max: max_mars_count_province,
          // Orange theme (matches the "ภาคอีสาน" region pill color) — distinct from
          // the project map's gold, NETCAP's blue, and LBR's teal.
          minColor: '#FBEEE5',
          maxColor: '#C97B3D'
        },
        legend: {
          enabled: true,
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle',
          itemStyle: { color: navy }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: tooltipPointFormat,
          style: { color: navy }
        },
        credits: { enabled: false },
        accessibility: { enabled: false },
        series: [{
          name: selectedMarsGroup ? MARS_GROUP_NAMES[selectedMarsGroup] : 'MARS',
          data: seriesData,
          joinBy: ['PRO_NAME_T', 'name'],
          colorKey: 'value',
          zIndex: 1,
          states: {
            hover: { color: '#8a4f22' }
          }
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_node_line, 'mapline'),
          lineWidth: 1.5,
          zIndex: 4,
          enableMouseTracking: false,
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_region_line, 'mapline'),
          lineWidth: 3,
          color: '#ffffff',
          zIndex: 5,
          enableMouseTracking: false,
        }]
      });
    } catch (err) {
      console.error('map-mars-container failed to render:', err);
    }
  }

    // ---------- MARS count by region (pie) ----------
  // Reads the [{ name, SUM, M, A, R, S }, ...] prepared by js/data-transform.js's
  // getMARSCountByProvince() (the region breakdown it also saves) out of
  // localStorage and renders each region's top-level "SUM" as a pie, styled like
  // the index.html "จำนวน" pie chart (js/ui-chart.js's 3p-piechart-container).
  function renderMARSCountRegionChart() {
    const regionContainer = document.getElementById('mars-region-piechart-container');
    if (!regionContainer) return;

    const marsByRegion = JSON.parse(localStorage.getItem('MARSCountByRegion') || 'null') || [];
    const sumByRegionKey = {};
    marsByRegion.forEach(region => { sumByRegionKey[region.name] = region.SUM; });

    const prepared = JSON.parse(localStorage.getItem('projectCountByYear') || 'null');
    const yearRange = prepared ? `${prepared.minYear} - ${prepared.maxYear}` : '';


    try {
      Highcharts.chart('mars-region-piechart-container', {
        chart: {
          type: 'pie',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 420
        },
        title: {
          text: 'จำนวนกรอบและแผนงานวิจัย <br>แยกตามภูมิภาค',
          style: { color: navy }
        },
        subtitle: {
            text: 'ปี ' + yearRange
        },
        tooltip: {
          enabled: false
        },
        colors: REGION_DISPLAY.map(region => region.color),
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            showInLegend: true,
            borderColor: '#ffffff',
            dataLabels: {
              enabled: true,
              distance: -40,
              allowOverlap: true,
              format: '{point.y}<br>({point.percentage:.1f}%)',
              style: {
                color: '#ffffff',
                textOutline: 'none',
                fontWeight: 'bold',
                fontSize: '13px'
              },
              filter: {
                property: 'percentage',
                operator: '>',
                value: 5
              }
            }
          }
        },
        legend: {
          enabled: true,
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemStyle: { color: navy }
        },
        series: [{
          name: 'MARS',
          colorByPoint: true,
          data: REGION_DISPLAY.map(region => ({
            name: region.name,
            y: sumByRegionKey[region.key] || 0
          }))
        }]
      });
    } catch (err) {
      console.error('mars-region-piechart-container failed to render:', err);
    }
  }


  // ---------- MARS count by node (stacked bar) ----------
  // Reads the [{ name, SUM, M, A, R, S }, ...] prepared by js/data-transform.js's
  // getMARSCountByProvince() (the node breakdown it also saves) out of localStorage
  // and renders each group's SUM (M/A/R/S) as a stacked bar per node, ordered
  // N0 (top) - N16 (bottom), matching renderNETCAPCountNodeChart's styling.
  const MARS_GROUPS = ['M', 'A', 'R', 'S'];
  const MARS_GROUP_NAMES = { M: 'Mitigation', A: 'Adaptation', R: 'Resilience', S: 'System Research' };
  const MARS_GROUP_COLORS = ['#C9A961', '#3D8EC9', '#C97B3D', '#3DAFA0'];
  const MARS_GROUP_CODES = {
    M: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
    A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'],
    R: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'],
    S: ['S1', 'S2', 'S3', 'S4', 'S5']
  };

  function renderMARSCountNodeChart() {
    const nodeContainer = document.getElementById('mars-node-barchart-container');
    if (!nodeContainer) return;

    const marsByNode = JSON.parse(localStorage.getItem('MARSCountByNode') || 'null') || [];
    const countsByNode = {};
    marsByNode.forEach(node => { countsByNode[node.name] = node; });

    try {
      Highcharts.chart('mars-node-barchart-container', {
        chart: {
          type: 'bar',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 550
        },
        title: {
          text: 'แยกตาม Node',
          style: { color: navy }
        },
        xAxis: {
          categories: NODE_LIST,
          // Category order follows the array (N0 first), reversed so N0 renders at
          // the top and N16 at the bottom — bar charts otherwise plot index 0 at the bottom.
          reversed: true,
          lineWidth: 0,
          tickLength: 0,
          labels: { style: { color: navy, fontWeight: 'bold' } }
        },
        yAxis: {
          title: { text: null },
          allowDecimals: false,
          min: 0,
          lineWidth: 0,
          gridLineWidth: 0,
          labels: { enabled: false },
          // Bar charts default reversedStacks to true, which stacks the LAST series
          // (S) closest to the axis and the FIRST (M) outermost — the opposite of
          // series array order. false keeps M, A, R, S in that literal order.
          reversedStacks: false,
          // One label per bar, showing the stack's total at its outer end, instead
          // of a dataLabel on every individual M/A/R/S segment.
          stackLabels: {
            enabled: true,
            format: '{total}',
            style: { color: navy, fontWeight: 'bold', textOutline: 'none' }
          }
        },
        legend: {
          enabled: true,
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemDistance: 12,
          itemMarginTop: 0,
          itemMarginBottom: 0,
          itemStyle: { color: navy, fontSize: '13px' }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{series.name}: {point.custom.desc}<br/><b>{point.y}</b>',
          style: { color: navy }
        },
        colors: MARS_GROUP_COLORS,
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          bar: {
            stacking: 'normal',
            groupPadding: 0.1,
            pointPadding: 0.1,
            dataLabels: {
              enabled: false
            }
          }
        },
        series: MARS_GROUPS.map(group => ({
          name: group,
          data: NODE_LIST.map(node => ({
            y: countsByNode[node] ? countsByNode[node][group].SUM : 0,
            custom: { desc: MARS_GROUP_NAMES[group] }
          }))
        }))
      });
    } catch (err) {
      console.error('mars-node-barchart-container failed to render:', err);
    }
  }



 // ---------- LBR sum by province (thematic map) ----------
  // Reads the [{ name, L1, ..., L6, sum }, ...] prepared by js/data-transform.js's
  // getLBRCountByProvince() (and its accompanying max "sum") out of localStorage
  // and renders them as a colorAxis-scaled choropleth over the province polygons,
  // same structure as renderProjectCountMap but colored by the LBR "sum" field.
  function renderLBRCountMap() {
    const mapContainer = document.getElementById('map-local-container');
    if (!mapContainer || !thailand_province) return;

    const provinceCounts = JSON.parse(localStorage.getItem('LBRCountByProvince') || 'null') || [];
    var max_lbr_count_province = Number(localStorage.getItem('LBRCountByProvinceMax')) || 0;
    max_lbr_count_province = Math.ceil(max_lbr_count_province / 10, 0) * 10;

    try {
      Highcharts.mapChart('map-local-container', {
        chart: {
          map: thailand_province,
          backgroundColor: '#ffffff',
          borderWidth: 0.5,
          borderColor: '#0ffd1f',
          style: { fontFamily: 'Prompt, sans-serif' }
        },
        title: {
          text: 'จำนวนฐานทรัพยากรท้องถิ่น แยกตามจังหวัด',
          style: { color: navy }
        },
        mapNavigation: {
          enabled: false,
          enableMouseWheelZoom: false,
          enableDoubleClickZoom: false,
          enableTouchZoom: false
        },
        colorAxis: {
          min: 0,
          max: max_lbr_count_province,
          // Teal theme (matches the "ภาคใต้" region pill color) — distinct from
          // the project map's gold and the NETCAP map's blue.
          minColor: '#E5F6F3',
          maxColor: '#3DAFA0'
        },
        legend: {
          enabled: true,
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle',
          itemStyle: { color: navy }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{point.name}: <b>{point.sum}</b><br>L1: <b>{point.L1}</b> L2: <b>{point.L2}</b> L3: <b>{point.L3}</b> L4: <b>{point.L4}</b> L5: <b>{point.L5}</b> L6: <b>{point.L6}</b>',
          style: { color: navy }
        },
        credits: { enabled: false },
        accessibility: { enabled: false },
        series: [{
          name: 'ฐานทรัพยากรท้องถิ่น',
          data: provinceCounts,
          joinBy: ['PRO_NAME_T', 'name'],
          colorKey: 'sum',
          zIndex: 1,
          states: {
            hover: { color: '#277d72' }
          }
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_node_line, 'mapline'),
          lineWidth: 1.5,
          zIndex: 4,
          enableMouseTracking: false,
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_region_line, 'mapline'),
          lineWidth: 3,
          color: '#ffffff',
          zIndex: 5,
          enableMouseTracking: false,
        }]
      });
    } catch (err) {
      console.error('map-local-container failed to render:', err);
    }
  }


 // ---------- LBR sum by region (pie) ----------
  // Reads the [{ name, L1..L6, sum }, ...] prepared by js/data-transform.js's
  // getLBRCountByProvince() (the region breakdown it also saves) out of localStorage
  // and renders each region's LBR "sum" as a pie, styled like the index.html
  // "จำนวน" pie chart (js/ui-chart.js's 3p-piechart-container).
  function renderLBRCountRegionChart() {
    const regionContainer = document.getElementById('local-region-piechart-container');
    if (!regionContainer) return;

    const lbrByRegion = JSON.parse(localStorage.getItem('LBRCountByRegion') || 'null') || [];
    const sumByRegionKey = {};
    lbrByRegion.forEach(region => { sumByRegionKey[region.name] = region.sum; });

    const prepared = JSON.parse(localStorage.getItem('projectCountByYear') || 'null');
    const yearRange = prepared ? `${prepared.minYear} - ${prepared.maxYear}` : '';

    try {
      Highcharts.chart('local-region-piechart-container', {
        chart: {
          type: 'pie',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 420
        },
        title: {
          text: 'จำนวนฐานทรัพยากรท้องถิ่น<br>แยกตามภูมิภาค',
          style: { color: navy }
        },
        subtitle: {
            text: 'ปี ' + yearRange
        },
        tooltip: {
          enabled: false
        },
        colors: REGION_DISPLAY.map(region => region.color),
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            showInLegend: true,
            borderColor: '#ffffff',
            dataLabels: {
              enabled: true,
              distance: -40,
              allowOverlap: true,
              format: '{point.y}<br>({point.percentage:.1f}%)',
              style: {
                color: '#ffffff',
                textOutline: 'none',
                fontWeight: 'bold',
                fontSize: '13px'
              },
              filter: {
                property: 'percentage',
                operator: '>',
                value: 5
              }
            }
          }
        },
        legend: {
          enabled: true,
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemStyle: { color: navy }
        },
        series: [{
          name: 'LBR',
          colorByPoint: true,
          data: REGION_DISPLAY.map(region => ({
            name: region.name,
            y: sumByRegionKey[region.key] || 0
          }))
        }]
      });
    } catch (err) {
      console.error('local-region-piechart-container failed to render:', err);
    }
  }

  // ---------- LBR sum by node (stacked bar) ----------
  // Reads the [{ name, L1, ..., L6, sum }, ...] prepared by js/data-transform.js's
  // getLBRCountByProvince() (the node breakdown it also saves) out of localStorage
  // and renders L1-L6 as a stacked bar per node, ordered N0 (top) - N16 (bottom),
  // matching renderNETCAPCountNodeChart's styling.
  const LBR_COLUMNS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
  const LBR_COLORS = ['#4CAF50', '#3D8EC9', '#C97B3D', '#C9A961', '#8B6F4E', '#3DAFA0'];
  const LBR_DESCRIPTIONS = {
    L1: 'ด้านสถาบันการศึกษาและภูมิปัญญาท้องถิ่น',
    L2: 'ด้านเศรษฐกิจพื้นที่',
    L3: 'ด้านภูมิศาสตร์และสิ่งแวดล้อม',
    L4: 'ด้านเครือข่าย',
    L5: 'ด้านข้อมูล',
    L6: 'ด้านผู้นำและวัฒนธรรมองค์กร'
  };

  function renderLBRCountNodeChart() {
    const nodeContainer = document.getElementById('local-node-barchart-container');
    if (!nodeContainer) return;

    const lbrByNode = JSON.parse(localStorage.getItem('LBRCountByNode') || 'null') || [];
    const countsByNode = {};
    lbrByNode.forEach(node => { countsByNode[node.name] = node; });

    try {
      Highcharts.chart('local-node-barchart-container', {
        chart: {
          type: 'bar',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 550
        },
        title: {
          text: 'แยกตาม Node',
          style: { color: navy }
        },
        xAxis: {
          categories: NODE_LIST,
          // Category order follows the array (N0 first), reversed so N0 renders at
          // the top and N16 at the bottom — bar charts otherwise plot index 0 at the bottom.
          reversed: true,
          lineWidth: 0,
          tickLength: 0,
          labels: { style: { color: navy, fontWeight: 'bold' } }
        },
        yAxis: {
          title: { text: null },
          allowDecimals: false,
          min: 0,
          lineWidth: 0,
          gridLineWidth: 0,
          labels: { enabled: false },
          // Bar charts default reversedStacks to true, which stacks the LAST series
          // (L6) closest to the axis and the FIRST (L1) outermost — the opposite of
          // series array order. false keeps L1, L2, ..., L6 in that literal order.
          reversedStacks: false,
          // One label per bar, showing the stack's total at its outer end, instead
          // of a dataLabel on every individual L1-L6 segment.
          stackLabels: {
            enabled: true,
            format: '{total}',
            style: { color: navy, fontWeight: 'bold', textOutline: 'none' }
          }
        },
        legend: {
          enabled: true,
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom',
          itemDistance: 12,
          itemMarginTop: 0,
          itemMarginBottom: 0,
          itemStyle: { color: navy, fontSize: '13px' }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{series.name}: {point.custom.desc}<br/><b>{point.y}</b>',
          style: { color: navy }
        },
        colors: LBR_COLORS,
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          bar: {
            stacking: 'normal',
            groupPadding: 0.1,
            pointPadding: 0.1,
            dataLabels: {
              enabled: false
            }
          }
        },
        series: LBR_COLUMNS.map(col => ({
          name: col,
          data: NODE_LIST.map(node => ({
            y: countsByNode[node] ? countsByNode[node][col] : 0,
            custom: { desc: LBR_DESCRIPTIONS[col] }
          }))
        }))
      });
    } catch (err) {
      console.error('local-node-barchart-container failed to render:', err);
    }
  }

  renderProjectCountMap();
  renderNETCAPCountMap();
  renderLBRCountMap();
  renderMARSCountMap();
  renderProjectCountRegionChart();
  renderNETCAPRegionChart();
  renderLBRCountRegionChart();
  renderMARSCountRegionChart();
  renderProjectCountNodeChart();
  renderNETCAPCountNodeChart();
  renderLBRCountNodeChart();
  renderMARSCountNodeChart();
  window.addEventListener('ccDataPrepared', () => {
    renderProjectCountMap();
    renderNETCAPCountMap();
    renderLBRCountMap();
    renderMARSCountMap();
    renderProjectCountRegionChart();
    renderNETCAPRegionChart();
    renderLBRCountRegionChart();
    renderMARSCountRegionChart();
    renderProjectCountNodeChart();
    renderNETCAPCountNodeChart();
    renderLBRCountNodeChart();
    renderMARSCountNodeChart();
  });

  // js/layout.js dispatches this on layer-tab switch. Charts rendered into a
  // display:none container get sized to zero, so re-render whichever map just
  // became visible now that it has real dimensions.
  window.addEventListener('ccLayerShown', e => {
    if (e.detail.layer === 'project') renderProjectCountMap();
    if (e.detail.layer === 'netcap') {
      renderNETCAPCountMap();
      renderNETCAPRegionChart();
      renderNETCAPCountNodeChart();
    }
    if (e.detail.layer === 'mars') {
      renderMARSCountMap();
      renderMARSCountRegionChart();
      renderMARSCountNodeChart();
    }
    if (e.detail.layer === 'local') {
      renderLBRCountMap();
      renderLBRCountRegionChart();
      renderLBRCountNodeChart();
    }
  });

  // js/layout.js dispatches this when a MARS submenu item (Mitigation/Adaptation/
  // Resilience/System Research) is clicked. Re-render the map colored by that
  // group's own SUM instead of the overall MARS SUM.
  window.addEventListener('ccMarsGroupSelected', e => {
    selectedMarsGroup = e.detail.group;
    renderMARSCountMap();
  });
});
