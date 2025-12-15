/// Supabase Configuration
/// 
/// Contains all Supabase-related configuration values.
/// Update these values with your actual Supabase project credentials.
class SupabaseConfig {
  SupabaseConfig._();

  /// Supabase Project URL
  static const String url = 'https://tvneohngeracipjajzos.supabase.co';

  /// Supabase Anonymous Key (safe to expose in client)
  static const String anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2bmVvaG5nZXJhY2lwamFqem9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODgxNDEsImV4cCI6MjA4MDU2NDE0MX0.3YgATF-HMODDQe5iJbpiUuL2SlycM5Z5XmAdKbnjg_A';

  /// Storage bucket names
  static const String profilePhotosBucket = 'profile-photos';
  static const String voiceMessagesBucket = 'voice-messages';
  static const String legalDocumentsBucket = 'legal-documents';

  /// Realtime channels
  static const String chatChannel = 'chat_messages';
  static const String presenceChannel = 'user_presence';
  static const String notificationsChannel = 'notifications';
}
