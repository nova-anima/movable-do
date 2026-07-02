/* =========================================================
 * learn.js — 教科書のインライン・デモ
 * ========================================================= */

import { MELODIES, makeKey, tonicMidiNear, fixedDoName, SYLLABLES, DEG_CLASS, DIATONIC_OFFSETS } from './theory.js';
import { audioCtx, playNote, playChord, playMelody } from './audio.js';

const twinkle = MELODIES.find(m => m.id === 'twinkle');
const phrase = twinkle.notes.slice(0, 7); // ドドソソララソ

/* ---------- 第1章: 固定ド vs 移動ド 比較 ---------- */
const cmpFixed = document.getElementById('cmp-fixed');
const cmpMovable = document.getElementById('cmp-movable');
let fixedToks = [], movableToks = [];
let running = null;

function renderCompare(keyPc) {
  const key = makeKey(keyPc, 'major');
  const base = tonicMidiNear(key, 64);
  cmpFixed.innerHTML = '';
  cmpMovable.innerHTML = '';
  fixedToks = []; movableToks = [];
  phrase.forEach(([off]) => {
    const midi = base + off;
    const f = document.createElement('span');
    f.className = 'mtok';
    f.style.background = 'var(--c-chroma)';
    f.textContent = fixedDoName(midi);
    cmpFixed.appendChild(f);
    fixedToks.push(f);

    const syl = SYLLABLES[((off % 12) + 12) % 12];
    const m = document.createElement('span');
    m.className = `mtok deg-${DEG_CLASS[syl.deg]}`;
    m.style.background = `var(--c-${DEG_CLASS[syl.deg]})`;
    m.textContent = syl.kana;
    cmpMovable.appendChild(m);
    movableToks.push(m);
  });
  return base;
}

function playCompare(keyPc) {
  if (running) { running.cancel(); running = null; }
  const base = renderCompare(keyPc);
  [...fixedToks, ...movableToks].forEach(t => t.classList.remove('playing'));
  running = playMelody(phrase, base, 104, (i) => {
    [...fixedToks, ...movableToks].forEach(t => t.classList.remove('playing'));
    if (i >= 0) {
      fixedToks[i]?.classList.add('playing');
      movableToks[i]?.classList.add('playing');
    } else running = null;
  });
}

if (cmpFixed) renderCompare(7); // 初期表示: ト長調

/* ---------- 第4章: クロマチック階名 ---------- */
const chromaEl = document.getElementById('chroma-tokens');
let chromaToks = [];
if (chromaEl) {
  chromaToks = [...Array(13)].map((_, i) => {
    const syl = SYLLABLES[i % 12];
    const s = document.createElement('span');
    s.className = 'mtok';
    s.style.background = syl.diatonic ? `var(--c-${DEG_CLASS[syl.deg]})` : 'var(--c-chroma)';
    if (syl.diatonic && DEG_CLASS[syl.deg] === 'mi') s.classList.add('deg-mi');
    s.innerHTML = `${syl.kana}<span style="display:block;font-size:.58em;font-weight:600;opacity:.85">${syl.roman}</span>`;
    chromaEl.appendChild(s);
    return s;
  });
}

/* ---------- 純正律デモ用: 倍音つきトーン ---------- */
function playRich(freq, dur, when = 0, gain = 0.16) {
  const ac = audioCtx();
  const t0 = ac.currentTime + when + 0.03;
  const real = new Float32Array([0, 1, 0.42, 0.28, 0.2, 0.14, 0.08]);
  const imag = new Float32Array(real.length);
  const wave = ac.createPeriodicWave(real, imag);
  const o = ac.createOscillator();
  o.setPeriodicWave(wave);
  o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.06);
  g.gain.setValueAtTime(gain, t0 + dur - 0.25);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.1);
}

