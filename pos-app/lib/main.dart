import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:permission_handler/permission_handler.dart';

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

  @override
  void initState() {
    super.initState();
    // GPS (lugar de infracción) y cámara (fotos del acta)
    [Permission.location, Permission.camera].request();
  }

  @override
  Widget build(BuildContext context) {
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
            ),
            onWebViewCreated: (c) {
              _web = c;
              // La web llama: window.flutter_inappwebview.callHandler('imprimirTicket', datos)
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
