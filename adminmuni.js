// ==========================================================
// DASHBOARD — CRUD para Noticias y Eventos
// ==========================================================

const API_BASE = 'http://localhost:5000/api';

// ==========================================================
// SESIÓN Y VALIDACIÓN
// ==========================================================

const token = localStorage.getItem('token');
const usuario = localStorage.getItem('usuario');

async function validarSesionActiva() {
    if (!token) {
        window.location.replace('admin2.html');
        return false;
    }

    try {
        const res = await fetch(`${API_BASE}/verificar-sesion`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            // El token ya no es válido en el servidor (ej. reinicio de Flask o expiró)
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.replace('admin2.html');
            return false;
        }

        // Sesión confirmada por el servidor: mostrar la página y configurar usuario
        document.body.classList.remove('auth-pending');
        const nombreEl = document.getElementById('nombreUsuario');
        if (nombreEl) {
            nombreEl.textContent = usuario || 'Admin';
        }
        return true;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.replace('admin2.html');
        return false;
    }
}

// ==========================================================
// ESTADO
// ==========================================================

let tabActual = 'noticias';   // 'noticias' | 'eventos'
let editandoId = null;        // null = crear, number = editar
let eliminandoId = null;      // id del item a eliminar

// ==========================================================
// UTILIDADES
// ==========================================================

function imagenUrl(ruta) {
    if (!ruta) return null;
    if (ruta.startsWith('http')) return ruta;
    return `${API_BASE.replace('/api', '')}/${ruta}`;
}

function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;
    toast.textContent = mensaje;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3200);
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    try {
        const d = new Date(fechaStr);
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return fechaStr;
    }
}

// ==========================================================
// TABS
// ==========================================================

function actualizarTituloSeccion() {
    let titulo = 'Noticias';
    if (tabActual === 'eventos') titulo = 'Eventos';
    else if (tabActual === 'cursos') titulo = 'Cursos';
    const el = document.getElementById('seccionTitulo');
    if (el) el.textContent = titulo;
}

function actualizarCabeceraTabla() {
    const thead = document.querySelector('#tablaDatos thead');
    if (!thead) return;

    if (tabActual === 'cursos') {
        thead.innerHTML = `
            <tr>
                <th style="width: 50px;">ID</th>
                <th style="width: 90px;">Fotos</th>
                <th>Nombre del Curso</th>
                <th style="width: 130px;">Duración</th>
                <th style="width: 110px;">Fecha de Inicio</th>
                <th style="width: 110px;">Costo</th>
                <th>Descripción</th>
                <th style="width: 100px;">Acciones</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th style="width: 60px;">ID</th>
                <th style="width: 90px;">Imagen</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th style="width: 110px;">Fecha</th>
                <th style="width: 100px;">Acciones</th>
            </tr>
        `;
    }
}

document.querySelectorAll('.dash-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabActual = tab.dataset.tab;
        actualizarTituloSeccion();
        cargarDatos();
    });
});

// ==========================================================
// CARGAR DATOS
// ==========================================================

let itemsActuales = [];

