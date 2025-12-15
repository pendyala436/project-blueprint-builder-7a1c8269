import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Model for community member
class CommunityMember {
  final String userId;
  final String fullName;
  final String? photoUrl;
  final bool isLeader;
  final bool isElectionOfficer;
  final bool isCandidate;
  final int voteCount;
  final bool isOnline;
  final int seniority; // days since joining

  CommunityMember({
    required this.userId,
    required this.fullName,
    this.photoUrl,
    this.isLeader = false,
    this.isElectionOfficer = false,
    this.isCandidate = false,
    this.voteCount = 0,
    this.isOnline = false,
    this.seniority = 0,
  });
}

/// Model for election data
class ElectionData {
  final bool active;
  final String? scheduledAt;
  final String? startedAt;
  final List<String> candidates;
  final String? officerVote;

  ElectionData({
    this.active = false,
    this.scheduledAt,
    this.startedAt,
    this.candidates = const [],
    this.officerVote,
  });

  factory ElectionData.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return ElectionData();
    }
    return ElectionData(
      active: json['active'] as bool? ?? false,
      scheduledAt: json['scheduledAt'] as String?,
      startedAt: json['startedAt'] as String?,
      candidates: (json['candidates'] as List<dynamic>?)?.cast<String>() ?? [],
      officerVote: json['officerVote'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'active': active,
    'scheduledAt': scheduledAt,
    'startedAt': startedAt,
    'candidates': candidates,
    'officerVote': officerVote,
  };
}

/// Service for language community features
class LanguageCommunityService {
  final _supabase = Supabase.instance.client;
  
  String? get _currentUserId => _supabase.auth.currentUser?.id;

  /// Load community members for a language
  Future<List<CommunityMember>> loadMembers(String language) async {
    if (_currentUserId == null) return [];

    // Get users who speak this language
    final languageUsers = await _supabase
        .from('user_languages')
        .select('user_id, created_at')
        .eq('language_name', language);

    if (languageUsers.isEmpty) return [];

    final userIds = (languageUsers as List).map((u) => u['user_id'] as String).toList();
    final joinDates = <String, String>{};
    for (final u in languageUsers) {
      joinDates[u['user_id'] as String] = u['created_at'] as String;
    }

    // Get female profiles
    final profiles = await _supabase
        .from('female_profiles')
        .select('user_id, full_name, photo_url, created_at')
        .inFilter('user_id', userIds);

    // Get online status
    final onlineStatus = await _supabase
        .from('user_status')
        .select('user_id, is_online')
        .inFilter('user_id', userIds);

    final onlineMap = <String, bool>{};
    for (final s in onlineStatus) {
      onlineMap[s['user_id'] as String] = s['is_online'] as bool;
    }

    // Get leadership data
    final leadershipData = await _supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .eq('category', 'language_community')
        .inFilter('setting_key', [
          'leader_$language',
          'election_officer_$language',
          'election_data_$language',
          'votes_$language',
        ]);

    final settings = <String, dynamic>{};
    for (final s in leadershipData) {
      settings[s['setting_key'] as String] = s['setting_value'];
    }

    final leaderId = (settings['leader_$language'] as Map<String, dynamic>?)?['userId'] as String?;
    final officerId = (settings['election_officer_$language'] as Map<String, dynamic>?)?['userId'] as String?;
    final election = ElectionData.fromJson(settings['election_data_$language'] as Map<String, dynamic>?);
    final votes = settings['votes_$language'] as Map<String, dynamic>? ?? {};

    // Calculate vote counts
    final voteCounts = <String, int>{};
    for (final v in votes.values) {
      final candidateId = v as String;
      voteCounts[candidateId] = (voteCounts[candidateId] ?? 0) + 1;
    }

    // Build members list
    final now = DateTime.now();
    final members = <CommunityMember>[];
    
    for (final p in profiles) {
      final userId = p['user_id'] as String;
      final joinedAt = joinDates[userId] ?? p['created_at'] as String;
      final seniority = now.difference(DateTime.parse(joinedAt)).inDays;

      members.add(CommunityMember(
        userId: userId,
        fullName: p['full_name'] as String? ?? 'Unknown',
        photoUrl: p['photo_url'] as String?,
        isLeader: userId == leaderId,
        isElectionOfficer: userId == officerId,
        isCandidate: election.candidates.contains(userId),
        voteCount: voteCounts[userId] ?? 0,
        isOnline: onlineMap[userId] ?? false,
        seniority: seniority,
      ));
    }

    // Sort by seniority (most senior first)
    members.sort((a, b) => b.seniority.compareTo(a.seniority));

    return members;
  }

