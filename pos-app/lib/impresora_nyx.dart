import 'package:flutter/services.dart';

/// Impresora «Nyx» (servicio net.nyx.printerservice): Symcode MJ-Q50 (fabricante NB55), T2 Pro, T2 Plus.
/// Papel de 58 mm (384 puntos). Mismo ticket que el Senraise, con los datos de `datosTicket` (web).
/// Arma la lista de pasos y la imprime el código nativo (android-extra/MainActivity.kt, «imprimirNyx»),
/// que habla con el servicio por Binder (sin plugin: nyx_printer_v2 1.2.2 no compila).
class ImpresoraNyx {
  static const _canal = MethodChannel('faltas/impresora');
  static const _izq = 0;
  static const _centro = 1;

  Future<void> imprimir(Map<String, dynamic> t) async {
    final articulos = (t['articulos'] as List?)?.map((e) => '$e').toList() ?? <String>[];
    final qr = ((t['qrTam'] as num?)?.toInt() ?? 6).clamp(3, 7).toInt() * 50; // 6 → 300 de 384 puntos
    final pasos = <Map<String, dynamic>>[];
    void texto(String s, {int tam = 24, bool negrita = false, int alinear = _izq}) =>
        pasos.add({'tipo': 'texto', 'texto': _ajustar(s, tam), 'tam': tam, 'negrita': negrita, 'alinear': alinear});
    void campo(String label, String valor) {
      texto(label, tam: 20, negrita: true);
      texto(valor, tam: 24, negrita: true);
    }

    if (t['sinLogo'] != true) {
      try {
        final logo = await rootBundle.load('assets/logo_ticket.png');
        pasos.add({'tipo': 'imagen', 'png': logo.buffer.asUint8List(), 'ancho': 260, 'alinear': _centro});
      } catch (_) {/* sin logo */}
    }
    texto('MUNICIPALIDAD DE\nMALVINAS ARGENTINAS', negrita: true, alinear: _centro);
    texto('Dirección de Faltas', tam: 22, alinear: _centro);
    texto('-' * 16, tam: 22, alinear: _centro);
    texto('${t['titulo'] ?? 'ACTA'}', negrita: true, alinear: _centro);
    texto('${t['numero'] ?? '-'}', tam: 40, negrita: true, alinear: _centro);
    campo('FECHA Y HORA', '${t['fecha'] ?? '-'}');
    campo('LUGAR', '${t['lugar'] ?? '-'}');
    if ('${t['dominio'] ?? ''}'.isNotEmpty) campo('DOMINIO', '${t['dominio']}');
    texto('DISPOSICIÓN LEGAL INFRINGIDA', tam: 20, negrita: true);
    for (final a in (articulos.isEmpty ? ['-'] : articulos)) {
      texto('• $a', tam: 22, negrita: true);
    }
    campo('REPARTICIÓN', '${t['reparticion'] ?? '-'}');
    texto('-' * 16, tam: 22, alinear: _centro);
    texto('IMPORTANTE: no debe abonar monto de dinero alguno a la autoridad que confeccionó la presente acta.', tam: 20, negrita: true, alinear: _centro);
    if ('${t['url'] ?? ''}'.isNotEmpty) pasos.add({'tipo': 'qr', 'texto': '${t['url']}', 'lado': qr, 'alinear': _centro});
    texto('Escanee para ver el acta digital', tam: 20, negrita: true, alinear: _centro);
    if ('${t['codigo'] ?? ''}'.isNotEmpty) texto('Código: ${t['codigo']}', tam: 20, alinear: _centro);
    pasos.add({'tipo': 'avanzar', 'px': 100}); // margen para cortar el papel

    try {
      await _canal.invokeMethod('imprimirNyx', {'pasos': pasos});
    } on PlatformException catch (e) {
      throw Exception(e.message ?? 'No se pudo imprimir con la impresora del equipo');
    }
  }

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
