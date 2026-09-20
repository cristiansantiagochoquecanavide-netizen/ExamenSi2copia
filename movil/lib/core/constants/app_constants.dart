import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'FashionStore';
  static const String appTagline = 'ATELIER NOIR';
  static const String tokenKey = 'fashionstore_jwt_token';

  static const String prodApiUrl = 'https://fashionstore-backend-48fs.onrender.com/api/v1';
  static const String localAndroidApiUrl = 'http://10.0.2.2:8000/api/v1';
  static const String localDefaultApiUrl = 'http://localhost:8000/api/v1';

  /// Determina automáticamente el endpoint:
  /// 1. Si se pasa `--dart-define=API_URL=...` tiene prioridad absoluta.
  /// 2. En Release (`flutter build apk`, descargada): Producción en Render.
  /// 3. En Debug (desarrollo local): Docker local (`10.0.2.2` en Android, `localhost` en web/PC).
  static String get apiBaseUrl {
    const envUrl = String.fromEnvironment('API_URL');
    if (envUrl.isNotEmpty) return envUrl;

    if (kReleaseMode) {
      return prodApiUrl;
    }

    if (kIsWeb) {
      return localDefaultApiUrl;
    }
    if (Platform.isAndroid) {
      return localAndroidApiUrl;
    }
    return localDefaultApiUrl;
  }
}
