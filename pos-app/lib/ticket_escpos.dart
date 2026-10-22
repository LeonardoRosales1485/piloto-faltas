import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/services.dart' show rootBundle;

/// Ticket del acta en comandos ESC/POS (el «idioma» estándar de las impresoras térmicas).
/// Lo usan las impresoras que no son Senraise (ej. Symcode MJ-Q50, impresora interna por Bluetooth).
/// Recibe los mismos datos que arma la web (`datosTicket` en src/lib/print.ts).
///
/// Opciones que puede mandar la web (pantalla «Prueba de impresora»):
/// - `columnas`: caracteres por renglón con letra normal (32 en papel de 58 mm, 48 en 80 mm).
/// - `sinAcentos`: si la impresora muestra mal las tildes y la ñ, se imprimen sin ellas.
/// - `qrTam`: tamaño del módulo del QR (1–16; por defecto 6).
/// - `sinLogo`: no imprime el logo.
class TicketEscPos {
  TicketEscPos({this.columnas = 32, this.sinAcentos = false, this.qrTam = 6, this.sinLogo = false});

  final int columnas;
  final bool sinAcentos;
  final int qrTam;
  final bool sinLogo;
  final BytesBuilder _b = BytesBuilder();

  static TicketEscPos desde(Map<String, dynamic> t) => TicketEscPos(
        columnas: (t['columnas'] as num?)?.toInt() ?? 32,
        sinAcentos: t['sinAcentos'] == true,
        qrTam: (t['qrTam'] as num?)?.toInt() ?? 6,
        sinLogo: t['sinLogo'] == true,
      );

  // ----------------------------------------------------------------- comandos
  void _init() => _b.add([0x1B, 0x40, 0x1B, 0x74, 16]); // reiniciar + tabla de caracteres WPC1252 (tildes y ñ)
  void _alinear(int n) => _b.add([0x1B, 0x61, n]); // 0 izquierda, 1 centro, 2 derecha
  void _negrita(bool on) => _b.add([0x1B, 0x45, on ? 1 : 0]);
  void _tam(int ancho, int alto) => _b.add([0x1D, 0x21, ((ancho - 1) << 4) | (alto - 1)]);
  void _avanzar(int lineas) => _b.add([0x1B, 0x64, lineas]);

  static const _reemplazos = {'•': '-', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...', '€': 'E'};
  static const _sinTilde = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N', '°': 'o', 'º': 'o', 'ª': 'a', '¿': '', '¡': '',
  };

  List<int> _codificar(String s) {
    final out = <int>[];
    for (final r in s.runes) {
      var c = String.fromCharCode(r);
      c = _reemplazos[c] ?? c;
      if (sinAcentos) c = _sinTilde[c] ?? c;
      for (final u in c.codeUnits) {
        out.add(u < 256 ? u : 0x3F); // fuera de la tabla: «?»
      }
    }
    return out;
  }

  /// Corta en palabras completas según el ancho disponible para ese tamaño de letra.
  List<String> _renglones(String s, int ancho) {
    final max = (columnas ~/ ancho).clamp(8, 64).toInt();
    final out = <String>[];
    for (final linea in s.split('\n')) {
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
    }
    return out;
  }

  void _texto(String s, {int ancho = 1, int alto = 1, bool negrita = false}) {
    _tam(ancho, alto);
    _negrita(negrita);
    for (final r in _renglones(s, ancho)) {
      _b.add(_codificar(r));
      _b.addByte(0x0A);
    }
    _tam(1, 1);
    _negrita(false);
  }

  void _separador() {
    _alinear(1);
    _texto('-' * (columnas ~/ 2));
  }

  /// QR nativo de la impresora (GS ( k): modelo 2, corrección M.
  void _qr(String datos) {
    final d = _codificar(datos);
    final n = d.length + 3;
    _b.add([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]); // modelo 2
    _b.add([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, qrTam.clamp(1, 16).toInt()]); // tamaño del módulo
    _b.add([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]); // corrección M
    _b.add([0x1D, 0x28, 0x6B, n & 0xFF, (n >> 8) & 0xFF, 0x31, 0x50, 0x30]);
    _b.add(d);
    _b.add([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]); // imprimir
  }

