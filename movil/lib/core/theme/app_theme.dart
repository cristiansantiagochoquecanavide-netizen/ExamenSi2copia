import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Atelier Noir Colors
  static const Color canvasColor = Color(0xFF0E0E0E);
  static const Color surfaceColor = Color(0xFF131313);
  static const Color surfaceContainer = Color(0xFF201F1F);
  static const Color primaryColor = Color(0xFFFFFFFF);
  static const Color onSurfaceColor = Color(0xFFE5E2E1);
  static const Color mutedColor = Color(0xFF988E90);
  static const Color goldAccent = Color(0xFFE7C35A);
  static const Color borderColor = Color(0x26FFFFFF); // 15% opacity white hairline

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: canvasColor,
      primaryColor: primaryColor,
      cardColor: surfaceColor,
      dividerColor: borderColor,
      
      // 0px Border Radius estricto (Sharp corners)
      cardTheme: const CardTheme(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        color: surfaceColor,
        elevation: 0,
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.black,
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
          side: const BorderSide(color: borderColor, width: 1),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.zero,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        ),
      ),

      textTheme: TextTheme(
        displayLarge: GoogleFonts.bodoniModa(
          fontSize: 32,
          fontWeight: FontWeight.w400,
          color: primaryColor,
          letterSpacing: -0.5,
        ),
        displayMedium: GoogleFonts.bodoniModa(
          fontSize: 24,
          fontWeight: FontWeight.w400,
          color: primaryColor,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w300,
          color: onSurfaceColor,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w300,
          color: onSurfaceColor,
        ),
        labelSmall: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          letterSpacing: 1.5,
          color: goldAccent,
        ),
      ),
    );
  }
}
