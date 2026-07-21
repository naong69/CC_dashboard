document.addEventListener('DOMContentLoaded', () => {
  if (typeof Highcharts === 'undefined') return;

  // Same color as the "520 โครงการ" stat tile (.stat-tile .stat-number/.stat-label use var(--navy)).
  const navy = getComputedStyle(document.documentElement).getPropertyValue('--navy').trim() || '#14382a';

  // ---------- Project count stat tile ----------
  // Reads the unique-submission count prepared by js/data-transform.js's
  // getProjectCountStat() out of localStorage and writes it into the stat tile.
  function renderProjectCountStat() {
    const statEl = document.getElementById('projectCountStat');
    if (!statEl) return;

    const count = localStorage.getItem('projectCountStat');
    if (count !== null) statEl.textContent = count;
  }

  // ---------- Project count by year (line/spline) ----------
  // Reads the categories/seriesData/min/max year prepared by js/data-transform.js's
  // getProjectCountByYear() out of localStorage and renders the chart + range label.
  function renderProjectCountByYearChart() {
    const lineContainer = document.getElementById('project-linechart-container');
    if (!lineContainer) return;

    // Fallback mock values, used until real sheet data has been prepared at least once.
    let categories = ['2565', '2566', '2567', '2568', '2569'];
    let seriesData = [4, 20, 21, 32, 20];

    const prepared = JSON.parse(localStorage.getItem('projectCountByYear') || 'null');
    if (prepared) {
      categories = prepared.categories;
      seriesData = prepared.seriesData;

      const rangeEl = document.getElementById('projectYearRangeStat');
      if (rangeEl) rangeEl.textContent = `${prepared.minYear} - ${prepared.maxYear}`;
    }

    try {
      Highcharts.chart('project-linechart-container', {
        chart: {
          type: 'spline',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          // Fixed pixel height; width is left unset so Highcharts reads it from the
          // container's actual rendered width (container CSS only sets width: 100%).
          height: 300
        },
        title: {
          text: 'จำนวนโครงการแยกตามปีงบประมาณ',
          style: { color: navy }
        },
        xAxis: {
          categories: categories,
          title: { text: 'ปีงบประมาณ', style: { color: navy } },
          labels: { style: { color: navy } }
        },
        yAxis: {
          title: { text: 'จำนวนโครงการ', style: { color: navy } },
          labels: { style: { color: navy } },
          allowDecimals: false,
          min: 0,
          tickInterval: 20
        },
        legend: {
          enabled: false
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{series.name}: <b>{point.y}</b> โครงการ',
          style: { color: navy }
        },
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          spline: {
            marker: { enabled: true }
          }
        },
        series: [{
          name: 'จำนวนโครงการ',
          data: seriesData,
          color: '#4CAF50'
        }],
        responsive: {
          rules: [{
            condition: { maxWidth: 500 },
            chartOptions: {
              title: { style: { fontSize: '13px' } },
              xAxis: {
                title: { text: null },
                labels: { style: { fontSize: '10px' } }
              },
              yAxis: {
                title: { style: { fontSize: '10px' } },
                labels: { style: { fontSize: '10px' } }
              }
            }
          }]
        }
      });
    } catch (err) {
      console.error('project-linechart-container failed to render:', err);
    }
  }

  // ---------- Project count by region (badge pills) ----------
  // Reads the region -> count map prepared by js/data-transform.js's
  // getProjectCountByRegion() out of localStorage and writes each count into its
  // matching region badge's <span class="stat-number">, matched via data-region.
  function renderProjectCountByRegion() {
    const regionCounts = JSON.parse(localStorage.getItem('projectCountByRegion') || 'null');
    if (!regionCounts) return;

    document.querySelectorAll('.region-badge[data-region]').forEach(badge => {
      const count = regionCounts[badge.dataset.region];
      if (count === undefined) return;

      const statEl = badge.parentElement.querySelector('.stat-number');
      if (statEl) statEl.textContent = count;
    });
  }

  // ---------- Target group split (pie) ----------
  // Reads the { public, private, people } counts prepared by js/data-transform.js's
  // getTargetGroup() out of localStorage and renders them as the pie's data points.
  function renderTargetGroupChart() {
    const pieContainer = document.getElementById('3p-piechart-container');
    if (!pieContainer) return;

    // Fallback mock values, used until real sheet data has been prepared at least once.
    let targetGroupCounts = { public: 21, private: 18, people: 33 };

    const prepared = JSON.parse(localStorage.getItem('targetGroupCounts') || 'null');
    if (prepared) targetGroupCounts = prepared;

    try {
      Highcharts.chart('3p-piechart-container', {
        chart: {
          type: 'pie',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 300
        },
        title: {
          text: 'กลุ่มเป้าหมาย',
          style: { color: navy }
        },
        tooltip: {
          enabled: false
        },
        colors: ['#6B8E5A', '#C97B3D', '#C9A961'],
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
          name: 'Target Group',
          colorByPoint: true,
          data: [
            { name: 'Public', y: targetGroupCounts.public },
            { name: 'Private', y: targetGroupCounts.private },
            { name: 'People', y: targetGroupCounts.people }
          ]
        }]
      });
    } catch (err) {
      console.error('3p-piechart-container failed to render:', err);
    }
  }

  

  // ---------- NETCAP breakdown (horizontal bar) ----------
  // Reads the { N, E, T, C, A, P } counts prepared by js/data-transform.js's
  // getNETCAPCount() out of localStorage and renders them as the bar's y values.
  function renderNETCAPChart() {
    const netcapContainer = document.getElementById('netcap-barchart-container');
    if (!netcapContainer) return;

    // Fallback mock values, used until real sheet data has been prepared at least once.
    let netcapCounts = { N: 27, E: 34, T: 35, C: 7, A: 25, P: 16 };

    const prepared = JSON.parse(localStorage.getItem('netcapCounts') || 'null');
    if (prepared) netcapCounts = prepared;

    try {
      Highcharts.chart('netcap-barchart-container', {
        chart: {
          type: 'bar',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 300
        },
        title: {
          text: 'การดำเนินโครงการตาม ACE',
          style: { color: navy }
        },
        xAxis: {
          categories: ['N', 'E', 'T', 'C', 'A', 'P'],
          // Category order follows the array (N first), reversed so N renders at the
          // top and P at the bottom — bar charts otherwise plot index 0 at the bottom.
          reversed: true,
          labels: { style: { color: navy, fontSize: '16px', fontWeight: 'bold' } }
        },
        yAxis: {
          title: { text: null },
          allowDecimals: false,
          min: 0,
          labels: { style: { color: navy } }
        },
        legend: {
          enabled: false
        },
        tooltip: {
          backgroundColor: '#ffffff',
          headerFormat: '{point.key}: {point.custom.desc}<br/>',
          pointFormat: '<b>{point.y}</b>',
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
          name: 'NETCAP',
          data: [
            { y: netcapCounts.N, custom: { desc: 'Public Participation' } },
            { y: netcapCounts.E, custom: { desc: 'Education' } },
            { y: netcapCounts.T, custom: { desc: 'Training' } },
            { y: netcapCounts.C, custom: { desc: 'International Cooperation' } },
            { y: netcapCounts.A, custom: { desc: 'Public Awareness' } },
            { y: netcapCounts.P, custom: { desc: 'Public Access to Data' } }
          ]
        }]
      });
    } catch (err) {
      console.error('netcap-barchart-container failed to render:', err);
    }
  }

 
  // Run once immediately in case js/data-transform.js already prepared data before
  // this script ran, then again whenever it prepares fresh data (ccDataPrepared).
  renderProjectCountStat();
  renderProjectCountByYearChart();
  renderProjectCountByRegion();
  renderTargetGroupChart();
  renderNETCAPChart();
  window.addEventListener('ccDataPrepared', () => {
    renderProjectCountStat();
    renderProjectCountByYearChart();
    renderProjectCountByRegion();
    renderTargetGroupChart();
    renderNETCAPChart();
  });

  // ---------- MARS pie-donut (https://www.highcharts.com/demo/highcharts/pie-donut) ----------
  // Reads the { M1..S5 } counts prepared by js/data-transform.js's getMARSCount()
  // out of localStorage and uses them as each item's y value below.
  function renderMARSChart() {
    const marsContainer = document.getElementById('mars-pie-donut-chart-container');
    if (!marsContainer) return;

    try {
      const marsGroups = [
        { name: 'Mitigation', desc: 'ด้านการลดก๊าซเรือนกระจก', items: [
          ['M1', 'ข้อมูลและองค์ความรู้'],
          ['M2', 'พลังงานและขนส่ง'],
          ['M3', 'กระบวนการอุตสาหกรรม-ผลิตภัณฑ์'],
          ['M4', 'ภาคเกษตร'],
          ['M5', 'ภาคของเสีย'],
          ['M6', 'การดูดกลับก๊าซเรือนกระจก']
        ] },
        { name: 'Adaptation', desc: 'ด้านการปรับตัวต่อการเปลี่ยนแปลงสภาพภูมิอากาศ', items: [
          ['A1', 'ข้อมูลและองค์ความรู้'],
          ['A2', 'การบริหารจัดการน้ำ'],
          ['A3', 'การเกษตรและความมั่นคงทางอาหาร'],
          ['A4', 'การท่องเที่ยว'],
          ['A5', 'การสาธารณสุข'],
          ['A6', 'ทรัพยากรธรรมชาติ'],
          ['A7', 'การตั้งถิ่นฐานและความมั่นคงของมนุษย์'],
          ['A8', 'ความสูญเสียและความเสียหาย']
        ] },
        { name: 'Resilience', desc: 'ด้านการสร้างภูมิคุ้มกันต่อการเปลี่ยนแปลงสภาพภูมิอากาศ', items: [
          ['R1', 'ข้อมูลและองค์ความรู้'],
          ['R2', 'การบริหารจัดการน้ำ'],
          ['R3', 'การเกษตรและความมั่นคงทางอาหาร'],
          ['R4', 'การท่องเที่ยว'],
          ['R5', 'การสาธารณสุข'],
          ['R6', 'ทรัพยากรธรรมชาติ'],
          ['R7', 'การตั้งถิ่นฐานและความมั่นคงของมนุษย์'],
          ['R8', 'ความสูญเสียและความเสียหาย']
        ] },
        { name: 'System Research', desc: 'ด้านการวิจัยเชิงระบบ', items: [
          ['S1', 'ขับเคลื่อนนโยบายสู่ภาคปฏิบัติ'],
          ['S2', 'การเงิน'],
          ['S3', 'กลไกสู่สังคมคาร์บอนต่ำ'],
          ['S4', 'เสริมพลังสังคม/การมีส่วนร่วม'],
          ['S5', 'ภูมิปัญญา-เทคโนโลยีสมัยใหม่']
        ] }
      ];

      // Fallback mock counts, used until real sheet data has been prepared at least once.
      let marsCounts = {
        M1: 5, M2: 2, M3: 1, M4: 4, M5: 9, M6: 1,
        A1: 0, A2: 4, A3: 2, A4: 0, A5: 0, A6: 0, A7: 0, A8: 0,
        R1: 8, R2: 0, R3: 0, R4: 1, R5: 1, R6: 2, R7: 1, R8: 0,
        S1: 4, S2: 0, S3: 4, S4: 9, S5: 0
      };

      const prepared = JSON.parse(localStorage.getItem('marsCounts') || 'null');
      if (prepared) marsCounts = prepared;

      // Group colors, kept separate from marsGroups so the data stays presentation-agnostic.
      const marsGroupColors = {
        'Mitigation': '#C9A961',
        'Adaptation': '#3D8EC9',
        'Resilience': '#C97B3D',
        'System Research': '#3DAFA0'
      };

      // Inner ring: one slice per group, sized to the group's total (0-total groups hidden via null).
      const innerData = marsGroups.map(group => {
        const total = group.items.reduce((sum, [code]) => sum + (marsCounts[code] || 0), 0);
        return { name: group.name, y: total || null, color: marsGroupColors[group.name], custom: { desc: group.desc } };
      });

      // Outer ring: one slice per item, all items in a group share the same lighter
      // shade of that group's color (e.g. M1-M6 all use one brightened Mitigation color).
      const OUTER_BRIGHTNESS = 0.25;
      const outerData = marsGroups.flatMap(group => {
        const outerColor = Highcharts.color(marsGroupColors[group.name]).brighten(OUTER_BRIGHTNESS).get();
        return group.items.map(([code, desc]) => ({
          name: code,
          y: marsCounts[code] || null,
          color: outerColor,
          custom: { desc }
        }));
      });

      Highcharts.chart('mars-pie-donut-chart-container', {
        chart: {
          type: 'pie',
          backgroundColor: '#ffffff',
          style: { fontFamily: 'Prompt, sans-serif' },
          height: 500
        },
        title: {
          text: 'ความสอดคล้องกับกรอบและแผนงานวิจัยด้านการเปลี่ยนแปลงสภาพภูมิอากาศ (MARS)',
          style: { color: navy }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          pointFormat: '{point.name}: <b>{point.y}</b>',
          style: { color: navy }
        },
        credits: { enabled: false },
        accessibility: { enabled: false },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            borderColor: '#ffffff',
            borderWidth: 2,
            dataLabels: {
              enabled: true,
              style: { color: navy, textOutline: 'none', fontSize: '11px' }
            }
          }
        },
        series: [
          {
            name: 'group',
            data: innerData,
            size: '75%',
            tooltip: {
              headerFormat: '<b>{point.custom.desc}:</b><br>'
            },
            dataLabels: {
              distance: -65,
              // Only the rendered label wraps "System Research" onto two lines —
              // point.name itself stays as-is for the tooltip and anything else that reads it.
              formatter: function () {
                return this.point.name === 'System Research' ? 'System<br>Research' : this.point.name;
              },
              style: { color: '#ffffff', textOutline: '1px #000000', fontWeight: 'bold', fontSize: '14px' }
            }
          },
          {
            name: 'subgroup',
            data: outerData,
            size: '90%',
            innerSize: '75%',
            tooltip: {
              headerFormat: '<b>{point.custom.desc}</b><br>'
            },
            dataLabels: {
              distance: 10
            }
          }
        ]
      });
    } catch (err) {
      console.error('mars-pie-donutchart-container failed to render:', err);
    }
  }

  renderMARSChart();
  window.addEventListener('ccDataPrepared', renderMARSChart);
});
