/* Vectemporel — fond de carte satellite.
 *
 * Une seule image Esri World Imagery exportée pour la zone courante, puis des
 * marqueurs et un chemin tracés dans la même projection. Pas de tuiles à gérer,
 * pas de coordonnée inventée : le fond est une image distante avec attribution,
 * les points viennent de l'atlas vérifié.
 */
(() => {
  'use strict';

  const ATTRIBUTION = 'Fond © Esri, Maxar, Earthstar Geographics';
  const EXPORT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';

  const mercatorY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

  function boundsFor(places, selected, zoom) {
    const points = places.filter((place) => place.lat !== null && place.lon !== null);
    if (!points.length) return null;
    const primary = points.filter((place) => place.primary);
    const source = primary.length ? primary : points;
    let minLon = Math.min(...source.map((place) => place.lon));
    let maxLon = Math.max(...source.map((place) => place.lon));
    let minLat = Math.min(...source.map((place) => place.lat));
    let maxLat = Math.max(...source.map((place) => place.lat));
    if (selected && selected.lat !== null) {
      const spanLon = Math.max((maxLon - minLon) * 0.32, 0.08) / zoom;
      const spanLat = Math.max((maxLat - minLat) * 0.32, 0.06) / zoom;
      minLon = selected.lon - spanLon;
      maxLon = selected.lon + spanLon;
      minLat = selected.lat - spanLat;
      maxLat = selected.lat + spanLat;
    } else {
      const padLon = Math.max((maxLon - minLon) * 0.22, 0.03);
      const padLat = Math.max((maxLat - minLat) * 0.22, 0.03);
      minLon -= padLon;
      maxLon += padLon;
      minLat -= padLat;
      maxLat += padLat;
    }
    return { minLon, maxLon, minLat, maxLat };
  }

  function exportUrl(bounds, width, height) {
    const params = new URLSearchParams({
      bbox: `${bounds.minLon.toFixed(6)},${bounds.minLat.toFixed(6)},${bounds.maxLon.toFixed(6)},${bounds.maxLat.toFixed(6)}`,
      bboxSR: '4326',
      size: `${Math.round(width)},${Math.round(height)}`,
      imageSR: '3857',
      format: 'jpg',
      f: 'image',
    });
    return `${EXPORT}?${params}`;
  }

  function create(container, options = {}) {
    const root = document.createElement('div');
    root.className = 'satellite-map';
    root.innerHTML = `
      <div class="satellite-images"><img class="satellite-img is-current" alt="" /><img class="satellite-img is-next" alt="" /></div>
      <div class="satellite-grade"></div>
      <svg class="satellite-routes" aria-hidden="true"><polyline class="satellite-route" points="" /></svg>
      <div class="satellite-markers"></div>
      <div class="satellite-toolbar">
        <button type="button" data-sat="out" aria-label="Dézoomer">−</button>
        <button type="button" data-sat="overview" aria-label="Vue d’ensemble">⤢</button>
        <button type="button" data-sat="in" aria-label="Zoomer">+</button>
      </div>
      <div class="satellite-attribution">${ATTRIBUTION}</div>
      <div class="satellite-status" hidden>Chargement de l’image satellite…</div>
    `;
    container.appendChild(root);

    const images = root.querySelectorAll('.satellite-img');
    const route = root.querySelector('.satellite-route');
    const svg = root.querySelector('.satellite-routes');
    const markers = root.querySelector('.satellite-markers');
    const status = root.querySelector('.satellite-status');
    const state = {
      places: [],
      selectedIndex: 0,
      zoom: 1,
      overview: true,
      bounds: null,
      width: 0,
      height: 0,
      token: 0,
    };

    function project(place, bounds, width, height) {
      const top = mercatorY(bounds.maxLat);
      const bottom = mercatorY(bounds.minLat);
      return {
        x: ((place.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width,
        y: ((top - mercatorY(place.lat)) / (top - bottom)) * height,
      };
    }

    function drawMarkers() {
      markers.innerHTML = '';
      if (!state.bounds) return;
      const points = state.places.map((place) => ({ place, point: project(place, state.bounds, state.width, state.height) }));
      const active = points[state.selectedIndex];
      const near = points
        .filter((item) => item !== active)
        .sort((a, b) => Math.hypot(a.point.x - (active?.point.x || 0), a.point.y - (active?.point.y || 0))
          - Math.hypot(b.point.x - (active?.point.x || 0), b.point.y - (active?.point.y || 0)))
        .slice(0, 2);
      const labelled = new Set([active, ...near].filter(Boolean));
      for (let index = 0; index < points.length; index += 1) {
        const { place, point } = points[index];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `satellite-marker${index === state.selectedIndex ? ' is-active' : ''}${labelled.has(points[index]) ? ' has-label' : ''}`;
        button.style.left = `${point.x.toFixed(1)}px`;
        button.style.top = `${point.y.toFixed(1)}px`;
        button.setAttribute('aria-label', `${place.label}${index === state.selectedIndex ? ', sélectionné' : ''}`);
        button.innerHTML = '<span class="satellite-marker-dot"></span><span class="satellite-marker-label"></span>';
        button.querySelector('.satellite-marker-label').textContent = place.label;
        button.addEventListener('click', () => {
          state.selectedIndex = index;
          state.overview = false;
          render();
          options.onSelect?.(index, place);
        });
        markers.appendChild(button);
      }
      route.setAttribute('points', points.map((item) => `${item.point.x.toFixed(1)},${item.point.y.toFixed(1)}`).join(' '));
      svg.setAttribute('viewBox', `0 0 ${state.width} ${state.height}`);
    }

    async function loadImage() {
      if (!state.bounds || state.width < 20) return;
      const token = ++state.token;
      const url = exportUrl(state.bounds, state.width, state.height);
      const next = images[1];
      status.hidden = false;
      try {
        const response = await fetch(url, { headers: { Accept: 'image/jpeg' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (token !== state.token) return;
        const objectUrl = URL.createObjectURL(blob);
        next.onload = () => {
          if (token !== state.token) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          next.classList.add('is-visible');
          images[0].classList.remove('is-visible');
          root.classList.add('has-image');
          window.setTimeout(() => {
            images[0].src = objectUrl;
            images[0].classList.add('is-visible');
            next.classList.remove('is-visible');
          }, 620);
        };
        next.src = objectUrl;
      } catch (error) {
        root.classList.add('has-fallback');
        status.textContent = 'Fond satellite indisponible — vue schématique';
      } finally {
        if (token === state.token) status.hidden = true;
      }
    }

    function render({ reload = true } = {}) {
      const rect = container.getBoundingClientRect();
      state.width = Math.max(40, Math.round(rect.width));
      state.height = Math.max(40, Math.round(rect.height));
      root.style.width = `${state.width}px`;
      root.style.height = `${state.height}px`;
      const selected = state.places[state.selectedIndex];
      state.bounds = boundsFor(state.places, state.overview ? null : selected, state.zoom);
      drawMarkers();
      if (reload) loadImage();
    }

    function setPlaces(places, selectedIndex = 0) {
      state.places = places.filter((place) => place.lat !== null && place.lon !== null);
      state.selectedIndex = Math.min(selectedIndex, Math.max(0, state.places.length - 1));
      state.zoom = 1;
      state.overview = true;
      render();
    }

    function select(index) {
      state.selectedIndex = clampIndex(index);
      state.overview = false;
      render({ reload: false });
      loadImage();
    }

    function clampIndex(index) {
      return Math.max(0, Math.min(state.places.length - 1, index));
    }

    function zoomIn() {
      state.zoom = Math.min(8, state.zoom * 1.6);
      state.overview = false;
      render();
    }
    function zoomOut() {
      state.zoom = Math.max(0.4, state.zoom / 1.6);
      state.overview = false;
      render();
    }
    function overview() {
      state.overview = true;
      state.zoom = 1;
      render();
    }
    root.querySelector('[data-sat="in"]').addEventListener('click', zoomIn);
    root.querySelector('[data-sat="out"]').addEventListener('click', zoomOut);
    root.querySelector('[data-sat="overview"]').addEventListener('click', overview);

    const observer = new ResizeObserver(() => render({ reload: false }));
    observer.observe(container);

    return { setPlaces, select, render, zoomIn, zoomOut, overview, destroy: () => observer.disconnect(), state: () => ({ ...state }) };
  }

  window.VECTEMPOREL_SATELLITE = { create };
})();