async function cargarDatos() {
    const cuerpo = document.getElementById('tablaCuerpo');
    const vacio = document.getElementById('mensajeVacio');
    const tabla = document.getElementById('tablaDatos');

    cuerpo.innerHTML = '';
    actualizarCabeceraTabla();

    try {
        const res = await fetch(`${API_BASE}/${tabActual}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const datos = await res.json();
        itemsActuales = datos;

        if (datos.length === 0) {
            tabla.style.display = 'none';
            vacio.style.display = '';
            return;
        }

        tabla.style.display = '';
        vacio.style.display = 'none';

        if (tabActual === 'cursos') {
            datos.forEach(curso => {
                const tr = document.createElement('tr');
                const id = curso.id_curso;
                const nombre = curso.nombre_curso || '';
                const duracion = curso.duracion_curso || 'A convenir';
                const fecha = curso.fecha_inicio || curso['fecha de inicio'] || '';
                const costo = curso.coste_inscripcion || 'Gratuito';
                const desc = curso.descripcion_curso || '';
                const imagenes = curso.imagenes || (curso.imagen ? [curso.imagen] : []);

                let fotosHtml = '';
                if (imagenes.length > 0) {
                    const primera = imagenUrl(imagenes[0]);
                    fotosHtml = `
                        <div class="tabla-fotos-stack" title="${imagenes.length} imagen(es)">
                            <img src="${primera}" alt="${nombre}" class="table-img">
                            ${imagenes.length > 1 ? `<span class="badge-num-fotos">+${imagenes.length}</span>` : ''}
                        </div>
                    `;
                } else {
                    fotosHtml = `<div class="table-img-placeholder">SIN FOTO</div>`;
                }

                tr.innerHTML = `
                    <td><strong>${id}</strong></td>
                    <td>${fotosHtml}</td>
                    <td><strong>${nombre}</strong></td>
                    <td><span class="badge-duracion">${duracion}</span></td>
                    <td>${formatearFecha(fecha)}</td>
                    <td><span class="badge-costo">${costo}</span></td>
                    <td class="table-desc" title="${desc}">${desc}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn--icon edit" title="Editar curso" onclick="abrirEditarPorId(${id})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                    <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                                </svg>
                            </button>
                            <button class="btn--icon delete" title="Eliminar curso" onclick="abrirEliminarPorId(${id})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                `;
                cuerpo.appendChild(tr);
            });
        } else {
            datos.forEach(item => {
                const tr = document.createElement('tr');

                const id = item.id || item.id_eventos;
                const nombre = item.nombre || item.nombre_eventos || '';
                const imagen = item.imagen || item.imagen_eventos || null;
                const desc = item.descripcion || item.descripcion_eventos || '';
                const fecha = item.fecha || item.fecha_eventos || '';

                const imgUrl = imagenUrl(imagen);

                tr.innerHTML = `
                    <td><strong>${id}</strong></td>
                    <td>
                        ${imgUrl
                            ? `<img src="${imgUrl}" alt="${nombre}" class="table-img">`
                            : `<div class="table-img-placeholder">SIN IMG</div>`
                        }
                    </td>
                    <td>${nombre}</td>
                    <td class="table-desc" title="${desc}">${desc}</td>
                    <td>${formatearFecha(fecha)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn--icon edit" title="Editar" onclick="abrirEditarPorId(${id})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                    <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                                </svg>
                            </button>
                            <button class="btn--icon delete" title="Eliminar" onclick="abrirEliminarPorId(${id})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                `;

                cuerpo.appendChild(tr);
            });
        }

    } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarToast('Error al cargar los datos', 'error');
        tabla.style.display = 'none';
        vacio.style.display = '';
    }
}

// Cargar al inicio tras validar sesión
document.addEventListener('DOMContentLoaded', async () => {
    const sesionValida = await validarSesionActiva();
    if (sesionValida) {
        cargarDatos();
    }
});

// ==========================================================
// MODAL CREAR / EDITAR
// ==========================================================

const modalOverlay = document.getElementById('modalOverlay');
const formItem = document.getElementById('formItem');

