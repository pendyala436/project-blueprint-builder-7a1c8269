import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

/// Admin Audit Logs — mirrors React AdminAuditLogs.tsx
class AdminAuditLogsScreen extends ConsumerStatefulWidget {
  const AdminAuditLogsScreen({super.key});

  @override
  ConsumerState<AdminAuditLogsScreen> createState() => _AdminAuditLogsScreenState();
}

class _AdminAuditLogsScreenState extends ConsumerState<AdminAuditLogsScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  List<Map<String, dynamic>> _logs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _supabase
          .from('admin_audit_log')
          .select()
          .order('created_at', ascending: false)
          .limit(200);
      if (!mounted) return;
      setState(() {
        _logs = List<Map<String, dynamic>>.from(res);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Audit Logs')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                itemCount: _logs.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final l = _logs[i];
                  final t = DateTime.tryParse(l['created_at']?.toString() ?? '');
                  return ListTile(
                    dense: true,
                    leading: const Icon(Icons.history, size: 20),
                    title: Text('${l['action'] ?? '—'} • ${l['entity_type'] ?? ''}'),
                    subtitle: Text(
                      'By: ${l['admin_id'] ?? '—'}\n'
                      '${t != null ? DateFormat.yMd().add_Hms().format(t) : ''}',
                    ),
                    isThreeLine: true,
                    trailing: l['entity_id'] != null
                        ? Text(
                            l['entity_id'].toString().substring(0, 8),
                            style: const TextStyle(fontFamily: 'monospace', fontSize: 11),
                          )
                        : null,
                  );
                },
              ),
            ),
    );
  }
}
