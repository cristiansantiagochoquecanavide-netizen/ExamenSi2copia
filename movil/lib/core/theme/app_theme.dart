import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // FashionStore Haute Couture Light Minimalist Palette
  static const Color canvasColor = Color(0xFFFFFFFF);
  static const Color surfaceColor = Color(0xFFFFFFFF);
  static const Color surfaceContainer = Color(0xFFF9FAFB);
  static const Color surfaceDim = Color(0xFFF3F4F6);
  static const Color primaryColor = Color(0xFF000000);
  static const Color onSurfaceColor = Color(0xFF111111);
  static const Color mutedColor = Color(0xFF6B7280);
  static const Color subtleColor = Color(0xFF9CA3AF);
  static const Color goldAccent = Color(0xFFC5A880); // Champagne Gold (matching web)
  static const Color borderColor = Color(0x1A000000); // 10% black hairline (#E5E7EB)

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: canvasColor,
      primaryColor: primaryColor,
      cardColor: surfaceColor,
      dividerColor: borderColor,
      
      // 0px Border Radius estricto (Sharp luxury corners)
      cardTheme: const CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
          side: BorderSide(color: Color(0xFFE5E7EB), width: 1),
        ),
        color: surfaceColor,
        elevation: 0,
      ),

      appBarTheme: AppBarTheme(
        backgroundColor: canvasColor,
        foregroundColor: primaryColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: GoogleFonts.bodoniModa(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: 2.0,
          color: primaryColor,
        ),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: canvasColor,
        selectedItemColor: primaryColor,
        unselectedItemColor: mutedColor,
        elevation: 0,
        type: BottomNavigationBarType.fixed,
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.zero,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: const BorderSide(color: primaryColor, width: 1),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.zero,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        ),
      ),

      textTheme: TextTheme(
        displayLarge: GoogleFonts.bodoniModa(
          fontSize: 28,
          fontWeight: FontWeight.w600,
          color: primaryColor,
          letterSpacing: -0.5,
        ),
        displayMedium: GoogleFonts.bodoniModa(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: primaryColor,
          letterSpacing: 0.5,
        ),
        titleMedium: GoogleFonts.bodoniModa(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: primaryColor,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 15,
          fontWeight: FontWeight.w400,
          color: onSurfaceColor,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.w400,
          color: onSurfaceColor,
        ),
        labelSmall: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.5,
          color: primaryColor,
        ),
      ),
    );
  }

  // Alias para mantener compatibilidad con cualquier invocación existente
  static ThemeData get darkTheme => lightTheme;
}
