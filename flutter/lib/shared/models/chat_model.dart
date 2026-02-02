import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_model.freezed.dart';
part 'chat_model.g.dart';

/// Chat Message Model
@freezed
class ChatMessageModel with _$ChatMessageModel {
  const factory ChatMessageModel({
    required String id,
    required String chatId,
    required String senderId,
    required String receiverId,
    required String message,
    String? translatedMessage,
    @Default(false) bool isTranslated,
    @Default(false) bool isRead,
    @Default(false) bool flagged,
    String? flagReason,
    DateTime? createdAt,
  }) = _ChatMessageModel;

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageModelFromJson(json);
}

/// Chat Session Model
@freezed
class ChatSessionModel with _$ChatSessionModel {
  const factory ChatSessionModel({
    required String id,
    required String chatId,
    required String manUserId,
    required String womanUserId,
    @Default('active') String status,
    DateTime? startedAt,
    DateTime? endedAt,
    @Default(0) double totalMinutes,
    @Default(0) double totalEarned,
    @Default(4.0) double ratePerMinute, // Men pay ₹4/min chat (synced with DB)
    String? endReason,
    DateTime? lastActivityAt,
  }) = _ChatSessionModel;

  factory ChatSessionModel.fromJson(Map<String, dynamic> json) =>
      _$ChatSessionModelFromJson(json);
}

/// Chat Pricing Model
@freezed
class ChatPricingModel with _$ChatPricingModel {
  const factory ChatPricingModel({
    @Default(4.0) double ratePerMinute,           // Men pay ₹4/min chat
    @Default(0.0) double womenEarningRate,        // Women earn NOTHING from chat
    @Default(8.0) double videoRatePerMinute,      // Men pay ₹8/min video
    @Default(4.0) double videoWomenEarningRate,   // Women earn ₹4/min video ONLY
    @Default(10000.0) double minWithdrawalBalance,
    @Default('INR') String currency,
  }) = _ChatPricingModel;

  factory ChatPricingModel.fromJson(Map<String, dynamic> json) =>
      _$ChatPricingModelFromJson(json);
}

/// Chat Partner Info (for display)
@freezed
class ChatPartnerInfo with _$ChatPartnerInfo {
  const factory ChatPartnerInfo({
    required String userId,
    required String name,
    String? photoUrl,
    @Default(false) bool isOnline,
    DateTime? lastSeen,
  }) = _ChatPartnerInfo;

  factory ChatPartnerInfo.fromJson(Map<String, dynamic> json) =>
      _$ChatPartnerInfoFromJson(json);
}
