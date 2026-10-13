import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';

import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:image_picker/image_picker.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';

import 'actualizador.dart';
import 'impresora_ticket.dart';

/// URL del Sistema de Faltas. Se puede cambiar al compilar:
/// flutter build apk --dart-define=APP_URL=https://piloto-faltas.vercel.app
const appUrl = String.fromEnvironment('APP_URL', defaultValue: 'https://piloto-faltas.vercel.app');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const FaltasPosApp());
}

class FaltasPosApp extends StatelessWidget {
  const FaltasPosApp({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(debugShowCheckedModeBanner: false, title: 'Sistema de Faltas', home: Inicio());
}

class Inicio extends StatefulWidget {
  const Inicio({super.key});
  @override
  State<Inicio> createState() => _InicioState();
}

class _InicioState extends State<Inicio> {
  final _impresora = ImpresoraTicket();
  InAppWebViewController? _web;
  bool _buscando = true; // consultando si hay versión nueva
  Actualizacion? _actualizacion;
  String _version = ''; // número de versión de la app, la web lo muestra al pie del login

  @override
  void initState() {
    super.initState();
    // GPS (lugar de infracción) y cámara (fotos del acta)
    [Permission.location, Permission.camera].request();
    // Al iniciar: si hay una versión nueva publicada, se muestra la pantalla de actualización antes del sistema.
    Future.wait([
      PackageInfo.fromPlatform().then((p) => _version = p.buildNumber).catchError((_) => ''),
      buscarActualizacion().then((a) => _actualizacion = a),
    ]).whenComplete(() {
      if (mounted) setState(() => _buscando = false);
    });
  }

  /// Pregunta cámara o galería y devuelve las fotos como data URL (JPEG reducido a 1600 px).
  Future<List<String>> _tomarFotos(int max) async {
    final origen = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(children: [
          ListTile(leading: const Icon(Icons.photo_camera), title: const Text('Tomar foto'), onTap: () => Navigator.pop(ctx, ImageSource.camera)),
          ListTile(leading: const Icon(Icons.photo_library), title: const Text('Elegir de la galería'), onTap: () => Navigator.pop(ctx, ImageSource.gallery)),
        ]),
      ),
    );
    if (origen == null) return [];
    final picker = ImagePicker();
    final List<XFile> archivos;
    if (origen == ImageSource.camera) {
      final f = await picker.pickImage(source: ImageSource.camera, maxWidth: 1600, maxHeight: 1600, imageQuality: 80);
      archivos = f == null ? [] : [f];
    } else {
      archivos = (await picker.pickMultiImage(maxWidth: 1600, maxHeight: 1600, imageQuality: 80)).take(max).toList();
    }
    final out = <String>[];
    for (final f in archivos) {
      out.add('data:image/jpeg;base64,${base64Encode(await f.readAsBytes())}');
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    if (_buscando) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Image.asset('assets/logo_ticket.png', height: 110),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            const Text('Buscando actualizaciones…'),
          ]),
        ),
      );
    }
    if (_actualizacion != null) {
      return PantallaActualizacion(a: _actualizacion!, onOmitir: () => setState(() => _actualizacion = null));
    }
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop && _web != null && await _web!.canGoBack()) _web!.goBack();
      },
      child: Scaffold(
        body: SafeArea(
          child: InAppWebView(
            initialUrlRequest: URLRequest(url: WebUri(appUrl)),
            initialSettings: InAppWebViewSettings(
              javaScriptEnabled: true,
              geolocationEnabled: true,
              mediaPlaybackRequiresUserGesture: false,
              allowFileAccess: true,
              supportMultipleWindows: false,
              useHybridComposition: true,
              // La web lee «FaltasPOS/<versión>» del user agent y la muestra al pie del login.
              applicationNameForUserAgent: 'FaltasPOS/$_version',
            ),
            onWebViewCreated: (c) {
              _web = c;
              // La web llama: window.flutter_inappwebview.callHandler('imprimirTicket', datos)
              // Fotos del acta: el <input type=file capture> del WebView no devuelve la imagen en el POS,
              // así que la web llama callHandler('tomarFoto', {max}) y la app abre cámara o galería.
              c.addJavaScriptHandler(handlerName: 'tomarFoto', callback: (args) async {
                try {
                  final max = (args.isNotEmpty && args.first is Map) ? ((args.first as Map)['max'] as num?)?.toInt() ?? 10 : 10;
                  return {'ok': true, 'fotos': await _tomarFotos(max)};
                } catch (e) {
                  return {'ok': false, 'error': '$e'};
                }
              });
              c.addJavaScriptHandler(
                handlerName: 'imprimirTicket',
                callback: (args) async {
                  try {
                    final datos = Map<String, dynamic>.from(args.first as Map);
                    await _impresora.imprimir(datos);
                    return {'ok': true};
                  } catch (e) {
                    return {'ok': false, 'error': '$e'};
                  }
                },
              );
            },
            onGeolocationPermissionsShowPrompt: (c, origin) async =>
                GeolocationPermissionShowPromptResponse(origin: origin, allow: true, retain: true),
            onPermissionRequest: (c, req) async =>
                PermissionResponse(resources: req.resources, action: PermissionResponseAction.GRANT),
          ),
        ),
      ),
    );
  }
}
