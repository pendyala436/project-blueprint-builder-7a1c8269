import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/services/matching_service.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../shared/models/match_model.dart';
import '../../../../shared/widgets/common_widgets.dart';
import '../../../../core/theme/app_colors.dart';

/// Match Discovery Screen - Synced with React MatchDiscoveryScreen
class MatchDiscoveryScreen extends ConsumerStatefulWidget {
  const MatchDiscoveryScreen({super.key});

  @override
  ConsumerState<MatchDiscoveryScreen> createState() => _MatchDiscoveryScreenState();
}

class _MatchDiscoveryScreenState extends ConsumerState<MatchDiscoveryScreen> {
  List<MatchProfileModel> _suggestions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSuggestions();
  }

  Future<void> _loadSuggestions() async {
    final userId = ref.read(authServiceProvider).currentUser?.id;
    if (userId == null) return;

    setState(() => _isLoading = true);
    final service = ref.read(matchingServiceProvider);
    final suggestions = await service.getMatchSuggestions(userId);
    if (mounted) setState(() { _suggestions = suggestions; _isLoading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Discover Matches')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _suggestions.isEmpty
              ? const EmptyState(icon: Icons.favorite_border, title: 'No matches found', subtitle: 'Try adjusting your filters')
              : RefreshIndicator(
                  onRefresh: _loadSuggestions,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _suggestions.length,
                    itemBuilder: (context, index) {
                      final match = _suggestions[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: AppAvatar(imageUrl: match.photoUrl, name: match.fullName, radius: 28),
                          title: Text(match.fullName ?? 'Unknown'),
                          subtitle: Text([
                            if (match.age != null) '${match.age} yrs',
                            if (match.country != null) match.country!,
                            '${match.matchScore}% match',
                          ].join(' • ')),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (match.isVerified) Icon(Icons.verified, color: AppColors.primary, size: 18),
                              const SizedBox(width: 4),
                              const Icon(Icons.chevron_right),
                            ],
                          ),
                          onTap: () => context.push('/profile/${match.userId}'),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
