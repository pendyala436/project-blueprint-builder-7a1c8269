import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/profile_service.dart';
import '../../../../core/services/wallet_service.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/models/user_model.dart';
import '../../../../shared/widgets/common_widgets.dart';

class ProfileDetailScreen extends ConsumerStatefulWidget {
  final String userId;

  const ProfileDetailScreen({super.key, required this.userId});

  @override
  ConsumerState<ProfileDetailScreen> createState() => _ProfileDetailScreenState();
}

class _ProfileDetailScreenState extends ConsumerState<ProfileDetailScreen> {
  UserModel? _profile;
  List<String> _languages = [];
  List<Map<String, dynamic>> _photos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final profileService = ref.read(profileServiceProvider);
    
    final profile = await profileService.getProfile(widget.userId);
    final languages = await profileService.getUserLanguages(widget.userId);
    final photos = await profileService.getUserPhotos(widget.userId);

    if (mounted) {
      setState(() {
        _profile = profile;
        _languages = languages;
        _photos = photos;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_profile == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const EmptyState(
          icon: Icons.person_off,
          title: 'Profile not found',
        ),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Profile Header with Photo
          SliverAppBar(
            expandedHeight: 400,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: _buildPhotoGallery(),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.more_vert),
                onPressed: () {
                  _showMoreOptions(context);
                },
              ),
            ],
          ),

          // Profile Info
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name and Verification
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${_profile!.fullName ?? "User"}, ${_profile!.age ?? 0}',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      if (_profile!.isVerified)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.info.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.verified, size: 16, color: AppColors.info),
                              SizedBox(width: 4),
                              Text('Verified', style: TextStyle(color: AppColors.info, fontSize: 12)),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Location
                  if (_profile!.state != null || _profile!.country != null)
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: AppColors.mutedForeground),
                        const SizedBox(width: 4),
                        Text(
                          [_profile!.state, _profile!.country].where((s) => s != null).join(', '),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppColors.mutedForeground,
                              ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            // Start chat
                          },
                          icon: const Icon(Icons.chat),
                          label: const Text('Message'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/send-gift/${widget.userId}'),
                          icon: const Icon(Icons.card_giftcard),
                          label: const Text('Send Gift'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Bio
                  if (_profile!.bio != null && _profile!.bio!.isNotEmpty) ...[
                    Text('About', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text(_profile!.bio!, style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 24),
                  ],

                  // Basic Info
                  Text('Basic Info', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  _buildInfoGrid(),
                  const SizedBox(height: 24),

                  // Languages
                  if (_languages.isNotEmpty) ...[
                    Text('Languages', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _languages.map((lang) {
                        return Chip(
                          label: Text(lang),
                          backgroundColor: AppColors.secondary,
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Interests
                  if (_profile!.interests.isNotEmpty) ...[
                    Text('Interests', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _profile!.interests.map((interest) {
                        return Chip(
                          label: Text(interest),
                          backgroundColor: AppColors.primary.withOpacity(0.1),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoGallery() {
    final photoUrl = _profile!.photoUrl;
    
    if (_photos.isEmpty && photoUrl == null) {
      return Container(
        color: AppColors.secondary,
        child: const Icon(Icons.person, size: 100, color: AppColors.mutedForeground),
      );
    }

    final allPhotos = [
      if (photoUrl != null) photoUrl,
      ..._photos.map((p) => p['photo_url'] as String),
    ];

    return PageView.builder(
      itemCount: allPhotos.length,
      itemBuilder: (context, index) {
        return Image.network(
          allPhotos[index],
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            color: AppColors.secondary,
            child: const Icon(Icons.person, size: 100),
          ),
        );
      },
    );
  }

  Widget _buildInfoGrid() {
    final items = <Map<String, dynamic>>[
      if (_profile!.occupation != null)
        {'icon': Icons.work, 'label': 'Occupation', 'value': _profile!.occupation},
      if (_profile!.educationLevel != null)
        {'icon': Icons.school, 'label': 'Education', 'value': _profile!.educationLevel},
      if (_profile!.heightCm != null)
        {'icon': Icons.height, 'label': 'Height', 'value': '${_profile!.heightCm} cm'},
      if (_profile!.religion != null)
        {'icon': Icons.church, 'label': 'Religion', 'value': _profile!.religion},
      if (_profile!.maritalStatus != null)
        {'icon': Icons.favorite, 'label': 'Status', 'value': _profile!.maritalStatus},
      if (_profile!.bodyType != null)
        {'icon': Icons.accessibility, 'label': 'Body Type', 'value': _profile!.bodyType},
    ];

    if (items.isEmpty) {
      return const Text('No additional info available');
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Row(
          children: [
            Icon(item['icon'] as IconData, size: 20, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    item['label'] as String,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  Text(
                    item['value'] as String,
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  void _showMoreOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.block),
                title: const Text('Block User'),
                onTap: () {
                  Navigator.pop(context);
                  // Block user
                },
              ),
              ListTile(
                leading: const Icon(Icons.flag),
                title: const Text('Report User'),
                onTap: () {
                  Navigator.pop(context);
                  // Report user
                },
              ),
              ListTile(
                leading: const Icon(Icons.share),
                title: const Text('Share Profile'),
                onTap: () {
                  Navigator.pop(context);
                  // Share profile
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
