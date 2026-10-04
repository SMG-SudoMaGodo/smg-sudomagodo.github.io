/* SMG – Sudo Ma Godo · interfaccia */
(function () {
'use strict';
const E = window.SMG;
const KEY = 'smg-v1';
const ENGINE_V = 1;
const ICU = 'https://intervals.icu/api/v1/athlete/';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => E.ymd(new Date());

/* ------------------------------------------------------------------ */
/* Stato                                                               */
/* ------------------------------------------------------------------ */
function fresh() {
  return { profile: E.defaultProfile(today()), checkins: {}, plans: {}, activities: {}, extraDone: {},
           icu: { key: '', athlete: '0', auto: true, name: '', last: 0, ok: false }, loc: null, wx: null, welcome: true };
}
function load() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if (x && x.profile) { const f = fresh(); return Object.assign(f, x, { icu: Object.assign(f.icu, x.icu || {}) }); }
  } catch (e) {}
  return fresh();
}
let S = load();
if (S.profile && (S.profile.indoorMax == null || S.profile.indoorMax === 90) && !S.profile.indoorMaxSet) S.profile.indoorMax = 70;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

let view = 'oggi', weekOff = 0, editCI = false, busy = {};

/* ------------------------------------------------------------------ */
/* Icone                                                               */
/* ------------------------------------------------------------------ */
const I = {
  bike: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 9h6.5l3 7.5M9 9l3 7.5h-6.5M12 16.5 15.5 9M14 6h2.5"/>',
  indoor: '<circle cx="6.5" cy="12.5" r="3.5"/><circle cx="17.5" cy="12.5" r="3.5"/><path d="M6.5 12.5 9.5 6h5.5l2.5 6.5M9.5 6l2.5 6.5h-5.5M12 12.5 15 6M13 3.5h2.5M3 21h18M17.5 16v5M6.5 16l-1.5 5"/>',
  mtb: '<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M5.5 17 9 10h6.5l3 7M9 10l3 7h-6.5M12 17l3.5-7M14 7h2.5M2 7l3-4 2.5 3 1.5-2"/>',
  road: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 9h6.5l3 7.5M9 9l3 7.5h-6.5M12 16.5 15.5 9M14 6.5h3.5l-1 2"/>',
  run: '<circle cx="15" cy="4.5" r="2"/><path d="M7 21l3.5-6 3 2.5V22M9.5 11.5l3-3.5 3.5 3 3 1M12.5 8 9 9.5 7 12.5M13.5 17.5l-3-2.5 2-4"/>',
  strength: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  undo: '<path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  user: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6.2 4.6 2 5.5 5"/>'
};
const ico = (k, cls) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (cls ? ' class="' + cls + '"' : '') + '>' + I[k] + '</svg>';
const face = n => {
  const m = ['M8 17q4-4 8 0', 'M8 16.5q4-2 8 0', 'M8 16h8', 'M8 15.5q4 2 8 0', 'M7.5 14.5q4.5 5 9 0'][n - 1];
  const eyes = n === 1 ? '<path d="M7.5 9.5l2 1M16.5 9.5l-2 1"/>' : '<circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/>' + eyes + '<path d="' + m + '"/></svg>';
};
function wxIcon(code) {
  const sun = '<circle cx="12" cy="12" r="4" fill="#FFC940" stroke="none"/><path stroke="#FFC940" d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>';
  const cloud = c => '<path fill="' + c + '" stroke="none" d="M7 19a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4.5 4.5 0 0 1 17.5 19z"/>';
  let s;
  if (code <= 1) s = sun;
  else if (code === 2) s = '<g transform="translate(-4 -4) scale(.8)">' + sun + '</g><g transform="translate(3 3) scale(.8)">' + cloud('#B9BECC') + '</g>';
  else if (code <= 48) s = cloud('#B9BECC');
  else if (code <= 67 || (code >= 80 && code <= 82)) s = cloud('#8B93A8') + '<path stroke="#3FD4FF" d="M8 21l1-2M12 22l1-2M16 21l1-2"/>';
  else if (code <= 77 || code === 85 || code === 86) s = cloud('#B9BECC') + '<path stroke="#fff" d="M9 21h.01M13 22h.01M16 21h.01"/>';
  else s = cloud('#6E7690') + '<path stroke="#FFC940" d="M12 15l-2 4h3l-2 4"/>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">' + s + '</svg>';
}
const SC = { indoor: 'var(--indoor)', mtb: 'var(--mtb)', road: 'var(--road)', run: 'var(--run)', strength: 'var(--strength)' };
const ZC = { WALK: '#4A5368', Z1: '#5E6A82', Z2: '#3FD4FF', Z3: '#C4FF45', SS: '#E6EE3A', Z4: '#FFC940', O4: '#FFA41C', Z5: '#FF6A3D', Z6: '#FF3D6E', Z7: '#D24BFF', TEST: '#FF3D3D', MIX: '#8FA0B8' };
const LC = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' };
const SH = { indoor: '#A994FF', mtb: '#B8F04A', road: '#FFB547', run: '#FF7BA9', strength: '#3FE0C5' };
const sportIcon = s => '<div class="sporticon" style="background:' + SH[s] + '24;color:' + SH[s] + '">' + ico(s) + '</div>';

/* ------------------------------------------------------------------ */
/* Formattazione                                                       */
/* ------------------------------------------------------------------ */
const GG = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MM = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function longDate(d) { const x = E.parse(d); return cap(GG[x.getDay()]) + ' ' + x.getDate() + ' ' + MM[x.getMonth()]; }
function fmtMin(m) { m = Math.round(m); if (m < 60) return m + "'"; const h = Math.floor(m / 60), r = m % 60; return h + 'h' + (r ? String(r).padStart(2, '0') : ''); }
function fmtStep(s) { const m = Math.floor(s / 60), r = s % 60; if (!m) return r + '"'; return m + "'" + (r ? String(r).padStart(2, '0') + '"' : ''); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600); }

/* ------------------------------------------------------------------ */
/* Meteo (Open-Meteo, senza account)                                   */
/* ------------------------------------------------------------------ */
function wxFor(d) { return S.wx && S.wx.days && S.wx.days[d] || null; }
async function fetchWeather(force) {
  if (!S.loc) return false;
  if (!force && S.wx && Date.now() - S.wx.at < 2 * 3600e3 && S.wx.days[today()]) return false;
  const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + S.loc.lat + '&longitude=' + S.loc.lon +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&hourly=precipitation_probability&timezone=auto&forecast_days=3';
  try {
    const r = await fetch(u); if (!r.ok) throw 0; const j = await r.json(); const days = {};
    j.daily.time.forEach((d, i) => days[d] = { code: j.daily.weather_code[i], tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i],
      rain: j.daily.precipitation_probability_max[i] || 0, mm: j.daily.precipitation_sum[i] || 0, wind: j.daily.wind_speed_10m_max[i] || 0 });
    // finestra di 3 ore più asciutta tra le 7 e le 19
    if (j.hourly && j.hourly.time) Object.keys(days).forEach(d => {
      const pr = []; j.hourly.time.forEach((h, i) => { if (h.slice(0, 10) === d) pr[+h.slice(11, 13)] = j.hourly.precipitation_probability[i] || 0; });
      let best = null;
      for (let h = 7; h <= 16; h++) { const v = Math.max(pr[h] || 0, pr[h + 1] || 0, pr[h + 2] || 0); if (best == null || v < best.v) best = { h, v }; }
      if (best) days[d].win = best;
    });
    S.wx = { at: Date.now(), days }; save(); return true;
  } catch (e) { return false; }
}
function locate() {
  if (!navigator.geolocation) { toast('Posizione non disponibile'); return; }
  toast('Cerco la tua posizione…');
  navigator.geolocation.getCurrentPosition(async p => {
    S.loc = { lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), name: 'Posizione attuale' };
    save(); await fetchWeather(true); refreshToday(!(S.plans[today()] || {}).lightUsed); render();
  }, () => toast('Permesso posizione negato: cerca la località nel Profilo'), { timeout: 10000, maximumAge: 3600e3 });
}
async function searchPlace(q) {
  const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=it&name=' + encodeURIComponent(q));
  const j = await r.json(); return (j.results || []).map(x => ({ lat: +x.latitude.toFixed(3), lon: +x.longitude.toFixed(3), name: x.name + (x.admin2 ? ' (' + x.admin2 + ')' : x.admin1 ? ' (' + x.admin1 + ')' : '') }));
}

