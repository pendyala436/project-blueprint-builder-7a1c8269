import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FriendsScreen extends StatefulWidget {
  const FriendsScreen({super.key});

  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> {
  final _supabase = Supabase.instance.client;
  List<Map<String, dynamic>> _friends = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = _supabase.auth.currentUser?.id;
    if (uid == null) return;
    try {
      final data = await _supabase
          .from('friendships')
          .select('*, friend:friend_id(id, full_name, profile_photo_url)')
          .eq('user_id', uid)
          .eq('status', 'accepted');
      setState(() {
        _friends = List<Map<String, dynamic>>.from(data);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _unfriend(String friendId) async {
    await _supabase.rpc('remove_friend', params: {'p_friend_id': friendId});
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Friends')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _friends.isEmpty
              ? const Center(child: Text('No friends yet'))
              : ListView.separated(
                  itemCount: _friends.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final f = _friends[i]['friend'] as Map<String, dynamic>?;
                    if (f == null) return const SizedBox.shrink();
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundImage: f['profile_photo_url'] != null
                            ? NetworkImage(f['profile_photo_url'] as String)
                            : null,
                        child: f['profile_photo_url'] == null
                            ? const Icon(Icons.person)
                            : null,
                      ),
                      title: Text(f['full_name'] as String? ?? 'User'),
                      trailing: IconButton(
                        icon: const Icon(Icons.person_remove),
                        onPressed: () => _unfriend(f['id'] as String),
                      ),
                    );
                  },
                ),
    );
  }
}
