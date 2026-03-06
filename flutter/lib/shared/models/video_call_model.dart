/// Video Call Session Model - Synced with video_call_sessions table
class VideoCallSessionModel {
  final String id;
  final String manUserId;
  final String womanUserId;
  final String status; // 'pending', 'active', 'ended', 'missed', 'rejected'
  final String? channelName;
  final String? agoraToken;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final String? endReason;
  final double totalMinutes;
  final double totalCharged;
  final double totalEarned;
  final double ratePerMinute;
  final DateTime? createdAt;

  const VideoCallSessionModel({
    required this.id,
    required this.manUserId,
    required this.womanUserId,
    this.status = 'pending',
    this.channelName,
    this.agoraToken,
    this.startedAt,
    this.endedAt,
    this.endReason,
    this.totalMinutes = 0,
    this.totalCharged = 0,
    this.totalEarned = 0,
    this.ratePerMinute = 8.0,
    this.createdAt,
  });

  factory VideoCallSessionModel.fromJson(Map<String, dynamic> json) {
    return VideoCallSessionModel(
      id: json['id'] as String,
      manUserId: json['man_user_id'] as String,
      womanUserId: json['woman_user_id'] as String,
      status: json['status'] as String? ?? 'pending',
      channelName: json['channel_name'] as String?,
      agoraToken: json['agora_token'] as String?,
      startedAt: json['started_at'] != null ? DateTime.parse(json['started_at']) : null,
      endedAt: json['ended_at'] != null ? DateTime.parse(json['ended_at']) : null,
      endReason: json['end_reason'] as String?,
      totalMinutes: (json['total_minutes'] as num?)?.toDouble() ?? 0,
      totalCharged: (json['total_charged'] as num?)?.toDouble() ?? 0,
      totalEarned: (json['total_earned'] as num?)?.toDouble() ?? 0,
      ratePerMinute: (json['rate_per_minute'] as num?)?.toDouble() ?? 8.0,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
    );
  }
}

/// Video Call Result
class VideoCallResult {
  final bool success;
  final String? sessionId;
  final String? channelName;
  final String? token;
  final String? error;

  const VideoCallResult({
    required this.success,
    this.sessionId,
    this.channelName,
    this.token,
    this.error,
  });
}
