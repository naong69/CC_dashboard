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
          text: 'จำนวนโครงการแยกตามจังหวัด',
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
          minColor: '#E8F5E9',
          maxColor: '#299a2d'
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
            hover: { color: '#29602b' }
          }
        }, {
            	type: 'mapline',
            	data: Highcharts.geojson(thailand_node_line, 'mapline'),
            	lineWidth: 1.5,
            	zIndex: 4,
        	}
        , {
            	type: 'mapline',
            	data: Highcharts.geojson(thailand_region_line, 'mapline'),
            	lineWidth: 3,
                color: '#ffffff',
                zIndex: 5,
        	}]
      });
    } catch (err) {
      console.error('map-project-container failed to render:', err);
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
          text: 'จำนวนกิจกรรม AEC: NETCAP แยกตามจังหวัด',
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
          minColor: '#E8F5E9',
          maxColor: '#299a2d'
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
          pointFormat: '{point.name}: <b>{point.sum}</b><br>N:{point.N} E:{point.E} T:{point.T} C:{point.C} A:{point.A} P:{point.P}',
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
            hover: { color: '#29602b' }
          }
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_node_line, 'mapline'),
          lineWidth: 1.5,
          zIndex: 4,
        }, {
          type: 'mapline',
          data: Highcharts.geojson(thailand_region_line, 'mapline'),
          lineWidth: 3,
          color: '#ffffff',
          zIndex: 5,
        }]
      });
    } catch (err) {
      console.error('map-netcap-container failed to render:', err);
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
    const regionContainer = document.getElementById('region-piechart-container');
    if (!regionContainer) return;

    const regionCounts = JSON.parse(localStorage.getItem('projectCountByRegion') || 'null') || {};

    const prepared = JSON.parse(localStorage.getItem('projectCountByYear') || 'null');
    const yearRange = prepared ? `${prepared.minYear} - ${prepared.maxYear}` : '';

    try {
      Highcharts.chart('region-piechart-container', {
        chart: {
          type: 'pie',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 400
        },
        title: {
          text: 'จำนวนโครางการแยกตามภูมิภาค',
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
    const nodeContainer = document.getElementById('node-barchart-container');
    if (!nodeContainer) return;

    const nodeCounts = JSON.parse(localStorage.getItem('projectCountByNode') || 'null') || {};

    try {
      Highcharts.chart('node-barchart-container', {
        chart: {
          type: 'bar',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 400
        },
        title: {
          text: 'จำนวนโครงการแยกตาม Node',
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

  renderProjectCountMap();
  renderNETCAPCountMap();
  renderProjectCountRegionChart();
  renderProjectCountNodeChart();
  window.addEventListener('ccDataPrepared', () => {
    renderProjectCountMap();
    renderNETCAPCountMap();
    renderProjectCountRegionChart();
    renderProjectCountNodeChart();
  });

  // js/layout.js dispatches this on layer-tab switch. Charts rendered into a
  // display:none container get sized to zero, so re-render whichever map just
  // became visible now that it has real dimensions.
  window.addEventListener('ccLayerShown', e => {
    if (e.detail.layer === 'km') renderProjectCountMap();
    if (e.detail.layer === 'entrepreneur') renderNETCAPCountMap();
  });
});