  /// Get election data for a language
  Future<ElectionData> getElectionData(String language) async {
    final data = await _supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'election_data_$language')
        .maybeSingle();

    return ElectionData.fromJson(data?['setting_value'] as Map<String, dynamic>?);
  }

  /// Check if current user has voted
  Future<bool> hasVoted(String language) async {
    if (_currentUserId == null) return false;

    final data = await _supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'votes_$language')
        .maybeSingle();

    final votes = data?['setting_value'] as Map<String, dynamic>? ?? {};
    return votes.containsKey(_currentUserId);
  }

  /// Auto-assign election officer based on seniority
  Future<void> autoAssignElectionOfficer(String language, String userId) async {
    await _supabase.from('app_settings').upsert({
      'setting_key': 'election_officer_$language',
      'category': 'language_community',
      'setting_type': 'json',
      'setting_value': {
        'userId': userId,
        'assignedAt': DateTime.now().toIso8601String(),
        'autoAssigned': true,
      },
      'is_public': false,
    }, onConflict: 'setting_key');
  }

  /// Create election with candidates
  Future<bool> createElection(String language, List<String> candidates, {DateTime? scheduledAt}) async {
    if (candidates.length < 2) return false;

    try {
      final electionData = ElectionData(
        active: false,
        candidates: candidates,
        scheduledAt: scheduledAt?.toIso8601String(),
      );

      await _supabase.from('app_settings').upsert({
        'setting_key': 'election_data_$language',
        'category': 'language_community',
        'setting_type': 'json',
        'setting_value': electionData.toJson(),
        'is_public': false,
      }, onConflict: 'setting_key');

      // Clear previous votes
      await _supabase.from('app_settings').upsert({
        'setting_key': 'votes_$language',
        'category': 'language_community',
        'setting_type': 'json',
        'setting_value': <String, dynamic>{},
        'is_public': false,
      }, onConflict: 'setting_key');

      return true;
    } catch (e) {
      print('Error creating election: $e');
      return false;
    }
  }

  /// Start election
  Future<bool> startElection(String language) async {
    try {
      final current = await getElectionData(language);
      if (current.candidates.length < 2) return false;

      await _supabase.from('app_settings').upsert({
        'setting_key': 'election_data_$language',
        'category': 'language_community',
        'setting_type': 'json',
        'setting_value': {
          ...current.toJson(),
          'active': true,
          'startedAt': DateTime.now().toIso8601String(),
        },
        'is_public': false,
      }, onConflict: 'setting_key');

      return true;
    } catch (e) {
      print('Error starting election: $e');
      return false;
    }
  }

  /// Cast vote
  Future<bool> castVote(String language, String candidateId) async {
    if (_currentUserId == null) return false;

    try {
      // Get current votes
      final data = await _supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'votes_$language')
          .maybeSingle();

      final votes = Map<String, dynamic>.from(data?['setting_value'] as Map<String, dynamic>? ?? {});
      
      // Check if already voted
      if (votes.containsKey(_currentUserId)) return false;

      votes[_currentUserId!] = candidateId;

      await _supabase.from('app_settings').upsert({
        'setting_key': 'votes_$language',
        'category': 'language_community',
        'setting_type': 'json',
        'setting_value': votes,
        'is_public': false,
      }, onConflict: 'setting_key');

      return true;
    } catch (e) {
      print('Error casting vote: $e');
      return false;
    }
  }

  /// End election and determine winner
  /// Returns the winner ID, or null if there's a tie (requires officer tiebreaker)
  Future<String?> endElection(String language) async {
    try {
      // Get votes
      final data = await _supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'votes_$language')
          .maybeSingle();

      final votes = data?['setting_value'] as Map<String, dynamic>? ?? {};
      final voteCounts = <String, int>{};

      for (final v in votes.values) {
        final candidateId = v as String;
        voteCounts[candidateId] = (voteCounts[candidateId] ?? 0) + 1;
      }

      if (voteCounts.isEmpty) return null;

      // Find max votes
      final maxVotes = voteCounts.values.reduce((a, b) => a > b ? a : b);
      final topCandidates = voteCounts.entries
          .where((e) => e.value == maxVotes)
          .map((e) => e.key)
          .toList();

      // Check for tie
      if (topCandidates.length > 1) {
        return null; // Tie - officer needs to decide
      }

      // Single winner
      final winnerId = topCandidates.first;
      await finalizeElection(language, winnerId);
      return winnerId;
    } catch (e) {
      print('Error ending election: $e');
      return null;
    }
  }

  /// Cast tiebreaker vote (officer only)
  Future<bool> castTiebreakerVote(String language, String winnerId) async {
    return await finalizeElection(language, winnerId);
  }

  /// Finalize election with winner
  Future<bool> finalizeElection(String language, String winnerId) async {
    try {
      await _supabase.from('app_settings').upsert([
        {
          'setting_key': 'leader_$language',
          'category': 'language_community',
          'setting_type': 'json',
          'setting_value': {
            'userId': winnerId,
            'electedAt': DateTime.now().toIso8601String(),
          },
          'is_public': false,
        },
        {
          'setting_key': 'election_data_$language',
          'category': 'language_community',
          'setting_type': 'json',
          'setting_value': {'active': false, 'candidates': <String>[]},
          'is_public': false,
        },
      ], onConflict: 'setting_key');

      return true;
    } catch (e) {
      print('Error finalizing election: $e');
      return false;
    }
  }

  /// Get tied candidates (for tiebreaker)
  Future<List<String>> getTiedCandidates(String language) async {
    final data = await _supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'votes_$language')
        .maybeSingle();

    final votes = data?['setting_value'] as Map<String, dynamic>? ?? {};
    final voteCounts = <String, int>{};

    for (final v in votes.values) {
      final candidateId = v as String;
      voteCounts[candidateId] = (voteCounts[candidateId] ?? 0) + 1;
    }

    if (voteCounts.isEmpty) return [];

    final maxVotes = voteCounts.values.reduce((a, b) => a > b ? a : b);
    return voteCounts.entries
        .where((e) => e.value == maxVotes)
        .map((e) => e.key)
        .toList();
  }
}

