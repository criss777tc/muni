import re
import os
import datetime
import time
import hashlib
import secrets
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pymysql

app = Flask(__name__)
CORS(app)


# ==========================================================
# ARCHIVOS DEL PANEL DE ADMINISTRACIÓN
# ==========================================================

@app.route("/")
def inicio():
    return send_from_directory(".", "admin2.html")


@app.route("/admin2.js")
def admin2_js():
    return send_from_directory(".", "admin2.js")


@app.route("/adminmuni.html")
def adminmuni_html():
    return send_from_directory(".", "adminmuni.html")


@app.route("/adminmuni.js")
def adminmuni_js_file():
    return send_from_directory(".", "adminmuni.js")


@app.route("/adminmuni.css")
def adminmuni_css_file():
    return send_from_directory(".", "adminmuni.css")


@app.route("/admin2.html")
def dashboard():
    return send_from_directory(".", "admin2.html")


@app.route("/admin2.js")
def dashboard_js():
    return send_from_directory(".", "admin2.js")


@app.route("/admin2.css")
def dashboard_css():
    return send_from_directory(".", "admin2.css")


# ==========================================================
# CONFIGURACIÓN DE LA BASE DE DATOS
# ==========================================================

def conectar_bd():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="cristian7",
        database="muni_db",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )


# ==========================================================
# CONFIGURACIÓN DE ARCHIVOS (IMÁGENES)
# ==========================================================

CARPETA_IMAGENES = "static/imagenes"
os.makedirs(CARPETA_IMAGENES, exist_ok=True)

EXTENSIONES_PERMITIDAS = {"png", "jpg", "jpeg", "gif", "webp"}


def extension_valida(nombre_archivo):
    return "." in nombre_archivo and \
        nombre_archivo.rsplit(".", 1)[1].lower() in EXTENSIONES_PERMITIDAS


def guardar_imagen(archivo):
    """Guarda el archivo en disco y devuelve la ruta relativa para la BD (o None)."""
    if archivo and archivo.filename and extension_valida(archivo.filename):
        nombre_seguro = secure_filename(archivo.filename)
        nombre_final = f"{int(time.time())}_{secrets.token_hex(4)}_{nombre_seguro}"
        ruta_completa = os.path.join(CARPETA_IMAGENES, nombre_final)
        archivo.save(ruta_completa)
        return ruta_completa.replace("\\", "/")
    return None


def borrar_imagen(ruta):
    """Elimina del disco la imagen asociada a un registro de forma segura."""
    if ruta and not ruta.startswith("http"):
        try:
            ruta_completa = ruta.replace("/", os.sep)
            if os.path.exists(ruta_completa):
                os.remove(ruta_completa)
        except Exception as e:
            print(f"Aviso al borrar imagen {ruta}: {e}")


def validar_fecha_registro(fecha_str, max_dias_pasado=0, campo="fecha"):
    """
    Verifica que la fecha tenga formato válido y no sea anterior al límite permitido:
    - Noticias: retención de 30 días (permite hasta 30 días en el pasado).
    - Eventos: retención de 7 días (permite hasta 7 días en el pasado).
    """
    if not fecha_str:
        return False, f"El campo {campo} es obligatorio"
    try:
        fecha = datetime.date.fromisoformat(fecha_str.split('T')[0])
        hoy = datetime.date.today()
        limite_pasado = hoy - datetime.timedelta(days=max_dias_pasado)
        if fecha < limite_pasado:
            return False, f"La fecha no puede ser anterior a {max_dias_pasado} días atrás ({limite_pasado.isoformat()})"
        return True, None
    except ValueError:
        return False, "Formato de fecha inválido (usar AAAA-MM-DD)"


def normalizar_fechas_json(registros):
    """Devuelve las fechas como AAAA-MM-DD, sin conversión de zona horaria."""
    for registro in registros:
        for campo, valor in registro.items():
            if isinstance(valor, datetime.datetime):
                registro[campo] = valor.date().isoformat()
            elif isinstance(valor, datetime.date):
                registro[campo] = valor.isoformat()
    return registros


