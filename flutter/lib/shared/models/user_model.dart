import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

/// User Model - Synced with profiles table in database
/// Contains all profile fields matching PWA implementation
@freezed
class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String userId,
    String? email,
    String? phone,
    String? fullName,
    int? age,
    String? gender,
    String? dateOfBirth,
    String? country,
    String? state,
    String? city,
    String? bio,
    String? photoUrl,
    @Default([]) List<String> interests,
    @Default([]) List<String> lifeGoals,
    String? occupation,
    String? educationLevel,
    String? religion,
    String? maritalStatus,
    int? heightCm,
    String? bodyType,
    String? preferredLanguage,
    String? primaryLanguage,
    // Lifestyle fields
    String? smokingHabit,
    String? drinkingHabit,
    String? dietaryPreference,
    String? fitnessLevel,
    bool? hasChildren,
    String? petPreference,
    String? travelFrequency,
    String? personalityType,
    String? zodiacSign,
    // Status fields
    @Default(false) bool isVerified,
    @Default(false) bool isPremium,
    @Default('pending') String approvalStatus,
    @Default('active') String accountStatus,
    bool? aiApproved,
    String? aiDisapprovalReason,
    int? performanceScore,
    int? avgResponseTimeSeconds,
    int? totalChatsCount,
    int? profileCompleteness,
    // Timestamps
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastActiveAt,
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

/// User Language Model
@freezed
class UserLanguageModel with _$UserLanguageModel {
  const factory UserLanguageModel({
    required String id,
    required String userId,
    required String languageCode,
    required String languageName,
    DateTime? createdAt,
  }) = _UserLanguageModel;

  factory UserLanguageModel.fromJson(Map<String, dynamic> json) =>
      _$UserLanguageModelFromJson(json);
}
