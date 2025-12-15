import 'package:freezed_annotation/freezed_annotation.dart';

part 'gift_model.freezed.dart';
part 'gift_model.g.dart';

/// Gift Model
@freezed
class GiftModel with _$GiftModel {
  const factory GiftModel({
    required String id,
    required String name,
    @Default('🎁') String emoji,
    @Default(0) double price,
    @Default('INR') String currency,
    @Default('general') String category,
    String? description,
    @Default(true) bool isActive,
    @Default(0) int sortOrder,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _GiftModel;

  factory GiftModel.fromJson(Map<String, dynamic> json) =>
      _$GiftModelFromJson(json);
}

/// Gift Transaction Model
@freezed
class GiftTransactionModel with _$GiftTransactionModel {
  const factory GiftTransactionModel({
    required String id,
    required String senderId,
    required String receiverId,
    required String giftId,
    required double pricePaid,
    @Default('INR') String currency,
    String? message,
    @Default('completed') String status,
    DateTime? createdAt,
  }) = _GiftTransactionModel;

  factory GiftTransactionModel.fromJson(Map<String, dynamic> json) =>
      _$GiftTransactionModelFromJson(json);
}

/// Gift with Sender Info (for display)
@freezed
class ReceivedGift with _$ReceivedGift {
  const factory ReceivedGift({
    required GiftModel gift,
    required String senderName,
    String? senderPhotoUrl,
    String? message,
    DateTime? receivedAt,
  }) = _ReceivedGift;

  factory ReceivedGift.fromJson(Map<String, dynamic> json) =>
      _$ReceivedGiftFromJson(json);
}
