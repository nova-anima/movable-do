/* =========================================================
 * playground.js — 4つの練習ツール
 *   1. 移調キーボード / 2. 聴音クイズ / 3. うたってチェック / 4. メロディ
 * ========================================================= */

import {
  MAJOR_KEYS, MINOR_KEYS, SYLLABLES, DEG_CLASS, DIATONIC_OFFSETS, MELODIES,
  makeKey, tonicMidiNear, cadenceChords, noteName, freqToMidi, randomMajorKey,
} from './theory.js';
import {
  audioCtx, playNote, playCadence, playMelody,
  startDrone, stopDrone, droneActive, playSuccess, playFail,
} from './audio.js';
import { createKeyboard } from './keyboard.js';
import { startPitchDetection, stopPitchDetection, pitchActive } from './pitch.js';

const $ = (id) => document.getElementById(id);
const mod12 = (n) => ((n % 12) + 12) % 12;

/* ---------- 共通: セグメントコントロール ---------- */
function initSeg(el, onChange) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    [...el.querySelectorAll('button')].forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    if (onChange) onChange(b.dataset.v);
  });
}
function segValue(el) {
  return el.querySelector('button.active')?.dataset.v;
}

/* ---------- 共通: 調セレクト ---------- */
function fillKeySelect(sel, { minors = true } = {}) {
  const og1 = document.createElement('optgroup');
  og1.label = '長調';
  MAJOR_KEYS.forEach(k => {
    const o = document.createElement('option');
    o.value = `M${k.pc}`;
    o.textContent = `${k.name} (${k.en})`;
    og1.appendChild(o);
  });
  sel.appendChild(og1);
  if (minors) {
    const og2 = document.createElement('optgroup');
    og2.label = '短調(ラ読み)';
    MINOR_KEYS.forEach(k => {
      const o = document.createElement('option');
      o.value = `m${k.pc}`;
      o.textContent = `${k.name} (${k.en})`;
      og2.appendChild(o);
    });
    sel.appendChild(og2);
  }
}
function parseKeySel(sel) {
  const v = sel.value;
  return makeKey(+v.slice(1), v[0] === 'm' ? 'minor' : 'major');
}

/* ---------- 共通: 階名チップ生成 ---------- */
function makeSylChip(off, onClick) {
  const syl = SYLLABLES[mod12(off)];
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `syl-chip ${syl.diatonic ? 'syl-' + DEG_CLASS[syl.deg] : 'syl-chroma'}`;
  b.innerHTML = `${syl.kana}<span class="roman">${syl.roman}</span>`;
  b.dataset.off = off;
  if (onClick) b.addEventListener('click', () => onClick(off, b));
  return b;
}

/* =========================================================
 * タブ
 * ========================================================= */
const TAB_NAMES = ['keyboard', 'ear', 'sing', 'melody'];
const tabButtons = [...document.querySelectorAll('.tab-btn')];

function activateTab(name) {
  if (!TAB_NAMES.includes(name)) name = 'keyboard';
  tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  TAB_NAMES.forEach(n => {
    $(`tab-${n}`).classList.toggle('active', n === name);
  });
  if (history.replaceState) history.replaceState(null, '', `#${name}`);
}
tabButtons.forEach(b => b.addEventListener('click', () => activateTab(b.dataset.tab)));
activateTab(location.hash.replace('#', '') || 'keyboard');

/* =========================================================
 * 1. 移調キーボード
 * ========================================================= */
const kbKeySel = $('kb-key');
fillKeySelect(kbKeySel);
let kbKey = parseKeySel(kbKeySel);

const kb = createKeyboard($('kb-container'), { lowMidi: 48, octaves: 2, key: kbKey });

function kbInfo() {
  if (kbKey.mode === 'minor') {
    $('kb-info').textContent =
      `いまの調: ${kbKey.name} — 主音(ラ)は ${kbKey.en.replace('m', '')}、ドは ${noteName(kbKey.doPc, kbKey.useFlats)} の位置`;
  } else {
    $('kb-info').textContent =
      `いまの調: ${kbKey.name} — ドは ${noteName(kbKey.doPc, kbKey.useFlats)} の位置`;
  }
}
kbInfo();

kbKeySel.addEventListener('change', () => {
  kbKey = parseKeySel(kbKeySel);
  kb.setKey(kbKey);
  kbInfo();
  if (droneActive()) startDrone(tonicMidiNear(kbKey, 48));
});