def limpiar_expirados(tabla):
    """
    Elimina de la BD los registros cuya fecha superó el período de retención:
    - Noticias: se conservan durante 30 días tras su fecha.
    - Eventos: se conservan durante 7 días tras su fecha.
    También borra las imágenes asociadas del disco de forma segura.
    """
    if tabla not in TABLAS:
        return

    cfg = TABLAS[tabla]
    col_fecha = cfg["cols"]["fecha"]
    col_imagen = cfg["cols"]["imagen"]
    pk = cfg["pk"]
    dias = cfg.get("dias_retencion", 7)
    fecha_limite = (datetime.date.today() - datetime.timedelta(days=dias)).isoformat()

    conexion = None
    try:
        conexion = conectar_bd()
        with conexion.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT {pk} AS id, {col_imagen} AS imagen
                FROM {tabla}
                WHERE {col_fecha} IS NOT NULL
                  AND {col_fecha} < %s
                """,
                (fecha_limite,)
            )
            expirados = cursor.fetchall()

            if expirados:
                for fila in expirados:
                    borrar_imagen(fila["imagen"])

                ids = [fila["id"] for fila in expirados]
                placeholders = ", ".join(["%s"] * len(ids))
                cursor.execute(
                    f"DELETE FROM {tabla} WHERE {pk} IN ({placeholders})",
                    ids
                )
                conexion.commit()
                print(
                    f">>> Limpieza: {len(expirados)} registro(s) "
                    f"expirado(s) eliminado(s) de '{tabla}' (retención: {dias} días)"
                )
    except Exception as e:
        print(f"Error en limpieza de '{tabla}':", e)
    finally:
        if conexion:
            conexion.close()


# ==========================================================
# AUTENTICACIÓN DEL ADMINISTRADOR
# ==========================================================

# Tokens de sesión activos.
# Se pierden cuando se reinicia Flask.
SESIONES = {}


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def crear_tabla_usuarios():
    """Crea la tabla users si no existe."""
    
    conexion = None

    try:
        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(64) NOT NULL
                )
            """)

        conexion.commit()

    except Exception as e:

        print("Error inicializando usuarios:", e)

    finally:

        if conexion:
            conexion.close()


def autenticado():
    """
    Comprueba si el request contiene un token válido.
    """

    auth = request.headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        return False

    token = auth.replace("Bearer ", "").strip()

    return token in SESIONES


# ==========================================================
# LOGIN
# ==========================================================


@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    usuario = data.get("usuario", "").strip()
    password = data.get("password", "")

    # Comprobar que se enviaron ambos campos
    if not usuario or not password:
        return jsonify({
            "ok": False,
            "error": "Usuario y contraseña son obligatorios"
        }), 400

    conexion = None

    try:

        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute(
                """
                SELECT id, usuario, password_hash
                FROM users
                WHERE usuario = %s
                """,
                (usuario,)
            )

            user = cursor.fetchone()

    except Exception as e:

        print("Error en login:", e)

        return jsonify({
            "ok": False,
            "error": "Error del servidor"
        }), 500

    finally:

        if conexion:
            conexion.close()

    # Usuario inexistente o contraseña incorrecta
    if not user or user["password_hash"] != hash_password(password):

        return jsonify({
            "ok": False,
            "error": "Usuario o contraseña incorrectos"
        }), 401

    # Crear token
    token = secrets.token_hex(32)

    # Guardar sesión
    SESIONES[token] = user["id"]

    print(f">>> Login correcto: {usuario}")

    return jsonify({
        "ok": True,
        "token": token,
        "usuario": user["usuario"]
    }), 200


# ==========================================================
# LOGOUT
# ==========================================================

@app.route("/api/logout", methods=["POST"])
def logout():

    auth = request.headers.get("Authorization", "")

    if auth.startswith("Bearer "):

        token = auth.replace("Bearer ", "").strip()

        # Eliminar la sesión
        SESIONES.pop(token, None)

    return jsonify({
        "ok": True,
        "mensaje": "Sesión cerrada"
    }), 200


# ==========================================================
# VERIFICACIÓN DE SESIÓN ACTIVA
# ==========================================================

@app.route("/api/verificar-sesion", methods=["GET"])
def verificar_sesion():
    if not autenticado():
        return jsonify({
            "ok": False,
            "error": "No autorizado o sesión expirada"
        }), 401

    return jsonify({
        "ok": True,
        "mensaje": "Sesión válida"
    }), 200


