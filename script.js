/* Blossom Oud — invitation runtime: fills data, envelope intro, music, countdown, timeline, RSVP. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var Q = new URLSearchParams(location.search);
  var PREVIEW = Q.has('preview'), SKIP = Q.has('skip') || PREVIEW, MUSIC_OFF = Q.get('music') === '0';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  function parseDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || ''); return m ? { d: new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)), t: !!m[4] } : null; }
  function fmtTime(h, mi) { var ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (mi ? ':' + pad(mi) : '') + ' ' + ap; }

  function derive(d) {
    var o = Object.assign({}, d), p = parseDate(d.event_date);
    o.date_long = p ? p.d.getDate() + ' ' + MONTHS[p.d.getMonth()] + ' ' + p.d.getFullYear() : '';
    o.time_line = p && p.t ? ((d.time_prefix || '').trim() ? d.time_prefix.trim() + ' ' : '') + fmtTime(p.d.getHours(), p.d.getMinutes()) : '';
    var a = (d.name1 || '').trim(), b = (d.name2 || '').trim();
    o.names_amp = a && b ? a + ' & ' + b : a || b;
    return o;
  }

  /* shrink any single-line text that would overflow its box (long names / titles) */
  function fit() {
    var vw = Math.min(document.documentElement.clientWidth, 440);
    $$('.hero-n1,.hero-n2,.fit,.card-venue,.pal-title,.lg__t').forEach(function (el) {
      el.style.fontSize = ''; if (!el.textContent) return;
      var base = parseFloat(getComputedStyle(el).fontSize), r = document.createRange(); r.selectNodeContents(el);
      var w = r.getBoundingClientRect().width, max = Math.min(el.clientWidth || vw, vw) - 18;
      if (w > max) el.style.fontSize = Math.max(18, Math.floor(base * max / w)) + 'px';
    });
    var ct = $('#cardText'); ct.style.fontSize = ''; ct.style.lineHeight = '';
    for (var fs = 21; fs > 12 && ct.offsetHeight > 330; fs--) { ct.style.fontSize = fs + 'px'; ct.style.lineHeight = Math.round(fs * 1.38) + 'px'; }
  }

  function render(d) {
    $$('[data-bind]').forEach(function (el) {
      var k = el.getAttribute('data-bind'), v = d[k];
      v = v == null ? '' : String(v).trim();
      if (el.hasAttribute('data-ml')) el.innerHTML = esc(v).replace(/\n/g, '<br>'); else el.textContent = v;
      if (el.hasAttribute('data-opt')) el.hidden = !v;
    });
    $$('[data-src-k]').forEach(function (el) { var v = d[el.getAttribute('data-src-k')]; if (v) el.src = v; });
    document.title = (d.names_amp ? d.names_amp + ' — ' : '') + 'Wedding Invitation';

    /* seal */
    var st = (d.seal_text || '').trim(), se = $('#sealText');
    if (!st) { var a = (d.name1 || '').trim(), b = (d.name2 || '').trim(); st = (a ? a[0].toUpperCase() : '') + (a && b ? '&' : '') + (b ? b[0].toUpperCase() : ''); }
    se.textContent = st; se.className = 'seal__t ' + (AR.test(st) ? 'ar' : 'lat');
    $('.card-top').style.fontFamily = AR.test(d.card_top || '') ? '' : "'Imperial Script',cursive";
    $('.card-top').style.direction = AR.test(d.card_top || '') ? '' : 'ltr';

    fit();

    /* timeline */
    var tl = $('#tl'), evs = (d.events || []).filter(function (e) { return e && (e.name || e.time); });
    $$('.tl__dot,.tl__time,.tl__name', tl).forEach(function (n) { n.remove(); });
    var OFF = [0, 82, 170, 247], dotTop = function (i) { return 198 + (i < 4 ? OFF[i] : 247 + (i - 3) * 80); };
    evs.forEach(function (e, i) {
      var y = dotTop(i), dot = document.createElement('div'); dot.className = 'tl__dot'; dot.style.top = y + 'px'; tl.appendChild(dot);
      var t = document.createElement('div'); t.className = 'tl__time'; t.textContent = e.time || ''; tl.appendChild(t);
      t.style.top = (y + 7 - t.offsetHeight / 2) + 'px';
      var n = document.createElement('div'); n.className = 'tl__name'; n.textContent = e.name || ''; tl.appendChild(n);
      n.style.top = (y + 7.5 - n.offsetHeight / 2) + 'px';
    });
    var last = evs.length ? dotTop(evs.length - 1) : 198;
    $('#tlLine').style.height = (last - 198 + 14) + 'px';
    $('#tlLine').hidden = $('#tlLotus').hidden = !evs.length;
    $('#tlLotus').dataset.stops = evs.map(function (e, i) { return dotTop(i) - 198; }).join(',');
    $('#s-tl').style.height = (last + 44) + 'px';
    $('#s-tl').hidden = !evs.length;

    /* venue & map */
    var hasVenue = !!(d.venue || d.venue_city || d.venue_address);
    $('#s-venue').hidden = $('#s-mapt').hidden = $('#s-map').hidden = !hasVenue;
    if (hasVenue) {
      var q = encodeURIComponent([d.venue, d.venue_address, d.venue_city].filter(Boolean).join(', '));
      var mf = $('#mapFrame'), src = 'https://maps.google.com/maps?q=' + q + '&z=15&output=embed';
      if (mf.getAttribute('src') !== src) mf.setAttribute('src', src);
      $('#mapOpen').href = d.venue_map_url || '#'; $('#mapOpen').hidden = !d.venue_map_url;
      $('#s-map').style.height = d.venue_map_url ? '380px' : '';
    }
    $('.card-venue').hidden = !d.venue;

    /* dress code */
    var dressOn = !!(d.dress_title || d.dress_text || d.palette_title);
    $('#s-dress').hidden = !dressOn;
    if (dressOn) {
      var dt = $('#dressText'), extra = Math.max(0, dt.offsetHeight - 75);
      $('#dressText').hidden = !d.dress_text;
      var palOn = !!d.palette_title; $('#palTitle').hidden = $('#pal').hidden = !palOn;
      $('#palTitle').style.top = (451 + extra) + 'px'; $('#pal').style.top = (523 + extra) + 'px';
      $('#s-dress').style.height = (palOn ? 579 + extra : 343 + dt.offsetHeight + 40) + 'px';
      [1, 2, 3, 4].forEach(function (i) { var c = d['palette' + i]; $('#pc' + i).style.background = c || 'transparent'; $('#pc' + i).parentNode.hidden = !c; });
    }
    ['ladies', 'gents'].forEach(function (k) { $('[data-wrap="' + k + '"]').hidden = !(d[k + '_title'] || d[k + '_text']); });
    $('#s-lg').hidden = !(d.ladies_title || d.ladies_text || d.gents_title || d.gents_text);
    $('#s-rsvp').hidden = !d.rsvp_title && !d.rsvp_whatsapp;
    $('#credit').hidden = !d.music_url;
  }

  /* ---------- entrance animations ---------- */
  function observe() {
    $$('[data-anim]').forEach(function (el) {
      var s = el.style; if (el.dataset.dur) s.setProperty('--dur', el.dataset.dur + 's'); if (el.dataset.delay) s.setProperty('--delay', el.dataset.delay + 's');
      if (el.dataset.dist) s.setProperty('--dist', el.dataset.dist + 'px'); if (el.dataset.scale) s.setProperty('--scale', el.dataset.scale);
    });
    if (!('IntersectionObserver' in window)) { $$('[data-anim]').forEach(function (e) { e.classList.add('in'); }); $('#chand').classList.add('swing'); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -5% 0px' });
    $$('[data-anim]').forEach(function (e) { io.observe(e); });
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var c = e.target; c.classList.remove('swing'); void c.offsetWidth; c.classList.add('swing'); } }); }, { threshold: 0.6 });
    io2.observe($('#chand'));
  }

  /* ---------- lotus walks down the timeline with scroll, turning 44° per stop ---------- */
  function lotusLoop() {
    var lo = $('#tlLotus'), sec = $('#s-tl'), ticking = false;
    function upd() {
      ticking = false; var stops = (lo.dataset.stops || '0').split(',').map(Number), r = sec.getBoundingClientRect();
      var p = Math.max(0, (window.innerHeight * 0.62 - (r.top + 200)) / 100), i = Math.min(stops.length - 1, Math.floor(p)), f = Math.min(1, p - i);
      var y = i >= stops.length - 1 ? stops[stops.length - 1] : stops[i] + (stops[i + 1] - stops[i]) * f;
      lo.style.translate = '0 ' + y + 'px'; lo.style.rotate = (Math.min(p, stops.length - 1) * 44) + 'deg';
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }

  /* ---------- countdown ---------- */
  function countdown(d) {
    var p = parseDate(d.event_date), box = $('#cd');
    if (!p) { $('#s-count').hidden = true; return; }
    var target = p.d, prev = {};
    function set(id, v) {
      var n = $('#' + id); v = id === 'cd-d' ? String(v) : pad(v);
      if (prev[id] === undefined) { n.textContent = v; prev[id] = v; return; }
      if (prev[id] === v) return; prev[id] = v;
      n.classList.add('out');
      setTimeout(function () { n.textContent = v; n.classList.remove('out'); n.classList.add('in'); void n.offsetWidth; n.classList.remove('in'); }, 280);
    }
    function tick() {
      var ms = target - new Date();
      if (ms <= 0) { box.hidden = true; $('#cdDone').hidden = false; return; }
      var s = Math.floor(ms / 1000);
      set('cd-d', Math.floor(s / 86400)); set('cd-h', Math.floor(s % 86400 / 3600)); set('cd-m', Math.floor(s % 3600 / 60)); set('cd-s', s % 60);
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---------- golden bokeh (canvas, light) ---------- */
  function bokeh() {
    var c = $('#bokeh'), x = c.getContext('2d'), W, H, P = [], dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < 46; i++) P.push({ x: Math.random(), y: Math.random(), r: i < 10 ? 10 + Math.random() * 22 : 1 + Math.random() * 3, v: .00004 + Math.random() * .00012, a: Math.random() * 6.28, s: .4 + Math.random() * 1.2 });
    function draw(t) {
      x.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        var yy = ((p.y - t * p.v) % 1 + 1) % 1, tw = .45 + .55 * Math.sin(t / 900 * p.s + p.a), px = p.x * W + Math.sin(t / 2600 + p.a) * 12, py = yy * H;
        var g = x.createRadialGradient(px, py, 0, px, py, p.r);
        g.addColorStop(0, p.r > 6 ? 'rgba(255,214,140,' + (.55 * tw) + ')' : 'rgba(255,248,220,' + tw + ')');
        g.addColorStop(1, 'rgba(255,200,120,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, p.r, 0, 6.283); x.fill();
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ---------- music ---------- */
  var audio = $('#bgm'), btn = $('#audioBtn');
  function setMusic(d) { if (!d.music_url || MUSIC_OFF) { btn.remove(); return false; } audio.src = d.music_url; return true; }
  function play() { var p = audio.play(); if (p && p.catch) p.catch(function () { btn.classList.add('paused'); }); }
  btn.addEventListener('click', function () { if (audio.paused) { play(); btn.classList.remove('paused'); btn.setAttribute('aria-label', 'Pause music'); } else { audio.pause(); btn.classList.add('paused'); btn.setAttribute('aria-label', 'Play music'); } });

  /* ---------- envelope intro ---------- */
  function reveal() { document.body.classList.remove('is-locked'); }
  function intro(hasMusic) {
    var el = $('#intro'), started = false;
    if (SKIP) { el.remove(); reveal(); setTimeout(function () { document.body.classList.add('hero-in'); }, 60); if (btn.isConnected && audio.src) btn.classList.add('show'); return; }
    function open() {
      if (started) return; started = true;
      el.classList.add('opening'); if (hasMusic) { play(); btn.classList.add('show'); }
      setTimeout(function () { document.body.classList.add('hero-in'); }, 2300);
      setTimeout(function () { el.classList.add('gone'); reveal(); }, 3600);
      setTimeout(function () { el.remove(); }, 5200);
    }
    el.addEventListener('click', open);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  /* ---------- RSVP -> WhatsApp ---------- */
  function rsvp(d) {
    var f = $('#rsvpForm');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.name.value.trim(), att = (f.querySelector('input[name=att]:checked') || {}).value;
      $('#rfErr').hidden = !!(name && att); if (!name || !att) return;
      var lines = ['RSVP for ' + (d.names_amp || 'your wedding'), 'Name: ' + name, 'Reply: ' + att];
      if (f.guests.value.trim()) lines.push('Guests: ' + f.guests.value.trim());
      var num = String(d.rsvp_whatsapp || '').replace(/\D/g, '');
      $('#rfOk').hidden = false; window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    });
  }

  (window.JFY_READY || Promise.resolve()).then(function () {
    var d = derive(window.JFY_DATA || {});
    var go = function () {
      render(d); observe(); lotusLoop(); countdown(d); rsvp(d); bokeh();
      var hasMusic = setMusic(d); intro(hasMusic);
      var y = +Q.get('y'); if (y) setTimeout(function () { window.scrollTo(0, y); }, 60);
    };
    if (document.fonts && document.fonts.ready) { Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]).then(go); } else go();
    window.addEventListener('resize', fit);
  });
  window.addEventListener('message', function (e) { if (e.data && e.data.type === 'jfy:data') { window.JFY_DATA = e.data.data; location.reload(); } });
})();
