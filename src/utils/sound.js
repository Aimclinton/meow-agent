import { create } from 'zustand';

const KEY = 'meow-sound';
const read = () => { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } };

export const useSound = create((set) => ({
  on: read(),
  toggle: () => set((s) => {
    const on = !s.on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
    if (on) meow(true);
    return { on };
  }),
}));

let ctx;

// A soft, bright "เมี๊ยว~" synthesised with Web Audio (no audio file needed).
export function meow(force = false) {
  if (!force && !useSound.getState().on) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.02;
    const dur = 0.55;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    // "mi-" rises, "-aow" falls
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(430, t + dur);

    // vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = 12;
    lfo.connect(lfoGain).connect(osc.frequency);

    // vowel-ish formant: "ee" → "ow"
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 6;
    formant.frequency.setValueAtTime(2400, t);
    formant.frequency.exponentialRampToValueAtTime(1100, t + dur);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
    gain.gain.setValueAtTime(0.14, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(formant).connect(lowpass).connect(gain).connect(ctx.destination);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  } catch {
    /* audio not available */
  }
}
