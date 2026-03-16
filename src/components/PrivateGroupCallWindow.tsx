import { classifyError, ERROR_MESSAGES, logError } from "@/lib/errors";
/**
 * PrivateGroupCallWindow
 * 
 * Live-stream style private group call UI with:
 * - Full-screen host video
 * - Floating danmu/bullet chat comments overlaying the video
 * - Emoji/like reactions bubbling up
 * - Animated gift overlays on screen
 * - 30-minute timer countdown
 * - 50 participant limit
 * - Refund handling when host ends early
 * - One extension per month with reason
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio, Loader2,
  X, Send, Maximize2, Minimize2, Clock, Gift, DollarSign, Heart
} from 'lucide-react';
import { usePrivateGroupCall, MAX_PARTICIPANTS } from '@/hooks/usePrivateGroupCall';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Types ───────────────────────────────────────────────────────

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  createdAt: number;
  isSelf: boolean;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  left: number; // percentage from left
  createdAt: number;
}

interface AnimatedGift {
  id: string;
  senderName: string;
  emoji: string;
  name: string;
  price: number;
  createdAt: number;
}

interface ExtensionRecord {
  month: number;
  year: number;
  used: boolean;
  reason?: string;
}

interface PrivateGroupCallWindowProps {
  group: {
    id: string;
    name: string;
    participant_count: number;
    is_live: boolean;
    stream_id: string | null;
    access_type: string;
    min_gift_amount: number;
    owner_id: string;
  };
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
  onClose: () => void;
  isOwner: boolean;
  preAcquiredStream?: MediaStream | null;
}

// ─── Quick Emoji Reactions ───────────────────────────────────────
const QUICK_EMOJIS = ['❤️', '🔥', '😂', '👏', '😍', '🎉'];

// ─── Component ───────────────────────────────────────────────────

export function PrivateGroupCallWindow({
  group,
  currentUserId,
  userName,
  userPhoto,
  onClose,
  isOwner,
  preAcquiredStream = null,
}: PrivateGroupCallWindowProps) {
  // Comment input
  const [commentText, setCommentText] = useState('');

  // Chat messages & overlays
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [animatedGifts, setAnimatedGifts] = useState<AnimatedGift[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // UI state
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(isOwner);
  const isStoppingRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  // Extension state
  const [canExtendThisMonth, setCanExtendThisMonth] = useState(true);

  const hasVideo = group.access_type === 'video' || group.access_type === 'both';

  const getParticipantName = (userId: string): string => {
    if (userId === currentUserId) return userName;
    if (userId === group.owner_id) {
      const host = participants.find(p => p.isOwner);
      return host?.name || 'Host';
    }
    const participant = participants.find(p => p.id === userId);
    return participant?.name || 'Participant';
  };

  // Enhanced group call hook
  const {
    isConnecting,
    isConnected,
    isLive,
    participants,
    viewerCount,
    error,
    remainingTime,
    totalEarnings,
    isRefunding,
    localVideoRef,
    remoteVideoRef,
    hostStream,
    goLive,
    joinStream,
    endStream,
    toggleVideo,
    toggleAudio,
    cleanup,
  } = usePrivateGroupCall({
    groupId: group.id,
    groupName: group.name,
    currentUserId,
    userName,
    userPhoto,
    isOwner,
    giftAmountRequired: group.min_gift_amount,
    preAcquiredStream,
    onParticipantJoin: (participant) => {
      toast.success(`${participant.name} joined`);
    },
    onParticipantLeave: (participantId, reason) => {
      if (reason === 'insufficient_balance') {
        toast.info('A participant was removed (insufficient balance)');
      } else {
        toast.info('A participant left');
      }
    },
    onSessionEnd: (refunded) => {
      if (refunded && !isOwner) {
        toast.success('Call ended by host. Unused balance has been refunded.');
      }
    },
  });

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Floating Comment (Danmu / Bullet Chat) ─────────────────────

  const addFloatingComment = useCallback((senderName: string, text: string) => {
    const id = `comment-${Date.now()}-${Math.random()}`;
    const top = Math.floor(Math.random() * 60) + 10; // 10% to 70%
    setFloatingComments(prev => [...prev.slice(-30), { id, senderName, text, top, createdAt: Date.now() }]);
    // Also add to recent messages stack (visible at bottom-left)
    const msgId = `msg-${Date.now()}-${Math.random()}`;
    setRecentMessages(prev => [...prev.slice(-8), { id: msgId, senderName, text, createdAt: Date.now() }]);
    // Auto-remove danmu after animation
    setTimeout(() => {
      setFloatingComments(prev => prev.filter(c => c.id !== id));
    }, 8000);
    // Auto-remove from recent messages after 15 seconds
    setTimeout(() => {
      setRecentMessages(prev => prev.filter(m => m.id !== msgId));
    }, 15000);
  }, []);

  // ─── Floating Emoji Reaction ─────────────────────────────────────

  const addFloatingReaction = useCallback((emoji: string) => {
    const id = `reaction-${Date.now()}-${Math.random()}`;
    const left = 75 + Math.random() * 20; // cluster on the right side
    setFloatingReactions(prev => [...prev.slice(-20), { id, emoji, left, createdAt: Date.now() }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  }, []);

  // ─── Animated Gift Overlay ──────────────────────────────────────

  const addAnimatedGift = useCallback((senderName: string, gift: GiftItem) => {
    const id = `gift-${Date.now()}`;
    setAnimatedGifts(prev => [...prev.slice(-5), { id, senderName, emoji: gift.emoji, name: gift.name, price: gift.price, createdAt: Date.now() }]);
    // Gift animation lasts longer for expensive gifts
    const duration = Math.min(8000, 3000 + gift.price * 30);
    setTimeout(() => {
      setAnimatedGifts(prev => prev.filter(g => g.id !== id));
    }, duration);
  }, []);

  // ─── Realtime: Listen for group_messages as floating comments ───

  useEffect(() => {
    const channel = supabase
      .channel(`danmu-${group.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${group.id}`
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== currentUserId) {
          const name = getParticipantName(msg.sender_id);
          addFloatingComment(name, msg.message || '');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [group.id, currentUserId, addFloatingComment]);

  // Extension check
  useEffect(() => {
    const now = new Date();
    const storageKey = `extension_${currentUserId}_${group.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const record: ExtensionRecord = JSON.parse(stored);
      if (record.month === now.getMonth() && record.year === now.getFullYear() && record.used) {
        setCanExtendThisMonth(false);
      }
    }
  }, [currentUserId, group.id]);

  // Auto-start
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    if (isOwner && !isConnected && !isConnecting && !isLive) {
      hasAutoStarted.current = true;
      goLive().then(success => {
        if (!success) {
          toast.error('Failed to go live. Please try again.');
          onClose();
        }
      }).catch(() => {
        toast.error('Failed to go live. Please try again.');
        onClose();
      });
    } else if (hasVideo && !isOwner && group.is_live && !isConnected && !isConnecting) {
      hasAutoStarted.current = true;
      joinStream();
    }
  }, [isOwner, group.is_live, isConnected, isConnecting, joinStream, hasVideo, goLive, isLive]);

  // Attach host stream
  useEffect(() => {
    if (hostStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = hostStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [hostStream]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Fetch gifts
  useEffect(() => {
    const fetchGifts = async () => {
      const { data } = await supabase
        .from('gifts')
        .select('id, name, emoji, price')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (data) setGifts(data);
    };
    fetchGifts();
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    const { moderateMessage } = await import('@/lib/content-moderation');
    const moderationResult = moderateMessage(commentText.trim());
    if (moderationResult.isBlocked) {
      toast.error(moderationResult.reason || 'This message contains prohibited content.');
      return;
    }

    const text = commentText.trim();
    setCommentText('');

    // Optimistic: show own comment immediately as danmu
    addFloatingComment(userName, text);

    // Persist to DB (fire-and-forget)
    supabase
      .from('group_messages')
      .insert({ group_id: group.id, sender_id: currentUserId, message: text })
      .then(({ error }) => { if (error) console.error('Failed to send comment', error); });
  };

  const handleSendReaction = (emoji: string) => {
    addFloatingReaction(emoji);
    // Persist as a group message so others see it
    supabase
      .from('group_messages')
      .insert({ group_id: group.id, sender_id: currentUserId, message: emoji })
      .then(({ error }) => { if (error) console.error('Failed to send reaction', error); });
  };

  const handleSendGift = async (gift: GiftItem) => {
    try {
      const { data, error } = await supabase.rpc('process_group_tip', {
        p_sender_id: currentUserId,
        p_group_id: group.id,
        p_gift_id: gift.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (result.success) {
        addAnimatedGift(userName, gift);
        toast.success(`${gift.emoji} Gift sent!`);
        setShowGiftDialog(false);
      } else {
        toast.error(result.error || 'Failed to send gift');
      }
    } catch (error: any) {
      toast.error('Gift not sent', { description: classifyError(error, 'send the gift').message });
    }
  };

  const handleGoLive = async () => {
    const success = await goLive();
    if (success) toast.success('You are now live!');
  };

  const handleEndStream = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try { await endStream(true); } catch (err) { console.error(err); }
    toast.success('Stream ended');
    onClose();
  };

  const handleToggleVideo = () => {
    if (!isOwner) return;
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    toggleVideo(newState);
  };

  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    toggleAudio(newState);
  };

  const handleClose = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      if (isOwner && isLive) { await endStream(true); } else { cleanup(); }
    } catch (err) {
      console.error(err);
    }
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className={cn(
      "fixed z-50 bg-black flex flex-col overflow-hidden select-none",
      isFullscreen
        ? "inset-0"
        : "bottom-4 right-4 w-[900px] h-[650px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] rounded-2xl shadow-2xl border border-white/10"
    )}>
      {/* ─── Video Layer (Full Background) ───────────────────────── */}
      <div className="absolute inset-0">
        {isOwner ? (
          <div className="relative w-full h-full">
            <video
              ref={localVideoRef}
              autoPlay muted playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Avatar className="h-28 w-28 ring-4 ring-white/20">
                  <AvatarImage src={userPhoto || undefined} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent">{userName[0]}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full">
            {isConnected && hostStream ? (
              <video
                ref={(el) => {
                  if (el) {
                    if (remoteVideoRef && 'current' in remoteVideoRef) {
                      (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                    }
                    if (hostStream && el.srcObject !== hostStream) {
                      el.srcObject = hostStream;
                      el.play().catch(() => {});
                    }
                  }
                }}
                autoPlay playsInline muted={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Avatar className="h-28 w-28 mx-auto mb-4 ring-4 ring-white/20">
                    <AvatarImage src={participants.find(p => p.isOwner)?.photo} />
                    <AvatarFallback className="text-4xl">{participants.find(p => p.isOwner)?.name?.[0] || 'H'}</AvatarFallback>
                  </Avatar>
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-gray-400 mt-3">Connecting to host...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Gradient Overlays for Readability ────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

      {/* ─── Top Bar (Over Video) ─────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Host avatar + name */}
          <Avatar className="h-9 w-9 ring-2 ring-red-500">
            <AvatarImage src={isOwner ? (userPhoto || undefined) : participants.find(p => p.isOwner)?.photo} />
            <AvatarFallback className="text-xs bg-red-600 text-white">
              {isOwner ? userName[0] : (participants.find(p => p.isOwner)?.name?.[0] || 'H')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{group.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isLive && (
                <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4 gap-0.5 border-0">
                  <Radio className="h-2.5 w-2.5 animate-pulse" /> LIVE
                </Badge>
              )}
              <span className="text-white/70 text-[11px] flex items-center gap-0.5">
                <Users className="h-3 w-3" /> {viewerCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive && (
            <Badge variant="outline" className="text-white/90 border-white/30 bg-black/40 text-[11px] gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(remainingTime)}
            </Badge>
          )}
          {isOwner && totalEarnings > 0 && (
            <Badge className="bg-green-600/90 text-white text-[11px] gap-1 border-0">
              <DollarSign className="h-3 w-3" /> ₹{totalEarnings.toFixed(0)}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── Floating Danmu Comments (Bullet Chat) ────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
        {floatingComments.map((comment) => (
          <div
            key={comment.id}
            className="absolute whitespace-nowrap animate-danmu"
            style={{ top: `${comment.top}%`, left: '100%' }}
          >
            <span className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm shadow-lg border border-white/10">
              <span className="text-amber-400 font-bold text-xs">{comment.senderName}</span>
              <span className="text-white/95">{comment.text}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute animate-float-up"
            style={{ left: `${reaction.left}%`, bottom: '15%' }}
          >
            <span className="text-3xl drop-shadow-lg">{reaction.emoji}</span>
          </div>
        ))}
      </div>

      {/* ─── Animated Gift Overlay (Center Screen) ────────────────── */}
      {animatedGifts.map((gift) => (
        <div
          key={gift.id}
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-gift-entrance"
        >
          <div className="flex flex-col items-center gap-2 animate-gift-pulse">
            <span className="text-8xl drop-shadow-2xl">{gift.emoji}</span>
            <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-2 text-center">
              <p className="text-white font-bold text-lg">{gift.senderName}</p>
              <p className="text-amber-400 text-sm font-medium">sent {gift.name} • ₹{gift.price}</p>
            </div>
          </div>
        </div>
      ))}

      {/* ─── Recent Messages Stack (Bottom-Left, always visible) ──── */}
      <div className="absolute bottom-48 left-4 z-20 max-w-[55%] space-y-1.5 pointer-events-none">
        {recentMessages.map((msg) => (
          <div key={msg.id} className="animate-in slide-in-from-left-4 fade-in duration-300">
            <div className="inline-flex items-start gap-1.5 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-1.5 max-w-full">
              <span className="text-amber-400 font-bold text-xs shrink-0">{msg.senderName}:</span>
              <span className="text-white text-xs break-words">{msg.text}</span>
            </div>
          </div>
        ))}
        {/* Participant count for host */}
        {isOwner && participants.filter(p => !p.isOwner).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {participants.filter(p => !p.isOwner).map((p) => (
              <Badge key={p.id} className="text-[9px] bg-black/50 text-white/80 border-0 backdrop-blur-sm gap-0.5 h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {p.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* ─── Bottom Controls (Over Video) ─────────────────────────── */}
      <div className="relative z-20 mt-auto">
        {/* Comment Input + Emoji Bar */}
        <div className="px-4 pb-2">
          {/* Quick Emoji Reactions */}
          {showEmojiBar && (
            <div className="flex items-center gap-2 mb-2 animate-in slide-in-from-bottom-2 duration-200">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="text-2xl hover:scale-125 active:scale-95 transition-transform bg-black/40 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Comment input */}
            <div className="flex-1 flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                placeholder="Say something..."
                className="border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 h-7 px-0 text-sm"
              />
              {commentText.trim() && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-primary hover:bg-white/10 shrink-0"
                  onClick={handleSendComment}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Like / Reaction toggle */}
            <button
              onClick={() => {
                if (!showEmojiBar) handleSendReaction('❤️');
                setShowEmojiBar(prev => !prev);
              }}
              className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/25 active:scale-90 transition-all"
            >
              <Heart className="h-5 w-5 text-red-400 fill-red-400" />
            </button>

            {/* Gift button — all connected participants (men) can send gifts to host */}
            {!isOwner && (isConnected || isLive) && (
              <button
                onClick={() => setShowGiftDialog(true)}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/80 to-orange-600/80 backdrop-blur-md border border-white/20 flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-lg shadow-orange-500/30"
              >
                <Gift className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Media Controls Bar */}
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-black/60 backdrop-blur-md">
          {isConnecting && (
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </div>
          )}

          {isRefunding && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing refunds...
            </div>
          )}

          {isOwner && (
            <Button
              variant={isVideoEnabled ? 'secondary' : 'destructive'}
              size="sm"
              onClick={handleToggleVideo}
              disabled={isConnecting}
              className="rounded-full h-10 w-10 p-0"
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
          )}

          <Button
            variant={isAudioEnabled ? 'secondary' : 'destructive'}
            size="sm"
            onClick={handleToggleAudio}
            disabled={isConnecting}
            className="rounded-full h-10 w-10 p-0"
            title={isOwner ? 'Toggle mic' : (isAudioEnabled ? 'Mute' : 'Unmute to speak')}
          >
            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>

          {isOwner && (
            <>
              {!isLive && !isConnected ? (
                <Button
                  size="sm"
                  onClick={handleGoLive}
                  className="gap-1.5 rounded-full px-5 bg-red-600 hover:bg-red-700"
                  disabled={isConnecting}
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                  Go Live
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleEndStream(); }}
                  className="gap-1.5 rounded-full px-5"
                  disabled={isRefunding}
                >
                  <PhoneOff className="h-4 w-4" /> End
                </Button>
              )}
            </>
          )}

          {!isOwner && isConnected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              className="gap-1.5 rounded-full px-5"
            >
              <PhoneOff className="h-4 w-4" /> Leave
            </Button>
          )}
        </div>
      </div>

      {/* ─── Gift Dialog ──────────────────────────────────────────── */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" /> Send a Gift to Host
            </DialogTitle>
            <DialogDescription>
              You pay the full gift price. The host earns 50% of every gift.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 py-4">
            {gifts.slice(0, 12).map((gift) => (
              <button
                key={gift.id}
                onClick={() => handleSendGift(gift)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent hover:border-primary/50 transition-all hover:scale-105 active:scale-95"
              >
                <span className="text-3xl">{gift.emoji}</span>
                <span className="text-xs font-medium text-foreground">{gift.name}</span>
                <span className="text-xs font-bold text-destructive">₹{gift.price}</span>
                <span className="text-[10px] text-muted-foreground">Host gets ₹{(gift.price / 2).toFixed(0)}</span>
              </button>
            ))}
            {gifts.length === 0 && (
              <div className="col-span-3 text-center py-6 text-muted-foreground">
                <p>No gifts available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PrivateGroupCallWindow;
