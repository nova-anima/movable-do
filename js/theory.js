/* =========================================================
 * theory.js — 音楽理論エンジン
 * 移動ド(movable do)のための調・階名・音名のマッピング
 * ========================================================= */

// ピッチクラス 0..11 (C=0)
export const PC_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const PC_FLAT  = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

// 12の長調。useFlats: 調号がフラット系か
export const MAJOR_KEYS = [
  { pc: 0,  name: 'ハ長調',   en: 'C',  useFlats: false },
  { pc: 7,  name: 'ト長調',   en: 'G',  useFlats: false },
  { pc: 2,  name: 'ニ長調',   en: 'D',  useFlats: false },
  { pc: 9,  name: 'イ長調',   en: 'A',  useFlats: false },
  { pc: 4,  name: 'ホ長調',   en: 'E',  useFlats: false },
  { pc: 11, name: 'ロ長調',   en: 'B',  useFlats: false },
  { pc: 6,  name: '嬰ヘ長調', en: 'F♯', useFlats: false },
  { pc: 1,  name: '変ニ長調', en: 'D♭', useFlats: true  },
  { pc: 8,  name: '変イ長調', en: 'A♭', useFlats: true  },
  { pc: 3,  name: '変ホ長調', en: 'E♭', useFlats: true  },
  { pc: 10, name: '変ロ長調', en: 'B♭', useFlats: true  },
  { pc: 5,  name: 'ヘ長調',   en: 'F',  useFlats: true  },
];

// 12の短調(ラから始まる=平行長調のドを基準に読む)
export const MINOR_KEYS = [
  { pc: 9,  name: 'イ短調',   en: 'Am',  useFlats: false },
  { pc: 4,  name: 'ホ短調',   en: 'Em',  useFlats: false },
  { pc: 11, name: 'ロ短調',   en: 'Bm',  useFlats: false },
  { pc: 6,  name: '嬰ヘ短調', en: 'F♯m', useFlats: false },
  { pc: 1,  name: '嬰ハ短調', en: 'C♯m', useFlats: false },
  { pc: 8,  name: '嬰ト短調', en: 'G♯m', useFlats: false },
  { pc: 3,  name: '変ホ短調', en: 'E♭m', useFlats: true  },
  { pc: 10, name: '変ロ短調', en: 'B♭m', useFlats: true  },
  { pc: 5,  name: 'ヘ短調',   en: 'Fm',  useFlats: true  },
  { pc: 0,  name: 'ハ短調',   en: 'Cm',  useFlats: true  },
  { pc: 7,  name: 'ト短調',   en: 'Gm',  useFlats: true  },
  { pc: 2,  name: 'ニ短調',   en: 'Dm',  useFlats: true  },
];

// ドからの半音距離 → 階名(カタカナ)。
// 幹音は伝統的な「ドレミファソラシ」、派生音はコダーイ式に準じた読み。
export const SYLLABLES = [
  { off: 0,  kana: 'ド',   roman: 'do', diatonic: true,  deg: 0 },
  { off: 1,  kana: 'ディ', roman: 'di', diatonic: false, deg: -1 },
  { off: 2,  kana: 'レ',   roman: 're', diatonic: true,  deg: 1 },
  { off: 3,  kana: 'リ',   roman: 'ri', diatonic: false, deg: -1 },
  { off: 4,  kana: 'ミ',   roman: 'mi', diatonic: true,  deg: 2 },
  { off: 5,  kana: 'ファ', roman: 'fa', diatonic: true,  deg: 3 },
  { off: 6,  kana: 'フィ', roman: 'fi', diatonic: false, deg: -1 },
  { off: 7,  kana: 'ソ',   roman: 'so', diatonic: true,  deg: 4 },
  { off: 8,  kana: 'スィ', roman: 'si', diatonic: false, deg: -1 },
  { off: 9,  kana: 'ラ',   roman: 'la', diatonic: true,  deg: 5 },
  { off: 10, kana: 'テ',   roman: 'te', diatonic: false, deg: -1 },
  { off: 11, kana: 'シ',   roman: 'ti', diatonic: true,  deg: 6 },
];

// 全音階の度数(0-6) → 半音オフセット
export const DIATONIC_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
// 度数ごとのCSSクラス名(色分けに使用)
export const DEG_CLASS = ['do', 're', 'mi', 'fa', 'so', 'la', 'ti'];

const mod12 = n => ((n % 12) + 12) % 12;

/** ドのピッチクラスに対する midi ノートの階名情報を返す */
export function syllableOf(midi, doPc) {
  return SYLLABLES[mod12(midi - doPc)];
}

/** 音名(固定ド側の呼び名)。useFlats で♭系表記 */
export function noteName(midi, useFlats = false) {
  const pc = mod12(midi);
  return (useFlats ? PC_FLAT : PC_SHARP)[pc];
}

/** 音名+オクターブ (国際式: C4 = middle C) */
export function noteNameOct(midi, useFlats = false) {
  return noteName(midi, useFlats) + (Math.floor(midi / 12) - 1);
}

/** イタリア音名(固定ド読み)— 固定ドとの対比表示に使う */
const FIXED_DO = ['ド', 'ド♯', 'レ', 'ミ♭', 'ミ', 'ファ', 'ファ♯', 'ソ', 'ラ♭', 'ラ', 'シ♭', 'シ'];
export function fixedDoName(midi) {
  return FIXED_DO[mod12(midi)];
}

