import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Auth Service Provider
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

/// Current User Provider
final currentUserProvider = StreamProvider<User?>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange.map((event) => event.session?.user);
});

/// Auth User Model
class AuthUser {
  final String id;
  final String? email;

  AuthUser({required this.id, this.email});

  factory AuthUser.fromSupabaseUser(User user) {
    return AuthUser(id: user.id, email: user.email);
  }
}

/// Auth Response Model
class AuthResponseModel {
  final bool success;
  final AuthUser? user;
  final String? error;

  AuthResponseModel({required this.success, this.user, this.error});
}

/// Authentication Service - Synced with React auth.service.ts
class AuthService {
  final SupabaseClient _client = Supabase.instance.client;

  User? get currentUser => _client.auth.currentUser;
  Session? get currentSession => _client.auth.currentSession;

  Future<bool> isLoggedIn() async {
    return _client.auth.currentSession != null;
  }

  /// Sign in with email and password
  Future<AuthResponseModel> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        return AuthResponseModel(
          success: true,
          user: AuthUser.fromSupabaseUser(response.user!),
        );
      }
      return AuthResponseModel(success: false, error: 'Sign in failed.');
    } on AuthException catch (e) {
      return AuthResponseModel(success: false, error: e.message);
    } catch (e) {
      return AuthResponseModel(success: false, error: 'An unexpected error occurred');
    }
  }

  /// Sign up with email and password
  Future<AuthResponseModel> signUp({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signUp(email: email, password: password);

      if (response.user != null) {
        return AuthResponseModel(
          success: true,
          user: AuthUser.fromSupabaseUser(response.user!),
        );
      }
      return AuthResponseModel(success: false, error: 'Sign up failed.');
    } on AuthException catch (e) {
      return AuthResponseModel(success: false, error: e.message);
    } catch (e) {
      return AuthResponseModel(success: false, error: 'An unexpected error occurred');
    }
  }

  /// Sign out - sets offline status and ends active chats (synced with React)
  Future<void> signOut() async {
    try {
      final user = _client.auth.currentUser;
      if (user != null) {
        final now = DateTime.now().toIso8601String();
        // Set user offline
        await _client.from('user_status').update({
          'is_online': false,
          'last_seen': now,
          'updated_at': now,
        }).eq('user_id', user.id);

        // End active chat sessions
        await _client
            .from('active_chat_sessions')
            .update({
              'status': 'ended',
              'ended_at': now,
              'end_reason': 'user_logout',
            })
            .or('man_user_id.eq.${user.id},woman_user_id.eq.${user.id}')
            .eq('status', 'active');
      }
    } catch (_) {}

    await _client.auth.signOut();
  }

  Future<bool> sendPasswordResetEmail(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(email);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updatePassword(String newPassword) async {
    try {
      await _client.auth.updateUser(UserAttributes(password: newPassword));
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> hasRole(String role) async {
    final userId = currentUser?.id;
    if (userId == null) return false;
    try {
      final response = await _client
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', role)
          .maybeSingle();
      return response != null;
    } catch (_) {
      return false;
    }
  }

  Future<bool> isAdmin() async => hasRole('admin');

  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;
}
