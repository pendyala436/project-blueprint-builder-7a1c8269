import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/common_widgets.dart';

/// Women's Active Chats Tab
class WomenChatsTab extends ConsumerWidget {
  const WomenChatsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Active Chats')),
      body: ListView.builder(
        itemCount: 0, // Will be populated from active_chat_sessions
        itemBuilder: (context, index) {
          return ListTile(
            leading: const AppAvatar(name: 'User', isOnline: true),
            title: Text('User ${index + 1}'),
            subtitle: const Text('Last message preview...'),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text('2m ago'),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.success, borderRadius: BorderRadius.circular(12)),
                  child: const Text('₹25', style: TextStyle(color: Colors.white, fontSize: 12)),
                ),
              ],
            ),
            onTap: () => context.push('/chat/chat_$index'),
          );
        },
      ),
    );
  }
}
