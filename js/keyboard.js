/* =========================================================
 * keyboard.js — ピアノ鍵盤コンポーネント
 * 移動ドラベル / 固定ドラベル / 音名を切り替え表示できる。
 * ========================================================= */

import { syllableOf, noteName, fixedDoName, scalePcs, DEG_CLASS } from './theory.js';
import { playNote } from './audio.js';

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 }; // 白鍵pc → 直後の黒鍵pc

/**
 * 鍵盤を生成する。
 * @param {HTMLElement} container
 * @param {object} opts { lowMidi, octaves, onPlay }
 * @returns {object} api { setKey, setLabelMode, highlight, clearHighlights, el }
 */
export function createKeyboard(container, opts = {}) {
  const lowMidi = opts.lowMidi ?? 48; // C3
  const octaves = opts.octaves ?? 2;
  const onPlay = opts.onPlay ?? null;

  let key = opts.key ?? null;       // theory.makeKey の結果
  let labelMode = opts.labelMode ?? 'movable'; // movable | fixed | note | none

  const el = document.createElement('div');
  el.className = 'kbd';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'ピアノ鍵盤');

  const keys = []; // { midi, elem, isBlack, labelEl, subEl }

  // 白鍵を先に並べ、黒鍵を重ねる
  const whites = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const pc of WHITE_PCS) whites.push(lowMidi + oct * 12 + pc);
  }
  whites.push(lowMidi + octaves * 12); // 上のC

  const totalWhite = whites.length;

  whites.forEach((midi, i) => {
    const w = document.createElement('button');
    w.type = 'button';
    w.className = 'kbd-key kbd-white';
    w.style.left = `${(i / totalWhite) * 100}%`;
    w.style.width = `${(1 / totalWhite) * 100}%`;
    const label = document.createElement('span');
    label.className = 'kbd-label';
    const sub = document.createElement('span');
    sub.className = 'kbd-sub';
    w.append(sub, label);
    el.appendChild(w);
    keys.push({ midi, elem: w, isBlack: false, labelEl: label, subEl: sub });

    const bpc = BLACK_AFTER[midi % 12];
    if (bpc !== undefined && !(i === totalWhite - 1)) {
      const bMidi = midi - (midi % 12) + bpc;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kbd-key kbd-black';
      b.style.left = `${((i + 0.68) / totalWhite) * 100}%`;
      b.style.width = `${(0.64 / totalWhite) * 100}%`;
      const bl = document.createElement('span');
      bl.className = 'kbd-label';
      b.appendChild(bl);
      el.appendChild(b);
      keys.push({ midi: bMidi, elem: b, isBlack: true, labelEl: bl, subEl: null });
    }
  });

  // 入力: pointerdown で即発音(モバイルのレイテンシ対策)
  keys.forEach(k => {
    k.elem.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      trigger(k.midi);
    });
    k.elem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(k.midi); }
    });
  });

  function trigger(midi) {
    playNote(midi, { dur: 0.9 });
    flash(midi);
    if (onPlay) onPlay(midi);
  }

  function flash(midi, cls = 'is-pressed', ms = 350) {
    const k = keys.find(x => x.midi === midi);
    if (!k) return;
    k.elem.classList.add(cls);
    setTimeout(() => k.elem.classList.remove(cls), ms);
  }

  function refresh() {
    const pcs = key ? scalePcs(key) : null;
    keys.forEach(k => {
      const pc = ((k.midi % 12) + 12) % 12;
      // 度数クラスをリセット
      k.elem.className = k.elem.className.replace(/\bdeg-\S+/g, '').trim();
      k.elem.classList.remove('in-scale', 'is-tonic');

      let main = '', sub = '';
      if (key && labelMode !== 'none') {
        const syl = syllableOf(k.midi, key.doPc);
        if (labelMode === 'movable' || labelMode === 'both') {
          main = syl.kana;
          if (labelMode === 'both') sub = noteName(k.midi, key.useFlats);
        } else if (labelMode === 'fixed') {
          main = fixedDoName(k.midi);
        } else if (labelMode === 'note') {
          main = noteName(k.midi, key.useFlats);
        }
        if (pcs.has(pc)) {
          k.elem.classList.add('in-scale');
          if (syl.diatonic) k.elem.classList.add(`deg-${DEG_CLASS[syl.deg]}`);
        }
        if (pc === key.tonicPc) k.elem.classList.add('is-tonic');
        // 移動ド表示では音階外の音は薄く
        if ((labelMode === 'movable' || labelMode === 'both') && !syl.diatonic) {
          k.elem.classList.add('chromatic-label');
        }
      } else if (labelMode === 'note') {
        main = noteName(k.midi, false);
      }
      k.labelEl.textContent = main;
      if (k.subEl) k.subEl.textContent = sub;
      k.elem.setAttribute('aria-label',
        `${noteName(k.midi, key ? key.useFlats : false)}${key ? ' / ' + syllableOf(k.midi, key.doPc).kana : ''}`);
    });
  }

  refresh();
  container.appendChild(el);

  return {
    el,
    keys,
    flash,
    trigger,
    setKey(k) { key = k; refresh(); },
    setLabelMode(m) { labelMode = m; refresh(); },
    getKey() { return key; },
  };
}