initSeg($('kb-label'), (v) => kb.setLabelMode(v));

$('kb-drone').addEventListener('change', (e) => {
  if (e.target.checked) startDrone(tonicMidiNear(kbKey, 48));
  else stopDrone();
});

$('kb-cadence').addEventListener('click', () => {
  playCadence(cadenceChords(kbKey));
});

$('kb-scale').addEventListener('click', () => {
  const t = audioCtx().currentTime;
  const tonic = tonicMidiNear(kbKey, 58);
  const offs = kbKey.mode === 'minor'
    ? [0, 2, 3, 5, 7, 8, 10, 12]
    : [0, 2, 4, 5, 7, 9, 11, 12];
  offs.forEach((o, i) => {
    playNote(tonic + o, { time: t + i * 0.4, dur: i === offs.length - 1 ? 1.2 : 0.38 });
    setTimeout(() => kb.flash(tonic + o), (i * 0.4) * 1000);
  });
});

// PCキー演奏: Z X C V B N M , = いまの調の音階
const KEYMAP = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','];
document.addEventListener('keydown', (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(input|select|textarea)$/i.test(document.activeElement?.tagName || '')) return;
  if (!$('tab-keyboard').classList.contains('active')) return;
  const idx = KEYMAP.indexOf(e.key.toLowerCase());
  if (idx === -1) return;
  const tonic = tonicMidiNear(kbKey, 58);
  const offs = kbKey.mode === 'minor'
    ? [0, 2, 3, 5, 7, 8, 10, 12]
    : [0, 2, 4, 5, 7, 9, 11, 12];
  const midi = tonic + offs[idx];
  playNote(midi, { dur: 0.8 });
  kb.flash(midi);
});

/* =========================================================
 * 2. 聴音クイズ
 * ========================================================= */
const LEVEL_POOLS = {
  1: [0, 4, 7],
  2: [0, 2, 4, 5, 7],
  3: [0, 2, 4, 5, 7, 9, 11],
  4: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
const earState = {
  level: 1,
  keymode: 'random',
  key: null,
  target: null,      // { off, midi }
  attempted: false,  // この問題で一度でも間違えたか
  answered: false,
  stats: JSON.parse(localStorage.getItem('domove.ear') || '{"correct":0,"total":0,"best":0,"streak":0}'),
};

function earSaveStats() {
  localStorage.setItem('domove.ear', JSON.stringify(earState.stats));
  $('ear-streak').textContent = earState.stats.streak;
  $('ear-best').textContent = earState.stats.best;
  $('ear-total').textContent = earState.stats.total;
  $('ear-acc').textContent = earState.stats.total
    ? Math.round(earState.stats.correct / earState.stats.total * 100) + '%'
    : '–';
}

function earRenderAnswers() {
  const row = $('ear-answers');
  row.innerHTML = '';
  const offs = earState.level === 4
    ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 2, 4, 5, 7, 9, 11];
  offs.forEach(off => row.appendChild(makeSylChip(off, earAnswer)));
}

function earNewQuestion() {
  earState.key = earState.keymode === 'c' ? makeKey(0, 'major') : randomMajorKey();
  const pool = LEVEL_POOLS[earState.level];
  const off = pool[Math.floor(Math.random() * pool.length)];
  const doMidi = tonicMidiNear(earState.key, 60);
  const shift = earState.level >= 3 && Math.random() < 0.35 ? 12 : 0;
  earState.target = { off, midi: doMidi + off + shift };
  earState.attempted = false;
  earState.answered = false;
  $('ear-keyname').textContent = `いまの調: ${earState.key.name} — カデンツで「ド」の場所を感じて`;
  $('ear-big').textContent = '?';
  $('ear-big').style.color = '';
  $('ear-status').textContent = '';
  $('ear-replay').disabled = false;
  $('ear-note').disabled = false;
  earPlayAll();
}

function earPlayAll() {
  const end = playCadence(cadenceChords(earState.key));
  playNote(earState.target.midi, { time: end + 0.3, dur: 1.2 });
}

