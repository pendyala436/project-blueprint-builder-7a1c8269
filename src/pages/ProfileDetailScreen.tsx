import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  ArrowLeft,
  Languages,
  MapPin,
  MessageCircle,
  Circle,
  Calendar,
  Shield,
  Loader2,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  userId: string;
  fullName: string;
  avatar: string;
  age: number | null;
  gender: string;
  country: string;
  state: string;
  motherTongue: string;
  optionalLanguages: string[];
  isOnline: boolean;
  lastSeen: string;
  isVerified: boolean;
}

const ProfileDetailScreen = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    if (userId) {
      loadProfile(userId);
    }
  }, [userId]);

  // Real-time subscription for online status
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (payload.new) {
            setProfile(prev => prev ? {
              ...prev,
              isOnline: payload.new.is_online,
              lastSeen: payload.new.last_seen
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadProfile = async (targetUserId: string) => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUserId(user.id);

      // Fetch profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (!profileData) {
        toast({
          title: "Profile not found",
          description: "This user profile doesn't exist",
          variant: "destructive",
        });
        navigate(-1);
        return;
      }

      // Fetch user languages
      const { data: languages } = await supabase
        .from("user_languages")
        .select("language_name")
        .eq("user_id", targetUserId);

      // Fetch online status
      const { data: statusData } = await supabase
        .from("user_status")
        .select("is_online, last_seen")
        .eq("user_id", targetUserId)
        .maybeSingle();

      // Check if already liked
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .eq("user_id", user.id)
        .eq("matched_user_id", targetUserId)
        .maybeSingle();

      setIsLiked(!!existingMatch);

      // Calculate age from date of birth
      let age: number | null = null;
      if (profileData.date_of_birth) {
        const birthDate = new Date(profileData.date_of_birth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      const allLanguages = languages?.map(l => l.language_name) || [];
      const motherTongue = profileData.preferred_language || allLanguages[0] || "Not specified";
      const optionalLanguages = allLanguages.filter(l => l !== motherTongue);

      setProfile({
        userId: targetUserId,
        fullName: profileData.full_name || "Anonymous",
        avatar: profileData.photo_url || "",
        age,
        gender: profileData.gender || "Not specified",
        country: profileData.country || "Unknown",
        state: profileData.state || "",
        motherTongue,
        optionalLanguages,
        isOnline: statusData?.is_online || false,
        lastSeen: statusData?.last_seen || "",
        isVerified: profileData.verification_status || false,
      });

    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!profile || isLiked) return;

    try {
      await supabase
        .from("matches")
        .insert({
          user_id: currentUserId,
          matched_user_id: profile.userId,
          status: "pending",
          match_score: 75,
        });

      setIsLiked(true);
      toast({
        title: "Liked! 💕",
        description: `You liked ${profile.fullName}`,
      });
    } catch (error) {
      console.error("Error liking profile:", error);
      toast({
        title: "Error",
        description: "Failed to send like",
        variant: "destructive",
      });
    }
  };

  const handleChat = () => {
    if (profile) {
      navigate(`/chat/${profile.userId}`);
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    if (!lastSeen) return "Unknown";
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Profile Not Found</h2>
          <Button variant="gradient" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <MeowLogo size="sm" />
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profile Card */}
        <Card className="overflow-hidden animate-fade-in shadow-card">
          {/* Avatar Section */}
          <div className="relative">
            <div className="aspect-square max-h-[400px] overflow-hidden bg-muted">
              {profile.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt={profile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-rose-500/20">
                  <span className="text-9xl font-bold text-primary/50">
                    {profile.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Online Status Badge */}
            <div className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm ${
              profile.isOnline 
                ? "bg-emerald-500/20 border border-emerald-500/30" 
                : "bg-muted/80"
            }`}>
              <Circle className={`w-3 h-3 ${
                profile.isOnline 
                  ? "fill-emerald-500 text-emerald-500 animate-pulse" 
                  : "fill-muted-foreground text-muted-foreground"
              }`} />
              <span className={`text-sm font-medium ${
                profile.isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              }`}>
                {profile.isOnline ? "Online" : `Last seen ${formatLastSeen(profile.lastSeen)}`}
              </span>
            </div>

            {/* Verified Badge */}
            {profile.isVerified && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Verified</span>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="p-6 space-y-6">
            {/* Name and Age */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.fullName}
                  {profile.age && <span className="text-muted-foreground font-normal">, {profile.age}</span>}
                </h1>
                <p className="text-muted-foreground">{profile.gender}</p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span>
                {profile.state ? `${profile.state}, ` : ""}{profile.country}
              </span>
            </div>

            {/* Languages Section */}
            <div className="space-y-4">
              {/* Mother Tongue */}
              <div className="flex items-start gap-3">
                <Languages className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mother Tongue</p>
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm">
                    {profile.motherTongue}
                  </span>
                </div>
              </div>

              {/* Optional Languages */}
              {profile.optionalLanguages.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-5" /> {/* Spacer for alignment */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Also speaks</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.optionalLanguages.map(lang => (
                        <span 
                          key={lang}
                          className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Age Info */}
            {profile.age && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-5 h-5" />
                <span>{profile.age} years old</span>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {/* Like Button */}
          <Button
            variant={isLiked ? "secondary" : "gradient"}
            className="flex-1 h-14 text-lg gap-2"
            onClick={handleLike}
            disabled={isLiked}
          >
            <Heart className={`w-6 h-6 ${isLiked ? "fill-primary text-primary" : ""}`} />
            {isLiked ? "Liked" : "Like"}
          </Button>

          {/* Chat Button */}
          <Button
            variant="outline"
            className="flex-1 h-14 text-lg gap-2"
            onClick={handleChat}
          >
            <MessageCircle className="w-6 h-6" />
            Chat
          </Button>
        </div>

        {/* Online Status Card */}
        <Card className={`p-4 animate-fade-in border-2 transition-colors ${
          profile.isOnline 
            ? "bg-emerald-500/5 border-emerald-500/20" 
            : "bg-muted/50 border-transparent"
        }`} style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              profile.isOnline ? "bg-emerald-500/20" : "bg-muted"
            }`}>
              <Circle className={`w-6 h-6 ${
                profile.isOnline 
                  ? "fill-emerald-500 text-emerald-500 animate-pulse" 
                  : "fill-muted-foreground/50 text-muted-foreground/50"
              }`} />
            </div>
            <div>
              <p className={`font-medium ${
                profile.isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              }`}>
                {profile.isOnline ? "Currently Online" : "Currently Offline"}
              </p>
              <p className="text-sm text-muted-foreground">
                {profile.isOnline 
                  ? "Available to chat now"
                  : `Last active ${formatLastSeen(profile.lastSeen)}`
                }
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ProfileDetailScreen;