# ==========================================================
# CONFIG DE TABLAS
# ==========================================================

TABLAS = {
    "noticias": {
        "pk": "id",
        "dias_retencion": 30,
        "cols": {
            "nombre": "nombre",
            "imagen": "imagen",
            "descripcion": "descripcion",
            "fecha": "fecha"
        }
    },
    "eventos": {
        "pk": "id_eventos",
        "dias_retencion": 7,
        "cols": {
            "nombre": "nombre_eventos",
            "imagen": "imagen_eventos",
            "descripcion": "descripcion_eventos",
            "fecha": "fecha_eventos",
            "ubicacion": "ubicacion_eventos"
        }
    }
}


# ==========================================================
# NOTICIAS
# ==========================================================

@app.route("/api/noticias", methods=["GET"])
def obtener_noticias():

    # Limpiar registros expirados antes de devolver datos
    limpiar_expirados("noticias")

    conexion = None

    try:

        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute(
                """
                SELECT id, nombre, imagen, descripcion, fecha
                FROM noticias
                """
            )

            resultados = cursor.fetchall()

        return jsonify(normalizar_fechas_json(resultados)), 200

    except Exception as e:

        print("Error al obtener noticias:", e)

        return jsonify({
            "error": "No se pudieron obtener las noticias"
        }), 500

    finally:

        if conexion:
            conexion.close()


@app.route("/api/noticias", methods=["POST"])
def crear_noticia():

    if not autenticado():
        return jsonify({"error": "No autorizado"}), 401

    nombre = request.form.get("nombre")
    descripcion = request.form.get("descripcion")
    fecha = request.form.get("fecha")
    imagen_archivo = request.files.get("imagen")

    if not nombre or not descripcion:
        return jsonify({
            "error": "nombre y descripcion son obligatorios"
        }), 400

    # Validar que la fecha no sea pasada
    fecha_ok, fecha_error = validar_fecha_registro(fecha, max_dias_pasado=30, campo="fecha")
    if not fecha_ok:
        return jsonify({"error": fecha_error}), 400

    ruta_imagen = guardar_imagen(imagen_archivo)

    conexion = None

    try:

        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO noticias
                (nombre, imagen, descripcion, fecha)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    nombre,
                    ruta_imagen,
                    descripcion,
                    fecha
                )
            )

        conexion.commit()

        return jsonify({
            "mensaje": "Noticia creada correctamente"
        }), 201

    except Exception as e:

        print("Error al crear noticia:", e)

        return jsonify({
            "error": "No se pudo guardar la noticia"
        }), 500

    finally:

        if conexion:
            conexion.close()


# ==========================================================
# EVENTOS
# ==========================================================

