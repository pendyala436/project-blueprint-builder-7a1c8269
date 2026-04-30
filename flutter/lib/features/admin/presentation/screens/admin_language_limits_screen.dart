import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Admin Language Limits — mirrors React AdminLanguageLimits.tsx
class AdminLanguageLimitsScreen extends ConsumerStatefulWidget {
  const AdminLanguageLimitsScreen({super.key});

  @override
  ConsumerState<AdminLanguageLimitsScreen> createState() => _AdminLanguageLimitsScreenState();
}

class _AdminLanguageLimitsScreenState extends ConsumerState<AdminLanguageLimitsScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  List<Map<String, dynamic>> _limits = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _supabase
          .from('language_limits')
          .select()
          .order('language_code');
      if (!mounted) return;
      setState(() {
        _limits = List<Map<String, dynamic>>.from(res);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _editLimit(Map<String, dynamic> row) async {
    final ctrl = TextEditingController(text: '${row['max_users'] ?? 0}');
    final newVal = await showDialog<int>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Limit for ${row['language_code']}'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Max users'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, int.tryParse(ctrl.text)),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (newVal == null) return;
    try {
      await _supabase.from('language_limits').update({'max_users': newVal}).eq('id', row['id']);
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Language Limits')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                itemCount: _limits.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final l = _limits[i];
                  return ListTile(
                    title: Text(l['language_code']?.toString() ?? '—'),
                    subtitle: Text('Current: ${l['current_users'] ?? 0} / ${l['max_users'] ?? 0}'),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () => _editLimit(l),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
