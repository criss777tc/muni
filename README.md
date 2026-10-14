# 🏛️ Municipalidad de El Carril — Sitio Web Oficial

Sitio web institucional de la **Municipalidad de El Carril**, Salta, Argentina.  
Permite publicar noticias, eventos y servicios municipales de forma dinámica a través de un panel de administración protegido por autenticación.

---

## 📖 Descripción general

El sistema consta de dos partes principales:

| Parte | Descripción |
|---|---|
| **Sitio público** (`index.html`) | Portal ciudadano con noticias, eventos, servicios y widget del clima. Visible para todos. |
| **Panel de administración** (`adminmuni.html`) | Dashboard protegido con login para gestionar noticias y eventos (CRUD completo). |

El contenido dinámico (noticias y eventos) se obtiene en tiempo real desde una **API REST** construida en Python/Flask que persiste los datos en una base de datos local.

---

## 🏗️ Arquitectura del sistema

```
┌─────────────────────────────────────────────────┐
│                 NAVEGADOR (Cliente)              │
│                                                 │
│  ┌─────────────┐       ┌──────────────────────┐ │
│  │ index.html  │       │   adminmuni.html      │ │
│  │ (Público)   │       │   admin2.html (Login) │ │
│  │ script.js   │       │   adminmuni.js        │ │
│  │ style.css   │       │   adminmuni.css       │ │
│  └──────┬──────┘       └──────────┬───────────┘ │
│         │                         │              │
└─────────┼─────────────────────────┼──────────────┘
          │  fetch() / REST          │  fetch() + JWT
          ▼                         ▼
┌─────────────────────────────────────────────────┐
│           API REST — Flask (Python)             │
│           http://localhost:5000/api             │
│                                                 │
│  POST  /api/login                               │
│  GET   /api/verificar-sesion                    │
│  GET   /api/noticias                            │
│  POST  /api/noticias          (🔒 requiere JWT) │
│  PUT   /api/noticias/:id      (🔒 requiere JWT) │
│  DELETE /api/noticias/:id     (🔒 requiere JWT) │
│  GET   /api/eventos                             │
│  POST  /api/eventos           (🔒 requiere JWT) │
│  PUT   /api/eventos/:id       (🔒 requiere JWT) │
│  DELETE /api/eventos/:id      (🔒 requiere JWT) │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
             ┌────────────────┐
             │  Base de datos │
             │  (SQLite/otro) │
             └────────────────┘
```

---

## 📁 Estructura de archivos

```
muni/
│
├── index.html          # Sitio público principal
├── script.js           # Lógica del sitio público (carrusel, eventos, clima)
├── style.css           # Estilos del sitio público
│
├── admin2.html         # Página de login del panel de administración
├── admin2.js           # Lógica del formulario de login y manejo de sesión
├── admin2.css          # Estilos de la pantalla de login
│
├── adminmuni.html      # Dashboard de administración (CRUD)
├── adminmuni.js        # Lógica del panel admin (CRUD noticias y eventos)
├── adminmuni.css       # Estilos del panel de administración
│
├── imagenes/           # Carpeta de recursos estáticos
│   ├── logo1.png       # Logo municipal
│   ├── efrain_orosco.png  # Imagen del intendente (footer)
│   └── prueba10.mp4    # Video de fondo del hero
│
└── README.md           # Este archivo
```

> **Nota:** El backend (API Flask) vive en un repositorio o directorio separado. El frontend se conecta a él a través de `http://localhost:5000/api`.

---

## 🌐 Secciones del sitio público

