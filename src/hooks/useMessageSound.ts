import { useRef, useCallback } from 'react';

/**
 * WhatsApp-style new message notification sound.
 * Uses the Web Audio API to generate a short two-tone chime,
 * avoiding the need for an external audio file.
 */
export function useMessageSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef(0);

  const playMessageSound = useCallback(() => {
    // Throttle: don't play more than once per 500ms
    const now = Date.now();
    if (now - lastPlayedRef.current < 500) return;
    lastPlayedRef.current = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;

      // First tone — short pop
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t); // A5
      gain1.gain.setValueAtTime(0.15, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.08);

      // Second tone — slightly higher
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1175, t + 0.06); // D6
      gain2.gain.setValueAtTime(0.12, t + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(t + 0.06);
      osc2.stop(t + 0.18);
    } catch {
      // Audio not available — ignore silently
    }
  }, []);

  return { playMessageSound };
}
