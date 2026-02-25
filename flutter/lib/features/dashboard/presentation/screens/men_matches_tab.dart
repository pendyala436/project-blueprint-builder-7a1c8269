import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Men's Matches Tab - list of matched women
class MenMatchesTab extends ConsumerWidget {
  const MenMatchesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Matches')),
      body: const Center(child: Text('Matches list')),
    );
  }
}
