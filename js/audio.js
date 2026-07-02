/* =========================================================
 * audio.js — Web Audio シンセエンジン
 * 依存ゼロ。あたたかい合唱練習向けトーンを合成する。
 * ========================================================= */

import { midiToFreq } from './theory.js';

let ctx = null;
let master = null;
let wet = null;
let droneNodes = null;

/** AudioContext を(ユーザー操作を契機に)初期化して返す */
export function audioCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain();
    master.gain.value = 0.9;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;

    // 生成インパルス応答による軽いホールリバーブ
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 1.6, 2.4);
    wet = ctx.createGain();
    wet.gain.value = 0.16;

    master.connect(comp);
    master.connect(convolver);
    convolver.connect(wet);
    wet.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function makeImpulse(ac, seconds, decay) {
  const rate = ac.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ac.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

/**
 * 1音を鳴らす。
 * @param {number} midi
 * @param {object} opts { dur, time, vel, vibrato }
 * @returns {number} 終了時刻(ctx時間)
 */
export function playNote(midi, opts = {}) {
  const ac = audioCtx();
  const dur = opts.dur ?? 0.8;
  const t0 = opts.time ?? ac.currentTime;
  const vel = opts.vel ?? 0.8;
  const freq = midiToFreq(midi);

  const g = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(Math.max(freq * 6, 1200), 6000);
  filter.Q.value = 0.5;

  const o1 = ac.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = freq;
  const o2 = ac.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = freq;
  o2.detune.value = 4;
  const g2 = ac.createGain();
  g2.gain.value = 0.45;

  // 長い音には歌声らしいゆるいビブラート
  let lfo = null, lfoGain = null;
  if ((opts.vibrato ?? true) && dur > 0.5) {
    lfo = ac.createOscillator();
    lfo.frequency.value = 5.2;
    lfoGain = ac.createGain();
    lfoGain.gain.setValueAtTime(0, t0);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.004, t0 + Math.min(0.5, dur * 0.5));
    lfo.connect(lfoGain);
    lfoGain.connect(o1.frequency);
    lfoGain.connect(o2.frequency);
    lfo.start(t0);
  }

  o1.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(filter);
  filter.connect(master);

  const a = 0.018, rel = 0.28;
  const peak = 0.32 * vel;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.setTargetAtTime(peak * 0.72, t0 + a, 0.25);
  const tEnd = t0 + dur;
  g.gain.setTargetAtTime(0, tEnd, rel / 4);

  const stopAt = tEnd + rel * 2;
  o1.start(t0); o2.start(t0);
  o1.stop(stopAt); o2.stop(stopAt);
  if (lfo) lfo.stop(stopAt);

  return tEnd;
}

/** 和音 */
export function playChord(midis, opts = {}) {
  const ac = audioCtx();
  const t0 = opts.time ?? ac.currentTime;
  const vel = (opts.vel ?? 0.75) / Math.sqrt(midis.length);
  let end = t0;
  for (const m of midis) {
    end = playNote(m, { ...opts, time: t0, vel, vibrato: false });
  }
  return end;
}

/** カデンツ(和音列)を順に鳴らし、終了時刻を返す */
export function playCadence(chords, opts = {}) {
  const ac = audioCtx();
  let t = (opts.time ?? ac.currentTime) + 0.03;
  const dur = opts.chordDur ?? 0.75;
  for (let i = 0; i < chords.length; i++) {
    playChord(chords[i], { time: t, dur: i === chords.length - 1 ? dur * 1.5 : dur, vel: 0.7 });
    t += dur * (i === chords.length - 1 ? 1.7 : 1.05);
  }
  return t;
}

/**
 * メロディ再生。タイマー駆動なので cancel() で以降の音を止められる。
 * @param {Array} notes  [[semitoneOffset|null, beats], ...]
 * @param {number} baseMidi ド のmidi
 * @param {number} bpm
 * @param {function} onStep (index) 各音の発音時に呼ばれる。終了時に -1
 * @returns {{end:number, cancel:function}}
 */
export function playMelody(notes, baseMidi, bpm, onStep) {
  const ac = audioCtx();
  const beat = 60 / bpm;
  const timers = [];
  let elapsed = 0.06;
  notes.forEach(([off, beats], i) => {
    const dur = beats * beat;
    timers.push(setTimeout(() => {
      if (off !== null) {
        playNote(baseMidi + off, { time: ac.currentTime + 0.02, dur: dur * 0.92, vel: 0.8 });
      }
      if (onStep) onStep(i);
    }, elapsed * 1000));
    elapsed += dur;
  });
  timers.push(setTimeout(() => { if (onStep) onStep(-1); }, elapsed * 1000));
  return {
    end: ac.currentTime + elapsed,
    cancel: () => timers.forEach(clearTimeout),
  };
}

/** ドローン(持続低音)の開始/停止 */
export function startDrone(midi) {
  stopDrone();
  const ac = audioCtx();
  const freq = midiToFreq(midi);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(0.14, ac.currentTime + 0.6);

  const oscs = [];
  [[1, 'sine', 0], [1, 'triangle', 3], [2, 'sine', -2]].forEach(([mult, type, det]) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq * mult;
    o.detune.value = det;
    const og = ac.createGain();
    og.gain.value = mult === 2 ? 0.12 : 0.5;
    o.connect(og);
    og.connect(g);
    o.start();
    oscs.push(o);
  });
  g.connect(master);
  droneNodes = { g, oscs };
}

export function stopDrone() {
  if (!droneNodes) return;
  const ac = audioCtx();
  const { g, oscs } = droneNodes;
  g.gain.setTargetAtTime(0, ac.currentTime, 0.15);
  oscs.forEach(o => o.stop(ac.currentTime + 0.8));
  droneNodes = null;
}

export function droneActive() {
  return !!droneNodes;
}

/** 正解/不正解のフィードバック音 */
export function playSuccess() {
  const ac = audioCtx();
  const t = ac.currentTime;
  playNote(84, { time: t, dur: 0.12, vel: 0.5, vibrato: false });
  playNote(88, { time: t + 0.09, dur: 0.12, vel: 0.5, vibrato: false });
  playNote(91, { time: t + 0.18, dur: 0.25, vel: 0.55, vibrato: false });
}

export function playFail() {
  const ac = audioCtx();
  const t = ac.currentTime;
  playNote(52, { time: t, dur: 0.22, vel: 0.4, vibrato: false });
  playNote(51, { time: t + 0.18, dur: 0.3, vel: 0.35, vibrato: false });
}