function configurarFormularioSegunTab() {
    const grupoDuracion = document.getElementById('grupoDuracion');
    const grupoCosto = document.getElementById('grupoCosto');
    const grupoFecha = document.getElementById('grupoFecha');
    const labelFecha = document.getElementById('labelFecha');
    const labelNombre = document.getElementById('labelNombre');
    const grupoImagenUnica = document.getElementById('grupoImagenUnica');
    const grupoImagenesMultiples = document.getElementById('grupoImagenesMultiples');
    const itemNombre = document.getElementById('itemNombre');

    if (tabActual === 'cursos') {
        if (labelNombre) labelNombre.textContent = 'Nombre del curso';
        if (itemNombre) itemNombre.placeholder = 'Ej: Taller de Fotografía y Edición Digital';
        if (grupoDuracion) grupoDuracion.style.display = 'block';
        if (grupoCosto) grupoCosto.style.display = 'block';
        if (grupoFecha) grupoFecha.style.display = 'block';
        if (labelFecha) labelFecha.textContent = 'Fecha de inicio';
        if (grupoImagenUnica) grupoImagenUnica.style.display = 'none';
        if (grupoImagenesMultiples) grupoImagenesMultiples.style.display = 'block';
    } else {
        if (labelNombre) labelNombre.textContent = 'Nombre';
        if (itemNombre) itemNombre.placeholder = 'Ingrese el nombre';
        if (grupoDuracion) grupoDuracion.style.display = 'none';
        if (grupoCosto) grupoCosto.style.display = 'none';
        if (grupoFecha) grupoFecha.style.display = 'block';
        if (labelFecha) labelFecha.textContent = 'Fecha';
        if (grupoImagenUnica) grupoImagenUnica.style.display = 'block';
        if (grupoImagenesMultiples) grupoImagenesMultiples.style.display = 'none';
    }
}

function abrirModal() {
    configurarFormularioSegunTab();
    modalOverlay.classList.add('open');
}

function cerrarModal() {
    modalOverlay.classList.remove('open');
    formItem.reset();
    document.getElementById('itemId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('filePlaceholder').style.display = '';
    document.getElementById('btnRecortar').style.display = 'none';

    // Limpieza de campos de cursos
    const itemDuracion = document.getElementById('itemDuracion');
    if (itemDuracion) itemDuracion.value = '';
    const itemCosto = document.getElementById('itemCosto');
    if (itemCosto) itemCosto.value = '';
    const galeriaPreview = document.getElementById('galeriaPreviewMultiples');
    if (galeriaPreview) galeriaPreview.innerHTML = '';
    const checkReemplazar = document.getElementById('checkReemplazarImagenes');
    if (checkReemplazar) checkReemplazar.checked = false;
    const opcionReemplazar = document.getElementById('opcionReemplazarWrap');
    if (opcionReemplazar) opcionReemplazar.style.display = 'none';

    editandoId = null;
}

// Botón "Agregar nuevo"
document.getElementById('btnNuevo').addEventListener('click', () => {
    editandoId = null;
    cerrarModal(); // limpia
    let etiqueta = 'Noticia';
    if (tabActual === 'eventos') etiqueta = 'Evento';
    else if (tabActual === 'cursos') etiqueta = 'Curso';

    document.getElementById('modalTitulo').textContent = `Agregar ${etiqueta}`;
    abrirModal();
});

// Cerrar modal
document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) cerrarModal();
});

// Preview de imagen seleccionada (Noticias / Eventos)
document.getElementById('itemImagen').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const preview = document.getElementById('imagePreview');
            preview.src = ev.target.result;
            preview.style.display = 'block';
            document.getElementById('filePlaceholder').style.display = 'none';
            document.getElementById('btnRecortar').style.display = '';
        };
        reader.readAsDataURL(file);
    }
});

// Preview de múltiples imágenes (Cursos)
const inputMultiples = document.getElementById('itemImagenesMultiples');
if (inputMultiples) {
    inputMultiples.addEventListener('change', (e) => {
        const galeria = document.getElementById('galeriaPreviewMultiples');
        if (!galeria) return;

        // Mantener las fotos existentes renderizadas si las hay, o resetear
        const fotosExistentes = galeria.querySelectorAll('.thumb-existente');
        galeria.innerHTML = '';

        if (fotosExistentes.length > 0) {
            const headerExistentes = document.createElement('div');
            headerExistentes.className = 'galeria-info-text';
            headerExistentes.textContent = 'Fotos ya guardadas:';
            galeria.appendChild(headerExistentes);

            const gridExist = document.createElement('div');
            gridExist.className = 'galeria-preview-grid';
            fotosExistentes.forEach(el => gridExist.appendChild(el));
            galeria.appendChild(gridExist);
        }

        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const info = document.createElement('div');
        info.className = 'galeria-info-text';
        info.textContent = `${files.length} foto(s) nueva(s) seleccionada(s):`;
        galeria.appendChild(info);

        const grid = document.createElement('div');
        grid.className = 'galeria-preview-grid';

        files.forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const item = document.createElement('div');
                item.className = 'thumb-preview-item';
                item.innerHTML = `
                    <img src="${ev.target.result}" alt="Foto ${idx + 1}">
                    <span class="thumb-preview-num">${idx + 1}</span>
                `;
                grid.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
        galeria.appendChild(grid);
    });
}

