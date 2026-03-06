/// Private Group Model - Synced with private_groups table
class PrivateGroupModel {
  final String id;
  final String ownerId;
  final String groupName;
  final String? description;
  final String? ownerName;
  final String? ownerPhoto;
  final String? ownerLanguage;
  final bool isLive;
  final String? streamId;
  final String? currentHostId;
  final String? currentHostName;
  final int participantCount;
  final int maxParticipants;
  final double giftEntryAmount;
  final String giftEntryCurrency;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const PrivateGroupModel({
    required this.id,
    required this.ownerId,
    required this.groupName,
    this.description,
    this.ownerName,
    this.ownerPhoto,
    this.ownerLanguage,
    this.isLive = false,
    this.streamId,
    this.currentHostId,
    this.currentHostName,
    this.participantCount = 0,
    this.maxParticipants = 10,
    this.giftEntryAmount = 50,
    this.giftEntryCurrency = 'INR',
    this.createdAt,
    this.updatedAt,
  });

  factory PrivateGroupModel.fromJson(Map<String, dynamic> json) {
    return PrivateGroupModel(
      id: json['id'] as String,
      ownerId: json['owner_id'] as String,
      groupName: json['group_name'] as String? ?? 'Unnamed Group',
      description: json['description'] as String?,
      ownerName: json['owner_name'] as String?,
      ownerPhoto: json['owner_photo'] as String?,
      ownerLanguage: json['owner_language'] as String?,
      isLive: json['is_live'] as bool? ?? false,
      streamId: json['stream_id'] as String?,
      currentHostId: json['current_host_id'] as String?,
      currentHostName: json['current_host_name'] as String?,
      participantCount: json['participant_count'] as int? ?? 0,
      maxParticipants: json['max_participants'] as int? ?? 10,
      giftEntryAmount: (json['gift_entry_amount'] as num?)?.toDouble() ?? 50,
      giftEntryCurrency: json['gift_entry_currency'] as String? ?? 'INR',
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
    );
  }
}

/// Group Membership Model
class GroupMembershipModel {
  final String id;
  final String groupId;
  final String userId;
  final double giftAmountPaid;
  final bool hasAccess;
  final DateTime? joinedAt;

  const GroupMembershipModel({
    required this.id,
    required this.groupId,
    required this.userId,
    this.giftAmountPaid = 0,
    this.hasAccess = true,
    this.joinedAt,
  });

  factory GroupMembershipModel.fromJson(Map<String, dynamic> json) {
    return GroupMembershipModel(
      id: json['id'] as String,
      groupId: json['group_id'] as String,
      userId: json['user_id'] as String,
      giftAmountPaid: (json['gift_amount_paid'] as num?)?.toDouble() ?? 0,
      hasAccess: json['has_access'] as bool? ?? true,
      joinedAt: json['joined_at'] != null ? DateTime.parse(json['joined_at']) : null,
    );
  }
}
