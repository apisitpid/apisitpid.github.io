/* Shared logic + markup for the shop map (used by the app and the design-system page). */
(function (g) {
  'use strict';
  var I = g.CNX_I18N, icon = g.CNXIcon, AREAS = g.CNX_AREAS || {};
  var CATS = ['cafe', 'food', 'spa', 'sport'];
  var SYN = {
    cafe: 'coffee cafe café espresso latte americano drink bakery กาแฟ คาเฟ่ เครื่องดื่ม 咖啡 咖啡馆 饮品',
    food: 'food restaurant eat dinner lunch thai northern hotpot bbq อาหาร ร้านอาหาร กิน ข้าว 餐厅 美食 吃 火锅',
    spa: 'massage spa thai massage oil foot wellness recovery clinic นวด สปา นวดไทย นวดเท้า 按摩 水疗 泰式按摩 足疗',
    sport: 'sport running shoes gear gym boxing muay thai fitness trail กีฬา อุปกรณ์ วิ่ง รองเท้า ยิม มวย ฟิตเนส 运动 跑步 装备 健身 拳馆 泰拳'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(lang, key, vars) {
    var s = (I[lang] && I[lang][key]) || I.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }

  /* Identity rule: the title is the name exactly as the shop writes it on its own logo (never translated).
     The second line is how to read/say it in the viewer's language; when that equals the title, show the
     other script so runners can point at it for a taxi or ask a local. */
  function names(s, lang) {
    var title = s.name[s.brand] || s.name.en;
    var sub = s.name[lang];
    if (!sub || sub === title) sub = s.brand === 'th' ? s.name.en : s.name.th;
    if (lang === 'zh' && s.name.zh !== title) sub = s.name.zh;
    return { title: title, sub: sub === title ? '' : sub };
  }
  function initials(s) {
    var w = (s.name.en || '').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(function (x) { return x && !/^(the|and|of|at)$/i.test(x); });
    return ((w[0] || '?')[0] + (w.length > 1 && w[1].length > 2 && !/^\d/.test(w[1]) ? w[1][0] : '')).toUpperCase();
  }
  function logo(s, base) {
    return s.logo ? '<img src="' + esc((base || '') + s.logo) + '" alt="" loading="lazy" decoding="async">'
                  : '<span class="mono" aria-hidden="true">' + esc(initials(s)) + '</span>';
  }

  /* ---------- hours (Asia/Bangkok, the sheet lists one daily schedule) ---------- */
  function bkkMinutes(date) {
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date || new Date());
    var h = +p.find(function (x) { return x.type === 'hour'; }).value, m = +p.find(function (x) { return x.type === 'minute'; }).value;
    return h * 60 + m;
  }
  function hhmm(min) { min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
  function hoursText(s) {
    if (!s.hours.length) return s.hoursRaw || '–';
    return s.hours.map(function (h) { return hhmm(h[0]) + '–' + (h[1] === 1440 ? '24:00' : hhmm(h[1])); }).join(', ');
  }
  function status(s, now) {
    if (!s.hours.length) return null;
    var n = now == null ? bkkMinutes() : now;
    for (var i = 0; i < s.hours.length; i++) {
      var o = s.hours[i][0], c = s.hours[i][1];
      var cands = [n, n + 1440];
      for (var k = 0; k < 2; k++) {
        var x = cands[k];
        if (x >= o && x < c) return { open: true, soon: c - x <= 60, close: c };
      }
    }
    var next = s.hours.map(function (h) { return h[0]; }).sort(function (a, b) { return ((a - n + 1440) % 1440) - ((b - n + 1440) % 1440); })[0];
    return { open: false, next: next };
  }
  function statusHTML(s, lang, now) {
    var st = status(s, now);
    if (!st) return '';
    if (st.open && st.soon) return '<span class="status is-soon"><b>' + esc(t(lang, 'closingSoon', { t: hhmm(st.close) })) + '</b></span>';
    if (st.open) return '<span class="status is-open"><b>' + esc(t(lang, 'openNow')) + '</b> ' + esc(t(lang, 'closesAt', { t: st.close === 1440 ? '24:00' : hhmm(st.close) })) + '</span>';
    return '<span class="status"><b>' + esc(t(lang, 'closed')) + '</b> · ' + esc(t(lang, 'opensAt', { t: hhmm(st.next) })) + '</span>';
  }

  /* ---------- distance ---------- */
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function distText(d, lang) {
    if (d == null) return '';
    return d < 1 ? Math.max(10, Math.round(d * 100) * 10) + ' ' + t(lang, 'm') : (d < 10 ? d.toFixed(1) : Math.round(d)) + ' ' + t(lang, 'km');
  }

  /* ---------- search ---------- */
  function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`]/g, '').replace(/[\s\-_.,&@!()/·]+/g, ' ').trim(); }
  function buildIndex(stores) {
    stores.forEach(function (s) {
      var nm = [s.name.en, s.name.th, s.name.zh, s.sheetName].map(norm);
      var cat = s.cats.map(function (c) { return [SYN[c], I.th.cats[c], I.en.cats[c], I.zh.cats[c], I.th.catsLong[c], I.en.catsLong[c], I.zh.catsLong[c]].join(' '); }).join(' ');
      var area = AREAS[s.area] ? [AREAS[s.area].en, AREAS[s.area].th, AREAS[s.area].zh].join(' ') : '';
      s._ix = { name: nm, nameJoined: nm.map(function (x) { return x.replace(/ /g, ''); }), meta: norm(cat + ' ' + area + ' ' + s.address),
        offer: norm([s.offer.en, s.offer.th, s.offer.zh, s.perk.en, s.perk.th, s.perk.zh].join(' ')) };
    });
  }
  function score(s, q) {
    var tokens = norm(q).split(' ').filter(Boolean);
    if (!tokens.length) return 1;
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i], best = 0;
      s._ix.name.forEach(function (n, j) {
        if (n.indexOf(tk) === 0 || n.indexOf(' ' + tk) >= 0) best = Math.max(best, 10);
        else if (n.indexOf(tk) >= 0 || s._ix.nameJoined[j].indexOf(tk) >= 0) best = Math.max(best, 7);
      });
      if (!best && s._ix.meta.indexOf(tk) >= 0) best = 5;
      if (!best && s._ix.offer.indexOf(tk) >= 0) best = 2;
      if (!best) return 0;
      total += best;
    }
    return total;
  }
  function highlight(text, q) {
    var tokens = norm(q).split(' ').filter(function (x) { return x.length > 0; });
    var safe = esc(text);
    if (!tokens.length) return safe;
    var lower = String(text).toLowerCase();
    var tk = tokens.sort(function (a, b) { return b.length - a.length; })[0];
    var at = lower.indexOf(tk);
    if (at < 0) return safe;
    return esc(text.slice(0, at)) + '<mark>' + esc(text.slice(at, at + tk.length)) + '</mark>' + esc(text.slice(at + tk.length));
  }

  /* ---------- markup ---------- */
  function catOf(s, active) { return active && s.cats.indexOf(active) >= 0 ? active : s.cats[0]; }
  function pinHTML(s, o) {
    o = o || {};
    var c = catOf(s, o.cat);
    return '<button type="button" class="pin' + (o.active ? ' is-active' : '') + (o.dim ? ' is-dim' : '') + '" data-cat="' + c + '" data-id="' + esc(s.id) + '"' +
      ' style="--logo-bg:' + esc(s.bg) + '" aria-label="' + esc(o.label || s.name.en) + '">' +
      '<span class="pin-disc">' + logo(s, o.base) + '</span><span class="pin-badge">' + icon(c) + '</span>' +
      (o.showLabel ? '<span class="pin-label">' + esc(o.showLabel) + '</span>' : '') + '</button>';
  }
  function clusterHTML(list, o) {
    o = o || {};
    var faces = list.slice(0, 3).map(function (s) { return '<span class="cluster-face" style="background:' + esc(s.bg) + '">' + logo(s, o.base) + '</span>'; }).join('');
    return '<button type="button" class="cluster" aria-label="' + esc(o.label || list.length + ' shops') + '">' + faces + '<b>' + list.length + '</b></button>';
  }
  function rowHTML(s, lang, o) {
    o = o || {};
    var n = names(s, lang), c = catOf(s, o.cat), area = AREAS[s.area] ? AREAS[s.area][lang] : '';
    return '<button type="button" class="row" data-id="' + esc(s.id) + '" data-cat="' + c + '">' +
      '<span class="row-logo" style="--logo-bg:' + esc(s.bg) + '">' + logo(s, o.base) + '</span>' +
      '<span class="row-main"><span class="row-name">' + (o.q ? highlight(n.title, o.q) : esc(n.title)) + '</span>' +
      '<span class="row-sub">' + esc([n.sub, area].filter(Boolean).join(' · ')) + '</span>' +
      '<span class="row-meta"><span class="cat-tag" title="' + esc(I[lang].cats[c]) + '">' + icon(c) + '<span class="vh">' + esc(I[lang].cats[c]) + '</span></span>' + statusHTML(s, lang, o.now) + '</span></span>' +
      '<span class="row-end"><span class="perk">' + esc(s.perk[lang]) + '</span>' + (o.dist != null ? '<span class="row-dist">' + esc(distText(o.dist, lang)) + '</span>' : '') + '</span></button>';
  }
  function ticketHTML(s, lang) {
    return '<section class="ticket" aria-label="' + esc(t(lang, 'privilege')) + '"><div class="ticket-head"><span class="ticket-eyebrow">' + icon('ticket') + esc(t(lang, 'privilege')) +
      '</span><span class="perk">' + esc(s.perk[lang]) + '</span></div><div class="ticket-body">' + esc(s.offer[lang]) + '</div>' +
      '<div class="ticket-foot">' + esc(t(lang, 'redeem')) + '</div></section>';
  }
  function directionsURL(s) { return 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng; }

  g.CNX = { CATS: CATS, t: t, esc: esc, names: names, logo: logo, initials: initials, status: status, statusHTML: statusHTML, hoursText: hoursText,
    hhmm: hhmm, bkkMinutes: bkkMinutes, km: km, distText: distText, buildIndex: buildIndex, score: score, highlight: highlight, norm: norm,
    pinHTML: pinHTML, clusterHTML: clusterHTML, rowHTML: rowHTML, ticketHTML: ticketHTML, directionsURL: directionsURL, catOf: catOf };
})(window);