/* ------------------------------------------------------------------ */
/* Intervals.icu                                                       */
/* ------------------------------------------------------------------ */
const icuOn = () => !!(S.icu.key && S.icu.ok);
async function icu(path, method, body) {
  const r = await fetch(ICU + encodeURIComponent(S.icu.athlete || '0') + path, {
    method: method || 'GET',
    headers: Object.assign({ Authorization: 'Basic ' + btoa('API_KEY:' + S.icu.key.trim()) }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
async function icuConnect() {
  try {
    const a = await icu('');
    S.icu.ok = true; S.icu.name = a && (a.name || a.firstname) || ''; save();
    toast('Collegato a Intervals.icu' + (S.icu.name ? ': ciao ' + S.icu.name.split(' ')[0] + '!' : ''));
    await icuSync(true); return true;
  } catch (e) {
    S.icu.ok = false; save();
    toast(e.status === 401 || e.status === 403 ? 'Chiave API non valida' : 'Intervals.icu non raggiungibile');
    return false;
  }
}
// FTP, peso, FC di soglia e passo di soglia dalle impostazioni di Intervals.icu
async function icuProfile() {
  const a = await icu(''); if (!a) return [];
  const ss = a.sportSettings || [];
  const has = (s, t) => (s.types || []).includes(t);
  const ride = ss.find(s => has(s, 'Ride')) || ss.find(s => has(s, 'VirtualRide') || has(s, 'MountainBikeRide') || has(s, 'GravelRide'));
  const run = ss.find(s => has(s, 'Run'));
  const P = S.profile, got = {}, changed = [];
  const ftp = ride && +(ride.ftp || 0); if (ftp >= 80 && ftp <= 600) got.ftp = Math.round(ftp);
  const lthr = ride && +(ride.lthr || ride.fthr || 0) || run && +(run.lthr || run.fthr || 0); if (lthr >= 100 && lthr <= 220) got.lthr = Math.round(lthr);
  const w = +(a.icu_weight || a.weight || 0); S.icu.setW = w >= 35 && w <= 150 ? Math.round(w * 10) / 10 : null;  // usato se non c'è un peso giornaliero
  let tp = run && +(run.threshold_pace || 0);
  if (tp) { const sec = tp > 1.5 && tp < 8 ? 1000 / tp : tp >= 150 && tp <= 600 ? tp : 0; if (sec) got.thrPace = Math.round(sec); }
  const lab = { ftp: v => 'FTP ' + v + ' W', lthr: v => 'FC di soglia ' + v + ' bpm', weight: v => 'peso ' + String(v).replace('.', ',') + ' kg', thrPace: v => 'passo di soglia ' + Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0') };
  Object.keys(got).forEach(k => { if (P[k] !== got[k]) { if (k === 'ftp' && S.icu.prof && S.icu.prof.includes('ftp')) P.lastTest = today(); P[k] = got[k]; changed.push(lab[k](got[k])); } });
  S.icu.prof = Object.keys(got).filter(k => k !== 'weight');
  return changed;
}
async function icuSync(quiet) {
  if (!icuOn() || busy.sync) return;
  busy.sync = true; if (!quiet) render();
  const t = today(), from = E.addDays(t, -60);
  try {
    let changed = [];
    try { changed = await icuProfile(); } catch (e) { if (e.status === 401 || e.status === 403) throw e; }
    const well = await icu('/wellness?oldest=' + from + '&newest=' + t);
    // peso: l'ultimo dato giornaliero (quello che arriva da Garmin) vince sul valore delle impostazioni
    const lw = (well || []).filter(w => w.weight >= 35 && w.weight <= 150).map(w => [w.id, +w.weight]).sort().pop();
    const v = lw ? Math.round(lw[1] * 10) / 10 : S.icu.setW;
    if (v) {
      if (!(S.icu.prof || []).includes('weight')) S.icu.prof = [...(S.icu.prof || []), 'weight'];
      if (S.profile.weight !== v) { S.profile.weight = v; changed = changed.filter(x => !x.startsWith('peso')).concat('peso ' + String(v).replace('.', ',') + ' kg'); }
    }
    const changedMsg = changed.length ? 'Aggiornato da Intervals.icu: ' + changed.join(', ') : null;
    if (changedMsg && quiet) toast(changedMsg);
    const has = w => ['hrv', 'restingHR', 'sleepScore', 'sleepSecs', 'readiness'].filter(k => w[k] != null && w[k] !== 0);
    const withData = (well || []).filter(w => has(w).length);
    const lastW = withData.map(w => w.id).sort().pop() || null;
    const todayW = (well || []).find(w => w.id === t);
    S.icu.diag = { days: withData.length, last: lastW, today: todayW ? has(todayW) : [], err: null };
    (well || []).forEach(w => {
      const d = w.id; if (!d) return;
      const c = S.checkins[d] || (S.checkins[d] = {}); c.src = c.src || {};
      const put = (k, v) => { if (v == null || v === '' || isNaN(v)) return; if (c[k] == null || c[k] === '' || c.src[k] === 'icu') { c[k] = Math.round(v * 10) / 10; c.src[k] = 'icu'; } };
      put('hrv', w.hrv); put('rhr', w.restingHR); put('sleep', w.sleepScore);
      if (w.sleepSecs) put('sleepH', w.sleepSecs / 3600);
      if (w.readiness) put('garmin', w.readiness);
      if (w.ctl != null && w.atl != null) { c.tsb = Math.round(w.ctl - w.atl); c.src.tsb = 'icu'; (S.fit || (S.fit = {}))[d] = [Math.round(w.ctl * 10) / 10, Math.round(w.atl * 10) / 10]; }
      if (!Object.keys(c).some(k => k !== 'src')) delete S.checkins[d];
    });
    const acts = await icu('/activities?oldest=' + E.addDays(t, -42) + '&newest=' + t);
    const byDay = {};
    (acts || []).forEach(a => {
      const d = (a.start_date_local || '').slice(0, 10); if (!d) return;
      const rpe = +(a.icu_rpe || a.perceived_exertion || 0), feel = +(a.feel || 0);
      (byDay[d] = byDay[d] || []).push({ sport: E.activitySport(a.type), level: E.activityLevel(a, S.profile), name: a.name || a.type,
        min: Math.round((a.moving_time || a.elapsed_time || 0) / 60), load: a.icu_training_load || 0,
        rpe: rpe >= 1 && rpe <= 10 ? rpe : null, feel: feel >= 1 && feel <= 5 ? feel : null });
    });
    for (let d = E.addDays(t, -42); d <= t; d = E.addDays(d, 1)) { if (byDay[d]) S.activities[d] = byDay[d]; else delete S.activities[d]; }
    // storico: le sedute SMG inviate restano nel calendario di Intervals, così il diario si ricostruisce anche dopo un cambio di telefono
    try { await icuRebuild(E.addDays(t, -60), E.addDays(t, -1), byDay); } catch (e) {}
    Object.keys(byDay).forEach(d => {
      const p = S.plans[d];
      if (p && !p.rest && p.status === 'planned' && byDay[d].some(a => a.sport !== 'strength' && a.min >= 15)) { p.status = 'done'; p.via = 'icu'; }
    });
    S.icu.last = Date.now(); save();
    refreshToday(false);
    if (!quiet) toast(changedMsg || 'Dati aggiornati da Intervals.icu');
  } catch (e) {
    S.icu.diag = Object.assign({}, S.icu.diag, { err: e.status ? 'errore ' + e.status : 'rete non raggiungibile' }); save();
    if (!quiet) toast(e.status === 401 || e.status === 403 ? 'Chiave API non valida' : 'Sincronizzazione non riuscita');
  }
  busy.sync = false; render();
}
const ICU_SPORT = { VirtualRide: 'indoor', MountainBikeRide: 'mtb', GravelRide: 'mtb', Ride: 'road', Run: 'run' };
async function icuRebuild(from, to, byDay) {
  const evs = await icu('/events?oldest=' + from + '&newest=' + to + '&category=WORKOUT');
  let n = 0;
  (evs || []).forEach(ev => {
    const id = ev.external_id || ''; if (!id.startsWith('smg-')) return;
    const d = id.slice(4, 14); if (S.plans[d] || d >= today()) return;
    const name = (ev.name || '').replace(/^SMG · /, '');
    const tid = Object.keys(E.TEMPLATES).find(k => E.TEMPLATES[k].name === name); if (!tid) return;
    const tp = E.TEMPLATES[tid];
    let sport = ev.indoor ? 'indoor' : ICU_SPORT[ev.type] || tp.sports[0];
    if (!tp.sports.includes(sport)) sport = tp.sports[0];
    const secs = +(ev.moving_time || (ev.workout_doc && ev.workout_doc.duration) || 0);
    const dur = secs ? Math.round(secs / 300) * 5 : tp.dur[0];
    const done = (byDay[d] || S.activities[d] || []).some(a => a.sport !== 'strength' && a.min >= 15);
    S.plans[d] = { date: d, tid, sport, level: tp.level, dur: Math.max(tp.dur[0], dur), status: done ? 'done' : 'planned', via: done ? 'icu' : undefined,
      pushed: true, rebuilt: true, v: ENGINE_V, opts: {}, reasons: ['Ricostruita da Intervals.icu'] };
    n++;
  });
  if (n) save();
  return n;
}
async function icuPush(p, quiet) {
  if (!icuOn() || !p || p.rest) return;
  busy.push = true; if (!quiet) render();
  try {
    await icu('/events/bulk?upsert=true', 'POST', [E.icuEvent(p, S.profile)]);
    p.pushed = true; p.pushedSig = sig(p); save();
    if (!quiet) toast('Inviata: sincronizza Garmin Connect e MyWhoosh');
  } catch (e) { if (!quiet) toast('Invio non riuscito (' + (e.status || 'rete') + ')'); }
  busy.push = false; render();
}
async function icuDelete(date) {
  if (!icuOn()) return;
  try { await icu('/events/bulk-delete', 'PUT', [{ external_id: 'smg-' + date }]); } catch (e) {}
}
const sig = p => [p.tid, p.sport, p.dur, p.challenge].join('|');

/* ------------------------------------------------------------------ */
/* Piano del giorno                                                    */
/* ------------------------------------------------------------------ */
function planFor(d, forceRegen) {
  const old = S.plans[d];
  const rd = E.readiness(S.checkins, d); const light = rd ? rd.light : null;
  if (old && (old.status === 'done' || old.status === 'skipped')) return old;
  if (old && !forceRegen) {
    if (old.lightUsed) {                       // confermata col check-in: resta questa
      old.newLight = light && light !== old.lightUsed ? light : null;   // segnala se i dati arrivati dopo cambiano il semaforo
      return old;
    }
    if (old.lightUsed === light) return old;   // provvisoria e ancora senza check-in
  }
  const opts = old && old.opts || {};
  const wx = wxFor(d);
  const np = E.propose(S, d, Object.assign({}, opts, { weather: wx }));
  Object.assign(np, { opts, lightUsed: light, newLight: null, status: 'planned', v: ENGINE_V, wxUsed: !!wx,
    pushed: old ? !!old.pushed : false, pushedSig: old ? old.pushedSig : null });
  S.plans[d] = np; save();
  return np;
}
// rigenera la seduta di oggi (se non ancora fatta) e la reinvia se era già su Intervals
function refreshToday(force) {
  const d = today(); const before = S.plans[d];
  const p = planFor(d, force);
  if (p === before) return p;
  syncPushState(p);
  return p;
}
function syncPushState(p) {
  if (!icuOn()) return;
  if (p.free) { if (p.pushed) { p.pushed = false; save(); icuDelete(p.date); } return; }
  if (p.rest) { if (p.pushed) { p.pushed = false; save(); icuDelete(p.date); } return; }
  if (p.status !== 'planned') return;
  if ((p.pushed && p.pushedSig !== sig(p)) || (S.icu.auto && !p.pushed && p.lightUsed)) icuPush(p, true);
}
function setOpts(fn) {
  const d = today(); const p = S.plans[d]; if (!p) return;
  p.opts = Object.assign({}, p.opts); fn(p.opts, p); save();
  const np = planFor(d, true); syncPushState(np); render();
}

/* ------------------------------------------------------------------ */
/* Componenti                                                          */
/* ------------------------------------------------------------------ */
function chartSVG(sections) {
  const bars = E.profileBars(sections); const tot = bars.reduce((a, b) => a + b.d, 0) || 1;
  const W = 600, H = 96; let x = 0, out = ''; const top = Math.max(3.5, ...bars.map(b => b.lvl));
  bars.forEach(b => {
    const w = b.d / tot * W; const h = Math.max(6, b.lvl / top * (H - 6));
    out += '<rect x="' + (x + 0.4).toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + Math.max(0.8, w - 0.8).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(3, w / 3).toFixed(1) + '" fill="' + ZC[b.z] + '"/>';
    x += w;
  });
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="width:100%;height:84px">' + out + '</svg>';
}
function dots(level) { let s = '<div class="dots">'; for (let i = 1; i <= 5; i++) s += '<i' + (i <= level ? ' style="background:' + (level >= 4 ? 'var(--hard)' : level === 3 ? 'var(--yellow)' : 'var(--lime)') + '"' : '') + '></i>'; return s + '</div>'; }

function stepsHTML(sections, sport) {
  const P = S.profile; let h = '';
  sections.forEach(s => {
    h += '<div class="sec"><div class="sh">' + esc(s.title) + (s.rep > 1 ? '<span class="rep">×' + s.rep + '</span>' : '') + '</div>';
    s.steps.forEach(x => {
      const Z = E.ZONES[x.z];
      const sub = x.cad && E.SPORTS[sport].target === 'power' ? x.cad[0] + '–' + x.cad[1] + ' rpm' : 'RPE ' + Z.rpe;
      h += '<div class="stp" style="box-shadow:inset 4px 0 0 ' + ZC[x.z] + '"><div class="t">' + fmtStep(x.d) + '</div><div class="n">' + esc(x.txt || Z.name) + '<small>' + esc(Z.name) + '</small></div>' +
           '<div class="g">' + esc(E.targetText(x.z, sport, P)) + '<small>' + esc(sub) + '</small></div></div>';
    });
    h += '</div>';
  });
  return h;
}

function workoutHTML(p, ro) {
  const t = E.TEMPLATES[p.tid]; const sections = E.build(p, S.profile); const st = E.stats(sections, p.sport, S.profile);
  const sp = E.SPORTS[p.sport]; const col = SC[p.sport];
  let h = '<div class="card wo"><div class="glow" style="background:radial-gradient(120% 100% at 0% 0%,' + col + ',transparent 70%)"></div><div class="top">' +
    '<div class="meta">' + sportIcon(p.sport) + '<div><b>' + sp.name + '</b><small>' + sp.sub + '</small></div>' +
    '<div class="lvl">' + dots(p.level) + '<small>' + E.LEVELS[p.level] + '</small></div></div>' +
    '<h2>' + esc(p.freeName || t.name) + '</h2>' +
    '<div class="big"><div><strong class="num">' + fmtMin(st.min) + '</strong>durata</div><div><strong class="num">' + st.tss + '</strong>carico stimato</div>' +
    (p.deload ? '<div><span class="tag">Scarico</span></div>' : '') + '</div>' + chartSVG(sections) + '</div><div class="body">' +
    '<p class="desc">' + esc(t.desc) + '</p>';
  if (p.challenge) h += '<div class="challenge">' + ico('flag') + '<div><b>Sfida del giorno</b><span>' + esc(p.challenge) + '</span></div></div>';
  if (!ro && p.reasons && p.reasons.length) h += '<div class="reasons">' + p.reasons.map(r => '<span class="pill">' + esc(r) + '</span>').join('') + '</div>';
  if (!p.free) h += '<details class="steps"' + (ro ? ' open' : '') + '><summary>Dettaglio della seduta ' + ico('chev') + '</summary>' + stepsHTML(sections, p.sport) + '</details>';

  if (!ro && p.free && p.status === 'planned') {
    const rd0 = E.readiness(S.checkins, p.date);
    if (rd0 && rd0.light === 'red' && p.level >= 3) h += '<div class="challenge" style="background:rgba(255,79,94,.08);border-color:rgba(255,79,94,.45)">' + ico('flag') + '<div><b style="color:var(--red)">Semaforo rosso</b><span>Goditi la compagnia, ma oggi lascia andare gli altri sulle salite.</span></div></div>';
    h += '<div class="actions"><button class="btn" id="aFriends">' + ico('dice') + 'Cambia uscita</button><button class="btn" id="aFreeUndo">' + ico('undo') + 'Proposta SMG</button>' +
      '<button class="btn hot wide" id="aDone">' + ico('check') + 'Fatta! Sudato e goduto</button></div>' +
      '<div class="src" style="margin:12px 0 0;color:var(--t2)">' + ico('link') + 'Nessun allenamento strutturato su Fenix, Edge e MyWhoosh: registra l\'uscita come sempre.</div>';
  } else if (!ro) {
    if (p.status === 'planned') {
      const dayCfg = S.profile.days[E.dow(p.date)] || {};
      const maxD = Math.min(p.opts && p.opts.extra ? 60 : (dayCfg.max || 75), p.sport === 'indoor' ? (S.profile.indoorMax || 70) : 999);
      const sports = ['indoor', 'mtb', 'road', 'run'].filter(s => S.profile.sports[s]);
      const fs = p.opts && p.opts.forceSport, fd = p.opts && p.opts.forceDur;
      h += '<div class="ctl"><div class="lab">Sport</div><div class="chips"><button class="chip' + (!fs ? ' on' : '') + '" data-sport="">Automatico</button>' +
        sports.map(s => '<button class="chip' + (fs === s ? ' on' : '') + '" data-sport="' + s + '">' + E.SPORTS[s].name + '</button>').join('') + '</div>' +
        '<div class="lab">Tempo a disposizione</div><div class="chips"><button class="chip' + (!fd ? ' on' : '') + '" data-dur="">Automatico</button>' +
        [30, 45, 60, 75, 90, 105, 120, 150].filter(m => m <= maxD).map(m => '<button class="chip' + (fd === m ? ' on' : '') + '" data-dur="' + m + '">' + fmtMin(m) + '</button>').join('') + '</div></div>';
      const iv = p.sport !== 'indoor' && p.sport !== 'run' && S.profile.sports.indoor ? E.indoorVersion(p, S.profile) : null;
      h += '<div class="actions">' +
        (iv ? '<button class="btn wide" id="aIndoor"><span style="color:var(--indoor);display:flex">' + ico('indoor') + '</span>' + 'Falla sui rulli</button>' : '') +
        '<button class="btn" id="aReroll">' + ico('dice') + 'Rilancia</button>' +
        (icuOn() ? '<button class="btn" id="aPush">' + (busy.push ? ico('sync', 'spin') : ico(p.pushed ? 'check' : 'send')) + (p.pushed ? 'Inviata' : 'Invia') + '</button>'
                 : '<button class="btn" id="aIcuHow">' + ico('link') + 'Invia…</button>') +
        '<button class="btn hot wide" id="aDone">' + ico('check') + 'Fatta! Sudato e goduto</button>' +
        '<button class="btn wide" id="aFriends"><span style="color:var(--hot2);display:flex">' + ico('user') + '</span>Decido io: esco con gli amici</button>' +
        '<button class="btn ghost wide sm" id="aSkip">Oggi salto</button></div>';
      if (p.pushed) h += '<div class="src" style="margin:12px 0 0">' + ico('check') + 'Su Intervals.icu: arriva su Fenix, Edge e MyWhoosh alla prossima sincronizzazione</div>';
    } else {
      h += p.status === 'done'
        ? '<div class="done-banner">' + ico('check') + '<div><b>Fatta! Sudato e goduto.</b><span>' + (p.via === 'icu' ? 'Rilevata da Intervals.icu' : 'Segnata a mano') + '</span></div></div>'
        : '<div class="done-banner skip">' + ico('x') + '<div style="flex:1"><b>Seduta saltata</b><span>Nessun problema: le prossime sedute tengono conto che oggi non l\'hai fatta.</span></div></div>' +
          (p.altExtra ? '' : '<button class="btn sm full" id="aAlt" style="margin-top:8px">' + ico('strength') + 'Proponimi qualcosa di breve</button>');
      h += '<button class="btn ghost sm full" id="aUndo" style="margin-top:8px">' + ico('undo') + 'Annulla</button>';
    }
  }
  return h + '</div></div>';
}

function extraHTML(id, d) {
  const x = E.EXTRAS.find(e => e.id === id); if (!x) return '';
  const done = S.extraDone[d] === id;
  return '<div class="card extra"><h3>' + ico('strength') .replace('<svg', '<svg style="width:16px;height:16px;color:var(--strength)"') + 'Extra facoltativo · ' + x.kind + '<span class="sp"></span><span class="tag">' + x.min + "'</span></h3>" +
    '<b style="font-size:17px">' + esc(x.name) + '</b><details class="steps"><summary>Esercizi ' + ico('chev') + '</summary><ol>' +
    x.items.map(i => '<li>' + esc(i[0]) + '<span>' + esc(i[1]) + '</span></li>').join('') + '</ol></details>' +
    '<button class="btn sm ' + (done ? 'lime' : '') + '" id="aExtra" data-x="' + id + '" style="margin-top:10px">' + ico('check') + (done ? 'Fatto' : 'Segna come fatto') + '</button></div>';
}

function checkinHTML(d) {
  const c = S.checkins[d] || {}; const src = c.src || {};
  const f = (k, lab, unit, ph) => '<div class="field"><label>' + lab + '</label><div class="unit"><input inputmode="decimal" id="ci_' + k + '" value="' + (c[k] != null ? esc(c[k]) : '') + '" placeholder="' + ph + '"' +
    (src[k] === 'icu' ? ' style="border-color:rgba(196,255,69,.5)"' : '') + '><span>' + unit + '</span></div></div>';
  const fromIcu = Object.values(src).includes('icu');
  const icuNote = icuOn() && !fromIcu && diagText() ? '<div class="src" style="color:var(--t2)">' + ico('link') + esc(diagText()) + '</div>' : '';
  const labels = ['A pezzi', 'Stanco', 'Normale', 'Bene', 'Al top'];
  return '<div class="card"><h3>Check-in del mattino<span class="sp"></span>' + (editCI ? '<button class="btn ghost sm" id="ciCancel" style="padding:0 4px">Chiudi</button>' : '') + '</h3>' +
    '<div class="feel">' + labels.map((l, i) => '<button data-feel="' + (i + 1) + '"' + (+c.feel === i + 1 ? ' class="on"' : '') + '>' + face(i + 1) + l + '</button>').join('') + '</div>' +
    (fromIcu ? '<div class="src">' + ico('link') + 'Valori dal Fenix via Intervals.icu</div>' : icuNote) +
    '<div class="grid2">' + f('hrv', 'HRV notturna', 'ms', 'es. 62') + f('rhr', 'FC a riposo', 'bpm', 'es. 46') +
    f('sleep', 'Punteggio sonno', '/100', 'es. 78') + f('garmin', 'Prontezza Garmin', '/100', 'facoltativo') + '</div>' +
    '<label class="check"><span class="switch"><input type="checkbox" id="ci_pain"' + (c.pain ? ' checked' : '') + '><i></i></span>Qualche dolore o acciacco oggi</label>' +
    '<button class="btn hot full" id="ciGo">Calcola il semaforo</button></div>';
}

const LCOL = { green: '#3BE889', yellow: '#FFA62B', red: '#FF4F5E' };
function trafficSVG(light) {
  const lamp = (cy, k) => {
    const on = k === light, c = LCOL[k];
    return '<circle cx="23" cy="' + cy + '" r="13" fill="' + c + '" opacity="' + (on ? 1 : .14) + '"' + (on ? ' style="filter:drop-shadow(0 0 7px ' + c + ')"' : '') + '/>' +
      (on ? '<circle cx="19" cy="' + (cy - 4) + '" r="3.5" fill="#fff" opacity=".45"/>' : '');
  };
  return '<svg class="tl" viewBox="0 0 46 112" role="img" aria-label="Semaforo ' + ({ green: 'verde', yellow: 'arancione', red: 'rosso' })[light] + '">' +
    '<rect x="2" y="2" width="42" height="108" rx="15" fill="#070C15" stroke="#22334D" stroke-width="2"/>' +
    lamp(23, 'red') + lamp(56, 'yellow') + lamp(89, 'green') + '</svg>';
}
// ultimi valori (14 giorni) per media personale e mini grafico
function series(key, d, n) { const out = []; for (let i = n - 1; i >= 0; i--) { const c = S.checkins[E.addDays(d, -i)]; out.push(c && c[key] != null && c[key] !== '' ? +c[key] : null); } return out; }
function avgPrev(key, d) { const v = series(key, E.addDays(d, -1), 14).filter(x => x != null); return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null; }
// andamento 7 giorni a tutta larghezza dentro il riquadro; ref = linea tratteggiata della tua media/norma
function spark(vals, color, ref, refLab) {
  const pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null); if (pts.length < 2) return '';
  const ys = pts.map(p => p[1]).concat(ref != null ? [ref] : []);
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1, n = vals.length - 1;
  const X = i => (i / n * 96 + 2).toFixed(1), Y = v => (24 - (v - lo) / span * 20).toFixed(1);
  const line = pts.map(([i, v], k) => (k ? 'L' : 'M') + X(i) + ' ' + Y(v)).join(' ');
  const last = pts[pts.length - 1];
  const ns = ' vector-effect="non-scaling-stroke"';
  return '<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">' +
    (ref != null ? '<line x1="2" x2="98" y1="' + Y(ref) + '" y2="' + Y(ref) + '" stroke="#7C8DA6" stroke-width="1" stroke-dasharray="3 3"' + ns + '/>' : '') +
    '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' + ns + '/>' +
    '<path d="M' + X(last[0]) + ' ' + Y(last[1]) + 'h0" stroke="' + color + '" stroke-width="6" stroke-linecap="round"' + ns + '/></svg>' +
    '<div class="sx"><span>7 gg fa</span>' + (ref != null ? '<span class="rl">' + (refLab || 'media') + '</span>' : '') + '<span>oggi</span></div>';
}
const IC = {
  hrv: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  rhr: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  sleep: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  form: '<path d="M4 18 9 12l4 3 7-9"/>',
  garmin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'
};
function metric(key, label, unit, d, better, fmt) {
  const c = S.checkins[d] || {}; const v = c[key]; if (v == null || v === '') return '';
  const a = avgPrev(key, d); let dl = '<span class="d">media in arrivo</span>';
  const hs = key === 'hrv' ? E.hrvStatus(S.checkins, d) : null;
  if (hs) {
    const band = Math.round(hs.lo) + '–' + Math.round(hs.hi);
    dl = hs.status === 'low' ? '<span class="d down">▼ 7 gg sotto norma ' + band + '</span>'
       : hs.status === 'high' ? '<span class="d up">▲ 7 gg sopra norma ' + band + '</span>'
       : '<span class="d">norma ' + band + '</span>';
  } else if (a != null) {
    const diff = v - a, rel = Math.abs(diff) < (key === 'rhr' ? 2 : a * 0.03);
    const good = better === 'up' ? diff > 0 : diff < 0;
    dl = rel ? '<span class="d">in media</span>' : '<span class="d ' + (good ? 'up' : 'down') + '">' + (diff > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(diff)) + ' vs media</span>';
  }
  return '<div class="m"><div class="lab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + IC[key === 'sleepH' ? 'sleep' : key] + '</svg>' + label + '</div>' +
    '<div class="val num">' + (fmt ? fmt(v) : Math.round(v)) + '<small>' + unit + '</small></div>' + dl +
    spark(series(key, d, 7), 'var(--hot)', hs ? hs.mean : a, hs ? 'norma' : 'media') + '</div>';
}
function healthHTML(d) {
  const c = S.checkins[d] || {};
  const tiles = [
    metric('hrv', 'HRV notturna', 'ms', d, 'up'),
    metric('rhr', 'FC a riposo', 'bpm', d, 'down'),
    c.sleep != null && c.sleep !== '' ? metric('sleep', 'Sonno', '/100', d, 'up') : metric('sleepH', 'Sonno', 'ore', d, 'up', v => (Math.round(v * 10) / 10).toString().replace('.', ',')),
    c.garmin != null && c.garmin !== '' ? metric('garmin', 'Prontezza Garmin', '/100', d, 'up') : ''
  ];
  if (c.tsb != null && c.tsb !== '') {
    const t = +c.tsb; const txt = t < -25 ? 'Molto affaticato' : t < -10 ? 'Carico, in costruzione' : t <= 5 ? 'Equilibrio' : 'Fresco';
    tiles.push('<div class="m"><div class="lab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + IC.form + '</svg>Forma</div><div class="val num">' + (t > 0 ? '+' : '') + t + '</div><span class="d">' + txt + '</span>' + spark(series('tsb', d, 7), 'var(--hot)', 0, 'zero') + '</div>');
  }
  const html = tiles.filter(Boolean);
  return html.length ? '<div class="hm">' + html.join('') + '</div>' : '';
}
// come è calcolato il punteggio, voce per voce
function scoreDetail(rd) {
  if (!rd.parts) return '';
  const sg = n => n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0';
  const row = (a, b, c, strong) => '<div style="display:flex;gap:8px;padding:5px 0;border-top:1px solid var(--line)' + (strong ? ';font-weight:700;color:var(--text)' : '') + '"><span style="flex:none;min-width:92px;color:var(--text)">' + a + '</span><span style="flex:1;min-width:0">' + b + '</span><b style="flex:none;color:' + (typeof c !== 'number' ? 'var(--text)' : c > 0 ? 'var(--green)' : c < 0 ? 'var(--red)' : 'var(--mut)') + '">' + (typeof c === 'number' ? sg(c) : c) + '</b></div>';
  let h = row('Partenza', '', '70') + rd.parts.map(p => row(esc(p.lab), esc(p.val), p.pts)).join('');
  h += row('Punteggio tuo', 'limitato tra 5 e 100', String(rd.own), true);
  if (rd.garmin != null) h += row('Prontezza Garmin', 'media 50/50 con il tuo punteggio', String(rd.garmin)) + row('Totale', '(' + rd.own + ' + ' + rd.garmin + ') / 2', String(rd.score), true);
  return '<details class="steps" style="margin-top:12px"><summary>Come è calcolato il punteggio ' + ico('chev') + '</summary><div class="t2" style="font-size:13px">' + h +
    '<div class="mut" style="font-size:12px;margin-top:6px">Verde da 70, arancione da 50, rosso sotto 50. Vicino a una soglia basta un piccolo cambiamento (per esempio la FC a riposo aggiornata da Garmin in giornata) per cambiare colore.</div></div></details>';
}
function lightHTML(rd) {
  const snap = (S.checkins[today()] || {}).snap;
  const msg = { green: ['Via libera', 'Gambe pronte: oggi si può spingere.'], yellow: ['Con giudizio', 'Si lavora, ma senza esagerare.'], red: ['Recupero', 'Oggi il corpo chiede di rallentare.'] }[rd.light];
  const hm = healthHTML(today());
  // i motivi già visibili nei riquadri non si ripetono
  const why = hm ? rd.why.filter(w => !/HRV|FC a riposo|sonno|dormito/i.test(w)) : rd.why;
  return '<div class="card"><div class="light">' + trafficSVG(rd.light) +
    '<div style="flex:1;min-width:0"><div class="score num" style="color:' + LCOL[rd.light] + '">' + rd.score + '<small>/100</small></div><h2>' + msg[0] + '</h2><p>' + msg[1] + '</p>' +
    (snap && snap.score != null && snap.score !== rd.score ? '<p class="mut" style="font-size:12.5px;margin-top:4px">Al check-in delle ' + new Date(snap.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ': ' + snap.score + '/100' + (snapDiff(today()).length ? ' · ' + esc(snapDiff(today()).join(', ')) : '') + '</p>' : '') + '</div>' +
    '<button class="btn sm edit" id="ciEdit">Modifica</button></div>' + hm + scoreDetail(rd) +
    (why.length ? '<div class="why">' + why.map(w => '<span class="pill">' + esc(w) + '</span>').join('') + '</div>' : '') + '</div>';
}

const SNAPK = ['hrv', 'rhr', 'sleep', 'sleepH', 'tsb', 'garmin', 'feel'];
const SNAPL = { hrv: ['HRV', ' ms'], rhr: ['FC a riposo', ' bpm'], sleep: ['Punteggio sonno', ''], sleepH: ['Ore di sonno', ' h'], tsb: ['Forma', ''], garmin: ['Prontezza Garmin', ''], feel: ['Sensazione', '/5'] };
// cosa è cambiato rispetto al check-in
function snapDiff(d) {
  const c = S.checkins[d]; if (!c || !c.snap) return [];
  const f = v => v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', ',');
  return SNAPK.filter(k => { const a = c.snap[k], b = c[k] == null || c[k] === '' ? null : +c[k]; return a == null ? b != null : b == null || Math.abs(a - b) >= 0.1; })
    .map(k => SNAPL[k][0] + ': ' + f(c.snap[k]) + ' → ' + f(c[k] === '' ? null : c[k]) + (c[k] != null && c[k] !== '' ? SNAPL[k][1] : '') + (c.snap[k] == null ? ' (arrivato dopo)' : ''));
}
function staleHTML(p) {
  const nm = { green: 'verde', yellow: 'arancione', red: 'rosso' };
  const diffs = snapDiff(p.date);
  return '<div class="card" style="border-color:rgba(45,180,242,.45)"><h3>Sono arrivati dati nuovi</h3><div class="t2" style="font-size:14px">Dopo il check-in il semaforo è passato da ' + nm[p.lightUsed] + ' a <b style="color:var(--text)">' + nm[p.newLight] + '</b>. La seduta resta quella di prima finché non decidi tu.</div>' +
    (diffs.length ? '<div class="t2" style="font-size:13.5px;margin-top:10px"><b style="color:var(--text)">Cosa è cambiato</b><ul style="margin:4px 0 0;padding-left:18px">' + diffs.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') +
    '<div class="row" style="margin-top:12px"><button class="btn hot" id="stUpd">Adegua la seduta</button><button class="btn" id="stKeep">Tieni questa</button></div></div>';
}
function restHTML(p) {
  const red = p.redRest;
  return '<div class="card rest"><div class="big">' + (red ? '🛋️' : '😌') + '</div><h2>' + (red ? 'Oggi riposo vero' : 'Giorno di riposo') + '</h2>' +
    '<p>' + (red ? 'Il semaforo è rosso: dormi, mangia bene, cammina un po\'. Domani si riparte più forti.' : 'Anche il riposo è allenamento: è adesso che il corpo si adatta e migliora.') + '</p>' +
    '<div class="row" style="flex-wrap:wrap;justify-content:center"><button class="btn" id="aExtraDay">' + (red ? 'Solo un giro leggerissimo' : 'Voglio muovermi lo stesso') + '</button>' +
    '<button class="btn" id="aFriends">' + ico('user') + 'Esco con gli amici</button></div></div>';
}

const WXD = c => c <= 1 ? 'Sereno' : c === 2 ? 'Poco nuvoloso' : c === 3 ? 'Nuvoloso' : c <= 48 ? 'Nebbia' : c <= 57 ? 'Pioviggine' : c <= 67 ? 'Pioggia' : c <= 77 ? 'Neve' : c <= 82 ? 'Rovesci' : c <= 86 ? 'Neve' : 'Temporale';
const drop = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>';
const wind = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/></svg>';
function wxDayHTML(d, label, cls) {
  const w = wxFor(d);
  if (!w) return '<div class="wxd ' + cls + '"><div class="dn">' + label + '</div><div class="desc" style="margin-top:10px">Previsioni non disponibili</div></div>';
  return '<div class="wxd ' + cls + '"><div class="dn">' + label + '</div><div class="main">' + wxIcon(w.code) +
    '<div><div class="tmax num">' + Math.round(w.tmax) + '°</div><div class="tmin num">' + Math.round(w.tmin) + '°</div></div></div>' +
    '<div class="desc">' + WXD(w.code) + '</div><div class="meta"><span style="color:' + (w.rain >= 50 ? 'var(--hot2)' : 'inherit') + '">' + drop + w.rain + '%' + (w.mm >= 0.5 ? ' · ' + Math.round(w.mm) + ' mm' : '') + '</span>' +
    '<span>' + wind + Math.round(w.wind) + ' km/h</span></div></div>';
}
// seduta probabile di domani: stessa logica della proposta, come se oggi facessi la seduta prevista
function tomorrowPreview(d) {
  const t = E.addDays(d, 1); const cfg = S.profile.days[E.dow(t)] || {};
  if (!cfg.on) return null;
  const pv = E.propose(S, t, { weather: wxFor(t), assumeDone: d });
  return pv.rest ? null : pv;
}
function planLine(d) {
  const t = E.addDays(d, 1); const cfg = S.profile.days[E.dow(t)] || {}; const w = wxFor(t);
  const pv = tomorrowPreview(d);
  const sportTxt = s => ({ indoor: 'sui rulli', mtb: 'in MTB', road: 'in bici da strada', run: 'di corsa' })[s];
  let plan = !cfg.on ? '<b>Domani riposo.</b>' : pv
    ? '<b>Domani probabile: ' + esc(E.TEMPLATES[pv.tid].name) + '</b> ' + sportTxt(pv.sport) + ', ' + fmtMin(pv.dur) + '.'
    : '<b>Domani ' + (cfg.long ? 'giorno lungo' : 'allenamento') + ', fino a ' + fmtMin(cfg.max) + '.</b>';
  if (cfg.on && w) {
    const bad = w.rain >= 60 || w.mm >= 3, meh = !bad && (w.rain >= 40 || w.tmax < 4);
    const win = w.win && w.win.v <= 30 ? ' tra le ' + w.win.h + ' e le ' + (w.win.h + 3) : '';
    if (bad) plan += pv && pv.sport === 'indoor' ? ' Pioggia probabile, per questo è sui rulli' + (win ? ': se preferisci uscire, la finestra più asciutta è' + win + '.' : '.') : win ? ' Pioggia probabile, ma' + win + ' dovrebbe reggere.' : ' Pioggia probabile: tieni pronti i rulli.';
    else if (meh) plan += ' Tempo incerto' + (w.win && w.win.v < w.rain ? ': meglio uscire tra le ' + w.win.h + ' e le ' + (w.win.h + 3) + '.' : ', tieni pronti i rulli.');
    else if (w.wind >= 35) plan += ' Asciutto ma ventoso: meglio la MTB nel bosco.';
    else if (!pv || pv.sport !== 'indoor') plan += ' Si preannuncia una bella giornata per uscire.';
  }
  if (pv) plan += '<div class="mut" style="font-size:12.5px;margin-top:3px">Si conferma domattina dopo il check-in.</div>';
  return '<div class="plan">' + (pv ? '<span style="color:' + SH[pv.sport] + ';display:flex">' + ico(pv.sport) + '</span>' : ico('cal')) + '<div>' + plan + '</div></div>';
}
function weatherHTML(d) {
  const t = E.addDays(d, 1);
  if (!S.loc) return '<div class="card wxc"><div class="empty">' + ico('pin') + '<div style="flex:1">Imposta la località per vedere il meteo di oggi e domani</div><button class="btn sm" id="wxSet">Imposta</button></div>' + planLine(d) + '</div>';
  return '<div class="card wxc"><div class="days">' + wxDayHTML(d, 'Oggi', '') + wxDayHTML(t, 'Domani, ' + GG[E.parse(t).getDay()], 'tmw') + '</div>' + planLine(d) + '</div>';
}

function exportBackup() {
  S.lastBackup = Date.now(); save();
  const data = JSON.parse(JSON.stringify(S)); data.icu.key = ''; data.icu.ok = false;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  a.download = 'smg-backup-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove();
  toast('Backup salvato nei Download');
}
// promemoria mensile, solo quando c'è qualcosa da salvare
function backupDue() {
  if (Object.keys(S.plans).length < 7) return false;
  if (!S.created) { S.created = Date.now(); save(); }
  if (Date.now() - S.created < 14 * 86400e3) return false;
  if (S.backupSnooze && Date.now() < S.backupSnooze) return false;
  return !S.lastBackup || Date.now() - S.lastBackup > 30 * 86400e3;
}
function backupHTML() {
  return '<div class="card"><h3>Salva una copia di sicurezza</h3><div class="t2" style="font-size:14px">' +
    (icuOn() ? 'Le sedute le recupero da Intervals.icu, ma giorni, sport, località e check-in a mano vivono solo su questo telefono.' : 'Diario, check-in e impostazioni vivono solo su questo telefono.') +
    ' Un backup al mese basta.</div><div class="row" style="margin-top:12px"><button class="btn hot" id="bkNow">Salva backup</button><button class="btn" id="bkLater">Più tardi</button></div></div>';
}
function welcomeHTML() {
  return '<div class="card" style="background:linear-gradient(135deg,rgba(45,180,242,.2),rgba(45,180,242,.05));border-color:rgba(45,180,242,.4)">' +
    '<h3>Benvenuto in SMG<span class="sp"></span><button class="btn ghost sm" id="wClose" style="padding:0 4px">' + ico('x') + '</button></h3>' +
    '<div class="t2" style="font-size:14px">Ogni mattina: <b style="color:var(--text)">check-in</b> di 10 secondi → <b style="color:var(--text)">semaforo</b> → seduta del giorno, sempre diversa. ' +
    'Non ti piace? Tocca <b style="color:var(--text)">Rilancia</b>. Il <b style="color:var(--text)">?</b> in alto apre la guida. Nel Profilo collega Intervals.icu per mandarla su Fenix, Edge e MyWhoosh, e imposta la località per il meteo.</div></div>';
}

/* ------------------------------------------------------------------ */
/* Vista: Oggi                                                         */
/* ------------------------------------------------------------------ */
function renderOggi() {
  const d = today(); const rd = E.readiness(S.checkins, d);
  const p = planFor(d);
  const title = p.rest ? 'Oggi si <em>ricarica</em>.' : p.status === 'planned' && p.light === 'red' ? 'Oggi si <em>recupera</em>.' : p.status === 'done' ? 'Sudato. <em>Goduto.</em>' : p.level >= 4 ? 'Oggi si <em>suda</em>.' : p.level === 3 ? 'Oggi si <em>spinge</em> il giusto.' : 'Oggi si <em>gode</em>.';
  let h = '<div class="hello"><div class="d">' + longDate(d) + '</div><h1>' + title + '</h1></div>';
  if (S.welcome) h += welcomeHTML();
  else if (backupDue()) h += backupHTML();
  h += weatherHTML(d);
  if (!p.rest || !p.redRest) h += (rd && !editCI) ? lightHTML(rd) : checkinHTML(d);
  else h += lightHTML(rd);
  if (!p.free && (!p.rest || p.redRest) && p.status === 'planned' && p.newLight && p.newLight !== p.keptLight) h += staleHTML(p);
  h += p.rest ? restHTML(p) : workoutHTML(p);
  const exId = p.rest ? E.EXTRAS[E.hash(d) % E.EXTRAS.length].id : p.extra;
  if (p.status === 'skipped' && p.altExtra) h += extraHTML(p.altExtra, d);
  else if (p.status !== 'skipped' && S.profile.sports.strength && exId && (p.rest || p.level <= 2)) h += extraHTML(exId, d);
  $('#v-oggi').innerHTML = h;
  bindOggi(p);
}

function bindOggi(p) {
  const d = today();
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('wClose', () => { S.welcome = false; save(); render(); });
  on('wxSet', () => go('profilo'));
  on('stUpd', () => { const np = planFor(d, true); syncPushState(np); toast('Seduta adeguata al nuovo semaforo'); render(); });
  on('stKeep', () => { const x = S.plans[d]; x.keptLight = x.newLight; save(); render(); });
  on('bkNow', () => { exportBackup(); render(); });
  on('bkLater', () => { S.backupSnooze = Date.now() + 7 * 86400e3; save(); render(); });
  document.querySelectorAll('[data-feel]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-feel]').forEach(x => x.classList.toggle('on', x === b));
  });
  on('ciGo', () => {
    const sel = document.querySelector('[data-feel].on');
    if (!sel) { toast('Dimmi prima come ti senti'); return; }
    const c = S.checkins[d] || {}; c.src = c.src || {};
    c.feel = +sel.dataset.feel;
    ['hrv', 'rhr', 'sleep', 'garmin'].forEach(k => {
      const v = document.getElementById('ci_' + k).value.replace(',', '.').trim();
      const n = v === '' ? null : +v;
      if (n !== c[k]) { if (c.src[k] === 'icu') delete c.src[k]; }
      c[k] = n == null || isNaN(n) ? null : n;
    });
    c.pain = document.getElementById('ci_pain').checked;
    const r0 = E.readiness(Object.assign({}, S.checkins, { [d]: c }), d) || {};
    c.snap = { at: Date.now(), score: r0.score, light: r0.light };
    SNAPK.forEach(k => { c.snap[k] = c[k] == null || c[k] === '' ? null : +c[k]; });
    S.checkins[d] = c; leaveEdit(); save();
    const cur = S.plans[d]; const nl = (E.readiness(S.checkins, d) || {}).light;
    refreshToday(!!(cur && cur.status === 'planned' && cur.lightUsed && cur.lightUsed !== nl)); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  on('ciEdit', () => { editCI = true; history.pushState({ view: 'oggi', edit: 1 }, ''); render(); });
  on('ciCancel', () => { leaveEdit(); render(); });
  document.querySelectorAll('[data-sport]').forEach(b => b.onclick = () => setOpts(o => { o.forceSport = b.dataset.sport || undefined; o.forceTid = undefined; o.reroll = 0; o.exclude = []; }));
  document.querySelectorAll('[data-dur]').forEach(b => b.onclick = () => setOpts(o => { o.forceDur = b.dataset.dur ? +b.dataset.dur : undefined; }));
  on('aIndoor', () => {
    const pp = S.plans[d]; const iv = E.indoorVersion(pp, S.profile); if (!iv) return;
    const from = E.TEMPLATES[pp.tid].name;
    setOpts(o => { o.forceSport = 'indoor'; o.forceTid = iv.tid; o.forceDur = iv.dur; o.exclude = []; });
    toast(iv.same ? from + ': versione rulli pronta' : from + ' → ' + iv.name + ' sui rulli');
  });
  on('aReroll', () => setOpts((o, pp) => { o.forceTid = undefined; o.reroll = (o.reroll || 0) + 1; o.exclude = [...(o.exclude || []), pp.tid].slice(-4); }));
  on('aPush', () => icuPush(S.plans[d]));
  on('aIcuHow', () => openSheet('<h3 style="margin:0 0 8px;font-size:20px">Inviala a Fenix, Edge e MyWhoosh</h3><p class="t2">Collega Intervals.icu nel Profilo: da lì la seduta arriva da sola su Garmin Connect (e quindi su orologio e ciclocomputer) e nel calendario di MyWhoosh.</p><button class="btn hot full" id="goProf">Vai al Profilo</button>',
    () => { document.getElementById('goProf').onclick = () => { closeSheet('profilo'); }; }));
  on('aDone', () => { const x = S.plans[d]; x.status = 'done'; x.via = 'manual'; save(); toast('Grande! Sudato e goduto 💪'); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  on('aSkip', () => {
    const x = S.plans[d]; x.status = 'skipped'; delete x.altExtra;
    if (x.pushed) { x.pushed = false; icuDelete(d); }
    save(); render(); openSkipSheet(d);
  });
  on('aUndo', () => {
    const x = S.plans[d]; const wasSkipped = x.status === 'skipped';
    x.status = 'planned'; delete x.via; delete x.altExtra; save(); render();
    if (wasSkipped && icuOn() && S.icu.auto && x.lightUsed) icuPush(x, true);   // torna anche su Garmin e MyWhoosh
  });
  on('aAlt', () => openSkipSheet(d));
  on('aFriends', () => openFriendsSheet(d));
  on('aFreeUndo', () => {
    const x = S.plans[d]; if (!x || !x.orig) return;
    S.plans[d] = Object.assign({}, x.orig, { status: 'planned', pushed: false, pushedSig: null }); save();
    syncPushState(S.plans[d]); toast('Torna la proposta di SMG'); render();
  });
  on('aExtraDay', () => { const x = S.plans[d]; x.opts = Object.assign({}, x.opts, { extra: true }); save(); const np = planFor(d, true); syncPushState(np); render(); });
  on('aExtra', e => { const id = e.currentTarget.dataset.x; S.extraDone[d] = S.extraDone[d] === id ? null : id; save(); render(); });
}

/* ------------------------------------------------------------------ */
/* Vista: Diario                                                       */
/* ------------------------------------------------------------------ */
function dayDone(d) {
  const p = S.plans[d]; const acts = (S.activities[d] || []).filter(a => a.min >= 10);
  if (acts.length) return { min: acts.reduce((a, b) => a + b.min, 0), load: acts.reduce((a, b) => a + (b.load || 0), 0), level: Math.max(...acts.map(a => a.level)) };
  if (p && !p.rest && p.status === 'done') { const st = E.stats(E.build(p, S.profile), p.sport, S.profile); return { min: st.min, load: st.tss, level: p.level }; }
  return null;
}
const FIT_C = '#1E9BDB', FAT_C = '#E5608E';   // colori verificati per daltonismo sul fondo scuro
const FIT_G = { W: 340, H: 150, L: 26, R: 6, T: 8, B: 22 };
function fitPoints() { const t = today(), pts = []; for (let i = 55; i >= 0; i--) { const d = E.addDays(t, -i); const v = S.fit && S.fit[d]; if (v) pts.push({ d, ctl: v[0], atl: v[1] }); } return pts; }
function fitScale(pts) {
  const g = FIT_G; const all = pts.flatMap(p => [p.ctl, p.atl]);
  let lo = Math.floor(Math.min(...all) / 10) * 10, hi = Math.ceil(Math.max(...all) / 10) * 10; if (hi - lo < 20) hi = lo + 20;
  const n = pts.length - 1;
  return { lo, hi, n, x: i => g.L + (g.W - g.L - g.R) * (n ? i / n : 0), y: v => g.T + (g.H - g.T - g.B) * (1 - (v - lo) / (hi - lo)) };
}
function fitnessHTML() {
  const pts = fitPoints();
  if (pts.length < 7) return '<div class="card"><h3>Andamento della forma</h3><div class="t2" style="font-size:14px">' +
    (icuOn() ? 'Il grafico compare dopo qualche giorno di dati da Intervals.icu.' : 'Collega Intervals.icu nel Profilo per vedere come cresce la tua forma.') + '</div></div>';
  const g = FIT_G, sc = fitScale(pts), { n, x, y } = sc;
  const path = k => pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[k]).toFixed(1)).join(' ');
  let grid = '';
  for (let k = 0; k <= 2; k++) { const v = sc.lo + (sc.hi - sc.lo) * k / 2; grid += '<line x1="' + g.L + '" x2="' + (g.W - g.R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#22334D" stroke-width="1"/><text x="' + (g.L - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end" font-size="10" fill="#7C8DA6">' + Math.round(v) + '</text>'; }
  const dl = d => { const z = E.parse(d); return z.getDate() + ' ' + MM[z.getMonth()].slice(0, 3); };
  const xl = [0, Math.round(n / 2), n].map(i => '<text x="' + x(i) + '" y="' + (g.H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === n ? 'end' : 'middle') + '" font-size="10" fill="#7C8DA6">' + (i === n ? 'oggi' : dl(pts[i].d)) + '</text>').join('');
  const last = pts[n], ago = pts[Math.max(0, n - 28)];
  const dFit = Math.round(last.ctl - ago.ctl), tsb = Math.round(last.ctl - last.atl);
  const tsbTxt = tsb < -25 ? 'molto affaticato' : tsb < -10 ? 'carico, in costruzione' : tsb <= 5 ? 'in equilibrio' : 'fresco';
  const summary = 'Fitness ' + Math.round(last.ctl) + (n >= 28 ? ', ' + (dFit >= 0 ? '+' : '−') + Math.abs(dFit) + ' in 4 settimane' : '') + '. Forma ' + (tsb > 0 ? '+' : tsb < 0 ? '−' : '') + Math.abs(tsb) + ': ' + tsbTxt + '.';
  return '<div class="card fit"><h3>Andamento della forma</h3><div style="font-size:15px;font-weight:600;margin:-4px 0 8px">' + summary + '</div>' +
    '<div class="legend"><span><i style="background:' + FIT_C + '"></i>Fitness ' + Math.round(last.ctl) + '</span><span><i style="background:' + FAT_C + '"></i>Fatica ' + Math.round(last.atl) + '</span></div>' +
    '<div class="fitwrap"><svg viewBox="0 0 ' + g.W + ' ' + g.H + '" style="width:100%;display:block" role="img" aria-label="' + esc(summary) + '">' + grid + xl +
    '<path d="' + path('atl') + '" fill="none" stroke="' + FAT_C + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>' +
    '<path d="' + path('ctl') + '" fill="none" stroke="' + FIT_C + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + x(n) + '" cy="' + y(last.ctl) + '" r="4" fill="' + FIT_C + '" stroke="#111B2B" stroke-width="2"/><circle cx="' + x(n) + '" cy="' + y(last.atl) + '" r="4" fill="' + FAT_C + '" stroke="#111B2B" stroke-width="2"/>' +
    '<g id="fitHover" style="display:none"><line id="fhL" y1="' + g.T + '" y2="' + (g.H - g.B) + '" stroke="#B3C2D6" stroke-width="1" opacity=".6"/><circle id="fhA" r="4" fill="' + FIT_C + '" stroke="#111B2B" stroke-width="2"/><circle id="fhB" r="4" fill="' + FAT_C + '" stroke="#111B2B" stroke-width="2"/></g>' +
    '<rect id="fitHit" x="' + g.L + '" y="0" width="' + (g.W - g.L - g.R) + '" height="' + g.H + '" fill="transparent"/></svg><div class="fittip" id="fitTip"></div></div>' +
    '<div class="mut" style="font-size:12.5px;margin-top:8px">Fitness: il carico medio delle ultime 6 settimane, sale se ti alleni con costanza. Fatica: quello dell\'ultima settimana. Forma: la differenza tra i due. Tocca il grafico per i valori di ogni giorno.</div></div>';
}
function bindFitness() {
  const hit = document.getElementById('fitHit'); if (!hit) return;
  const svg = hit.ownerSVGElement, tip = document.getElementById('fitTip'), gH = document.getElementById('fitHover');
  const pts = fitPoints(), g = FIT_G, { n, x, y } = fitScale(pts);
  const show = ev => {
    const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * g.W;
    const i = Math.max(0, Math.min(n, Math.round((px - g.L) / (g.W - g.L - g.R) * n))); const p = pts[i];
    gH.style.display = '';
    const ln = document.getElementById('fhL'); ln.setAttribute('x1', x(i)); ln.setAttribute('x2', x(i));
    const a = document.getElementById('fhA'), b = document.getElementById('fhB');
    a.setAttribute('cx', x(i)); a.setAttribute('cy', y(p.ctl)); b.setAttribute('cx', x(i)); b.setAttribute('cy', y(p.atl));
    tip.textContent = '';
    const z = E.parse(p.d); const head = document.createElement('div'); head.className = 'th'; head.textContent = z.getDate() + ' ' + MM[z.getMonth()]; tip.appendChild(head);
    [['Fitness', p.ctl, FIT_C], ['Fatica', p.atl, FAT_C], ['Forma', p.ctl - p.atl, null]].forEach(([lab, v, c]) => {
      const row = document.createElement('div'); row.className = 'tr';
      const k = document.createElement('i'); if (c) k.style.background = c; else k.style.opacity = 0; row.appendChild(k);
      const b2 = document.createElement('b'); b2.textContent = (lab === 'Forma' && v > 0 ? '+' : '') + Math.round(v); row.appendChild(b2);
      const sp = document.createElement('span'); sp.textContent = lab; row.appendChild(sp); tip.appendChild(row);
    });
    tip.style.display = 'block';
    const left = x(i) / g.W * r.width; tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, left - tip.offsetWidth / 2)) + 'px';
  };
  const hide = () => { gH.style.display = 'none'; tip.style.display = 'none'; };
  hit.addEventListener('pointermove', show); hit.addEventListener('pointerdown', show); hit.addEventListener('pointerleave', hide);
}
function renderDiario() {
  const t = today(); const mon = E.addDays(E.monday(t), weekOff * 7); const sun = E.addDays(mon, 6);
  const a = E.parse(mon), b = E.parse(sun);
  const label = a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + MM[a.getMonth()].slice(0, 3) : '') + ' – ' + b.getDate() + ' ' + MM[b.getMonth()].slice(0, 3);
  let n = 0, min = 0, load = 0, hard = 0, rows = '';
  for (let i = 0; i < 7; i++) {
    const d = E.addDays(mon, i); const x = E.parse(d); const p = S.plans[d]; const acts = S.activities[d] || []; const dn = dayDone(d);
    if (dn) { n++; min += dn.min; load += dn.load; if (dn.level >= 4) hard++; }
    const cfg = S.profile.days[x.getDay()] || {};
    let icon = '<div class="sporticon" style="background:var(--s2);color:var(--mut)">' + ico('moon') + '</div>', title = 'Riposo', sub = '', stc = 'rest', stt = '';
    if (p && !p.rest) {
      const tp = E.TEMPLATES[p.tid]; icon = sportIcon(p.sport); title = p.freeName || tp.name; sub = E.SPORTS[p.sport].name + ' · ' + fmtMin(p.dur) + ' · ' + E.LEVELS[p.level];
      stc = p.status === 'done' ? 'done' : p.status === 'skipped' ? 'skip' : 'plan'; stt = p.status === 'done' ? 'Fatta' : p.status === 'skipped' ? 'Saltata' : d < t ? (icuOn() ? 'Non fatta' : 'Non segnata') : 'Da fare';
    } else if (acts.length) {
      icon = sportIcon(acts[0].sport === 'other' ? 'road' : acts[0].sport); title = acts[0].name; sub = fmtMin(acts.reduce((s, y) => s + y.min, 0)) + ' · da Intervals.icu'; stc = 'done'; stt = 'Fatta';
    } else if (d > t && cfg.on) {
      icon = '<div class="sporticon" style="background:var(--s2);color:var(--mut)">' + ico('cal') + '</div>'; title = cfg.long ? 'Giorno lungo' : 'Allenamento'; sub = 'fino a ' + fmtMin(cfg.max); stc = 'plan'; stt = 'In arrivo';
    } else if (d < t && cfg.on) { title = 'Nessuna attività'; }
    if (p && !p.rest && acts.length && p.status === 'done') sub += ' · ✓ Intervals';
    rows += '<button class="day' + (d === t ? ' today' : '') + '" data-day="' + d + '"><div class="dn"><small>' + GG[x.getDay()].slice(0, 3) + '</small><b>' + x.getDate() + '</b></div>' + icon +
      '<div class="info"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></div>' + (stt ? '<span class="st ' + stc + '">' + stt + '</span>' : '') + '</button>';
  }
  // costanza: settimane consecutive con almeno 3 sedute
  let streak = 0;
  for (let k = 0; k < 52; k++) {
    const m0 = E.addDays(E.monday(t), -7 * k); let c = 0;
    for (let i = 0; i < 7; i++) if (dayDone(E.addDays(m0, i))) c++;
    if (c >= 3) streak++; else if (k > 0) break;
  }
  const variety = new Set(); for (let i = 0; i < 30; i++) { const p = S.plans[E.addDays(t, -i)]; if (p && p.status === 'done' && p.tid) variety.add(p.tid); }
  const deload = E.isDeload(S.profile, mon);
  let h = '<div class="hello"><div class="d">Diario</div><h1>La tua <em>settimana</em></h1></div>' +
    '<div class="weeknav"><button id="wPrev">' + ico('left') + '</button><b>' + label + ' <span class="tag">' + (deload ? 'Scarico' : 'Costruzione ' + (E.blockWeek(S.profile, mon) + 1) + '/3') + '</span></b><button id="wNext"' + (weekOff >= 1 ? ' disabled style="opacity:.3"' : '') + '>' + ico('right') + '</button></div>' +
    '<div class="tiles"><div class="tile"><b class="num">' + n + '</b><small>Sedute</small></div><div class="tile"><b class="num">' + fmtMin(min) + '</b><small>Tempo</small></div>' +
    '<div class="tile"><b class="num">' + Math.round(load) + '</b><small>Carico</small></div><div class="tile"><b class="num">' + hard + '</b><small>Dure</small></div></div>' + rows +
    '<div class="card" style="margin-top:14px"><div class="streak"><div class="fire">' + streak + '</div><div><b>' + (streak === 1 ? 'settimana' : 'settimane') + ' di fila con almeno 3 sedute</b><div class="mut" style="font-size:13px">' +
    variety.size + ' sedute diverse negli ultimi 30 giorni</div></div></div></div>' + fitnessHTML();
  $('#v-diario').innerHTML = h;
  bindFitness();
  $('#wPrev').onclick = () => { weekOff--; render(); };
  $('#wNext').onclick = () => { if (weekOff < 1) { weekOff++; render(); } };
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
    const d = b.dataset.day; const p = S.plans[d];
    if (d === t) { go('oggi'); return; }
    if (!p || p.rest) return;
    let extra = '';
    if (d < t) extra = '<div class="row" style="margin-top:4px"><button class="btn" data-set="done">' + ico('check') + 'Fatta</button><button class="btn" data-set="skipped">' + ico('x') + 'Saltata</button></div>';
    openSheet('<div class="d mut" style="font-size:14px;font-weight:600;margin:0 2px 10px">' + longDate(d) + '</div>' + workoutHTML(p, true) + extra, () => {
      document.querySelectorAll('[data-set]').forEach(x => x.onclick = () => { p.status = x.dataset.set; save(); closeSheet(); render(); });
    });
  });
}

/* ------------------------------------------------------------------ */
/* Vista: Profilo                                                      */
/* ------------------------------------------------------------------ */
const WNAME = { hrv: 'HRV', restingHR: 'FC a riposo', sleepScore: 'punteggio sonno', sleepSecs: 'ore di sonno', readiness: 'prontezza' };
function diagText() {
  const g = S.icu.diag; if (!g) return null;
  if (g.err) return 'Ultimo tentativo non riuscito (' + g.err + ')';
  if (!g.days) return 'Intervals.icu non ha dati di sonno o HRV negli ultimi 28 giorni: controlla che su Intervals sia attivo lo scaricamento dei dati di benessere da Garmin';
  if (!g.today.length) return 'Dati di benessere ricevuti per ' + g.days + ' giorni, ma per oggi ancora niente (ultimo: ' + longDate(g.last) + ')';
  return 'Oggi da Intervals: ' + g.today.map(k => WNAME[k]).join(', ');
}
function diagHTML() { const t = diagText(); return t ? '<div class="help" style="margin-top:8px">' + esc(t) + '</div>' : ''; }
function renderProfilo() {
  const P = S.profile;
  const pace = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const sw = (id, on) => '<span class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><i></i></span>';
  const fromIcu = k => icuOn() && (S.icu.prof || []).includes(k);
  const num = (id, v, unit, k) => '<div class="unit field"><div class="unit"><input inputmode="decimal" id="' + id + '" value="' + v + '"' + (k && fromIcu(k) ? ' disabled style="opacity:.75"' : '') + '><span>' + unit + '</span></div></div>';
  const srcNote = k => fromIcu(k) ? '<small style="color:var(--hot2)">da Intervals.icu</small>' : '';
  let h = '<div class="hello"><div class="d">Profilo</div><h1>Il tuo <em>motore</em></h1></div>';

  h += '<div class="card"><h3>Atleta</h3>' +
    '<div class="set"><div class="l"><b>FTP</b><small>' + (P.ftp / P.weight).toFixed(2).replace('.', ',') + ' W/kg</small>' + srcNote('ftp') + '</div><div class="v">' + num('pFtp', P.ftp, 'W', 'ftp') + '</div></div>' +
    '<div class="set"><div class="l"><b>Peso</b>' + srcNote('weight') + '</div><div class="v">' + num('pW', String(P.weight).replace('.', ','), 'kg', 'weight') + '</div></div>' +
    '<div class="set"><div class="l"><b>FC di soglia</b><small>Zone cardio per bici e corsa</small>' + srcNote('lthr') + '</div><div class="v">' + num('pLthr', P.lthr, 'bpm', 'lthr') + '</div></div>' +
    '<div class="set"><div class="l"><b>Passo di soglia</b><small>Per le sedute di corsa</small>' + srcNote('thrPace') + '</div><div class="v">' + num('pPace', pace(P.thrPace), '/km', 'thrPace') + '</div></div>' +
    ((S.icu.prof || []).length && icuOn() ? '<div class="mut" style="font-size:12.5px;margin-top:8px">I valori da Intervals.icu si aggiornano a ogni sincronizzazione: per cambiarli, modificali su Intervals.</div>' : '') +
    '<div class="set"><div class="l"><b>Ultimo test FTP</b><small>' + longDate(P.lastTest) + ' · prossimo proposto dopo 7 settimane</small></div><button class="btn sm" id="pTest">Fatto oggi</button></div></div>';

  h += '<div class="card"><h3>Sport</h3>' +
    [['indoor', 'Rulli e MyWhoosh'], ['mtb', 'Il preferito in autunno e inverno'], ['road', 'Con misuratore di potenza']].map(([s, sub]) =>
      '<div class="set">' + sportIcon(s) + '<div class="l"><b>' + E.SPORTS[s].name + '</b><small>' + sub + '</small></div>' + sw('sp_' + s, P.sports[s]) + '</div>').join('') +
    '<div class="set">' + sportIcon('run') + '<div class="l"><b>Corsa</b><small>' + (P.sports.run ? 'Attiva' : 'In pausa') + '</small></div>' + sw('sp_run', P.sports.run) + '</div>' +
    (P.sports.run ? '<div class="set"><div class="l"><b>Fase di rientro</b><small>Tempi e progressione da concordare con chi ti segue</small></div><div class="v w"><select id="pStage">' +
      ['Cammino e corsa', 'Corsa facile', 'Completa'].map((l, i) => '<option value="' + (i + 1) + '"' + (P.runStage === i + 1 ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div></div>' : '') +
    '<div class="set">' + sportIcon('strength') + '<div class="l"><b>Forza & mobilità</b><small>Extra facoltativi nei giorni leggeri</small></div>' + sw('sp_strength', P.sports.strength) + '</div></div>';

  h += '<div class="card"><h3>La tua settimana</h3>' + [1, 2, 3, 4, 5, 6, 0].map(g => {
    const c = P.days[g] || { on: false, max: 60 };
    return '<div class="dayset"><b>' + cap(GG[g].slice(0, 3)) + '</b>' + sw('d_on_' + g, c.on) +
      '<select id="d_type_' + g + '"' + (c.on ? '' : ' class="off"') + '><option value="0"' + (!c.long ? ' selected' : '') + '>Normale</option><option value="1"' + (c.long ? ' selected' : '') + '>Lungo</option></select>' +
      '<select id="d_max_' + g + '"' + (c.on ? '' : ' class="off"') + '>' + [45, 60, 75, 90, 105, 120, 150, 180].map(m => '<option value="' + m + '"' + (c.max === m ? ' selected' : '') + '>' + fmtMin(m) + '</option>').join('') + '</select></div>';
  }).join('') + '<div class="mut" style="font-size:12.5px;margin-top:8px">Durata massima per giorno. Ogni quarta settimana è di scarico.</div>' +
    '<div class="set" style="margin-top:6px;border-top:1px solid var(--line)"><div class="l"><b>Massimo sui rulli</b><small>Vale per tutte le sedute indoor</small></div><div class="v"><select id="pIndoorMax">' +
    [45, 60, 70, 75, 90, 105, 120].map(m => '<option value="' + m + '"' + ((P.indoorMax || 70) === m ? ' selected' : '') + '>' + fmtMin(m) + '</option>').join('') + '</select></div></div></div>';

  const st = S.icu.ok ? '<div class="status ok"><i></i>Collegato' + (S.icu.name ? ' · ' + esc(S.icu.name) : '') + '</div>' : S.icu.key ? '<div class="status err"><i></i>Non collegato</div>' : '<div class="status"><i></i>Non collegato</div>';
  h += '<div class="card"><h3>Intervals.icu → Garmin e MyWhoosh</h3>' + st +
    (S.icu.ok ? '<div class="mut" style="font-size:12.5px;margin-top:4px">Ultima sincronizzazione: ' + (S.icu.last ? new Date(S.icu.last).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai') + '</div>' + diagHTML() : '') +
    (!S.icu.ok ? '<div class="help"><b>Come collegarlo</b><ol><li>Crea un account gratuito su intervals.icu</li><li>In Settings collega Garmin Connect: spunta il caricamento degli allenamenti pianificati e lo scaricamento dei dati di benessere</li><li>In MyWhoosh, nelle connessioni, collega Intervals.icu</li><li>In Settings → Developer Settings genera la chiave API e incollala qui sotto</li></ol></div>' : '') +
    '<div class="grid2" style="margin-top:10px"><div class="field"><label>ID atleta</label><input id="iAth" value="' + esc(S.icu.athlete) + '" placeholder="0"></div>' +
    '<div class="field"><label>Chiave API</label><input id="iKey" type="password" value="' + esc(S.icu.key) + '" placeholder="incolla qui" autocomplete="off"></div></div>' +
    '<div class="mut" style="font-size:12px;margin:6px 2px 10px">Con ID 0 si usa il tuo account. La chiave resta solo su questo telefono.</div>' +
    '<label class="check" style="margin-top:0">' + sw('iAuto', S.icu.auto) + 'Invia da solo la seduta del giorno dopo il check-in</label>' +
    '<div class="row"><button class="btn hot" id="iGo">' + ico('link') + (S.icu.ok ? 'Ricollega' : 'Collega') + '</button>' +
    (S.icu.ok ? '<button class="btn" id="iSync">' + ico('sync', busy.sync ? 'spin' : '') + 'Aggiorna</button>' : '') + '</div>' +
    (S.icu.ok ? '<button class="btn ghost sm full" id="iOff" style="margin-top:8px">Scollega</button>' : '') + '</div>';

  h += '<div class="card"><h3>Meteo</h3><div class="set"><div class="l"><b>' + esc(S.loc ? S.loc.name : 'Nessuna località') + '</b><small>Con pioggia o freddo la proposta va sui rulli</small></div><button class="btn sm" id="lHere">' + ico('pin') + 'Qui</button></div>' +
    '<div class="row" style="margin-top:6px"><input id="lQ" placeholder="Cerca un comune…"><button class="btn" id="lFind" style="flex:none">Cerca</button></div><div class="results" id="lRes"></div></div>';

  h += '<div class="card"><h3>Dati</h3><div class="mut" style="font-size:13px;margin-bottom:10px">Tutto resta nel telefono. Fai un backup una volta al mese (la chiave API non viene esportata).' +
    (icuOn() ? ' Le sedute inviate e i dati di salute si recuperano comunque da Intervals.icu.' : '') +
    '<br><span style="color:var(--t2)">Ultimo backup: ' + (S.lastBackup ? new Date(S.lastBackup).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : 'mai') + '</span></div>' +
    '<div class="row"><button class="btn" id="bExp">Esporta backup</button><button class="btn" id="bImp">Importa</button></div><input type="file" id="bFile" accept="application/json" hidden>' +
    '<button class="btn ghost sm full" id="bReset" style="margin-top:8px;color:var(--red)">Azzera tutto</button></div>' +
    '<div class="card"><h3>Guida rapida</h3><div class="t2" style="font-size:14px;margin-bottom:10px">Come funziona SMG, funzione per funzione.</div><button class="btn full" id="guideOpen">Apri la guida</button></div>' +
    '<div class="foot">SMG · Sudo Ma Godo · v1.1</div>';

  $('#v-profilo').innerHTML = h;
  bindProfilo();
}

function bindProfilo() {
  const P = S.profile; const g = id => document.getElementById(id);
  const numIn = (id, fn) => { const el = g(id); if (el) el.onchange = () => { const v = +el.value.replace(',', '.'); if (!isNaN(v) && v > 0) { fn(v); save(); render(); } else render(); }; };
  numIn('pFtp', v => P.ftp = Math.round(v)); numIn('pW', v => P.weight = v); numIn('pLthr', v => P.lthr = Math.round(v));
  g('pPace').onchange = () => { const m = g('pPace').value.match(/^(\d{1,2})[:.,'](\d{1,2})$/); if (m) { P.thrPace = +m[1] * 60 + +m[2]; save(); } render(); };
  g('pTest').onclick = () => { P.lastTest = today(); save(); toast('Ricordati di aggiornare l\'FTP'); render(); };
  const changed = () => { save(); const p = S.plans[today()]; if (p && p.status === 'planned') refreshToday(true); render(); };
  ['indoor', 'mtb', 'road', 'run', 'strength'].forEach(s => g('sp_' + s).onchange = e => {
    P.sports[s] = e.target.checked;
    if (!['indoor', 'mtb', 'road', 'run'].some(x => P.sports[x])) { P.sports[s] = true; toast('Serve almeno uno sport attivo'); }
    if (s === 'run' && e.target.checked) { P.runStage = P.runStage || 1; toast('Corsa attiva: si riparte con calma'); }
    changed();
  });
  if (g('pStage')) g('pStage').onchange = e => { P.runStage = +e.target.value; changed(); };
  [0, 1, 2, 3, 4, 5, 6].forEach(d => {
    const c = P.days[d] || (P.days[d] = { on: false, max: 60 });
    g('d_on_' + d).onchange = e => { c.on = e.target.checked; changed(); };
    g('d_type_' + d).onchange = e => { c.long = e.target.value === '1'; if (c.long && c.max < 90) c.max = 150; if (!c.long && c.max > 90) c.max = 75; changed(); };
    g('d_max_' + d).onchange = e => { c.max = +e.target.value; changed(); };
  });
  g('iGo').onclick = async () => { S.icu.key = g('iKey').value.trim(); S.icu.athlete = g('iAth').value.trim() || '0'; save(); if (!S.icu.key) { toast('Incolla la chiave API'); return; } await icuConnect(); render(); };
  g('iAuto').onchange = e => { S.icu.auto = e.target.checked; save(); };
  if (g('iSync')) g('iSync').onclick = () => icuSync(false);
  if (g('iOff')) g('iOff').onclick = () => { S.icu = { key: '', athlete: '0', auto: S.icu.auto, name: '', last: 0, ok: false }; save(); render(); };
  g('lHere').onclick = locate;
  g('pIndoorMax').onchange = e => { P.indoorMax = +e.target.value; P.indoorMaxSet = true; changed(); };
  g('guideOpen').onclick = openGuide;
  const find = async () => {
    const q = g('lQ').value.trim(); if (q.length < 2) return;
    try {
      const res = await searchPlace(q);
      g('lRes').innerHTML = res.length ? res.map((r, i) => '<button data-i="' + i + '">' + esc(r.name) + '</button>').join('') : '<div class="mut" style="margin-top:8px">Nessun risultato</div>';
      g('lRes').querySelectorAll('button').forEach(b => b.onclick = async () => { S.loc = res[+b.dataset.i]; save(); await fetchWeather(true); refreshToday(!(S.plans[today()] || {}).lightUsed); toast('Meteo di ' + S.loc.name); render(); });
    } catch (e) { toast('Ricerca non riuscita'); }
  };
  g('lFind').onclick = find; g('lQ').onkeydown = e => { if (e.key === 'Enter') find(); };
  g('bExp').onclick = () => { exportBackup(); render(); };
  g('bImp').onclick = () => g('bFile').click();
  g('bFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const x = JSON.parse(r.result); if (!x.profile) throw 0; const key = S.icu; S = Object.assign(fresh(), x); S.icu = Object.assign(S.icu, { key: key.key, ok: key.ok, name: key.name }); save(); toast('Backup importato'); render(); } catch (err) { toast('File non valido'); } };
    r.readAsText(f);
  };
  g('bReset').onclick = () => openSheet('<h3 style="margin:0 0 8px;font-size:20px">Azzerare tutto?</h3><p class="t2">Profilo, check-in e diario verranno cancellati da questo telefono.</p><div class="row"><button class="btn" id="rNo">Annulla</button><button class="btn hot" id="rYes">Azzera</button></div>', () => {
    g('rNo').onclick = () => closeSheet(); g('rYes').onclick = () => { localStorage.removeItem(KEY); S = fresh(); save(); closeSheet('oggi'); };
  });
}

/* ------------------------------------------------------------------ */
/* Navigazione                                                         */
/* ------------------------------------------------------------------ */
/* Navigazione con il tasto Indietro di Android:
   Oggi è la base; Diario/Profilo e le schede aperte sono passi nella cronologia. */
const sheetOpen = () => $('#sheet').classList.contains('on');
/* ------------------------------------------------------------------ */
/* Guida rapida                                                        */
/* ------------------------------------------------------------------ */
const GUIDE = [
  ['check', 'Ogni mattina', `<ol><li>Apri SMG: scarica da solo HRV, FC a riposo, sonno, peso e le attività di ieri da Intervals.icu.</li>
    <li>Tocca la faccina che ti rappresenta e premi <b>Calcola il semaforo</b>. Se hai un acciacco, attiva l'interruttore.</li>
    <li>La seduta parte da sola verso Intervals e arriva su Fenix, Edge e MyWhoosh. Per non aspettare, apri Garmin Connect.</li></ol>
    <p>Se i campi della notte sono vuoti, l'orologio non ha ancora sincronizzato: apri Garmin Connect, poi riapri SMG o premi Aggiorna nel Profilo. Va bene anche la sola faccina.</p>`],
  ['tl', 'Semaforo e indicatori', `<p><b>Verde</b>: via libera, anche sedute dure. <b>Arancione</b>: al massimo ritmo medio. <b>Rosso</b>: solo recupero; con un punteggio molto basso, riposo.</p>
    <p>Il punteggio unisce sensazione, HRV, FC a riposo, sonno, forma ed eventuali dolori.</p>
    <p><b>Come leggere i riquadri</b>: in alto il valore di stanotte, sotto il confronto in parole (verde se va bene, rosso se no), in basso l'andamento degli ultimi 7 giorni. La <b>linea tratteggiata</b> è il tuo riferimento: se la linea azzurra ci sta sopra o sotto, sei sopra o sotto il tuo solito.</p>
    <ul><li><b>HRV</b>: più alta è meglio. Conta la media degli ultimi 7 giorni rispetto alla tua norma (la fascia indicata, calcolata su 60 giorni). Una notte storta pesa poco. Nelle prime settimane il confronto è con la media semplice.</li>
    <li><b>FC a riposo</b>: più bassa è meglio. Qualche battito sopra il solito è un segnale di stanchezza o di malanno in arrivo.</li>
    <li><b>Sonno</b>: il punteggio del Fenix; sotto 65 pesa sul semaforo.</li>
    <li><b>Forma</b>: fitness meno fatica, da Intervals. La linea tratteggiata è lo zero: sopra sei fresco, molto sotto hai carico accumulato.</li></ul>
    <p><b>Modifica</b> riapre il check-in per correggere sensazione o valori; Indietro lo richiude senza cambiare nulla.</p>
    <p>Il semaforo segue i dati più recenti: Garmin aggiorna alcuni valori durante la giornata (per esempio la FC a riposo) e Intervals ricalcola la Forma quando arrivano attività. Se il punteggio cambia dopo il check-in, sotto il semaforo vedi il valore del check-in e quali dati sono cambiati. In <b>Come è calcolato il punteggio</b> trovi il contributo di ogni voce.</p>`],
  ['bolt', 'La seduta del giorno', `<ul><li><b>Rilancia</b>: un'alternativa equivalente, se quella proposta non ti ispira.</li>
    <li><b>Sport</b> e <b>Tempo a disposizione</b>: imponi lo sport o la durata; il resto delle regole resta. Automatico torna alla proposta dell'app.</li>
    <li><b>Falla sui rulli</b>: la stessa seduta (o la sua gemella indoor) con obiettivi in watt per il Tacx.</li>
    <li><b>Fatta</b> / <b>Oggi salto</b>: se è collegato Intervals non serve segnarla, la riconosce da sola. Con <b>Oggi salto</b> la seduta sparisce anche da Garmin e MyWhoosh, la settimana si riequilibra (una seduta dura saltata può tornare nei giorni dopo) e puoi scegliere un'alternativa breve di mobilità o forza leggera in base al tempo che hai. <b>Annulla</b> la rimette.</li>
    <li><b>Dettaglio della seduta</b>: blocchi, durate, watt o battiti, cadenze.</li>
    <li><b>Decido io: esco con gli amici</b>: scegli sport, durata e "che aria tira" (tranquilla, mista, garosa). Sul Fenix non arriva nessun allenamento strutturato: registri l'uscita come sempre e SMG, leggendo da Intervals com'è andata davvero, regola i giorni dopo (se è stata dura, il giorno dopo si scarica). Funziona anche nei giorni di riposo. <b>Proposta SMG</b> rimette la seduta originale.</li></ul>
    <p>Ogni modifica dopo l'invio sostituisce la seduta su Intervals, Garmin e MyWhoosh.</p>
    <p><b>Dopo il check-in la seduta non cambia più da sola</b>, nemmeno se chiudi e riapri l'app. Se arrivano dati nuovi che cambiano il semaforo (per esempio HRV e sonno sincronizzati in ritardo), compare un avviso: scegli tu se adeguare la seduta o tenere quella di prima.</p>`],
  ['brain', 'Come sceglie', `<ul><li>Il semaforo fissa quanto può essere dura.</li>
    <li>Massimo 2 sedute dure a settimana, mai due giorni duri di fila, una sola dura tra venerdì e domenica.</li>
    <li>Lunedì e mercoledì tendono alla qualità, venerdì al fondo, sabato o domenica alla seduta dura del blocco.</li>
    <li>Sport, da ottobre a marzo: <b>qualità sui rulli</b> (sedute dure a potenza, in ERG) e <b>volume fuori</b> (fondo e lunghi in MTB/gravel, rulli solo se piove). Da aprile a settembre più spazio alla strada e meno ai rulli.</li>
    <li>Sui rulli al massimo 70 minuti (si cambia nel Profilo, sotto "La tua settimana").</li>
    <li>Evita le sedute fatte di recente e lo sport di ieri. Ogni 7 settimane propone il test FTP.</li>
    <li>Se le ultime sedute ti sono sembrate dure (fatica percepita sul Fenix), rallenta; se facili, alza l'asticella.</li></ul>
    <p>Le etichette sotto la seduta spiegano il perché della scelta.</p>`],
  ['stairs', 'Blocchi e progressione', `<p>Le settimane vanno a cicli di quattro: tre di <b>costruzione</b>, in cui durate e ripetute crescono un poco, e una di <b>scarico</b>, più leggera e corta. Nel Diario l'etichetta della settimana indica dove sei.</p>`],
  ['cloud', 'Meteo e domani', `<p>La scheda in alto mostra oggi e domani, con la seduta probabile di domani e la finestra di 3 ore più asciutta se piove. La proposta di domani si conferma col check-in del mattino. La località si imposta nel Profilo.</p>`],
  ['cal', 'Diario e grafico', `<ul><li>Settimana per settimana: sedute, tempo, carico, sedute dure. Tocca un giorno passato per vedere la seduta o segnarla.</li>
    <li><b>Andamento della forma</b>: fitness (azzurro) e fatica (rosa) delle ultime 8 settimane. Se la fitness sale, stai migliorando. Tocca il grafico per i valori del giorno.</li></ul>`],
  ['link', 'Intervals, Garmin, MyWhoosh', `<ul><li><b>SMG → Intervals → Garmin Connect → Fenix ed Edge</b>; e <b>Intervals → MyWhoosh</b> per le sedute indoor.</li>
    <li>Da Garmin a Intervals arrivano attività, sonno, HRV, FC a riposo e peso. FTP e soglie no.</li>
    <li>FTP, FC e passo di soglia SMG li legge da Intervals: <b>si cambiano lì</b> (e se vuoi anche su Garmin, per le zone dell'orologio).</li></ul>`],
  ['user', 'Profilo', `<ul><li><b>Test FTP</b>: dopo il test aggiorna l'FTP su Intervals; SMG lo riconosce e riparte il conteggio delle 7 settimane.</li>
    <li><b>Corsa</b>: riattivala quando la fascite lo permette. Fasi: cammino e corsa, corsa facile, completa. Tempi da concordare con chi ti segue.</li>
    <li><b>La tua settimana</b>: giorni attivi, giorni lunghi e durata massima di ciascuno.</li>
    <li><b>Forza e mobilità</b>: extra facoltativi nei giorni leggeri.</li></ul>`],
  ['save', 'Backup e cambio telefono', `<p>Le sedute inviate e i dati di salute si recuperano da Intervals (ultimi 60 giorni). Giorni, sport, località e check-in a mano vivono solo sul telefono: <b>Esporta backup</b> una volta al mese (te lo ricorda l'app). Su un telefono nuovo: installa SMG, <b>Importa</b> il backup e reincolla la chiave di Intervals.</p>`],
  ['wrench', 'Se qualcosa non va', `<ul><li><b>App non aggiornata</b>: chiudila del tutto e riaprila, anche due volte.</li>
    <li><b>Seduta non arriva sull'orologio</b>: controlla nel Profilo che Intervals sia collegato (pallino verde) e sincronizza Garmin Connect.</li>
    <li><b>Dati della notte mancanti</b>: guarda il riquadro sotto "Ultima sincronizzazione" nel Profilo, dice dove si ferma il dato.</li>
    <li><b>Installazione</b>: tocca Installa una sola volta e attendi la conferma.</li></ul>`]
];
const GI = {
  check: I.check, bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', tl: '<rect x="8" y="2" width="8" height="20" rx="3"/><circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="17" r="1.5"/>',
  brain: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>', stairs: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5 4.5 4.5 0 0 1 17.5 18z"/>', cal: I.cal, link: I.link,
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', save: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'
};
function openGuide() {
  const sv = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + GI[k] + '</svg>';
  openSheet('<div class="guide"><h2>Guida rapida</h2><p class="intro">Tocca un argomento per aprirlo.</p>' +
    GUIDE.map(([k, t, b], i) => '<details' + (i === 0 ? ' open' : '') + '><summary><span class="gi">' + sv(k) + '</span>' + t + '<svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></summary><div class="gb">' + b + '</div></details>').join('') +
    '<button class="btn full" id="guideClose" style="margin-top:14px">Chiudi</button></div>', () => { document.getElementById('guideClose').onclick = () => closeSheet(); });
}
$('#helpBtn').onclick = openGuide;
// seduta saltata: alternativa breve senza fatica, in base al tempo che hai
const ALT = [
  ['mob_hips', 'Anche e schiena libere', 'Mobilità', 12, 'Scioglie anche e schiena, ideale dopo una giornata seduto.'],
  ['mob_bike', 'Mobilità per ciclisti', 'Mobilità', 15, 'Allunga flessori, femorali e petto, i punti che la bici accorcia.'],
  ['core', 'Core & stabilità', 'Forza leggera', 15, 'Addome e schiena: aiuta la posizione in sella e la schiena.'],
  ['legs', 'Forza gambe a corpo libero', 'Forza', 20, 'Gambe e glutei senza attrezzi, poco stancante per il cuore.']
];
// "Decido io": uscita in compagnia, a sensazione
const FEEL = [
  ['easy', 2, 'Tranquilla', 'Si chiacchiera, nessuno tira'],
  ['mix', 3, 'Mista', 'Qualche tirata sugli strappi o in volata'],
  ['race', 4, 'Garosa', 'Si fa a gara, cartelli e salite a tutta']
];
const FREE_NAME = { mtb: 'Giro in MTB con gli amici', road: 'Uscita in bici con gli amici', run: 'Corsa con gli amici', indoor: 'Uscita di gruppo su MyWhoosh' };
function openFriendsSheet(d) {
  const p = S.plans[d] || { date: d }; const base = p.free ? p.orig : p;
  const sports = ['mtb', 'road', 'run', 'indoor'].filter(x => S.profile.sports[x]);
  let sp = p.free ? p.sport : (sports.includes('mtb') ? 'mtb' : sports[0]);
  let dur = p.free ? p.dur : (base && !base.rest && base.dur ? Math.max(60, base.dur) : 120);
  let fe = p.free ? p.freeFeel : 'mix';
  const draw = () => {
    const chip = (attr, val, on, lab) => '<button class="chip' + (on ? ' on' : '') + '" data-' + attr + '="' + val + '">' + lab + '</button>';
    document.getElementById('frBody').innerHTML =
      '<div class="ctl"><div class="lab">Cosa fate</div><div class="chips" style="flex-wrap:wrap">' + sports.map(x => chip('fsp', x, x === sp, x === 'indoor' ? 'Gruppo su MyWhoosh' : E.SPORTS[x].name)).join('') + '</div>' +
      '<div class="lab">Quanto pensi di stare fuori</div><div class="chips" style="flex-wrap:wrap">' + [45, 60, 90, 120, 150, 180, 240, 300].map(m => chip('fdu', m, m === dur, fmtMin(m))).join('') + '</div>' +
      '<div class="lab">Che aria tira</div></div>' +
      FEEL.map(f => '<button class="day" data-ffe="' + f[0] + '" style="' + (f[0] === fe ? 'border-color:var(--hot)' : '') + '"><div class="info"><b>' + f[2] + '</b><small>' + f[3] + '</small></div>' + dots(f[1]) + '</button>').join('');
    document.querySelectorAll('[data-fsp]').forEach(b => b.onclick = () => { sp = b.dataset.fsp; draw(); });
    document.querySelectorAll('[data-fdu]').forEach(b => b.onclick = () => { dur = +b.dataset.fdu; draw(); });
    document.querySelectorAll('[data-ffe]').forEach(b => b.onclick = () => { fe = b.dataset.ffe; draw(); });
  };
  openSheet('<div class="guide"><h2>Oggi decidi tu</h2><p class="intro">Uscita in compagnia, a sensazione. Sul Fenix non arriva nessun allenamento strutturato; da Intervals SMG vedrà com\'è andata e regolerà i prossimi giorni.</p><div id="frBody"></div>' +
    '<button class="btn hot full" id="frGo" style="margin-top:12px">Fatto, divertiti!</button></div>', () => {
      draw();
      document.getElementById('frGo').onclick = () => {
        const f = FEEL.find(x => x[0] === fe); const rd = E.readiness(S.checkins, d);
        const np = { date: d, tid: 'friends', sport: sp, level: f[1], dur, free: true, freeFeel: fe, freeName: FREE_NAME[sp], status: 'planned',
          lightUsed: rd ? rd.light : 'free', light: rd ? rd.light : null, score: rd ? rd.score : null, v: ENGINE_V, opts: {},
          reasons: ['Uscita scelta da te: ' + f[2].toLowerCase()], orig: base && !base.free ? JSON.parse(JSON.stringify(base)) : (p.orig || null),
          pushed: !!(p && p.pushed), pushedSig: null };
        S.plans[d] = np; save(); syncPushState(np); closeSheet(); toast('Buona uscita!'); render();
      };
    });
}
function openSkipSheet(d) {
  const p = S.plans[d]; if (!p) return;
  const rd = E.readiness(S.checkins, d);
  const tired = rd && rd.light !== 'green';
  const list = ALT.filter(a => !(tired && a[2] === 'Forza'));   // se sei stanco, niente forza vera
  openSheet('<div class="guide"><h2>Ti va un\'alternativa breve?</h2><p class="intro">Niente fatica, solo qualcosa che fa bene' + (tired ? ' (oggi il semaforo non è verde: solo mobilità e core).' : '.') + ' Scegli in base al tempo che hai.</p>' +
    list.map(a => '<button class="day" data-alt="' + a[0] + '"><div class="sporticon" style="background:#3FE0C524;color:#3FE0C5">' + ico('strength') + '</div><div class="info"><b>' + a[1] + '</b><small>' + a[2] + ' · ' + esc(a[4]) + '</small></div><span class="st plan">' + a[3] + "'</span></button>").join('') +
    '<button class="btn full" id="altNone" style="margin-top:6px">No, oggi riposo</button></div>', () => {
      document.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => { p.altExtra = b.dataset.alt; save(); closeSheet(); render(); });
      document.getElementById('altNone').onclick = () => { p.altExtra = null; save(); closeSheet(); render(); };
    });
}
function openSheet(html, bind) {
  $('#sheetBody').innerHTML = html; $('#sheet').classList.add('on'); if (bind) bind();
  history.pushState({ view, sheet: 1 }, '');
}
// thenGo: vista da aprire dopo la chiusura (si apre quando il passo "scheda" è stato tolto)
let pendingGo = null;
function closeSheet(thenGo) {
  if (!sheetOpen()) { if (typeof thenGo === 'string') go(thenGo); return; }
  $('#sheet').classList.remove('on');
  if (history.state && history.state.sheet) { pendingGo = typeof thenGo === 'string' ? thenGo : null; history.back(); }
  else if (typeof thenGo === 'string') go(thenGo);
}
$('#sheet').onclick = e => { if (e.target.id === 'sheet') closeSheet(); };
function show(v) { view = v; document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); render(); window.scrollTo(0, 0); }
function go(v) {
  if (v === 'diario') weekOff = 0;
  if (editCI && v !== 'oggi') { editCI = false; if (history.state && history.state.edit) history.replaceState({ view: 'oggi' }, ''); }
  if (v === view) { show(v); return; }
  if (v === 'oggi') { if (history.state && history.state.view && history.state.view !== 'oggi') { history.back(); return; } history.replaceState({ view: 'oggi' }, ''); }
  else if (view === 'oggi') history.pushState({ view: v }, '');
  else history.replaceState({ view: v }, '');
  show(v);
}
function leaveEdit() {
  if (!editCI) return;
  editCI = false;
  if (history.state && history.state.edit) history.back();   // toglie il passo "modifica"
}
window.addEventListener('popstate', e => {
  const st = e.state || { view: 'oggi' };
  if (editCI && !st.edit) { editCI = false; if ((st.view || 'oggi') === view) render(); }
  if (sheetOpen() && !st.sheet) $('#sheet').classList.remove('on');
  if ((st.view || 'oggi') !== view) show(st.view || 'oggi');
  if (pendingGo) { const v = pendingGo; pendingGo = null; go(v); }
});
history.replaceState({ view: 'oggi' }, '');
document.querySelectorAll('nav button').forEach(b => b.onclick = () => go(b.dataset.v));

function render() {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
  if (view === 'oggi') renderOggi(); else if (view === 'diario') renderDiario(); else renderProfilo();
}

/* ------------------------------------------------------------------ */
/* Avvio                                                               */
/* ------------------------------------------------------------------ */
let lastDay = today();
async function boot() {
  render();
  const d = today(); const p = S.plans[d];
  const got = await fetchWeather(false);
  if (got) { const q = S.plans[d]; if (q && q.status === 'planned' && !q.lightUsed && !q.wxUsed && !(q.opts && Object.keys(q.opts).length)) refreshToday(true); render(); }
  if (icuOn() && Date.now() - (S.icu.last || 0) > 10 * 60e3) icuSync(true);
  void p;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (today() !== lastDay) { lastDay = today(); editCI = false; }
  boot();
});
boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// per i test
window.__smg = { get state() { return S; }, render, go, planFor, refreshToday };
})();
