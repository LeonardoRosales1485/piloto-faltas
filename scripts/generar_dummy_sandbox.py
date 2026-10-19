"""Genera el conjunto de datos dummy «default» recorriendo los circuitos reales por la API del piloto.

Uso: python3 generar.py   (con el piloto en http://localhost:3000 y la base local)
Al final captura el estado como snapshot 'default'.
Desactualizado respecto del piloto (09/10/2026): si se regenera el snapshot, correr después
sql/027_sandbox_default_actualizado.sql (o revisar que lo nuevo ya venga en los datos generados).
"""
import base64, io, json, math, random, subprocess, sys, time
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter

random.seed(7)
B = 'http://localhost:3000'
PSQL = ['psql', '-h', '/tmp', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc']
DIA = 86400000


def sql(q):
    return subprocess.check_output(PSQL + [q]).decode().strip()


def call(m, p, tok=None, body=None, ok=True):
    h = {'Content-Type': 'application/json'}
    if tok:
        h['Authorization'] = 'Bearer ' + tok
    r = requests.request(m, B + p, headers=h, data=json.dumps(body) if body is not None else None, timeout=120)
    j = r.json()
    if r.status_code != 200:
        msg = f'ERR {m} {p} {r.status_code} {j.get("message")}'
        if ok:
            raise SystemExit(msg)
        print(msg)
    return j.get('data')


def login(u, p='%s123'):
    return call('POST', '/api/auth/login', body={'username': u, 'password': p % u if '%s' in p else p})['token']


# ---------------------------------------------------------------- imágenes
def fuente(t):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        try:
            return ImageFont.truetype(f, t)
        except OSError:
            pass
    return ImageFont.load_default()


def jpg(img, q=48):
    b = io.BytesIO()
    img.convert('RGB').save(b, 'JPEG', quality=q, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def foto_vehiculo(dominio, color, n):
    W, H = 560, 400
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H // 2):  # cielo
        c = 150 + y // 3
        d.line([(0, y), (W, y)], fill=(c - 40, c - 10, 235))
    d.rectangle([0, H // 2, W, H], fill=(92, 92, 96))  # calzada
    for x in range(0, W, 80):
        d.rectangle([x + 10, H // 2 + 110, x + 50, H // 2 + 118], fill=(230, 230, 230))
    d.rectangle([0, H // 2 - 6, W, H // 2 + 8], fill=(170, 170, 160))  # vereda
    for i in range(4):  # edificios
        x = 20 + i * 140
        d.rectangle([x, 60 + (i % 2) * 30, x + 110, H // 2 - 6], fill=(200 - i * 15, 185 - i * 10, 170))
        for wy in range(80 + (i % 2) * 30, H // 2 - 30, 28):
            for wx in range(x + 12, x + 100, 26):
                d.rectangle([wx, wy, wx + 14, wy + 16], fill=(120, 150, 180))
    ox = 90 + n * 30
    d.rounded_rectangle([ox, 215, ox + 360, 315], 22, fill=color)  # auto
    d.polygon([(ox + 70, 215), (ox + 120, 165), (ox + 260, 165), (ox + 310, 215)], fill=color)
    d.polygon([(ox + 85, 213), (ox + 125, 175), (ox + 185, 175), (ox + 185, 213)], fill=(170, 200, 220))
    d.polygon([(ox + 195, 213), (ox + 195, 175), (ox + 255, 175), (ox + 295, 213)], fill=(170, 200, 220))
    for wx in (ox + 80, ox + 280):
        d.ellipse([wx - 30, 285, wx + 30, 345], fill=(25, 25, 25))
        d.ellipse([wx - 13, 302, wx + 13, 328], fill=(150, 150, 150))
    d.rectangle([ox + 140, 280, ox + 225, 305], fill=(250, 250, 250), outline=(20, 20, 20))
    d.text((ox + 146, 283), dominio, font=fuente(17), fill=(10, 10, 10))
    d.rectangle([0, H - 26, W, H], fill=(0, 0, 0))
    d.text((8, H - 22), f'Foto {n + 1} · Dominio {dominio} · Malvinas Argentinas', font=fuente(13), fill=(255, 255, 255))
    return jpg(im.filter(ImageFilter.SMOOTH))


def foto_local(nombre, n):
    W, H = 560, 400
    im = Image.new('RGB', (W, H), (205, 200, 190))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 300, W, H], fill=(150, 150, 145))
    d.rectangle([60, 70, 500, 300], fill=(235, 225, 205), outline=(90, 80, 70), width=3)
    d.rectangle([60, 70, 500, 120], fill=(180, 40, 40) if n == 0 else (40, 90, 160))
    d.text((80, 85), nombre[:28].upper(), font=fuente(22), fill=(255, 255, 255))
    d.rectangle([90, 140, 230, 290], fill=(110, 140, 165))
    d.rectangle([260, 140, 470, 300], fill=(80, 60, 45))
    if n == 1:
        d.rectangle([255, 190, 480, 240], fill=(250, 250, 250), outline=(200, 0, 0), width=4)
        d.text((272, 203), 'CLAUSURADO', font=fuente(24), fill=(200, 0, 0))
    d.rectangle([0, H - 26, W, H], fill=(0, 0, 0))
    d.text((8, H - 22), f'Foto {n + 1} · {nombre}', font=fuente(13), fill=(255, 255, 255))
    return jpg(im.filter(ImageFilter.SMOOTH))


def firma_png(semilla):
    rnd = random.Random(semilla)
    im = Image.new('RGBA', (420, 150), (255, 255, 255, 0))
    d = ImageDraw.Draw(im)
    x, y = 30, 90
    pts = []
    for _ in range(9):
        cx, cy = x + rnd.randint(25, 45), y + rnd.randint(-45, 45)
        for t in range(12):
            a = t / 12
            pts.append((x + (cx - x) * a + math.sin(a * math.pi * 2) * rnd.randint(4, 14), y + (cy - y) * a))
        x, y = cx, max(25, min(125, cy))
    d.line(pts, fill=(20, 30, 90, 255), width=3, joint='curve')
    d.line([(pts[2][0], 118), (pts[-1][0] + 10, 108)], fill=(20, 30, 90, 255), width=2)
    b = io.BytesIO()
    im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


# ---------------------------------------------------------------- arranque
print('Borrando datos y reseteando usuarios…')
sql("select sandbox_borrar(); select sandbox_resetear_usuarios();")
HASH_CIU = sql("select password_hash from ciudadano limit 1") or None
if not HASH_CIU:
    HASH_CIU = subprocess.check_output(['node', '-e', "process.stdout.write(require('bcryptjs').hashSync('ciudadano123',10))"], cwd='/home/claude/work/monorepo').decode()
ahora = int(time.time() * 1000)
CIUDADANOS = [
    ("fisica", "Valeria", "Suárez", "DNI", "30111222", None, None, None, "valeria@example.com", "11 5555-1234", "Av. Pte. Perón 2150", "Los Polvorines", 1),
    ("fisica", "Martín", "Gómez", "DNI", "28999111", None, None, None, "martin.gomez@example.com", "11 4444-9876", "Constituyentes 1800", "Grand Bourg", 0),
    ("juridica", None, None, "CUIT", None, "Ferretería El Tornillo S.R.L.", "S.R.L.", "30-71234567-9", "administracion@eltornillo.com.ar", "11 4663-2211", "Av. Olivos 4120", "Tortuguitas", 1),
]
for i, c in enumerate(CIUDADANOS):
    tp, nom, ape, dt, dn, rs, ts, cuit, mail, tel, dom, loc, de = c
    q = lambda v: 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"
    sql(f"insert into ciudadano (uuid,tipo_persona,nombre,apellido,documento_tipo,documento_numero,razon_social,tipo_societario,cuit,email,telefono,domicilio,localidad,password_hash,email_verificado,domicilio_electronico,ddjj_at,date_created) values (gen_random_uuid()::text,{q(tp)},{q(nom)},{q(ape)},{q(dt)},{q(dn)},{q(rs)},{q(ts)},{q(cuit)},{q(mail)},{q(tel)},{q(dom)},{q(loc)},{q(HASH_CIU)},1,{de},{ahora if de else 'NULL'},{ahora})")

INS = login('inspector'); INC = login('inspector_contrav', 'inspector123'); AG = login('operador'); DIR = login('directora'); ABO = login('abogada')
VAL = call('POST', '/api/portal/login', body={'email': 'valeria@example.com', 'password': 'ciudadano123'})['token']
MAR = call('POST', '/api/portal/login', body={'email': 'martin.gomez@example.com', 'password': 'ciudadano123'})['token']
TOR = call('POST', '/api/portal/login', body={'email': 'administracion@eltornillo.com.ar', 'password': 'ciudadano123'})['token']
LEYES = {1: call('POST', '/api/ley/paginate', INS, {'page': 0, 'size': 50, 'filtros': [{'tabla': 't', 'columna': 'infraccion_tipo_id', 'parametro': '=', 'value': 1}], 'relaciones': [], 'ordenes': []})['content'],
         2: call('POST', '/api/ley/paginate', INC, {'page': 0, 'size': 50, 'filtros': [{'tabla': 't', 'columna': 'infraccion_tipo_id', 'parametro': '=', 'value': 2}], 'relaciones': [], 'ordenes': []})['content']}
clave = lambda l: f"{l['nombre']} · {l['articulo']}"
PLANT = {p['codigo']: p['id'] for p in call('GET', '/api/plantillas?todas=1', AG)}
def dni_img(lado):
    im = Image.new('RGB', (420, 265), (226, 236, 246)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([4, 4, 416, 261], 16, outline=(90, 120, 160), width=3)
    d.text((20, 18), 'REPÚBLICA ARGENTINA · DOCUMENTO NACIONAL DE IDENTIDAD', font=fuente(11), fill=(40, 60, 100))
    if lado == 'frente':
        d.rectangle([20, 50, 130, 190], fill=(180, 190, 205)); d.ellipse([50, 70, 100, 120], fill=(150, 160, 175))
        for i, t in enumerate(['Apellido / Surname', 'Nombre / Name', 'Documento / Document', 'Fecha de nacimiento']):
            d.text((150, 55 + i * 40), t, font=fuente(10), fill=(90, 100, 120)); d.rectangle([150, 70 + i * 40, 390, 80 + i * 40], fill=(200, 208, 220))
    else:
        for i in range(3): d.text((20, 190 + i * 20), '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<', font=fuente(14), fill=(60, 70, 90))
        d.text((20, 60), 'Domicilio / Address', font=fuente(10), fill=(90, 100, 120)); d.rectangle([20, 76, 380, 86], fill=(200, 208, 220))
    return jpg(im)
DNI_FRENTE = dni_img('frente'); DNI_DORSO = dni_img('dorso')

CALLES = [('Av. Pte. Perón', '2150', 'Sarmiento', 'Belgrano', 'Los Polvorines', -34.5012, -58.6955),
          ('Ruta 197', '3400', 'Av. Olivos', 'Pellegrini', 'Grand Bourg', -34.4885, -58.7270),
          ('Av. Olivos', '4120', 'Constituyentes', 'Callao', 'Tortuguitas', -34.4706, -58.7525),
          ('Eva Perón', '980', 'San Martín', 'Mitre', 'Villa de Mayo', -34.5070, -58.6780),
          ('Constituyentes', '1800', 'Rivadavia', 'Moreno', 'Ingeniero Pablo Nogués', -34.4790, -58.7010),
          ('Panamericana Km 38', '', '', '', 'Tortuguitas', -34.4100, -58.7700)]
VEHICULOS = [('Automóvil', 'Toyota', 'Etios', (190, 30, 40)), ('Camioneta', 'Ford', 'Ranger', (40, 40, 45)), ('Motocicleta', 'Honda', 'Wave 110', (30, 80, 170)),
             ('Automóvil', 'Volkswagen', 'Gol Trend', (210, 210, 215)), ('Automóvil', 'Fiat', 'Cronos', (60, 120, 70)), ('Camión', 'Mercedes-Benz', 'Atego 1726', (240, 240, 240))]


def labrar(tipo, inf, *, nombre='', apellido='', doc='', juridica=None, sit='presente', ley_idx=(0,), calle=0, veh=0, dominio='',
           ret_lic=0, ret_veh=0, alcohol=None, medidas=None, obs='', fotos=2, email='', nacimiento='1985-04-12'):
    tok = INS if tipo == 'multas' else INC
    a = call('POST', '/api/acta/iniciar', tok, {'tipo': tipo})
    tid = 1 if tipo == 'multas' else 2
    leyes = LEYES[tid] or LEYES[1]
    c = CALLES[calle]
    meta = {}
    a.update({
        'situacionInfractor': sit,
        'domicilioInfraccionCalle': c[0], 'domicilioInfraccionNumero': c[1], 'entreCalle1': c[2], 'entreCalle2': c[3],
        'domicilioInfraccionLocalidadNombre': c[4], 'gpsLat': c[5], 'gpsLng': c[6], 'ejido': 'fuera' if c[0].startswith(('Ruta', 'Panamericana')) else 'dentro',
        'leyesNombre': [clave(leyes[i % len(leyes)]) for i in ley_idx], 'observaciones': obs,
        'retencionDeLicencia': ret_lic, 'retencionDeVehiculo': ret_veh,
    })
    if sit != 'nn':
        if juridica:
            a.update({'infractorPersonaTipo': 1, 'infractorRazonSocial': juridica[0], 'infractorCuit': juridica[1], 'infractorNombre': juridica[0],
                      'infractorDocumentoTipoNombre': 'CUIT', 'infractorDocumentoNumero': juridica[1].replace('-', ''), 'infractorActividadEconomica': juridica[2]})
        else:
            a.update({'infractorPersonaTipo': 0, 'infractorNombre': f'{nombre} {apellido}', 'infractorDocumentoTipoNombre': 'DNI', 'infractorDocumentoNumero': doc,
                      'infractorFechaNacimiento': nacimiento})
        a.update({'infractorDomicilio': random.choice(['Sarmiento', 'Belgrano', 'Rivadavia', 'Mitre', 'Moreno']), 'infractorCalleAltura': str(random.randint(100, 4800)),
                  'infractorDepartamento': random.choice(['', '', 'PB A', '2° B']), 'infractorProvinciaNombre': 'Buenos Aires',
                  'infractorLocalidadNombre': random.choice(['Los Polvorines', 'Grand Bourg', 'Tortuguitas', 'Villa de Mayo']),
                  'infractorPartidoNombre': 'Malvinas Argentinas', 'infractorCodigoPostal': random.choice(['1613', '1615', '1667']),
                  'infractorEmail': email})
    if tipo == 'multas':
        v = VEHICULOS[veh]
        a.update({'vehiculoTipoNombre': v[0], 'vehiculoNumeroDominio': dominio, 'vehiculoNumeroControlInterno': '',
                  'vehiculoNumeroLicencia': '' if sit == 'nn' else str(random.randint(20000000, 39999999)),
                  'vehiculoMunicipalidadEmisora': '' if sit == 'nn' else random.choice(['Malvinas Argentinas', 'José C. Paz', 'Pilar'])})
        meta.update({'marca': v[1], 'modelo': v[2]})
        if alcohol:
            meta.update({'alcoholemia': 'positiva' if alcohol > 0.5 else 'negativa', 'alcoholimetroMarca': 'Dräger', 'alcoholimetroModelo': 'Alcotest 6820',
                         'alcoholimetroSerie': 'ARBM-0457', 'alcoholimetroMedicion': str(random.randint(1200, 1900)), 'alcoholimetroValor': f'{alcohol:.2f} g/l'})
    else:
        a.update({'dependenciasNombre': ['Inspecciones Generales'], 'nomenclaturaCatastral': f'IV-K-{random.randint(10, 99)}-{random.randint(1, 30)}',
                  'medidasPreventivas': medidas or []})
        if tipo == 'sustancias':
            a['sustanciasDescripcion'] = 'Transporte de 180 kg de productos cárnicos sin cadena de frío ni habilitación bromatológica vigente.'
    a['metadata'] = meta
    call('POST', '/api/infraccion/save', tok, a)
    for n in range(fotos):
        raw = foto_vehiculo(dominio or 'S/D', VEHICULOS[veh][3], n) if tipo == 'multas' else foto_local((juridica or ['Comercio'])[0], n)
        call('POST', '/api/infraccion/imagen/save', tok, {'infraccionUuid': a['uuid'], 'previewRaw': raw, 'fullRaw': raw, 'status': 1})
    firma = firma_png(a['legajoNumeroActa']) if sit == 'presente' else None
    call('POST', '/api/acta/firmar', tok, {'uuid': a['uuid'], 'firmaInfractor': firma})
    return a['uuid']


def acc(u, accion, tok=AG, **datos):
    return call('POST', '/api/causa/accion', tok, {'uuid': u, 'accion': accion, 'datos': datos})


def abrir_portal(u, ctok):
    call('GET', f'/api/portal/causa/{u}?abrir=1', ctok)


def presentar(u, ctok, tipo, texto='', cuotas=None):
    call('POST', '/api/portal/presentar', ctok, {'causaUuid': u, 'tipo': tipo, 'texto': texto, 'cuotas': cuotas,
                                                 'adjuntos': [{'titulo': 'DNI frente', 'nombre': 'dni-frente.jpg', 'raw': DNI_FRENTE}, {'titulo': 'DNI dorso', 'nombre': 'dni-dorso.jpg', 'raw': DNI_DORSO}]})
    pres = call('GET', '/api/presentaciones?estado=pendiente', AG)
    return [p for p in pres if p['infraccion']['uuid'] == u][-1]['uuid']


def resolver(puuid, accion='aceptar', respuesta='', cuotas=None, tok=AG):
    call('POST', '/api/presentacion/resolver', tok, {'uuid': puuid, 'accion': accion, 'respuesta': respuesta, 'cuotas': cuotas})


def escrito(u, codigo, valores=None, tok=AG, firmar_con=None, notificar=False, quedar=None):
    g = acc(u, 'generar_escrito', tok, plantillaId=PLANT[codigo])
    doc = call('GET', f"/api/documento/{g['uuid']}", tok)['documento']
    html = doc['contenido_html'] or ''
    import re
    n = len(re.findall(r'\[Completar:', html))
    vals = {f'c{i + 1}': (valores[i % len(valores)] if valores else 'Según constancias') for i in range(n)}
    if quedar == 'borrador':
        call('POST', '/api/documento/guardar', tok, {'uuid': g['uuid'], 'accion': 'guardar', 'modo': 'campos', 'valores': vals})
        return g['uuid']
    req_rev = firmar_con is not None
    if req_rev:
        call('POST', '/api/documento/guardar', tok, {'uuid': g['uuid'], 'accion': 'revision', 'modo': 'campos', 'valores': vals})
        if quedar == 'revision':
            return g['uuid']
        call('POST', '/api/documento/revisar', firmar_con, {'uuid': g['uuid'], 'accion': 'firmar'})
    else:
        call('POST', '/api/documento/guardar', tok, {'uuid': g['uuid'], 'accion': 'definitivo', 'modo': 'campos', 'valores': vals})
    if notificar:
        acc(u, 'notificar_documento', tok, documentoUuid=g['uuid'])
    return g['uuid']


def desplazar(u, dias):
    """Corre todas las fechas de la causa «dias» hacia atrás (para que la historia sea creíble)."""
    d = dias * DIA
    iid = sql(f"select id from infraccion where uuid='{u}'")
    sql(f"""update infraccion set date_created=date_created-{d}, firmada_at=firmada_at-{d}, notificada_at=notificada_at-{d}, vence_plazo_at=vence_plazo_at-{d},
            estadia_ingreso_at=estadia_ingreso_at-{d}, legajo_fecha=to_char(legajo_fecha::timestamp - interval '{dias} days','YYYY-MM-DD"T"HH24:MI') where id={iid};
            update causa_historial set fecha=fecha-{d} where infraccion_id={iid};
            update documento set date_created=date_created-{d}, date_updated=date_updated-{d}, firmado_at=firmado_at-{d}, fecha_numero=fecha_numero-{d} where infraccion_id={iid};
            update boleta set date_created=date_created-{d}, vencimiento=vencimiento-{d}, pagado_at=pagado_at-{d} where infraccion_id={iid};
            update presentacion set date_created=date_created-{d}, resuelta_at=resuelta_at-{d} where infraccion_id={iid};
            update notificacion set date_created=date_created-{d}, fecha_resultado=fecha_resultado-{d} where infraccion_id={iid};
            update correo_saliente set date_created=date_created-{d} where infraccion_id={iid};
            update infraccion_imagen set date_created=date_created-{d} where infraccion_id={iid};""")


# ================================================================ escenarios
print('Labrando y tramitando causas…')
# 1. Tránsito recién labrada, sin notificar (bandeja «Sin notificar»)
u = labrar('multas', 'inspector', nombre='Gonzalo', apellido='Romero', doc='28954321', ley_idx=(1,), calle=0, veh=0, dominio='AB123CD',
           obs='Circulaba a 92 km/h en zona de 60 km/h. Medición con cinemómetro Nº 0045.', email='gromero@example.com'); desplazar(u, 2)
u = labrar('multas', 'inspector', nombre='Laura', apellido='Martínez', doc='32987456', ley_idx=(2,), calle=3, veh=3, dominio='AD456GH',
           obs='Vehículo estacionado sobre rampa para personas con discapacidad.'); desplazar(u, 1)
# 2. Ausente (auto estacionado) y NN
u = labrar('multas', 'inspector', nombre='Pablo', apellido='Sosa', doc='28745632', sit='ausente', ley_idx=(2,), calle=4, veh=4, dominio='AF789MN',
           obs='Conductor ausente. Se deja copia del acta en el parabrisas.'); desplazar(u, 6)
u = labrar('multas', 'inspector', sit='nn', ley_idx=(2,), calle=1, veh=1, dominio='', obs='Vehículo sin dominio colocado. No se identifica al conductor.', fotos=2); desplazar(u, 9)
# 3. Notificada por portal: corre el plazo (Valeria)
u = labrar('multas', 'inspector', nombre='Valeria', apellido='Suárez', doc='30111222', ley_idx=(1,), calle=0, veh=2, dominio='A123BCD', email='valeria@example.com')
abrir_portal(u, VAL); desplazar(u, 5)
# 4. Pago voluntario aceptado, boleta emitida pendiente
u = labrar('multas', 'inspector', nombre='Valeria', apellido='Suárez', doc='30111222', ley_idx=(2,), calle=2, veh=2, dominio='A123BCD', email='valeria@example.com')
abrir_portal(u, VAL); p = presentar(u, VAL, 'pago_voluntario'); resolver(p, respuesta='Se emite la boleta de pago voluntario (50 %).'); desplazar(u, 4)
# 5. Pago informado, a verificar
u = labrar('multas', 'inspector', nombre='Martín', apellido='Gómez', doc='28999111', ley_idx=(2,), calle=3, veh=3, dominio='AC321KL', email='martin.gomez@example.com')
abrir_portal(u, MAR); p = presentar(u, MAR, 'pago_voluntario'); resolver(p)
for b in call('GET', f'/api/causa/{u}', AG)['boletas']:
    call('POST', '/api/portal/pagar', MAR, {'boletaUuid': b['uuid']})
desplazar(u, 8)
# 6. Pagada y archivada
u = labrar('multas', 'inspector', nombre='Martín', apellido='Gómez', doc='28999111', ley_idx=(1,), calle=1, veh=3, dominio='AC321KL', alcohol=0.21, email='martin.gomez@example.com')
abrir_portal(u, MAR); p = presentar(u, MAR, 'pago_voluntario'); resolver(p)
for b in call('GET', f'/api/causa/{u}', AG)['boletas']:
    call('POST', '/api/portal/pagar', MAR, {'boletaUuid': b['uuid']}); acc(u, 'confirmar_pago', boletaUuid=b['uuid'])
desplazar(u, 25)
# 7. Descargo pendiente en Presentaciones
u = labrar('multas', 'inspector', nombre='Valeria', apellido='Suárez', doc='30111222', ley_idx=(1,), calle=4, veh=2, dominio='A123BCD', email='valeria@example.com')
abrir_portal(u, VAL); presentar(u, VAL, 'descargo', 'No circulaba sin licencia: la tenía vigente y la exhibí al inspector. Adjunto copia de la licencia renovada el 02/09.'); desplazar(u, 3)
# 8. Descargo aceptado → Para fallo, con fallo en borrador
u = labrar('multas', 'inspector', nombre='Diego', apellido='Rodríguez', doc='30456987', ley_idx=(1, 2), calle=0, veh=1, dominio='AE567IJ', ret_lic=1, alcohol=0.86,
           obs='Alcoholemia positiva 0,86 g/l. Se retiene licencia y se labra acta.')
acc(u, 'presentacion_mesa', tipo='descargo', texto='El infractor comparece y manifiesta que el control no fue realizado correctamente.')
p = [x for x in call('GET', '/api/presentaciones?estado=pendiente', AG) if x['infraccion']['uuid'] == u][0]['uuid']; resolver(p, respuesta='Se tiene por presentado el descargo.')
escrito(u, 'FALLO_CONDENATORIO', ['Diez (10)', '20000', 'Según constancias del acta'], quedar='borrador'); desplazar(u, 12)
# 9. Fallo en revisión de la Directora
u = labrar('multas', 'inspector', nombre='Ana Lucía', apellido='Fernández', doc='35698741', ley_idx=(1,), calle=2, veh=4, dominio='AG890OP')
acc(u, 'cambiar_estado', estado='Descargo', motivo='Descargo presentado en mesa de entradas.')
escrito(u, 'FALLO_CONDENATORIO', ['Quince (15)', '30000', 'Según constancias del acta'], firmar_con=DIR, quedar='revision'); desplazar(u, 15)
# 10. Fallo notificado (plazo de apelación corriendo) y fallo vencido
for dni, nom, ape, dom, dias in [('33254781', 'Carolina', 'Díaz', 'AH901QR', 7), ('29587412', 'Roberto', 'Acuña', 'AJ123UV', 30)]:
    u = labrar('multas', 'inspector', nombre=nom, apellido=ape, doc=dni, ley_idx=(1,), calle=3, veh=0, dominio=dom)
    acc(u, 'cambiar_estado', estado='Descargo', motivo='Descargo presentado en mesa de entradas.')
    escrito(u, 'FALLO_CONDENATORIO', ['Quince (15)', '30000', 'Según constancias del acta'], firmar_con=DIR, notificar=True)
    sql(f"update infraccion set estado_faltas='Fallo notificado', notificada_at=coalesce(notificada_at,{ahora}), vence_plazo_at={ahora}+5*{DIA} where uuid='{u}'")
    desplazar(u, dias)
# 11. Plan de cuotas con una cuota vencida
u = labrar('multas', 'inspector', nombre='Silvia', apellido='Pérez', doc='34785269', ley_idx=(1, 2), calle=1, veh=0, dominio='AK234WX')
acc(u, 'emitir_boleta', modo='cuotas', cuotas=3, aNombre='Silvia Pérez')
sql(f"update infraccion set estado_faltas='Cuotas' where uuid='{u}'"); desplazar(u, 50)
# 12. Retención de vehículo con resolución de medida firmada, en depósito
u = labrar('multas', 'inspector', nombre='Juan Carlos', apellido='Gómez', doc='27125998', ley_idx=(1,), calle=1, veh=5, dominio='AA222BB', ret_veh=1, ret_lic=1,
           obs='Camión sin licencia profesional vigente. Se retiene el vehículo y la licencia.')
escrito(u, 'RESOLUCION_MEDIDA_PREVENTIVA', ['Retención del vehículo dominio AA222BB'], firmar_con=DIR, notificar=True) if 'RESOLUCION_MEDIDA_PREVENTIVA' in PLANT else None
desplazar(u, 10)
# 13. Gestión externa: en Apremios y en Juzgado de Paz
for dni, nom, ape, dom, destino, dias in [('30124578', 'María Fernanda', 'López', 'AL345YZ', 'apremios', 95), ('27589631', 'Roberto', 'Acuña', 'AM456AB', 'juzgado', 70)]:
    u = labrar('multas', 'inspector', nombre=nom, apellido=ape, doc=dni, ley_idx=(1,), calle=0, veh=3, dominio=dom)
    acc(u, 'cambiar_estado', estado='Fallo notificado', motivo='Fallo notificado en mesa.')
    acc(u, 'derivar', destino=destino, detalle='Vencido el plazo sin pago ni apelación.' if destino == 'apremios' else 'Apelación concedida.')
    desplazar(u, dias)
# 14. Desestimada y prescripta
u = labrar('multas', 'inspector', nombre='Hernán', apellido='Villalba', doc='31654987', ley_idx=(2,), calle=2, veh=4, dominio='AN567CD')
acc(u, 'desestimar', motivo='Error en la identificación del dominio: el vehículo fotografiado no coincide.'); desplazar(u, 40)
u = labrar('multas', 'inspector', nombre='Elena', apellido='Ruiz', doc='26345871', ley_idx=(2,), calle=4, veh=0, dominio='AO678EF')
acc(u, 'archivar', motivo='Archivo prescripción', detalle='Transcurrido el plazo de prescripción sin actuaciones.'); desplazar(u, 120)

# ---- Contravenciones (Abogada)
u = labrar('contravenciones', 'inspector_contrav', juridica=('Ferretería El Tornillo S.R.L.', '30-71234567-9', 'Venta de artículos de ferretería'), ley_idx=(0,), calle=2,
           medidas=['Clausura preventiva'], obs='Ruidos molestos por uso de amoladoras fuera de horario. Se dispone clausura preventiva.', email='administracion@eltornillo.com.ar')
escrito(u, 'RESOLUCION_MEDIDA_PREVENTIVA', ['Clausura preventiva del local'], tok=AG, firmar_con=ABO, notificar=True) if 'RESOLUCION_MEDIDA_PREVENTIVA' in PLANT else None
desplazar(u, 6)
u = labrar('contravenciones', 'inspector_contrav', juridica=('Estación de Servicio Patria S.A.', '30-69874123-4', 'Expendio de combustibles'), ley_idx=(0,), calle=1,
           obs='Música a alto volumen en horario nocturno, constatado con decibelímetro (78 dB).'); desplazar(u, 3)
u = labrar('contravenciones', 'inspector_contrav', nombre='Patricia', apellido='Ledesma', doc='28459632', ley_idx=(0,), calle=3,
           obs='Fiesta en domicilio particular con ruidos molestos después de las 23 h. Reiteradas denuncias vecinales.')
acc(u, 'presentacion_mesa', tipo='descargo', texto='Se trató de un evento familiar aislado; solicito se considere la buena conducta previa.')
p = [x for x in call('GET', '/api/presentaciones?estado=pendiente', AG) if x['infraccion']['uuid'] == u][0]['uuid']; resolver(p, respuesta='Se tiene por presentado.')
escrito(u, 'FALLO_ABSOLUTORIO', ['Según constancias'], firmar_con=ABO, notificar=True)
acc(u, 'archivar', motivo='Archivo absolución', detalle='Fallo absolutorio firme.'); desplazar(u, 35)
u = labrar('contravenciones', 'inspector_contrav', juridica=('Comercio Don Pedro', '20-25874136-5', 'Almacén y despensa'), ley_idx=(0,), calle=4,
           obs='Equipos de refrigeración con ruido excesivo hacia la vivienda lindera.')
acc(u, 'espera_respuesta', detalle='Se solicita a Inspecciones Generales informe sobre la habilitación del local.'); desplazar(u, 9)
# ---- Sustancias alimenticias
u = labrar('sustancias', 'inspector_contrav', juridica=('Distribuidora Norte S.A.', '30-70456321-8', 'Transporte de alimentos'), ley_idx=(0,), calle=5,
           medidas=['Decomiso'], obs='Se constata transporte de carne sin refrigeración. Se procede al decomiso de la mercadería.'); desplazar(u, 4)

# ---- Borradores (uno por inspector)
b = call('POST', '/api/acta/iniciar', INS, {'tipo': 'multas'})
b.update({'domicilioInfraccionCalle': 'Av. Pte. Perón', 'domicilioInfraccionNumero': '3300', 'vehiculoNumeroDominio': 'AP789GH', 'vehiculoTipoNombre': 'Automóvil'})
call('POST', '/api/infraccion/save', INS, b)
call('POST', '/api/acta/iniciar', INC, {'tipo': 'contravenciones'})

print('Capturando como snapshot «default»…')
print(sql("select sandbox_capturar('default', 'Blue Open Data')"))
print(sql("select estado_faltas, count(*) from infraccion group by 1 order by 1"))