### 🌡️ Widget del Clima
- Muestra temperatura, humedad, viento y estado del tiempo para **El Carril, Salta**.
- Fuente: [Open-Meteo](https://open-meteo.com/) (API gratuita, sin clave).
- Se actualiza automáticamente **cada 15 minutos** sin recargar la página.

### 📰 Carrusel de Noticias
- Carga todas las noticias desde `/api/noticias`, ordenadas por fecha descendente.
- Cada noticia es un slide con imagen de fondo, título, descripción y fecha.
- **Autoplay**: avanza automáticamente cada **4.5 segundos**.
- Al usar las flechas o los puntos de navegación, el autoplay se pausa y se reanuda **8 segundos** después.
- Navegación por flechas (`◀ ▶`) y puntos indicadores.

### 🛠️ Servicios Municipales
- Grilla de accesos rápidos a servicios: Registro Civil, Impuestos, Salud, Tránsito y Cursos.
- Los ítems pueden enlazar a páginas externas o secciones internas.

### 📅 Eventos / Novedades
- Collage dinámico estilo **1 tarjeta grande + hasta 4 tarjetas chicas**.
- La tarjeta grande muestra la imagen, nombre, descripción y **fecha** del evento destacado.
- Las tarjetas chicas solo muestran el nombre (sin fecha, para no saturar).
- Al hacer clic en una tarjeta chica, pasa al frente como destacada.
- Rotación automática cada **4.5 segundos**; se pausa al hacer hover.

### 🔗 Dropdown de Instituciones
- Menú desplegable en la barra de navegación con links a instituciones locales (Punto Digital, escuelas, IES).
- Se cierra al hacer clic fuera o al presionar `Escape`.

---

## 🔐 Panel de administración

El acceso está protegido con **autenticación JWT** (JSON Web Token).

### Flujo de autenticación

```
Usuario abre admin2.html
        │
        ▼
¿Hay token válido en localStorage?
  Sí → redirige a adminmuni.html
  No → muestra formulario de login
        │
        ▼
POST /api/login  { usuario, password }
        │
   res.ok → guarda token en localStorage
          → redirige a adminmuni.html
        │
   error → muestra mensaje de error
```

El token se almacena en `localStorage` bajo la clave `token`. Cada request al panel admin envía `Authorization: Bearer <token>` en el header.

### Funciones del dashboard

| Funcionalidad | Descripción |
|---|---|
| **Listar** | Muestra todos los registros en una tabla con paginación. |
| **Crear** | Formulario para agregar nuevas noticias o eventos con imagen. |
| **Editar** | Edita un registro existente; permite reemplazar la imagen. |
| **Eliminar** | Elimina con confirmación en modal para evitar borrados accidentales. |
| **Cambiar tab** | Alterna entre gestión de *Noticias* y *Eventos* desde la misma pantalla. |
| **Cerrar sesión** | Borra el token de localStorage y redirige al login. |

---

## 🔌 API REST (Backend)

El frontend consume una API REST corriendo en `http://localhost:5000`. A continuación los endpoints esperados:

### Autenticación

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/login` | ❌ | Recibe `{ usuario, password }`, devuelve `{ token, usuario }` |
| `GET` | `/api/verificar-sesion` | ✅ JWT | Valida que el token sigue activo |

### Noticias

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/noticias` | ❌ | Lista todas las noticias |
| `POST` | `/api/noticias` | ✅ JWT | Crea una noticia (multipart/form-data con imagen) |
| `PUT` | `/api/noticias/:id` | ✅ JWT | Actualiza una noticia |
| `DELETE` | `/api/noticias/:id` | ✅ JWT | Elimina una noticia |

### Eventos

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/eventos` | ❌ | Lista todos los eventos |
| `POST` | `/api/eventos` | ✅ JWT | Crea un evento (multipart/form-data con imagen) |
| `PUT` | `/api/eventos/:id` | ✅ JWT | Actualiza un evento |
| `DELETE` | `/api/eventos/:id` | ✅ JWT | Elimina un evento |

### Estructura de un objeto `noticia` / `evento`

```json
{
  "id": 1,
  "nombre": "Título de la noticia",
  "descripcion": "Texto descriptivo...",
  "fecha": "2026-10-14T12:00:00",
  "imagen": "static/imagenes/foto.jpg"
}
```

El campo `imagen` puede ser:
- Una ruta relativa tipo `static/imagenes/…` → el frontend la prefija con el host de la API.
- Una URL completa `https://…` → se usa directamente.

---

## ✅ Requisitos previos

- **Navegador moderno** (Chrome, Firefox, Edge, Safari — versiones actuales).
- **Backend Flask** corriendo en `http://localhost:5000` (repositorio separado).
- Conexión a internet para cargar:
  - Fuente **Poppins** desde Google Fonts.
  - Datos del clima desde **Open-Meteo**.

---

## 🚀 Instalación y puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/<tu-usuario>/muni.git
cd muni
```

### 2. Levantar el backend

> Seguí las instrucciones del repositorio del backend Flask. El servidor debe quedar escuchando en `http://localhost:5000`.

Ejemplo típico:

```bash
cd ../muni-backend
pip install -r requirements.txt
python app.py
```

### 3. Abrir el sitio

El frontend es 100% estático (HTML + CSS + JS). Podés abrirlo de dos formas:

**Opción A — Directamente en el navegador:**
```
Abrí index.html con doble clic o arrastrá al navegador.
```

**Opción B — Con un servidor local (recomendado para evitar restricciones CORS):**
```bash
# Con Python
python -m http.server 8080

# Con Node.js (npx)
npx serve .
```
Luego visitá `http://localhost:8080`.

---

## ⚙️ Configuración

La única constante a modificar en el frontend es la URL base de la API, definida al inicio de `script.js` y `adminmuni.js`:

```js
// script.js  y  adminmuni.js
const API_BASE = 'http://localhost:5000/api';
```

Si el backend corre en otro host o puerto (por ejemplo en producción), actualizá esta variable en ambos archivos.

---

## 🛠️ Uso del panel de administración

1. Navegá a `admin2.html`.
2. Ingresá con tus credenciales de administrador.
3. Desde el dashboard podés:
   - Seleccionar la pestaña **Noticias** o **Eventos**.
   - Hacer clic en **"Nueva noticia"** / **"Nuevo evento"** para crear.
   - Usar los botones ✏️ **Editar** o 🗑️ **Eliminar** en cada fila de la tabla.
4. Los cambios se reflejan automáticamente en el sitio público al recargar.

> ⚠️ **Importante:** Si el servidor Flask se reinicia, los tokens JWT activos se invalidan. En ese caso, cerrá sesión y volvé a ingresar.

---

## 🧰 Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| **HTML5** | Estructura semántica del sitio |
| **CSS3 / Vanilla CSS** | Estilos, animaciones, responsive design |
| **JavaScript (ES2020+)** | Lógica del frontend, fetch API, DOM |
| **Google Fonts — Poppins** | Tipografía principal |
| **Open-Meteo API** | Datos meteorológicos en tiempo real |
| **Flask (Python)** | API REST del backend (repositorio externo) |
| **JWT** | Autenticación del panel de administración |

---

## 📄 Licencia

© 2026 Municipalidad de El Carril — Todos los derechos reservados.  
Este proyecto es de uso institucional interno.

---
## Autor
Cristian Torres el mas pro 
https://github.com/criss777tc