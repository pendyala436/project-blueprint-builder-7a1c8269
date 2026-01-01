import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'offline_cache_service.dart';

/// Background Sync Service
/// 
/// Provides background sync capabilities for Flutter.
/// Synced with web app's sw.ts sync handlers.
class BackgroundSyncService {
  static BackgroundSyncService? _instance;
  static BackgroundSyncService get instance => _instance ??= BackgroundSyncService._();
  
  BackgroundSyncService._();

  final _connectivity = Connectivity();
  final _offlineCache = OfflineCacheService.instance;
  final _supabase = Supabase.instance.client;
  
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _periodicSyncTimer;
  bool _isSyncing = false;

  /// Initialize background sync
  Future<void> initialize() async {
    await _offlineCache.initialize();
    
    // Listen for connectivity changes
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(_onConnectivityChanged);
    
    // Start periodic sync (similar to sw.ts periodicsync)
    _periodicSyncTimer = Timer.periodic(
      const Duration(minutes: 15),
      (_) => _periodicSync(),
    );

    // Initial sync attempt
    _attemptSync();
  }

  /// Dispose resources
  void dispose() {
    _connectivitySubscription?.cancel();
    _periodicSyncTimer?.cancel();
  }

  /// Handle connectivity changes
  void _onConnectivityChanged(List<ConnectivityResult> results) {
    final isOnline = results.isNotEmpty && 
        !results.contains(ConnectivityResult.none);
    
    if (isOnline) {
      _attemptSync();
    }
  }

  /// Attempt to sync pending data
  Future<void> _attemptSync() async {
    if (_isSyncing) return;
    
    final results = await _connectivity.checkConnectivity();
    final isOnline = results.isNotEmpty && 
        !results.contains(ConnectivityResult.none);
    
    if (!isOnline) return;

    _isSyncing = true;
    
    try {
      await Future.wait([
        syncMessages(),
        syncOfflineActions(),
      ]);
    } finally {
      _isSyncing = false;
    }
  }

  /// Periodic sync (similar to sw.ts periodicsync)
  Future<void> _periodicSync() async {
    await _attemptSync();
    await _offlineCache.cleanupExpiredEntries();
  }

  // ========================================
  // SYNC MESSAGES
  // Synced with sw.ts syncMessages()
  // ========================================

  /// Sync pending messages to server
  Future<void> syncMessages() async {
    final messages = await _offlineCache.getPendingMessages();
    
    for (final message in messages) {
      try {
        // Determine the target table and action
        final chatId = message['chat_id'];
        final content = message['message'];
        final senderId = message['sender_id'];
        final receiverId = message['receiver_id'];

        if (chatId != null && content != null) {
          await _supabase.from('chat_messages').insert({
            'chat_id': chatId,
            'message': content,
            'sender_id': senderId,
            'receiver_id': receiverId,
            'created_at': message['created_at'] ?? DateTime.now().toIso8601String(),
          });
        }
        
        // Remove from queue after successful sync
        if (message['_cache_key'] != null) {
          await _offlineCache.removeOfflineMessage(message['_cache_key']);
        }
      } catch (e) {
        // Keep in queue for retry
        print('Failed to sync message: $e');
      }
    }
  }

  // ========================================
  // SYNC OFFLINE ACTIONS
  // Synced with sw.ts syncOfflineActions()
  // ========================================

  /// Sync pending actions to server
  Future<void> syncOfflineActions() async {
    final actions = await _offlineCache.getPendingActions();
    
    for (final action in actions) {
      try {
        final type = action['type'] as String?;
        final data = action['data'] as Map<String, dynamic>?;
        final key = action['key'] as String?;

        if (type == null || data == null) continue;

        switch (type) {
          case 'like':
            await _syncLikeAction(data);
            break;
          case 'block':
            await _syncBlockAction(data);
            break;
          case 'friend_request':
            await _syncFriendRequestAction(data);
            break;
          case 'read_receipt':
            await _syncReadReceiptAction(data);
            break;
          default:
            print('Unknown action type: $type');
        }

        // Remove from queue after successful sync
        if (key != null) {
          await _offlineCache.removeOfflineAction(key);
        }
      } catch (e) {
        print('Failed to sync action: $e');
      }
    }
  }

  Future<void> _syncLikeAction(Map<String, dynamic> data) async {
    await _supabase.from('user_relationships').upsert({
      'user_id': data['user_id'],
      'target_user_id': data['target_user_id'],
      'relationship_type': 'like',
      'created_at': data['created_at'] ?? DateTime.now().toIso8601String(),
    });
  }

  Future<void> _syncBlockAction(Map<String, dynamic> data) async {
    await _supabase.from('user_relationships').upsert({
      'user_id': data['user_id'],
      'target_user_id': data['target_user_id'],
      'relationship_type': 'block',
      'created_at': data['created_at'] ?? DateTime.now().toIso8601String(),
    });
  }

  Future<void> _syncFriendRequestAction(Map<String, dynamic> data) async {
    await _supabase.from('user_relationships').upsert({
      'user_id': data['user_id'],
      'target_user_id': data['target_user_id'],
      'relationship_type': 'friend_request',
      'created_at': data['created_at'] ?? DateTime.now().toIso8601String(),
    });
  }

  Future<void> _syncReadReceiptAction(Map<String, dynamic> data) async {
    await _supabase
        .from('chat_messages')
        .update({'is_read': true})
        .eq('id', data['message_id']);
  }

  // ========================================
  // QUEUE ACTIONS (for offline use)
  // ========================================

  /// Queue a message for offline sync
  Future<void> queueMessage(Map<String, dynamic> message) async {
    await _offlineCache.queueOfflineMessage({
      ...message,
      '_cache_key': 'msg_${DateTime.now().millisecondsSinceEpoch}',
    });
    _attemptSync();
  }

  /// Queue an action for offline sync
  Future<void> queueAction(String type, Map<String, dynamic> data) async {
    await _offlineCache.queueOfflineAction({
      'type': type,
      'data': data,
      'created_at': DateTime.now().toIso8601String(),
    });
    _attemptSync();
  }

  /// Check if there are pending items to sync
  Future<bool> hasPendingSync() async {
    final messages = await _offlineCache.getPendingMessages();
    final actions = await _offlineCache.getPendingActions();
    return messages.isNotEmpty || actions.isNotEmpty;
  }

  /// Get count of pending items
  Future<int> getPendingSyncCount() async {
    final messages = await _offlineCache.getPendingMessages();
    final actions = await _offlineCache.getPendingActions();
    return messages.length + actions.length;
  }

  /// Force sync now
  Future<void> forcSync() async {
    await _attemptSync();
  }
}
