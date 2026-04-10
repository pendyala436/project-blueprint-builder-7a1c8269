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

      // WhatsApp-style notification: loud, rich three-tone chime
      // First tone — strong bass pop
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(780, t);
      gain1.gain.setValueAtTime(0.8, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.18);

      // Second tone — bright mid
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, t + 0.07);
      gain2.gain.setValueAtTime(0.7, t + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(t + 0.07);
      osc2.stop(t + 0.28);

      // Third tone — high shimmer
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1560, t + 0.14);
      gain3.gain.setValueAtTime(0.55, t + 0.14);
      gain3.gain.exponentialRampToValueAtTime(0.01, t + 0.38);
      osc3.connect(gain3).connect(ctx.destination);
      osc3.start(t + 0.14);
      osc3.stop(t + 0.38);
    } catch {
      // Audio not available — ignore silently
    }
  }, []);

  return { playMessageSound };
}
