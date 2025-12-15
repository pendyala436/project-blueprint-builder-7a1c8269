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
    return AuthUser(
      id: user.id,
      email: user.email,
    );
  }
}

/// Auth Response Model
class AuthResponse {
  final bool success;
  final AuthUser? user;
  final String? error;

  AuthResponse({
    required this.success,
    this.user,
    this.error,
  });
}

/// Authentication Service
/// 
/// Handles all authentication-related operations.
class AuthService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Get current user
  User? get currentUser => _client.auth.currentUser;

  /// Get current session
  Session? get currentSession => _client.auth.currentSession;

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return _client.auth.currentSession != null;
  }

  /// Sign in with email and password
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        return AuthResponse(
          success: true,
          user: AuthUser.fromSupabaseUser(response.user!),
        );
      }

      return AuthResponse(
        success: false,
        error: 'Sign in failed. Please try again.',
      );
    } on AuthException catch (e) {
      return AuthResponse(
        success: false,
        error: e.message,
      );
    } catch (e) {
      return AuthResponse(
        success: false,
        error: 'An unexpected error occurred',
      );
    }
  }

  /// Sign up with email and password
  Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signUp(
        email: email,
        password: password,
      );

      if (response.user != null) {
        return AuthResponse(
          success: true,
          user: AuthUser.fromSupabaseUser(response.user!),
        );
      }

      return AuthResponse(
        success: false,
        error: 'Sign up failed. Please try again.',
      );
    } on AuthException catch (e) {
      return AuthResponse(
        success: false,
        error: e.message,
      );
    } catch (e) {
      return AuthResponse(
        success: false,
        error: 'An unexpected error occurred',
      );
    }
  }

  /// Sign out
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  /// Send password reset email
  Future<bool> sendPasswordResetEmail(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(email);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Update password
  Future<bool> updatePassword(String newPassword) async {
    try {
      await _client.auth.updateUser(
        UserAttributes(password: newPassword),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Check if user has role
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
    } catch (e) {
      return false;
    }
  }

  /// Check if user is admin
  Future<bool> isAdmin() async {
    return hasRole('admin');
  }

  /// Listen to auth state changes
  Stream<AuthState> get onAuthStateChange {
    return _client.auth.onAuthStateChange;
  }
}
