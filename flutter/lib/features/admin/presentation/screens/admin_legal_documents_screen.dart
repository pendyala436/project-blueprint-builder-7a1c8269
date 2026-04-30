import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Admin Legal Documents — mirrors React AdminLegalDocuments.tsx
class AdminLegalDocumentsScreen extends ConsumerStatefulWidget {
  const AdminLegalDocumentsScreen({super.key});

  @override
  ConsumerState<AdminLegalDocumentsScreen> createState() => _AdminLegalDocumentsScreenState();
}

class _AdminLegalDocumentsScreenState extends ConsumerState<AdminLegalDocumentsScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  List<Map<String, dynamic>> _docs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _supabase
          .from('legal_documents')
          .select()
          .order('updated_at', ascending: false);
      if (!mounted) return;
      setState(() {
        _docs = List<Map<String, dynamic>>.from(res);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit(Map<String, dynamic> doc) async {
    final ctrl = TextEditingController(text: doc['content']?.toString() ?? '');
    final saved = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(doc['title']?.toString() ?? 'Edit Document'),
        content: SizedBox(
          width: double.maxFinite,
          height: 400,
          child: TextField(
            controller: ctrl,
            maxLines: null,
            expands: true,
            textAlignVertical: TextAlignVertical.top,
            decoration: const InputDecoration(border: OutlineInputBorder()),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, ctrl.text), child: const Text('Save')),
        ],
      ),
    );
    if (saved == null) return;
    try {
      await _supabase.from('legal_documents').update({
        'content': saved,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', doc['id']);
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Legal Documents')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                itemCount: _docs.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final d = _docs[i];
                  return ListTile(
                    leading: const Icon(Icons.description),
                    title: Text(d['title']?.toString() ?? '—'),
                    subtitle: Text('Version ${d['version'] ?? '1'}'),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () => _edit(d),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
