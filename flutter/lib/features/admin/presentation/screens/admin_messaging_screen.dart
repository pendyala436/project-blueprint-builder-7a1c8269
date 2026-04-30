import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Admin Messaging — mirrors React AdminMessaging.tsx (broadcast announcements)
class AdminMessagingScreen extends ConsumerStatefulWidget {
  const AdminMessagingScreen({super.key});

  @override
  ConsumerState<AdminMessagingScreen> createState() => _AdminMessagingScreenState();
}

class _AdminMessagingScreenState extends ConsumerState<AdminMessagingScreen> {
  final _supabase = Supabase.instance.client;
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _audience = 'all';
  bool _sending = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_title.text.isEmpty || _body.text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await _supabase.from('admin_messages').insert({
        'title': _title.text,
        'body': _body.text,
        'audience': _audience,
        'created_at': DateTime.now().toIso8601String(),
      });
      if (mounted) {
        _title.clear();
        _body.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Message broadcast queued')),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Broadcast Messaging')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              value: _audience,
              decoration: const InputDecoration(labelText: 'Audience', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'all', child: Text('All users')),
                DropdownMenuItem(value: 'male', child: Text('Men only')),
                DropdownMenuItem(value: 'female', child: Text('Women only')),
              ],
              onChanged: (v) => setState(() => _audience = v ?? 'all'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _body,
              maxLines: 6,
              decoration: const InputDecoration(labelText: 'Message', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _sending ? null : _send,
              icon: _sending
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.send),
              label: const Text('Send broadcast'),
            ),
          ],
        ),
      ),
    );
  }
}
