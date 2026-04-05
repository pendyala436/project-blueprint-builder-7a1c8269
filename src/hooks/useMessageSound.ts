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

      // WhatsApp-style notification: louder, richer two-tone pop
      // First tone — bright pop
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(860, t);
      gain1.gain.setValueAtTime(0.45, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.12);

      // Second tone — higher, slightly softer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, t + 0.08);
      gain2.gain.setValueAtTime(0.35, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(t + 0.08);
      osc2.stop(t + 0.25);
    } catch {
      // Audio not available — ignore silently
    }
  }, []);

  return { playMessageSound };
}
