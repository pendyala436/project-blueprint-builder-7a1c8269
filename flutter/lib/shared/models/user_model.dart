import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

/// User Model
@freezed
class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String userId,
    String? fullName,
    int? age,
    String? gender,
    String? country,
    String? state,
    String? bio,
    String? photoUrl,
    @Default([]) List<String> interests,
    String? occupation,
    String? educationLevel,
    String? religion,
    String? maritalStatus,
    int? heightCm,
    String? bodyType,
    String? preferredLanguage,
    String? primaryLanguage,
    @Default(false) bool isVerified,
    @Default('pending') String approvalStatus,
    @Default('active') String accountStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);
}

/// User Status Model
@freezed
class UserStatusModel with _$UserStatusModel {
  const factory UserStatusModel({
    required String id,
    required String userId,
    @Default(false) bool isOnline,
    DateTime? lastSeen,
    String? statusText,
  }) = _UserStatusModel;

  factory UserStatusModel.fromJson(Map<String, dynamic> json) =>
      _$UserStatusModelFromJson(json);
}

/// User Settings Model
@freezed
class UserSettingsModel with _$UserSettingsModel {
  const factory UserSettingsModel({
    required String userId,
    @Default('system') String theme,
    @Default('en') String language,
    @Default(true) bool autoTranslate,
    @Default(true) bool notificationSound,
    @Default(true) bool notificationVibration,
    @Default(true) bool showOnlineStatus,
    @Default(true) bool showReadReceipts,
    @Default('all') String profileVisibility,
  }) = _UserSettingsModel;

  factory UserSettingsModel.fromJson(Map<String, dynamic> json) =>
      _$UserSettingsModelFromJson(json);
}
