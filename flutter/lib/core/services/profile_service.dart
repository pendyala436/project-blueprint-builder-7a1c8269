import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/models/user_model.dart';

/// Profile Service Provider
final profileServiceProvider = Provider<ProfileService>((ref) {
  return ProfileService();
});

/// Profile Service
/// 
/// Handles all profile-related operations.
class ProfileService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Get profile by user ID
  Future<UserModel?> getProfile(String userId) async {
    try {
      final response = await _client
          .from('profiles')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (response == null) return null;

      return _mapToUserModel(response);
    } catch (e) {
      return null;
    }
  }

  /// Get current user's profile
  Future<UserModel?> getCurrentProfile() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return null;
    return getProfile(userId);
  }

  /// Update profile
  Future<bool> updateProfile(String userId, Map<String, dynamic> updates) async {
    try {
      await _client
          .from('profiles')
          .update({
            ...updates,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('user_id', userId);

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get user languages
  Future<List<String>> getUserLanguages(String userId) async {
    try {
      final response = await _client
          .from('user_languages')
          .select('language_name')
          .eq('user_id', userId);

      return (response as List)
          .map((item) => item['language_name'] as String)
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// Add user language
  Future<bool> addUserLanguage(String userId, String languageCode, String languageName) async {
    try {
      await _client.from('user_languages').insert({
        'user_id': userId,
        'language_code': languageCode,
        'language_name': languageName,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Remove user language
  Future<bool> removeUserLanguage(String userId, String languageCode) async {
    try {
      await _client
          .from('user_languages')
          .delete()
          .eq('user_id', userId)
          .eq('language_code', languageCode);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Update online status
  Future<void> updateOnlineStatus(String userId, bool isOnline) async {
    try {
      await _client.from('user_status').upsert({
        'user_id': userId,
        'is_online': isOnline,
        'last_seen': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id');
    } catch (e) {
      // Handle error silently
    }
  }

  /// Get user photos
  Future<List<Map<String, dynamic>>> getUserPhotos(String userId) async {
    try {
      final response = await _client
          .from('user_photos')
          .select()
          .eq('user_id', userId)
          .order('display_order', ascending: true);

      return (response as List).cast<Map<String, dynamic>>();
    } catch (e) {
      return [];
    }
  }

  /// Add user photo
  Future<bool> addUserPhoto(String userId, String photoUrl, {bool isPrimary = false}) async {
    try {
      // Get current max order
      final existing = await getUserPhotos(userId);
      final maxOrder = existing.isEmpty
          ? 0
          : existing.map((p) => p['display_order'] as int).reduce((a, b) => a > b ? a : b);

      await _client.from('user_photos').insert({
        'user_id': userId,
        'photo_url': photoUrl,
        'is_primary': isPrimary,
        'display_order': maxOrder + 1,
        'photo_type': 'profile',
      });

      // If primary, update profile photo_url
      if (isPrimary) {
        await updateProfile(userId, {'photo_url': photoUrl});
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Delete user photo
  Future<bool> deleteUserPhoto(String photoId) async {
    try {
      await _client.from('user_photos').delete().eq('id', photoId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Subscribe to profile changes
  RealtimeChannel subscribeToProfile(
    String userId,
    void Function(UserModel profile) onUpdate,
  ) {
    return _client.channel('profile:$userId').onPostgresChanges(
      event: PostgresChangeEvent.update,
      schema: 'public',
      table: 'profiles',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'user_id',
        value: userId,
      ),
      callback: (payload) {
        final model = _mapToUserModel(payload.newRecord);
        if (model != null) {
          onUpdate(model);
        }
      },
    ).subscribe();
  }

  /// Map database response to UserModel
  UserModel? _mapToUserModel(Map<String, dynamic> json) {
    try {
      return UserModel(
        id: json['id'],
        userId: json['user_id'],
        fullName: json['full_name'],
        age: json['age'],
        gender: json['gender'],
        country: json['country'],
        state: json['state'],
        bio: json['bio'],
        photoUrl: json['photo_url'],
        interests: (json['interests'] as List?)?.cast<String>() ?? [],
        occupation: json['occupation'],
        educationLevel: json['education_level'],
        religion: json['religion'],
        maritalStatus: json['marital_status'],
        heightCm: json['height_cm'],
        bodyType: json['body_type'],
        preferredLanguage: json['preferred_language'],
        primaryLanguage: json['primary_language'],
        isVerified: json['is_verified'] ?? false,
        approvalStatus: json['approval_status'] ?? 'pending',
        accountStatus: json['account_status'] ?? 'active',
        createdAt: json['created_at'] != null
            ? DateTime.parse(json['created_at'])
            : null,
        updatedAt: json['updated_at'] != null
            ? DateTime.parse(json['updated_at'])
            : null,
      );
    } catch (e) {
      return null;
    }
  }
}
