/// User Model - Synced with profiles table in database
/// Plain Dart class (no Freezed) for simplicity
class UserModel {
  final String id;
  final String userId;
  final String? email;
  final String? phone;
  final String? fullName;
  final int? age;
  final String? gender;
  final String? dateOfBirth;
  final String? country;
  final String? state;
  final String? city;
  final String? bio;
  final String? photoUrl;
  final List<String> interests;
  final List<String> lifeGoals;
  final String? occupation;
  final String? educationLevel;
  final String? religion;
  final String? maritalStatus;
  final int? heightCm;
  final String? bodyType;
  final String? preferredLanguage;
  final String? primaryLanguage;
  final String? smokingHabit;
  final String? drinkingHabit;
  final String? dietaryPreference;
  final String? fitnessLevel;
  final bool? hasChildren;
  final String? petPreference;
  final String? travelFrequency;
  final String? personalityType;
  final String? zodiacSign;
  final bool isVerified;
  final bool isPremium;
  final String approvalStatus;
  final String accountStatus;
  final bool? aiApproved;
  final String? aiDisapprovalReason;
  final int? performanceScore;
  final int? avgResponseTimeSeconds;
  final int? totalChatsCount;
  final int? profileCompleteness;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? lastActiveAt;

  const UserModel({
    required this.id,
    required this.userId,
    this.email,
    this.phone,
    this.fullName,
    this.age,
    this.gender,
    this.dateOfBirth,
    this.country,
    this.state,
    this.city,
    this.bio,
    this.photoUrl,
    this.interests = const [],
    this.lifeGoals = const [],
    this.occupation,
    this.educationLevel,
    this.religion,
    this.maritalStatus,
    this.heightCm,
    this.bodyType,
    this.preferredLanguage,
    this.primaryLanguage,
    this.smokingHabit,
    this.drinkingHabit,
    this.dietaryPreference,
    this.fitnessLevel,
    this.hasChildren,
    this.petPreference,
    this.travelFrequency,
    this.personalityType,
    this.zodiacSign,
    this.isVerified = false,
    this.isPremium = false,
    this.approvalStatus = 'pending',
    this.accountStatus = 'active',
    this.aiApproved,
    this.aiDisapprovalReason,
    this.performanceScore,
    this.avgResponseTimeSeconds,
    this.totalChatsCount,
    this.profileCompleteness,
    this.createdAt,
    this.updatedAt,
    this.lastActiveAt,
  });

  UserModel copyWith({
    String? id,
    String? userId,
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
    List<String>? interests,
    List<String>? lifeGoals,
    String? occupation,
    String? educationLevel,
    String? religion,
    String? maritalStatus,
    int? heightCm,
    String? bodyType,
    String? preferredLanguage,
    String? primaryLanguage,
    bool? isVerified,
    bool? isPremium,
    String? approvalStatus,
    String? accountStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastActiveAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      fullName: fullName ?? this.fullName,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      country: country ?? this.country,
      state: state ?? this.state,
      city: city ?? this.city,
      bio: bio ?? this.bio,
      photoUrl: photoUrl ?? this.photoUrl,
      interests: interests ?? this.interests,
      lifeGoals: lifeGoals ?? this.lifeGoals,
      occupation: occupation ?? this.occupation,
      educationLevel: educationLevel ?? this.educationLevel,
      religion: religion ?? this.religion,
      maritalStatus: maritalStatus ?? this.maritalStatus,
      heightCm: heightCm ?? this.heightCm,
      bodyType: bodyType ?? this.bodyType,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      primaryLanguage: primaryLanguage ?? this.primaryLanguage,
      isVerified: isVerified ?? this.isVerified,
      isPremium: isPremium ?? this.isPremium,
      approvalStatus: approvalStatus ?? this.approvalStatus,
      accountStatus: accountStatus ?? this.accountStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastActiveAt: lastActiveAt ?? this.lastActiveAt,
    );
  }
}

/// User Status Model
class UserStatusModel {
  final String id;
  final String userId;
  final bool isOnline;
  final DateTime? lastSeen;
  final String? statusText;

  const UserStatusModel({
    required this.id,
    required this.userId,
    this.isOnline = false,
    this.lastSeen,
    this.statusText,
  });
}

/// User Settings Model
class UserSettingsModel {
  final String userId;
  final String theme;
  final String language;
  final bool autoTranslate;
  final bool notificationSound;
  final bool notificationVibration;
  final bool showOnlineStatus;
  final bool showReadReceipts;
  final String profileVisibility;

  const UserSettingsModel({
    required this.userId,
    this.theme = 'system',
    this.language = 'en',
    this.autoTranslate = true,
    this.notificationSound = true,
    this.notificationVibration = true,
    this.showOnlineStatus = true,
    this.showReadReceipts = true,
    this.profileVisibility = 'all',
  });
}

/// User Language Model
class UserLanguageModel {
  final String id;
  final String userId;
  final String languageCode;
  final String languageName;
  final DateTime? createdAt;

  const UserLanguageModel({
    required this.id,
    required this.userId,
    required this.languageCode,
    required this.languageName,
    this.createdAt,
  });
}
