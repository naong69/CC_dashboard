document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
  }

  document.querySelectorAll('.dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth > 860) return;
      e.preventDefault();
      link.parentElement.classList.toggle('open');
    });
  });

  // Floating switcher panels (only present on pages with the map layout)
  const layerSwitcher = document.getElementById('layerSwitcher');
  const chartSwitcher = document.getElementById('chartSwitcher');
  const layerSwitcherToggle = document.getElementById('layerSwitcherToggle');
  const chartSwitcherToggle = document.getElementById('chartSwitcherToggle');

  if (layerSwitcherToggle && layerSwitcher) {
    layerSwitcherToggle.addEventListener('click', (e) => {
      e.preventDefault();
      layerSwitcher.classList.toggle('active');
    });
  }
  if (chartSwitcherToggle && chartSwitcher) {
    chartSwitcherToggle.addEventListener('click', () => {
      chartSwitcher.classList.toggle('scw-switcher-open');
    });
  }

  // Layer tab switching (mirrors DKMmap's showMap())
  document.querySelectorAll('.switcher-tabs li').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.switcher-tabs li').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const layer = tab.dataset.layer;
      document.querySelectorAll('.legend-content').forEach(c => c.classList.remove('active'));
      const target = document.getElementById('legend-' + layer);
      if (target) target.classList.add('active');

      if (chartSwitcher) chartSwitcher.classList.add('scw-switcher-open');
    });
  });

  // Accordion (CBR-style region list)
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.classList.toggle('open');
    });
  });
});
