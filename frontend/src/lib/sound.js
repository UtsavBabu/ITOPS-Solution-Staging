// Tiny synthesized-tone player — no audio files to source, host, or add to
// the bundle. A handful of short, subtle oscillator tones covering the
// interactions that already exist in the app (toast success/error, command
// palette navigate/select, copy-to-clipboard, quiz pass). Every sound is
// under 250ms and quiet by design — this is a UI micro-cue, not a jingle.

let ctx = null;
function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!ctx) ctx = new AudioContextClass();
  // Browsers suspend a freshly-created AudioContext until a user gesture —
  // every call site here only ever runs inside a click/keydown handler, so
  // this resume is synchronous-enough to not be audibly late.
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, { duration = 0.12, type = "sine", gain = 0.05, delay = 0, glideTo = null } = {}) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const start = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

const SOUNDS = {
  // Soft two-note upward chime — success toast, quiz pass, copy confirmed.
  success: () => { tone(660, { duration: 0.09, gain: 0.045 }); tone(880, { duration: 0.16, gain: 0.05, delay: 0.07 }); },
  // A single low, short buzz — error toast, form validation failure.
  error: () => tone(180, { duration: 0.16, type: "square", gain: 0.035 }),
  // Barely-there tick — command palette / list navigation.
  tick: () => tone(1200, { duration: 0.03, gain: 0.02 }),
  // Slightly brighter click — selecting/opening a command palette result.
  select: () => tone(760, { duration: 0.07, gain: 0.04, glideTo: 1000 }),
  // Neutral info toast.
  info: () => tone(520, { duration: 0.1, gain: 0.035 })
};

export function playSound(name) {
  try {
    SOUNDS[name]?.();
  } catch {
    // Audio is a nicety, never worth surfacing an error over.
  }
}
