import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/profile_service.dart';
import '../../../../core/services/dashboard_service.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/common_widgets.dart';
import '../../../../shared/models/user_model.dart';
import 'widgets/online_women_section.dart';
import 'widgets/matches_section.dart';
import 'widgets/men_stats_section.dart';
import 'widgets/quick_actions_grid.dart';
import 'widgets/notifications_section.dart';
import 'widgets/wallet_recharge_section.dart';

/// Men's Dashboard Screen - Synced with React DashboardScreen
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

/// Home Tab - Main dashboard content for men
class _HomeTab extends ConsumerStatefulWidget {
  const _HomeTab();

  @override
  ConsumerState<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends ConsumerState<_HomeTab> {
  String _userId = '';
  String _userName = '';
  String? _userPhoto;
  String _userLanguage = 'English';
  String _userCountry = '';
  double _walletBalance = 0;
  int _activeChatCount = 0;
  bool _isOnline = true;
  bool _isLoading = true;
  
  DashboardStats _stats = DashboardStats(gender: 'male');
  List<OnlineWoman> _sameLanguageWomen = [];
  List<OnlineWoman> _otherLanguageWomen = [];
  List<MatchedUser> _matchedWomen = [];
  List<AppNotification> _notifications = [];
  MenFreeMinutes _freeMinutes = MenFreeMinutes();

  late final DashboardService _dashboardService;

  @override
  void initState() {
    super.initState();
    _dashboardService = ref.read(dashboardServiceProvider);
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      final profileService = ref.read(profileServiceProvider);
      final profile = await profileService.getCurrentProfile();
      
      if (profile == null || !mounted) return;

      // Redirect women to their dashboard
      if (profile.gender?.toLowerCase() == 'female') {
        if (mounted) context.go(AppRoutes.womenDashboard);
        return;
      }

      final languages = await profileService.getUserLanguages(profile.userId);
      final motherTongue = languages.isNotEmpty 
          ? languages.first.languageName 
          : profile.primaryLanguage ?? profile.preferredLanguage ?? 'English';

      setState(() {
        _userId = profile.userId;
        _userName = profile.fullName?.split(' ').first ?? 'User';
        _userPhoto = profile.photoUrl;
        _userLanguage = motherTongue;
        _userCountry = profile.country ?? '';
      });

      // Fetch all data in parallel
      await Future.wait([
        _fetchStats(),
        _fetchOnlineWomen(),
        _fetchMatches(),
        _fetchNotifications(),
        _fetchFreeMinutes(),
        _fetchWalletBalance(),
      ]);

      // Set online
      await _dashboardService.updateOnlineStatus(_userId, true);

      // Subscribe to realtime
      _subscribeToUpdates();
    } catch (e) {
      debugPrint('Dashboard load error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchStats() async {
    if (_userId.isEmpty) return;
    final stats = await _dashboardService.getDashboardStats(_userId);
    if (mounted) setState(() => _stats = stats);
  }

  Future<void> _fetchOnlineWomen() async {
    final women = await _dashboardService.getOnlineWomen();
    if (!mounted) return;

    final same = women.where((w) => 
      w.motherTongue.toLowerCase() == _userLanguage.toLowerCase()
    ).toList();
    final other = women.where((w) => 
      w.motherTongue.toLowerCase() != _userLanguage.toLowerCase()
    ).toList();

    // Sort: earning eligible first, then by load
    same.sort(_sortByBadgeAndLoad);
    other.sort(_sortByBadgeAndLoad);

    setState(() {
      _sameLanguageWomen = same.take(10).toList();
      _otherLanguageWomen = other.take(15).toList();
    });
  }

  int _sortByBadgeAndLoad(OnlineWoman a, OnlineWoman b) {
    if (a.isEarningEligible != b.isEarningEligible) {
      return a.isEarningEligible ? -1 : 1;
    }
    if (a.isAvailable != b.isAvailable) return a.isAvailable ? -1 : 1;
    if (a.isBusy != b.isBusy) return a.isBusy ? 1 : -1;
    return a.currentChatCount.compareTo(b.currentChatCount);
  }

  Future<void> _fetchMatches() async {
    if (_userId.isEmpty) return;
    final matches = await _dashboardService.getMatchedWomen(_userId);
    if (mounted) setState(() => _matchedWomen = matches);
  }

  Future<void> _fetchNotifications() async {
    if (_userId.isEmpty) return;
    final notifs = await _dashboardService.getNotifications(_userId);
    if (mounted) setState(() => _notifications = notifs);
  }

  Future<void> _fetchFreeMinutes() async {
    if (_userId.isEmpty) return;
    final fm = await _dashboardService.getMenFreeMinutes(_userId);
    if (mounted) setState(() => _freeMinutes = fm);
  }

  Future<void> _fetchWalletBalance() async {
    if (_userId.isEmpty) return;
    final balance = await _dashboardService.getMenWalletBalance(_userId);
    if (mounted) setState(() => _walletBalance = balance);
  }

  void _subscribeToUpdates() {
    _dashboardService.subscribeToDashboardUpdates(
      userId: _userId,
      isMale: true,
      onUserStatusChange: () {
        _fetchOnlineWomen();
        _fetchStats();
      },
      onChatSessionChange: () async {
        final count = await _dashboardService.getActiveChatCount(_userId, isMale: true);
        if (mounted) setState(() => _activeChatCount = count);
      },
      onWalletChange: _fetchWalletBalance,
      onAvailabilityChange: _fetchOnlineWomen,
      onNotificationChange: _fetchNotifications,
    );
  }

  Future<void> _handleStartChat(OnlineWoman woman) async {
    if (_activeChatCount >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Max 3 parallel chats. Close one to start a new chat.')),
      );
      return;
    }

    final pricing = await _dashboardService.getChatPricing();
    final minBalance = pricing.ratePerMinute * 2;

    if (_walletBalance < minBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Insufficient balance. Need at least ₹${minBalance.toStringAsFixed(0)}')),
      );
      return;
    }

    final result = await _dashboardService.startChatSession(
      manUserId: _userId,
      womanUserId: woman.userId,
      ratePerMinute: pricing.ratePerMinute,
    );

    if (result.success && result.chatId != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Chat started with ${woman.fullName}')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.error ?? 'Failed to start chat')),
      );
    }
  }

  @override
  void dispose() {
    if (_userId.isNotEmpty) {
      _dashboardService.updateOnlineStatus(_userId, false);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('🐱 Meow Meow'),
        actions: [
          // Online toggle
          Switch(
            value: _isOnline,
            onChanged: (val) {
              setState(() => _isOnline = val);
              _dashboardService.updateOnlineStatus(_userId, val);
            },
            activeColor: AppColors.success,
          ),
          IconButton(
            icon: const Icon(Icons.people),
            onPressed: () {}, // Friends panel
            tooltip: 'Friends & Blocked',
          ),
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
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome & Status
              _buildWelcomeSection(),
              const SizedBox(height: 20),

              // Wallet & Recharge
              WalletRechargeSection(
                walletBalance: _walletBalance,
                userId: _userId,
                userCountry: _userCountry,
                dashboardService: _dashboardService,
                onBalanceUpdated: (balance) => setState(() => _walletBalance = balance),
              ),
              const SizedBox(height: 20),

              // Online Women
              OnlineWomenSection(
                sameLanguageWomen: _sameLanguageWomen,
                otherLanguageWomen: _otherLanguageWomen,
                userLanguage: _userLanguage,
                isLoading: false,
                onRefresh: _fetchOnlineWomen,
                onStartChat: _handleStartChat,
                onViewProfile: (userId) => context.push('/profile/$userId'),
              ),
              const SizedBox(height: 20),

              // Your Matches
              MatchesSection(
                matches: _matchedWomen,
                isLoading: false,
                onRefresh: _fetchMatches,
                onStartChat: (userId, name) async {
                  final woman = _sameLanguageWomen.firstWhere(
                    (w) => w.userId == userId,
                    orElse: () => OnlineWoman(userId: userId, fullName: name, motherTongue: ''),
                  );
                  await _handleStartChat(woman);
                },
                onViewProfile: (userId) => context.push('/profile/$userId'),
              ),
              const SizedBox(height: 20),

              // Stats
              MenStatsSection(stats: _stats, activeChatCount: _activeChatCount),
              const SizedBox(height: 20),

              // Free Minutes Badge
              if (_freeMinutes.hasFreeMinutes)
                _buildFreeMinutesBadge(),
              if (_freeMinutes.hasFreeMinutes)
                const SizedBox(height: 20),

              // Quick Actions
              QuickActionsGrid(
                actions: [
                  QuickAction(icon: Icons.search, label: 'Find Match', onTap: () => context.push(AppRoutes.findMatch)),
                  QuickAction(icon: Icons.chat, label: 'Messages', onTap: () => context.push(AppRoutes.matchDiscovery)),
                  QuickAction(icon: Icons.favorite, label: 'Matches', onTap: () => context.push(AppRoutes.matchDiscovery)),
                  QuickAction(icon: Icons.person, label: 'Profile', onTap: () {}),
                ],
              ),
              const SizedBox(height: 20),

              // Notifications
              NotificationsSection(
                notifications: _notifications,
                onViewAll: () {},
              ),
              const SizedBox(height: 20),

              // Transaction History link
              Card(
                child: ListTile(
                  leading: const Icon(Icons.receipt_long),
                  title: const Text('Transaction History'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(AppRoutes.transactionHistory),
                ),
              ),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeSection() {
    return Row(
      children: [
        AppAvatar(
          imageUrl: _userPhoto,
          name: _userName,
          radius: 24,
          isOnline: _isOnline,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, $_userName! 👋',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                [_userCountry, _userLanguage].where((s) => s.isNotEmpty).join(' • '),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: _activeChatCount >= 3 ? Colors.red.withOpacity(0.1) : AppColors.success.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8, height: 8,
                decoration: BoxDecoration(
                  color: _activeChatCount >= 3 ? Colors.red : AppColors.success,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _activeChatCount >= 3 ? 'Busy(3)' : 'Available',
                style: TextStyle(
                  color: _activeChatCount >= 3 ? Colors.red : AppColors.success,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFreeMinutesBadge() {
    return Card(
      color: AppColors.info.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.timer, color: AppColors.info),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Free Chat Minutes',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  Text(
                    '${_freeMinutes.freeMinutesRemaining} of ${_freeMinutes.freeMinutesTotal} minutes remaining',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (_freeMinutes.nextResetAt != null)
                    Text(
                      'Resets: ${_freeMinutes.nextResetAt!.day}/${_freeMinutes.nextResetAt!.month}/${_freeMinutes.nextResetAt!.year}',
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Matches Tab
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

/// Chats Tab
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

/// Profile Tab
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
          IconButton(icon: const Icon(Icons.edit), onPressed: () {}),
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
                  AppAvatar(imageUrl: profile?.photoUrl, name: profile?.fullName, radius: 48),
                  const SizedBox(height: 16),
                  Text(profile?.fullName ?? 'Your Name', style: Theme.of(context).textTheme.titleLarge),
                  if (profile?.age != null)
                    Text('${profile!.age} years old', style: Theme.of(context).textTheme.bodyMedium),
                  if (profile?.country != null || profile?.state != null)
                    Text(
                      [profile?.state, profile?.country].where((s) => s != null && s.isNotEmpty).join(', '),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  if (profile?.primaryLanguage != null)
                    Chip(label: Text(profile!.primaryLanguage!), avatar: const Icon(Icons.language, size: 16)),
                ],
              ),
            ),
            const Divider(),
            if (profile?.bio != null) ListTile(leading: const Icon(Icons.info_outline), title: const Text('About'), subtitle: Text(profile!.bio!)),
            if (profile?.occupation != null) ListTile(leading: const Icon(Icons.work_outline), title: const Text('Occupation'), subtitle: Text(profile!.occupation!)),
            if (profile?.educationLevel != null) ListTile(leading: const Icon(Icons.school_outlined), title: const Text('Education'), subtitle: Text(profile!.educationLevel!)),
            if (profile?.religion != null) ListTile(leading: const Icon(Icons.church_outlined), title: const Text('Religion'), subtitle: Text(profile!.religion!)),
            if (profile?.maritalStatus != null) ListTile(leading: const Icon(Icons.favorite_outline), title: const Text('Marital Status'), subtitle: Text(profile!.maritalStatus!)),
            const Divider(),
            ListTile(leading: const Icon(Icons.edit), title: const Text('Edit Profile'), trailing: const Icon(Icons.chevron_right), onTap: () {}),
            ListTile(leading: const Icon(Icons.settings), title: const Text('Settings'), trailing: const Icon(Icons.chevron_right), onTap: () => context.push(AppRoutes.settings)),
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
