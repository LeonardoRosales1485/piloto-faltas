import 'package:flutter/services.dart' show rootBundle;
import 'package:senraise_printer/senraise_printer.dart';

/// Imprime el ticket del acta con la impresora térmica del Senraise H10S (papel de 80 mm).
/// Recibe los mismos datos que arma la web (`datosTicket` en src/lib/print.ts).
class ImpresoraTicket {
  final SenraisePrinter _p = SenraisePrinter();

  // Alineación del SDK: 0 izquierda, 1 centro, 2 derecha.
  static const _izq = 0;
  static const _centro = 1;

  Future<void> imprimir(Map<String, dynamic> t) async {
    final articulos = (t['articulos'] as List?)?.map((e) => '$e').toList() ?? <String>[];

    await _p.setCode('UTF-8'); // tildes y ñ
    await _p.setDark(3); // más oscuro que el valor de fábrica (ajustar 1–3 según el papel)

    // Encabezado con el logo (PNG blanco y negro, 384 px de ancho, incluido en la app)
    await _p.setAlignment(_centro);
    try {
      final logo = await rootBundle.load('assets/logo_ticket.png');
      await _p.printPic(logo.buffer.asUint8List());
      await _p.nextLine(1);
    } catch (_) {/* sin logo si la impresora no acepta la imagen */}
    await _texto('MUNICIPALIDAD DE\nMALVINAS ARGENTINAS', tam: 28, negrita: true);
    await _texto('Dirección de Faltas', tam: 24);
    await _separador();
    await _texto('${t['titulo'] ?? 'ACTA'}', tam: 28, negrita: true);
    await _texto('${t['numero'] ?? '-'}', tam: 48, negrita: true);
    await _p.nextLine(1);

    // Datos
    await _p.setAlignment(_izq);
    await _campo('FECHA Y HORA', '${t['fecha'] ?? '-'}');
    await _campo('LUGAR', '${t['lugar'] ?? '-'}');
    if ('${t['dominio'] ?? ''}'.isNotEmpty) await _campo('DOMINIO', '${t['dominio']}');
    await _texto('${t['tituloArticulos'] ?? 'DISPOSICIÓN LEGAL INFRINGIDA'}', tam: 22, negrita: true);
    for (final a in (articulos.isEmpty ? ['-'] : articulos)) {
      await _texto('• $a', tam: 26, negrita: true);
    }
    await _p.nextLine(1);
    await _campo('REPARTICIÓN', '${t['reparticion'] ?? '-'}');

    // Aviso
    await _separador();
    await _p.setAlignment(_centro);
    // Recuadro destacado: lo manda la web (ticket de retención); sin dato, el aviso de no abonar a la autoridad.
    final aviso = t.containsKey('aviso') ? '${t['aviso'] ?? ''}' : 'IMPORTANTE: no debe abonar monto de dinero alguno a la autoridad que confeccionó la presente acta.';
    if (aviso.isNotEmpty) await _texto(aviso, tam: 24, negrita: true);
    // Leyendas legales (boleta de inculpado, advertencia de compactación): las arma la web según el acta.
    for (final l in ((t['leyendas'] as List?)?.map((e) => '$e') ?? const <String>[])) {
      await _p.nextLine(1);
      await _texto(l, tam: 22);
    }

    // QR nativo (nítido): módulo 8, corrección de errores nivel 2
    await _p.nextLine(1);
    await _p.printQRCode('${t['url']}', 8, 2);
    await _p.nextLine(1);
    await _texto('Escanee para ver el acta digital', tam: 24, negrita: true);
    if ('${t['codigo'] ?? ''}'.isNotEmpty) await _texto('Código: ${t['codigo']}', tam: 22);

    // Avance para cortar el papel sin perder el final del ticket
    await _p.nextLine(4);
  }

  Future<void> _texto(String s, {double tam = 24, bool negrita = false}) async {
    await _p.setTextSize(tam);
    await _p.setTextBold(negrita);
    await _p.printText('${_ajustar(s, tam)}\n');
  }

  /// Caracteres por renglón según el tamaño (576 puntos de ancho; cada carácter ocupa ~0,75 × tamaño).
  static int _ancho(double tam) => (576 / (tam * 0.75)).floor();

  /// Corta en palabras completas (la impresora corta a mitad de palabra).
  static String _ajustar(String s, double tam) {
    final max = _ancho(tam);
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
        while (actual.length > max) { out.add(actual.substring(0, max)); actual = actual.substring(max); }
      }
      out.add(actual);
      return out.join('\n');
    }).join('\n');
  }

  Future<void> _campo(String label, String valor) async {
    await _texto(label, tam: 22, negrita: true);
    await _texto(valor, tam: 28, negrita: true);
  }

  Future<void> _separador() async {
    // Un solo renglón, corto, centrado
    await _p.setAlignment(_centro);
    await _p.setTextSize(24);
    await _p.setTextBold(false);
    await _p.printText('${'-' * 16}\n');
  }
}
