import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Admin KYC Management — mirrors React AdminKYCManagement.tsx
class AdminKycManagementScreen extends ConsumerStatefulWidget {
  const AdminKycManagementScreen({super.key});

  @override
  ConsumerState<AdminKycManagementScreen> createState() => _AdminKycManagementScreenState();
}

class _AdminKycManagementScreenState extends ConsumerState<AdminKycManagementScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String _status = 'pending';
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _supabase
          .from('kyc_submissions')
          .select()
          .eq('status', _status)
          .order('submitted_at', ascending: false)
          .limit(100);
      if (!mounted) return;
      setState(() {
        _items = List<Map<String, dynamic>>.from(res);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _decide(String id, String decision) async {
    try {
      await _supabase.from('kyc_submissions').update({
        'status': decision,
        'reviewed_at': DateTime.now().toIso8601String(),
      }).eq('id', id);
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KYC Management'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: SizedBox(
            height: 48,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: ['pending', 'approved', 'rejected'].map((s) {
                final active = _status == s;
                return TextButton(
                  onPressed: () { setState(() => _status = s); _load(); },
                  child: Text(
                    s.toUpperCase(),
                    style: TextStyle(fontWeight: active ? FontWeight.bold : FontWeight.normal),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? Center(child: Text('No $_status submissions'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final k = _items[i];
                      return ListTile(
                        leading: const CircleAvatar(child: Icon(Icons.verified_user)),
                        title: Text(k['full_name']?.toString() ?? k['user_id']?.toString() ?? '—'),
                        subtitle: Text('PAN: ${k['pan_number'] ?? '—'} • Bank: ${k['bank_name'] ?? '—'}'),
                        trailing: _status == 'pending'
                            ? Row(mainAxisSize: MainAxisSize.min, children: [
                                IconButton(
                                  icon: const Icon(Icons.check, color: Colors.green),
                                  onPressed: () => _decide(k['id'], 'approved'),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close, color: Colors.red),
                                  onPressed: () => _decide(k['id'], 'rejected'),
                                ),
                              ])
                            : null,
                      );
                    },
                  ),
                ),
    );
  }
}
