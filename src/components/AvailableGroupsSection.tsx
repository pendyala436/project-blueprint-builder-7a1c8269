import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Lock, Unlock, Gift, MessageCircle, Video, Users, Radio, Search, Filter, Star, Eye, Globe, X, Loader2 } from 'lucide-react';
import { languages } from '@/data/languages';

// Lazy load heavy components to reduce initial bundle
const GroupChatWindow = lazy(() => import('./GroupChatWindow').then(m => ({ default: m.GroupChatWindow })));
const GroupVideoCall = lazy(() => import('./GroupVideoCall').then(m => ({ default: m.GroupVideoCall })));

interface PrivateGroup {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  min_gift_amount: number;
  access_type: string;
  is_active: boolean;
  is_live: boolean;
  stream_id: string | null;
  participant_count: number;
  owner_name?: string;
  owner_photo?: string;
  owner_language?: string;
  created_at?: string;
}

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

interface AvailableGroupsSectionProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function AvailableGroupsSection({ currentUserId, userName, userPhoto }: AvailableGroupsSectionProps) {
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [myMemberships, setMyMemberships] = useState<Map<string, boolean>>(new Map());
  const [favoriteGroups, setFavoriteGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<PrivateGroup | null>(null);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [activeGroupChat, setActiveGroupChat] = useState<PrivateGroup | null>(null);
  const [activeGroupVideo, setActiveGroupVideo] = useState<PrivateGroup | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'views' | 'favorites' | 'recent'>('views');

  // Refs for cleanup and preventing stale closures
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  // Debounce search to reduce API calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Memoized fetch functions to prevent re-creation
  const fetchGroups = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      // First get all female user IDs
      const { data: femaleProfiles } = await supabase
        .from('female_profiles')
        .select('user_id, full_name, photo_url, primary_language');
      
      const femaleUserIds = new Set(femaleProfiles?.map(p => p.user_id) || []);
      const femaleProfileMap = new Map(
        femaleProfiles?.map(p => [p.user_id, p]) || []
      );

      const { data, error } = await supabase
        .from('private_groups')
        .select('*')
        .eq('is_active', true)
        .eq('is_live', true)
        .neq('owner_id', currentUserId)
        .order('participant_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!mountedRef.current) return;

      if (data && data.length > 0) {
        // Filter to only show groups owned by female users
        const femaleOwnedGroups = data.filter(g => femaleUserIds.has(g.owner_id));
        
        const enrichedGroups = femaleOwnedGroups.map(group => {
          const ownerProfile = femaleProfileMap.get(group.owner_id);
          return {
            ...group,
            owner_name: ownerProfile?.full_name || 'Anonymous',
            owner_photo: ownerProfile?.photo_url,
            owner_language: group.owner_language || ownerProfile?.primary_language
          };
        });
        
        setGroups(enrichedGroups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [currentUserId]);

  const fetchMyMemberships = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('group_id, has_access')
        .eq('user_id', currentUserId)
        .eq('has_access', true);

      if (error) throw error;
      if (!mountedRef.current) return;

      const membershipMap = new Map<string, boolean>();
      data?.forEach(m => membershipMap.set(m.group_id, m.has_access));
      setMyMemberships(membershipMap);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  }, [currentUserId]);

  const fetchWalletBalance = useCallback(async () => {
    if (!mountedRef.current) return;
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', currentUserId)
      .single();
    
    if (data && mountedRef.current) setWalletBalance(data.balance);
  }, [currentUserId]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchGroups();
    fetchMyMemberships();
    fetchWalletBalance();

    // Load favorites from localStorage
    try {
      const saved = localStorage.getItem(`group_favorites_${currentUserId}`);
      if (saved) setFavoriteGroups(new Set(JSON.parse(saved)));
    } catch {}

    // Subscribe to realtime updates with throttled handlers
    channelRef.current = supabase
      .channel('available-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, fetchGroups)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_memberships' }, fetchMyMemberships)
      .subscribe();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, fetchGroups, fetchMyMemberships, fetchWalletBalance]);

  const toggleFavorite = useCallback((groupId: string) => {
    setFavoriteGroups(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(groupId)) {
        newFavorites.delete(groupId);
      } else {
        newFavorites.add(groupId);
      }
      localStorage.setItem(`group_favorites_${currentUserId}`, JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  }, [currentUserId]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let result = [...groups];
    
    // Search by name or owner name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.owner_name?.toLowerCase().includes(query)
      );
    }
    
    // Filter by language
    if (filterLanguage !== 'all') {
      result = result.filter(g => g.owner_language === filterLanguage);
    }
    
    // Sort
    if (sortBy === 'views') {
      result.sort((a, b) => b.participant_count - a.participant_count);
    } else if (sortBy === 'favorites') {
      result.sort((a, b) => {
        const aFav = favoriteGroups.has(a.id) ? 1 : 0;
        const bFav = favoriteGroups.has(b.id) ? 1 : 0;
        return bFav - aFav;
      });
    } else {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    
    return result;
  }, [groups, searchQuery, filterLanguage, sortBy, favoriteGroups]);

  // Get unique languages from groups
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    groups.forEach(g => {
      if (g.owner_language) langs.add(g.owner_language);
    });
    return [...langs].sort();
  }, [groups]);

  const fetchGifts = useCallback(async (minAmount: number) => {
    if (!mountedRef.current) return;
    const { data } = await supabase
      .from('gifts')
      .select('id, name, emoji, price')
      .eq('is_active', true)
      .gte('price', minAmount)
      .order('price', { ascending: true })
      .limit(20);

    if (data && mountedRef.current) setGifts(data);
  }, []);


  const handleUnlockGroup = async (group: PrivateGroup) => {
    // Check if group is full (max 150 men)
    if (group.participant_count >= 150) {
      toast.error('This group is full (150 men limit reached)');
      return;
    }
    
    // If free group, grant access directly without gift
    if (group.min_gift_amount === 0) {
      await handleFreeJoin(group);
      return;
    }
    
    // For video-only or video+chat groups, skip the gift dialog here
    // The GroupVideoCall component will handle gift for video access with 30-min timer
    if (group.access_type === 'video' || group.access_type === 'both') {
      // For video groups, directly open the video call - gift will be handled there
      setActiveGroupVideo(group);
      return;
    }
    
    // For chat-only groups, show gift dialog here
    setSelectedGroup(group);
    await fetchGifts(group.min_gift_amount);
    setShowGiftDialog(true);
  };

  const handleFreeJoin = async (group: PrivateGroup) => {
    try {
      const { error } = await supabase
        .from('group_memberships')
        .upsert({
          group_id: group.id,
          user_id: currentUserId,
          has_access: true,
          gift_amount_paid: 0
        }, { onConflict: 'group_id,user_id' });

      if (error) throw error;

      // Update participant count
      await supabase
        .from('private_groups')
        .update({ participant_count: group.participant_count + 1 })
        .eq('id', group.id);

      toast.success(`You joined ${group.name}!`);
      fetchMyMemberships();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
    }
  };

  const handleSendGift = async (gift: GiftItem) => {
    if (!selectedGroup) return;
    
    if (walletBalance < gift.price) {
      toast.error('Insufficient balance. Please recharge your wallet.');
      return;
    }

    setIsSendingGift(true);
    try {
      const { data, error } = await supabase.rpc('process_group_gift', {
        p_sender_id: currentUserId,
        p_group_id: selectedGroup.id,
        p_gift_id: gift.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; gift_emoji?: string; gift_name?: string; women_share?: number; admin_share?: number };
      
      if (result.success) {
        toast.success(`Gift sent! You now have access to ${selectedGroup.name}`, {
          description: `${result.gift_emoji} ${result.gift_name} - ₹${gift.price} (50% to creator, 50% to admin)`
        });
        setShowGiftDialog(false);
        fetchMyMemberships();
        fetchWalletBalance();
      } else {
        toast.error(result.error || 'Failed to send gift');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send gift');
    } finally {
      setIsSendingGift(false);
    }
  };

  const hasAccess = (groupId: string) => myMemberships.get(groupId) === true;

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Radio className="h-5 w-5 text-destructive animate-pulse" />
          Live Rooms
          <Badge variant="secondary" className="ml-2">{groups.length} Live</Badge>
        </h3>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {(filterLanguage !== 'all' || sortBy !== 'views') && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {(filterLanguage !== 'all' ? 1 : 0) + (sortBy !== 'views' ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filter & Sort</h4>
              
              {/* Language Filter */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Language
                </label>
                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="All languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {availableLanguages.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Sort By</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'views' | 'favorites' | 'recent')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="views">
                      <span className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Most Viewers
                      </span>
                    </SelectItem>
                    <SelectItem value="favorites">
                      <span className="flex items-center gap-2">
                        <Star className="h-4 w-4" /> My Favorites
                      </span>
                    </SelectItem>
                    <SelectItem value="recent">
                      <span className="flex items-center gap-2">
                        <Radio className="h-4 w-4" /> Recently Started
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Reset Filters */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setFilterLanguage('all');
                  setSortBy('views');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {groups.length === 0 ? (
              <>
                <p>No live rooms right now</p>
                <p className="text-sm">Check back when hosts go live!</p>
              </>
            ) : (
              <>
                <p>No rooms match your filters</p>
                <Button 
                  variant="link" 
                  onClick={() => { setSearchQuery(''); setFilterLanguage('all'); }}
                >
                  Clear filters
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => {
            const unlocked = hasAccess(group.id);
            const isFavorite = favoriteGroups.has(group.id);
            return (
              <Card key={group.id} className="relative overflow-hidden">
                <Badge variant="destructive" className="absolute top-2 right-12 gap-1 z-10">
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute top-2 right-2 z-10 h-8 w-8 ${isFavorite ? 'text-yellow-500' : 'text-muted-foreground'}`}
                  onClick={() => toggleFavorite(group.id)}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={group.owner_photo || undefined} />
                      <AvatarFallback>{group.owner_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {group.owner_language && <span className="text-primary">{group.owner_language} - </span>}
                        {group.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{group.owner_name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      {group.participant_count}/150 watching
                    </Badge>
                    <Badge variant={unlocked ? 'default' : 'secondary'} className="gap-1">
                      {unlocked ? (
                        <>
                          <Unlock className="h-3 w-3" />
                          Unlocked
                        </>
                      ) : group.min_gift_amount === 0 ? (
                        <>
                          <Unlock className="h-3 w-3" />
                          Open
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          ₹{group.min_gift_amount}+
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      {group.participant_count} watching
                    </Badge>
                  </div>

                  {unlocked ? (
                    <div className="flex gap-2 pt-2">
                      {(group.access_type === 'chat' || group.access_type === 'both') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => setActiveGroupChat(group)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Chat
                        </Button>
                      )}
                      {(group.access_type === 'video' || group.access_type === 'both') && (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="flex-1 gap-2"
                          onClick={() => setActiveGroupVideo(group)}
                        >
                          <Video className="h-4 w-4" />
                          Watch Live
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => handleUnlockGroup(group)}
                    >
                      {group.min_gift_amount === 0 ? (
                        <>
                          <Users className="h-4 w-4" />
                          Join Free
                        </>
                      ) : group.access_type === 'video' || group.access_type === 'both' ? (
                        <>
                          <Video className="h-4 w-4" />
                          Watch Live
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4" />
                          Send Gift to Join
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Gift Selection Dialog */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Unlock {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription>
              This private room requires a gift of ₹{selectedGroup?.min_gift_amount}+ to join.
              Send a gift to unlock chat and video call access.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your balance: <span className="font-semibold">₹{walletBalance}</span>
            </p>
            
            {gifts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No gifts available at this price point
              </p>
            ) : (
              <ScrollArea className="h-64">
                <div className="grid grid-cols-2 gap-3">
                  {gifts.map((gift) => (
                    <Button
                      key={gift.id}
                      variant="outline"
                      className="h-auto flex-col py-4 gap-2"
                      disabled={isSendingGift || walletBalance < gift.price}
                      onClick={() => handleSendGift(gift)}
                    >
                      <span className="text-3xl">{gift.emoji}</span>
                      <span className="font-medium">{gift.name}</span>
                      <span className="text-sm text-muted-foreground">₹{gift.price}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Gift split: 50% to creator, 50% to admin
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGiftDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Chat Window - Lazy loaded */}
      {activeGroupChat && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
          <GroupChatWindow
            group={activeGroupChat}
            currentUserId={currentUserId}
            userName={userName}
            userPhoto={userPhoto}
            onClose={() => setActiveGroupChat(null)}
            isOwner={false}
          />
        </Suspense>
      )}

      {/* Group Video Call - Lazy loaded */}
      {activeGroupVideo && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
          <GroupVideoCall
            group={activeGroupVideo}
            currentUserId={currentUserId}
            userName={userName}
            userPhoto={userPhoto}
            onClose={() => setActiveGroupVideo(null)}
            isOwner={false}
          />
        </Suspense>
      )}
    </div>
  );
}