@app.route("/api/eventos", methods=["GET"])
def obtener_eventos():

    # Limpiar registros expirados antes de devolver datos
    limpiar_expirados("eventos")

    conexion = None

    try:

        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id_eventos AS id,
                    nombre_eventos AS nombre,
                    imagen_eventos AS imagen,
                    descripcion_eventos AS descripcion,
                    fecha_eventos AS fecha,
                    ubicacion_eventos AS ubicacion
                FROM eventos
                ORDER BY fecha_eventos DESC
                """
            )

            resultados = cursor.fetchall()

        return jsonify(normalizar_fechas_json(resultados)), 200

    except Exception as e:

        print("Error al obtener eventos:", e)

        return jsonify({
            "error": "No se pudieron obtener los eventos"
        }), 500

    finally:

        if conexion:
            conexion.close()


@app.route("/api/eventos", methods=["POST"])
def crear_evento():

    if not autenticado():
        return jsonify({"error": "No autorizado"}), 401

    nombre = request.form.get("nombre")
    descripcion = request.form.get("descripcion")
    fecha = request.form.get("fecha")
    ubicacion = request.form.get("ubicacion_eventos", request.form.get("ubicacion_evento", ""))
    imagen_archivo = request.files.get("imagen")

    if not nombre or not descripcion:
        return jsonify({
            "error": "nombre y descripcion son obligatorios"
        }), 400

    # Validar que la fecha no sea pasada
    fecha_ok, fecha_error = validar_fecha_registro(fecha, max_dias_pasado=7, campo="fecha")
    if not fecha_ok:
        return jsonify({"error": fecha_error}), 400

    ruta_imagen = guardar_imagen(imagen_archivo)

    conexion = None

    try:

        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO eventos
                (
                    nombre_eventos,
                    imagen_eventos,
                    descripcion_eventos,
                    fecha_eventos,
                    ubicacion_eventos
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    nombre,
                    ruta_imagen,
                    descripcion,
                    fecha,
                    ubicacion
                )
            )

        conexion.commit()

        return jsonify({
            "mensaje": "Evento creado correctamente"
        }), 201

    except Exception as e:

        print("Error al crear evento:", e)

        return jsonify({
            "error": "No se pudo guardar el evento"
        }), 500

    finally:

        if conexion:
            conexion.close()



# ==========================================================
# CURSOS Y CURSO_IMAGENES
# ==========================================================

def crear_tabla_cursos():
    """Crea las tablas cursos y curso_imagenes si no existen."""
    conexion = None
    try:
        conexion = conectar_bd()
        with conexion.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cursos (
                    id_curso INT AUTO_INCREMENT PRIMARY KEY,
                    nombre_curso VARCHAR(150) NOT NULL,
                    descripcion_curso TEXT,
                    duracion_curso VARCHAR(100),
                    fecha_inicio DATE,
                    coste_inscripcion VARCHAR(100)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS curso_imagenes (
                    id_imagen INT AUTO_INCREMENT PRIMARY KEY,
                    id_curso INT NOT NULL,
                    ruta_imagen VARCHAR(255) NOT NULL,
                    orden INT DEFAULT 0,
                    FOREIGN KEY (id_curso) REFERENCES cursos(id_curso) ON DELETE CASCADE
                )
            """)
        conexion.commit()
    except Exception as e:
        print("Error inicializando tablas de cursos:", e)
    finally:
        if conexion:
            conexion.close()


def calcular_dias_duracion(duracion_str):
    """Calcula los días estimados de duración a partir del texto ingresado."""
    if not duracion_str:
        return 30
    texto = str(duracion_str).lower().strip()

    if any(k in texto for k in ["permanente", "indefinido", "sin limite", "continuo"]):
        return 365 * 5  # 5 años para cursos permanentes
    if any(k in texto for k in ["anual", "año", "ano", "year"]):
        match_anios = re.search(r'(\d+(?:[\.,]\d+)?)\s*(?:año|años|ano|anos|year)', texto)
        if match_anios:
            return int(float(match_anios.group(1).replace(',', '.')) * 365)
        return 365
    if "semestral" in texto:
        return 180
    if "trimestral" in texto:
        return 90

    dias_totales = 0
    match_meses = re.search(r'(\d+(?:[\.,]\d+)?)\s*(?:mes|meses)', texto)
    if match_meses:
        val = float(match_meses.group(1).replace(',', '.'))
        dias_totales += int(val * 30)

    match_semanas = re.search(r'(\d+(?:[\.,]\d+)?)\s*(?:semana|semanas|sem)', texto)
    if match_semanas:
        val = float(match_semanas.group(1).replace(',', '.'))
        dias_totales += int(val * 7)

    match_dias = re.search(r'(\d+(?:[\.,]\d+)?)\s*(?:dia|dias|día|días)', texto)
    if match_dias:
        val = float(match_dias.group(1).replace(',', '.'))
        dias_totales += int(val)

    match_horas = re.search(r'(\d+(?:[\.,]\d+)?)\s*(?:hora|horas|hr|hrs|hs)', texto)
    if match_horas and dias_totales == 0:
        val = float(match_horas.group(1).replace(',', '.'))
        dias_totales += max(1, int(val / 4))

    if dias_totales == 0:
        match_numero = re.search(r'^(\d+)$', texto)
        if match_numero:
            dias_totales = int(match_numero.group(1))

    return dias_totales if dias_totales > 0 else 30


