import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/models/usuario_model.dart';

class AuthRepository {
  final ApiClient _apiClient;
  static const String _tokenKey = AppConstants.tokenKey;
  static const String _userKey = 'fashionstore_current_user';

  AuthRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<TokenResponseModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '/usuarios/auth/login',
        data: {
          'email': email.trim(),
          'password': password.trim(),
        },
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final tokenResponse = TokenResponseModel.fromJson(data);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, tokenResponse.accessToken);
        await prefs.setString(_userKey, jsonEncode(tokenResponse.usuario.toJson()));

        return tokenResponse;
      } else {
        throw Exception('Respuesta no esperada del servidor (${response.statusCode})');
      }
    } on DioException catch (e) {
      if (e.response != null && e.response?.data != null) {
        final data = e.response?.data;
        if (data is Map<String, dynamic> && data.containsKey('detail')) {
          throw Exception(data['detail']);
        }
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw Exception('No se pudo conectar con el servidor backend (FastAPI en ${AppConstants.apiBaseUrl}).');
      }
      throw Exception('Error al iniciar sesión: ${e.message}');
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }

  Future<UsuarioModel?> getCurrentUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userStr = prefs.getString(_userKey);
      if (userStr != null && userStr.isNotEmpty) {
        final json = jsonDecode(userStr) as Map<String, dynamic>;
        return UsuarioModel.fromJson(json);
      }
    } catch (_) {}
    return null;
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token != null) {
      try {
        await _apiClient.dio.post(
          '/usuarios/auth/logout',
          options: Options(
            headers: {'Authorization': 'Bearer $token'},
          ),
        );
      } catch (_) {}
    }
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}
