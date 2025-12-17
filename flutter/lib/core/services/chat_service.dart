import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/models/chat_model.dart';

/// Chat Service Provider
final chatServiceProvider = Provider<ChatService>((ref) {
  return ChatService();
});

/// Chat Service
/// 
/// Handles all chat-related operations.
class ChatService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Get chat pricing configuration
  Future<ChatPricingModel> getChatPricing() async {
    try {
      final response = await _client
          .from('chat_pricing')
          .select()
          .eq('is_active', true)
          .maybeSingle();

      if (response == null) {
        return const ChatPricingModel();
      }

      return ChatPricingModel(
        ratePerMinute: (response['rate_per_minute'] as num?)?.toDouble() ?? 2,
        womenEarningRate: (response['women_earning_rate'] as num?)?.toDouble() ?? 2,
        videoRatePerMinute: (response['video_rate_per_minute'] as num?)?.toDouble() ?? 10,
        videoWomenEarningRate: (response['video_women_earning_rate'] as num?)?.toDouble() ?? 5,
        minWithdrawalBalance: (response['min_withdrawal_balance'] as num?)?.toDouble() ?? 10000,
        currency: response['currency'] as String? ?? 'INR',
      );
    } catch (e) {
      return const ChatPricingModel();
    }
  }

  /// Get chat messages
  Future<List<ChatMessageModel>> getChatMessages(String chatId, {int limit = 100}) async {
    try {
      final response = await _client
          .from('chat_messages')
          .select()
          .eq('chat_id', chatId)
          .order('created_at', ascending: true)
          .limit(limit);

      return (response as List)
          .map((json) => ChatMessageModel(
                id: json['id'],
                chatId: json['chat_id'],
                senderId: json['sender_id'],
                receiverId: json['receiver_id'],
                message: json['message'],
                translatedMessage: json['translated_message'],
                isTranslated: json['is_translated'] ?? false,
                isRead: json['is_read'] ?? false,
                flagged: json['flagged'] ?? false,
                flagReason: json['flag_reason'],
                createdAt: json['created_at'] != null
                    ? DateTime.parse(json['created_at'])
                    : null,
              ))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Send a message
  Future<ChatMessageModel?> sendMessage({
    required String chatId,
    required String senderId,
    required String receiverId,
    required String message,
  }) async {
    try {
      final response = await _client
          .from('chat_messages')
          .insert({
            'chat_id': chatId,
            'sender_id': senderId,
            'receiver_id': receiverId,
            'message': message,
          })
          .select()
          .single();

      return ChatMessageModel(
        id: response['id'],
        chatId: response['chat_id'],
        senderId: response['sender_id'],
        receiverId: response['receiver_id'],
        message: response['message'],
        createdAt: DateTime.parse(response['created_at']),
      );
    } catch (e) {
      return null;
    }
  }

  /// Get active chat sessions for user
  Future<List<ChatSessionModel>> getActiveSessions(String userId) async {
    try {
      final response = await _client
          .from('active_chat_sessions')
          .select()
          .or('man_user_id.eq.$userId,woman_user_id.eq.$userId')
          .eq('status', 'active');

      return (response as List)
          .map((json) => ChatSessionModel(
                id: json['id'],
                chatId: json['chat_id'],
                manUserId: json['man_user_id'],
                womanUserId: json['woman_user_id'],
                status: json['status'],
                startedAt: json['started_at'] != null
                    ? DateTime.parse(json['started_at'])
                    : null,
                endedAt: json['ended_at'] != null
                    ? DateTime.parse(json['ended_at'])
                    : null,
                totalMinutes: (json['total_minutes'] as num?)?.toDouble() ?? 0,
                totalEarned: (json['total_earned'] as num?)?.toDouble() ?? 0,
                ratePerMinute: (json['rate_per_minute'] as num?)?.toDouble() ?? 2,
                lastActivityAt: json['last_activity_at'] != null
                    ? DateTime.parse(json['last_activity_at'])
                    : null,
              ))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Mark messages as read
  Future<void> markMessagesAsRead(String chatId, String receiverId) async {
    try {
      await _client
          .from('chat_messages')
          .update({'is_read': true})
          .eq('chat_id', chatId)
          .eq('receiver_id', receiverId)
          .eq('is_read', false);
    } catch (e) {
      // Handle error silently
    }
  }

  /// Subscribe to new messages
  RealtimeChannel subscribeToMessages(
    String chatId,
    void Function(ChatMessageModel message) onMessage,
  ) {
    return _client.channel('chat:$chatId').onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'chat_messages',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'chat_id',
        value: chatId,
      ),
      callback: (payload) {
        final json = payload.newRecord;
        onMessage(ChatMessageModel(
          id: json['id'],
          chatId: json['chat_id'],
          senderId: json['sender_id'],
          receiverId: json['receiver_id'],
          message: json['message'],
          translatedMessage: json['translated_message'],
          isTranslated: json['is_translated'] ?? false,
          isRead: json['is_read'] ?? false,
          createdAt: json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : null,
        ));
      },
    ).subscribe();
  }

  /// Process chat billing (via database function)
  Future<Map<String, dynamic>> processChatBilling(
    String sessionId,
    double minutes,
  ) async {
    try {
      final response = await _client.rpc('process_chat_billing', params: {
        'p_session_id': sessionId,
        'p_minutes': minutes,
      });

      return response as Map<String, dynamic>;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// End chat session
  Future<bool> endChatSession(String sessionId, {String? reason}) async {
    try {
      await _client.from('active_chat_sessions').update({
        'status': 'ended',
        'ended_at': DateTime.now().toIso8601String(),
        'end_reason': reason,
      }).eq('id', sessionId);

      return true;
    } catch (e) {
      return false;
    }
  }
}