function earAnswer(off, chip) {
  if (!earState.target || earState.answered) return;
  const correct = off === earState.target.off;
  if (correct) {
    earState.answered = true;
    const syl = SYLLABLES[earState.target.off];
    if (!earState.attempted) {
      earState.stats.correct++;
      earState.stats.streak++;
      earState.stats.best = Math.max(earState.stats.best, earState.stats.streak);
    }
    earState.stats.total++;
    earSaveStats();
    chip.classList.add('correct');
    setTimeout(() => chip.classList.remove('correct'), 700);
    $('ear-big').textContent = syl.kana;
    $('ear-big').style.color = syl.diatonic ? `var(--c-${DEG_CLASS[syl.deg]})` : 'var(--c-chroma)';
    $('ear-status').textContent = earState.attempted ? '正解にたどりつきました' : '⭕ 一発正解!';
    playSuccess();
    setTimeout(earNewQuestion, 1600);
  } else {
    if (!earState.attempted) {
      earState.stats.streak = 0;
      earSaveStats();
    }
    earState.attempted = true;
    chip.classList.add('wrong');
    setTimeout(() => chip.classList.remove('wrong'), 600);
    $('ear-status').textContent = 'ちがう…もういちど聴いてみよう(「音だけもう一度」が便利)';
    playFail();
  }
}

initSeg($('ear-level'), (v) => { earState.level = +v; earRenderAnswers(); });
initSeg($('ear-keymode'), (v) => { earState.keymode = v; });
$('ear-start').addEventListener('click', earNewQuestion);
$('ear-replay').addEventListener('click', earPlayAll);
$('ear-note').addEventListener('click', () => {
  if (earState.target) playNote(earState.target.midi, { dur: 1.2 });
});
$('ear-reset').addEventListener('click', () => {
  earState.stats = { correct: 0, total: 0, best: 0, streak: 0 };
  earSaveStats();
});
earRenderAnswers();
earSaveStats();

/* =========================================================
 * 3. うたってチェック
 * ========================================================= */
const singState = {
  key: makeKey(0, 'major'),
  mode: 'practice',
  targetOff: 0,
  buf: [],           // 直近の検出周波数
  inTuneSince: null,
  cooldownUntil: 0,
  hit: 0,
  streak: 0,
};

const singKeySel = $('sing-key');
fillKeySelect(singKeySel, { minors: false });

function singDoMidi() { return tonicMidiNear(singState.key, 60); }

function singUpdateHeader() {
  $('sing-keyname').textContent =
    `${singState.key.name} — ド = ${noteName(singState.key.doPc, singState.key.useFlats)}`;
  const syl = SYLLABLES[mod12(singState.targetOff)];
  const big = $('sing-target');
  big.textContent = syl.kana;
  big.style.color = syl.diatonic ? `var(--c-${DEG_CLASS[syl.deg]})` : 'var(--c-chroma)';
}

function singSetTarget(off) {
  singState.targetOff = off;
  singState.inTuneSince = null;
  singUpdateHeader();
}

function singNextChallenge() {
  const pool = [0, 2, 4, 5, 7, 9, 11];
  let off;
  do { off = pool[Math.floor(Math.random() * pool.length)]; } while (off === singState.targetOff);
  singSetTarget(off);
  playNote(singDoMidi(), { dur: 0.7 }); // 基準のドを渡す
}

const singChoose = $('sing-choose');
[0, 2, 4, 5, 7, 9, 11].forEach(off => {
  singChoose.appendChild(makeSylChip(off, (o) => {
    singSetTarget(o);
    $('sing-status').textContent = `目標「${SYLLABLES[o].kana}」— ドを聴いてから歌ってみよう`;
  }));
});

singKeySel.addEventListener('change', () => {
  singState.key = parseKeySel(singKeySel);
  singState.inTuneSince = null;
  singUpdateHeader();
});

initSeg($('sing-mode'), (v) => {
  singState.mode = v;
  singChoose.style.display = v === 'practice' ? '' : 'none';
  $('sing-stats').style.display = v === 'challenge' ? '' : 'none';
  if (v === 'challenge') {
    $('sing-status').textContent = 'ランダムに出題。当てると次の階名が出ます';
    singNextChallenge();
  } else {
    $('sing-status').textContent = '目標の階名を選んで、「ドを聴く」→ 声で当ててみよう';
  }
});

$('sing-do').addEventListener('click', () => playNote(singDoMidi(), { dur: 1.0 }));
$('sing-hear').addEventListener('click', () => playNote(singDoMidi() + singState.targetOff, { dur: 1.0 }));

