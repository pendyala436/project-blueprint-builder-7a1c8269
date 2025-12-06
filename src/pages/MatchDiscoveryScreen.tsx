import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  X, 
  ArrowLeft,
  Languages,
  MapPin,
  Loader2,
  Sparkles,
  RefreshCw,
  Eye,
  Shield,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MatchFiltersPanel, DEFAULT_FILTERS, type MatchFilters } from "@/components/MatchFiltersPanel";
import { Badge } from "@/components/ui/badge";

interface MatchUser {
  matchId: string;
  userId: string;
  fullName: string;
  avatar: string;
  languages: string[];
  country: string;
  matchScore: number;
  commonLanguages: string[];
  age?: number;
  isVerified?: boolean;
  isPremium?: boolean;
  isOnline?: boolean;
  bio?: string;
}

const MatchDiscoveryScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [filters, setFilters] = useState<MatchFilters>(DEFAULT_FILTERS);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [currentUserGender, setCurrentUserGender] = useState<string>("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMatches();
  }, [filters]);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      // Get current user's profile and languages
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("gender, country, preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: currentUserLanguages } = await supabase
        .from("user_languages")
        .select("language_name")
        .eq("user_id", user.id);

      const userLanguages = currentUserLanguages?.map(l => l.language_name) || [];
      const userGender = currentProfile?.gender || "";
      setCurrentUserGender(userGender);

      // Determine opposite gender for matching
      const oppositeGender = userGender === "Male" ? "Female" : 
                            userGender === "Female" ? "Male" : "";

      // Build comprehensive query with all profile fields for filtering
      let profilesQuery = supabase
        .from("profiles")
        .select(`
          user_id, full_name, photo_url, country, preferred_language,
          age, height_cm, body_type, education_level, occupation, religion,
          marital_status, has_children, smoking_habit, drinking_habit,
          dietary_preference, fitness_level, pet_preference, travel_frequency,
          personality_type, zodiac_sign, bio, is_verified, is_premium, last_active_at
        `)
        .neq("user_id", user.id);

      if (oppositeGender) {
        profilesQuery = profilesQuery.eq("gender", oppositeGender);
      }

      // Apply demographic filters
      if (filters.country !== "all") {
        profilesQuery = profilesQuery.eq("country", filters.country);
      }
      if (filters.bodyType !== "all") {
        profilesQuery = profilesQuery.eq("body_type", filters.bodyType);
      }
      if (filters.educationLevel !== "all") {
        profilesQuery = profilesQuery.eq("education_level", filters.educationLevel);
      }
      if (filters.occupation !== "all") {
        profilesQuery = profilesQuery.eq("occupation", filters.occupation);
      }
      if (filters.religion !== "all") {
        profilesQuery = profilesQuery.eq("religion", filters.religion);
      }
      if (filters.maritalStatus !== "all") {
        profilesQuery = profilesQuery.eq("marital_status", filters.maritalStatus);
      }
      if (filters.hasChildren === "yes") {
        profilesQuery = profilesQuery.eq("has_children", true);
      } else if (filters.hasChildren === "no") {
        profilesQuery = profilesQuery.eq("has_children", false);
      }

      // Lifestyle filters
      if (filters.smokingHabit !== "all") {
        profilesQuery = profilesQuery.eq("smoking_habit", filters.smokingHabit);
      }
      if (filters.drinkingHabit !== "all") {
        profilesQuery = profilesQuery.eq("drinking_habit", filters.drinkingHabit);
      }
      if (filters.dietaryPreference !== "all") {
        profilesQuery = profilesQuery.eq("dietary_preference", filters.dietaryPreference);
      }
      if (filters.fitnessLevel !== "all") {
        profilesQuery = profilesQuery.eq("fitness_level", filters.fitnessLevel);
      }
      if (filters.petPreference !== "all") {
        profilesQuery = profilesQuery.eq("pet_preference", filters.petPreference);
      }
      if (filters.travelFrequency !== "all") {
        profilesQuery = profilesQuery.eq("travel_frequency", filters.travelFrequency);
      }

      // Personality filters
      if (filters.zodiacSign !== "all") {
        profilesQuery = profilesQuery.eq("zodiac_sign", filters.zodiacSign);
      }
      if (filters.personalityType !== "all") {
        profilesQuery = profilesQuery.eq("personality_type", filters.personalityType);
      }

      // Safety & behavior filters
      if (filters.verifiedOnly) {
        profilesQuery = profilesQuery.eq("is_verified", true);
      }
      if (filters.premiumOnly) {
        profilesQuery = profilesQuery.eq("is_premium", true);
      }
      if (filters.hasPhoto) {
        profilesQuery = profilesQuery.not("photo_url", "is", null);
      }
      if (filters.hasBio) {
        profilesQuery = profilesQuery.not("bio", "is", null);
      }
      if (filters.newUsersOnly) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        profilesQuery = profilesQuery.gte("created_at", weekAgo.toISOString());
      }
      if (filters.onlineNow) {
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        profilesQuery = profilesQuery.gte("last_active_at", fiveMinutesAgo.toISOString());
      }

      const { data: profiles } = await profilesQuery;

      if (!profiles || profiles.length === 0) {
        setMatches([]);
        setIsLoading(false);
        return;
      }

      // Get already matched users to exclude
      const { data: existingMatches } = await supabase
        .from("matches")
        .select("matched_user_id")
        .eq("user_id", user.id);

      const matchedUserIds = new Set(existingMatches?.map(m => m.matched_user_id) || []);

      // Get online status for all profiles
      const userIds = profiles.map(p => p.user_id);
      const { data: onlineStatuses } = await supabase
        .from("user_status")
        .select("user_id, is_online")
        .in("user_id", userIds);

      const onlineStatusMap = new Map(onlineStatuses?.map(s => [s.user_id, s.is_online]) || []);

      // Collect unique languages and countries for filters
      const languagesSet = new Set<string>();
      const countriesSet = new Set<string>();

      // Calculate match scores
      const matchedUsers: MatchUser[] = await Promise.all(
        profiles
          .filter(p => !matchedUserIds.has(p.user_id))
          .filter(p => {
            // Age filter (client-side for range)
            if (p.age) {
              if (p.age < filters.ageRange[0] || p.age > filters.ageRange[1]) return false;
            }
            // Height filter (client-side for range)
            if (p.height_cm) {
              if (p.height_cm < filters.heightRange[0] || p.height_cm > filters.heightRange[1]) return false;
            }
            return true;
          })
          .map(async (profile) => {
            const { data: profileLanguages } = await supabase
              .from("user_languages")
              .select("language_name")
              .eq("user_id", profile.user_id);

            const theirLanguages = profileLanguages?.map(l => l.language_name) || [];
            
            // Add to filter options
            theirLanguages.forEach(l => languagesSet.add(l));
            if (profile.country) countriesSet.add(profile.country);

            // Calculate common languages (NLLB-200 based matching)
            const commonLanguages = userLanguages.filter(lang => 
              theirLanguages.includes(lang)
            );

            // Match score calculation based on language overlap
            let matchScore = 50; // Base score
            
            // Primary scoring: common languages (max 40 points)
            matchScore += Math.min(commonLanguages.length * 15, 40);
            
            // Same country bonus (10 points)
            if (profile.country === currentProfile?.country) {
              matchScore += 10;
            }

            return {
              matchId: `match_${profile.user_id}`,
              userId: profile.user_id,
              fullName: profile.full_name || "Anonymous",
              avatar: profile.photo_url || "",
              languages: theirLanguages,
              country: profile.country || "Unknown",
              matchScore: Math.min(matchScore, 100),
              commonLanguages,
              age: profile.age || undefined,
              isVerified: profile.is_verified || false,
              isPremium: profile.is_premium || false,
              isOnline: onlineStatusMap.get(profile.user_id) || false,
              bio: profile.bio || undefined,
            };
          })
      );

      setAvailableLanguages(Array.from(languagesSet));
      setAvailableCountries(Array.from(countriesSet));

      // Filter by language if selected
      let filteredMatches = matchedUsers;
      if (filters.language !== "all") {
        filteredMatches = matchedUsers.filter(m => 
          m.languages.includes(filters.language)
        );
      }

      // Sort by match score (highest first)
      filteredMatches.sort((a, b) => b.matchScore - a.matchScore);

      setMatches(filteredMatches);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error loading matches:", error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (matchUser: MatchUser) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setSwipeDirection("right");

      // Create match record
      await supabase
        .from("matches")
        .insert({
          user_id: user.id,
          matched_user_id: matchUser.userId,
          status: "pending",
          match_score: matchUser.matchScore,
        });

      toast({
        title: "Liked! 💕",
        description: `Match score: ${matchUser.matchScore}% with ${matchUser.fullName}`,
      });

      // Move to next after animation
      setTimeout(() => {
        setSwipeDirection(null);
        goToNext();
      }, 300);
    } catch (error) {
      console.error("Error liking user:", error);
      setSwipeDirection(null);
      toast({
        title: "Error",
        description: "Failed to send like",
        variant: "destructive",
      });
    }
  };

  const handleDislike = () => {
    setSwipeDirection("left");
    setTimeout(() => {
      setSwipeDirection(null);
      goToNext();
    }, 300);
  };

  const goToNext = () => {
    if (currentIndex < matches.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast({
        title: "No more matches",
        description: "Check back later for more recommendations!",
      });
    }
  };

  const currentMatch = matches[currentIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Finding your matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <MeowLogo size="sm" />
          
          <div className="flex items-center gap-2">
            {/* Advanced Filters Panel */}
            <MatchFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableLanguages={availableLanguages}
              availableCountries={availableCountries}
            />

            <Button 
              variant="ghost" 
              size="icon"
              onClick={loadMatches}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {matches.length === 0 ? (
          <Card className="p-12 text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No matches found</h2>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or check back later
            </p>
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Clear Filters
              </Button>
              <Button variant="gradient" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Title */}
            <div className="text-center animate-fade-in">
              <h1 className="text-2xl font-bold text-foreground mb-2">Discover Matches</h1>
              <p className="text-muted-foreground">
                {matches.length} potential match{matches.length !== 1 ? "es" : ""} based on language compatibility
              </p>
            </div>

            {/* Active Filters Summary */}
            {(filters.language !== "all" || filters.country !== "all" || filters.verifiedOnly || filters.onlineNow) && (
              <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
                {filters.language !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    <Languages className="w-3 h-3" />
                    {filters.language}
                  </Badge>
                )}
                {filters.country !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="w-3 h-3" />
                    {filters.country}
                  </Badge>
                )}
                {filters.verifiedOnly && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                {filters.onlineNow && (
                  <Badge variant="secondary" className="gap-1 bg-emerald-500/20 text-emerald-600">
                    Online Now
                  </Badge>
                )}
              </div>
            )}

            {/* Match Card */}
            {currentMatch && (
              <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <div 
                  ref={cardRef}
                  className={`relative w-full max-w-sm transition-all duration-300 ${
                    swipeDirection === "left" 
                      ? "-translate-x-full rotate-[-20deg] opacity-0" 
                      : swipeDirection === "right" 
                      ? "translate-x-full rotate-[20deg] opacity-0"
                      : ""
                  }`}
                >
                  <Card className="overflow-hidden shadow-card border-border/50">
                    {/* Match Score Badge */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-rose-500 text-white">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-bold">{currentMatch.matchScore}% Match</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                      {currentMatch.avatar ? (
                        <img 
                          src={currentMatch.avatar} 
                          alt={currentMatch.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-rose-500/20">
                          <span className="text-8xl font-bold text-primary/50">
                            {currentMatch.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                      {/* User info */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
                        <h3 className="text-2xl font-bold text-foreground">
                          {currentMatch.fullName}
                        </h3>
                        
                        {/* Country */}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{currentMatch.country}</span>
                        </div>

                        {/* Languages */}
                        <div className="flex flex-wrap gap-2">
                          {currentMatch.languages.map(lang => (
                            <span 
                              key={lang}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                currentMatch.commonLanguages.includes(lang)
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {currentMatch.commonLanguages.includes(lang) && "✓ "}
                              {lang}
                            </span>
                          ))}
                        </div>

                        {/* Common languages info */}
                        {currentMatch.commonLanguages.length > 0 && (
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Languages className="w-4 h-4" />
                            {currentMatch.commonLanguages.length} common language{currentMatch.commonLanguages.length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Swipe Indicators */}
                  <div className={`absolute inset-0 flex items-center justify-start pl-8 pointer-events-none transition-opacity ${
                    swipeDirection === "left" ? "opacity-100" : "opacity-0"
                  }`}>
                    <div className="px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-2xl rotate-[-20deg] border-4 border-destructive">
                      NOPE
                    </div>
                  </div>
                  <div className={`absolute inset-0 flex items-center justify-end pr-8 pointer-events-none transition-opacity ${
                    swipeDirection === "right" ? "opacity-100" : "opacity-0"
                  }`}>
                    <div className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-2xl rotate-[20deg] border-4 border-emerald-500">
                      LIKE
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {currentMatch && (
              <div className="flex justify-center gap-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                {/* Dislike Button */}
                <button
                  onClick={handleDislike}
                  className="group w-16 h-16 rounded-full bg-card border-2 border-border hover:border-destructive/50 hover:bg-destructive/10 flex items-center justify-center transition-all duration-300 shadow-card hover:shadow-lg active:scale-95"
                >
                  <X className="w-8 h-8 text-muted-foreground group-hover:text-destructive transition-colors" />
                </button>

                {/* Like Button */}
                <button
                  onClick={() => handleLike(currentMatch)}
                  className="group w-20 h-20 rounded-full bg-gradient-to-br from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90 flex items-center justify-center transition-all duration-300 shadow-glow hover:shadow-lg hover:scale-110 active:scale-95"
                >
                  <Heart className="w-10 h-10 text-white fill-white" />
                </button>

                {/* View Profile */}
                <button
                  onClick={() => navigate(`/profile/${currentMatch.userId}`)}
                  className="group w-16 h-16 rounded-full bg-card border-2 border-border hover:border-primary/50 hover:bg-primary/10 flex items-center justify-center transition-all duration-300 shadow-card hover:shadow-lg active:scale-95"
                >
                  <Eye className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            )}

            {/* Progress */}
            {currentMatch && (
              <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
                {currentIndex + 1} of {matches.length} matches
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MatchDiscoveryScreen;
