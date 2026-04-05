import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Women's Groups Tab - Private video groups
class WomenGroupsTab extends ConsumerWidget {
  const WomenGroupsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Private Groups')),
      body: const Center(child: Text('Private groups list')),
    );
  }
}
