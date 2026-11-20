/* Chiang Mai "Navy & Gold" basemap for MapLibre, on OpenFreeMap vector tiles (OpenMapTiles schema).
   Gold marks the arteries (the roads you navigate by), navy carries the text, land stays quiet so logo pins lead.
   makeStyle(theme, lang) → style JSON.  theme: 'light' | 'dark'   lang: 'th' | 'en' | 'zh' */
(function (global) {
  'use strict';

  var PALETTE = {
    light: {
      land: '#E2E6ED', residential: '#DBE0E8', commercial: '#E6E2DA', park: '#D6E3D4', wood: '#CCDCC9',
      water: '#A9C1E0', waterway: '#94B2DA', building: '#DADFE8', buildingLine: '#CDD3DE',
      minor: '#FFFFFF', minorCase: '#AEB8C9', path: '#AAB3C4',
      major: '#F2D27E', majorCase: '#B8923F', motorway: '#E7B954', motorwayCase: '#9C7A2E',
      rail: '#B4BCCB', boundary: '#9AA5BD',
      placeText: '#14254A', placeHalo: 'rgba(244,246,250,.92)', roadText: '#46557A', roadHalo: '#FFFFFF',
      temple: '#8A6A22', templeHalo: 'rgba(250,247,238,.95)', peak: '#5E4B1C', waterText: '#4F6E9C'
    },
    dark: {
      land: '#0D1834', residential: '#111E3D', commercial: '#14203F', park: '#122A35', wood: '#11293A',
      water: '#1A3260', waterway: '#22407A', building: '#18284D', buildingLine: '#1E3159',
      minor: '#1E2E55', minorCase: '#152447', path: '#24365F',
      major: '#4B4128', majorCase: '#6F5C2C', motorway: '#8C7334', motorwayCase: '#5E4D24',
      rail: '#2C3D66', boundary: '#3D507E',
      placeText: '#E3E9F6', placeHalo: 'rgba(13,24,52,.9)', roadText: '#9AA8C8', roadHalo: '#0D1834',
      temple: '#D9B864', templeHalo: 'rgba(13,24,52,.92)', peak: '#E3C77E', waterText: '#6F8BC0'
    }
  };

  function nameExpr(lang) {
    var chain = {
      th: ['name:th', 'name', 'name:latin', 'name_en'],
      en: ['name:en', 'name_en', 'name:latin', 'name'],
      zh: ['name:zh-Hans', 'name:zh', 'name:en', 'name_en', 'name:latin', 'name']
    }[lang] || ['name'];
    return ['coalesce'].concat(chain.map(function (k) { return ['get', k]; }));
  }

  var FONT = ['Noto Sans Regular'], FONT_B = ['Noto Sans Bold'], FONT_I = ['Noto Sans Italic'];
  function z(stops) { return { stops: stops }; }
  function interp(stops) { return ['interpolate', ['exponential', 1.5], ['zoom']].concat([].concat.apply([], stops)); }
  function cls(list) { return ['match', ['get', 'class'], list, true, false]; }

  function makeStyle(theme, lang) {
    var c = PALETTE[theme] || PALETTE.light;
    var name = nameExpr(lang);
    var notTunnel = ['!=', ['get', 'brunnel'], 'tunnel'];

    function road(id, classes, color, widths, extra) {
      return Object.assign({
        id: id, type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['all', cls(classes), notTunnel, ['==', ['geometry-type'], 'LineString']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': color, 'line-width': interp(widths) }
      }, extra || {});
    }

    return {
      version: 8,
      name: 'cnx-navy-gold-' + theme,
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet',
        attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' } },
      layers: [
        { id: 'land', type: 'background', paint: { 'background-color': c.land } },
        { id: 'landuse-res', type: 'fill', source: 'omt', 'source-layer': 'landuse',
          filter: cls(['residential', 'suburb', 'neighbourhood']), paint: { 'fill-color': c.residential } },
        { id: 'landuse-com', type: 'fill', source: 'omt', 'source-layer': 'landuse',
          filter: cls(['commercial', 'retail', 'school', 'university', 'college', 'hospital']), paint: { 'fill-color': c.commercial } },
        { id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover',
          filter: cls(['wood', 'forest']), paint: { 'fill-color': c.wood } },
        { id: 'grass', type: 'fill', source: 'omt', 'source-layer': 'landcover',
          filter: cls(['grass', 'farmland']), paint: { 'fill-color': c.park, 'fill-opacity': 0.6 } },
        { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.park } },
        { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway',
          paint: { 'line-color': c.waterway, 'line-width': interp([[10, 0.6], [16, 3]]) } },
        { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
        { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14,
          paint: { 'fill-color': c.building, 'fill-outline-color': c.buildingLine, 'fill-opacity': interp([[14, 0], [15.5, 1]]) } },

        road('path', ['path', 'track'], c.path, [[14, 0.5], [18, 2]], { minzoom: 14,
          paint: { 'line-color': c.path, 'line-width': interp([[14, 0.5], [18, 2]]), 'line-dasharray': [2, 1.5] } }),
        road('minor-case', ['minor', 'service'], c.minorCase, [[13, 0.5], [16, 7], [19, 22]], { minzoom: 13 }),
        road('minor', ['minor', 'service'], c.minor, [[13, 0.4], [16, 5.5], [19, 19]], { minzoom: 13 }),
        road('mid-case', ['tertiary', 'secondary'], c.minorCase, [[10, 0.6], [14, 5], [18, 24]]),
        road('mid', ['tertiary', 'secondary'], c.minor, [[10, 0.5], [14, 3.8], [18, 21]]),
        road('major-case', ['primary', 'trunk'], c.majorCase, [[8, 0.8], [13, 4.5], [18, 30]]),
        road('major', ['primary', 'trunk'], c.major, [[8, 0.6], [13, 3.2], [18, 26]]),
        road('motorway-case', ['motorway'], c.motorwayCase, [[6, 1], [13, 5.5], [18, 32]]),
        road('motorway', ['motorway'], c.motorway, [[6, 0.8], [13, 4], [18, 28]]),
        { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: cls(['rail', 'transit']),
          paint: { 'line-color': c.rail, 'line-width': 1.2, 'line-dasharray': [3, 2] } },
        { id: 'boundary', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['<=', ['get', 'admin_level'], 4],
          paint: { 'line-color': c.boundary, 'line-width': 1, 'line-dasharray': [3, 2] } },

        { id: 'water-name', type: 'symbol', source: 'omt', 'source-layer': 'waterway', minzoom: 13,
          filter: ['==', ['get', 'class'], 'river'],
          layout: { 'text-field': name, 'text-font': FONT_I, 'symbol-placement': 'line', 'text-size': 12, 'text-letter-spacing': lang === 'en' ? 0.1 : 0 },
          paint: { 'text-color': c.waterText, 'text-halo-color': c.placeHalo, 'text-halo-width': 1.4 } },
        { id: 'road-name', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 14,
          filter: cls(['primary', 'secondary', 'tertiary', 'trunk', 'minor']),
          layout: { 'text-field': name, 'text-font': FONT, 'symbol-placement': 'line', 'text-size': interp([[14, 10.5], [18, 13]]),
            'text-max-angle': 30, 'symbol-spacing': 350 },
          paint: { 'text-color': c.roadText, 'text-halo-color': c.roadHalo, 'text-halo-width': 1.6 } },
        { id: 'temple', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 15,
          filter: ['all', ['==', ['get', 'class'], 'place_of_worship'], ['has', 'name']],
          layout: { 'text-field': name, 'text-font': FONT_I, 'text-size': 11.5, 'text-max-width': 8, 'text-padding': 6 },
          paint: { 'text-color': c.temple, 'text-halo-color': c.templeHalo, 'text-halo-width': 1.5 } },
        { id: 'peak', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 11,
          filter: ['has', 'name'],
          layout: { 'text-field': ['format', '▲ ', {}, name, {}, ['case', ['has', 'ele'], ['concat', '\n', ['to-string', ['get', 'ele']], ' m'], ''], { 'font-scale': 0.8 }],
            'text-font': FONT_B, 'text-size': 12, 'text-max-width': 9 },
          paint: { 'text-color': c.peak, 'text-halo-color': c.templeHalo, 'text-halo-width': 1.6 } },
        { id: 'place-small', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 12,
          filter: cls(['suburb', 'neighbourhood', 'quarter', 'village', 'hamlet']),
          layout: { 'text-field': name, 'text-font': FONT_B, 'text-size': interp([[12, 11], [16, 14]]),
            'text-transform': 'uppercase', 'text-letter-spacing': lang === 'en' ? 0.12 : 0, 'text-max-width': 8 },
          paint: { 'text-color': c.placeText, 'text-opacity': 0.62, 'text-halo-color': c.placeHalo, 'text-halo-width': 1.6 } },
        { id: 'place-town', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 15,
          filter: cls(['town', 'city']),
          layout: { 'text-field': name, 'text-font': FONT_B, 'text-size': interp([[8, 13], [13, 20]]), 'text-max-width': 8 },
          paint: { 'text-color': c.placeText, 'text-halo-color': c.placeHalo, 'text-halo-width': 2 } }
      ]
    };
  }

  global.CNXBasemap = { makeStyle: makeStyle, nameExpr: nameExpr, palette: PALETTE };
})(window);