  /// Imagen en blanco y negro (GS v 0) escalada a `ancho` puntos.
  Future<void> _imagen(Uint8List png, int ancho) async {
    final codec = await ui.instantiateImageCodec(png, targetWidth: ancho);
    final img = (await codec.getNextFrame()).image;
    final rgba = (await img.toByteData(format: ui.ImageByteFormat.rawRgba))!;
    final w = img.width, h = img.height, bw = (w + 7) ~/ 8;
    final bits = Uint8List(bw * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        final i = (y * w + x) * 4;
        final lum = (rgba.getUint8(i) * 299 + rgba.getUint8(i + 1) * 587 + rgba.getUint8(i + 2) * 114) ~/ 1000;
        if (rgba.getUint8(i + 3) > 127 && lum < 128) bits[y * bw + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    _b.add([0x1D, 0x76, 0x30, 0x00, bw & 0xFF, (bw >> 8) & 0xFF, h & 0xFF, (h >> 8) & 0xFF]);
    _b.add(bits);
  }

  // ----------------------------------------------------------------- ticket
  Future<Uint8List> armar(Map<String, dynamic> t) async {
    final articulos = (t['articulos'] as List?)?.map((e) => '$e').toList() ?? <String>[];
    final puntos = columnas >= 48 ? 576 : 384; // ancho imprimible: 80 mm = 576, 58 mm = 384
    _init();

    _alinear(1);
    if (!sinLogo) {
      try {
        final logo = await rootBundle.load('assets/logo_ticket.png');
        await _imagen(logo.buffer.asUint8List(), (puntos * 0.6).round());
        _b.addByte(0x0A);
      } catch (_) {/* sin logo si falla la imagen */}
    }
    _texto('MUNICIPALIDAD DE\nMALVINAS ARGENTINAS', negrita: true);
    _texto('Dirección de Faltas');
    _separador();
    _texto('${t['titulo'] ?? 'ACTA'}', negrita: true);
    _texto('${t['numero'] ?? '-'}', ancho: 2, alto: 2, negrita: true);
    _b.addByte(0x0A);

    _alinear(0);
    void campo(String label, String valor) {
      _texto(label, negrita: true);
      _texto(valor);
    }

    campo('FECHA Y HORA', '${t['fecha'] ?? '-'}');
    campo('LUGAR', '${t['lugar'] ?? '-'}');
    if ('${t['dominio'] ?? ''}'.isNotEmpty) campo('DOMINIO', '${t['dominio']}');
    _texto('DISPOSICIÓN LEGAL INFRINGIDA', negrita: true);
    for (final a in (articulos.isEmpty ? ['-'] : articulos)) {
      _texto('- $a');
    }
    campo('REPARTICIÓN', '${t['reparticion'] ?? '-'}');

    _separador();
    _alinear(1);
    _texto('IMPORTANTE: no debe abonar monto de dinero alguno a la autoridad que confeccionó la presente acta.', negrita: true);
    // Leyendas legales (boleta de inculpado, advertencia de compactación): las arma la web según el acta.
    for (final l in ((t['leyendas'] as List?)?.map((e) => '$e') ?? const <String>[])) {
      _b.addByte(0x0A);
      _texto(l);
    }
    _b.addByte(0x0A);
    if ('${t['url'] ?? ''}'.isNotEmpty) _qr('${t['url']}');
    _b.addByte(0x0A);
    _texto('Escanee para ver el acta digital', negrita: true);
    if ('${t['codigo'] ?? ''}'.isNotEmpty) _texto('Código: ${t['codigo']}');
    _alinear(0);
    _avanzar(4); // margen para cortar el papel
    return _b.toBytes();
  }
}