/* ---------- ボタンのディスパッチ ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-play]');
  if (!btn) return;
  const kind = btn.dataset.play;
  const ac = audioCtx();
  const C4 = 261.6256;

  switch (kind) {
    case 'compare': playCompare(7); break;
    case 'compare-c': playCompare(0); break;

    case 'degree': {
      const deg = +btn.dataset.deg;
      const t = ac.currentTime;
      playChord([48, 55, 60, 64], { time: t, dur: 0.9 });
      playNote(60 + DIATONIC_OFFSETS[deg], { time: t + 1.05, dur: 1.3 });
      break;
    }

    case 'gravity': {
      const resolve = btn.dataset.variant === 'resolve';
      const t = ac.currentTime;
      const seq = [0, 2, 4, 5, 7, 9, 11];
      seq.forEach((off, i) => {
        const last = !resolve && i === seq.length - 1;
        playNote(60 + off, { time: t + i * 0.42, dur: last ? 1.6 : 0.4, vibrato: last });
      });
      if (resolve) playNote(72, { time: t + seq.length * 0.42, dur: 1.6 });
      break;
    }

    case 'ratio': {
      const v = btn.dataset.variant;
      const dur = 3.0;
      if (v === 'et3') { playRich(C4, dur); playRich(C4 * Math.pow(2, 4 / 12), dur); }
      if (v === 'just3') { playRich(C4, dur); playRich(C4 * 5 / 4, dur); }
      if (v === 'just5') { playRich(C4, dur); playRich(C4 * 3 / 2, dur); }
      if (v === 'triad') { playRich(C4, dur); playRich(C4 * 5 / 4, dur, 0, 0.13); playRich(C4 * 3 / 2, dur, 0, 0.13); }
      break;
    }

    case 'chromatic': {
      const t = ac.currentTime;
      for (let i = 0; i <= 12; i++) {
        playNote(60 + i, { time: t + i * 0.38, dur: 0.36, vibrato: false });
        setTimeout(() => {
          chromaToks.forEach(x => x.classList.remove('playing'));
          chromaToks[i]?.classList.add('playing');
          if (i === 12) setTimeout(() => chromaToks.forEach(x => x.classList.remove('playing')), 500);
        }, (i * 0.38) * 1000);
      }
      break;
    }

    case 'scale': {
      const v = btn.dataset.variant;
      const t = ac.currentTime;
      let seq;
      if (v === 'major') seq = [60, 62, 64, 65, 67, 69, 71, 72];
      else if (v === 'minor') seq = [57, 59, 60, 62, 64, 65, 67, 69];
      else seq = [57, 59, 60, 62, 64, 65, 68, 69];
      seq.forEach((m, i) => {
        playNote(m, { time: t + i * 0.42, dur: i === seq.length - 1 ? 1.4 : 0.4 });
      });
      break;
    }
  }
});

/* ---------- 第6章: ハンドサイン ---------- */
const SIGNS = [
  { kana: 'ド', roman: 'do', desc: 'にぎりこぶし。どっしりと安定。', svg: `
    <rect x="28" y="40" width="44" height="34" rx="15" fill="none" stroke="COL" stroke-width="6"/>
    <line x1="40" y1="40" x2="40" y2="52" stroke="COL" stroke-width="4" stroke-linecap="round"/>
    <line x1="50" y1="38" x2="50" y2="52" stroke="COL" stroke-width="4" stroke-linecap="round"/>
    <line x1="60" y1="40" x2="60" y2="52" stroke="COL" stroke-width="4" stroke-linecap="round"/>` },
  { kana: 'レ', roman: 're', desc: '指先をそろえて、ななめ上へ。', svg: `
    <rect x="20" y="46" width="60" height="15" rx="7.5" fill="none" stroke="COL" stroke-width="6" transform="rotate(-32 50 53)"/>` },
  { kana: 'ミ', roman: 'mi', desc: '手のひらを水平に。まっすぐ。', svg: `
    <rect x="20" y="47" width="60" height="15" rx="7.5" fill="none" stroke="COL" stroke-width="6"/>` },
  { kana: 'ファ', roman: 'fa', desc: '親指を下に。ミへ寄りかかる。', svg: `
    <rect x="30" y="34" width="40" height="30" rx="13" fill="none" stroke="COL" stroke-width="6"/>
    <line x1="50" y1="66" x2="44" y2="84" stroke="COL" stroke-width="8" stroke-linecap="round"/>` },
  { kana: 'ソ', roman: 'so', desc: '手のひらを正面へ、堂々と。', svg: `
    <rect x="41" y="22" width="18" height="56" rx="9" fill="none" stroke="COL" stroke-width="6"/>` },
  { kana: 'ラ', roman: 'la', desc: '手首からやわらかく垂らす。', svg: `
    <path d="M24 44 Q50 78 76 44" fill="none" stroke="COL" stroke-width="7" stroke-linecap="round"/>` },
  { kana: 'シ', roman: 'ti', desc: '人さし指で、上のドを指す。', svg: `
    <rect x="36" y="52" width="32" height="26" rx="11" fill="none" stroke="COL" stroke-width="6"/>
    <line x1="50" y1="50" x2="64" y2="24" stroke="COL" stroke-width="7" stroke-linecap="round"/>` },
];

const hsEl = document.getElementById('handsigns');
if (hsEl) {
  SIGNS.forEach((s, i) => {
    const col = `var(--c-${DEG_CLASS[i]})`;
    const div = document.createElement('div');
    div.className = 'handsign';
    div.innerHTML = `
      <svg viewBox="0 0 100 100" aria-hidden="true">${s.svg.replaceAll('COL', col)}</svg>
      <div class="hs-name" style="color:${col}">${s.kana} <span style="font-size:.72em;opacity:.7">${s.roman}</span></div>
      <div class="hs-desc">${s.desc}</div>`;
    div.style.cursor = 'pointer';
    div.title = 'クリックで音が鳴ります';
    div.addEventListener('click', () => playNote(60 + DIATONIC_OFFSETS[i], { dur: 1.0 }));
    hsEl.appendChild(div);
  });
}
