/* Shared logic + markup for the shop map (used by the app and the design-system page). */
(function (g) {
  'use strict';
  var I = g.CNX_I18N, icon = g.CNXIcon, AREAS = g.CNX_AREAS || {};
  var CATS = ['cafe', 'food', 'spa', 'sport'];
  var HTML_LANG = { th: 'th', en: 'en', zh: 'zh-Hans' };
  /* category vocabulary only: specific items (hot pot, shoes, boxing…) live in each shop's own tags */
  var SYN = {
    cafe: 'coffee cafe café espresso latte americano drink กาแฟ คาเฟ่ ร้านกาแฟ เครื่องดื่ม 咖啡 咖啡馆 饮品',
    food: 'food restaurant eat dinner lunch thai อาหาร ร้านอาหาร กิน ข้าว 餐厅 美食 吃饭',
    spa: 'massage spa oil foot wellness recovery นวด สปา นวดไทย นวดเท้า 按摩 水疗 泰式按摩 足疗',
    sport: 'sport sports gear equipment กีฬา อุปกรณ์กีฬา 运动 装备'
  };
  var SUFFIX = /^(ร้าน)|(店|馆|館|房|屋)$/g;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(lang, key, vars) {
    var s = (I[lang] && I[lang][key]) || I.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function scriptOf(text) { return /[฀-๿]/.test(text) ? 'th' : /[㐀-鿿]/.test(text) ? 'zh' : 'en'; }
  function langSpan(text, cls) {
    return '<span' + (cls ? ' class="' + cls + '"' : '') + ' lang="' + HTML_LANG[scriptOf(text)] + '">' + esc(text) + '</span>';
  }

  /* Identity rule (client decision): the shop name is always exactly as written in the partner sheet,
     in every language. It is never replaced by a translation. In Thai or Chinese mode the converted name
     appears only as a smaller second line under it. `local` is the Thai name, for drivers and staff. */
  function sheetName(s) { return String(s.sheetName || s.name.en).replace(/\s+/g, ' ').trim(); }
  function names(s, lang) {
    var title = sheetName(s);
    var sub = lang === 'en' ? '' : (s.name[lang] || '');
    if (sub && sub.indexOf(title + ' ') === 0) sub = sub.slice(title.length + 1);   // "TANN 咖啡馆" under "TANN" → "咖啡馆"
    if (sub === title) sub = '';
    return { title: title, sub: sub, local: s.name.th !== title ? s.name.th : '' };
  }
  function initials(s) {
    var w = (s.name.en || '').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(function (x) { return x && !/^(the|and|of|at)$/i.test(x); });
    return ((w[0] || '?')[0] + (w.length > 1 && w[1].length > 2 && !/^\d/.test(w[1]) ? w[1][0] : '')).toUpperCase();
  }
  function logo(s, base, eager) {
    return s.logo ? '<img src="' + esc((base || '') + s.logo) + '" alt=""' + (eager ? '' : ' loading="lazy"') + ' decoding="async">'
                  : '<span class="mono" aria-hidden="true">' + esc(initials(s)) + '</span>';
  }

  /* ---------- hours (Asia/Bangkok, the sheet lists one daily schedule) ---------- */
  function bkkMinutes(date) {
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date || new Date());
    var h = +p.find(function (x) { return x.type === 'hour'; }).value, m = +p.find(function (x) { return x.type === 'minute'; }).value;
    return h * 60 + m;
  }
  function hhmm(min) { min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
  function closeText(c) { return c === 1440 ? '24:00' : hhmm(c); }
  function hoursText(s) {
    if (!s.hours.length) return s.hoursRaw || '–';
    return s.hours.map(function (h) { return hhmm(h[0]) + '–' + closeText(h[1]); }).join(', ');
  }
  /* → {open, soon, close} | {open:false, next, later:boolean (opens later today)} */
  function status(s, now) {
    if (!s.hours.length) return null;
    var n = now == null ? bkkMinutes() : now;
    for (var i = 0; i < s.hours.length; i++) {
      var o = s.hours[i][0], c = s.hours[i][1];
      if ((n >= o && n < c) || (n + 1440 >= o && n + 1440 < c)) {
        var x = n >= o && n < c ? n : n + 1440;
        return { open: true, soon: c - x <= 60, close: c };
      }
    }
    var starts = s.hours.map(function (h) { return h[0]; });
    var today = starts.filter(function (o) { return o > n; }).sort(function (a, b) { return a - b; });
    if (today.length) return { open: false, next: today[0], later: true };
    return { open: false, next: Math.min.apply(null, starts), later: false };
  }
  function statusHTML(s, lang, now) {
    var st = status(s, now);
    if (!st) return '';
    if (st.open && st.soon) return '<span class="status is-soon"><b>' + esc(t(lang, 'closingSoon', { t: closeText(st.close) })) + '</b></span>';
    if (st.open) return '<span class="status is-open"><b>' + esc(t(lang, 'openNow')) + '</b> ' + esc(t(lang, 'closesAt', { t: closeText(st.close) })) + '</span>';
    if (st.later) return '<span class="status"><b>' + esc(t(lang, 'notYet')) + '</b> · ' + esc(t(lang, 'opensAt', { t: hhmm(st.next) })) + '</span>';
    return '<span class="status"><b>' + esc(t(lang, 'closed')) + '</b> · ' + esc(t(lang, 'opensTomorrow', { t: hhmm(st.next) })) + '</span>';
  }
  function isOpen(s, now) { var st = status(s, now); return !!(st && st.open); }

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
  function foldChar(c) { return c.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '').replace(/[\s\-_.,&@!()/·:]+/g, ' ').trim(); }
  var seg = {};
  function segment(tk) {
    var lang = scriptOf(tk); if (lang === 'en' || !g.Intl || !Intl.Segmenter) return [tk];
    try {
      seg[lang] = seg[lang] || new Intl.Segmenter(lang === 'zh' ? 'zh' : 'th', { granularity: 'word' });
      var out = []; for (var it = seg[lang].segment(tk)[Symbol.iterator](), r = it.next(); !r.done; r = it.next()) { if (r.value.isWordLike) out.push(r.value.segment); }
      return out.length ? out : [tk];
    } catch (e) { return [tk]; }
  }
  function buildIndex(stores) {
    stores.forEach(function (s) {
      var nm = [s.name.en, s.name.th, s.name.zh, s.sheetName].map(norm);
      var cat = s.cats.map(function (c) { return [SYN[c], I.th.cats[c], I.en.cats[c], I.zh.cats[c], I.th.catsLong[c], I.en.catsLong[c], I.zh.catsLong[c]].join(' '); }).join(' ');
      var area = AREAS[s.area] ? [AREAS[s.area].en, AREAS[s.area].th, AREAS[s.area].zh].join(' ') : '';
      s._ix = { name: nm, nameJoined: nm.map(function (x) { return x.replace(/ /g, ''); }), meta: norm(cat + ' ' + area + ' ' + (s.tags || '') + ' ' + s.address),
        offer: norm([s.offer.en, s.offer.th, s.offer.zh, s.perk.en, s.perk.th, s.perk.zh].join(' ')) };
    });
  }
  function hitWord(hay, tk) { return hay.indexOf(tk) === 0 || hay.indexOf(' ' + tk) >= 0; }
  function tokenScore(s, tk) {
    var ascii = /^[\x00-\x7f]+$/.test(tk), short = ascii && tk.length <= 2, best = 0;
    s._ix.name.forEach(function (n, j) {
      if (hitWord(n, tk)) best = Math.max(best, 10);
      else if (!short && (n.indexOf(tk) >= 0 || s._ix.nameJoined[j].indexOf(tk) >= 0)) best = Math.max(best, 7);
    });
    if (!best && (short ? hitWord(s._ix.meta, tk) : s._ix.meta.indexOf(tk) >= 0)) best = 5;
    if (!best && !short && s._ix.offer.indexOf(tk) >= 0) best = 2;
    return best;
  }
  /* every token must match somewhere; an unmatched Thai/Chinese token is split into words
     (กาแฟนิมมาน → กาแฟ + นิมมาน, 宁曼咖啡 → 宁曼 + 咖啡) and generic suffixes are dropped (ร้านนวด, 咖啡店) */
  function score(s, q) {
    var tokens = norm(q).split(' ').filter(Boolean);
    if (!tokens.length) return 1;
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i], sc = tokenScore(s, tk);
      if (!sc) {
        var stripped = tk.replace(SUFFIX, '');
        if (stripped && stripped !== tk) sc = tokenScore(s, stripped);
      }
      if (!sc) {
        var parts = segment(tk).map(function (p) { return p.replace(SUFFIX, '') || p; }).filter(Boolean);
        if (parts.length > 1) {
          var sum = 0;
          for (var k = 0; k < parts.length; k++) { var ps = tokenScore(s, parts[k]); if (!ps) { sum = 0; break; } sum += ps; }
          sc = sum ? Math.round(sum / parts.length) : 0;
        }
      }
      if (!sc) return 0;
      total += sc;
    }
    return total;
  }
  /* highlight against the folded text but splice the original characters (café ↔ cafe) */
  function highlight(text, q) {
    text = String(text);
    var tokens = norm(q).split(' ').filter(Boolean).sort(function (a, b) { return b.length - a.length; });
    if (!tokens.length) return esc(text);
    var folded = '', map = [];
    for (var i = 0; i < text.length; i++) { var f = foldChar(text[i]); for (var j = 0; j < f.length; j++) { folded += f[j]; map.push(i); } }
    for (var k = 0; k < tokens.length; k++) {
      var at = folded.indexOf(tokens[k]);
      if (at >= 0) {
        var a = map[at], b = map[at + tokens[k].length - 1] + 1;
        while (b < text.length && /[ัิ-ฺ็-๎]/.test(text[b])) b++;   // keep Thai marks with their consonant
        return esc(text.slice(0, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>' + esc(text.slice(b));
      }
    }
    return esc(text);
  }

  /* ---------- markup ---------- */
  function catOf(s, active) { return active && s.cats.indexOf(active) >= 0 ? active : s.cats[0]; }
  function pinLabel(s, lang, c) { return names(s, lang).title + ', ' + I[lang].cats[c] + ', ' + s.perk[lang]; }
  function pinHTML(s, o) {
    o = o || {};
    var lang = o.lang || 'en', c = catOf(s, o.cat);
    return '<button type="button" class="pin' + (o.active ? ' is-active' : '') + (o.dim ? ' is-dim' : '') + '" data-cat="' + c + '" data-id="' + esc(s.id) + '"' +
      ' style="--logo-bg:' + esc(s.bg) + '" aria-label="' + esc(o.label || pinLabel(s, lang, c)) + '">' +
      '<span class="pin-disc">' + logo(s, o.base, true) + '</span><span class="pin-badge">' + icon(c) + '</span>' +
      (o.showLabel ? '<span class="pin-label" lang="' + HTML_LANG[scriptOf(o.showLabel)] + '">' + esc(o.showLabel) + '</span>' : '') + '</button>';
  }
  function clusterHTML(list, o) {
    o = o || {};
    var seen = {}, faces = [];
    list.forEach(function (s) { var k = s.logo || s.id; if (!seen[k] && faces.length < 3) { seen[k] = 1; faces.push(s); } });
    var html = faces.map(function (s) { return '<span class="cluster-face" style="background:' + esc(s.bg) + '">' + logo(s, o.base, true) + '</span>'; }).join('');
    var lang = o.lang || 'en';
    return '<button type="button" class="cluster" aria-label="' + esc(o.label || t(lang, 'countFound', { n: list.length })) + '">' + html + '<b>' + list.length + '</b></button>';
  }
  function rowHTML(s, lang, o) {
    o = o || {};
    var n = names(s, lang), c = catOf(s, o.cat), area = AREAS[s.area] ? AREAS[s.area][lang] : '';
    return '<button type="button" class="row" data-id="' + esc(s.id) + '" data-cat="' + c + '">' +
      '<span class="row-logo" style="--logo-bg:' + esc(s.bg) + '">' + logo(s, o.base) + '</span>' +
      '<span class="row-main"><span class="row-name" lang="' + HTML_LANG[scriptOf(n.title)] + '">' + (o.q ? highlight(n.title, o.q) : esc(n.title)) + '</span>' +
      '<span class="row-sub">' + (n.sub ? langSpan(n.sub) + ' · ' : '') + esc(area) + '</span>' +
      '<span class="row-meta"><span class="cat-tag" title="' + esc(I[lang].cats[c]) + '">' + icon(c) + '<span class="vh">' + esc(I[lang].cats[c]) + '</span></span>' + statusHTML(s, lang, o.now) + '</span></span>' +
      '<span class="row-end"><span class="perk">' + esc(s.perk[lang]) + '</span>' + (o.dist != null ? '<span class="row-dist">' + esc(distText(o.dist, lang)) + '</span>' : '') + '</span></button>';
  }
  function whoText(s, lang) { return t(lang, s.who === 'runner' ? 'redeemRunner' : 'redeemBoth'); }
  function ticketHTML(s, lang, o) {
    o = o || {};
    return '<section class="ticket" aria-label="' + esc(t(lang, 'privilege')) + '"><div class="ticket-eyebrow">' + icon('ticket') + esc(t(lang, 'privilege')) +
      (s.who === 'runner' ? '<span class="who">' + esc(t(lang, 'runnersOnly')) + '</span>' : '') + '</div>' +
      (function () { var parts = String(s.perk[lang]).split(' · ');
        return '<div class="ticket-perk">' + esc(parts[0]) + (parts[1] ? '<small>' + esc(parts[1]) + '</small>' : '') + '</div>'; })() +
      '<div class="ticket-body">' + esc(s.offer[lang]) + '</div>' +
      '<div class="ticket-foot">' + esc(whoText(s, lang)) + '</div>' +
      (o.staffButton ? '<button type="button" class="btn btn-staff" data-act="staff">' + icon('ticket') + '<span>' + esc(t(lang, 'showStaff')) + '</span></button>' : '') + '</section>';
  }
  function directionsURL(s) {
    var apple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    return apple ? 'https://maps.apple.com/?daddr=' + s.lat + ',' + s.lng + '&q=' + encodeURIComponent(s.name.en)
                 : 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
  }

  g.CNX = { CATS: CATS, HTML_LANG: HTML_LANG, t: t, esc: esc, names: names, logo: logo, initials: initials, status: status, statusHTML: statusHTML, isOpen: isOpen,
    hoursText: hoursText, hhmm: hhmm, bkkMinutes: bkkMinutes, km: km, distText: distText, buildIndex: buildIndex, score: score, highlight: highlight, norm: norm,
    pinHTML: pinHTML, pinLabel: pinLabel, clusterHTML: clusterHTML, rowHTML: rowHTML, ticketHTML: ticketHTML, whoText: whoText, directionsURL: directionsURL,
    catOf: catOf, scriptOf: scriptOf, langSpan: langSpan, sheetName: sheetName };
})(window);
