import 'package:freezed_annotation/freezed_annotation.dart';

part 'match_model.freezed.dart';
part 'match_model.g.dart';

/// Match Model
@freezed
class MatchModel with _$MatchModel {
  const factory MatchModel({
    required String id,
    required String userId,
    required String matchedUserId,
    int? matchScore,
    @Default('pending') String status,
    DateTime? matchedAt,
    DateTime? createdAt,
  }) = _MatchModel;

  factory MatchModel.fromJson(Map<String, dynamic> json) =>
      _$MatchModelFromJson(json);
}

/// Match Profile (with calculated score)
@freezed
class MatchProfileModel with _$MatchProfileModel {
  const factory MatchProfileModel({
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
    @Default(false) bool isVerified,
    @Default(false) bool isOnline,
    @Default(0) int matchScore,
    @Default([]) List<String> commonLanguages,
    @Default([]) List<String> commonInterests,
  }) = _MatchProfileModel;

  factory MatchProfileModel.fromJson(Map<String, dynamic> json) =>
      _$MatchProfileModelFromJson(json);
}

/// Match Filter Options
@freezed
class MatchFilters with _$MatchFilters {
  const factory MatchFilters({
    int? minAge,
    int? maxAge,
    String? country,
    String? state,
    List<String>? languages,
    List<String>? interests,
    bool? onlineOnly,
    bool? verifiedOnly,
  }) = _MatchFilters;

  factory MatchFilters.fromJson(Map<String, dynamic> json) =>
      _$MatchFiltersFromJson(json);
}
