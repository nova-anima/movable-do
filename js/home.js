/* =========================================================
 * home.js — ホームの30秒体験デモ
 * きらきら星の冒頭を3つの調で再生し、階名の不変性を見せる。
 * ========================================================= */

import { MELODIES, makeKey, tonicMidiNear, SYLLABLES, DEG_CLASS } from './theory.js';
import { playMelody } from './audio.js';

const twinkle = MELODIES.find(m => m.id === 'twinkle');
const phrase = twinkle.notes.slice(0, 14); // ドドソソララソ ファファミミレレド

const DEMO_KEYS = [
  { label: 'ハ長調 (C)', pc: 0 },
  { label: 'ヘ長調 (F)', pc: 5 },
  { label: '変イ長調 (A♭)', pc: 8 },
];

const tokensEl = document.getElementById('demo-tokens');
const keysEl = document.getElementById('demo-keys');
const caption = document.getElementById('demo-caption');

let current = null; // {cancel}
let tokenEls = [];

function renderTokens() {
  tokensEl.innerHTML = '';
  tokenEls = phrase.map(([off]) => {
    const span = document.createElement('span');
    if (off === null) {
      span.className = 'mtok rest';
      span.textContent = '・';
    } else {
      const syl = SYLLABLES[((off % 12) + 12) % 12];
      span.className = `mtok deg-${DEG_CLASS[syl.deg]}`;
      span.style.background = `var(--c-${DEG_CLASS[syl.deg]})`;
      span.textContent = syl.kana;
    }
    tokensEl.appendChild(span);
    return span;
  });
}

function play(pc, btn) {
  if (current) { current.cancel(); current = null; }
  tokenEls.forEach(t => t.classList.remove('playing'));

  const key = makeKey(pc, 'major');
  const base = tonicMidiNear(key, 62);
  caption.textContent = `♪ ${key.name} — ドは ${key.en} の位置へ移動しました。階名はそのまま。`;

  current = playMelody(phrase, base, 108, (i) => {
    tokenEls.forEach(t => t.classList.remove('playing'));
    if (i >= 0 && tokenEls[i]) tokenEls[i].classList.add('playing');
    if (i === -1) current = null;
  });

  [...keysEl.children].forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

DEMO_KEYS.forEach(({ label, pc }, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', () => play(pc, b));
  keysEl.appendChild(b);
});

renderTokens();
