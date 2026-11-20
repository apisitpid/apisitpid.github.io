/* 24px line icons, 1.8 stroke, round caps. Category glyphs are drawn to read at 12px inside pin badges. */
(function (g) {
  var P = {
    cafe: '<path d="M4.5 9h11.5v4.2a5.3 5.3 0 0 1-5.3 5.3h-.9a5.3 5.3 0 0 1-5.3-5.3z"/><path d="M16 10.2h1.3a2.6 2.6 0 0 1 0 5.2H16"/><path d="M8.7 3.2c-.8 1 .8 1.9 0 3M12.2 3.2c-.8 1 .8 1.9 0 3"/><path d="M4 21h13"/>',
    food: '<path d="M3 12.5h18a9 9 0 0 1-18 0z"/><path d="M14.8 3 11 11.2M20 4.2l-6.3 7"/>',
    spa: '<path d="M12 20.5c-4.6 0-8.4-3-9-7.6 3.6 0 6.8 2 9 5.3 2.2-3.3 5.4-5.3 9-5.3-.6 4.6-4.4 7.6-9 7.6z"/><path d="M12 17.8c-2.3-3-2.7-7.9 0-12.6 2.7 4.7 2.3 9.6 0 12.6z"/>',
    sport: '<path d="M3 16.5h16.6c.8 0 1.4-.6 1.4-1.4 0-1.7-1.3-3-3-3.3L13.2 11l-2.6-4.5H8.3L7 9.4 4.4 8.6 3 12.4z"/><path d="M3 19.5h18M10 10.5l1.6-.8M11.4 12.6l1.6-.8"/>',
    all: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    directions: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M9 14.2v-2.4c0-.9.7-1.6 1.6-1.6h4.4M13 8.2l2 2-2 2"/>',
    phone: '<path d="M5 3.5h3.3l1.6 4.3-2.1 1.4a11.5 11.5 0 0 0 5.9 5.9l1.4-2.1 4.4 1.6v3.3a1.9 1.9 0 0 1-2 1.9A16.6 16.6 0 0 1 3.1 5.5 1.9 1.9 0 0 1 5 3.5z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".6"/><circle cx="4" cy="12" r=".6"/><circle cx="4" cy="18" r=".6"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
    ticket: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.5 2.5 0 0 0 0-5z"/><path d="M14 6.5v11" stroke-dasharray="1.6 2"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z"/>',
    fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'
  };
  function icon(name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  g.CNXIcon = icon;
})(window);
