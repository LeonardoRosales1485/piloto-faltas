package ar.gob.malvinasargentinas.faltas_pos

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Parcel
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.UUID

/**
 * Canal «faltas/impresora» (lo usa lib/impresoras.dart):
 * - equipo: fabricante, marca y modelo, y si está el servicio de impresión de Senraise.
 * - vinculados: dispositivos Bluetooth emparejados (la impresora interna de muchos POS aparece como uno).
 * - imprimirBt: manda bytes ESC/POS a un dispositivo Bluetooth por el perfil serie (SPP).
 * - imprimirNyx: imprime con el servicio «Nyx» (net.nyx.printerservice) del Symcode MJ-Q50 / NB55.
 * Se copia sobre el MainActivity generado (preparar.ps1 y .github/workflows/pos-apk.yml).
 */
class MainActivity : FlutterActivity() {
    private val spp: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val principal = Handler(Looper.getMainLooper())

    // ------------------------------------------------------------------ impresora Nyx
    // Interfaz IPrinterService del fabricante (github.com/yzzzdev/NyxPrinterClient). Se llama por Binder sin AIDL:
    // el código de cada método es su posición en la interfaz (FIRST_CALL_TRANSACTION + n).
    private val nyxDescriptor = "net.nyx.printerservice.print.IPrinterService"
    private val nyxPaperOut = IBinder.FIRST_CALL_TRANSACTION + 4
    private val nyxPrintText = IBinder.FIRST_CALL_TRANSACTION + 6
    private val nyxPrintQr = IBinder.FIRST_CALL_TRANSACTION + 9
    private val nyxPrintBitmap = IBinder.FIRST_CALL_TRANSACTION + 10
    @Volatile private var nyx: IBinder? = null
    private val nyxConexion = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) { nyx = service }
        override fun onServiceDisconnected(name: ComponentName?) { nyx = null }
    }

    private fun conectarNyx() {
        if (nyx != null) return
        val i = Intent().setPackage("net.nyx.printerservice").setAction("net.nyx.printerservice.IPrinterService")
        try { applicationContext.bindService(i, nyxConexion, Context.BIND_AUTO_CREATE) } catch (e: Exception) { }
    }

    /** Llama a un método del servicio y devuelve su resultado (0 = bien). */
    private fun nyxLlamar(codigo: Int, escribir: (Parcel) -> Unit): Int {
        val b = nyx ?: throw Exception("El servicio de impresión no está conectado")
        val datos = Parcel.obtain()
        val respuesta = Parcel.obtain()
        try {
            datos.writeInterfaceToken(nyxDescriptor)
            escribir(datos)
            b.transact(codigo, datos, respuesta, 0)
            respuesta.readException()
            return respuesta.readInt()
        } finally {
            datos.recycle()
            respuesta.recycle()
        }
    }

    /** Formato de texto (mismo orden que PrintTextFormat.writeToParcel del fabricante). */
    private fun nyxFormato(p: Parcel, tam: Int, negrita: Boolean, alinear: Int) {
        p.writeInt(1) // objeto presente
        p.writeInt(tam)
        p.writeByte(0.toByte()) // subrayado
        p.writeFloat(1f); p.writeFloat(1f) // escala X / Y
        p.writeFloat(0f); p.writeFloat(0f) // espaciado de letras / renglones
        p.writeInt(0); p.writeInt(0) // márgenes arriba / izquierda
        p.writeInt(alinear)
        p.writeInt(if (negrita) 1 else 0)
        p.writeInt(0) // fuente por defecto
        p.writeString(null)
    }

    /** Ejecuta la lista de pasos del ticket (los arma lib/impresora_nyx.dart). */
    private fun nyxImprimir(pasos: List<Map<String, Any?>>) {
        conectarNyx()
        var espera = 0
        while (nyx == null && espera < 4000) { Thread.sleep(100); espera += 100 }
        if (nyx == null) throw Exception("No se pudo conectar con el servicio de impresión del equipo (net.nyx.printerservice)")
        for (p in pasos) {
            val alinear = (p["alinear"] as? Number)?.toInt() ?: 0
            val r = when (p["tipo"]) {
                "texto" -> nyxLlamar(nyxPrintText) {
                    it.writeString(p["texto"] as? String ?: "")
                    nyxFormato(it, (p["tam"] as? Number)?.toInt() ?: 24, p["negrita"] == true, alinear)
                }
                "qr" -> {
                    val lado = (p["lado"] as? Number)?.toInt() ?: 300
                    nyxLlamar(nyxPrintQr) { it.writeString(p["texto"] as? String ?: ""); it.writeInt(lado); it.writeInt(lado); it.writeInt(alinear) }
                }
                "imagen" -> {
                    val png = p["png"] as? ByteArray ?: ByteArray(0)
                    val original = BitmapFactory.decodeByteArray(png, 0, png.size) ?: throw Exception("Imagen inválida")
                    val ancho = minOf((p["ancho"] as? Number)?.toInt() ?: 384, 384)
                    val bmp = if (original.width > ancho) Bitmap.createScaledBitmap(original, ancho, original.height * ancho / original.width, true) else original
                    nyxLlamar(nyxPrintBitmap) { it.writeInt(1); bmp.writeToParcel(it, 0); it.writeInt(0); it.writeInt(alinear) }
                }
                "avanzar" -> nyxLlamar(nyxPaperOut) { it.writeInt((p["px"] as? Number)?.toInt() ?: 80) }
                else -> 0
            }
            if (r != 0) throw Exception("La impresora devolvió el código $r (${p["tipo"]})")
        }
    }

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
                "imprimirNyx" -> {
                    @Suppress("UNCHECKED_CAST")
                    val pasos = (call.argument<List<Any?>>("pasos") ?: emptyList()).map { it as Map<String, Any?> }
                    Thread {
                        try {
                            nyxImprimir(pasos)
                            principal.post { result.success(true) }
                        } catch (e: Exception) {
                            principal.post { result.error("nyx", e.message ?: e.toString(), null) }
                        }
                    }.start()
                }
                else -> result.notImplemented()
            }
        }
    }
}
