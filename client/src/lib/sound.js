// Tiny WebAudio synth for the Live Draw (no audio files to ship). Browsers only allow audio after a
// user gesture, so call `sound.unlock()` from the click that starts the draw.
let ctx = null;
let tickTimer = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, duration, { type = 'sine', gain = 0.08, when = 0 } = {}) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sound = {
  unlock() {
    audio();
  },
  startTicks() {
    sound.stopTicks();
    let n = 0;
    tickTimer = setInterval(() => tone(820 + (n++ % 4) * 90, 0.035, { type: 'square', gain: 0.025 }), 85);
  },
  stopTicks() {
    clearInterval(tickTimer);
    tickTimer = null;
  },
  click() {
    tone(520, 0.1, { type: 'triangle', gain: 0.14 });
  },
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.55, { type: 'triangle', gain: 0.13, when: i * 0.12 }));
    tone(1318.5, 1.1, { gain: 0.1, when: 0.5 });
  },
};
