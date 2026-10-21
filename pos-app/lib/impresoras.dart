import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

import 'impresora_ticket.dart';
import 'ticket_escpos.dart';

/// Elige con qué imprimir según el equipo:
/// - Senraise H10S: SDK de Senraise (impresora_ticket.dart), como siempre.
/// - Otros POS (ej. Symcode MJ-Q50): impresora interna vinculada por Bluetooth, con comandos ESC/POS.
/// La web puede forzar una vía con `impresora: 'senraise' | 'bluetooth'` y elegir el dispositivo con `mac`
/// (pantalla «Prueba de impresora», manteniendo apretada la versión al pie del login).
class Impresoras {
  static const _canal = MethodChannel('faltas/impresora');
  final ImpresoraTicket _senraise = ImpresoraTicket();
  Map<String, dynamic>? _equipo;

  /// Dirección habitual de la impresora interna «virtual» de los POS Android (Sunmi y compatibles).
  static const _macInterna = '00:11:22:33:44:55';
  static final _nombreImpresora = RegExp(r'inner|printer|impres|print|pos|mpt|ptp|thermal|58|80', caseSensitive: false);

  Future<Map<String, dynamic>> equipo() async {
    try {
      return _equipo ??= Map<String, dynamic>.from(await _canal.invokeMethod('equipo') as Map);
    } catch (_) {
      return _equipo = {'fabricante': '', 'marca': '', 'modelo': '', 'android': '', 'senraise': false, 'sunmi': false};
    }
  }

  /// Senraise: tiene su servicio de impresión instalado o el modelo lo dice.
  bool _esSenraise(Map<String, dynamic> e) =>
      e['senraise'] == true || RegExp(r'senraise|h10', caseSensitive: false).hasMatch('${e['fabricante']} ${e['marca']} ${e['modelo']}');

  Future<List<Map<String, String>>> vinculados() async {
    try { await Permission.bluetoothConnect.request(); } catch (_) {/* Android < 12: no hace falta */}
    final l = await _canal.invokeMethod<List<dynamic>>('vinculados') ?? const [];
    return l.map((e) => (e as Map).map((k, v) => MapEntry('$k', '$v'))).toList();
  }

  Map<String, String>? _interna(List<Map<String, String>> l) {
    for (final d in l) {
      if ((d['mac'] ?? '').toUpperCase() == _macInterna) return d;
    }
    for (final d in l) {
      if (_nombreImpresora.hasMatch(d['nombre'] ?? '')) return d;
    }
    return null;
  }

  /// Para la pantalla de prueba: datos del equipo, Bluetooth vinculados y qué vía usaría.
  Future<Map<String, dynamic>> info() async {
    final e = await equipo();
    List<Map<String, String>> l = const [];
    String? errorBt;
    try { l = await vinculados(); } catch (x) { errorBt = '$x'; }
    final interna = _interna(l);
    return {
      'equipo': e,
      'vinculados': l,
      'errorBluetooth': errorBt,
      'via': _esSenraise(e) ? 'senraise' : interna != null ? 'bluetooth' : 'ninguna',
      'impresoraBluetooth': interna,
    };
  }

  /// Imprime y devuelve la vía usada. Si no puede, lanza una excepción con un mensaje para mostrar en la web.
  Future<String> imprimir(Map<String, dynamic> t) async {
    final modo = '${t['impresora'] ?? 'auto'}';
    final e = await equipo();
    if (modo == 'senraise' || (modo == 'auto' && _esSenraise(e))) {
      // El plugin de Senraise no responde si el servicio no existe: tiempo límite para no colgar la web.
      await _senraise.imprimir(t).timeout(const Duration(seconds: 25));
      return 'senraise';
    }
    final l = await vinculados();
    final elegido = '${t['mac'] ?? ''}';
    final d = elegido.isNotEmpty ? {'nombre': elegido, 'mac': elegido} : _interna(l);
    if (d == null) {
      final lista = l.isEmpty ? 'ninguno' : l.map((x) => '${x['nombre']} (${x['mac']})').join(', ');
      throw Exception('No se encontró la impresora del equipo (${e['fabricante']} ${e['modelo']}). Dispositivos Bluetooth vinculados: $lista.');
    }
    final bytes = await TicketEscPos.desde(t).armar(t);
    try {
      await _canal.invokeMethod('imprimirBt', {'mac': d['mac'], 'datos': bytes}).timeout(const Duration(seconds: 25));
    } on PlatformException catch (x) {
      throw Exception('No se pudo imprimir por Bluetooth en ${d['nombre']}: ${x.message}');
    }
    return 'bluetooth';
  }
}
