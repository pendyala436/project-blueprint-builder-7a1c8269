import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Admin Enable/Disable — mirrors React AdminEnableDisable.tsx
/// Toggles platform-wide feature flags.
class AdminEnableDisableScreen extends ConsumerStatefulWidget {
  const AdminEnableDisableScreen({super.key});

  @override
  ConsumerState<AdminEnableDisableScreen> createState() => _AdminEnableDisableScreenState();
}

class _AdminEnableDisableScreenState extends ConsumerState<AdminEnableDisableScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  List<Map<String, dynamic>> _flags = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _supabase
          .from('feature_flags')
          .select()
          .order('feature_key');
      if (!mounted) return;
      setState(() {
        _flags = List<Map<String, dynamic>>.from(res);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(Map<String, dynamic> f) async {
    final newVal = !(f['enabled'] == true);
    try {
      await _supabase.from('feature_flags').update({
        'enabled': newVal,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', f['id']);
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Enable / Disable')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                itemCount: _flags.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final f = _flags[i];
                  return SwitchListTile(
                    title: Text(f['feature_name']?.toString() ?? f['feature_key']?.toString() ?? '—'),
                    subtitle: Text(f['description']?.toString() ?? f['feature_key']?.toString() ?? ''),
                    value: f['enabled'] == true,
                    onChanged: (_) => _toggle(f),
                  );
                },
              ),
            ),
    );
  }
}
