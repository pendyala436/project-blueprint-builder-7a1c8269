import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/profile_service.dart';
import '../../../../core/services/matching_service.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/common_widgets.dart';
import '../../../../shared/models/user_model.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          _HomeTab(),
          _MatchesTab(),
          _ChatsTab(),
          _ProfileTab(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.favorite), label: 'Matches'),
          BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'Chats'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class _HomeTab extends ConsumerWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(currentUserProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('🐱 Meow Meow'),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet),
            onPressed: () => context.push(AppRoutes.wallet),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push(AppRoutes.settings),
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Error loading profile')),
        data: (profile) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Section with profile data
              _buildWelcomeSection(context, profile),
              const SizedBox(height: 24),

              // Quick Actions
              _buildQuickActions(context),
              const SizedBox(height: 24),
              
              // Online Users Section
              Text('Online Now', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              const _OnlineUsersCarousel(),
              const SizedBox(height: 24),
              
              // Discover Section
              Text('Discover', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              const _DiscoverSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeSection(BuildContext context, UserModel? profile) {
    final firstName = profile?.fullName?.split(' ').first ?? 'User';
    final country = profile?.country ?? '';
    final language = profile?.primaryLanguage ?? profile?.preferredLanguage ?? 'English';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            AppAvatar(
              imageUrl: profile?.photoUrl,
              name: profile?.fullName,
              radius: 28,
              isOnline: true,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome, $firstName! 👋',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (country.isNotEmpty || language.isNotEmpty)
                    Text(
                      [country, language].where((s) => s.isNotEmpty).join(' • '),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                      ),
                    ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text('Online', style: TextStyle(color: AppColors.success, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _QuickActionCard(
            icon: Icons.search,
            label: 'Find Match',
            color: AppColors.primary,
            onTap: () => context.push(AppRoutes.findMatch),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionCard(
            icon: Icons.people,
            label: 'Online Users',
            color: AppColors.success,
            onTap: () => context.push(AppRoutes.onlineUsers),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionCard(
            icon: Icons.explore,
            label: 'Discover',
            color: AppColors.info,
            onTap: () => context.push(AppRoutes.matchDiscovery),
          ),
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(height: 8),
              Text(label, style: Theme.of(context).textTheme.labelMedium),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnlineUsersCarousel extends ConsumerWidget {
  const _OnlineUsersCarousel();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matchingService = ref.watch(matchingServiceProvider);

    return FutureBuilder(
      future: matchingService.getOnlineUsers(limit: 10),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(
            height: 120,
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final users = snapshot.data ?? [];
        if (users.isEmpty) {
          return const SizedBox(
            height: 120,
            child: Center(child: Text('No users online')),
          );
        }

        return SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: users.length,
            itemBuilder: (context, index) {
              final user = users[index];
              return GestureDetector(
                onTap: () => context.push('/profile/${user.userId}'),
                child: Container(
                  width: 80,
                  margin: const EdgeInsets.only(right: 12),
                  child: Column(
                    children: [
                      AppAvatar(
                        imageUrl: user.photoUrl,
                        name: user.fullName,
                        radius: 32,
                        isOnline: true,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        user.fullName ?? 'User',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        '${user.age ?? 0} yrs',
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _DiscoverSection extends ConsumerWidget {
  const _DiscoverSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);

    return currentUser.when(
      data: (user) {
        if (user == null) return const SizedBox();

        final matchingService = ref.watch(matchingServiceProvider);
        return FutureBuilder(
          future: matchingService.findMatches(userId: user.id, limit: 6),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final matches = snapshot.data ?? [];
            if (matches.isEmpty) {
              return const EmptyState(
                icon: Icons.search_off,
                title: 'No matches found',
                subtitle: 'Try adjusting your filters',
              );
            }

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.75,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: matches.length,
              itemBuilder: (context, index) {
                final match = matches[index];
                return _MatchCard(match: match);
              },
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const EmptyState(icon: Icons.error, title: 'Error loading'),
    );
  }
}

class _MatchCard extends StatelessWidget {
  final dynamic match;

  const _MatchCard({required this.match});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/profile/${match.userId}'),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 3,
              child: match.photoUrl != null
                  ? Image.network(match.photoUrl, fit: BoxFit.cover)
                  : Container(
                      color: AppColors.secondary,
                      child: const Icon(Icons.person, size: 48),
                    ),
            ),
            Expanded(
              flex: 1,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${match.fullName ?? "User"}, ${match.age ?? 0}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                        ),
                        if (match.isVerified)
                          const Icon(Icons.verified, size: 16, color: AppColors.info),
                      ],
                    ),
                    Text(
                      '${match.country ?? ""} ${match.matchScore ?? 0}% Match',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppColors.primary,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MatchesTab extends ConsumerWidget {
  const _MatchesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Matches')),
      body: const Center(child: Text('Matches list')),
    );
  }
}

class _ChatsTab extends ConsumerWidget {
  const _ChatsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chats')),
      body: const Center(child: Text('Chat list')),
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(currentUserProfileProvider);
    final authService = ref.watch(authServiceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              // Open profile edit dialog/screen
            },
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Error loading profile')),
        data: (profile) => ListView(
          children: [
            // Profile Header
            Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  AppAvatar(
                    imageUrl: profile?.photoUrl,
                    name: profile?.fullName,
                    radius: 48,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    profile?.fullName ?? 'Your Name',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (profile?.age != null)
                    Text(
                      '${profile!.age} years old',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  if (profile?.country != null || profile?.state != null)
                    Text(
                      [profile?.state, profile?.country]
                          .where((s) => s != null && s.isNotEmpty)
                          .join(', '),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  if (profile?.primaryLanguage != null)
                    Chip(
                      label: Text(profile!.primaryLanguage!),
                      avatar: const Icon(Icons.language, size: 16),
                    ),
                ],
              ),
            ),
            const Divider(),
            
            // Profile Details Section
            if (profile?.bio != null)
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('About'),
                subtitle: Text(profile!.bio!),
              ),
            if (profile?.occupation != null)
              ListTile(
                leading: const Icon(Icons.work_outline),
                title: const Text('Occupation'),
                subtitle: Text(profile!.occupation!),
              ),
            if (profile?.educationLevel != null)
              ListTile(
                leading: const Icon(Icons.school_outlined),
                title: const Text('Education'),
                subtitle: Text(profile!.educationLevel!),
              ),
            if (profile?.religion != null)
              ListTile(
                leading: const Icon(Icons.church_outlined),
                title: const Text('Religion'),
                subtitle: Text(profile!.religion!),
              ),
            if (profile?.maritalStatus != null)
              ListTile(
                leading: const Icon(Icons.favorite_outline),
                title: const Text('Marital Status'),
                subtitle: Text(profile!.maritalStatus!),
              ),
            
            const Divider(),
            
            // Actions
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('Edit Profile'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                // Navigate to edit profile
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('Settings'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(AppRoutes.settings),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.destructive),
              title: const Text('Sign Out', style: TextStyle(color: AppColors.destructive)),
              onTap: () async {
                await authService.signOut();
                if (context.mounted) context.go(AppRoutes.auth);
              },
            ),
          ],
        ),
      ),
    );
  }
}
