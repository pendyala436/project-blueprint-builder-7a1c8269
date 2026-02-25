/**
 * PrivateGroupCallWindow
 * 
 * Enhanced private group call UI with:
 * - Host-only video display (participants see only host)
 * - Participants can speak (audio disabled by default, can enable) and chat
 * - 30-minute timer countdown
 * - Optional gift sending during call (no restrictions after joining)
 * - Gift tickets display based on price for 1 minute
 * - 50 participant limit
 * - Refund handling when host ends early
 * - One extension per month with reason
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Users, Radio, Loader2,
  X, Send, Paperclip, File, MessageCircle, Maximize2, Minimize2,
  Clock, Gift, DollarSign, AlertTriangle, Ticket, Timer
} from 'lucide-react';
import { usePrivateGroupCall, MAX_PARTICIPANTS } from '@/hooks/usePrivateGroupCall';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface GroupMessage {
  id: string;
  sender_id: string;
  message: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  created_at: string;
}

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

interface GiftTicket {
  id: string;
  senderName: string;
  giftEmoji: string;
  giftName: string;
  price: number;
  expiresAt: number;
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
}

export function PrivateGroupCallWindow({
  group,
  currentUserId,
  userName,
  userPhoto,
  onClose,
  isOwner
}: PrivateGroupCallWindowProps) {
  // Chat state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI state
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(isOwner); // Host has mic on by default, participants off
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  // View mode: show both panels, video only, or chat only
  const [viewMode, setViewMode] = useState<'both' | 'video' | 'chat'>('video'); // Default to video only, chat hidden
  
  // Gift tickets display (shows for 1 minute at top)
  const [giftTickets, setGiftTickets] = useState<GiftTicket[]>([]);
  
  // Extension state
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');
  const [canExtendThisMonth, setCanExtendThisMonth] = useState(true);
  const [isExtending, setIsExtending] = useState(false);

  const hasChat = group.access_type === 'chat' || group.access_type === 'both';
  const hasVideo = group.access_type === 'video' || group.access_type === 'both';
  
  // Determine what's actually shown based on viewMode and access_type
  const showVideo = hasVideo && (viewMode === 'both' || viewMode === 'video');
  const showChat = hasChat && (viewMode === 'both' || viewMode === 'chat');

  // Helper to get participant name by user ID
  // Men see other men's real names in chat. Host sees everything.
  const getParticipantName = (userId: string): string => {
    if (userId === currentUserId) return userName;
    if (userId === group.owner_id) {
      const host = participants.find(p => p.isOwner);
      return host?.name || 'Host';
    }
    const participant = participants.find(p => p.id === userId);
    return participant?.name || 'Participant';
  };

  const getParticipantPhoto = (userId: string): string | undefined => {
    if (userId === currentUserId) return userPhoto || undefined;
    const participant = participants.find(p => p.id === userId);
    return participant?.photo;
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
      onClose();
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
  

  // Calculate ticket display length based on price (min 5s, max 60s based on price)
  const getTicketDisplayDuration = (price: number): number => {
    // Scale: ₹10 = 5s, ₹120 = 60s
    const minDuration = 5000;
    const maxDuration = 60000;
    const minPrice = 10;
    const maxPrice = 120;
    
    if (price <= minPrice) return minDuration;
    if (price >= maxPrice) return maxDuration;
    
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return Math.floor(minDuration + (maxDuration - minDuration) * ratio);
  };

  // Add gift ticket to display
  const addGiftTicket = (senderName: string, gift: GiftItem) => {
    const ticketId = `ticket-${Date.now()}`;
    const displayDuration = getTicketDisplayDuration(gift.price);
    
    const newTicket: GiftTicket = {
      id: ticketId,
      senderName,
      giftEmoji: gift.emoji,
      giftName: gift.name,
      price: gift.price,
      expiresAt: Date.now() + displayDuration,
    };
    
    setGiftTickets(prev => [newTicket, ...prev]);
    
    // Auto-remove after display duration
    setTimeout(() => {
      setGiftTickets(prev => prev.filter(t => t.id !== ticketId));
    }, displayDuration);
  };

  // Check extension eligibility for this month
  useEffect(() => {
    const checkExtensionEligibility = async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Check local storage for extension record
      const storageKey = `extension_${currentUserId}_${group.id}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const record: ExtensionRecord = JSON.parse(stored);
        if (record.month === currentMonth && record.year === currentYear && record.used) {
          setCanExtendThisMonth(false);
        }
      }
    };
    
    checkExtensionEligibility();
  }, [currentUserId, group.id]);

  // Clean up expired tickets periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setGiftTickets(prev => prev.filter(t => t.expiresAt > now));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch messages
  useEffect(() => {
    if (hasChat) {
      fetchMessages();
      
      const channel = supabase
        .channel(`private-group-chat-${group.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${group.id}`
        }, (payload) => {
          const newMsg = payload.new as GroupMessage;
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [group.id, hasChat]);

  // Auto-start: host auto-goes-live, participants auto-join
  useEffect(() => {
    if (isOwner && !isConnected && !isConnecting && !isLive) {
      goLive();
    } else if (hasVideo && !isOwner && group.is_live && !isConnected && !isConnecting) {
      joinStream();
    }
  }, [isOwner, group.is_live, isConnected, isConnecting, joinStream, hasVideo, goLive, isLive]);

  // Attach host stream to video element when both are available
  useEffect(() => {
    if (hostStream && remoteVideoRef.current) {
      console.log('[PrivateGroupCallWindow] useEffect: Attaching hostStream to video element');
      remoteVideoRef.current.srcObject = hostStream;
      remoteVideoRef.current.play().catch(e => console.warn('[PrivateGroupCallWindow] play() failed:', e));
    }
  }, [hostStream]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Fetch gifts for optional sending
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

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    // Content moderation - block phone numbers, emails, social media
    const { moderateMessage } = await import('@/lib/content-moderation');
    const moderationResult = moderateMessage(newMessage.trim());
    if (moderationResult.isBlocked) {
      toast.error(moderationResult.reason || 'This message contains prohibited content.');
      return;
    }

    setIsSending(true);
    try {
      await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          sender_id: currentUserId,
          message: newMessage.trim()
        });

      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setIsSending(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${group.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-files')
        .getPublicUrl(filePath);

      await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          sender_id: currentUserId,
          message: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name
        });

      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendGift = async (gift: GiftItem) => {
    // Optional tip - 50% goes to host, 50% to admin
    try {
      const { data, error } = await supabase.rpc('process_group_tip' as any, {
        p_sender_id: currentUserId,
        p_group_id: group.id,
        p_gift_id: gift.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (result.success) {
        // Add gift ticket to display
        addGiftTicket(userName, gift);
        
        // Broadcast tip to all participants
        toast.success(`${gift.emoji} Tip sent to host! (50% reaches host)`);
        setShowGiftDialog(false);
      } else {
        toast.error(result.error || 'Failed to send tip');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send tip');
    }
  };

  // Handle time extension request (once per month)
  const handleRequestExtension = async () => {
    if (!canExtendThisMonth) {
      toast.error('You have already used your monthly extension for this group');
      return;
    }
    
    if (!extensionReason.trim()) {
      toast.error('Please provide a reason for the extension');
      return;
    }
    
    if (extensionReason.trim().length < 10) {
      toast.error('Please provide a more detailed reason (at least 10 characters)');
      return;
    }
    
    setIsExtending(true);
    
    try {
      // Record extension usage
      const now = new Date();
      const extensionRecord: ExtensionRecord = {
        month: now.getMonth(),
        year: now.getFullYear(),
        used: true,
        reason: extensionReason.trim()
      };
      
      const storageKey = `extension_${currentUserId}_${group.id}`;
      localStorage.setItem(storageKey, JSON.stringify(extensionRecord));
      
      // Here you would typically also save to database and process the extension
      // For now, we'll just mark it as used
      
      setCanExtendThisMonth(false);
      setShowExtensionDialog(false);
      setExtensionReason('');
      toast.success('Extension request submitted. Your time has been extended by 1 day.');
    } catch (error) {
      toast.error('Failed to process extension request');
    } finally {
      setIsExtending(false);
    }
  };

  const handleGoLive = async () => {
    const success = await goLive();
    if (success) {
      toast.success('You are now live!');
    }
  };

  const handleEndStream = async () => {
    setShowEndConfirm(false);
    await endStream(true); // Process refunds
    toast.success('Stream ended');
  };

  const handleToggleVideo = () => {
    if (!isOwner) return; // Only host can toggle video
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    toggleVideo(newState);
  };

  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    toggleAudio(newState);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const renderFileMessage = (msg: GroupMessage) => {
    if (!msg.file_url) return null;
    
    const isImage = msg.file_type?.startsWith('image/');
    const isVideo = msg.file_type?.startsWith('video/');
    const isAudio = msg.file_type?.startsWith('audio/');

    if (isImage) {
      return (
        <img 
          src={msg.file_url} 
          alt={msg.file_name || 'Image'} 
          className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90"
          onClick={() => window.open(msg.file_url!, '_blank')}
        />
      );
    }

    if (isVideo) {
      return <video src={msg.file_url} controls className="max-w-full max-h-48 rounded-lg" />;
    }

    if (isAudio) {
      return <audio src={msg.file_url} controls className="w-full" />;
    }

    return (
      <a 
        href={msg.file_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted"
      >
        <File className="h-5 w-5 text-primary" />
        <span className="text-sm truncate">{msg.file_name || 'Download file'}</span>
      </a>
    );
  };

  return (
    <div className={cn(
      "fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden",
      isFullscreen 
        ? "inset-4" 
        : "bottom-4 right-4 w-[900px] h-[650px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{group.name}</h3>
          {isLive && (
            <Badge variant="destructive" className="gap-1">
              <Radio className="h-3 w-3 animate-pulse" />
              LIVE
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {viewerCount}/{MAX_PARTICIPANTS}
          </Badge>
          {isLive && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(remainingTime)}
            </Badge>
          )}
          {isOwner && totalEarnings > 0 && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <DollarSign className="h-3 w-3" />
              ₹{totalEarnings.toFixed(0)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggles - only when both chat and video are available */}
          {hasVideo && hasChat && (
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button 
                variant={viewMode === 'video' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none h-7 px-2 text-xs"
                onClick={() => setViewMode(viewMode === 'video' ? 'both' : 'video')}
                title="Video only"
              >
                <Video className="h-3 w-3" />
              </Button>
              <Button 
                variant={viewMode === 'both' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none h-7 px-2 text-xs border-x"
                onClick={() => setViewMode('both')}
                title="Video + Chat"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button 
                variant={viewMode === 'chat' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none h-7 px-2 text-xs"
                onClick={() => setViewMode(viewMode === 'chat' ? 'both' : 'chat')}
                title="Chat only"
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Elapsed Time Display */}
      {isLive && remainingTime > 0 && (
        <div className="px-4 py-1 bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground">
            Live for {formatTime(remainingTime)}
          </p>
        </div>
      )}

      {/* Gift Rocket Display - Shows at top with sender name on rocket */}
      {giftTickets.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-yellow-500/20 border-b border-orange-500/30 overflow-hidden relative">
          <div className="flex flex-col gap-2">
            {giftTickets.slice(0, 3).map((ticket) => {
              const remainingMs = ticket.expiresAt - Date.now();
              const totalMs = getTicketDisplayDuration(ticket.price);
              const progressPercent = Math.max(0, (remainingMs / totalMs) * 100);
              // Scale rocket size based on price (larger price = larger rocket)
              const rocketScale = 0.8 + (ticket.price / 120) * 0.6;
              
              return (
                <div 
                  key={ticket.id} 
                  className="flex items-center gap-3 animate-fade-in"
                >
                  {/* Animated Rocket with Sender Name */}
                  <div 
                    className="relative flex items-center animate-rocket-fly"
                    style={{ transform: `scale(${rocketScale})` }}
                  >
                    {/* Rocket Body */}
                    <div className="relative">
                      <span className="text-3xl drop-shadow-lg">🚀</span>
                      {/* Sender Name on Rocket */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[10px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 px-1.5 py-0.5 rounded-full shadow-lg border border-white/30">
                          {ticket.senderName}
                        </span>
                      </div>
                    </div>
                    {/* Flame Trail */}
                    <div className="flex items-center -ml-2 animate-pulse">
                      <span className="text-xl">🔥</span>
                      {ticket.price >= 50 && <span className="text-lg -ml-1">🔥</span>}
                      {ticket.price >= 100 && <span className="text-sm -ml-1">🔥</span>}
                    </div>
                  </div>
                  
                  {/* Gift Info */}
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-2xl">{ticket.giftEmoji}</span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground">
                        {ticket.senderName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        sent <span className="text-orange-500 font-medium">{ticket.giftName}</span>
                      </span>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-500/50 bg-orange-500/10">
                      ₹{ticket.price}
                    </Badge>
                  </div>
                  
                  {/* Progress Timer */}
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={progressPercent} className="h-1.5 bg-orange-500/20" />
                    </div>
                    <Timer className="h-3 w-3 text-orange-500" />
                  </div>
                </div>
              );
            })}
            {giftTickets.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{giftTickets.length - 3} more rocket gifts incoming! 🚀
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Section - Host Only */}
        {showVideo && (
          <div className={cn(
            "flex flex-col border-r min-h-0 transition-all duration-300",
            showChat ? "w-1/2" : "flex-1"
          )}>
            {/* Video Display */}
            <div className="flex-1 p-2 bg-black min-h-0 flex items-center justify-center">
              {isOwner ? (
                // Host sees their own video
                <div className="relative w-full h-full max-w-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={userPhoto || undefined} />
                        <AvatarFallback className="text-3xl">{userName[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                    You (Host)
                  </div>
                </div>
              ) : (
                // Participants see host's video stream via WebRTC
                <div className="relative w-full h-full max-w-2xl">
                  {isConnected ? (
                    <>
                      {hostStream ? (
                        <video
                          ref={(el) => {
                            if (el) {
                              // Always update the hook's ref
                              if (remoteVideoRef && 'current' in remoteVideoRef) {
                                (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                              }
                              // Attach stream if available
                              if (hostStream && el.srcObject !== hostStream) {
                                console.log('[PrivateGroupCallWindow] Callback ref: attaching hostStream to video');
                                el.srcObject = hostStream;
                                el.play().catch(e => console.warn('[PrivateGroupCallWindow] play() failed:', e));
                              }
                            }
                          }}
                          autoPlay
                          playsInline
                          muted={false}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
                          <div className="text-center text-white">
                            <Avatar className="h-24 w-24 mx-auto mb-4">
                              <AvatarImage src={participants.find(p => p.isOwner)?.photo} />
                              <AvatarFallback className="text-3xl">
                                {participants.find(p => p.isOwner)?.name?.[0] || 'H'}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-lg font-medium">
                              {participants.find(p => p.isOwner)?.name || 'Host'}
                            </p>
                            <Loader2 className="h-6 w-6 mx-auto mt-3 animate-spin text-primary" />
                            <p className="text-sm text-gray-400 mt-2">
                              Connecting to host video...
                            </p>
                          </div>
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 bg-red-600">
                        <Radio className="h-3 w-3 mr-1 animate-pulse" />
                        {hostStream ? 'Watching Host' : 'Connecting...'}
                      </Badge>
                    </>
                  ) : (
                    <div className="text-center text-gray-400">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                      <p>Connecting to stream...</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Participant names overlay */}
              {isOwner ? (
                // Host sees ALL joined user names
                <div className="absolute bottom-2 left-2 right-2 max-h-24 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {participants.filter(p => !p.isOwner).length === 0 ? (
                      <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-none">
                        Waiting for participants...
                      </Badge>
                    ) : (
                      participants.filter(p => !p.isOwner).map((p) => (
                        <Badge key={p.id} variant="secondary" className="text-[10px] bg-black/60 text-white border-none gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                          {p.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              ) : participants.length > 1 ? (
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-none gap-1">
                    <Users className="h-3 w-3" />
                    {viewerCount} in group
                  </Badge>
                </div>
              ) : null}
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 border-t">
              {isConnecting && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </div>
              )}
              
              {isRefunding && (
                <div className="flex items-center gap-2 text-yellow-600 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing refunds...
                </div>
              )}

              {/* Only host can toggle video */}
              {isOwner && (
                <Button
                  variant={isVideoEnabled ? 'secondary' : 'destructive'}
                  size="sm"
                  onClick={handleToggleVideo}
                  disabled={isConnecting}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
              )}

              {/* Everyone can toggle audio - participants start muted */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isAudioEnabled ? 'secondary' : 'destructive'}
                  size="sm"
                  onClick={handleToggleAudio}
                  disabled={isConnecting}
                  title={isOwner ? 'Toggle microphone' : (isAudioEnabled ? 'Mute microphone' : 'Unmute to speak')}
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                {!isOwner && !isAudioEnabled && isConnected && (
                  <span className="text-xs text-muted-foreground">Tap mic to speak</span>
                )}
              </div>

              {/* Optional tip button for participants */}
              {!isOwner && isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGiftDialog(true)}
                  className="gap-1"
                >
                  <Gift className="h-4 w-4" />
                  Send Tip
                </Button>
              )}

              {isOwner && (
                <>
                  {!isLive && !isConnected ? (
                    <Button 
                      size="sm"
                      onClick={handleGoLive} 
                      className="gap-1"
                      disabled={isConnecting}
                    >
                      {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                      Go Live
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowEndConfirm(true)} 
                      className="gap-1"
                      disabled={isRefunding}
                    >
                      <PhoneOff className="h-4 w-4" />
                      End
                    </Button>
                  )}
                </>
              )}

              {!isOwner && isConnected && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleClose}
                  className="gap-1"
                >
                  <PhoneOff className="h-4 w-4" />
                  Leave
                </Button>
              )}
            </div>

            {/* Participant Info */}
            <div className="px-3 py-2 bg-muted/20 border-t text-center">
              <p className="text-xs text-muted-foreground">
                {isOwner ? (
                  `${viewerCount - 1} viewers • Only your video is visible • Men can chat & speak`
                ) : (
                  `Watching host • Tap mic to speak • Men are not visible to each other`
                )}
              </p>
            </div>
          </div>
        )}

        {/* Chat Section */}
        {showChat && (
          <div className={cn(
            "flex flex-col transition-all duration-300",
            showVideo ? "w-1/2" : "flex-1"
          )}>
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Group Chat</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {participants.length} online
              </Badge>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    const isHost = msg.sender_id === group.owner_id;
                    const senderName = getParticipantName(msg.sender_id);
                    const senderPhoto = getParticipantPhoto(msg.sender_id);
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-2", isOwn ? 'flex-row-reverse' : 'flex-row')}
                      >
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={senderPhoto} />
                          <AvatarFallback className="text-xs">
                            {senderName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("max-w-[75%]", isOwn ? 'items-end' : 'items-start')}>
                          {!isOwn && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {isHost ? '👑 ' : ''}{senderName}
                            </p>
                          )}
                          <div
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm",
                              isOwn ? 'bg-primary text-primary-foreground' : 
                              isHost ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-muted'
                            )}
                          >
                            {msg.file_url ? renderFileMessage(msg) : msg.message}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isSending}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Gift Dialog with limit info */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Tip to Host</DialogTitle>
            <DialogDescription>
              Optional: Send a tip to support the host. 50% of the tip reaches the host.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-3 py-4">
            {gifts.slice(0, 12).map((gift) => (
              <Button
                key={gift.id}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => handleSendGift(gift)}
              >
                <span className="text-2xl">{gift.emoji}</span>
                <span className="text-xs">{gift.name}</span>
                <span className="text-xs font-bold">₹{gift.price}</span>
              </Button>
            ))}
            {gifts.length === 0 && (
              <div className="col-span-3 text-center py-4 text-muted-foreground">
                <p>No gifts available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* End Stream Confirmation */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              End Stream Early?
            </DialogTitle>
            <DialogDescription>
              Ending the stream will disconnect all participants. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowEndConfirm(false)}>
              Continue Stream
            </Button>
            <Button variant="destructive" onClick={handleEndStream}>
              End Stream
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Helper function exported for ticket display calculation
function getTicketDisplayDuration(price: number): number {
  const minDuration = 5000;
  const maxDuration = 60000;
  const minPrice = 10;
  const maxPrice = 120;
  
  if (price <= minPrice) return minDuration;
  if (price >= maxPrice) return maxDuration;
  
  const ratio = (price - minPrice) / (maxPrice - minPrice);
  return Math.floor(minDuration + (maxDuration - minDuration) * ratio);
}