/// Provider for language community service
final languageCommunityServiceProvider = Provider<LanguageCommunityService>((ref) {
  return LanguageCommunityService();
});

/// Language Community Panel Widget
class LanguageCommunityPanel extends ConsumerStatefulWidget {
  final String motherTongue;
  final String currentUserId;
  final String userName;
  final String? userPhoto;

  const LanguageCommunityPanel({
    super.key,
    required this.motherTongue,
    required this.currentUserId,
    required this.userName,
    this.userPhoto,
  });

  @override
  ConsumerState<LanguageCommunityPanel> createState() => _LanguageCommunityPanelState();
}

class _LanguageCommunityPanelState extends ConsumerState<LanguageCommunityPanel> {
  bool _isExpanded = false;
  List<CommunityMember> _members = [];
  ElectionData _electionData = ElectionData();
  bool _hasVoted = false;
  bool _isLoading = false;
  int _selectedTab = 0;
  
  CommunityMember? get _currentLeader => _members.where((m) => m.isLeader).firstOrNull;
  CommunityMember? get _electionOfficer => _members.where((m) => m.isElectionOfficer).firstOrNull;
  bool get _isElectionOfficer => _electionOfficer?.userId == widget.currentUserId;

  @override
  void initState() {
    super.initState();
    if (_isExpanded) {
      _loadData();
    }
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    final service = ref.read(languageCommunityServiceProvider);
    
    try {
      final members = await service.loadMembers(widget.motherTongue);
      final electionData = await service.getElectionData(widget.motherTongue);
      final hasVoted = await service.hasVoted(widget.motherTongue);

      // Auto-assign officer if none exists
      if (!members.any((m) => m.isElectionOfficer)) {
        final onlineMembers = members.where((m) => m.isOnline).toList();
        if (onlineMembers.isNotEmpty) {
          await service.autoAssignElectionOfficer(
            widget.motherTongue,
            onlineMembers.first.userId,
          );
          // Reload to get updated officer
          final updatedMembers = await service.loadMembers(widget.motherTongue);
          setState(() {
            _members = updatedMembers;
            _electionData = electionData;
            _hasVoted = hasVoted;
          });
          return;
        }
      }

      setState(() {
        _members = members;
        _electionData = electionData;
        _hasVoted = hasVoted;
      });
    } catch (e) {
      print('Error loading community data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final onlineCount = _members.where((m) => m.isOnline).length;

    return Card(
      child: Column(
        children: [
          // Header
          ListTile(
            leading: CircleAvatar(
              backgroundColor: theme.colorScheme.primary.withOpacity(0.2),
              child: Icon(Icons.people, color: theme.colorScheme.primary),
            ),
            title: Text('${widget.motherTongue} Community'),
            subtitle: Text('${_members.length} members • $onlineCount online'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_currentLeader != null)
                  Chip(
                    avatar: const Icon(Icons.star, size: 16, color: Colors.amber),
                    label: Text(_currentLeader!.fullName.split(' ').first),
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  ),
                IconButton(
                  icon: Icon(_isExpanded ? Icons.expand_less : Icons.expand_more),
                  onPressed: () {
                    setState(() => _isExpanded = !_isExpanded);
                    if (_isExpanded) _loadData();
                  },
                ),
              ],
            ),
          ),

          // Content
          if (_isExpanded) ...[
            const Divider(height: 1),
            
            // Tabs
            DefaultTabController(
              length: 3,
              child: Column(
                children: [
                  TabBar(
                    onTap: (index) => setState(() => _selectedTab = index),
                    tabs: const [
                      Tab(icon: Icon(Icons.chat, size: 20), text: 'Chat'),
                      Tab(icon: Icon(Icons.people, size: 20), text: 'Members'),
                      Tab(icon: Icon(Icons.how_to_vote, size: 20), text: 'Election'),
                    ],
                  ),
                  SizedBox(
                    height: 300,
                    child: IndexedStack(
                      index: _selectedTab,
                      children: [
                        _buildChatTab(),
                        _buildMembersTab(),
                        _buildElectionTab(),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChatTab() {
    return const Center(child: Text('Chat coming soon'));
  }

  Widget _buildMembersTab() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_members.isEmpty) {
      return const Center(child: Text('No members yet'));
    }

    return ListView.builder(
      itemCount: _members.length,
      padding: const EdgeInsets.all(8),
      itemBuilder: (context, index) {
        final member = _members[index];
        return _MemberCard(
          member: member,
          electionActive: _electionData.active,
          hasVoted: _hasVoted,
          currentUserId: widget.currentUserId,
          onVote: () => _castVote(member.userId),
        );
      },
    );
  }

  Widget _buildElectionTab() {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Election Status
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _electionData.active
                  ? Colors.green.withOpacity(0.1)
                  : theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _electionData.active
                    ? Colors.green.withOpacity(0.3)
                    : theme.colorScheme.outline.withOpacity(0.2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _electionData.active ? Icons.check_circle : Icons.schedule,
                  color: _electionData.active ? Colors.green : theme.colorScheme.onSurface,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _electionData.active
                            ? 'Election in Progress'
                            : 'No Active Election',
                        style: theme.textTheme.titleSmall,
                      ),
                      Text(
                        _electionData.active
                            ? 'Cast your vote for the next leader'
                            : 'Wait for the officer to start an election',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                if (_hasVoted && _electionData.active)
                  Chip(
                    label: const Text('Voted'),
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.2),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Leadership Cards
          Row(
            children: [
              Expanded(
                child: _LeadershipCard(
                  title: 'Current Leader',
                  icon: Icons.star,
                  iconColor: Colors.amber,
                  member: _currentLeader,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _LeadershipCard(
                  title: 'Election Officer',
                  icon: Icons.gavel,
                  iconColor: Colors.purple,
                  member: _electionOfficer,
                  subtitle: 'Auto-assigned',
                ),
              ),
            ],
          ),

          // Election Controls (for officer only)
          if (_isElectionOfficer) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                if (!_electionData.active)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _showCreateElectionDialog,
                      icon: const Icon(Icons.add),
                      label: const Text('Create Election'),
                    ),
                  ),
                if (_electionData.candidates.length >= 2 && !_electionData.active) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _startElection,
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Start'),
                    ),
                  ),
                ],
                if (_electionData.active)
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _endElection,
                      icon: const Icon(Icons.stop),
                      label: const Text('End Election'),
                      style: FilledButton.styleFrom(
                        backgroundColor: theme.colorScheme.error,
                      ),
                    ),
                  ),
              ],
            ),
          ],

          // Candidates
          if (_electionData.candidates.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text('Candidates (${_electionData.candidates.length})',
                style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            ..._members
                .where((m) => _electionData.candidates.contains(m.userId))
                .map((m) => _MemberCard(
                      member: m,
                      electionActive: _electionData.active,
                      hasVoted: _hasVoted,
                      currentUserId: widget.currentUserId,
                      onVote: () => _castVote(m.userId),
                    )),
          ],
        ],
      ),
    );
  }

  Future<void> _castVote(String candidateId) async {
    final service = ref.read(languageCommunityServiceProvider);
    final success = await service.castVote(widget.motherTongue, candidateId);
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vote recorded!')),
      );
      _loadData();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to vote')),
      );
    }
  }

  Future<void> _startElection() async {
    final service = ref.read(languageCommunityServiceProvider);
    final success = await service.startElection(widget.motherTongue);
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Election started!')),
      );
      _loadData();
    }
  }

  Future<void> _endElection() async {
    final service = ref.read(languageCommunityServiceProvider);
    final winnerId = await service.endElection(widget.motherTongue);
    
    if (winnerId == null) {
      // Tie - show tiebreaker dialog
      final tiedCandidates = await service.getTiedCandidates(widget.motherTongue);
      if (tiedCandidates.isNotEmpty && mounted) {
        _showTiebreakerDialog(tiedCandidates);
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Election ended! New leader elected.')),
      );
      _loadData();
    }
  }

  void _showCreateElectionDialog() {
    final selectedCandidates = <String>[];
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create Election'),
          content: SizedBox(
            width: double.maxFinite,
            height: 300,
            child: ListView.builder(
              itemCount: _members.length,
              itemBuilder: (context, index) {
                final member = _members[index];
                final isSelected = selectedCandidates.contains(member.userId);
                
                return CheckboxListTile(
                  value: isSelected,
                  onChanged: (checked) {
                    setDialogState(() {
                      if (checked == true) {
                        selectedCandidates.add(member.userId);
                      } else {
                        selectedCandidates.remove(member.userId);
                      }
                    });
                  },
                  title: Text(member.fullName),
                  subtitle: Text('${member.seniority} days seniority'),
                  secondary: CircleAvatar(
                    backgroundImage: member.photoUrl != null
                        ? NetworkImage(member.photoUrl!)
                        : null,
                    child: member.photoUrl == null
                        ? Text(member.fullName[0])
                        : null,
                  ),
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: selectedCandidates.length >= 2
                  ? () async {
                      final service = ref.read(languageCommunityServiceProvider);
                      await service.createElection(
                        widget.motherTongue,
                        selectedCandidates,
                      );
                      if (mounted) Navigator.pop(context);
                      _loadData();
                    }
                  : null,
              child: Text('Create (${selectedCandidates.length})'),
            ),
          ],
        ),
      ),
    );
  }

  void _showTiebreakerDialog(List<String> tiedCandidateIds) {
    final tiedMembers = _members.where((m) => tiedCandidateIds.contains(m.userId)).toList();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.emoji_events, color: Colors.amber),
            const SizedBox(width: 8),
            const Text('Tiebreaker Required'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('There is a tie! Your vote will decide the winner.'),
            const SizedBox(height: 16),
            ...tiedMembers.map((member) => ListTile(
              leading: CircleAvatar(
                backgroundImage: member.photoUrl != null
                    ? NetworkImage(member.photoUrl!)
                    : null,
                child: member.photoUrl == null
                    ? Text(member.fullName[0])
                    : null,
              ),
              title: Text(member.fullName),
              subtitle: Text('${member.voteCount} votes'),
              trailing: FilledButton(
                onPressed: () async {
                  final service = ref.read(languageCommunityServiceProvider);
                  await service.castTiebreakerVote(widget.motherTongue, member.userId);
                  if (mounted) Navigator.pop(context);
                  _loadData();
                },
                child: const Text('Select'),
              ),
            )),
          ],
        ),
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  final CommunityMember member;
  final bool electionActive;
  final bool hasVoted;
  final String currentUserId;
  final VoidCallback? onVote;

  const _MemberCard({
    required this.member,
    required this.electionActive,
    required this.hasVoted,
    required this.currentUserId,
    this.onVote,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Card(
      color: member.isLeader
          ? Colors.amber.withOpacity(0.1)
          : member.isElectionOfficer
              ? Colors.purple.withOpacity(0.1)
              : member.isCandidate
                  ? theme.colorScheme.primary.withOpacity(0.1)
                  : null,
      child: ListTile(
        leading: Stack(
          children: [
            CircleAvatar(
              backgroundImage: member.photoUrl != null
                  ? NetworkImage(member.photoUrl!)
                  : null,
              child: member.photoUrl == null
                  ? Text(member.fullName[0])
                  : null,
            ),
            if (member.isOnline)
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                    border: Border.all(color: theme.colorScheme.surface, width: 2),
                  ),
                ),
              ),
          ],
        ),
        title: Row(
          children: [
            Flexible(child: Text(member.fullName, overflow: TextOverflow.ellipsis)),
            if (member.isLeader) ...[
              const SizedBox(width: 4),
              const Icon(Icons.star, size: 16, color: Colors.amber),
            ],
            if (member.isElectionOfficer) ...[
              const SizedBox(width: 4),
              const Icon(Icons.gavel, size: 16, color: Colors.purple),
            ],
            if (member.isCandidate && !member.isLeader) ...[
              const SizedBox(width: 4),
              Icon(Icons.how_to_vote, size: 16, color: theme.colorScheme.primary),
            ],
          ],
        ),
        subtitle: Text('${member.seniority} days${electionActive && member.isCandidate && member.voteCount > 0 ? ' • ${member.voteCount} votes' : ''}'),
        trailing: electionActive && !hasVoted && member.isCandidate && member.userId != currentUserId
            ? OutlinedButton(
                onPressed: onVote,
                child: const Text('Vote'),
              )
            : null,
      ),
    );
  }
}

class _LeadershipCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final CommunityMember? member;
  final String? subtitle;

  const _LeadershipCard({
    required this.title,
    required this.icon,
    required this.iconColor,
    this.member,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: iconColor),
              const SizedBox(width: 4),
              Text(title, style: theme.textTheme.labelSmall),
            ],
          ),
          const SizedBox(height: 8),
          if (member != null)
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundImage: member!.photoUrl != null
                      ? NetworkImage(member!.photoUrl!)
                      : null,
                  child: member!.photoUrl == null
                      ? Text(member!.fullName[0], style: const TextStyle(fontSize: 12))
                      : null,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        member!.fullName,
                        style: theme.textTheme.bodySmall,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            )
          else
            Text(
              'Not assigned',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
        ],
      ),
    );
  }
}
