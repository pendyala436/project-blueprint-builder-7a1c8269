import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminNav from '@/components/AdminNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Send, Users, MessageSquare, Globe, Search, RefreshCw, Trash2,
  UserCheck, Crown, Loader2, Mail, Reply
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TargetGroup = 'all' | 'indian_women' | 'world_women' | 'indian_men' | 'world_men';

interface Message {
  id: string;
  admin_id: string;
  target_group: string;
  target_user_id: string | null;
  sender_role: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  gender: string;
  country: string;
  is_indian: boolean;
}

const GROUP_CONFIG: { key: TargetGroup; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: 'All Users', icon: <Users className="h-4 w-4" />, color: 'bg-primary/10 text-primary' },
  { key: 'indian_women', label: 'Indian Women', icon: <Crown className="h-4 w-4" />, color: 'bg-pink-500/10 text-pink-600' },
  { key: 'world_women', label: 'World Women', icon: <Globe className="h-4 w-4" />, color: 'bg-purple-500/10 text-purple-600' },
  { key: 'indian_men', label: 'Indian Men', icon: <UserCheck className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-600' },
  { key: 'world_men', label: 'World Men', icon: <Globe className="h-4 w-4" />, color: 'bg-teal-500/10 text-teal-600' },
];

const AdminMessaging = () => {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'chat'>('broadcast');
  const [selectedGroup, setSelectedGroup] = useState<TargetGroup>('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  // Chat state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAdmin();
    fetchBroadcastMessages();
  }, []);

  useEffect(() => {
    if (selectedUser) fetchChatMessages(selectedUser.user_id);
  }, [selectedUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setAdminId(user.id);
  };

  const fetchBroadcastMessages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('admin_user_messages')
      .select('*')
      .is('target_user_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) setMessages(data as Message[]);
    setIsLoading(false);
  };

  const fetchChatMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from('admin_user_messages')
      .select('*')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (!error && data) setChatMessages(data as Message[]);
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim() || !adminId) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('admin_user_messages').insert({
        admin_id: adminId,
        target_group: selectedGroup,
        sender_role: 'admin',
        sender_id: adminId,
        message: broadcastMessage.trim(),
      });
      if (error) throw error;
      toast.success(`Message sent to ${GROUP_CONFIG.find(g => g.key === selectedGroup)?.label}`);
      setBroadcastMessage('');
      fetchBroadcastMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || !adminId || !selectedUser) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('admin_user_messages').insert({
        admin_id: adminId,
        target_group: 'direct',
        target_user_id: selectedUser.user_id,
        sender_role: 'admin',
        sender_id: adminId,
        message: chatMessage.trim(),
      });
      if (error) throw error;
      setChatMessage('');
      fetchChatMessages(selectedUser.user_id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, gender, country, is_indian')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(20);

      if (!error && data) setSearchResults(data as UserProfile[]);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from('admin_user_messages').delete().eq('id', id);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      setChatMessages(prev => prev.filter(m => m.id !== id));
      toast.success('Message deleted');
    }
  };

  const getGroupLabel = (group: string) => GROUP_CONFIG.find(g => g.key === group)?.label || group;

  return (
    <AdminNav>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Admin Messaging
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Broadcast to user groups or chat directly. Messages auto-delete after 1 week.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Auto-cleanup: 7 days
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'broadcast' | 'chat')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="broadcast" className="gap-2">
              <Users className="h-4 w-4" />
              Group Broadcast
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Direct Chat
            </TabsTrigger>
          </TabsList>

          {/* BROADCAST TAB */}
          <TabsContent value="broadcast" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Compose */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Compose Broadcast</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Group</label>
                    <div className="grid grid-cols-1 gap-2">
                      {GROUP_CONFIG.map((group) => (
                        <button
                          key={group.key}
                          onClick={() => setSelectedGroup(group.key)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                            selectedGroup === group.key
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-border hover:bg-muted text-muted-foreground'
                          )}
                        >
                          {group.icon}
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type your broadcast message..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={sendBroadcast}
                    disabled={!broadcastMessage.trim() || isSending}
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send to {GROUP_CONFIG.find(g => g.key === selectedGroup)?.label}
                  </Button>
                </CardContent>
              </Card>

              {/* Sent Messages */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-base">Sent Broadcasts</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchBroadcastMessages}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No broadcasts sent yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {getGroupLabel(msg.target_group)}
                              </Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.created_at), 'MMM dd, hh:mm a')}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMessage(msg.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DIRECT CHAT TAB */}
          <TabsContent value="chat" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* User Search */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Find User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    />
                    <Button size="icon" onClick={searchUsers} disabled={isSearching}>
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>

                  <ScrollArea className="h-[350px]">
                    <div className="space-y-1">
                      {searchResults.map((user) => (
                        <button
                          key={user.user_id}
                          onClick={() => setSelectedUser(user)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                            selectedUser?.user_id === user.user_id
                              ? 'bg-primary/10 text-primary border border-primary/30'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.gender} · {user.is_indian ? 'Indian' : 'World'} · {user.country || 'N/A'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {user.gender === 'Female' ? '♀' : '♂'}
                          </Badge>
                        </button>
                      ))}
                      {searchResults.length === 0 && searchQuery && !isSearching && (
                        <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Window */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {selectedUser ? (
                      <span>Chat with {selectedUser.full_name}</span>
                    ) : (
                      <span>Select a user to chat</span>
                    )}
                  </CardTitle>
                  {selectedUser && (
                    <Badge variant="outline" className="text-xs">
                      {selectedUser.gender} · {selectedUser.is_indian ? 'Indian' : 'World'}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedUser ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Search and select a user to start chatting</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ScrollArea className="h-[300px] rounded-lg bg-muted/30 p-3">
                        <div className="space-y-2">
                          {chatMessages.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No messages yet</p>
                          )}
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                'max-w-[80%] p-2.5 rounded-lg text-sm',
                                msg.sender_role === 'admin'
                                  ? 'ml-auto bg-primary text-primary-foreground'
                                  : 'mr-auto bg-muted'
                              )}
                            >
                              <p>{msg.message}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs opacity-70">
                                  {format(new Date(msg.created_at), 'hh:mm a')}
                                </span>
                                {msg.sender_role === 'admin' && (
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-60 hover:opacity-100" onClick={() => deleteMessage(msg.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>
                      </ScrollArea>

                      <div className="flex gap-2">
                        <Textarea
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Type a message..."
                          rows={2}
                          className="resize-none flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendChatMessage();
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          className="h-auto"
                          onClick={sendChatMessage}
                          disabled={!chatMessage.trim() || isSending}
                        >
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminNav>
  );
};

export default AdminMessaging;
