import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Users, MessageCircle, Video, Settings, Gift, LayoutGrid, Globe } from 'lucide-react';
import { TeamsStyleGroupWindow } from './TeamsStyleGroupWindow';
import { languages } from '@/data/languages';

// Gift item interface for gift selection
interface GiftOption {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

// Helper to format gift amount label
const getAmountLabel = (amount: number) => {
  if (amount === 0) return 'Free (No Gift Required)';
  return `₹${amount}`;
};

interface PrivateGroup {
  id: string;
  name: string;
  description: string | null;
  min_gift_amount: number;
  access_type: string;
  is_active: boolean;
  is_live: boolean;
  stream_id: string | null;
  participant_count: number;
  created_at: string;
  owner_language?: string;
}

interface PrivateGroupsSectionProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
}

export function PrivateGroupsSection({ currentUserId, userName, userPhoto }: PrivateGroupsSectionProps) {
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PrivateGroup | null>(null);
  const [activeGroup, setActiveGroup] = useState<PrivateGroup | null>(null);
  const [userLanguage, setUserLanguage] = useState<string>('');
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [minGiftAmount, setMinGiftAmount] = useState(0);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [ownerLanguage, setOwnerLanguage] = useState('');
  const [availableGifts, setAvailableGifts] = useState<GiftOption[]>([]);
  useEffect(() => {
    fetchGroups();
    fetchUserLanguage();
    fetchAvailableGifts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('private-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, () => {
        fetchGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchAvailableGifts = async () => {
    const { data } = await supabase
      .from('gifts')
      .select('id, name, emoji, price')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (data) {
      setAvailableGifts(data);
    }
  };

  const fetchUserLanguage = async () => {
    // Get user's primary language from profile
    const { data } = await supabase
      .from('profiles')
      .select('primary_language')
      .eq('user_id', currentUserId)
      .single();
    
    if (data?.primary_language) {
      setUserLanguage(data.primary_language);
      setOwnerLanguage(data.primary_language);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('private_groups')
        .select('*')
        .eq('owner_id', currentUserId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessType = (): 'chat' | 'video' | 'both' => {
    if (chatEnabled && videoEnabled) return 'both';
    if (chatEnabled) return 'chat';
    return 'video';
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (!chatEnabled && !videoEnabled) {
      toast.error('Please enable at least chat or video call');
      return;
    }
    if (!ownerLanguage) {
      toast.error('Please select your language for the video call');
      return;
    }

    try {
      const { data: newGroup, error } = await supabase
        .from('private_groups')
        .insert({
          owner_id: currentUserId,
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          min_gift_amount: minGiftAmount,
          access_type: getAccessType(),
          participant_count: 1,
          owner_language: ownerLanguage // Store owner's mother tongue
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically add owner as a member
      const { error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: newGroup.id,
          user_id: currentUserId,
          has_access: true,
          gift_amount_paid: 0
        });

      if (membershipError) {
        console.error('Failed to add owner membership:', membershipError);
      }

      toast.success('Private group created successfully!');
      setShowCreateDialog(false);
      resetForm();
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group');
    }
  };

  const handleUpdateGiftRequirement = async () => {
    if (!selectedGroup) return;

    try {
      const { error } = await supabase
        .from('private_groups')
        .update({ 
          min_gift_amount: minGiftAmount,
          access_type: getAccessType()
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      toast.success('Gift requirement updated!');
      setShowUpdateDialog(false);
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('private_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Group deleted. All members lost access.');
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete group');
    }
  };

  const resetForm = () => {
    setGroupName('');
    setGroupDescription('');
    setMinGiftAmount(100);
    setChatEnabled(true);
    setVideoEnabled(true);
    setOwnerLanguage(userLanguage);
  };

  const openUpdateDialog = (group: PrivateGroup) => {
    setSelectedGroup(group);
    setMinGiftAmount(group.min_gift_amount);
    setChatEnabled(group.access_type === 'chat' || group.access_type === 'both');
    setVideoEnabled(group.access_type === 'video' || group.access_type === 'both');
    setOwnerLanguage(group.owner_language || userLanguage);
    setShowUpdateDialog(true);
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          My Private Groups
        </h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Private Group</DialogTitle>
              <DialogDescription>
                Create a private group. You can enable chat, video call, or both. Set the minimum gift for men to join.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="My Private Room"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea 
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's your group about?"
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Gift to Join</Label>
                <Select value={String(minGiftAmount)} onValueChange={(val) => setMinGiftAmount(Number(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select minimum gift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">
                      🆓 Free (No Gift Required)
                    </SelectItem>
                    {availableGifts.map((gift) => (
                      <SelectItem key={gift.id} value={String(gift.price)}>
                        {gift.emoji} {gift.name} - ₹{gift.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Men pay this once for 30 min video access. 50% to you, 50% to admin.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Your Language (for video call name)
                </Label>
                <Select value={ownerLanguage} onValueChange={setOwnerLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.name}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Video calls will start with your language name displayed.
                </p>
              </div>
              <div className="space-y-3">
                <Label>Access Type</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="chat" 
                      checked={chatEnabled}
                      onCheckedChange={(checked) => setChatEnabled(checked as boolean)}
                    />
                    <Label htmlFor="chat" className="flex items-center gap-2 cursor-pointer">
                      <MessageCircle className="h-4 w-4" /> Chat
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="video" 
                      checked={videoEnabled}
                      onCheckedChange={(checked) => setVideoEnabled(checked as boolean)}
                    />
                    <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer">
                      <Video className="h-4 w-4" /> Video Call
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateGroup}>Create Group</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No private groups yet</p>
            <p className="text-sm">Create one to start earning from gifts!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openUpdateDialog(group)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Gift className="h-3 w-3" />
                    {group.min_gift_amount === 0 ? 'Free (No Gift Required)' : `Min ₹${group.min_gift_amount} to Join`}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {group.participant_count} members
                  </Badge>
                  {(group.access_type === 'chat' || group.access_type === 'both') && (
                    <Badge variant="outline" className="gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Chat
                    </Badge>
                  )}
                  {(group.access_type === 'video' || group.access_type === 'both') && (
                    <Badge variant="outline" className="gap-1">
                      <Video className="h-3 w-3" />
                      Video
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    className="flex-1 gap-2"
                    onClick={() => setActiveGroup(group)}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Open Group
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Gift Requirement Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Group Settings</DialogTitle>
            <DialogDescription>
              Change the minimum gift required for men to enter your group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Minimum Gift to Join</Label>
              <Select value={String(minGiftAmount)} onValueChange={(val) => setMinGiftAmount(Number(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select minimum gift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    🆓 Free (No Gift Required)
                  </SelectItem>
                  {availableGifts.map((gift) => (
                    <SelectItem key={gift.id} value={String(gift.price)}>
                      {gift.emoji} {gift.name} - ₹{gift.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Men must send a gift of at least this price to join.
              </p>
            </div>
            <div className="space-y-3">
              <Label>Access Type</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="update-chat" 
                    checked={chatEnabled}
                    onCheckedChange={(checked) => setChatEnabled(checked as boolean)}
                  />
                  <Label htmlFor="update-chat" className="flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="h-4 w-4" /> Chat
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="update-video" 
                    checked={videoEnabled}
                    onCheckedChange={(checked) => setVideoEnabled(checked as boolean)}
                  />
                  <Label htmlFor="update-video" className="flex items-center gap-2 cursor-pointer">
                    <Video className="h-4 w-4" /> Video Call
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateGiftRequirement}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teams-Style Group Window (Chat + Video Combined) */}
      {activeGroup && (
        <TeamsStyleGroupWindow
          group={activeGroup}
          currentUserId={currentUserId}
          userName={userName}
          userPhoto={userPhoto}
          onClose={() => setActiveGroup(null)}
          isOwner={true}
        />
      )}
    </div>
  );
}
