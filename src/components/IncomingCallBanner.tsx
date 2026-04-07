import { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface IncomingCallBannerProps {
  callerName: string;
  callerPhoto: string | null;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallBanner = ({
  callerName, callerPhoto, callType, onAccept, onDecline,
}: IncomingCallBannerProps) => {
  const ringRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const playRing = () => {
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      [0, 0.4].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 480;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.3);
      });
    } catch {}
  };

  useEffect(() => {
    playRing();
    ringRef.current = setInterval(playRing, 2000);
    return () => {
      if (ringRef.current) clearInterval(ringRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 flex flex-col items-center justify-between py-20">
      <div className="flex flex-col items-center gap-4">
        <p className="text-white/60 text-sm uppercase tracking-wider">
          Incoming {callType} call
        </p>
        <Avatar className="h-28 w-28 border-4 border-white/20 shadow-2xl">
          <AvatarImage src={callerPhoto || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
            {callerName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-white text-3xl font-semibold">{callerName}</h2>
      </div>

      <div className="flex justify-around w-full max-w-xs">
        {/* Decline */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onDecline}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-pulse"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <span className="text-white/60 text-xs">Decline</span>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-pulse"
          >
            <Phone className="w-7 h-7 text-white" />
          </button>
          <span className="text-white/60 text-xs">Accept</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallBanner;
