/// Match Model
class MatchModel {
  final String id;
  final String userId;
  final String matchedUserId;
  final int? matchScore;
  final String status;
  final DateTime? matchedAt;
  final DateTime? createdAt;

  const MatchModel({
    required this.id,
    required this.userId,
    required this.matchedUserId,
    this.matchScore,
    this.status = 'pending',
    this.matchedAt,
    this.createdAt,
  });
}

/// Match Profile (with calculated score)
class MatchProfileModel {
  final String id;
  final String userId;
  final String? fullName;
  final int? age;
  final String? gender;
  final String? country;
  final String? state;
  final String? bio;
  final String? photoUrl;
  final List<String> interests;
  final String? occupation;
  final bool isVerified;
  final bool isOnline;
  final int matchScore;
  final List<String> commonLanguages;
  final List<String> commonInterests;

  const MatchProfileModel({
    required this.id,
    required this.userId,
    this.fullName,
    this.age,
    this.gender,
    this.country,
    this.state,
    this.bio,
    this.photoUrl,
    this.interests = const [],
    this.occupation,
    this.isVerified = false,
    this.isOnline = false,
    this.matchScore = 0,
    this.commonLanguages = const [],
    this.commonInterests = const [],
  });
}

/// Match Filter Options
class MatchFilters {
  final int? minAge;
  final int? maxAge;
  final String? country;
  final String? state;
  final List<String>? languages;
  final List<String>? interests;
  final bool? onlineOnly;
  final bool? verifiedOnly;

  const MatchFilters({
    this.minAge,
    this.maxAge,
    this.country,
    this.state,
    this.languages,
    this.interests,
    this.onlineOnly,
    this.verifiedOnly,
  });
}
