package ar.gob.malvinasargentinas.faltas_pos

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import android.os.Build
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.UUID

/**
 * Canal «faltas/impresora» (lo usa lib/impresoras.dart):
 * - equipo: fabricante, marca y modelo, y si está el servicio de impresión de Senraise.
 * - vinculados: dispositivos Bluetooth emparejados (la impresora interna de muchos POS aparece como uno).
 * - imprimirBt: manda bytes ESC/POS a un dispositivo Bluetooth por el perfil serie (SPP).
 * Se copia sobre el MainActivity generado (preparar.ps1 y .github/workflows/pos-apk.yml).
 */
class MainActivity : FlutterActivity() {
    private val spp: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val principal = Handler(Looper.getMainLooper())

    private fun instalado(paquete: String): Boolean = try {
        packageManager.getPackageInfo(paquete, 0); true
    } catch (e: Exception) { false }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "faltas/impresora").setMethodCallHandler { call, result ->
            when (call.method) {
                "equipo" -> result.success(
                    mapOf(
                        "fabricante" to (Build.MANUFACTURER ?: ""),
                        "marca" to (Build.BRAND ?: ""),
                        "modelo" to (Build.MODEL ?: ""),
                        "android" to (Build.VERSION.RELEASE ?: ""),
                        "senraise" to instalado("recieptservice.com.recieptservice"),
                        "sunmi" to instalado("woyou.aidlservice.jiuiv5"),
                        "nyx" to (instalado("net.nyx.printerservice") || instalado("com.incar.printerservice")),
                    )
                )
                "vinculados" -> {
                    try {
                        val a = BluetoothAdapter.getDefaultAdapter()
                        if (a == null) {
                            result.success(listOf<Map<String, String>>())
                        } else {
                            result.success(a.bondedDevices.map { mapOf("nombre" to (it.name ?: ""), "mac" to (it.address ?: "")) })
                        }
                    } catch (e: Exception) {
                        result.error("bt", e.message ?: e.toString(), null)
                    }
                }
                "imprimirBt" -> {
                    val mac = call.argument<String>("mac") ?: ""
                    val datos = call.argument<ByteArray>("datos") ?: ByteArray(0)
                    Thread {
                        var socket: BluetoothSocket? = null
                        try {
                            val a = BluetoothAdapter.getDefaultAdapter() ?: throw Exception("El equipo no tiene Bluetooth")
                            if (!a.isEnabled) throw Exception("El Bluetooth está apagado")
                            try { a.cancelDiscovery() } catch (e: Exception) { /* sin permiso de búsqueda: no hace falta */ }
                            val s = a.getRemoteDevice(mac).createRfcommSocketToServiceRecord(spp)
                            socket = s
                            s.connect()
                            val o = s.outputStream
                            var i = 0
                            while (i < datos.size) {
                                val n = minOf(1024, datos.size - i)
                                o.write(datos, i, n)
                                o.flush()
                                i += n
                                Thread.sleep(20)
                            }
                            Thread.sleep(400) // que termine de salir antes de cerrar
                            principal.post { result.success(true) }
                        } catch (e: Exception) {
                            principal.post { result.error("bt", e.message ?: e.toString(), null) }
                        } finally {
                            try { socket?.close() } catch (e: Exception) { }
                        }
                    }.start()
                }
                else -> result.notImplemented()
            }
        }
    }
}
