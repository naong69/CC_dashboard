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
    mars: 'map-mars-container',
    local: 'map-local-container'
  };

  // Only direct children are top-level layer tabs — the MARS tab's nested
  // .switcher-submenu <li> items are handled separately below, but clicks on them
  // still bubble up here too, so selecting a MARS sub-group also activates MARS itself.
  document.querySelectorAll('.switcher-tabs > li').forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Clicking the MARS tab's own label (not one of its submenu items) always
      // resets back to the overall MARS view, even if MARS was already active —
      // this is what lets re-clicking "MARS" undo a submenu group selection.
      const clickedSubmenuItem = e.target.closest('.switcher-submenu');
      if (tab.dataset.layer === 'mars' && !clickedSubmenuItem) {
        document.querySelectorAll('.switcher-submenu li').forEach(i => i.classList.remove('active'));
        window.dispatchEvent(new CustomEvent('ccMarsGroupSelected', { detail: { group: null } }));
      }

      // Clicking a MARS submenu item bubbles up here too — if this tab is already
      // the active one, there's nothing left to switch (map is already shown/sized),
      // so skip re-dispatching ccLayerShown and needlessly re-rendering every chart.
      if (tab.classList.contains('active')) return;

      document.querySelectorAll('.switcher-tabs > li').forEach(t => t.classList.remove('active'));
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

  // MARS submenu: Mitigation/Adaptation/Resilience/System Research (M/A/R/S).
  // Deliberately left to bubble up to the parent MARS <li> above, so clicking a
  // sub-group also switches to the MARS layer/map if it isn't already active.
  document.querySelectorAll('.switcher-submenu li').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.switcher-submenu li').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      window.dispatchEvent(new CustomEvent('ccMarsGroupSelected', { detail: { group: item.dataset.marsGroup } }));
    });
  });

  // Accordion (CBR-style region list)
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.classList.toggle('open');
    });
  });
});
