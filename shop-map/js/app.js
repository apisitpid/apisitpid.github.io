/* Runner Privileges · Chiang Mai — app controller */
(function () {
  'use strict';
  var C = window.CNX, I18N = window.CNX_I18N, icon = window.CNXIcon, STORES = window.CNX_STORES, AREAS = window.CNX_AREAS;
  var $ = function (id) { return document.getElementById(id); };
  var BY = {}; STORES.forEach(function (s) { BY[s.id] = s; });
  C.buildIndex(STORES);

  var CM = { lat: 18.7953, lng: 98.9772 };            // Chiang Mai centre, for "is the runner in town?"
  var deskMQ = matchMedia('(min-width: 900px)');
  var darkMQ = matchMedia('(prefers-color-scheme: dark)');
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  var params = new URLSearchParams(location.search);
  function detectLang() {
    var p = params.get('lang'); if (I18N[p]) return p;
    var s = store.get('cnx-lang'); if (I18N[s]) return s;
    var n = (navigator.languages || [navigator.language || 'en']).map(function (x) { return String(x).toLowerCase(); });
    for (var i = 0; i < n.length; i++) { if (n[i].indexOf('th') === 0) return 'th'; if (n[i].indexOf('zh') === 0) return 'zh'; if (n[i].indexOf('en') === 0) return 'en'; }
    return 'en';
  }

  var S = { lang: detectLang(), cat: 'all', open: false, q: '', sel: null, me: null, sheet: 'peek', prevSheet: 'peek', group: null };
  if (C.CATS.indexOf(params.get('cat')) >= 0) S.cat = params.get('cat');   // ?cat=spa: links/QR codes from the promo posts
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function dur(ms) { return reduceMotion.matches ? 0 : ms; }
  function L(k, v) { return C.t(S.lang, k, v); }
  function isDesk() { return deskMQ.matches; }
  function theme() { var t = document.documentElement.getAttribute('data-theme'); return t || (darkMQ.matches ? 'dark' : 'light'); }
  (function () { var t = store.get('cnx-theme'); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); })();

  /* ------------------------------------------------------------------ data views */
  var strongIds = null;   // when a query has name/type/area hits, offer-text-only hits are hidden
  function matches(s) {
    if (S.group) return S.group.indexOf(s.id) >= 0;
    if (S.cat !== 'all' && s.cats.indexOf(S.cat) < 0) return false;
    if (S.open && !C.isOpen(s)) return false;
    if (!S.q) return true;
    return strongIds ? strongIds[s.id] === true : C.score(s, S.q) > 0;
  }
  function computeStrong() {
    strongIds = null; if (!S.q) return;
    var need = 5 * C.norm(S.q).split(' ').length, ids = {}, any = false;
    STORES.forEach(function (s) { if (C.score(s, S.q) >= need) { ids[s.id] = true; any = true; } });
    if (any) strongIds = ids;
  }
  function dist(s) { return S.me ? C.km(S.me, s) : null; }
  function results() {
    var list = STORES.filter(matches);

    var areaOrder = Object.keys(AREAS);
    list.sort(function (a, b) {
      if (S.q) { var d = C.score(b, S.q) - C.score(a, S.q); if (d) return d; }
      if (S.me) return C.km(S.me, a) - C.km(S.me, b);
      return areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area) || C.names(a, S.lang).title.localeCompare(C.names(b, S.lang).title);
    });
    return list;
  }

  /* ------------------------------------------------------------------ static text */
  function renderChrome() {
    var T = I18N[S.lang];
    document.documentElement.lang = T.htmlLang;
    document.title = T.appName + ' · ' + T.appSub;
    $('t-app').textContent = T.appName; $('t-sub').textContent = T.barSub;
    Array.prototype.forEach.call($('langs').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)); b.title = I18N[b.dataset.lang].label; });
    $('q').placeholder = T.search; $('q').setAttribute('aria-label', T.search);
    $('i-search').innerHTML = icon('search');
    $('q-clear').innerHTML = icon('close'); $('q-clear').setAttribute('aria-label', T.clear);
    $('b-locate').innerHTML = icon('locate'); $('b-locate').setAttribute('aria-label', T.locate); $('b-locate').title = T.locate;
    var dark = theme() === 'dark';
    $('b-theme').innerHTML = icon(dark ? 'sun' : 'moon'); $('b-theme').setAttribute('aria-label', dark ? T.themeLight : T.themeDark); $('b-theme').title = dark ? T.themeLight : T.themeDark;
    $('b-fit').innerHTML = icon('fit'); $('b-fit').setAttribute('aria-label', T.fitAll); $('b-fit').title = T.fitAll;
    $('chips').setAttribute('aria-label', T.all);
    $('map').setAttribute('aria-label', T.map);
    $('grab').setAttribute('aria-label', T.list);
  }
  function renderChips() {
    var T = I18N[S.lang];
    var base = STORES.filter(function (s) { return (!S.q || (strongIds ? strongIds[s.id] : C.score(s, S.q) > 0)) && (!S.open || C.isOpen(s)); });
    var count = function (c) { return base.filter(function (s) { return s.cats.indexOf(c) >= 0; }).length; };
    $('chips').innerHTML = C.CATS.map(function (c) {
      return '<button type="button" class="chip" data-chip="' + c + '" data-cat="' + c + '" aria-pressed="' + (S.cat === c) + '">' +
        icon(c) + C.esc(T.cats[c]) + ' <small>' + count(c) + '</small></button>';
    }).join('') + '<button type="button" class="chip chip-open" data-chip="open" aria-pressed="' + S.open + '">' + icon('clock') + C.esc(T.openChip) + '</button>';
  }

  /* ------------------------------------------------------------------ list + detail */
  function renderList() {
    var list = results(), T = I18N[S.lang];
    var title = S.group || S.q || S.open || S.cat !== 'all' ? L('countFound', { n: list.length }) : L('countAll', { n: list.length });
    if (S.cat !== 'all' && !S.q && !S.group) title = list.length + ' · ' + T.catsLong[S.cat];
    $('sum-title').textContent = title;
    $('sum-sort').textContent = S.me ? T.sortNear : (S.q ? '' : T.sortName);
    if (!list.length) {
      $('list').innerHTML = '<div class="empty"><b>' + C.esc(L('noneTitle', { q: S.q })) + '</b><span>' + C.esc(T.noneHint) + '</span>' +
        '<button type="button" class="btn" data-act="clear">' + icon('close') + C.esc(T.clear) + '</button></div>';
      return;
    }
    $('list').innerHTML = list.map(function (s) {
      return C.rowHTML(s, S.lang, { dist: dist(s), q: S.q, cat: S.cat !== 'all' ? S.cat : null });
    }).join('');
  }

  function renderDetail() {
    var s = BY[S.sel]; if (!s) return;
    var T = I18N[S.lang], n = C.names(s, S.lang), cat = C.catOf(s, S.cat !== 'all' ? S.cat : null), d = dist(s);
    var area = AREAS[s.area] ? AREAS[s.area][S.lang] : '';
    var phones = s.phones.map(function (p) { return '<a href="tel:' + C.esc(p.tel) + '">' + C.esc(p.display) + '</a>'; }).join(' · ');
    var also = s.cats.length > 1 ? '<div class="also">' + C.esc(T.alsoIn) + ': ' + s.cats.map(function (c) { return C.esc(T.cats[c]); }).join(', ') + '</div>' : '';
    var thai = S.lang !== 'th' && n.local ? '<div class="fact">' + icon('globe') + '<span><b lang="th">' + C.esc(s.name.th) + '</b><br>' + C.esc(T.thaiName) + '</span>' +
      '<button type="button" class="icon-btn" data-act="copy" data-copy="' + C.esc(s.name.th) + '" aria-label="' + C.esc(T.copy) + '">' + icon('copy') + '</button></div>' : '';
    $('v-detail').innerHTML =
      '<div class="detail-top"><button type="button" class="icon-btn" data-act="back" aria-label="' + C.esc(T.back) + '">' + icon('back') + '</button>' +
      '<button type="button" class="icon-btn" data-act="back" aria-label="' + C.esc(T.close) + '">' + icon('close') + '</button></div>' +
      '<div class="detail-head" data-cat="' + cat + '"><span class="detail-logo" style="--logo-bg:' + C.esc(s.bg) + '">' + C.logo(s, '', true) + '</span><div>' +
      '<h2 id="d-title" tabindex="-1" lang="' + C.HTML_LANG[C.scriptOf(n.title)] + '">' + C.esc(n.title) + '</h2>' + (n.sub ? '<div class="sub">' + C.langSpan(n.sub) + '</div>' : '') +
      '<div class="meta"><span class="cat-tag">' + icon(cat) + C.esc(T.cats[cat]) + '</span>' + C.statusHTML(s, S.lang) +
      (d != null ? '<span class="row-dist">' + C.esc(L('away', { d: C.distText(d, S.lang) })) + '</span>' : '') + '</div></div></div>' +
      C.ticketHTML(s, S.lang, { staffButton: true }) +
      '<div class="actions"><a class="btn btn-primary" href="' + C.directionsURL(s) + '" target="_blank" rel="noopener">' + icon('directions') + '<span>' + C.esc(T.directions) + '</span></a>' +
      (s.phones[0] ? '<a class="btn" href="tel:' + C.esc(s.phones[0].tel) + '">' + icon('phone') + '<span>' + C.esc(T.call) + '</span></a>' : '<span></span>') +
      '<button type="button" class="btn sq" data-act="share" aria-label="' + C.esc(T.share) + '" title="' + C.esc(T.share) + '">' + icon('share') + '</button></div>' +
      '<div class="facts-list">' +
      '<div class="fact">' + icon('clock') + '<span><b>' + C.esc(C.hoursText(s)) + '</b><br>' + C.esc(T.hoursNote) + '</span></div>' +
      '<div class="fact">' + icon('pin') + '<span><b>' + C.esc(area) + '</b> · ' + C.esc(s.address) + '</span><button type="button" class="icon-btn" data-act="copy" data-copy="' + C.esc(s.address) + '" aria-label="' + C.esc(T.copy) + '">' + icon('copy') + '</button></div>' +
      thai + (phones ? '<div class="fact">' + icon('phone') + '<span>' + phones + '</span></div>' : '') +
      '</div>' + also;
  }

  /* Full-screen card a foreign runner hands to staff: everything in Thai, the reader's language small underneath. */
  var wake = null;
  function openStaff() {
    var s = BY[S.sel]; if (!s) return;
    var n = C.names(s, 'th'), T = I18N[S.lang];
    var el = $('staff');
    el.innerHTML = '<div class="staff-card" role="dialog" aria-modal="true" aria-labelledby="staff-name" data-cat="' + s.cats[0] + '">' +
      '<button type="button" class="icon-btn staff-x" data-act="staff-close" aria-label="' + C.esc(T.close) + '">' + icon('close') + '</button>' +
      '<div class="staff-hint">' + C.esc(T.staffHint) + '</div>' +
      '<span class="detail-logo" style="--logo-bg:' + C.esc(s.bg) + '">' + C.logo(s, '', true) + '</span>' +
      '<h2 id="staff-name" lang="' + C.HTML_LANG[C.scriptOf(n.title)] + '">' + C.esc(n.title) + '</h2>' + (n.local ? '<div class="sub" lang="th">' + C.esc(n.local) + '</div>' : '') +
      '<div class="staff-perk" lang="th">' + C.esc(s.perk.th) + '</div>' +
      '<div class="staff-offer" lang="th">' + C.esc(s.offer.th) + '</div>' +
      '<div class="staff-who" lang="th">' + C.esc(C.whoText(s, 'th')) + '</div>' +
      (S.lang !== 'th' ? '<div class="staff-mine" lang="' + C.HTML_LANG[S.lang] + '"><b>' + C.esc(s.perk[S.lang]) + '</b> · ' + C.esc(s.offer[S.lang]) + '</div>' : '') +
      '<div class="staff-mark"><img src="brand/event-logo.png" alt="HOKA Chiang Mai Thailand by UTMB" height="34"> ' + C.esc(I18N.th.appName) + '</div></div>';
    el.hidden = false;
    el.querySelector('.staff-x').focus();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }, function () {}); } catch (e) {}
  }
  function closeStaff() {
    $('staff').hidden = true; $('staff').innerHTML = '';
    if (wake) { try { wake.release(); } catch (e) {} wake = null; }
    var b = document.querySelector('[data-act="staff"]'); if (b) b.focus();
  }

  function showView(v) {
    $('v-list').hidden = v !== 'list';
    $('v-detail').hidden = v !== 'detail';
    document.body.classList.toggle('has-detail', v === 'detail');
    $('panel-body').scrollTop = 0;
  }

  /* ------------------------------------------------------------------ bottom sheet */
  var panel = $('panel');
  function sheetPx(state) {
    var vh = window.innerHeight, topH = $('top').getBoundingClientRect().bottom;
    var full = Math.max(260, vh - topH - 12);
    if (state === 'full') return full;
    if (state === 'half') return Math.min(full, Math.round(vh * 0.5));
    return Math.min(full, 168);
  }
  function setSheet(state, opts) {
    S.sheet = state;
    panel.dataset.state = state;
    var root = document.documentElement.style;
    root.setProperty('--sheet-max', sheetPx('full') + 'px');
    if (isDesk()) { root.setProperty('--sheet-vis', '0px'); updatePadding(); return; }
    root.setProperty('--sheet-vis', sheetPx(state) + 'px');
    if (!(opts && opts.keepPadding)) updatePadding();
  }
  function updatePadding() {
    if (!map) return;
    var pad = isDesk() ? { left: 380 + 32, top: 20, right: 70, bottom: 20 }
                       : { top: $('top').getBoundingClientRect().bottom + 10, bottom: Math.min(sheetPx(S.sheet), sheetPx('half')) + 10, left: 10, right: 60 };
    var cur = map.getPadding();
    if (cur.top === pad.top && cur.bottom === pad.bottom && cur.left === pad.left && cur.right === pad.right) return;
    // setPadding is a camera jump: applying it mid-animation would cancel a fly-to, so wait for the camera to settle
    if (map.isMoving()) { if (!padPending) { padPending = true; map.once('moveend', function () { padPending = false; updatePadding(); }); } return; }
    map.setPadding(pad);
  }
  var padPending = false;
  (function dragSheet() {
    var startY = 0, startVis = 0, lastY = 0, lastT = 0, vel = 0, dragging = false, moved = false;
    panel.addEventListener('pointerdown', function (e) {
      if (isDesk()) return;
      var zone = e.target.closest('.panel-grab, .sum, .detail-top');
      if (!zone || (e.target.closest('button, a') && !e.target.closest('.panel-grab'))) return;
      dragging = true; moved = false; startY = lastY = e.clientY; lastT = e.timeStamp; vel = 0;
      startVis = sheetPx(S.sheet); panel.classList.add('is-dragging'); panel.setPointerCapture(e.pointerId);
    });
    panel.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dy = startY - e.clientY; if (Math.abs(dy) > 4) moved = true;
      var vis = Math.max(110, Math.min(sheetPx('full'), startVis + dy));
      document.documentElement.style.setProperty('--sheet-vis', vis + 'px');
      if (e.timeStamp > lastT) { vel = (lastY - e.clientY) / (e.timeStamp - lastT); }
      lastY = e.clientY; lastT = e.timeStamp;
    });
    function end(e) {
      if (!dragging) return; dragging = false; panel.classList.remove('is-dragging');
      if (!moved) { if (e.target.closest('.panel-grab')) setSheet(S.sheet === 'peek' ? 'half' : S.sheet === 'half' ? 'full' : 'peek'); return; }
      var vis = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet-vis'));
      var states = ['peek', 'half', 'full'], target;
      if (Math.abs(vel) > 0.5) { var i = states.indexOf(S.sheet); target = states[Math.max(0, Math.min(2, i + (vel > 0 ? 1 : -1)))]; }
      else target = states.reduce(function (best, st) { return Math.abs(sheetPx(st) - vis) < Math.abs(sheetPx(best) - vis) ? st : best; }, 'peek');
      setSheet(target);
    }
    panel.addEventListener('pointerup', end); panel.addEventListener('pointercancel', end);
  })();

  /* ------------------------------------------------------------------ map */
  var map = null, markers = {}, meMarker = null, styleKey = '';
  function initMap() {
    try {
      map = new maplibregl.Map({
        container: 'map', style: CNXBasemap.makeStyle(theme(), S.lang), center: [98.9705, 18.7965], zoom: 13.4, minZoom: 9, maxZoom: 19,
        attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, cooperativeGestures: false,
        maxBounds: [[98.3, 18.35], [99.6, 19.35]]
      });
    } catch (e) {
      map = null;
      var d = document.createElement('div'); d.className = 'maperr'; d.textContent = L('mapError'); document.body.appendChild(d);
      setSheet('full'); return;
    }
    styleKey = theme() + S.lang;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', function () {
      if (!S.sel && S.cat !== 'all') fitTo(STORES.filter(matches), { duration: 0, max: 14.5 });
      else if (!S.sel) map.jumpTo({ center: isDesk() ? [98.9795, 18.7935] : [98.9755, 18.7950], zoom: isDesk() ? 13.9 : 13.25 });   // Nimman ↔ Old City, where most shops are
      var at = document.querySelector('.maplibregl-ctrl-attrib'); if (at) at.classList.remove('maplibregl-compact-show');
      recluster();
    });
    map.on('moveend', recluster);
    map.on('zoom', function () { $('map').classList.toggle('z-near', map.getZoom() >= 16); });
    map.on('click', function (e) { if (!e.originalEvent.target.closest('.mk') && S.sel) closeDetail(); });
    var tileErrors = 0;
    map.on('error', function () { if (++tileErrors === 6) toast(L('mapError')); });
    updatePadding();
  }
  function restyle() {
    if (!map) return;
    var key = theme() + S.lang; if (key === styleKey) return; styleKey = key;
    map.setStyle(CNXBasemap.makeStyle(theme(), S.lang), { diff: true });
  }
  function fitTo(list, o) {
    if (!map || !list.length) return;
    o = o || {};
    if (list.length === 1) { map.easeTo({ center: [list[0].lng, list[0].lat], zoom: Math.max(map.getZoom(), 15.5), duration: o.duration == null ? 600 : o.duration }); return; }
    var b = new maplibregl.LngLatBounds();
    list.forEach(function (s) { b.extend([s.lng, s.lat]); });
    map.fitBounds(b, { maxZoom: o.max || 16, duration: o.duration == null ? dur(700) : o.duration, padding: 50 });
  }

  /* Screen-space clustering, re-run after every move: 49 shops is small enough that this is cheaper
     and more controllable than a GeoJSON cluster source, and lets clusters show real logos. */
  function recluster() {
    if (!map) return;
    var z = map.getZoom();
    var shown = STORES.filter(matches), ghosts = S.q && !S.group ? STORES.filter(function (s) { return !matches(s) && (S.cat === 'all' || s.cats.indexOf(S.cat) >= 0); }) : [];
    var groups = [], next = {};
    /* each group is a screen box: a pin occupies the area above its tip, a cluster pill is centred on its point.
       Boxes that touch are merged, repeatedly, so no two markers ever overlap. */
    function box(g) {
      if (g.items.length === 1) return [g.x - 27, g.y - 74, g.x + 27, g.y];
      var w = 44 + Math.min(g.items.length, 3) * 19 + (g.items.length > 9 ? 9 : 0);
      return [g.x - w / 2, g.y - 22, g.x + w / 2, g.y + 22];
    }
    shown.forEach(function (s) {
      var p = map.project([s.lng, s.lat]);
      groups.push({ items: [s], pts: [p], x: p.x, y: p.y, solo: s.id === S.sel });
    });
    var changed = true, guard = 0;
    while (changed && guard++ < 60) {
      changed = false;
      for (var i = 0; i < groups.length && !changed; i++) {
        for (var j = i + 1; j < groups.length; j++) {
          var A = groups[i], B = groups[j];
          if (A.solo || B.solo) continue;
          var a = box(A), b = box(B);
          if (a[0] < b[2] - 2 && b[0] < a[2] - 2 && a[1] < b[3] - 2 && b[1] < a[3] - 2) {
            A.items = A.items.concat(B.items); A.pts = A.pts.concat(B.pts);
            A.x = A.pts.reduce(function (t, q) { return t + q.x; }, 0) / A.pts.length;
            A.y = A.pts.reduce(function (t, q) { return t + q.y; }, 0) / A.pts.length - (A.items.length === 2 && B.items.length === 1 ? 0 : 0);
            groups.splice(j, 1); changed = true; break;
          }
        }
      }
    }
    if (z >= 18.5) groups = groups.reduce(function (acc, g) {   // fully zoomed in: never hide shops inside a cluster
      if (g.items.length > 1 && g.pts.some(function (q, k) { return k && Math.hypot(q.x - g.pts[0].x, q.y - g.pts[0].y) > 20; })) {
        g.items.forEach(function (s, k) { acc.push({ items: [s], pts: [g.pts[k]], x: g.pts[k].x, y: g.pts[k].y }); });
      } else acc.push(g);
      return acc;
    }, []);
    groups.forEach(function (g) {
      var key = g.items.length === 1 ? 'p:' + g.items[0].id + (g.items[0].id === S.sel ? ':on' : '') : 'c:' + g.items.map(function (s) { return s.id; }).sort().join(',');
      next[key] = g;
    });
    ghosts.forEach(function (s) { next['g:' + s.id] = { ghost: s }; });
    Object.keys(markers).forEach(function (k) { if (!next[k]) { markers[k].remove(); delete markers[k]; } });
    Object.keys(next).forEach(function (k) {
      if (markers[k]) return;
      var g = next[k], el = document.createElement('div'); el.className = 'mk';
      var mk;
      if (g.ghost) {
        el.innerHTML = '<div class="ghost"></div>';
        mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([g.ghost.lng, g.ghost.lat]);
      } else if (g.items.length === 1) {
        var s = g.items[0], n = C.names(s, S.lang);
        el.innerHTML = C.pinHTML(s, { lang: S.lang, active: s.id === S.sel, cat: S.cat !== 'all' ? S.cat : null, showLabel: s.id === S.sel ? n.title : '' });
        el.style.zIndex = s.id === S.sel ? 10 : 2;
        mk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([s.lng, s.lat]);
        el.firstChild.addEventListener('click', function (e) { e.stopPropagation(); select(s.id, { fly: true }); });
      } else {
        var items = g.items;
        el.innerHTML = C.clusterHTML(items, { lang: S.lang, label: L('countFound', { n: items.length }) + ': ' + items.slice(0, 4).map(function (s) { return C.names(s, S.lang).title; }).join(', ') });
        el.style.zIndex = 3;
        var ll = map.unproject([g.x, g.y]);
        mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(ll);
        el.firstChild.addEventListener('click', function (e) { e.stopPropagation(); openCluster(items); });
      }
      mk.addTo(map); markers[k] = mk;
    });
  }
  function resetMarkers() { Object.keys(markers).forEach(function (k) { markers[k].remove(); }); markers = {}; recluster(); }

  function openCluster(items) {
    var b = new maplibregl.LngLatBounds(); items.forEach(function (s) { b.extend([s.lng, s.lat]); });
    var ne = b.getNorthEast(), sw = b.getSouthWest(), spanKm = C.km({ lat: ne.lat, lng: ne.lng }, { lat: sw.lat, lng: sw.lng });
    if (map.getZoom() >= 17 || spanKm < 0.06) {
      S.group = items.map(function (s) { return s.id; }); S.sel = null;
      renderList(); showView('list'); setSheet('half'); recluster(); return;
    }
    map.fitBounds(b, { padding: 70, maxZoom: Math.min(19, map.getZoom() + 3), duration: dur(650) });
  }

  /* ------------------------------------------------------------------ selection */
  function select(id, o) {
    var s = BY[id]; if (!s) return;
    o = o || {};
    if (S.sheet !== 'half' && !S.sel) S.prevSheet = S.sheet;
    S.sel = id; renderDetail(); showView('detail'); setSheet('half');
    if (map && o.fly !== false) map.easeTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 15.6), duration: o.instant ? 0 : dur(650) });
    recluster(); syncURL();
    if (o.focus) { var h = $('d-title'); if (h) h.focus({ preventScroll: true }); }
  }
  function closeDetail() {
    S.sel = null; showView('list'); setSheet(S.group ? 'half' : (S.prevSheet === 'full' ? 'full' : 'peek')); recluster(); syncURL();
  }
  function syncURL() {
    var p = new URLSearchParams(); p.set('lang', S.lang); if (S.cat !== 'all') p.set('cat', S.cat); if (S.sel) p.set('shop', S.sel);
    history.replaceState(null, '', location.pathname + '?' + p.toString() + location.hash);
  }

  /* ------------------------------------------------------------------ language */
  function setLang(l) {
    if (!I18N[l] || l === S.lang) return;
    S.lang = l; store.set('cnx-lang', l);
    renderChrome(); renderChips(); renderList(); if (S.sel) renderDetail();
    restyle(); resetMarkers(); syncURL(); setSheet(S.sheet);
  }

  /* ------------------------------------------------------------------ location */
  var watchId = null;
  function locate() {
    if (!navigator.geolocation) { toast(L('locDenied')); return; }
    $('b-locate').classList.add('is-on');
    var first = true;
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(function (pos) {
      S.me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (map) {
        if (!meMarker) { var el = document.createElement('div'); el.className = 'me'; el.setAttribute('aria-hidden', 'true'); meMarker = new maplibregl.Marker({ element: el }).setLngLat([S.me.lng, S.me.lat]).addTo(map); }
        else meMarker.setLngLat([S.me.lng, S.me.lat]);
      }
      if (first) {
        first = false;
        if (C.km(S.me, CM) < 60) { if (map) map.easeTo({ center: [S.me.lng, S.me.lat], zoom: Math.max(map.getZoom(), 15), duration: 700 }); }
        else toast(C.distText(C.km(S.me, CM), S.lang) + ' → Chiang Mai');
      }
      renderList(); if (S.sel) renderDetail();
    }, function () { $('b-locate').classList.remove('is-on'); toast(L('locDenied')); watchId = null; },
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 });
  }

  /* ------------------------------------------------------------------ toast */
  var toastT = 0;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function copy(text) {
    var done = function () { toast(L('copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast(text); });
    else toast(text);
  }

  /* ------------------------------------------------------------------ events */
  var qTimer = 0, fitTimer = 0;
  function onQuery() {
    S.q = $('q').value.trim(); S.group = null; computeStrong();
    $('q-clear').hidden = !S.q;
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      renderChips(); renderList(); recluster();
      if (S.sel && !matches(BY[S.sel])) closeDetail();
      if (S.q && S.sheet === 'peek') setSheet('half');
    }, 90);
    clearTimeout(fitTimer);
    fitTimer = setTimeout(function () { if (S.q.length >= 2) { var r = results(); if (r.length && r.length <= 20) fitTo(r, { max: 16 }); } }, 650);
  }
  function clearQuery() { $('q').value = ''; onQuery(); }

  function bind() {
    $('langs').addEventListener('click', function (e) { var b = e.target.closest('button[data-lang]'); if (b) setLang(b.dataset.lang); });
    $('q').addEventListener('input', onQuery);
    $('search-form').addEventListener('submit', function (e) {
      e.preventDefault(); var r = results(); if (r.length) { $('q').blur(); select(r[0].id, { fly: true }); }
    });
    $('q-clear').addEventListener('click', function () { clearQuery(); $('q').focus(); });
    $('q').addEventListener('focus', function () { if (!isDesk() && S.sel) closeDetail(); });
    $('chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-chip]'); if (!b) return;
      if (b.dataset.chip === 'open') S.open = !S.open;
      else S.cat = b.dataset.chip === S.cat ? 'all' : b.dataset.chip;
      S.group = null;
      if (S.sel && !matches(BY[S.sel])) { S.sel = null; showView('list'); syncURL(); }
      renderChips(); renderList(); recluster();
      fitTo(STORES.filter(matches), { max: 15.5 }); syncURL();
    });
    $('panel').addEventListener('click', function (e) {
      var row = e.target.closest('.row[data-id]');
      if (row) { select(row.dataset.id, { fly: true, focus: true }); return; }
      var act = e.target.closest('[data-act]'); if (!act) return;
      var a = act.dataset.act;
      if (a === 'back') { if (S.group && !S.sel) { S.group = null; renderList(); recluster(); } closeDetail(); }
      if (a === 'clear') { S.cat = 'all'; S.open = false; S.group = null; clearQuery(); renderChips(); }
      if (a === 'copy') copy(act.dataset.copy);
      if (a === 'staff') openStaff();
      if (a === 'share') {
        var s = BY[S.sel], url = location.href, n = C.names(s, S.lang);
        if (navigator.share) navigator.share({ title: n.title, text: n.title + ' · ' + s.perk[S.lang], url: url }).catch(function () {});
        else copy(url);
      }
    });
    $('staff').addEventListener('click', function (e) { if (e.target === $('staff') || e.target.closest('[data-act="staff-close"]')) closeStaff(); });
    $('b-theme').addEventListener('click', function () {
      var t = theme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', t); store.set('cnx-theme', t); renderChrome(); restyle();
    });
    $('b-locate').addEventListener('click', locate);
    $('b-fit').addEventListener('click', function () { S.group = null; renderList(); fitTo(STORES.filter(matches), { max: 15 }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('staff').hidden) { closeStaff(); }
      else if (e.key === 'Escape' && S.sel) { closeDetail(); }
      else if (e.key === '/' && document.activeElement !== $('q')) { e.preventDefault(); $('q').focus(); }
    });
    darkMQ.addEventListener('change', function () { renderChrome(); restyle(); });
    deskMQ.addEventListener('change', function () { setSheet(S.sheet); });
    new ResizeObserver(function () {
      document.documentElement.style.setProperty('--top-h', $('top').getBoundingClientRect().height + 'px');
      setSheet(S.sheet);
    }).observe($('top'));
    window.addEventListener('resize', function () { setSheet(S.sheet); });
    // refresh "open now" every minute
    setInterval(function () { renderList(); if (S.sel) renderDetail(); }, 60000);
  }

  /* ------------------------------------------------------------------ boot */
  renderChrome(); renderChips(); renderList(); bind(); setSheet('peek'); initMap();
  var deep = params.get('shop');
  if (deep && BY[deep]) {
    if (map) map.once('load', function () { select(deep, { fly: true, instant: true }); }); else select(deep, { fly: false });
  }
  syncURL();
  window.__cnx = { S: S, select: select, setLang: setLang, map: function () { return map; } };
})();