def limpiar_cursos_vencidos(conexion):
    """
    Elimina automáticamente los cursos que ya finalizaron hace más de 7 días.
    También borra físicamente sus imágenes del servidor.
    """
    hoy = datetime.date.today()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("""
                SELECT id_curso, duracion_curso, fecha_inicio
                FROM cursos
                WHERE fecha_inicio IS NOT NULL
            """)
            cursos = cursor.fetchall()

            cursos_a_eliminar = []
            for c in cursos:
                f_inicio = c.get("fecha_inicio")
                if not f_inicio:
                    continue
                if isinstance(f_inicio, str):
                    try:
                        f_inicio = datetime.date.fromisoformat(f_inicio.split('T')[0])
                    except Exception:
                        continue
                dias_dur = calcular_dias_duracion(c.get("duracion_curso"))
                f_fin = f_inicio + datetime.timedelta(days=dias_dur)
                f_limite = f_fin + datetime.timedelta(days=7)

                # Si hoy superó la fecha de fin + 7 días, se elimina automáticamente
                if hoy > f_limite:
                    cursos_a_eliminar.append(c["id_curso"])

            if cursos_a_eliminar:
                for cid in cursos_a_eliminar:
                    cursor.execute("SELECT ruta_imagen FROM curso_imagenes WHERE id_curso = %s", (cid,))
                    imgs = cursor.fetchall()
                    cursor.execute("DELETE FROM cursos WHERE id_curso = %s", (cid,))
                    for img in imgs:
                        borrar_imagen(img["ruta_imagen"])
                conexion.commit()
                print(f"[Cursos] Se eliminaron automáticamente {len(cursos_a_eliminar)} curso(s) vencido(s) (>7 días de finalizados).")
    except Exception as e:
        print("Error en limpiar_cursos_vencidos:", e)