const micBtn = $('sing-mic');
micBtn.addEventListener('click', async () => {
  if (pitchActive()) {
    stopPitchDetection();
    micBtn.textContent = '🎙 マイクをON';
    micBtn.classList.add('btn-primary');
    $('sing-needle').style.opacity = 0;
    $('sing-readout').textContent = 'マイクはOFFです';
    return;
  }
  micBtn.textContent = '…起動中';
  const ok = await startPitchDetection(onPitch);
  if (!ok) {
    micBtn.textContent = '🎙 マイクをON';
    $('sing-readout').textContent = 'マイクを使えませんでした。ブラウザの許可設定を確認してください。';
    return;
  }
  micBtn.textContent = '⏹ マイクをOFF';
  $('sing-readout').textContent = 'きこえています。目標の階名を歌ってみて!';
});

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function onPitch(freq) {
  const needle = $('sing-needle');
  const readout = $('sing-readout');
  const now = performance.now();

  if (freq === null) {
    singState.buf.length = 0;
    singState.inTuneSince = null;
    needle.style.opacity = 0;
    return;
  }
  singState.buf.push(freq);
  if (singState.buf.length > 6) singState.buf.shift();
  if (singState.buf.length < 3) return;

  const f = median(singState.buf);
  const midiF = freqToMidi(f);
  const doMidi = singDoMidi();

  // 目標階名とのズレ(オクターブ無視、-600〜+600セント)
  const diff = midiF - (doMidi + singState.targetOff);
  const wrapped = ((diff % 12) + 18) % 12 - 6;
  const cents = wrapped * 100;

  // いま歌っている音に最も近い階名
  const nearestOff = mod12(Math.round(midiF - doMidi));
  const nearSyl = SYLLABLES[nearestOff];

  needle.style.opacity = 1;
  const pct = Math.max(-46, Math.min(46, cents / 250 * 46));
  needle.style.left = `${50 + pct}%`;

  const inTune = Math.abs(cents) <= 30;
  needle.classList.toggle('in-tune', inTune);

  readout.innerHTML =
    `いまの声: <b>${nearSyl.kana}</b> <span class="small">(${noteName(Math.round(midiF), singState.key.useFlats)}帯 / ${cents >= 0 ? '+' : ''}${Math.round(cents)}セント)</span>`;

  if (now < singState.cooldownUntil) return;

  if (inTune) {
    if (!singState.inTuneSince) singState.inTuneSince = now;
    if (now - singState.inTuneSince > 600) {
      // 成功!
      singState.cooldownUntil = now + 1400;
      singState.inTuneSince = null;
      playSuccess();
      $('sing-status').textContent = `⭕ ${SYLLABLES[mod12(singState.targetOff)].kana} にぴったり!`;
      if (singState.mode === 'challenge') {
        singState.hit++;
        singState.streak++;
        $('sing-hit').textContent = singState.hit;
        $('sing-streakN').textContent = singState.streak;
        setTimeout(singNextChallenge, 900);
      }
    }
  } else {
    singState.inTuneSince = null;
  }
}

singUpdateHeader();

/* =========================================================
 * 4. メロディ
 * ========================================================= */
const melState = {
  song: MELODIES[0],
  key: makeKey(0, 'major'),
  bpm: 104,
  playing: null,
  quiz: false,
  quizAnswer: null,
  tokens: [],
};

const melSongSel = $('mel-song');
MELODIES.forEach(m => {
  const o = document.createElement('option');
  o.value = m.id;
  o.textContent = `${m.title}(${m.origin})`;
  melSongSel.appendChild(o);
});
const melKeySel = $('mel-key');
fillKeySelect(melKeySel, { minors: false });

function melRenderTokens() {
  const wrap = $('mel-tokens');
  wrap.innerHTML = '';
  melState.tokens = melState.song.notes.map(([off]) => {
    const s = document.createElement('span');
    if (off === null) {
      s.className = 'mtok rest';
      s.textContent = '・';
    } else {
      const syl = SYLLABLES[mod12(off)];
      s.className = syl.diatonic ? `mtok deg-${DEG_CLASS[syl.deg]}` : 'mtok';
      s.style.background = syl.diatonic ? `var(--c-${DEG_CLASS[syl.deg]})` : 'var(--c-chroma)';
      s.textContent = syl.kana;
      if (melState.quiz && !melState.quizRevealed) s.classList.add('hidden-syl');
    }
    wrap.appendChild(s);
    return s;
  });
}

