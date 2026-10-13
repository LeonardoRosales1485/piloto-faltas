import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:ota_update/ota_update.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// version.json publicado por pos-app/publicar.mjs en Supabase Storage.
const versionUrl = String.fromEnvironment('VERSION_URL',
    defaultValue: 'https://dmybbnqismmwhylkwuhq.supabase.co/storage/v1/object/public/pos-app/version.json');

class Actualizacion {
  final int actual, nueva;
  final String url;
  /// La app instalada es más vieja que la versión anterior publicada: ya no se permite seguir sin actualizar.
  final bool obligatoria;
  const Actualizacion(this.actual, this.nueva, this.url, this.obligatoria);
}

/// Consulta version.json. Devuelve null si no hay versión nueva o si no hay conexión (la app sigue igual).
Future<Actualizacion?> buscarActualizacion() async {
  try {
    final actual = int.tryParse((await PackageInfo.fromPlatform()).buildNumber) ?? 0;
    final cliente = HttpClient()..connectionTimeout = const Duration(seconds: 5);
    final req = await cliente.getUrl(Uri.parse('$versionUrl?t=${DateTime.now().millisecondsSinceEpoch}'));
    final res = await req.close().timeout(const Duration(seconds: 8));
    if (res.statusCode != 200) return null;
    final v = jsonDecode(await res.transform(utf8.decoder).join()) as Map<String, dynamic>;
    final nueva = (v['build'] as num?)?.toInt() ?? 0;
    final url = '${v['url'] ?? ''}';
    if (nueva <= actual || url.isEmpty) return null;
    final anterior = ((v['anterior'] as Map?)?['build'] as num?)?.toInt() ?? 0;
    return Actualizacion(actual, nueva, url, actual < anterior);
  } catch (_) {
    return null;
  }
}

/// Vista a pantalla completa mientras se descarga e instala la versión nueva.
class PantallaActualizacion extends StatefulWidget {
  final Actualizacion a;
  final VoidCallback onOmitir;
  const PantallaActualizacion({super.key, required this.a, required this.onOmitir});
  @override
  State<PantallaActualizacion> createState() => _PantallaActualizacionState();
}

enum _Fase { descargando, instalando, error }

class _PantallaActualizacionState extends State<PantallaActualizacion> {
  _Fase _fase = _Fase.descargando;
  double? _progreso; // 0..1, null = indeterminado
  String _error = '';
  StreamSubscription<OtaEvent>? _sub;

  @override
  void initState() {
    super.initState();
    _iniciar();
  }

  void _iniciar() {
    _sub?.cancel();
    setState(() { _fase = _Fase.descargando; _progreso = null; _error = ''; });
    try {
      _sub = OtaUpdate().execute(widget.a.url, destinationFilename: 'faltas-pos-${widget.a.nueva}.apk').listen((ev) {
        if (!mounted) return;
        final s = ev.status.toString().split('.').last;
        if (s == 'DOWNLOADING') {
          final p = double.tryParse(ev.value ?? '');
          setState(() { _fase = _Fase.descargando; _progreso = p == null ? null : (p / 100).clamp(0, 1); });
        } else if (s == 'INSTALLING' || s == 'INSTALLATION_DONE') {
          setState(() { _fase = _Fase.instalando; _progreso = 1; });
        } else if (s.contains('ERROR') || s == 'CANCELED') {
          setState(() { _fase = _Fase.error; _error = s == 'PERMISSION_NOT_GRANTED_ERROR'
              ? 'Falta permitir «Instalar apps desconocidas» para Faltas en los ajustes de Android.'
              : s == 'CANCELED' ? 'Se canceló la instalación.' : 'No se pudo completar ($s${ev.value != null ? ': ${ev.value}' : ''}).'; });
        }
      }, onError: (e) {
        if (mounted) setState(() { _fase = _Fase.error; _error = '$e'; });
      });
    } catch (e) {
      setState(() { _fase = _Fase.error; _error = '$e'; });
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const azul = Color(0xFF1E3A8A);
    final pct = _progreso == null ? '' : '${(_progreso! * 100).round()} %';
    final titulo = switch (_fase) {
      _Fase.descargando => 'Descargando actualización',
      _Fase.instalando => 'Instalando actualización',
      _Fase.error => 'No se pudo actualizar',
    };
    final detalle = switch (_fase) {
      _Fase.descargando => 'No cierre la aplicación. Al terminar la descarga, Android le pedirá confirmar la instalación.',
      _Fase.instalando => 'Toque «Actualizar» o «Instalar» en el aviso de Android. La aplicación se reiniciará con la versión nueva.',
      _Fase.error => _error,
    };
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Image.asset('assets/logo_ticket.png', height: 110),
              const SizedBox(height: 28),
              Icon(_fase == _Fase.error ? Icons.error_outline : Icons.system_update, size: 44, color: _fase == _Fase.error ? Colors.red.shade700 : azul),
              const SizedBox(height: 12),
              Text(titulo, textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: azul)),
              const SizedBox(height: 6),
              Text('Versión ${widget.a.actual} → ${widget.a.nueva}', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade700)),
              const SizedBox(height: 24),
              if (_fase != _Fase.error) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(value: _fase == _Fase.instalando ? null : _progreso, minHeight: 12, color: azul, backgroundColor: azul.withValues(alpha: .12)),
                ),
                const SizedBox(height: 8),
                Text(_fase == _Fase.instalando ? 'Esperando la confirmación…' : pct, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 16),
              ],
              Text(detalle, textAlign: TextAlign.center, style: const TextStyle(fontSize: 15)),
              const SizedBox(height: 24),
              if (_fase != _Fase.descargando)
                FilledButton.icon(onPressed: _iniciar, icon: const Icon(Icons.refresh), label: Text(_fase == _Fase.instalando ? 'Volver a abrir el instalador' : 'Reintentar'),
                    style: FilledButton.styleFrom(backgroundColor: azul, padding: const EdgeInsets.symmetric(vertical: 14))),
              if (!widget.a.obligatoria && _fase != _Fase.descargando) ...[
                const SizedBox(height: 8),
                TextButton(onPressed: widget.onOmitir, child: const Text('Seguir con la versión actual')),
              ],
              if (widget.a.obligatoria && _fase == _Fase.error)
                Padding(padding: const EdgeInsets.only(top: 8), child: Text('Esta versión ya no está habilitada: es necesario actualizar.', textAlign: TextAlign.center, style: TextStyle(color: Colors.red.shade700))),
            ],
          ),
        ),
      ),
    );
  }
}
