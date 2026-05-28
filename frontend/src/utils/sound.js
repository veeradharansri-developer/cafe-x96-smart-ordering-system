// Synthesizes custom notifications natively in the browser without loading physical file assets.
// Resolves browser autoplay policies by creating/resuming audio context on user interaction.

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Pleasant high-end double chime (e.g. golden cafe ring)
export function playOrderChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First note (G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(783.99, now); // G5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second note (C6) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.50, now + 0.12); // C6
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (error) {
    console.log("Audio chime failed to play due to user interaction restrictions:", error);
  }
}

// Gentle triple pulsing tone to notify of client table calling help
export function playHelpAlert() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const playBeep = (time, pitch) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(pitch, time);
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.25);
    };

    playBeep(now, 587.33); // D5
    playBeep(now + 0.2, 659.25); // E5
    playBeep(now + 0.4, 880.00); // A5
  } catch (error) {
    console.log("Audio help call alert failed:", error);
  }
}