@app.route("/api/cursos", methods=["GET"])
def obtener_cursos():
    conexion = None
    try:
        conexion = conectar_bd()

        # Limpiar automáticamente cursos que finalizaron hace más de 7 días
        limpiar_cursos_vencidos(conexion)

        with conexion.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    id_curso,
                    nombre_curso,
                    descripcion_curso,
                    duracion_curso,
                    fecha_inicio,
                    fecha_inicio AS `fecha de inicio`,
                    coste_inscripcion
                FROM cursos
                ORDER BY id_curso DESC
            """)
            cursos = cursor.fetchall()

            cursor.execute("""
                SELECT id_imagen, id_curso, ruta_imagen, orden
                FROM curso_imagenes
                ORDER BY orden ASC, id_imagen ASC
            """)
            todas_imagenes = cursor.fetchall()

            imagenes_por_curso = {}
            for img in todas_imagenes:
                cid = img["id_curso"]
                if cid not in imagenes_por_curso:
                    imagenes_por_curso[cid] = []
                imagenes_por_curso[cid].append(img["ruta_imagen"])

            hoy = datetime.date.today()

            for c in cursos:
                c["imagenes"] = imagenes_por_curso.get(c["id_curso"], [])
                c["imagen"] = c["imagenes"][0] if c["imagenes"] else None

                f_inicio = c.get("fecha_inicio")
                dur_str = c.get("duracion_curso") or ""
                dias_dur = calcular_dias_duracion(dur_str)

                estado = "en_curso"
                estado_texto = "En curso"
                dias_para_inicio = None

                if f_inicio:
                    if isinstance(f_inicio, str):
                        try:
                            f_inicio_date = datetime.date.fromisoformat(f_inicio.split('T')[0])
                        except Exception:
                            f_inicio_date = hoy
                    else:
                        f_inicio_date = f_inicio

                    dias_para_inicio = (f_inicio_date - hoy).days
                    f_fin = f_inicio_date + datetime.timedelta(days=dias_dur)

                    if hoy < f_inicio_date:
                        estado = "proximo"
                        if dias_para_inicio == 1:
                            estado_texto = "Empieza en 1 día"
                        else:
                            estado_texto = f"Empieza en {dias_para_inicio} días"
                    elif hoy <= f_fin:
                        estado = "en_curso"
                        estado_texto = "En curso"
                    else:
                        estado = "finalizado"
                        estado_texto = "Finalizado"

                c["estado"] = estado
                c["estado_texto"] = estado_texto
                c["dias_para_inicio"] = dias_para_inicio

                if c.get("fecha_inicio") and hasattr(c["fecha_inicio"], "isoformat"):
                    c["fecha_inicio"] = c["fecha_inicio"].isoformat()
                    c["fecha de inicio"] = c["fecha_inicio"]

        return jsonify(normalizar_fechas_json(cursos)), 200
    except Exception as e:
        print("Error al obtener cursos:", e)
        return jsonify({"error": "No se pudieron obtener los cursos"}), 500
    finally:
        if conexion:
            conexion.close()


@app.route("/api/cursos", methods=["POST"])
def crear_curso():
    if not autenticado():
        return jsonify({"error": "No autorizado"}), 401

    nombre = request.form.get("nombre_curso") or request.form.get("nombre")
    descripcion = request.form.get("descripcion_curso") or request.form.get("descripcion") or ""
    duracion = request.form.get("duracion_curso") or request.form.get("duracion") or ""
    fecha_inicio = request.form.get("fecha_inicio") or request.form.get("fecha de inicio") or request.form.get("fecha")
    coste = request.form.get("coste_inscripcion") or request.form.get("coste") or request.form.get("costo") or ""

    if not nombre:
        return jsonify({"error": "El nombre del curso es obligatorio"}), 400

    if not fecha_inicio:
        return jsonify({"error": "La fecha de inicio del curso es obligatoria"}), 400

    try:
        f_ini = datetime.date.fromisoformat(fecha_inicio.split('T')[0])
        dias_dur = calcular_dias_duracion(duracion)
        f_fin = f_ini + datetime.timedelta(days=dias_dur)
        f_limite = f_fin + datetime.timedelta(days=7)
        if datetime.date.today() > f_limite:
            return jsonify({
                "error": f"El curso ya finalizó hace más de 7 días (finalizó el {f_fin.isoformat()}) y no puede ser creado con esa fecha."
            }), 400
    except ValueError:
        return jsonify({"error": "Formato de fecha de inicio inválido (usar AAAA-MM-DD)"}), 400

    archivos = request.files.getlist("imagenes")
    if not archivos:
        archivos = request.files.getlist("imagen")
    if not archivos and request.files.get("imagen"):
        archivos = [request.files.get("imagen")]

    rutas_imagenes = []
    for archivo in archivos:
        if archivo and archivo.filename:
            ruta = guardar_imagen(archivo)
            if ruta:
                rutas_imagenes.append(ruta)

    conexion = None
    try:
        conexion = conectar_bd()
        with conexion.cursor() as cursor:
            cursor.execute("""
                INSERT INTO cursos
                (nombre_curso, descripcion_curso, duracion_curso, fecha_inicio, coste_inscripcion)
                VALUES (%s, %s, %s, %s, %s)
            """, (nombre, descripcion, duracion, fecha_inicio if fecha_inicio else None, coste))
            id_curso = cursor.lastrowid

            for orden, ruta in enumerate(rutas_imagenes):
                cursor.execute("""
                    INSERT INTO curso_imagenes (id_curso, ruta_imagen, orden)
                    VALUES (%s, %s, %s)
                """, (id_curso, ruta, orden))

        conexion.commit()
        return jsonify({
            "mensaje": "Curso creado correctamente",
            "id_curso": id_curso
        }), 201
    except Exception as e:
        print("Error al crear curso:", e)
        return jsonify({"error": "No se pudo guardar el curso"}), 500
    finally:
        if conexion:
            conexion.close()


@app.route("/api/cursos/<int:id_curso>", methods=["PUT"])
def actualizar_curso(id_curso):
    if not autenticado():
        return jsonify({"error": "No autorizado"}), 401

    nombre = request.form.get("nombre_curso") or request.form.get("nombre")
    descripcion = request.form.get("descripcion_curso") or request.form.get("descripcion") or ""
    duracion = request.form.get("duracion_curso") or request.form.get("duracion") or ""
    fecha_inicio = request.form.get("fecha_inicio") or request.form.get("fecha de inicio") or request.form.get("fecha")
    coste = request.form.get("coste_inscripcion") or request.form.get("coste") or request.form.get("costo") or ""
    reemplazar = request.form.get("reemplazar_imagenes", "false").lower() in ("true", "1")

    if not nombre:
        return jsonify({"error": "El nombre del curso es obligatorio"}), 400

    if not fecha_inicio:
        return jsonify({"error": "La fecha de inicio del curso es obligatoria"}), 400

    try:
        f_ini = datetime.date.fromisoformat(fecha_inicio.split('T')[0])
        dias_dur = calcular_dias_duracion(duracion)
        f_fin = f_ini + datetime.timedelta(days=dias_dur)
        f_limite = f_fin + datetime.timedelta(days=7)
        if datetime.date.today() > f_limite:
            return jsonify({
                "error": f"El curso ya finalizó hace más de 7 días (finalizó el {f_fin.isoformat()}) y no puede ser actualizado con esa fecha."
            }), 400
    except ValueError:
        return jsonify({"error": "Formato de fecha de inicio inválido (usar AAAA-MM-DD)"}), 400

    archivos = request.files.getlist("imagenes")
    if not archivos:
        archivos = request.files.getlist("imagen")
    if not archivos and request.files.get("imagen"):
        archivos = [request.files.get("imagen")]

    rutas_nuevas = []
    for archivo in archivos:
        if archivo and archivo.filename:
            ruta = guardar_imagen(archivo)
            if ruta:
                rutas_nuevas.append(ruta)

    conexion = None
    try:
        conexion = conectar_bd()
        with conexion.cursor() as cursor:
            cursor.execute("""
                UPDATE cursos
                SET nombre_curso = %s,
                    descripcion_curso = %s,
                    duracion_curso = %s,
                    fecha_inicio = %s,
                    coste_inscripcion = %s
                WHERE id_curso = %s
            """, (nombre, descripcion, duracion, fecha_inicio if fecha_inicio else None, coste, id_curso))

            if reemplazar and rutas_nuevas:
                cursor.execute("SELECT ruta_imagen FROM curso_imagenes WHERE id_curso = %s", (id_curso,))
                viejas = cursor.fetchall()
                for v in viejas:
                    borrar_imagen(v["ruta_imagen"])
                cursor.execute("DELETE FROM curso_imagenes WHERE id_curso = %s", (id_curso,))

            if rutas_nuevas:
                cursor.execute("SELECT COALESCE(MAX(orden), 0) + 1 AS sig FROM curso_imagenes WHERE id_curso = %s", (id_curso,))
                row_sig = cursor.fetchone()
                sig_orden = row_sig["sig"] if row_sig else 0
                for i, ruta in enumerate(rutas_nuevas):
                    cursor.execute("""
                        INSERT INTO curso_imagenes (id_curso, ruta_imagen, orden)
                        VALUES (%s, %s, %s)
                    """, (id_curso, ruta, sig_orden + i))

        conexion.commit()
        return jsonify({"mensaje": "Curso actualizado correctamente"}), 200
    except Exception as e:
        print("Error al actualizar curso:", e)
        return jsonify({"error": "No se pudo actualizar el curso"}), 500
    finally:
        if conexion:
            conexion.close()


@app.route("/api/cursos/<int:id_curso>", methods=["DELETE"])
def eliminar_curso(id_curso):
    if not autenticado():
        return jsonify({"error": "No autorizado"}), 401

    conexion = None
    try:
        conexion = conectar_bd()
        with conexion.cursor() as cursor:
            cursor.execute("SELECT ruta_imagen FROM curso_imagenes WHERE id_curso = %s", (id_curso,))
            imagenes = cursor.fetchall()

            cursor.execute("DELETE FROM cursos WHERE id_curso = %s", (id_curso,))

        conexion.commit()

        for img in imagenes:
            borrar_imagen(img["ruta_imagen"])

        return jsonify({"mensaje": "Curso eliminado correctamente"}), 200
    except Exception as e:
        print("Error al eliminar curso:", e)
        return jsonify({"error": "No se pudo eliminar el curso"}), 500
    finally:
        if conexion:
            conexion.close()


# ==========================================================
# EDITAR / ELIMINAR
# ==========================================================

@app.route("/api/<tabla>/<int:item_id>", methods=["PUT"])
def actualizar_item(tabla, item_id):

    if tabla not in TABLAS:
        return jsonify({"error": "Ruta no válida"}), 404

    if not autenticado():
        return jsonify({"error": "No autorizado"}), 401

    cfg = TABLAS[tabla]
    c = cfg["cols"]

    nombre = request.form.get("nombre")
    descripcion = request.form.get("descripcion")
    fecha = request.form.get("fecha")
    imagen_archivo = request.files.get("imagen")

    # Al editar, un campo de fecha vacío significa "conservar la fecha actual".
    # Así un formulario incompleto no elimina accidentalmente este dato.
    if not fecha:
        conexion_fecha = None
        try:
            conexion_fecha = conectar_bd()
            with conexion_fecha.cursor() as cursor:
                cursor.execute(
                    f"SELECT {c['fecha']} FROM {tabla} WHERE {cfg['pk']} = %s",
                    (item_id,)
                )
                registro_actual = cursor.fetchone()

            if registro_actual:
                fecha_actual = registro_actual.get(c["fecha"])
                if hasattr(fecha_actual, "isoformat"):
                    fecha_actual = fecha_actual.isoformat()
                fecha = fecha_actual
        finally:
            if conexion_fecha:
                conexion_fecha.close()

    if not nombre or not descripcion:
        return jsonify({
            "error": "nombre y descripcion son obligatorios"
        }), 400

    # Validar que la fecha no sea pasada
    fecha_ok, fecha_error = validar_fecha_registro(fecha, max_dias_pasado=cfg.get("dias_retencion", 7), campo="fecha")
    if not fecha_ok:
        return jsonify({"error": fecha_error}), 400

    sets = [
        f"{c['nombre']} = %s",
        f"{c['descripcion']} = %s",
        f"{c['fecha']} = %s"
    ]

    params = [
        nombre,
        descripcion,
        fecha
    ]

    if c.get("ubicacion"):
        sets.append(f"{c['ubicacion']} = %s")
        params.append(request.form.get("ubicacion_eventos", request.form.get("ubicacion_evento", "")))

    if imagen_archivo and imagen_archivo.filename:

        ruta_imagen = guardar_imagen(imagen_archivo)

        if ruta_imagen:
            try:
                # Borrar imagen antigua del disco
                cursor_old = conexion.cursor() if conexion else None
                if not cursor_old:
                    conn_tmp = conectar_bd()
                    with conn_tmp.cursor() as cur_img:
                        cur_img.execute(f"SELECT {c['imagen']} FROM {tabla} WHERE {cfg['pk']} = %s", (item_id,))
                        old_row = cur_img.fetchone()
                        if old_row and old_row.get(c['imagen']):
                            borrar_imagen(old_row[c['imagen']])
                    conn_tmp.close()
            except Exception as e_img:
                print("Aviso al borrar imagen antigua:", e_img)

            sets.append(f"{c['imagen']} = %s")
            params.append(ruta_imagen)

    params.append(item_id)

    sql = f"""
        UPDATE {tabla}
        SET {', '.join(sets)}
        WHERE {cfg['pk']} = %s
    """

    conexion = None

    try:

        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute(sql, params)

        conexion.commit()

        return jsonify({
            "mensaje": "Actualizado correctamente"
        }), 200

    except Exception as e:

        print("Error al actualizar:", e)

        return jsonify({
            "error": "No se pudo actualizar"
        }), 500

    finally:

        if conexion:
            conexion.close()


@app.route("/api/<tabla>/<int:item_id>", methods=["DELETE"])
def eliminar_item(tabla, item_id):

    if tabla not in TABLAS:
        return jsonify({"error": "Ruta no válida"}), 404

    if not autenticado():
        return jsonify({"error": "No autorizado"}), 401

    cfg = TABLAS[tabla]
    c = cfg["cols"]

    conexion = None

    try:

        conexion = conectar_bd()

        with conexion.cursor() as cursor:

            cursor.execute(
                f"""
                SELECT {c['imagen']} AS imagen
                FROM {tabla}
                WHERE {cfg['pk']} = %s
                """,
                (item_id,)
            )

            fila = cursor.fetchone()

            if not fila:
                return jsonify({
                    "error": "No encontrado"
                }), 404

            cursor.execute(
                f"""
                DELETE FROM {tabla}
                WHERE {cfg['pk']} = %s
                """,
                (item_id,)
            )

        conexion.commit()

        borrar_imagen(fila["imagen"])

        return jsonify({
            "mensaje": "Eliminado correctamente"
        }), 200

    except Exception as e:

        print("Error al eliminar:", e)

        return jsonify({
            "error": "No se pudo eliminar"
        }), 500

    finally:

        if conexion:
            conexion.close()


# ==========================================================
# INICIO DEL SERVIDOR
# ==========================================================

if __name__ == "__main__":

    crear_tabla_usuarios()
    crear_tabla_cursos()

    app.run(
        debug=True,
        port=5000
    )
