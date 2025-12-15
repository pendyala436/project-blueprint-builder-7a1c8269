import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/providers/locale_provider.dart';
import '../../../../shared/widgets/common_widgets.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _notificationSound = true;
  bool _notificationVibration = true;
  bool _showOnlineStatus = true;
  bool _autoTranslate = true;
  String _theme = 'system';

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // Account Section
          _buildSectionHeader('Account'),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Edit Profile'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.lock),
            title: const Text('Change Password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.verified_user),
            title: const Text('Verify Account'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),

          // Notifications Section
          _buildSectionHeader('Notifications'),
          SwitchListTile(
            secondary: const Icon(Icons.volume_up),
            title: const Text('Notification Sound'),
            value: _notificationSound,
            onChanged: (value) => setState(() => _notificationSound = value),
          ),
          SwitchListTile(
            secondary: const Icon(Icons.vibration),
            title: const Text('Vibration'),
            value: _notificationVibration,
            onChanged: (value) => setState(() => _notificationVibration = value),
          ),

          // Privacy Section
          _buildSectionHeader('Privacy'),
          SwitchListTile(
            secondary: const Icon(Icons.visibility),
            title: const Text('Show Online Status'),
            subtitle: const Text('Let others see when you\'re online'),
            value: _showOnlineStatus,
            onChanged: (value) => setState(() => _showOnlineStatus = value),
          ),

          // Language Section
          _buildSectionHeader('Language & Translation'),
          ListTile(
            leading: const Icon(Icons.language),
            title: const Text('App Language'),
            subtitle: Text(_getLanguageName(locale.languageCode)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showLanguageDialog(),
          ),
          SwitchListTile(
            secondary: const Icon(Icons.translate),
            title: const Text('Auto-translate Messages'),
            subtitle: const Text('Automatically translate incoming messages'),
            value: _autoTranslate,
            onChanged: (value) => setState(() => _autoTranslate = value),
          ),

          // Appearance Section
          _buildSectionHeader('Appearance'),
          ListTile(
            leading: const Icon(Icons.palette),
            title: const Text('Theme'),
            subtitle: Text(_theme.toUpperCase()),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showThemeDialog(),
          ),

          // Support Section
          _buildSectionHeader('Support'),
          ListTile(
            leading: const Icon(Icons.help),
            title: const Text('Help Center'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('Terms of Service'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip),
            title: const Text('Privacy Policy'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.info),
            title: const Text('About'),
            subtitle: const Text('Version 1.0.0'),
            onTap: () {},
          ),

          // Danger Zone
          _buildSectionHeader('Account Actions'),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.warning),
            title: const Text('Sign Out'),
            onTap: () => _showSignOutDialog(),
          ),
          ListTile(
            leading: const Icon(Icons.delete_forever, color: AppColors.destructive),
            title: const Text('Delete Account', style: TextStyle(color: AppColors.destructive)),
            onTap: () => _showDeleteAccountDialog(),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: AppColors.primary,
            ),
      ),
    );
  }

  void _showLanguageDialog() {
    final languages = {
      'en': 'English',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'bn': 'Bengali',
      'es': 'Spanish',
      'fr': 'French',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ur': 'Urdu',
      'zh': 'Chinese',
    };

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Select Language'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: languages.length,
              itemBuilder: (context, index) {
                final code = languages.keys.elementAt(index);
                final name = languages.values.elementAt(index);
                final isSelected = ref.read(localeProvider).languageCode == code;

                return ListTile(
                  title: Text(name),
                  trailing: isSelected ? const Icon(Icons.check, color: AppColors.primary) : null,
                  onTap: () {
                    ref.read(localeProvider.notifier).setLocaleByCode(code);
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }

  void _showThemeDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Select Theme'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              RadioListTile<String>(
                title: const Text('System'),
                value: 'system',
                groupValue: _theme,
                onChanged: (value) {
                  setState(() => _theme = value!);
                  Navigator.pop(context);
                },
              ),
              RadioListTile<String>(
                title: const Text('Light'),
                value: 'light',
                groupValue: _theme,
                onChanged: (value) {
                  setState(() => _theme = value!);
                  Navigator.pop(context);
                },
              ),
              RadioListTile<String>(
                title: const Text('Dark'),
                value: 'dark',
                groupValue: _theme,
                onChanged: (value) {
                  setState(() => _theme = value!);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSignOutDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Sign Out'),
          content: const Text('Are you sure you want to sign out?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await ref.read(authServiceProvider).signOut();
                if (mounted) context.go(AppRoutes.auth);
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.destructive),
              child: const Text('Sign Out'),
            ),
          ],
        );
      },
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Account'),
          content: const Text(
            'This action cannot be undone. All your data will be permanently deleted.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please contact support to delete your account')),
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.destructive),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );
  }

  String _getLanguageName(String code) {
    final languages = {
      'en': 'English',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'bn': 'Bengali',
      'es': 'Spanish',
      'fr': 'French',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ur': 'Urdu',
      'zh': 'Chinese',
    };
    return languages[code] ?? 'English';
  }
}
