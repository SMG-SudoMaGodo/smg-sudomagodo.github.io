/* SMG – Sudo Ma Godo · motore delle sedute
   Logica pura (nessun accesso al DOM): prontezza, scelta della seduta,
   libreria allenamenti, conversione in formato Intervals.icu. */
(function (root) {
'use strict';

/* ------------------------------------------------------------------ */
/* Date                                                                */
/* ------------------------------------------------------------------ */
const pad = n => String(n).padStart(2, '0');
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
function dow(s) { return parse(s).getDay(); }                 // 0 = domenica
function monday(s) { const w = dow(s); return addDays(s, w === 0 ? -6 : 1 - w); }
function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
function month(s) { return parse(s).getMonth() + 1; }

/* ------------------------------------------------------------------ */
/* Numeri casuali riproducibili                                        */
/* ------------------------------------------------------------------ */
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickWeighted(r, items) {            // items: [[valore, peso], ...]
  const tot = items.reduce((s, x) => s + Math.max(0, x[1]), 0);
  if (tot <= 0) return items.length ? items[0][0] : null;
  let v = r() * tot;
  for (const [val, w] of items) { v -= Math.max(0, w); if (v <= 0) return val; }
  return items[items.length - 1][0];
}
const between = (r, a, b) => a + (b - a) * r();
const round5 = m => Math.max(5, Math.round(m / 5) * 5);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ------------------------------------------------------------------ */
/* Sport e zone                                                        */
/* ------------------------------------------------------------------ */
const SPORTS = {
  indoor:   { name: 'Indoor',        sub: 'Tacx · MyWhoosh',  target: 'power', icu: 'VirtualRide' },
  mtb:      { name: 'MTB / Gravel',  sub: 'Outdoor',          target: 'hr',    icu: 'MountainBikeRide' },
  road:     { name: 'Bici da strada', sub: 'Outdoor · potenza', target: 'power', icu: 'Ride' },
  run:      { name: 'Corsa',         sub: 'A piedi',          target: 'pace',  icu: 'Run' },
  strength: { name: 'Forza & mobilità', sub: 'Extra',         target: 'none',  icu: 'WeightTraining' }
};

// p = % FTP · hr = % FC soglia · pace = % velocità di soglia · lvl = intensità per il grafico (0-6)
const ZONES = {
  WALK: { name: 'Cammino',      p: [40, 50],   hr: [55, 70],   pace: [45, 55],  rpe: '1-2', lvl: 0.4 },
  Z1:   { name: 'Recupero',     p: [45, 55],   hr: [65, 80],   pace: [65, 78],  rpe: '2-3', lvl: 1 },
  Z2:   { name: 'Fondo',        p: [60, 75],   hr: [81, 89],   pace: [78, 88],  rpe: '3-4', lvl: 2 },
  Z3:   { name: 'Tempo',        p: [76, 87],   hr: [90, 93],   pace: [88, 94],  rpe: '5-6', lvl: 3 },
  SS:   { name: 'Sweet spot',   p: [88, 94],   hr: [92, 95],   pace: [92, 96],  rpe: '6-7', lvl: 3.5 },
  Z4:   { name: 'Soglia',       p: [95, 102],  hr: [95, 99],   pace: [96, 102], rpe: '7-8', lvl: 4 },
  O4:   { name: 'Sopra soglia', p: [104, 108], hr: [98, 101],  pace: [102, 105], rpe: '8',  lvl: 4.4 },
  Z5:   { name: 'VO2max',       p: [108, 120], hr: [100, 104], pace: [104, 110], rpe: '8-9', lvl: 5 },
  Z6:   { name: 'Anaerobico',   p: [120, 140], hr: [100, 106], pace: [110, 120], rpe: '9',   lvl: 5.6 },
  Z7:   { name: 'Sprint',       p: [150, 250], hr: [100, 106], pace: [120, 135], rpe: '10',  lvl: 6 },
  TEST: { name: 'Test a tutta', p: [100, 110], hr: [99, 104],  pace: [100, 104], rpe: '9',   lvl: 4.8 },
  MIX:  { name: 'A sensazione', p: [60, 110],  hr: [81, 104],  pace: [80, 105], rpe: '3-9', lvl: 2.6 }
};

const LEVELS = ['', 'Rigenerante', 'Fondo', 'Medio', 'Duro', 'Molto duro'];

/* ------------------------------------------------------------------ */
/* Mattoncini per costruire le sedute                                  */
/* ------------------------------------------------------------------ */
const st = (z, min, txt, cad) => ({ z, d: Math.round(min * 60), txt: txt || '', cad: cad || null });
const sec = (title, steps, rep) => ({ title, steps, rep: rep || 1 });
const secLen = s => s.rep * s.steps.reduce((a, x) => a + x.d, 0) / 60;
const totLen = ss => ss.reduce((a, s) => a + secLen(s), 0);

function warmup(sport, min, hard) {
  if (sport === 'run') {
    if (!hard) return sec('Riscaldamento', [st('Z1', min, 'Corsa molto facile')]);
    return sec('Riscaldamento', [st('Z1', Math.max(5, min - 3), 'Corsa facile'), st('Z3', 1.5, 'Progressivo'), st('Z1', 1.5, 'Sciolto')]);
  }
  if (!hard) return sec('Riscaldamento', [st('Z1', Math.ceil(min / 2), 'Agile e leggero', [85, 95]), st('Z2', Math.floor(min / 2), 'Sali di ritmo')]);
  const base = Math.max(4, min - 6);
  return sec('Riscaldamento', [
    st('Z1', Math.ceil(base / 2), 'Agile e leggero', [85, 95]), st('Z2', Math.floor(base / 2), 'Sali di ritmo'),
    st('Z3', 1, 'Apri il motore'), st('Z4', 1, 'Assaggio di soglia'), st('Z5', 0.5, 'Breve accelerata'), st('Z1', 3.5, 'Recupera')
  ]);
}
function cooldown(sport, min) {
  return sec('Defaticamento', [st('Z1', min, sport === 'run' ? 'Corsa sciolta o cammino' : 'Scarica le gambe')]);
}
// riempie il tempo rimasto con fondo, se serve
function filler(total, sections, sport, title) {
  const left = Math.round(total - totLen(sections));
  if (left >= 4) return [sec(title || 'Fondo', [st('Z2', left, sport === 'run' ? 'Corsa facile e regolare' : 'Fondo regolare')])];
  return [];
}
function assemble(total, sport, wu, main, cdMin, fillerTitle, fillerFirst) {
  const cd = cooldown(sport, cdMin);
  const core = [wu, ...main];
  const fill = filler(total, [...core, cd], sport, fillerTitle);
  return fillerFirst ? [wu, ...fill, ...main, cd] : [...core, ...fill, cd];
}

/* ------------------------------------------------------------------ */
/* Libreria sedute                                                     */
/* ------------------------------------------------------------------ */
const BIKE = ['indoor', 'road', 'mtb'];
const OUT = ['road', 'mtb'];

const T = [
  /* ---------- 1 · rigenerante ---------- */
  { id: 'rec_spin', name: 'Giro rigenerante', level: 1, sports: BIKE, dur: [30, 60],
    desc: 'Pedalata facilissima per sciogliere le gambe e far circolare il sangue. Se ti sembra troppo facile, è fatta bene.',
    build(D, s) {
      if (s === 'mtb') return [sec('Rigenerante', [st('Z1', D, 'Leggerissimo, anche in salita')])];
      const agi = sec('Agilità', [st('Z1', 1, 'Frullino', [100, 110]), st('Z1', 2, 'Normale', [85, 90])], 4);
      const first = Math.max(8, Math.round((D - 12) / 2));
      return [sec('Rigenerante', [st('Z1', first, 'Leggerissimo', [85, 95])]), agi, sec('Chiusura', [st('Z1', Math.max(5, D - first - 12), 'Leggerissimo')])];
    } },
  { id: 'rec_run', name: 'Corsetta rigenerante', level: 1, sports: ['run'], dur: [25, 45], runStage: 2,
    desc: 'Corsa lentissima, respiro sempre facile. Serve a recuperare, non ad allenarsi.',
    build(D) { return [sec('Corsa rigenerante', [st('Z1', D, 'Ritmo da chiacchiera')])]; } },
  { id: 'run_walk', name: 'Cammino e corsa', level: 1, sports: ['run'], dur: [25, 40], runStage: 1, runOnly: 1,
    desc: 'Rientro graduale: alterni tratti di corsa facilissima e cammino. Se il piede si fa sentire, fermati e cammina.',
    build(D) {
      const n = clamp(Math.floor((D - 10) / 4), 3, 8);
      return [sec('Riscaldamento', [st('WALK', 5, 'Cammino svelto')]),
        sec('Cammino e corsa', [st('Z1', 2, 'Corsa facilissima'), st('WALK', 2, 'Cammino')], n),
        sec('Defaticamento', [st('WALK', Math.max(3, D - 5 - n * 4), 'Cammino')])];
    } },

  /* ---------- uscita decisa da te (mai proposta in automatico) ---------- */
  { id: 'friends', name: 'Uscita con gli amici', level: 2, sports: ['mtb', 'road', 'run', 'indoor'], dur: [30, 360], manual: true,
    desc: 'Oggi decidi tu: niente blocchi da rispettare, si va a sensazione e ci si gode la compagnia. SMG legge da Intervals com\'è andata davvero e regola i giorni successivi.',
    build(D) { return [sec('In compagnia', [st('MIX', D, 'A sensazione, goditi la compagnia')])]; } },

  /* ---------- 2 · fondo ---------- */
  { id: 'end_steady', name: 'Fondo regolare', level: 2, sports: [...BIKE, 'run'], dur: [30, 150], runStage: 2,
    desc: 'Il pane quotidiano della resistenza: ritmo costante, respiro controllato, puoi parlare a frasi intere.',
    build(D, s) {
      const wu = warmup(s, 10); const cdM = s === 'run' ? 5 : 8;
      return assemble(D, s, wu, [], cdM, s === 'run' ? 'Corsa di fondo' : 'Fondo');
    } },
  { id: 'end_cad', name: 'Giochi di cadenza', level: 2, sports: BIKE, dur: [45, 120],
    desc: 'Fondo con cambi di cadenza: agilità alta per la fluidità, cadenza bassa per la forza. Il tempo passa più in fretta.',
    build(D, s) {
      const wu = warmup(s, 10); const n = clamp(Math.floor((D - 18) / 10), 2, 6);
      const main = sec('Cadenze', [st('Z2', 5, 'Agile', [90, 95]), st('Z2', 3, 'Forza resistente', [60, 70]), st('Z2', 2, 'Frullino', [100, 110])], n);
      return assemble(D, s, wu, [main], 8);
    } },
  { id: 'end_strides', name: 'Fondo con allunghi', level: 2, sports: [...BIKE, 'run'], dur: [40, 120], runStage: 3,
    desc: 'Fondo tranquillo con qualche allungo brillante: tiene sveglie le gambe senza stancarti.',
    build(D, s) {
      const wu = warmup(s, 10);
      const al = s === 'run' ? sec('Allunghi', [st('Z6', 20 / 60, 'Allungo sciolto'), st('Z1', 100 / 60, 'Recupero')], 6)
                             : sec('Allunghi', [st('Z6', 15 / 60, 'Allungo in piedi', [100, 110]), st('Z2', 2.75, 'Recupero')], 6);
      return assemble(D, s, wu, [al], s === 'run' ? 5 : 8, 'Fondo', true);
    } },
  { id: 'explorer', name: "L'esploratore", level: 2, sports: OUT, dur: [60, 150],
    desc: 'Fondo senza schemi: prendi una strada o un sentiero che non hai mai fatto e goditi il giro. Ritmo da fondo, salite comprese.',
    challengeKey: 'explore',
    build(D, s) { return assemble(D, s, warmup(s, 10), [], 8, 'Esplorazione'); } },
  { id: 'hilly_long', name: 'Lungo collinare', level: 2, sports: OUT, dur: [90, 150], long: true,
    desc: 'Lungo sulle tue colline: in pianura resta in fondo, in salita puoi salire fino al tempo, mai oltre. Mangia e bevi con regolarità.',
    build(D, s) {
      return [warmup(s, 15), sec('Lungo collinare', [st('Z2', D - 25, 'Fondo, salite in Z3 al massimo')]), cooldown(s, 10)];
    } },
  { id: 'free_ride', name: 'Sudo ma godo', level: 2, sports: OUT, dur: [75, 150], long: true,
    desc: "L'uscita che dà il nome all'app: niente numeri da inseguire, pedali a sensazione e ti godi il giro. Accetta la sfida del giorno, se ti va.",
    build(D, s) { return [warmup(s, 10), sec('Libera', [st('MIX', D - 18, 'A sensazione')]), cooldown(s, 8)]; } },
  { id: 'long_run', name: 'Lungo lento', level: 2, sports: ['run'], dur: [55, 90], runStage: 3, long: true,
    desc: 'Corsa lunga e tranquilla, con gli ultimi minuti un filo più decisi se ti senti bene.',
    build(D, s) { return [warmup(s, 10), sec('Lungo', [st('Z2', D - 25, 'Regolare')]), sec('Finale', [st('Z3', 10, 'Un filo più deciso')]), cooldown(s, 5)]; } },

  /* ---------- 3 · medio ---------- */
  { id: 'tempo_blocks', name: 'Tempo a blocchi', level: 3, sports: [...BIKE, 'run'], dur: [50, 120], runStage: 3,
    desc: 'Blocchi a ritmo "tempo": impegnativo ma sostenibile, respiro profondo. Allena la resistenza alla fatica.',
    build(D, s) {
      const L = D >= 90 ? 15 : 10; const R = s === 'run' ? 3 : 4;
      const n = clamp(Math.floor((D - 25) / (L + R)), 2, 4);
      return assemble(D, s, warmup(s, 12), [sec('Blocchi tempo', [st('Z3', L, 'Tempo, regolare'), st('Z2', R, 'Recupero attivo')], n)], s === 'run' ? 6 : 8);
    } },
  { id: 'sweetspot', name: 'Sweet spot', level: 3, sports: ['indoor', 'road'], dur: [50, 120],
    desc: 'La zona più "redditizia": appena sotto la soglia, tanto beneficio con fatica gestibile. Cadenza fluida, busto fermo.',
    build(D, s) {
      const L = D >= 80 ? 15 : 10; const n = clamp(Math.floor((D - 25) / (L + 5)), 2, 4);
      return assemble(D, s, warmup(s, 12, true), [sec('Sweet spot', [st('SS', L, 'Sweet spot', [85, 95]), st('Z1', 5, 'Recupero')], n)], 8);
    } },
  { id: 'tempo_climbs', name: 'Salite in tempo', level: 3, sports: OUT, dur: [60, 150],
    desc: 'Cerca le salite medie della tua zona e falle a ritmo tempo; discese e pianura per recuperare. Usa il tasto Lap a inizio salita.',
    build(D, s) {
      const n = clamp(Math.floor((D - 25) / 14), 3, 7);
      return assemble(D, s, warmup(s, 15), [sec('Salite', [st('Z3', 8, 'Salita in tempo', [70, 85]), st('Z2', 6, 'Discesa e recupero')], n)], 8);
    } },
  { id: 'fartlek', name: 'Fartlek collinare', level: 3, sports: ['mtb', 'road', 'run'], dur: [45, 110], runStage: 3,
    desc: 'Gioco di ritmo sul terreno: acceleri su dossi e strappi, recuperi quando ti va. Divertente e sempre diverso.',
    build(D, s, r) {
      const parts = []; let t = 0; const budget = D - 22;
      while (t < budget - 4) {
        const on = [1, 2, 3, 4][Math.floor(r() * 4)]; const off = on <= 2 ? 2 : 3;
        const z = on === 1 ? 'Z4' : 'Z3';
        parts.push(st(z, on, on === 1 ? 'Strappo deciso' : 'Accelera'), st('Z2', off, 'Recupera'));
        t += on + off;
      }
      return assemble(D, s, warmup(s, 12), [sec('Fartlek', parts)], 8);
    } },
  { id: 'long_finish', name: 'Lungo con finale in tempo', level: 3, sports: [...BIKE], dur: [80, 150], long: true,
    desc: 'Lungo di fondo con un finale deciso: ultimi 20-30 minuti a ritmo tempo, quando la fatica si fa sentire. Allena a chiudere forte.',
    build(D, s) {
      const fin = D >= 120 ? 30 : 20;
      return [warmup(s, 12), sec('Fondo', [st('Z2', D - 12 - fin - 10, 'Fondo regolare')]), sec('Finale', [st('Z3', fin, 'Tempo, chiudi forte')]), cooldown(s, 10)];
    } },

  /* ---------- 4 · duro ---------- */
  { id: 'threshold', name: 'Soglia classica', level: 4, sports: ['indoor', 'road', 'run'], dur: [60, 110], runStage: 3,
    desc: 'Ripetute alla soglia: il cuore dell\'allenamento per andare più forte a lungo. Ritmo costante dal primo all\'ultimo minuto.',
    build(D, s) {
      let L, R, n;
      if (s === 'run') { L = 6; R = 2; n = clamp(Math.floor((D - 25) / 8), 3, 5); }
      else if (D >= 90) { L = 15; R = 6; n = clamp(Math.floor((D - 30) / 21), 2, 3); }
      else { L = 8; R = 4; n = clamp(Math.floor((D - 28) / 12), 3, 4); }
      return assemble(D, s, warmup(s, 15, true), [sec('Soglia', [st('Z4', L, 'Soglia costante', [85, 95]), st('Z1', R, 'Recupero')], n)], 8);
    } },
  { id: 'over_under', name: 'Over-under', level: 4, sports: ['indoor', 'road'], dur: [55, 100],
    desc: 'Alterni poco sotto e poco sopra la soglia senza mai recuperare davvero: insegni al corpo a smaltire l\'acido lattico.',
    build(D, s) {
      const sets = clamp(Math.floor((D - 23) / 14), 2, 4); const main = [];
      for (let i = 1; i <= sets; i++) {
        main.push(sec('Blocco ' + ['uno', 'due', 'tre', 'quattro'][i - 1], [st('Z4', 2, 'Sotto soglia', [85, 95]), st('O4', 1, 'Sopra soglia', [90, 100])], 3));
        if (i < sets) main.push(sec('Recupero', [st('Z1', 5, 'Recupero')]));
      }
      return assemble(D, s, warmup(s, 15, true), main, 8);
    } },
  { id: 'thr_climbs', name: 'Scalate a soglia', level: 4, sports: ['mtb', 'road'], dur: [60, 120],
    desc: 'Scegli una salita di 5-8 minuti e ripetila a soglia, recuperando in discesa. Ritmo regolare: la prima non deve essere la più veloce.',
    build(D, s) {
      const n = clamp(Math.floor((D - 28) / 12), 3, 6);
      return assemble(D, s, warmup(s, 15, true), [sec('Scalate', [st('Z4', 6, 'Salita a soglia', [70, 85]), st('Z1', 6, 'Discesa e recupero')], n)], 8);
    } },
  { id: 'sprints', name: 'Sprint & agilità', level: 4, sports: BIKE, dur: [70, 100],
    desc: 'Sprint brevissimi e a tutta con recuperi lunghi: esplosività e brillantezza. Qualità, non quantità.',
    build(D, s) {
      const main = [
        sec('Frullini', [st('Z2', 0.5, 'Frullino', [110, 120]), st('Z1', 1.5, 'Recupero')], 4),
        sec('Sprint', [st('Z7', 15 / 60, 'Sprint a tutta'), st('Z1', 3.75, 'Recupero completo')], 4),
        sec('Pausa', [st('Z2', 5, 'Fondo')]),
        sec('Sprint lanciati', [st('Z7', 12 / 60, 'Sprint lanciato'), st('Z1', 3.8, 'Recupero completo')], 4)
      ];
      return assemble(D, s, warmup(s, 15, true), main, 8, 'Fondo');
    } },
  { id: 'pyramid', name: 'Piramide', level: 4, sports: ['indoor', 'road', 'run'], dur: [55, 100], runStage: 3,
    desc: 'Sali e scendi la scala: 1-2-3-4-3-2-1 minuti. La testa pensa solo al prossimo gradino.',
    build(D, s) {
      const steps = [];
      [[1, 'Z5'], [2, 'Z4'], [3, 'Z4'], [4, 'Z4'], [3, 'Z4'], [2, 'Z4'], [1, 'Z5']].forEach(([m, z]) => {
        steps.push(st(z, m, z === 'Z5' ? 'Punta' : 'Gradino'), st('Z1', Math.max(1, m / 2), 'Recupero'));
      });
      return assemble(D, s, warmup(s, 15, true), [sec('Piramide', steps)], 8);
    } },

  /* ---------- 5 · molto duro ---------- */
  { id: 'vo2_3', name: 'VO2max 3 minuti', level: 5, sports: ['indoor', 'road', 'run'], dur: [50, 90], runStage: 3,
    desc: 'Ripetute da 3 minuti al massimo sostenibile: alzano il motore aerobico. Dure, ma finiscono presto.',
    build(D, s) {
      const R = s === 'run' ? 2.5 : 3; const n = clamp(Math.floor((D - 28) / (3 + R)), 4, 6);
      return assemble(D, s, warmup(s, 15, true), [sec('VO2max', [st('Z5', 3, 'Forte e costante', [95, 105]), st('Z1', R, 'Recupero')], n)], 8);
    } },
  { id: 'v3030', name: '30/30', level: 5, sports: ['indoor', 'road', 'run'], dur: [45, 90], runStage: 3,
    desc: 'Trenta secondi forte, trenta facili, a raffica. Il cuore resta alto e il tempo vola.',
    build(D, s) {
      const sets = clamp(Math.floor((D - 23) / 13), 2, 3); const main = [];
      for (let i = 1; i <= sets; i++) {
        main.push(sec('Serie ' + ['uno', 'due', 'tre'][i - 1], [st('Z6', 0.5, 'Forte'), st('Z1', 0.5, 'Facile')], 8));
        if (i < sets) main.push(sec('Recupero', [st('Z1', 5, 'Recupero')]));
      }
      return assemble(D, s, warmup(s, 15, true), main, 8);
    } },
  { id: 'v4020', name: '40/20', level: 5, sports: ['indoor'], dur: [45, 80],
    desc: 'Quaranta secondi forte e venti di respiro sui rulli: classico da modalità ERG, cattivo il giusto.',
    build(D, s) {
      const sets = clamp(Math.floor((D - 23) / 15), 2, 3); const main = [];
      for (let i = 1; i <= sets; i++) {
        main.push(sec('Serie ' + ['uno', 'due', 'tre'][i - 1], [st('Z6', 40 / 60, 'Forte', [95, 105]), st('Z1', 20 / 60, 'Respira')], 10));
        if (i < sets) main.push(sec('Recupero', [st('Z1', 5, 'Recupero')]));
      }
      return assemble(D, s, warmup(s, 15, true), main, 8);
    } },
  { id: 'hill_hunt', name: 'Caccia alle salite', level: 5, sports: ['mtb', 'road', 'run'], dur: [55, 120], runStage: 3,
    desc: 'Ogni strappo breve (1-3 minuti) si fa a tutta, poi recuperi in pianura e in discesa finché il fiato torna normale. Usa il tasto Lap.',
    challengeKey: 'hunt',
    build(D, s) {
      const n = clamp(Math.floor((D - 25) / 8), 4, 8);
      return assemble(D, s, warmup(s, 12, true), [sec('Caccia', [st('Z5', 2, 'Strappo a tutta'), st('Z2', 6, 'Recupera')], n)], 8);
    } },
  { id: 'ftp_test', name: 'Test FTP 20 minuti', level: 5, sports: ['indoor', 'road'], dur: [60, 75], test: true,
    desc: 'Il test per aggiornare le zone: 20 minuti al massimo costante, misurati con gli Stages. FTP = 95% della potenza media dei 20 minuti. Parti prudente e chiudi forte.',
    setup: {
      indoor: ['Potenza dagli Stages: sul Fenix è già così; su MyWhoosh, se puoi, mettili come sorgente primaria per il test.',
        'Per i 20 minuti spegni l\'ERG su MyWhoosh: decidi tu lo sforzo con i rapporti.',
        'Sul Fenix premi Lap all\'inizio e alla fine dei 20 minuti: lì leggi potenza e FC media.'],
      road: ['Usa la bici da strada con gli Stages, su una salita lunga e regolare o un rettilineo senza incroci.',
        'Premi Lap all\'inizio e alla fine dei 20 minuti: lì leggi potenza e FC media.']
    },
    build(D, s) {
      const wu = clamp(D - 44, 15, 20);
      return [sec('Riscaldamento', [st('Z1', Math.ceil(wu / 2), 'Agile e leggero', [85, 95]), st('Z2', Math.floor(wu / 2), 'Progressivo')]),
        sec('Allunghi', [st('Z4', 1, 'Buon ritmo'), st('Z1', 2, 'Recupero')], 3),
        sec('Recupero', [st('Z1', 5, 'Pronto?')]),
        sec('Test', [Object.assign(st('TEST', 20, 'Massimo costante ERG spento'), { free: true })]),
        cooldown(s, Math.max(10, D - wu - 34))];
    } }
];

const TEMPLATES = Object.fromEntries(T.map(t => [t.id, t]));

/* ---------- Forza & mobilità (extra, restano nell'app) ---------- */
const EXTRAS = [
  { id: 'mob_bike', name: 'Mobilità per ciclisti', min: 15, kind: 'Mobilità', items: [
    ['Gatto-mucca', '10 ripetizioni lente'], ['Affondo con allungo flessori dell\'anca', '45" per lato'],
    ['Rotazioni del busto da quadrupedia', '8 per lato'], ['Piriforme da supino (figura 4)', '45" per lato'],
    ['Allungamento femorali con elastico o asciugamano', '45" per lato'], ['Apertura del petto al muro', '30" per lato'],
    ['Respirazione diaframmatica', '1 minuto'] ] },
  { id: 'core', name: 'Core & stabilità', min: 15, kind: 'Forza', items: [
    ['Plank frontale', '3 × 40"'], ['Plank laterale', '2 × 30" per lato'], ['Bird dog', '3 × 8 per lato'],
    ['Dead bug', '3 × 10'], ['Ponte glutei', '3 × 12'], ['Superman', '2 × 10'] ] },
  { id: 'legs', name: 'Forza gambe a corpo libero', min: 20, kind: 'Forza', items: [
    ['Squat', '3 × 12'], ['Affondi indietro', '3 × 8 per gamba'], ['Ponte glutei a una gamba', '3 × 8 per lato'],
    ['Step-up su gradino o sedia', '3 × 10 per gamba'], ['Mostri laterali con elastico', '2 × 12 passi per lato'], ['Wall sit', '2 × 40"'] ] },
  { id: 'total', name: 'Forza total body', min: 25, kind: 'Forza', items: [
    ['Squat', '3 × 12'], ['Piegamenti (anche sulle ginocchia)', '3 × 8-12'], ['Rematore con elastico o zaino', '3 × 12'],
    ['Affondi indietro', '3 × 8 per gamba'], ['Plank frontale', '3 × 40"'], ['Ponte glutei', '3 × 12'] ] },
  { id: 'mob_hips', name: 'Anche e schiena libere', min: 12, kind: 'Mobilità', items: [
    ['Posizione 90/90', '1\' per lato'], ['Bambino con braccia avanti', '1 minuto'], ['Cobra dolce', '8 ripetizioni'],
    ['Rotazioni toraciche a terra (libro aperto)', '8 per lato'], ['Squat profondo assistito', '1 minuto'], ['Allungamento quadricipite in piedi', '30" per lato'] ] }
];

/* ---------- Sfide del giorno ---------- */
const CHALLENGES = {
  any: [
    'Borraccia finita entro la prima ora: idratazione da pro.',
    'Mantieni la cadenza media sopra 85 rpm.',
    'Negative split: seconda metà un filo più veloce della prima.',
    'Zero secondi sopra la zona prevista: disciplina da campione.',
    'Respira solo dal naso nei tratti di fondo per 10 minuti.',
    'Scegli una canzone e tieni il ritmo del ritornello per tutto il brano.'
  ],
  out: [
    'Foto panoramica dal punto più alto del giro.',
    'Inserisci almeno un tratto che non hai mai percorso.',
    'Fai la salita più ripida che conosci tutta seduto, senza fretta.',
    'Saluta ogni ciclista che incroci: la gentilezza non consuma watt.',
    'Chiudi il giro con una salita in più rispetto al solito, se le gambe dicono sì.'
  ],
  explore: [
    'Percorri un sentiero o una strada che non hai mai fatto.',
    'Arriva in un paese dove non sei mai passato in bici.',
    'Chiudi un giro ad anello senza ripassare mai sulla stessa strada.'
  ],
  hunt: [
    'Conta gli strappi fatti a tutta: prova a farne uno in più della volta scorsa.',
    'Scegli un segmento Strava in salita e prova a migliorarti.'
  ],
  indoor: [
    'Nessuna pausa, nemmeno per il telefono: tu contro i watt.',
    'Ventilatore al massimo e asciugamano pronto: si suda, si gode.',
    'Durante i recuperi pedala sopra 95 rpm.'
  ],
  run: [
    'Cadenza di corsa sopra 170 passi al minuto nei tratti facili.',
    'Piede leggero: corri senza fare rumore.'
  ]
};

/* ------------------------------------------------------------------ */
/* Profilo predefinito                                                 */
/* ------------------------------------------------------------------ */
function defaultProfile(today) {
  return {
    ftp: 225, weight: 67, lthr: 164, thrPace: 248, age: 46,
    sports: { indoor: true, mtb: true, road: true, run: false, strength: true },
    runStage: 1,                       // 1 cammino/corsa · 2 corsa facile · 3 completo
    days: { 1: { on: true, max: 75 }, 2: { on: false, max: 60 }, 3: { on: true, max: 75 }, 4: { on: false, max: 60 },
            5: { on: true, max: 150, long: true }, 6: { on: true, max: 150, long: true }, 0: { on: true, max: 150, long: true } },
    lastTest: today,                   // ultimo test FTP (prossimo dopo ~7 settimane)
    indoorMax: 70,
    start: today
  };
}

/* ------------------------------------------------------------------ */
/* Prontezza                                                           */
/* ------------------------------------------------------------------ */
function baseline(checkins, date, key, days) {
  const vals = [];
  for (let i = 1; i <= (days || 28); i++) {
    const c = checkins[addDays(date, -i)];
    if (c && c[key] != null && c[key] !== '' && !isNaN(+c[key])) vals.push(+c[key]);
    if (vals.length >= 14) break;
  }
  if (vals.length < 3) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// HRV: media degli ultimi 7 giorni confrontata con la norma personale (media e variabilità di 60 giorni)
function hrvStatus(checkins, date) {
  const val = d => { const c = checkins[d]; return c && c.hrv != null && c.hrv !== '' && !isNaN(+c.hrv) ? +c.hrv : null; };
  const week = []; for (let i = 0; i < 7; i++) { const v = val(addDays(date, -i)); if (v != null) week.push(v); }
  const base = []; for (let i = 1; i <= 60; i++) { const v = val(addDays(date, -i)); if (v != null) base.push(v); }
  if (week.length < 3 || base.length < 14) return null;
  const mean = base.reduce((a, b) => a + b, 0) / base.length;
  const sd = Math.sqrt(base.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (base.length - 1));
  const half = Math.max(0.75 * sd, mean * 0.04);
  const w7 = week.reduce((a, b) => a + b, 0) / week.length;
  const today = val(date);
  return { week: w7, mean, lo: mean - half, hi: mean + half, status: w7 < mean - half ? 'low' : w7 > mean + half ? 'high' : 'ok',
           dip: today != null && today < mean - 2 * sd, days: base.length };
}

function readiness(checkins, date) {
  const c = checkins[date];
  if (!c || !c.feel) return null;
  let s = 70; const why = [], parts = [];
  const add = (lab, val, pts) => { s += pts; parts.push({ lab, val, pts }); };
  const r1 = v => Math.round(v * 10) / 10;
  const f = +c.feel;
  add('Sensazione', ['A pezzi', 'Stanco', 'Normale', 'Bene', 'Al top'][f - 1], (f - 3) * 10);
  if (f <= 2) why.push('ti senti stanco'); else if (f >= 4) why.push('ti senti bene');

  const hs = c.hrv ? hrvStatus(checkins, date) : null;
  if (hs) {
    let pts = 0;
    if (hs.status === 'low') { pts -= 10; why.push('HRV della settimana sotto la tua norma'); }
    else if (hs.status === 'high') pts += 2;
    if (hs.dip) { pts -= 6; why.push('HRV di stanotte molto bassa'); }
    add('HRV', c.hrv + ' ms, media 7 gg ' + Math.round(hs.week) + ' (norma ' + Math.round(hs.lo) + '–' + Math.round(hs.hi) + ')', pts);
  } else if (c.hrv) {
    const b = baseline(checkins, date, 'hrv'); let pts = 0;
    if (b) {
      const r = c.hrv / b;
      if (r < 0.85) { pts = -15; why.push('HRV molto sotto la tua media'); }
      else if (r < 0.93) { pts = -7; why.push('HRV un po\' sotto la media'); }
      else if (r > 1.05) { pts = 4; why.push('HRV sopra la media'); }
    }
    add('HRV', c.hrv + ' ms' + (b ? ' (media ' + Math.round(b) + ')' : ' (media in arrivo)'), pts);
  }
  if (c.rhr) {
    const b = baseline(checkins, date, 'rhr'); let pts = 0;
    if (b) {
      const d = c.rhr - b;
      if (d >= 5) { pts = -12; why.push('FC a riposo alta'); }
      else if (d >= 3) { pts = -6; why.push('FC a riposo un po\' alta'); }
      else if (d <= -2) pts = 3;
    }
    add('FC a riposo', c.rhr + ' bpm' + (b ? ' (media ' + r1(b) + ')' : ' (media in arrivo)'), pts);
  }
  if (c.sleep) {
    const v = +c.sleep; let pts = 0;
    if (v < 50) { pts = -12; why.push('sonno scarso'); }
    else if (v < 65) { pts = -6; why.push('sonno così così'); }
    else if (v >= 80) { pts = 5; why.push('dormito bene'); }
    add('Sonno', v + '/100', pts);
  } else if (c.sleepH) {
    const h = +c.sleepH; let pts = 0;
    if (h < 6) { pts = -10; why.push('poche ore di sonno'); } else if (h < 7) pts = -4; else if (h >= 8) pts = 4;
    add('Sonno', String(r1(h)).replace('.', ',') + ' ore', pts);
  }
  if (c.tsb != null && c.tsb !== '') {
    const t = +c.tsb; let pts = 0;
    if (t < -25) { pts = -10; why.push('molta fatica accumulata'); } else if (t < -15) { pts = -5; why.push('un po\' di fatica accumulata'); } else if (t > 5) pts = 3;
    add('Forma', (t > 0 ? '+' : '') + t, pts);
  }
  if (c.pain) { add('Dolori', 'sì', -15); why.push('qualche dolore'); }
  if (c.ill === 'neck') { add('Malanno', 'raffreddore o gola', -10); why.push('raffreddore o mal di gola'); }
  if (c.ill === 'body') { add('Malanno', 'febbre o dolori diffusi', -35); why.push('febbre o malessere'); }
  s = clamp(Math.round(s), 5, 100);
  const own = s;
  if (c.garmin) {                                   // Prontezza Garmin, se inserita: media 50/50
    s = Math.round((s + clamp(+c.garmin, 0, 100)) / 2);
  }
  const light = s >= 70 ? 'green' : s >= 50 ? 'yellow' : 'red';
  return { score: s, light, why, parts, own, garmin: c.garmin ? +c.garmin : null };
}

/* ------------------------------------------------------------------ */
/* Contesto della settimana                                            */
/* ------------------------------------------------------------------ */
// Un giorno passato conta solo se c'è un'attività registrata (da Intervals) o se la seduta è stata segnata come fatta.
// assume: data la cui seduta pianificata si considera fatta (per l'anteprima di domani).
function dayInfo(state, d, assume) {
  const p = state.plans[d]; const pv = p && !p.rest && p.tid ? p : null;
  const acts = ((state.activities || {})[d] || []).filter(a => a.sport !== 'strength' && (a.min == null || a.min >= 15));
  if (acts.length) {
    const main = acts.slice().sort((a, b) => (b.level || 2) - (a.level || 2))[0];
    const sp = main.sport === 'other' ? 'road' : main.sport;
    const rated = acts.filter(a => a.rpe || a.feel);
    return { level: Math.max(...acts.map(a => a.level || 2)), sport: sp, tid: pv && pv.status !== 'skipped' ? pv.tid : null, done: true,
             rpe: rated.length ? rated[0].rpe || null : null, feel: rated.length ? rated[0].feel || null : null };
  }
  if (pv && (pv.status === 'done' || d === assume)) return { level: pv.level, sport: pv.sport, tid: pv.tid, done: true, rpe: pv.rpe || null, feel: null };
  return null;
}

// fatica percepita: RPE (1-10) e sensazione (1 forte … 5 debole) delle ultime sedute, rispetto al previsto
const RPE_EXP = { 1: 2.5, 2: 4, 3: 5.5, 4: 7, 5: 8 };
function feedback(state, date, assume) {
  const deltas = [], feels = [];
  for (let k = 1; k <= 14 && (deltas.length < 4 || feels.length < 4); k++) {
    const i = dayInfo(state, addDays(date, -k), assume); if (!i) continue;
    if (i.rpe && deltas.length < 4) deltas.push(+i.rpe - RPE_EXP[i.level || 2]);
    if (i.feel && feels.length < 4) feels.push(+i.feel);
  }
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const d = deltas.length >= 2 ? avg(deltas) : null, f = feels.length >= 2 ? avg(feels) : null;
  return { tired: (d != null && d >= 1.5) || (f != null && f >= 3.8), easy: (d != null && d <= -1.5) || (f != null && f <= 1.8), rpeDelta: d, feel: f };
}

function context(state, date, assume) {
  const mon = monday(date); const ctx = { weekHard: 0, blockHard: 0, runsWeek: 0, recent: [], yesterday: null, lastUse: {} };
  for (let d = mon; d < date; d = addDays(d, 1)) {
    const i = dayInfo(state, d, assume); if (!i) continue;
    if (i.level >= 4) ctx.weekHard++;
    if (i.sport === 'run') ctx.runsWeek++;
    if (dow(d) === 5 || dow(d) === 6) if (i.level >= 4) ctx.blockHard++;
  }
  for (let k = 1; k <= 21; k++) {
    const d = addDays(date, -k); const i = dayInfo(state, d, assume);
    if (k === 1) ctx.yesterday = i;
    if (k <= 3 && i) ctx.recent.push(i.sport);
    if (i && i.tid && ctx.lastUse[i.tid] == null) ctx.lastUse[i.tid] = k;
  }
  ctx.twoAgo = dayInfo(state, addDays(date, -2), assume);
  ctx.fb = feedback(state, date, assume);
  return ctx;
}

// settimana del blocco: 0, 1, 2 costruzione · 3 scarico
// Blocchi di 4 settimane ancorati alla data di uno scarico (deloadAnchor, lunedì).
// Prima dell'ancora: settimane di costruzione che portano allo scarico; dall'ancora in poi il ciclo si ripete.
function deloadAnchor(profile) { return profile.deloadAnchor || addDays(monday(profile.start || ymd(new Date())), 21); }
function blockWeek(profile, date) {
  const w = Math.round(diffDays(deloadAnchor(profile), monday(date)) / 7);
  if (w >= 0) { const i = w % 4; return i === 0 ? 3 : i - 1; }
  return Math.max(0, 3 + w);
}
// la quarta settimana del blocco è di scarico
function isDeload(profile, date) { return blockWeek(profile, date) === 3; }
function nextDeload(profile, date) {
  let m = monday(date);
  for (let i = 0; i < 5; i++) { if (blockWeek(profile, m) === 3) return m; m = addDays(m, 7); }
  return null;
}

// settimana (lunedì) in cui SMG proporrà il prossimo test FTP
function nextTest(profile, date) {
  if (profile.testSoon) return monday(date);
  let m = monday(date);
  for (let i = 0; i < 30; i++, m = addDays(m, 7)) {
    const since = diffDays(profile.lastTest || date, addDays(m, 5));
    if (blockWeek(profile, m) !== 3 && ((since >= 42 && blockWeek(profile, m) === 0) || since >= 63)) return m;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Scelta della seduta                                                 */
/* ------------------------------------------------------------------ */
function sportAllowed(profile, s) { return !!profile.sports[s]; }
// impostazione del giorno: settimana tipo, oppure eccezione per quella data (state.special)
function dayCfg(state, date) {
  const base = state.profile.days[dow(date)] || { on: false, max: 60 };
  const sp = state.special && state.special[date];
  if (!sp) return base;
  if (sp.type === 'off') return { on: false, max: 0, long: false, special: 'off' };
  return { on: true, max: sp.max || base.max || 60, long: !!sp.long, special: 'on' };
}
function templateOk(t, sport, profile, dayLong) {
  if (t.manual) return false;
  if (!t.sports.includes(sport)) return false;
  if (sport === 'indoor' && t.dur[0] > (profile.indoorMax || 70)) return false;
  if (t.long && !dayLong) return false;
  if (sport === 'run') {
    const stg = profile.runStage || 1;
    if (t.runOnly && stg !== t.runOnly) return false;
    if (t.runStage && stg < t.runStage) return false;
    if (!t.runStage && !t.runOnly) return false;
    if (stg === 1 && !t.runOnly) return false;
  }
  return true;
}

function durRange(t, sport, dayLong, dayMax, light, level, profile) {
  let lo, hi;
  if (sport === 'run') {
    const stg = profile.runStage || 1;
    if (stg === 1) { lo = 25; hi = 35; } else if (stg === 2) { lo = 30; hi = 45; }
    else if (dayLong && level <= 2) { lo = 55; hi = 80; } else { lo = 35; hi = 55; }
  } else if (!dayLong) {
    if (light === 'red') { lo = 30; hi = 40; } else if (light === 'yellow') { lo = 40; hi = dayMax - 15; } else { lo = Math.max(45, dayMax - 20); hi = dayMax; }
  } else {
    if (light === 'red') { lo = 35; hi = 50; }
    else if (level <= 2) { lo = dayMax - 30; hi = dayMax; }
    else if (level === 3) { lo = 90; hi = dayMax - 10; }
    else { lo = 75; hi = 105; }
  }
  if (sport === 'indoor') hi = Math.min(hi, profile.indoorMax || 70);
  hi = Math.min(hi, t.dur[1], dayMax); lo = Math.max(lo, t.dur[0]);
  if (lo > hi) lo = hi;
  return [lo, hi];
}

function weatherBad(w) {
  if (!w) return 0;
  let bad = 0;
  if (w.rain >= 60 || w.mm >= 3) bad = 2; else if (w.rain >= 40) bad = 1;
  if (w.tmax != null && w.tmax < 4) bad = Math.max(bad, 1);
  return bad;
}

/**
 * Propone la seduta per una data.
 * opts: { reroll, forceSport, forceDur, exclude:[tid], extra, weather }
 */
function propose(state, date, opts) {
  opts = opts || {};
  const P = state.profile; const w = dow(date);
  const cfg = dayCfg(state, date);
  if (!cfg.on && !opts.extra) return { date, rest: true, special: cfg.special, reasons: [cfg.special === 'off' ? 'Oggi hai segnato un impegno: niente allenamento' : 'Oggi è giorno di riposo'] };
  const ci = state.checkins[date] || {};
  if (ci.ill === 'body' && !opts.forceSport && !opts.extra) return { date, rest: true, illRest: true, reasons: ['Febbre o malessere diffuso: oggi solo riposo'] };

  const dayLong = !!cfg.long && !opts.extra;
  const dayMax = opts.extra ? Math.min(60, cfg.max || 60) : cfg.max;
  const rd = readiness(state.checkins, date);
  const light = rd ? rd.light : 'green';
  const r = rng(hash(date + '|' + (opts.reroll || 0) + '|' + (opts.forceSport || '') + '|' + (opts.forceDur || '')));
  const ctx = context(state, date, opts.assumeDone);
  const deload = isDeload(P, date);
  const fb = ctx.fb;
  const reasons = [];

  if (rd) reasons.push(light === 'green' ? 'Semaforo verde: via libera' : light === 'yellow' ? 'Semaforo arancione: oggi si va di qualità leggera' : 'Semaforo rosso: oggi solo recupero');
  else reasons.push('Proposta provvisoria: fai il check-in per confermarla');

  if (light === 'red' && rd && rd.score < 35 && !opts.forceSport && !opts.extra) {
    return { date, rest: true, redRest: true, reasons: ['Semaforo rosso: oggi il miglior allenamento è riposare'], light, score: rd.score };
  }

  /* --- intensità massima --- */
  let maxL = light === 'green' ? 5 : light === 'yellow' ? (rd && rd.score >= 60 ? 3 : 2) : 1;
  if (deload) { maxL = Math.min(maxL, 3); reasons.push('Settimana di scarico: si recupera per crescere'); }
  if (ctx.yesterday && ctx.yesterday.level >= 4) { maxL = Math.min(maxL, 2); reasons.push('Ieri seduta dura: oggi si scarica'); }
  else if (ctx.yesterday && ctx.yesterday.level === 3 && ctx.twoAgo && ctx.twoAgo.level >= 3) maxL = Math.min(maxL, 2);
  if (ctx.weekHard >= 2) { maxL = Math.min(maxL, 3); if (maxL === 3) reasons.push('Già due sedute dure questa settimana'); }
  if ((w === 6 || w === 0) && ctx.blockHard >= 1) maxL = Math.min(maxL, 3);
  // malanno: oggi o nei giorni scorsi
  let illCap = 5, illNote = null;
  if (ci.ill === 'neck') { illCap = 2; illNote = 'Raffreddore o gola: solo una seduta facile'; }
  else for (let k = 1; k <= 3; k++) {
    const pc = state.checkins[addDays(date, -k)];
    if (pc && pc.ill === 'body') { illCap = k <= 2 ? 2 : 3; illNote = 'Rientro dopo il malanno (giorno ' + k + '): con calma'; break; }
    if (pc && pc.ill === 'neck') { if (k === 1) { illCap = 3; illNote = 'Ieri raffreddato: niente sedute dure'; } break; }
  }
  if (illCap < maxL) { maxL = illCap; reasons.push(illNote); }
  if (fb.tired && maxL > 3) { maxL = 3; reasons.push('Le ultime sedute ti sono sembrate più dure del previsto: oggi niente fuorigiri'); }
  if (opts.extra) maxL = Math.min(maxL, 2);

  /* --- intensità desiderata secondo il giorno --- */
  let dist;
  const hardLeft = 2 - ctx.weekHard;
  if (opts.extra) dist = [[1, 0.5], [2, 0.5]];
  else if (w === 1) dist = [[2, 0.3], [3, 0.25], [4, 0.3], [5, 0.15]];
  else if (w === 3) dist = ctx.weekHard === 0 ? [[3, 0.15], [4, 0.45], [5, 0.4]] : [[2, 0.5], [3, 0.35], [4, 0.15]];
  else if (w === 5) dist = [[1, 0.1], [2, 0.7], [3, 0.2]];
  else if (w === 6) dist = (hardLeft > 0 && ctx.blockHard === 0) ? [[2, 0.1], [3, 0.3], [4, 0.35], [5, 0.25]] : [[2, 0.65], [3, 0.35]];
  else if (w === 0) dist = (hardLeft > 0 && ctx.blockHard === 0) ? [[2, 0.55], [3, 0.25], [4, 0.2]] : [[2, 0.7], [3, 0.3]];
  else dist = dayLong ? [[2, 0.6], [3, 0.4]] : [[2, 0.5], [3, 0.3], [4, 0.2]];
  let level = Math.min(pickWeighted(r, dist), maxL);

  /* --- test FTP --- */
  // proposto nella prima settimana dopo lo scarico, se sono passate almeno 6 settimane (oltre 9 settimane anche dopo);
  // "prima possibile" (P.testSoon) toglie l'attesa. Solo con semaforo verde, nei giorni da qualità (lun, mer, sab).
  const sinceTest = P.lastTest ? diffDays(P.lastTest, date) : 999;
  const testWindow = P.testSoon || (sinceTest >= 42 && blockWeek(P, date) === 0) || sinceTest >= 63;
  const testDue = testWindow && light === 'green' && rd && !deload && maxL >= 5 && !opts.extra && [1, 3, 6].includes(w)
    && (!opts.forceSport || ['indoor', 'road'].includes(opts.forceSport)) && !(opts.exclude || []).includes('ftp_test')
    && !(opts.forceDur && opts.forceDur < 60) && (sportAllowed(P, 'indoor') || sportAllowed(P, 'road'));
  if (testDue) level = 5;

  /* --- meteo --- */
  const wx = opts.weather; const bad = weatherBad(wx);

  /* --- sport --- */
  const m = month(date); const winter = m >= 10 || m <= 3;
  const cand = ['indoor', 'mtb', 'road', 'run'].filter(s => sportAllowed(P, s));
  const sportWeight = s => {
    let x = { indoor: 0.8, mtb: 1.0, road: 0.75, run: 0.9 }[s];
    if (winter) {
      // autunno/inverno: qualità sui rulli (a potenza, in ERG), volume fuori
      if (s === 'mtb') x *= 1.4; if (s === 'road') x *= 0.55;
      if (level >= 4) { if (s === 'indoor') x *= 4; if (s === 'mtb') x *= 0.05; if (s === 'road') x *= 0.3; }
      else if (level <= 2 && dayLong && s === 'indoor') x *= 0.1;
      else if (level === 3 && dayLong && s === 'indoor') x *= 0.5;
      else if (s === 'indoor' && !dayLong) x *= 1.3;
    } else {
      if (s === 'road') x *= 1.3;
      if (level >= 4) { if (s === 'indoor') x *= 1.5; if (s === 'road') x *= 1.2; if (s === 'mtb') x *= 0.8; }
      if (dayLong && s === 'indoor') x *= 0.45;
    }
    if (s !== 'indoor' && s !== 'run') { if (bad === 2) x *= 0.03; else if (bad === 1) x *= 0.45; }
    if (s === 'indoor' && opts.forceDur && opts.forceDur > (P.indoorMax || 70)) x *= 0.1;   // più tempo del massimo sui rulli: meglio fuori
    if (s === 'run' && bad === 2) x *= 0.5;
    if (wx && wx.wind >= 40 && s === 'road') x *= 0.5;
    if (ctx.recent[0] === s) x *= 0.55;
    if (ctx.recent[0] === s && ctx.recent[1] === s) x *= 0.5;
    if (s === 'run') {
      const stg = P.runStage || 1;
      if (ctx.yesterday && ctx.yesterday.sport === 'run') x = 0;
      if (ctx.runsWeek >= (stg < 3 ? 2 : 3)) x = 0;
      if (stg < 3) x *= 0.8;
    }
    return x;
  };

  let sport = opts.forceSport && sportAllowed(P, opts.forceSport) ? opts.forceSport : null;

  // prova a trovare la combinazione sport + seduta, scendendo di livello se serve
  let tpl = null;
  // seduta scelta esplicitamente (es. la stessa seduta portata sui rulli)
  if (opts.forceTid && TEMPLATES[opts.forceTid] && sport && TEMPLATES[opts.forceTid].sports.includes(sport)) {
    tpl = TEMPLATES[opts.forceTid]; level = tpl.level;
  }
  for (let lv = level; lv >= 1 && !tpl; lv--) {
    const sportsTry = sport ? [sport] : cand.filter(s => (!testDue || lv !== 5 || ['indoor', 'road'].includes(s)) && T.some(t => t.level === lv && templateOk(t, s, P, dayLong)));
    if (!sportsTry.length) continue;
    const sp = sport || pickWeighted(r, sportsTry.map(s => [s, sportWeight(s) + 1e-6]));
    let pool = T.filter(t => t.level === lv && templateOk(t, sp, P, dayLong) && !(opts.exclude || []).includes(t.id));
    if (!pool.length) pool = T.filter(t => t.level === lv && templateOk(t, sp, P, dayLong));
    if (!pool.length) continue;
    if (opts.forceDur) { const fit = pool.filter(t => t.dur[0] <= opts.forceDur); if (fit.length) pool = fit; else if (lv > 1) continue; }
    if (testDue && lv === 5 && pool.some(t => t.test)) pool = pool.filter(t => t.test);
    else pool = pool.filter(t => !t.test).length ? pool.filter(t => !t.test) : pool;
    const weights = pool.map(t => {
      let x = 1; const last = ctx.lastUse[t.id];
      if (last != null) x *= last <= 3 ? 0.05 : last <= 7 ? 0.25 : last <= 14 ? 0.6 : 1;
      if (t.test) x *= 20;
      if (t.long && dayLong) x *= 1.3;
      return [t, x];
    });
    tpl = pickWeighted(r, weights); sport = sp; level = lv;
  }
  if (!tpl) return { date, rest: true, reasons: ['Nessuna seduta adatta con gli sport attivi'] };

  /* --- durata --- */
  let [lo, hi] = tpl.test ? [tpl.dur[0], Math.min(tpl.dur[1], dayMax)] : durRange(tpl, sport, dayLong, dayMax, light, level, P);
  // progressione: nelle 3 settimane di costruzione la durata (e quindi il numero di ripetute) sale di un gradino
  const bw = blockWeek(P, date);
  let step = deload ? 0 : bw + (fb.easy ? 1 : 0) - (fb.tired ? 1 : 0);
  step = clamp(step, 0, 3);
  const pos = between(r, step * 0.2, Math.min(1, 0.55 + step * 0.15));
  let dur = round5(lo + (hi - lo) * pos);
  if (!deload && bw > 0 && !tpl.test) reasons.push('Settimana ' + (bw + 1) + ' di 3 del blocco: un gradino in più');
  if (fb.easy && !deload) reasons.push('Le ultime sedute ti sono sembrate facili: alziamo un po\' l\'asticella');
  if (fb.tired) dur = round5(Math.max(tpl.dur[0], dur * 0.9));
  if (ci.ill === 'neck') dur = round5(Math.max(tpl.dur[0], dur * 0.8));
  if (deload) dur = round5(Math.max(tpl.dur[0], dur * 0.75));
  if (opts.forceTid && tpl.id === opts.forceTid) reasons.push('Versione rulli della seduta di oggi');
  if (opts.forceDur) dur = clamp(round5(opts.forceDur), tpl.dur[0], Math.max(tpl.dur[0], sport === 'indoor' ? Math.min(Math.max(opts.forceDur, 30), P.indoorMax || 70) : opts.forceDur));

  /* --- motivi e sfida --- */
  if (bad === 2 && sport === 'indoor') reasons.push('Pioggia prevista: meglio i rulli');
  else if (bad === 1 && sport === 'indoor') reasons.push('Meteo incerto: rulli al riparo');
  if (tpl.test) reasons.push(P.testSoon ? 'Test FTP chiesto da te: oggi sei fresco, aggiorniamo le zone' : blockWeek(P, date) === 0 ? 'Prima settimana dopo lo scarico: sei fresco, aggiorniamo le zone' : 'Sono passate più di 9 settimane dall\'ultimo test: aggiorniamo le zone');
  if (level >= 4 && ctx.weekHard === 0) reasons.push('Prima seduta intensa della settimana');
  if (dayLong && level === 2) reasons.push('Giorno lungo: accumula ore di fondo');
  if (winter && sport === 'mtb') reasons.push('Autunno/inverno: fuoristrada, come piace a te');
  if (winter && sport === 'indoor' && level >= 4) reasons.push('Autunno/inverno: la qualità si fa sui rulli, a potenza');

  const cPool = [].concat(
    tpl.challengeKey ? CHALLENGES[tpl.challengeKey] : [],
    sport === 'indoor' ? CHALLENGES.indoor : sport === 'run' ? CHALLENGES.run : CHALLENGES.out,
    level <= 3 ? CHALLENGES.any : []);
  const challenge = !tpl.test && cPool.length && r() < 0.8 ? cPool[Math.floor(r() * cPool.length)] : null;

  // extra forza/mobilità nei giorni facili
  let extra = null;
  if (P.sports.strength && level <= 2 && !dayLong) extra = EXTRAS[Math.floor(r() * EXTRAS.length)].id;

  return { date, tid: tpl.id, sport, level, dur, light, score: rd ? rd.score : null, reasons, challenge, extra, rest: false, dayLong, deload, step };
}

/* ------------------------------------------------------------------ */
/* Versione rulli di una seduta all'aperto                             */
/* ------------------------------------------------------------------ */
const INDOOR_EQ = { explorer: 'end_steady', hilly_long: 'end_steady', free_ride: 'end_cad', tempo_climbs: 'tempo_blocks',
  fartlek: 'tempo_blocks', thr_climbs: 'threshold', hill_hunt: 'vo2_3' };
function indoorVersion(plan, profile) {
  const t = TEMPLATES[plan.tid];
  const tid = t.sports.includes('indoor') ? t.id : INDOOR_EQ[t.id] || null;
  if (!tid) return null;
  const tpl = TEMPLATES[tid];
  const cap = (profile && profile.indoorMax) || 70;
  return { tid, same: tid === t.id, name: tpl.name, dur: Math.max(tpl.dur[0], Math.min(plan.dur, cap)) };
}

/* ------------------------------------------------------------------ */
/* Costruzione e numeri della seduta                                   */
/* ------------------------------------------------------------------ */
function build(plan, profile) {
  const t = TEMPLATES[plan.tid];
  const r = rng(hash(plan.date + '|' + plan.tid + '|' + plan.dur));
  const sections = t.build(plan.dur, plan.sport, r).filter(s => s.steps.length && secLen(s) > 0);
  // se la seduta supera la durata (arrotondamenti), accorcia il defaticamento
  return sections;
}

function targetText(z, sport, P) {
  const Z = ZONES[z];
  const tgt = SPORTS[sport].target;
  if (z === 'MIX') return 'A sensazione';
  if (tgt === 'power') {
    if (z === 'Z7') return 'A tutta';
    return Math.round(P.ftp * Z.p[0] / 100) + '–' + Math.round(P.ftp * Z.p[1] / 100) + ' W';
  }
  if (tgt === 'hr') {
    if (z === 'Z6' || z === 'Z7') return 'RPE ' + Z.rpe;
    return Math.round(P.lthr * Z.hr[0] / 100) + '–' + Math.round(P.lthr * Z.hr[1] / 100) + ' bpm';
  }
  if (tgt === 'pace') {
    if (z === 'WALK') return 'Cammino';
    if (z === 'Z1' || z === 'Z2') return '< ' + Math.round(P.lthr * Z.hr[1] / 100) + ' bpm';
    const f = p => { const s = Math.round(P.thrPace / (p / 100)); return Math.floor(s / 60) + ':' + pad(s % 60); };
    return f(Z.pace[0]) + '–' + f(Z.pace[1]) + ' /km';
  }
  return '';
}

function stats(sections, sport, P) {
  let sec = 0, tss = 0;
  sections.forEach(s => s.steps.forEach(x => {
    const Z = ZONES[x.z]; const t = x.d * s.rep; sec += t;
    const IF = Math.min(1.3, ((Z.p[0] + Z.p[1]) / 2) / 100) * (x.z === 'Z7' ? 0.8 : 1);
    tss += (t / 3600) * IF * IF * 100;
  }));
  return { min: Math.round(sec / 60), tss: Math.round(tss) };
}

// profilo per il grafico: [{d (s), lvl, z}]
function profileBars(sections) {
  const out = [];
  sections.forEach(s => { for (let i = 0; i < s.rep; i++) s.steps.forEach(x => out.push({ d: x.d, lvl: ZONES[x.z].lvl, z: x.z })); });
  return out;
}

/* ------------------------------------------------------------------ */
/* Formato Intervals.icu                                               */
/* ------------------------------------------------------------------ */
function icuDur(s) {
  s = Math.round(s);
  if (s < 60 || s % 60) return s + 's';          // es. 210s: formato sempre accettato
  const m = s / 60;
  return m >= 60 && m % 60 === 0 ? (m / 60) + 'h' : m + 'm';
}
function icuTarget(z, sport) {
  const Z = ZONES[z]; const tgt = SPORTS[sport].target;
  if (tgt === 'power') return Z.p[0] + '-' + Z.p[1] + '%';
  if (tgt === 'hr') return Z.hr[0] + '-' + Z.hr[1] + '% LTHR';
  if (z === 'WALK' || z === 'Z1' || z === 'Z2') return Z.hr[0] + '-' + Z.hr[1] + '% LTHR';
  return Z.pace[0] + '-' + Z.pace[1] + '% Pace';
}
function cleanTxt(t) { return (t || '').replace(/[0-9%\-]/g, '').replace(/\s+/g, ' ').trim(); }

function toIcu(plan, sections) {
  const lines = [];
  sections.forEach(s => {
    lines.push(s.rep > 1 ? cleanTxt(s.title) + ' ' + s.rep + 'x' : cleanTxt(s.title));
    s.steps.forEach(x => {
      let l = '- ' + (x.txt ? cleanTxt(x.txt) + ' ' : '') + icuDur(x.d) + ' ' + (x.free && plan.sport === 'indoor' ? 'freeride' : icuTarget(x.z, plan.sport));
      if (x.cad && SPORTS[plan.sport].target === 'power') l += ' ' + x.cad[0] + '-' + x.cad[1] + 'rpm';
      lines.push(l);
    });
    lines.push('');
  });
  return lines.join('\n').trim();
}

function icuEvent(plan, profile) {
  const t = TEMPLATES[plan.tid];
  const sections = build(plan, profile);
  let desc = t.desc + (t.setup && t.setup[plan.sport] ? '\n\n' + t.setup[plan.sport].map(x => '• ' + x).join('\n') : '') + (plan.challenge ? '\n\nSfida: ' + plan.challenge : '') + '\n\n' + toIcu(plan, sections);
  return {
    category: 'WORKOUT',
    start_date_local: plan.date + 'T00:00:00',
    type: SPORTS[plan.sport].icu,
    name: 'SMG · ' + t.name,
    description: desc,
    external_id: 'smg-' + plan.date,
    indoor: plan.sport === 'indoor'
  };
}

/* ------------------------------------------------------------------ */
/* Attività Intervals → livello                                        */
/* ------------------------------------------------------------------ */
function activitySport(type) {
  type = (type || '').toLowerCase();
  if (type.includes('virtual')) return 'indoor';
  if (type.includes('mountain') || type.includes('gravel')) return 'mtb';
  if (type.includes('run') || type.includes('walk') || type.includes('hike')) return 'run';
  if (type.includes('weight') || type.includes('workout') || type.includes('yoga')) return 'strength';
  if (type.includes('ride')) return 'road';
  return 'other';
}
function activityLevel(a, P) {
  const h = (a.moving_time || a.elapsed_time || 0) / 3600;
  let IF = a.icu_intensity != null && +a.icu_intensity > 0 ? +a.icu_intensity : null;
  if (IF != null && IF > 3) IF = IF / 100;
  // senza potenza: intensità stimata dal carico (che Intervals calcola dalla FC): carico/ora = 100 × IF²
  if (IF == null && a.icu_training_load && h > 0.15) IF = Math.sqrt(a.icu_training_load / h / 100);
  let lvl = IF == null ? 2 : IF >= 0.9 ? 4 : IF >= 0.8 ? 3 : IF >= 0.6 ? 2 : 1;
  // tempo nelle zone cardio alte (zone Intervals: 4 = soglia, 5+ = sopra soglia)
  const z = a.icu_hr_zone_times;
  if (Array.isArray(z) && z.length >= 5) {
    const z4 = +z[3] || 0, z5 = z.slice(4).reduce((x, y) => x + (+y || 0), 0);
    if (z5 >= 360 || z4 + z5 >= 1200) lvl = Math.max(lvl, 4); else if (z4 + z5 >= 600) lvl = Math.max(lvl, 3);
  }
  if (a.average_heartrate && P && P.lthr && h >= 0.33) {
    const r = a.average_heartrate / P.lthr;
    if (r >= 0.92) lvl = Math.max(lvl, 4); else if (r >= 0.87) lvl = Math.max(lvl, 3);
  }
  return lvl;
}

root.SMG = {
  ymd, parse, addDays, dow, monday, diffDays, hash, rng,
  SPORTS, ZONES, LEVELS, TEMPLATES, EXTRAS,
  defaultProfile, readiness, propose, indoorVersion, build, stats, profileBars, targetText,
  toIcu, icuEvent, activitySport, activityLevel, isDeload, context, hrvStatus, blockWeek, feedback, nextDeload, dayCfg, nextTest
};
})(typeof window !== 'undefined' ? window : globalThis);