function melStop() {
  if (melState.playing) { melState.playing.cancel(); melState.playing = null; }
  melState.tokens.forEach(t => t.classList.remove('playing'));
  $('mel-play').textContent = '▶ 再生';
}

function melPlay() {
  melStop();
  const doMidi = tonicMidiNear(melState.key, 62);
  $('mel-play').textContent = '⏹ 停止';
  $('mel-info').textContent = melState.quiz && !melState.quizRevealed
    ? `${melState.key.name}で再生中 — さて、なんの曲?`
    : `${melState.key.name}で再生中 — ド = ${noteName(melState.key.doPc, melState.key.useFlats)}`;
  melState.playing = playMelody(melState.song.notes, doMidi, melState.bpm, (i) => {
    melState.tokens.forEach(t => t.classList.remove('playing'));
    if (i >= 0) melState.tokens[i]?.classList.add('playing');
    else {
      melState.playing = null;
      $('mel-play').textContent = '▶ 再生';
    }
  });
}

melSongSel.addEventListener('change', () => {
  melState.song = MELODIES.find(m => m.id === melSongSel.value);
  melState.bpm = melState.song.tempo;
  $('mel-tempo').value = melState.bpm;
  $('mel-bpm').textContent = melState.bpm;
  melStop();
  melRenderTokens();
});
melKeySel.addEventListener('change', () => {
  melState.key = parseKeySel(melKeySel);
  melStop();
});
$('mel-tempo').addEventListener('input', (e) => {
  melState.bpm = +e.target.value;
  $('mel-bpm').textContent = melState.bpm;
});
$('mel-play').addEventListener('click', () => {
  if (melState.playing) melStop();
  else melPlay();
});
$('mel-shuffle').addEventListener('click', () => {
  const k = randomMajorKey();
  melState.key = k;
  melKeySel.value = `M${k.pc}`;
  melPlay();
});

/* --- 曲あてクイズ --- */
const melChoices = $('mel-choices');
function melSetupQuiz() {
  melState.quizAnswer = MELODIES[Math.floor(Math.random() * MELODIES.length)];
  melState.song = melState.quizAnswer;
  melState.quizRevealed = false;
  melState.key = randomMajorKey();
  melState.bpm = melState.song.tempo;
  melKeySel.value = `M${melState.key.pc ?? melState.key.tonicPc}`;
  $('mel-tempo').value = melState.bpm;
  $('mel-bpm').textContent = melState.bpm;
  melSongSel.disabled = true;
  melChoices.style.display = '';
  melChoices.innerHTML = '';
  MELODIES.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost btn-sm';
    b.textContent = m.title;
    b.addEventListener('click', () => {
      if (melState.quizRevealed) return;
      if (m.id === melState.quizAnswer.id) {
        melState.quizRevealed = true;
        playSuccess();
        $('mel-info').textContent = `⭕ 正解! 「${m.title}」(${melState.quizAnswer.origin})でした`;
        melRenderTokens();
        setTimeout(() => { if (melState.quiz) melSetupQuiz(); }, 2500);
      } else {
        playFail();
        b.classList.add('wrong');
        setTimeout(() => b.classList.remove('wrong'), 600);
        $('mel-info').textContent = 'ちがう曲みたい。もう一度聴いてみよう';
      }
    });
    melChoices.appendChild(b);
  });
  melRenderTokens();
  $('mel-info').textContent = '「▶ 再生」を押して、階名の並びと耳だけで曲名を当てよう';
}

$('mel-quiz').addEventListener('change', (e) => {
  melState.quiz = e.target.checked;
  melStop();
  if (melState.quiz) {
    melSetupQuiz();
  } else {
    melSongSel.disabled = false;
    melChoices.style.display = 'none';
    melState.song = MELODIES.find(m => m.id === melSongSel.value);
    melState.quizRevealed = false;
    melRenderTokens();
    $('mel-info').textContent = '';
  }
});

melRenderTokens();
$('mel-info').textContent = '調を変えても、階名(ドレミ)は変わりません。それを耳で確かめてください。';
