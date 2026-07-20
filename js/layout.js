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
  const MAP_CONTAINER_BY_LAYER = {
    project: 'map-project-container',
    netcap: 'map-netcap-container',
    rc: 'map-mars-container',
    cbr: 'map-local-container'
  };

  document.querySelectorAll('.switcher-tabs li').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.switcher-tabs li').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const layer = tab.dataset.layer;
      document.querySelectorAll('.legend-content').forEach(c => c.classList.remove('active'));
      const target = document.getElementById('legend-' + layer);
      if (target) target.classList.add('active');

      Object.values(MAP_CONTAINER_BY_LAYER).forEach(id => {
        const container = document.getElementById(id);
        if (container) container.style.display = 'none';
      });
      const mapContainer = document.getElementById(MAP_CONTAINER_BY_LAYER[layer]);
      if (mapContainer) mapContainer.style.display = '';

      // Charts rendered into a container while it was display:none get sized to
      // zero — let js/ui-map.js know so it can re-render now that it's visible.
      window.dispatchEvent(new CustomEvent('ccLayerShown', { detail: { layer } }));

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
