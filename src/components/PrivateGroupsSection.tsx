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
import { Plus, Trash2, Users, MessageCircle, Video, Settings, Gift, LayoutGrid, DollarSign } from 'lucide-react';
import { PrivateGroupCallWindow } from './PrivateGroupCallWindow';
import { MAX_PARTICIPANTS, MAX_DURATION_MINUTES } from '@/hooks/usePrivateGroupCall';

const MAX_GROUPS_APP_WIDE = 10;
// Gift amounts available as optional tips
const TIP_INFO = 'Men are charged ₹4/min. Women earn ₹2/min per man. Tips are optional — 50% reaches host.';

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
}

interface PrivateGroupsSectionProps {
  currentUserId: string;
  userName: string;
  userPhoto: string | null;
}

export function PrivateGroupsSection({ currentUserId, userName, userPhoto }: PrivateGroupsSectionProps) {
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [totalAppGroups, setTotalAppGroups] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PrivateGroup | null>(null);
  const [activeGroup, setActiveGroup] = useState<PrivateGroup | null>(null);
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [minGiftAmount, setMinGiftAmount] = useState(0);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    fetchGroups();
    fetchTotalAppGroups();
    
    const channel = supabase
      .channel('private-groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_groups' }, () => {
        fetchGroups();
        fetchTotalAppGroups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchTotalAppGroups = async () => {
    const { count } = await supabase
      .from('private_groups')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    setTotalAppGroups(count || 0);
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
    if (totalAppGroups >= MAX_GROUPS_APP_WIDE) {
      toast.error(`Only ${MAX_GROUPS_APP_WIDE} private groups are allowed across the entire app`);
      return;
    }

    try {
      const { data: newGroup, error } = await supabase
        .from('private_groups')
        .insert({
          owner_id: currentUserId,
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          min_gift_amount: 0, // Free entry - billing is per-minute
          access_type: getAccessType(),
          participant_count: 1
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
  };

  const openUpdateDialog = (group: PrivateGroup) => {
    setSelectedGroup(group);
    setMinGiftAmount(group.min_gift_amount);
    setChatEnabled(group.access_type === 'chat' || group.access_type === 'both');
    setVideoEnabled(group.access_type === 'video' || group.access_type === 'both');
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
            <Button size="sm" className="gap-2" disabled={totalAppGroups >= MAX_GROUPS_APP_WIDE}>
              <Plus className="h-4 w-4" />
              {totalAppGroups >= MAX_GROUPS_APP_WIDE ? `Max ${MAX_GROUPS_APP_WIDE} Groups` : `Create Group (${totalAppGroups}/${MAX_GROUPS_APP_WIDE})`}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Private Group</DialogTitle>
              <DialogDescription>
                Create a private group with chat, video call, or both. Men pay ₹4/min, you earn ₹2/min per man. Tips are optional.
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
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">💰 Billing Info</p>
                <p>{TIP_INFO}</p>
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
                    <DollarSign className="h-3 w-3" />
                    ₹4/min per man
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {group.participant_count}/{MAX_PARTICIPANTS}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    ⏱️ {MAX_DURATION_MINUTES}min max
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
              Update access type for your group. Men pay ₹4/min, you earn ₹2/min per man.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">💰 Billing</p>
              <p>Free entry. Men charged ₹4/min. You earn ₹2/min per man. Optional tips — 50% reaches you.</p>
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

      {/* Private Group Call Window (Host-only video, 30min limit, refunds) */}
      {activeGroup && (
        <PrivateGroupCallWindow
          group={{
            ...activeGroup,
            owner_id: currentUserId
          }}
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
