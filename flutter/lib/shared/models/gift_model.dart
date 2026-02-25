/// Gift Model
class GiftModel {
  final String id;
  final String name;
  final String emoji;
  final double price;
  final String currency;
  final String category;
  final String? description;
  final bool isActive;
  final int sortOrder;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const GiftModel({
    required this.id,
    required this.name,
    this.emoji = '🎁',
    this.price = 0,
    this.currency = 'INR',
    this.category = 'general',
    this.description,
    this.isActive = true,
    this.sortOrder = 0,
    this.createdAt,
    this.updatedAt,
  });
}

/// Gift Transaction Model
class GiftTransactionModel {
  final String id;
  final String senderId;
  final String receiverId;
  final String giftId;
  final double pricePaid;
  final String currency;
  final String? message;
  final String status;
  final DateTime? createdAt;

  const GiftTransactionModel({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.giftId,
    required this.pricePaid,
    this.currency = 'INR',
    this.message,
    this.status = 'completed',
    this.createdAt,
  });
}

/// Gift with Sender Info (for display)
class ReceivedGift {
  final GiftModel gift;
  final String senderName;
  final String? senderPhotoUrl;
  final String? message;
  final DateTime? receivedAt;

  const ReceivedGift({
    required this.gift,
    required this.senderName,
    this.senderPhotoUrl,
    this.message,
    this.receivedAt,
  });
}
