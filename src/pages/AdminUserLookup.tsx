import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "@/components/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, Wallet, MessageSquare, FileText, Loader2, Phone, Mail, MapPin, Calendar, Shield } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  age: number | null;
  date_of_birth: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  bio: string | null;
  occupation: string | null;
  education_level: string | null;
  height_cm: number | null;
  body_type: string | null;
  marital_status: string | null;
  religion: string | null;
  interests: string[] | null;
  life_goals: string[] | null;
  primary_language: string | null;
  preferred_language: string | null;
  is_verified: boolean | null;
  is_indian: boolean | null;
  account_status: string;
  approval_status: string;
  photo_url: string | null;
  created_at: string;
  last_active_at: string | null;
  smoking_habit: string | null;
  drinking_habit: string | null;
  dietary_preference: string | null;
  fitness_level: string | null;
  has_children: boolean | null;
  pet_preference: string | null;
  travel_frequency: string | null;
  personality_type: string | null;
  zodiac_sign: string | null;
}

interface WalletData {
  balance: number;
  currency: string;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  man_user_id: string;
  woman_user_id: string;
  status: string;
  total_minutes: number;
  total_earned: number;
  started_at: string;
  ended_at: string | null;
}

interface KYCRecord {
  id: string;
  full_name_as_per_bank: string;
  date_of_birth: string;
  gender: string | null;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  aadhaar_number: string | null;
  id_type: string;
  id_number: string;
  aadhaar_front_url: string | null;
  aadhaar_back_url: string | null;
  id_proof_front_url: string | null;
  id_proof_back_url: string | null;
  selfie_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
  created_at: string;
}