/** midi → 周波数 (A4 = 442Hz: 合唱・オーケストラ実用ピッチ寄りではなく標準440を採用) */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 周波数 → 実数midi */
export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * 調のコンテキスト。
 * mode: 'major' | 'minor'
 * tonicPc: 主音のピッチクラス
 * 短調では「ド」= 平行長調の主音 (ラ基準読み) になる。
 */
export function makeKey(tonicPc, mode = 'major', useFlats = null) {
  const doPc = mode === 'minor' ? mod12(tonicPc + 3) : tonicPc;
  const table = mode === 'minor' ? MINOR_KEYS : MAJOR_KEYS;
  const found = table.find(k => k.pc === tonicPc);
  return {
    tonicPc, mode, doPc,
    name: found ? found.name : '',
    en: found ? found.en : '',
    useFlats: useFlats !== null ? useFlats : (found ? found.useFlats : false),
  };
}

/** その調の全音階に含まれるピッチクラス集合 */
export function scalePcs(key) {
  return new Set(DIATONIC_OFFSETS.map(o => mod12(key.doPc + o)));
}

/** 主音付近の快適な歌唱域に置いた主音midi (だいたい C4 前後) */
export function tonicMidiNear(key, center = 60) {
  let m = key.tonicPc + 60 - (60 % 12); // 同オクターブのtonic
  // centerに最も近いオクターブへ
  let best = m, bestD = Infinity;
  for (let cand = m - 12; cand <= m + 12; cand += 12) {
    const d = Math.abs(cand - center);
    if (d < bestD) { bestD = d; best = cand; }
  }
  return best;
}

/** カデンツ(和音進行)を返す: [[midi,...], ...]
 *  長調: I - IV - V - I / 短調: i - iv - V - i */
export function cadenceChords(key) {
  const t = tonicMidiNear(key, 58);
  if (key.mode === 'minor') {
    return [
      [t, t + 3, t + 7, t + 12],
      [t + 5, t + 8, t + 12, t + 17],
      [t - 5, t + 7, t + 11, t + 14],
      [t, t + 3, t + 7, t + 12],
    ];
  }
  return [
    [t, t + 4, t + 7, t + 12],
    [t + 5, t + 9, t + 12, t + 17],
    [t - 5, t + 7, t + 11, t + 14],
    [t, t + 4, t + 7, t + 12],
  ];
}

/* =========================================================
 * メロディ・ライブラリ
 * notes: [ドからの半音オフセット | null(休符), 拍数]
 * ========================================================= */
export const MELODIES = [
  {
    id: 'twinkle',
    title: 'きらきら星',
    origin: 'フランス民謡',
    tempo: 100,
    notes: [
      [0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],
      [5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2],
      [7,1],[7,1],[5,1],[5,1],[4,1],[4,1],[2,2],
      [7,1],[7,1],[5,1],[5,1],[4,1],[4,1],[2,2],
      [0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],
      [5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2],
    ],
  },
  {
    id: 'mary',
    title: 'メリーさんのひつじ',
    origin: 'アメリカ民謡',
    tempo: 112,
    notes: [
      [4,1],[2,1],[0,1],[2,1],[4,1],[4,1],[4,2],
      [2,1],[2,1],[2,2],
      [4,1],[7,1],[7,2],
      [4,1],[2,1],[0,1],[2,1],[4,1],[4,1],[4,1],[4,1],
      [2,1],[2,1],[4,1],[2,1],[0,4],
    ],
  },
  {
    id: 'frog',
    title: 'かえるのがっしょう',
    origin: 'ドイツ民謡',
    tempo: 116,
    notes: [
      [0,1],[2,1],[4,1],[5,1],[4,1],[2,1],[0,1],[null,1],
      [4,1],[5,1],[7,1],[9,1],[7,1],[5,1],[4,1],[null,1],
      [0,1],[null,1],[0,1],[null,1],[0,1],[null,1],[0,1],[null,1],
      [0,0.5],[0,0.5],[2,0.5],[2,0.5],[4,0.5],[4,0.5],[5,0.5],[5,0.5],
      [4,1],[2,1],[0,1],[null,1],
    ],
  },
  {
    id: 'ode',
    title: 'よろこびのうた',
    origin: 'ベートーヴェン「第九」',
    tempo: 108,
    notes: [
      [4,1],[4,1],[5,1],[7,1],[7,1],[5,1],[4,1],[2,1],
      [0,1],[0,1],[2,1],[4,1],[4,1.5],[2,0.5],[2,2],
      [4,1],[4,1],[5,1],[7,1],[7,1],[5,1],[4,1],[2,1],
      [0,1],[0,1],[2,1],[4,1],[2,1.5],[0,0.5],[0,2],
    ],
  },
  {
    id: 'london',
    title: 'ロンドン橋',
    origin: 'イギリス民謡',
    tempo: 108,
    notes: [
      [7,1.5],[9,0.5],[7,1],[5,1],[4,1],[5,1],[7,2],
      [2,1],[4,1],[5,2],[4,1],[5,1],[7,2],
      [7,1.5],[9,0.5],[7,1],[5,1],[4,1],[5,1],[7,2],
      [2,2],[7,2],[4,1],[0,3],
    ],
  },
];

/** ランダムに長調キーを返す */
export function randomMajorKey() {
  const k = MAJOR_KEYS[Math.floor(Math.random() * MAJOR_KEYS.length)];
  return makeKey(k.pc, 'major');
}

export function randomMinorKey() {
  const k = MINOR_KEYS[Math.floor(Math.random() * MINOR_KEYS.length)];
  return makeKey(k.pc, 'minor');
}
