import 'package:flutter/material.dart';

/// Painter personalizado que renderiza un código QR estilizado con estética Atelier
class AtelierQRCodePainter extends CustomPainter {
  final String data;
  final Color primaryColor;
  final Color backgroundColor;

  AtelierQRCodePainter({
    required this.data,
    this.primaryColor = Colors.black,
    this.backgroundColor = Colors.white,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = backgroundColor;
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final modulePaint = Paint()..color = primaryColor;
    const int matrixSize = 25;
    final double moduleSize = size.width / matrixSize;

    void drawModule(int r, int c) {
      canvas.drawRect(
        Rect.fromLTWH(c * moduleSize, r * moduleSize, moduleSize, moduleSize),
        modulePaint,
      );
    }

    void drawFinderPattern(int startRow, int startCol) {
      for (int r = 0; r < 7; r++) {
        for (int c = 0; c < 7; c++) {
          if (r == 0 || r == 6 || c == 0 || c == 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            drawModule(startRow + r, startCol + c);
          }
        }
      }
    }

    // Dibujar 3 Finder Patterns (esquinas)
    drawFinderPattern(0, 0);
    drawFinderPattern(0, matrixSize - 7);
    drawFinderPattern(matrixSize - 7, 0);

    // Dibujar Timing Patterns
    for (int i = 8; i < matrixSize - 8; i++) {
      if (i % 2 == 0) {
        drawModule(6, i);
        drawModule(i, 6);
      }
    }

    // Dibujar Alignment Pattern en esquina inferior derecha
    const alignRow = matrixSize - 9;
    const alignCol = matrixSize - 9;
    for (int r = 0; r < 5; r++) {
      for (int c = 0; c < 5; c++) {
        if (r == 0 || r == 4 || c == 0 || c == 4 || (r == 2 && c == 2)) {
          drawModule(alignRow + r, alignCol + c);
        }
      }
    }

    // Matriz de datos pseudo-determinística a partir del hash de la transacción
    int hash = 0;
    for (int i = 0; i < data.length; i++) {
      hash = (hash * 31 + data.codeUnitAt(i)) & 0x7FFFFFFF;
    }

    for (int r = 0; r < matrixSize; r++) {
      for (int c = 0; c < matrixSize; c++) {
        // Omitir zonas de finder patterns
        if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) {
          continue;
        }
        // Omitir timing
        if (r == 6 || c == 6) continue;
        // Omitir alignment
        if (r >= alignRow && r < alignRow + 5 && c >= alignCol && c < alignCol + 5) continue;
        // Omitir zona central de logo
        if (r >= 10 && r <= 14 && c >= 10 && c <= 14) continue;

        final val = ((r * 13 + c * 37 + hash) ^ (r * c + 7)) % 100;
        if (val < 52) {
          drawModule(r, c);
        }
      }
    }

    // Emblema central dorado
    final centerRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: moduleSize * 5.2,
      height: moduleSize * 5.2,
    );
    canvas.drawRRect(RRect.fromRectAndRadius(centerRect, const Radius.circular(4)), Paint()..color = Colors.white);
    canvas.drawRRect(
      RRect.fromRectAndRadius(centerRect, const Radius.circular(4)),
      Paint()
        ..color = const Color(0xFFD4AF37)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );

    final emblemPath = Path();
    final cx = size.width / 2;
    final cy = size.height / 2;
    final halfW = moduleSize * 1.5;
    emblemPath.moveTo(cx, cy - halfW);
    emblemPath.lineTo(cx + halfW, cy);
    emblemPath.lineTo(cx, cy + halfW);
    emblemPath.lineTo(cx - halfW, cy);
    emblemPath.close();
    canvas.drawPath(emblemPath, Paint()..color = const Color(0xFFD4AF37));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