const AdminUserLookup = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [kycData, setKycData] = useState<KYCRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string>("all");

  useEffect(() => {
    loadAllUsers();
  }, []);

  useEffect(() => {
    let users = allUsers;
    if (genderFilter !== "all") {
      users = users.filter(u => u.gender?.toLowerCase() === genderFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      users = users.filter(u =>
        (u.full_name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.phone?.includes(q))
      );
    }
    setFilteredUsers(users);
  }, [searchQuery, allUsers, genderFilter]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAllUsers((data || []) as UserProfile[]);
      setFilteredUsers((data || []) as UserProfile[]);
    } catch (err: any) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      // Load wallet, transactions, chat sessions in parallel
      const [walletRes, txRes, chatRes, kycRes] = await Promise.all([
        supabase.from("wallets").select("balance, currency").eq("user_id", user.user_id).maybeSingle(),
        supabase.from("wallet_transactions").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(50),
        supabase.from("active_chat_sessions").select("*").or(`man_user_id.eq.${user.user_id},woman_user_id.eq.${user.user_id}`).order("started_at", { ascending: false }).limit(50),
        // Only load KYC for Indian women
        user.gender?.toLowerCase() === "female" && user.is_indian
          ? supabase.from("women_kyc").select("*").eq("user_id", user.user_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      setWallet(walletRes.data as WalletData | null);
      setTransactions((txRes.data || []) as WalletTransaction[]);
      setChatSessions((chatRes.data || []) as ChatSession[]);
      setKycData(kycRes.data as KYCRecord | null);
    } catch (err) {
      toast.error("Failed to load user details");
    } finally {
      setDetailLoading(false);
    }
  };

  const getIdTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      pan: "PAN Card", passport: "Passport", voter_id: "Voter ID",
      driving_license: "Driving Licence", ration_card: "Ration Card",
      college_id: "College / University ID", government_id: "Government Employee ID",
      nrega_card: "NREGA Job Card", defence_id: "Defence / Ex-Servicemen ID",
      postal_id: "India Post ID Card",
    };
    return map[type] || type;
  };

  const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value ?? "—"}</span>
    </div>
  );

  return (
    <AdminNav>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6" /> User Lookup
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Search & List */}
          <div className="lg:col-span-1 space-y-3">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="male">Men</SelectItem>
                    <SelectItem value="female">Women</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{filteredUsers.length} users found</p>
              </CardContent>
            </Card>

            <Card>
              <ScrollArea className="h-[60vh]">
                <div className="p-2 space-y-1">
                  {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10 text-sm">No users found</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => selectUser(u)}
                        className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                          selectedUser?.id === u.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {u.photo_url ? (
                            <img src={u.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{u.full_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">
                              {u.gender?.charAt(0).toUpperCase()}{u.gender?.slice(1)} · {u.age || "?"} yrs
                            </p>
                          </div>
                          {u.is_indian && u.gender?.toLowerCase() === "female" && (
                            <Badge variant="outline" className="text-[10px] px-1">KYC</Badge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Right: User Detail */}
          <div className="lg:col-span-2">
            {!selectedUser ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Search className="h-12 w-12 mb-4 opacity-30" />
                  <p>Select a user from the list to view details</p>
                </CardContent>
              </Card>
            ) : detailLoading ? (
              <Card>
                <CardContent className="flex justify-center py-20">
                  <Loader2 className="animate-spin h-8 w-8" />
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="profile" className="space-y-3">
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                  <TabsTrigger value="profile"><User className="w-3 h-3 mr-1" />Profile</TabsTrigger>
                  <TabsTrigger value="wallet"><Wallet className="w-3 h-3 mr-1" />Wallet</TabsTrigger>
                  <TabsTrigger value="chats"><MessageSquare className="w-3 h-3 mr-1" />Chats</TabsTrigger>
                  {selectedUser.is_indian && selectedUser.gender?.toLowerCase() === "female" && (
                    <TabsTrigger value="kyc"><FileText className="w-3 h-3 mr-1" />KYC</TabsTrigger>
                  )}
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-4">
                        {selectedUser.photo_url ? (
                          <img src={selectedUser.photo_url} className="w-16 h-16 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                        <div>
                          <CardTitle>{selectedUser.full_name || "Unnamed"}</CardTitle>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline">{selectedUser.gender}</Badge>
                            <Badge variant={selectedUser.account_status === "active" ? "default" : "destructive"}>
                              {selectedUser.account_status}
                            </Badge>
                            {selectedUser.is_verified && <Badge className="bg-green-500">Verified</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><User className="w-3 h-3" /> Personal</h3>
                          <InfoRow label="Email" value={selectedUser.email} />
                          <InfoRow label="Phone" value={selectedUser.phone} />
                          <InfoRow label="Age" value={selectedUser.age} />
                          <InfoRow label="DOB" value={selectedUser.date_of_birth} />
                          <InfoRow label="Country" value={selectedUser.country} />
                          <InfoRow label="State" value={selectedUser.state} />
                          <InfoRow label="City" value={selectedUser.city} />
                          <InfoRow label="Religion" value={selectedUser.religion} />
                          <InfoRow label="Marital Status" value={selectedUser.marital_status} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Details</h3>
                          <InfoRow label="Occupation" value={selectedUser.occupation} />
                          <InfoRow label="Education" value={selectedUser.education_level} />
                          <InfoRow label="Height" value={selectedUser.height_cm ? `${selectedUser.height_cm} cm` : null} />
                          <InfoRow label="Body Type" value={selectedUser.body_type} />
                          <InfoRow label="Language" value={selectedUser.primary_language} />
                          <InfoRow label="Preferred Lang" value={selectedUser.preferred_language} />
                          <InfoRow label="Bio" value={selectedUser.bio} />
                          <InfoRow label="Approval" value={selectedUser.approval_status} />
                          <InfoRow label="Indian" value={selectedUser.is_indian ? "Yes" : "No"} />
                        </div>
                      </div>

                      {/* Lifestyle */}
                      <div className="mt-4 space-y-1">
                        <h3 className="font-semibold text-sm mb-2">Lifestyle</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
                          <InfoRow label="Smoking" value={selectedUser.smoking_habit} />
                          <InfoRow label="Drinking" value={selectedUser.drinking_habit} />
                          <InfoRow label="Diet" value={selectedUser.dietary_preference} />
                          <InfoRow label="Fitness" value={selectedUser.fitness_level} />
                          <InfoRow label="Children" value={selectedUser.has_children === null ? null : selectedUser.has_children ? "Yes" : "No"} />
                          <InfoRow label="Pets" value={selectedUser.pet_preference} />
                          <InfoRow label="Travel" value={selectedUser.travel_frequency} />
                          <InfoRow label="Personality" value={selectedUser.personality_type} />
                          <InfoRow label="Zodiac" value={selectedUser.zodiac_sign} />
                        </div>
                      </div>

                      {/* Interests & Goals */}
                      {(selectedUser.interests?.length || selectedUser.life_goals?.length) && (
                        <div className="mt-4 space-y-3">
                          {selectedUser.interests?.length ? (
                            <div>
                              <Label className="text-sm text-muted-foreground">Interests</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedUser.interests.map(i => <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>)}
                              </div>
                            </div>
                          ) : null}
                          {selectedUser.life_goals?.length ? (
                            <div>
                              <Label className="text-sm text-muted-foreground">Life Goals</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedUser.life_goals.map(g => <Badge key={g} variant="outline" className="text-xs">{g}</Badge>)}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className="mt-4 text-xs text-muted-foreground">
                        Joined: {new Date(selectedUser.created_at).toLocaleDateString()} · Last active: {selectedUser.last_active_at ? new Date(selectedUser.last_active_at).toLocaleString() : "Never"}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Wallet Tab */}
                <TabsContent value="wallet">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Wallet
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className="text-3xl font-bold">₹{wallet?.balance?.toFixed(2) ?? "0.00"}</p>
                      </div>
                      <h3 className="font-semibold text-sm">Recent Transactions</h3>
                      {transactions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No transactions</p>
                      ) : (
                        <ScrollArea className="h-[40vh]">
                          <div className="space-y-2">
                            {transactions.map(tx => (
                              <div key={tx.id} className="flex justify-between items-center p-2 border rounded text-sm">
                                <div>
                                  <p className="font-medium">{tx.description || tx.type}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                                </div>
                                <span className={tx.type === "credit" ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Chats Tab */}
                <TabsContent value="chats">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" /> Chat History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {chatSessions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No chat sessions</p>
                      ) : (
                        <ScrollArea className="h-[40vh]">
                          <div className="space-y-2">
                            {chatSessions.map(chat => (
                              <div key={chat.id} className="p-3 border rounded text-sm space-y-1">
                                <div className="flex justify-between">
                                  <Badge variant={chat.status === "active" ? "default" : "secondary"}>{chat.status}</Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(chat.started_at).toLocaleString()}</span>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Duration: {chat.total_minutes.toFixed(1)} min</span>
                                  <span>Earned: ₹{chat.total_earned.toFixed(2)}</span>
                                </div>
                                {chat.ended_at && <p className="text-xs">Ended: {new Date(chat.ended_at).toLocaleString()}</p>}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* KYC Tab (Indian women only) */}
                {selectedUser.is_indian && selectedUser.gender?.toLowerCase() === "female" && (
                  <TabsContent value="kyc">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" /> KYC Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!kycData ? (
                          <p className="text-muted-foreground text-sm">No KYC submitted</p>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Badge variant={kycData.verification_status === "approved" ? "default" : kycData.verification_status === "rejected" ? "destructive" : "secondary"}>
                                {kycData.verification_status}
                              </Badge>
                              {kycData.rejection_reason && (
                                <span className="text-xs text-red-500">Reason: {kycData.rejection_reason}</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Personal</h4>
                                <InfoRow label="Full Name (Bank)" value={kycData.full_name_as_per_bank} />
                                <InfoRow label="DOB" value={kycData.date_of_birth} />
                                <InfoRow label="Gender" value={kycData.gender} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Bank Details</h4>
                                <InfoRow label="Bank" value={kycData.bank_name} />
                                <InfoRow label="Account Holder" value={kycData.account_holder_name} />
                                <InfoRow label="Account No." value={kycData.account_number} />
                                <InfoRow label="IFSC" value={kycData.ifsc_code} />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-semibold text-sm">ID Documents</h4>
                              <InfoRow label="Aadhaar No." value={kycData.aadhaar_number} />
                              <InfoRow label="ID Type" value={getIdTypeLabel(kycData.id_type)} />
                              <InfoRow label="ID Number" value={kycData.id_number} />
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">Uploaded Documents</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                  { label: "Aadhaar Front", url: kycData.aadhaar_front_url },
                                  { label: "Aadhaar Back", url: kycData.aadhaar_back_url },
                                  { label: "ID Front", url: kycData.id_proof_front_url },
                                  { label: "ID Back", url: kycData.id_proof_back_url },
                                  { label: "Selfie", url: kycData.selfie_url },
                                ].map(doc => (
                                  <div key={doc.label} className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">{doc.label}</p>
                                    {doc.url ? (
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                        <img src={doc.url} className="w-full h-24 object-cover rounded border" alt={doc.label} />
                                      </a>
                                    ) : (
                                      <div className="w-full h-24 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">Not uploaded</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Submitted: {new Date(kycData.created_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </AdminNav>
  );
};

export default AdminUserLookup;
