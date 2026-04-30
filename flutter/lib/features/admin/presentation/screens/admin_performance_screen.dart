import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

/// Admin Performance Monitoring — mirrors React AdminPerformanceMonitoring.tsx
class AdminPerformanceScreen extends ConsumerStatefulWidget {
  const AdminPerformanceScreen({super.key});

  @override
  ConsumerState<AdminPerformanceScreen> createState() => _AdminPerformanceScreenState();
}

class _AdminPerformanceScreenState extends ConsumerState<AdminPerformanceScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  Map<String, dynamic>? _latest;
  List<Map<String, dynamic>> _history = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _supabase
          .from('performance_metrics')
          .select()
          .order('recorded_at', ascending: false)
          .limit(20);
      final list = List<Map<String, dynamic>>.from(res);
      if (!mounted) return;
      setState(() {
        _history = list;
        _latest = list.isNotEmpty ? list.first : null;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _kpi(String label, String value, IconData icon, Color color) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Performance Monitoring')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.4,
                    children: [
                      _kpi('CPU', '${_latest?['cpu_usage'] ?? '—'}%', Icons.memory, Colors.blue),
                      _kpi('Memory', '${_latest?['memory_usage'] ?? '—'}%', Icons.storage, Colors.purple),
                      _kpi('Active Calls', '${_latest?['active_calls'] ?? 0}', Icons.video_call, Colors.green),
                      _kpi('Active Chats', '${_latest?['active_chats'] ?? 0}', Icons.chat, Colors.orange),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text('Recent Samples', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  ..._history.map((h) {
                    final t = DateTime.tryParse(h['recorded_at']?.toString() ?? '');
                    return Card(
                      child: ListTile(
                        dense: true,
                        title: Text(t != null ? DateFormat.Hms().format(t) : '—'),
                        subtitle: Text('CPU ${h['cpu_usage'] ?? '—'}% • Mem ${h['memory_usage'] ?? '—'}%'),
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