// ==========================================================
// RECORTE DE IMAGEN (Cropper.js)
// ==========================================================

let cropperInstance = null;
let imagenOriginalSrc = null;   // data-URL de la imagen cargada (o existente)

const cropOverlay = document.getElementById('cropOverlay');
const cropImage = document.getElementById('cropImage');

// — Abrir modal de recorte —
document.getElementById('btnRecortar').addEventListener('click', () => {
    const preview = document.getElementById('imagePreview');
    if (!preview.src) return;

    imagenOriginalSrc = preview.src;
    cropImage.src = imagenOriginalSrc;
    cropOverlay.classList.add('open');

    // Esperar a que la imagen esté visible para inicializar Cropper
    setTimeout(() => {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        cropperInstance = new Cropper(cropImage, {
            aspectRatio: 16 / 9,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.9,
            responsive: true,
            restore: false,
            background: false,
        });
    }, 100);
});

// — Cerrar modal de recorte —
function cerrarCrop() {
    cropOverlay.classList.remove('open');
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
}

document.getElementById('btnCerrarCrop').addEventListener('click', cerrarCrop);
document.getElementById('btnCancelarCrop').addEventListener('click', cerrarCrop);
cropOverlay.addEventListener('click', (e) => {
    if (e.target === cropOverlay) cerrarCrop();
});

