import 'package:flutter/material.dart';

/// App Color Palette
/// 
/// Semantic color tokens matching the web app design system.
/// All colors use HSL values converted to Flutter Color format.
class AppColors {
  AppColors._();

  // ============= Light Theme Colors =============
  
  /// Background color
  static const Color background = Color(0xFFFFFFFF);
  
  /// Foreground/text color
  static const Color foreground = Color(0xFF0F172A);
  
  /// Card background
  static const Color card = Color(0xFFFFFFFF);
  static const Color cardForeground = Color(0xFF0F172A);
  
  /// Popover background
  static const Color popover = Color(0xFFFFFFFF);
  static const Color popoverForeground = Color(0xFF0F172A);
  
  /// Primary brand color (pink/rose)
  static const Color primary = Color(0xFFEC4899);
  static const Color primaryForeground = Color(0xFFFFFFFF);
  
  /// Secondary color
  static const Color secondary = Color(0xFFF1F5F9);
  static const Color secondaryForeground = Color(0xFF0F172A);
  
  /// Muted colors for subtle elements
  static const Color muted = Color(0xFFF1F5F9);
  static const Color mutedForeground = Color(0xFF64748B);
  
  /// Accent color
  static const Color accent = Color(0xFFF1F5F9);
  static const Color accentForeground = Color(0xFF0F172A);
  
  /// Destructive/error color
  static const Color destructive = Color(0xFFEF4444);
  static const Color destructiveForeground = Color(0xFFFFFFFF);
  
  /// Border color
  static const Color border = Color(0xFFE2E8F0);
  
  /// Input border color
  static const Color input = Color(0xFFE2E8F0);
  
  /// Focus ring color
  static const Color ring = Color(0xFFEC4899);

  // ============= Dark Theme Colors =============
  
  static const Color backgroundDark = Color(0xFF0F172A);
  static const Color foregroundDark = Color(0xFFF8FAFC);
  static const Color cardDark = Color(0xFF1E293B);
  static const Color cardForegroundDark = Color(0xFFF8FAFC);
  static const Color primaryDark = Color(0xFFF472B6);
  static const Color primaryForegroundDark = Color(0xFF0F172A);
  static const Color secondaryDark = Color(0xFF1E293B);
  static const Color secondaryForegroundDark = Color(0xFFF8FAFC);
  static const Color mutedDark = Color(0xFF1E293B);
  static const Color mutedForegroundDark = Color(0xFF94A3B8);
  static const Color accentDark = Color(0xFF1E293B);
  static const Color accentForegroundDark = Color(0xFFF8FAFC);
  static const Color destructiveDark = Color(0xFFDC2626);
  static const Color destructiveForegroundDark = Color(0xFFF8FAFC);
  static const Color borderDark = Color(0xFF334155);
  static const Color inputDark = Color(0xFF334155);
  static const Color ringDark = Color(0xFFF472B6);

  // ============= Semantic Colors =============
  
  /// Success color
  static const Color success = Color(0xFF22C55E);
  static const Color successForeground = Color(0xFFFFFFFF);
  
  /// Warning color
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningForeground = Color(0xFFFFFFFF);
  
  /// Info color
  static const Color info = Color(0xFF3B82F6);
  static const Color infoForeground = Color(0xFFFFFFFF);

  // ============= Status Colors =============
  
  /// Online status
  static const Color online = Color(0xFF22C55E);
  
  /// Offline status
  static const Color offline = Color(0xFF94A3B8);
  
  /// Away status
  static const Color away = Color(0xFFF59E0B);
  
  /// Busy status
  static const Color busy = Color(0xFFEF4444);

  // ============= Gender Colors =============
  
  /// Male color
  static const Color male = Color(0xFF3B82F6);
  
  /// Female color
  static const Color female = Color(0xFFEC4899);

  // ============= Gradients =============
  
  /// Primary gradient
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFEC4899), Color(0xFFF472B6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  /// Aurora gradient (animated background)
  static const LinearGradient auroraGradient = LinearGradient(
    colors: [
      Color(0xFFEC4899),
      Color(0xFF8B5CF6),
      Color(0xFF3B82F6),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
