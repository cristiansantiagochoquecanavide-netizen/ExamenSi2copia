import 'package:flutter/material.dart';
import '../routes/app_router.dart';
import '../theme/app_theme.dart';

final GlobalKey<ScaffoldMessengerState> rootScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

class AppNotification {
  static void showSuccess(
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(seconds: 3),
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
        content: Text(
          message,
          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
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
}
