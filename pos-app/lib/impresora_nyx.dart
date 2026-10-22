import 'package:flutter/services.dart' show rootBundle;
import 'package:nyx_printer_v2/nyx_printer.dart';

/// Impresora «Nyx» (servicio net.nyx.printerservice / com.incar.printerservice): Symcode MJ-Q50 (fabricante NB55),
/// T2 Pro, T2 Plus. Papel de 58 mm (384 puntos). Mismo ticket que el Senraise, con los datos de `datosTicket` (web).
/// Cada llamada del plugin devuelve 0 si salió bien.
class ImpresoraNyx {
  final NyxPrinter _p = NyxPrinter();

  Future<void> _ok(Future<int?> llamada, String que) async {
    final r = await llamada;
    if (r != null && r != 0) throw Exception('La impresora Nyx devolvió el error $r al imprimir $que');
  }

  /// El servicio tarda un instante en conectarse al abrir la app: hasta 3 intentos antes de imprimir.
  Future<void> _esperarServicio() async {
    Object? ultimo;
    for (var i = 0; i < 3; i++) {
      try {
        final r = await _p.getVersion();
        if (r == null || r == 0) return;
        ultimo = 'código $r';
      } catch (e) {
        ultimo = e;
      }
      await Future<void>.delayed(const Duration(milliseconds: 700));
    }
    throw Exception('No responde el servicio de impresión del equipo ($ultimo)');
  }

  Future<void> imprimir(Map<String, dynamic> t) async {
    final articulos = (t['articulos'] as List?)?.map((e) => '$e').toList() ?? <String>[];
    final qr = ((t['qrTam'] as num?)?.toInt() ?? 6).clamp(3, 12).toInt() * 50; // 6 → 300 puntos de 384
    await _esperarServicio();

    if (t['sinLogo'] != true) {
      try {
        final logo = await rootBundle.load('assets/logo_ticket.png');
        await _ok(_p.printImage(logo.buffer.asUint8List()), 'el logo');
      } catch (_) {/* sin logo si la impresora no acepta la imagen */}
    }
    await _texto('MUNICIPALIDAD DE\nMALVINAS ARGENTINAS', tam: 24, negrita: true, centro: true);
    await _texto('Dirección de Faltas', tam: 22, centro: true);
    await _texto('-' * 16, tam: 22, centro: true);
    await _texto('${t['titulo'] ?? 'ACTA'}', tam: 24, negrita: true, centro: true);
    await _texto('${t['numero'] ?? '-'}', tam: 40, negrita: true, centro: true);

    Future<void> campo(String label, String valor) async {
      await _texto(label, tam: 20, negrita: true);
      await _texto(valor, tam: 24, negrita: true);
    }

    await campo('FECHA Y HORA', '${t['fecha'] ?? '-'}');
    await campo('LUGAR', '${t['lugar'] ?? '-'}');
    if ('${t['dominio'] ?? ''}'.isNotEmpty) await campo('DOMINIO', '${t['dominio']}');
    await _texto('DISPOSICIÓN LEGAL INFRINGIDA', tam: 20, negrita: true);
    for (final a in (articulos.isEmpty ? ['-'] : articulos)) {
      await _texto('• $a', tam: 22, negrita: true);
    }
    await campo('REPARTICIÓN', '${t['reparticion'] ?? '-'}');

    await _texto('-' * 16, tam: 22, centro: true);
    await _texto('IMPORTANTE: no debe abonar monto de dinero alguno a la autoridad que confeccionó la presente acta.', tam: 20, negrita: true, centro: true);
    if ('${t['url'] ?? ''}'.isNotEmpty) await _ok(_p.printQrCode('${t['url']}', width: qr, height: qr), 'el QR');
    await _texto('Escanee para ver el acta digital', tam: 20, negrita: true, centro: true);
    if ('${t['codigo'] ?? ''}'.isNotEmpty) await _texto('Código: ${t['codigo']}', tam: 20, centro: true);
    await _texto('\n\n\n', tam: 20); // margen para cortar el papel
  }

  Future<void> _texto(String s, {int tam = 24, bool negrita = false, bool centro = false}) => _ok(
        _p.printText(
          _ajustar(s, tam),
          textFormat: NyxTextFormat(
            textSize: tam,
            style: negrita ? NyxFontStyle.bold : NyxFontStyle.normal,
            align: centro ? NyxAlign.center : NyxAlign.left,
          ),
        ),
        'el texto',
      );

  /// Corta en palabras completas (384 puntos de ancho; cada carácter ocupa ~0,6 × tamaño).
  static String _ajustar(String s, int tam) {
    final max = (384 / (tam * 0.6)).floor();
    return s.split('\n').map((linea) {
      final out = <String>[];
      var actual = '';
      for (final palabra in linea.split(' ')) {
        if (actual.isEmpty) {
          actual = palabra;
        } else if (actual.length + 1 + palabra.length <= max) {
          actual = '$actual $palabra';
        } else {
          out.add(actual);
          actual = palabra;
        }
        while (actual.length > max) {
          out.add(actual.substring(0, max));
          actual = actual.substring(max);
        }
      }
      out.add(actual);
      return out.join('\n');
    }).join('\n');
  }
}
