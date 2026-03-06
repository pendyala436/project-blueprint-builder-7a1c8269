import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/models/video_call_model.dart';

/// Video Call Service Provider
final videoCallServiceProvider = Provider<VideoCallService>((ref) {
  return VideoCallService();
});

/// Video Call Service
///
/// Handles video call session management via Supabase.
/// Agora RTC integration happens in the screen layer.
/// Synced with React useP2PCall / useSRSCall hooks.
class VideoCallService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Initiate a video call
  Future<VideoCallResult> initiateCall({
    required String callerId,
    required String receiverId,
  }) async {
    try {
      // Create video call session via edge function
      final response = await _client.functions.invoke(
        'video-call-server',
        body: {
          'action': 'initiate',
          'callerId': callerId,
          'receiverId': receiverId,
        },
      );

      final data = response.data as Map<String, dynamic>?;
      if (data == null) {
        return const VideoCallResult(success: false, error: 'No response from server');
      }

      return VideoCallResult(
        success: data['success'] as bool? ?? false,
        sessionId: data['sessionId'] as String?,
        channelName: data['channelName'] as String?,
        token: data['token'] as String?,
        error: data['error'] as String?,
      );
    } catch (e) {
      return VideoCallResult(success: false, error: e.toString());
    }
  }

  /// Accept incoming call
  Future<VideoCallResult> acceptCall(String sessionId) async {
    try {
      final response = await _client.functions.invoke(
        'video-call-server',
        body: {
          'action': 'accept',
          'sessionId': sessionId,
        },
      );

      final data = response.data as Map<String, dynamic>?;
      return VideoCallResult(
        success: data?['success'] as bool? ?? false,
        sessionId: sessionId,
        channelName: data?['channelName'] as String?,
        token: data?['token'] as String?,
        error: data?['error'] as String?,
      );
    } catch (e) {
      return VideoCallResult(success: false, error: e.toString());
    }
  }

  /// Reject/decline incoming call
  Future<bool> rejectCall(String sessionId) async {
    try {
      await _client.from('video_call_sessions').update({
        'status': 'rejected',
        'ended_at': DateTime.now().toIso8601String(),
        'end_reason': 'rejected',
      }).eq('id', sessionId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// End active call
  Future<bool> endCall(String sessionId) async {
    try {
      await _client.from('video_call_sessions').update({
        'status': 'ended',
        'ended_at': DateTime.now().toIso8601String(),
        'end_reason': 'user_ended',
      }).eq('id', sessionId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get call session details
  Future<VideoCallSessionModel?> getSession(String sessionId) async {
    try {
      final response = await _client
          .from('video_call_sessions')
          .select()
          .eq('id', sessionId)
          .maybeSingle();

      if (response == null) return null;
      return VideoCallSessionModel.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  /// Get call history
  Future<List<VideoCallSessionModel>> getCallHistory(String userId, {int limit = 20}) async {
    try {
      final response = await _client
          .from('video_call_sessions')
          .select()
          .or('man_user_id.eq.$userId,woman_user_id.eq.$userId')
          .order('created_at', ascending: false)
          .limit(limit);

      return (response as List)
          .map((json) => VideoCallSessionModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Subscribe to incoming calls
  RealtimeChannel subscribeToIncomingCalls(
    String userId,
    void Function(VideoCallSessionModel session) onIncomingCall,
  ) {
    return _client.channel('video_calls:$userId').onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'video_call_sessions',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'woman_user_id',
        value: userId,
      ),
      callback: (payload) {
        final session = VideoCallSessionModel.fromJson(payload.newRecord);
        if (session.status == 'pending') {
          onIncomingCall(session);
        }
      },
    ).subscribe();
  }

  /// Process video call billing
  Future<Map<String, dynamic>> processCallBilling(String sessionId, double minutes) async {
    try {
      final response = await _client.rpc('process_video_call_billing', params: {
        'p_session_id': sessionId,
        'p_minutes': minutes,
      });
      return response as Map<String, dynamic>;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}
