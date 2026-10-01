(() => {
  'use strict';
  const csvUrl = 'data/assets.csv';
  const map = L.map('map', { zoomControl: true }).setView([35.0, -106.685], 12);
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19
  });
  const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  });
  satellite.addTo(map);
  L.control.layers({ 'Satellite': satellite, 'Street map': streets }, null, { collapsed: false }).addTo(map);

  const colors = {
    'School': '#315d45',
    'Community organization': '#8a5b35',
    'Government / Public': '#35658a',
    'For-profit': '#7b4b8a',
    'Nonprofit': '#5d7441',
    'Park / Open space': '#52785d',
    'Business': '#8a6c2d',
    'Other': '#68716b'
  };
  const state = { assets: [], selectedTypes: new Set(), selectedTopics: new Set(), search: '' };
  const markerLayer = L.layerGroup().addTo(map);
  const markerById = new Map();
  const $ = id => document.getElementById(id);

  function parseCSV(text) {
    const rows = []; let row = []; let cell = ''; let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (quoted) { if (c === '"' && n === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
      else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    const headers = rows.shift().map(h => h.trim());
    return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
  }
  function splitTags(v) { return (v || '').split(';').map(s => s.trim()).filter(Boolean); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function colorFor(type) { return colors[type] || colors.Other; }
  function iconFor(type) { return L.divIcon({ className:'', html:`<div class="marker-dot" style="background:${colorFor(type)}"></div>`, iconSize:[17,17], iconAnchor:[8,8], popupAnchor:[0,-8] }); }

  function renderFilters() {
    const types = [...new Set(state.assets.flatMap(a => splitTags(a.type)))].sort();
    const topics = [...new Set(state.assets.flatMap(a => splitTags(a.topics)))].sort();
    $('typeFilters').innerHTML = types.map(t => checkboxHtml('type', t, state.selectedTypes.has(t))).join('');
    $('topicFilters').innerHTML = topics.map(t => checkboxHtml('topic', t, state.selectedTopics.has(t))).join('');
    document.querySelectorAll('[data-filter]').forEach(el => el.addEventListener('change', () => {
      const set = el.dataset.filter === 'type' ? state.selectedTypes : state.selectedTopics;
      el.checked ? set.add(el.value) : set.delete(el.value); render();
    }));
  }
  function checkboxHtml(kind, value, checked) {
    const count = state.assets.filter(a => (kind === 'type' ? splitTags(a.type) : splitTags(a.topics)).includes(value)).length;
    return `<label class="filter-row"><input data-filter="${kind}" type="checkbox" value="${esc(value)}" ${checked?'checked':''}><span>${esc(value)}</span><span class="filter-count">${count}</span></label>`;
  }
  function matches(a) {
    const hay = [a.name,a.type,a.topics,a.resource_types,a.address,a.description,a.contact].join(' ').toLowerCase();
    const searchOk = !state.search || hay.includes(state.search);
    const typeOk = !state.selectedTypes.size || [...state.selectedTypes].some(t => splitTags(a.type).includes(t));
    const topicOk = !state.selectedTopics.size || [...state.selectedTopics].some(t => splitTags(a.topics).includes(t));
    return searchOk && typeOk && topicOk;
  }
  function popup(a) {
    const tags = [...splitTags(a.topics), ...splitTags(a.resource_types)].map(t => `<span class="tag">${esc(t)}</span>`).join('');
    const link = a.website ? `<a class="popup-link" href="${esc(a.website)}" target="_blank" rel="noopener">Visit website ↗</a>` : '';
    return `<div><div class="popup-type">${esc(a.type)}</div><h3 class="popup-title">${esc(a.name)}</h3><div class="popup-description">${esc(a.description)}</div><div class="popup-section"><strong>Location</strong><br>${esc(a.address)}</div><div class="popup-section"><strong>Topics & resources</strong><div class="popup-tags">${tags}</div></div>${link}</div>`;
  }
  function render() {
    const visible = state.assets.filter(matches);
    markerLayer.clearLayers(); markerById.clear();
    visible.forEach(a => {
      const marker = L.marker([Number(a.latitude), Number(a.longitude)], { icon: iconFor(a.type) }).bindPopup(popup(a), { maxWidth: 330 });
      marker.addTo(markerLayer); markerById.set(a.id, marker);
    });
    $('count').textContent = `${visible.length} of ${state.assets.length}`;
    $('resourceList').innerHTML = visible.length ? visible.map(a => `<article class="resource-card" tabindex="0" data-id="${esc(a.id)}"><strong>${esc(a.name)}</strong><div class="meta">${esc(a.type)} • ${esc(a.address)}</div><div class="tag-row">${splitTags(a.topics).slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></article>`).join('') : '<p class="meta">No resources match the current filters.</p>';
    document.querySelectorAll('.resource-card').forEach(card => {
      const open = () => { const m = markerById.get(card.dataset.id); if (m) { map.setView(m.getLatLng(), Math.max(map.getZoom(),14)); m.openPopup(); } };
      card.addEventListener('click', open); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }
  $('search').addEventListener('input', e => { state.search = e.target.value.trim().toLowerCase(); render(); });
  $('resetBtn').addEventListener('click', () => { state.selectedTypes.clear(); state.selectedTopics.clear(); state.search=''; $('search').value=''; renderFilters(); render(); });
  $('clearTypes').addEventListener('click', () => { state.selectedTypes.clear(); renderFilters(); render(); });
  $('clearTopics').addEventListener('click', () => { state.selectedTopics.clear(); renderFilters(); render(); });

  fetch(csvUrl).then(r => { if (!r.ok) throw new Error(`CSV load failed: ${r.status}`); return r.text(); }).then(text => {
    state.assets = parseCSV(text).filter(a => a.id && a.name && Number.isFinite(Number(a.latitude)) && Number.isFinite(Number(a.longitude)));
    renderFilters(); render();
    if (state.assets.length) map.fitBounds(L.latLngBounds(state.assets.map(a => [Number(a.latitude), Number(a.longitude)])), { padding:[30,30] });
  }).catch(err => {
    console.error(err);
    $('count').textContent = 'Load error';
    $('resourceList').innerHTML = '<p class="meta">Could not load data/assets.csv. Open this site through a web server (such as GitHub Pages), not as a file:// URL.</p>';
  });
})();
