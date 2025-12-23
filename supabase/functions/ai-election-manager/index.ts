import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEADER_TERM_YEARS = 1; // 1 year term
const ELECTION_DURATION_DAYS = 7; // Election runs for 7 days
const SHIFT_HOURS = 9;
const SHIFT_CHANGE_BUFFER = 1;
const WEEK_OFF_INTERVAL = 2; // Week off every 2 days

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, languageCode, userId, candidateId, nomineeId, date } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const currentYear = now.getFullYear();

    // ============= GET ELECTION STATUS =============
    if (action === "get_status") {
      if (!languageCode) {
        return new Response(
          JSON.stringify({ error: "Language code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current election
      const { data: election } = await supabase
        .from("community_elections")
        .select("*")
        .eq("language_code", languageCode)
        .eq("election_year", currentYear)
        .maybeSingle();

      // Get current leader
      const { data: leader } = await supabase
        .from("community_leaders")
        .select("*, profiles:user_id(full_name, photo_url)")
        .eq("language_code", languageCode)
        .eq("status", "active")
        .maybeSingle();

      // Get candidates if election exists
      let candidates: any[] = [];
      if (election) {
        const { data: candidatesData } = await supabase
          .from("election_candidates")
          .select("*, profiles:user_id(full_name, photo_url)")
          .eq("election_id", election.id)
          .order("vote_count", { ascending: false });
        candidates = candidatesData || [];
      }

      // Check if user has voted
      let hasVoted = false;
      if (election && userId) {
        const { data: vote } = await supabase
          .from("election_votes")
          .select("id")
          .eq("election_id", election.id)
          .eq("voter_id", userId)
          .maybeSingle();
        hasVoted = !!vote;
      }

      // Get total votes cast
      let totalVotes = 0;
      if (election) {
        const { count } = await supabase
          .from("election_votes")
          .select("*", { count: "exact", head: true })
          .eq("election_id", election.id);
        totalVotes = count || 0;
      }

      // Check if new election needed (leader term expired)
      let needsNewElection = false;
      if (leader) {
        const termEnd = new Date(leader.term_end);
        needsNewElection = now > termEnd;
      } else {
        needsNewElection = !election || election.status === "completed";
      }

      return new Response(
        JSON.stringify({
          success: true,
          election: election ? {
            ...election,
            election_results: election.election_results as Record<string, any> | null
          } : null,
          leader: leader ? {
            ...leader,
            full_name: (leader.profiles as any)?.full_name,
            photo_url: (leader.profiles as any)?.photo_url
          } : null,
          candidates: candidates.map(c => ({
            ...c,
            full_name: (c.profiles as any)?.full_name,
            photo_url: (c.profiles as any)?.photo_url
          })),
          hasVoted,
          totalVotes,
          needsNewElection,
          termYears: LEADER_TERM_YEARS,
          shiftConfig: { hours: SHIFT_HOURS, buffer: SHIFT_CHANGE_BUFFER, weekOffInterval: WEEK_OFF_INTERVAL }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= START NEW ELECTION =============
    if (action === "start_election") {
      if (!languageCode) {
        return new Response(
          JSON.stringify({ error: "Language code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if election already exists for this year
      const { data: existing } = await supabase
        .from("community_elections")
        .select("id, status")
        .eq("language_code", languageCode)
        .eq("election_year", currentYear)
        .maybeSingle();

      if (existing && existing.status !== "completed") {
        return new Response(
          JSON.stringify({ error: "Election already in progress for this year" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new election (AI manages it)
      const electionEnd = new Date(now.getTime() + ELECTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
      
      const { data: election, error } = await supabase
        .from("community_elections")
        .insert({
          language_code: languageCode,
          election_year: currentYear,
          election_officer_id: userId, // Creator becomes election officer
          status: "active",
          started_at: now.toISOString(),
          scheduled_at: electionEnd.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`[AI Election] Started election for ${languageCode}, ends ${electionEnd.toISOString()}`);

      return new Response(
        JSON.stringify({
          success: true,
          election,
          message: `Election started for ${languageCode} speakers. Voting ends in ${ELECTION_DURATION_DAYS} days.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= NOMINATE CANDIDATE =============
    if (action === "nominate_candidate") {
      if (!languageCode || !nomineeId) {
        return new Response(
          JSON.stringify({ error: "Language code and nominee ID are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get active election
      const { data: election } = await supabase
        .from("community_elections")
        .select("id, status")
        .eq("language_code", languageCode)
        .eq("election_year", currentYear)
        .eq("status", "active")
        .maybeSingle();

      if (!election) {
        return new Response(
          JSON.stringify({ error: "No active election found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already a candidate
      const { data: existing } = await supabase
        .from("election_candidates")
        .select("id")
        .eq("election_id", election.id)
        .eq("user_id", nomineeId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "This person is already a candidate" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add candidate
      const { data: candidate, error } = await supabase
        .from("election_candidates")
        .insert({
          election_id: election.id,
          user_id: nomineeId,
          nomination_status: "approved" // Auto-approved
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`[AI Election] Nominated candidate ${nomineeId} for election ${election.id}`);

      return new Response(
        JSON.stringify({ success: true, candidate, message: "Candidate nominated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= CAST VOTE =============
    if (action === "cast_vote") {
      if (!languageCode || !userId || !candidateId) {
        return new Response(
          JSON.stringify({ error: "Language code, user ID, and candidate ID are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get active election
      const { data: election } = await supabase
        .from("community_elections")
        .select("id")
        .eq("language_code", languageCode)
        .eq("election_year", currentYear)
        .eq("status", "active")
        .maybeSingle();

      if (!election) {
        return new Response(
          JSON.stringify({ error: "No active election found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already voted
      const { data: existingVote } = await supabase
        .from("election_votes")
        .select("id")
        .eq("election_id", election.id)
        .eq("voter_id", userId)
        .maybeSingle();

      if (existingVote) {
        return new Response(
          JSON.stringify({ error: "You have already voted in this election" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify candidate exists
      const { data: candidate } = await supabase
        .from("election_candidates")
        .select("id")
        .eq("id", candidateId)
        .eq("election_id", election.id)
        .maybeSingle();

      if (!candidate) {
        return new Response(
          JSON.stringify({ error: "Invalid candidate" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cast vote (anonymous - only stores election_id, candidate_id, voter_id for uniqueness)
      const { error: voteError } = await supabase
        .from("election_votes")
        .insert({
          election_id: election.id,
          candidate_id: candidateId,
          voter_id: userId
        });

      if (voteError) throw voteError;

      // Update candidate vote count
      await supabase.rpc("increment_vote_count", { candidate_uuid: candidateId });

      console.log(`[AI Election] Vote cast by ${userId} for candidate ${candidateId}`);

      return new Response(
        JSON.stringify({ success: true, message: "Vote cast successfully. Your vote is anonymous." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= END ELECTION & DECLARE WINNER =============
    if (action === "end_election") {
      if (!languageCode) {
        return new Response(
          JSON.stringify({ error: "Language code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get active election
      const { data: election } = await supabase
        .from("community_elections")
        .select("*")
        .eq("language_code", languageCode)
        .eq("election_year", currentYear)
        .eq("status", "active")
        .maybeSingle();

      if (!election) {
        return new Response(
          JSON.stringify({ error: "No active election found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get candidates sorted by votes
      const { data: candidates } = await supabase
        .from("election_candidates")
        .select("*")
        .eq("election_id", election.id)
        .order("vote_count", { ascending: false });

      if (!candidates || candidates.length === 0) {
        return new Response(
          JSON.stringify({ error: "No candidates in this election" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const winner = candidates[0];
      const totalVotes = candidates.reduce((sum, c) => sum + c.vote_count, 0);

      // Check for tie
      const topVote = winner.vote_count;
      const tiedCandidates = candidates.filter(c => c.vote_count === topVote);

      if (tiedCandidates.length > 1) {
        // AI breaks tie by selecting random winner
        const randomWinner = tiedCandidates[Math.floor(Math.random() * tiedCandidates.length)];
        console.log(`[AI Election] Tie detected. AI randomly selected winner: ${randomWinner.user_id}`);
        
        // Update election
        await supabase
          .from("community_elections")
          .update({
            status: "completed",
            ended_at: now.toISOString(),
            winner_id: randomWinner.user_id,
            total_votes: totalVotes,
            election_results: { 
              tiebroken: true, 
              tiedCandidates: tiedCandidates.map(c => c.user_id),
              aiSelectedWinner: randomWinner.user_id
            }
          })
          .eq("id", election.id);

        // Create new leader with 1-year term
        const termEnd = new Date(now.getTime() + LEADER_TERM_YEARS * 365 * 24 * 60 * 60 * 1000);
        
        await supabase
          .from("community_leaders")
          .update({ status: "expired" })
          .eq("language_code", languageCode)
          .eq("status", "active");

        await supabase
          .from("community_leaders")
          .insert({
            language_code: languageCode,
            user_id: randomWinner.user_id,
            election_id: election.id,
            term_start: now.toISOString(),
            term_end: termEnd.toISOString(),
            status: "active"
          });

        return new Response(
          JSON.stringify({
            success: true,
            winner: randomWinner,
            totalVotes,
            tiebroken: true,
            message: `Election completed! AI broke the tie. Leader term: ${LEADER_TERM_YEARS} year(s)`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear winner
      await supabase
        .from("community_elections")
        .update({
          status: "completed",
          ended_at: now.toISOString(),
          winner_id: winner.user_id,
          total_votes: totalVotes,
          election_results: { candidates: candidates.map(c => ({ userId: c.user_id, votes: c.vote_count })) }
        })
        .eq("id", election.id);

      // Create new leader with 1-year term
      const termEnd = new Date(now.getTime() + LEADER_TERM_YEARS * 365 * 24 * 60 * 60 * 1000);

      await supabase
        .from("community_leaders")
        .update({ status: "expired" })
        .eq("language_code", languageCode)
        .eq("status", "active");

      await supabase
        .from("community_leaders")
        .insert({
          language_code: languageCode,
          user_id: winner.user_id,
          election_id: election.id,
          term_start: now.toISOString(),
          term_end: termEnd.toISOString(),
          status: "active"
        });

      console.log(`[AI Election] Election completed. Winner: ${winner.user_id}, Term ends: ${termEnd.toISOString()}`);

      return new Response(
        JSON.stringify({
          success: true,
          winner,
          totalVotes,
          termEnd: termEnd.toISOString(),
          message: `Election completed! New leader for ${LEADER_TERM_YEARS} year(s).`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= CHECK AND AUTO-SCHEDULE ELECTIONS =============
    if (action === "check_term_expiry") {
      // Find all language groups with expired leader terms
      const { data: expiredLeaders } = await supabase
        .from("community_leaders")
        .select("language_code, term_end")
        .eq("status", "active")
        .lt("term_end", now.toISOString());

      const scheduledElections: string[] = [];

      for (const leader of expiredLeaders || []) {
        // Check if election already exists
        const { data: existing } = await supabase
          .from("community_elections")
          .select("id")
          .eq("language_code", leader.language_code)
          .eq("election_year", currentYear)
          .neq("status", "completed")
          .maybeSingle();

        if (!existing) {
          // Create new election
          const electionEnd = new Date(now.getTime() + ELECTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
          
          const { error } = await supabase
            .from("community_elections")
            .insert({
              language_code: leader.language_code,
              election_year: currentYear,
              election_officer_id: leader.language_code, // Placeholder - AI manages
              status: "active",
              started_at: now.toISOString(),
              scheduled_at: electionEnd.toISOString()
            });

          if (!error) {
            scheduledElections.push(leader.language_code);
            console.log(`[AI Election] Auto-scheduled election for ${leader.language_code}`);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          expiredLeaders: expiredLeaders?.length || 0,
          scheduledElections,
          message: `Checked ${expiredLeaders?.length || 0} leaders, scheduled ${scheduledElections.length} new elections`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= LEADER ACTIONS: SEND ANNOUNCEMENT =============
    if (action === "send_announcement") {
      if (!languageCode || !userId) {
        return new Response(
          JSON.stringify({ error: "Language code and user ID are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { title, content, priority } = body;

      // Verify user is the leader
      const { data: leader } = await supabase
        .from("community_leaders")
        .select("id")
        .eq("language_code", languageCode)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (!leader) {
        return new Response(
          JSON.stringify({ error: "Only the community leader can send announcements" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create announcement
      const { data: announcement, error } = await supabase
        .from("community_announcements")
        .insert({
          language_code: languageCode,
          leader_id: userId,
          title: title || "Announcement",
          content: content || "",
          priority: priority || "normal"
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`[AI Election] Leader ${userId} sent announcement for ${languageCode}`);

      return new Response(
        JSON.stringify({ success: true, announcement, message: "Announcement sent successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= LEADER ACTIONS: RESOLVE DISPUTE =============
    if (action === "resolve_dispute") {
      if (!languageCode || !userId) {
        return new Response(
          JSON.stringify({ error: "Language code and user ID are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { disputeId, resolution } = body;

      // Verify user is the leader
      const { data: leader } = await supabase
        .from("community_leaders")
        .select("id")
        .eq("language_code", languageCode)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (!leader) {
        return new Response(
          JSON.stringify({ error: "Only the community leader can resolve disputes" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update dispute
      const { error } = await supabase
        .from("community_disputes")
        .update({
          status: "resolved",
          resolution,
          resolved_by: userId,
          resolved_at: now.toISOString()
        })
        .eq("id", disputeId)
        .eq("language_code", languageCode);

      if (error) throw error;

      console.log(`[AI Election] Leader ${userId} resolved dispute ${disputeId}`);

      return new Response(
        JSON.stringify({ success: true, message: "Dispute resolved successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI Election] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
