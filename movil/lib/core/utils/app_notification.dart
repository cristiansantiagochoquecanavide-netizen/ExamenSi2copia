import 'package:flutter/material.dart';
import '../routes/app_router.dart';
import '../theme/app_theme.dart';

final GlobalKey<ScaffoldMessengerState> rootScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

class AppNotification {
  static void showSuccess(
    String message, {
    String? title,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(seconds: 4),
  }) {
    final state = rootScaffoldMessengerKey.currentState;
    if (state == null) return;

    state.clearSnackBars();

    state.showSnackBar(
      SnackBar(
        duration: duration,
        backgroundColor: Colors.black,
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title != null) ...[
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 3),
            ],
            Text(
              message,
              style: TextStyle(
                color: title != null ? Colors.white70 : Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        action: actionLabel != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: AppTheme.goldAccent,
                onPressed: () {
                  state.hideCurrentSnackBar();
                  if (onAction != null) {
                    onAction();
                  } else {
                    appRouter.go('/ventas');
                  }
                },
              )
            : null,
      ),
    );

    // Defensive guarantee to force dismissal after duration
    Future.delayed(duration + const Duration(milliseconds: 300), () {
      rootScaffoldMessengerKey.currentState?.hideCurrentSnackBar();
    });
  }

  static void showError(
    String message, {
    String? title,
    Duration duration = const Duration(seconds: 4),
  }) {
    final state = rootScaffoldMessengerKey.currentState;
    if (state == null) return;

    state.clearSnackBars();

    state.showSnackBar(
      SnackBar(
        duration: duration,
        backgroundColor: const Color(0xFF991B1B),
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title != null) ...[
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 3),
            ],
            Text(
              message,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
