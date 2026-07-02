/* =========================================================
 * pitch.js — マイク入力のリアルタイム音高検出
 * 自己相関法 (ACF2+)。合唱の歌声(約70Hz〜1100Hz)に最適化。
 * ========================================================= */

import { audioCtx } from './audio.js';

let stream = null;
let analyser = null;
let source = null;
let rafId = null;
let buf = null;

/** マイクを起動して検出ループを開始する。
 * @param {function} onPitch (freq|null, clarity) 毎フレーム呼ばれる
 * @returns {Promise<boolean>} 起動できたか
 */
export async function startPitchDetection(onPitch) {
  const ac = audioCtx();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
  } catch (err) {
    return false;
  }
  source = ac.createMediaStreamSource(stream);
  analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  buf = new Float32Array(analyser.fftSize);

  const loop = () => {
    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, ac.sampleRate);
    onPitch(freq > 0 ? freq : null);
    rafId = requestAnimationFrame(loop);
  };
  loop();
  return true;
}

export function stopPitchDetection() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (source) source.disconnect();
  source = null;
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null;
}

export function pitchActive() {
  return !!stream;
}

/* ACF2+ 自己相関アルゴリズム */
function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return -1; // 無音

  // 端の無音をトリム
  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; } else break;
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; } else break;
  const sliced = buf.slice(r1, r2);
  const N = sliced.length;
  if (N < 128) return -1;

  const c = new Float32Array(N);
  for (let lag = 0; lag < N; lag++) {
    let sum = 0;
    for (let i = 0; i < N - lag; i++) sum += sliced[i] * sliced[i + lag];
    c[lag] = sum;
  }

  let d = 0;
  while (d < N - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < N; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  if (maxpos <= 0) return -1;
  let T0 = maxpos;

  // 放物線補間でサブサンプル精度に
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] ?? x2;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const freq = sampleRate / T0;
  if (freq < 60 || freq > 1200) return -1;
  return freq;
}
