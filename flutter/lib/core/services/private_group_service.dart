import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/models/private_group_model.dart';

/// Private Group Service Provider
final privateGroupServiceProvider = Provider<PrivateGroupService>((ref) {
  return PrivateGroupService();
});

/// Private Group Service
///
/// Handles private group video call rooms.
/// Synced with React usePrivateGroupCall hook and PrivateGroupsSection.
class PrivateGroupService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Get available groups
  Future<List<PrivateGroupModel>> getAvailableGroups() async {
    try {
      final response = await _client
          .from('private_groups')
          .select()
          .eq('is_live', true)
          .order('participant_count', ascending: false);

      return (response as List)
          .map((json) => PrivateGroupModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Get user's own groups
  Future<List<PrivateGroupModel>> getMyGroups(String userId) async {
    try {
      final response = await _client
          .from('private_groups')
          .select()
          .eq('owner_id', userId)
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => PrivateGroupModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Create a private group
  Future<PrivateGroupModel?> createGroup({
    required String ownerId,
    required String groupName,
    String? description,
    String? ownerName,
    String? ownerPhoto,
    String? ownerLanguage,
    double giftEntryAmount = 50,
  }) async {
    try {
      final response = await _client.from('private_groups').insert({
        'owner_id': ownerId,
        'group_name': groupName,
        'description': description,
        'owner_name': ownerName,
        'owner_photo': ownerPhoto,
        'owner_language': ownerLanguage,
        'gift_entry_amount': giftEntryAmount,
        'is_live': false,
      }).select().single();

      return PrivateGroupModel.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  /// Start live stream for group
  Future<bool> startLive(String groupId, String hostId, String hostName) async {
    try {
      await _client.from('private_groups').update({
        'is_live': true,
        'current_host_id': hostId,
        'current_host_name': hostName,
        'stream_id': 'stream_${groupId}_${DateTime.now().millisecondsSinceEpoch}',
      }).eq('id', groupId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Stop live stream
  Future<bool> stopLive(String groupId) async {
    try {
      await _client.from('private_groups').update({
        'is_live': false,
        'stream_id': null,
        'current_host_id': null,
        'current_host_name': null,
        'participant_count': 0,
      }).eq('id', groupId);

      // Remove all memberships
      await _client.from('group_memberships').delete().eq('group_id', groupId);

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Join group (pay gift entry)
  Future<bool> joinGroup({
    required String groupId,
    required String userId,
    required double giftAmount,
  }) async {
    try {
      // Process payment via RPC
      final response = await _client.rpc('process_group_billing', params: {
        'p_group_id': groupId,
        'p_user_id': userId,
        'p_amount': giftAmount,
      });

      final data = response as Map<String, dynamic>?;
      return data?['success'] as bool? ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Leave group
  Future<bool> leaveGroup(String groupId, String userId) async {
    try {
      await _client
          .from('group_memberships')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userId);

      // Decrement participant count
      await _client.rpc('decrement_group_participants', params: {
        'p_group_id': groupId,
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Send tip to host
  Future<bool> sendTip({
    required String groupId,
    required String userId,
    required double amount,
  }) async {
    try {
      final response = await _client.rpc('process_group_tip', params: {
        'p_group_id': groupId,
        'p_user_id': userId,
        'p_amount': amount,
      });

      final data = response as Map<String, dynamic>?;
      return data?['success'] as bool? ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Get group members
  Future<List<GroupMembershipModel>> getGroupMembers(String groupId) async {
    try {
      final response = await _client
          .from('group_memberships')
          .select()
          .eq('group_id', groupId);

      return (response as List)
          .map((json) => GroupMembershipModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Subscribe to group updates
  RealtimeChannel subscribeToGroup(
    String groupId,
    void Function(PrivateGroupModel group) onUpdate,
  ) {
    return _client.channel('group:$groupId').onPostgresChanges(
      event: PostgresChangeEvent.update,
      schema: 'public',
      table: 'private_groups',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'id',
        value: groupId,
      ),
      callback: (payload) {
        onUpdate(PrivateGroupModel.fromJson(payload.newRecord));
      },
    ).subscribe();
  }

  /// Subscribe to available groups (live groups)
  RealtimeChannel subscribeToAvailableGroups(
    void Function() onUpdate,
  ) {
    return _client.channel('live_groups').onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'private_groups',
      callback: (_) => onUpdate(),
    ).subscribe();
  }
}