// — Aplicar recorte —
document.getElementById('btnConfirmarCrop').addEventListener('click', () => {
    if (!cropperInstance) return;

    const canvas = cropperInstance.getCroppedCanvas({
        // Ancho máximo razonable para web
        maxWidth: 1920,
        maxHeight: 1080,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });

    canvas.toBlob((blob) => {
        if (!blob) return;

        // Actualizar la vista previa
        const url = URL.createObjectURL(blob);
        const preview = document.getElementById('imagePreview');
        preview.src = url;

        // Reemplazar el archivo en el input con la imagen recortada
        const file = new File([blob], 'imagen_recortada.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        document.getElementById('itemImagen').files = dataTransfer.files;

        mostrarToast('Imagen recortada correctamente', 'success');
        cerrarCrop();
    }, 'image/jpeg', 0.92);
});

// Funciones seguras para abrir edición y eliminación por ID
function abrirEditarPorId(id) {
    if (tabActual === 'cursos') {
        const curso = itemsActuales.find(x => x.id_curso === id);
        if (!curso) return;
        abrirEditarCurso(curso);
    } else {
        const item = itemsActuales.find(x => (x.id || x.id_eventos) === id);
        if (!item) return;
        abrirEditar(
            id,
            item.nombre || item.nombre_eventos || '',
            item.descripcion || item.descripcion_eventos || '',
            item.fecha || item.fecha_eventos || '',
            item.imagen || item.imagen_eventos || ''
        );
    }
}

function abrirEliminarPorId(id) {
    if (tabActual === 'cursos') {
        const item = itemsActuales.find(x => x.id_curso === id);
        const nombre = item ? (item.nombre_curso || `Curso #${id}`) : `Curso #${id}`;
        abrirEliminar(id, nombre);
    } else {
        const item = itemsActuales.find(x => (x.id || x.id_eventos) === id);
        const nombre = item ? (item.nombre || item.nombre_eventos || '') : '';
        abrirEliminar(id, nombre);
    }
}

function abrirEditarCurso(curso) {
    cerrarModal();
    editandoId = curso.id_curso;

    document.getElementById('modalTitulo').textContent = `Editar Curso #${curso.id_curso}`;
    document.getElementById('itemId').value = curso.id_curso;
    document.getElementById('itemNombre').value = curso.nombre_curso || '';
    document.getElementById('itemDescripcion').value = curso.descripcion_curso || '';

    const durEl = document.getElementById('itemDuracion');
    if (durEl) durEl.value = curso.duracion_curso || '';

    const fecEl = document.getElementById('itemFecha');
    if (fecEl) fecEl.value = curso.fecha_inicio || curso['fecha de inicio'] || '';

    const cosEl = document.getElementById('itemCosto');
    if (cosEl) cosEl.value = curso.coste_inscripcion || '';

    const galeria = document.getElementById('galeriaPreviewMultiples');
    const opcionReemplazar = document.getElementById('opcionReemplazarWrap');
    const checkReemplazar = document.getElementById('checkReemplazarImagenes');
    if (checkReemplazar) checkReemplazar.checked = false;

    if (galeria) {
        galeria.innerHTML = '';
        const imagenes = curso.imagenes || (curso.imagen ? [curso.imagen] : []);
        if (imagenes.length > 0) {
            const header = document.createElement('div');
            header.className = 'galeria-info-text';
            header.textContent = `Fotos actuales (${imagenes.length}):`;
            galeria.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'galeria-preview-grid';
            imagenes.forEach((imgRuta, idx) => {
                const item = document.createElement('div');
                item.className = 'thumb-preview-item thumb-existente';
                item.innerHTML = `
                    <img src="${imagenUrl(imgRuta)}" alt="Foto actual ${idx + 1}">
                    <span class="thumb-preview-num">${idx + 1}</span>
                `;
                grid.appendChild(item);
            });
            galeria.appendChild(grid);
            if (opcionReemplazar) opcionReemplazar.style.display = 'block';
        } else {
            galeria.innerHTML = '<span style="font-size:0.85rem; color:#94a3b8;">Sin fotos guardadas actualmente</span>';
            if (opcionReemplazar) opcionReemplazar.style.display = 'none';
        }
    }

    abrirModal();
}

// Abrir modal para editar
function abrirEditar(id, nombre, descripcion, fecha, imagen) {
    editandoId = id;
    document.getElementById('modalTitulo').textContent =
        `Editar ${tabActual === 'noticias' ? 'Noticia' : 'Evento'}`;
    document.getElementById('itemId').value = id;
    document.getElementById('itemNombre').value = nombre;
    document.getElementById('itemDescripcion').value = descripcion;
    document.getElementById('itemFecha').value = fecha || '';

    // Mostrar imagen existente
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('filePlaceholder');
    const imgUrl = imagenUrl(imagen);

    if (imgUrl) {
        preview.src = imgUrl;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        document.getElementById('btnRecortar').style.display = '';
    } else {
        preview.style.display = 'none';
        placeholder.style.display = '';
        document.getElementById('btnRecortar').style.display = 'none';
    }

    abrirModal();
}

// ==========================================================
// GUARDAR (CREAR O EDITAR)
// ==========================================================

formItem.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (tabActual === 'cursos') {
        const nombre = document.getElementById('itemNombre').value.trim();
        const descripcion = document.getElementById('itemDescripcion').value.trim();
        const duracion = document.getElementById('itemDuracion') ? document.getElementById('itemDuracion').value.trim() : '';
        const fecha = document.getElementById('itemFecha').value;
        const costo = document.getElementById('itemCosto') ? document.getElementById('itemCosto').value.trim() : '';
        const inputFiles = document.getElementById('itemImagenesMultiples');
        const checkReemplazar = document.getElementById('checkReemplazarImagenes');

        if (!nombre || !descripcion) {
            mostrarToast('El nombre y la descripción del curso son obligatorios', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('nombre_curso', nombre);
        formData.append('descripcion_curso', descripcion);
        formData.append('duracion_curso', duracion);
        formData.append('fecha_inicio', fecha);
        formData.append('coste_inscripcion', costo);

        if (editandoId) {
            formData.append('reemplazar_imagenes', (checkReemplazar && checkReemplazar.checked) ? 'true' : 'false');
        }

        if (inputFiles && inputFiles.files && inputFiles.files.length > 0) {
            for (let i = 0; i < inputFiles.files.length; i++) {
                formData.append('imagenes', inputFiles.files[i]);
            }
        }

        try {
            let url = `${API_BASE}/cursos`;
            let method = 'POST';

            if (editandoId) {
                url = `${API_BASE}/cursos/${editandoId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.status === 401) {
                alert('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.replace('admin2.html');
                return;
            }

            if (res.ok) {
                mostrarToast(
                    editandoId
                        ? 'Curso actualizado correctamente'
                        : 'Curso creado correctamente',
                    'success'
                );
                cerrarModal();
                cargarDatos();
            } else {
                mostrarToast(data.error || 'Error al guardar el curso', 'error');
            }
        } catch (error) {
            console.error('Error al guardar curso:', error);
            mostrarToast('Error de conexión con el servidor', 'error');
        }
        return;
    }

    // Tab Noticias o Eventos
    const nombre = document.getElementById('itemNombre').value.trim();
    const descripcion = document.getElementById('itemDescripcion').value.trim();
    const fecha = document.getElementById('itemFecha').value;
    const imagenFile = document.getElementById('itemImagen').files[0];

    if (!nombre || !descripcion) {
        mostrarToast('Nombre y descripción son obligatorios', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('descripcion', descripcion);
    formData.append('fecha', fecha);
    if (imagenFile) {
        formData.append('imagen', imagenFile);
    }

    try {
        let url = `${API_BASE}/${tabActual}`;
        let method = 'POST';

        if (editandoId) {
            url = `${API_BASE}/${tabActual}/${editandoId}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json();

        if (res.status === 401) {
            alert('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.replace('admin2.html');
            return;
        }

        if (res.ok) {
            mostrarToast(
                editandoId
                    ? 'Actualizado correctamente'
                    : 'Creado correctamente',
                'success'
            );
            cerrarModal();
            cargarDatos();
        } else {
            mostrarToast(data.error || 'Error al guardar', 'error');
        }

    } catch (error) {
        console.error('Error al guardar:', error);
        mostrarToast('Error de conexión con el servidor', 'error');
    }
});

// ==========================================================
// MODAL ELIMINAR
// ==========================================================

const deleteOverlay = document.getElementById('deleteOverlay');

function abrirEliminar(id, nombre) {
    eliminandoId = id;
    document.getElementById('deleteItemName').textContent = nombre;
    deleteOverlay.classList.add('open');
}

function cerrarDelete() {
    deleteOverlay.classList.remove('open');
    eliminandoId = null;
}

document.getElementById('btnCerrarDelete').addEventListener('click', cerrarDelete);
document.getElementById('btnCancelarDelete').addEventListener('click', cerrarDelete);
deleteOverlay.addEventListener('click', (e) => {
    if (e.target === deleteOverlay) cerrarDelete();
});

document.getElementById('btnConfirmarDelete').addEventListener('click', async () => {
    if (!eliminandoId) return;

    try {
        const url = tabActual === 'cursos'
            ? `${API_BASE}/cursos/${eliminandoId}`
            : `${API_BASE}/${tabActual}/${eliminandoId}`;

        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (res.status === 401) {
            alert('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.replace('admin2.html');
            return;
        }

        if (res.ok) {
            mostrarToast('Eliminado correctamente', 'success');
            cerrarDelete();
            cargarDatos();
        } else {
            mostrarToast(data.error || 'Error al eliminar', 'error');
        }

    } catch (error) {
        console.error('Error al eliminar:', error);
        mostrarToast('Error de conexión con el servidor', 'error');
    }
});

// ==========================================================
// LOGOUT
// ==========================================================

document.getElementById('btnLogout').addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        console.error(error);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'admin2.html';
});