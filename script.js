// ====================================================
//  PARALLAX del video
// ====================================================
const parallax = document.querySelector('.video-bg');
let isAnimating = false;

function updateParallax() {
    const scrollY = window.scrollY;
    const maxScroll = 400;
    const progress = Math.min(scrollY / maxScroll, 1);
    const scale = 1 + progress * 5;
    const opacity = 1 - progress;
    if (parallax) {
        parallax.style.transform = `scale(${scale})`;
        parallax.style.opacity = opacity;
    }
    isAnimating = false;
}

window.addEventListener('scroll', () => {
    if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(updateParallax);
    }
});

// ====================================================
//  NAVBAR STICKY: posiciona el navbar justo debajo del header
// ====================================================
/*(function () {
    const header = document.querySelector('.header');
    const navbar = document.querySelector('.navbar');
    if (!header || !navbar) return;

    function ajustarTopNavbar() {
        navbar.style.top = header.offsetHeight + 'px';
    }

    // Ajustar al cargar y cuando cambie el tamaño de la ventana
    ajustarTopNavbar();
    window.addEventListener('resize', ajustarTopNavbar);

    // Observar cambios de tamaño del header (por si cambia dinámicamente)
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(ajustarTopNavbar).observe(header);
    }
})();*/
// ====================================================
//  NAVBARHAMBURGUESA:
// ====================================================
/*const navbar = document.querySelector('.navbar');
const boton = document.querySelector('.hamburguesa');
const menu = document.querySelector('.menu-flotante');

// Abrir / cerrar
boton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    boton.classList.toggle('activo', abierto);
    boton.setAttribute('aria-expanded', abierto);
});

// Mostrar la hamburguesa solo cuando el navbar principal sale de pantalla
const observer = new IntersectionObserver(([entrada]) => {
    const navbarVisible = entrada.isIntersecting;

    boton.classList.toggle('visible', !navbarVisible);

    // Si el navbar vuelve a verse, cerramos el menú para que no quede colgado
    if (navbarVisible) {
        menu.classList.remove('abierto');
        boton.classList.remove('activo');
        boton.setAttribute('aria-expanded', 'false');
    }
});

observer.observe(navbar);*/
// ====================================================
//  CONSTANTES
// ====================================================
const API_BASE = 'http://localhost:5000/api';

// Construye la URL pública de una imagen guardada por la API.
// Si la ruta ya es una URL completa (http/https) la devuelve tal cual;
// si es una ruta relativa tipo "static/imagenes/…" la prefija con el host.
function imagenUrl(ruta) {
    if (!ruta) return 'https://picsum.photos/seed/fallback/900/600';
    if (ruta.startsWith('http')) return ruta;
    return `${API_BASE.replace('/api', '')}/${ruta}`;
}

// ====================================================
//  CARGAR NOTICIAS DESDE LA BD
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
    // ── CARRUSEL: carga desde tabla "noticias" ──
    try {
        const res = await fetch(`${API_BASE}/noticias`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const noticias = await res.json();
        noticias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        renderCarrusel(noticias);
    } catch (err) {
        console.error('Error al cargar noticias (carrusel):', err);
    }

    // ── NOVEDADES: carga desde tabla "eventos" ──
    try {
        const res = await fetch(`${API_BASE}/eventos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const eventos = await res.json();
        // La API ya los devuelve ordenados por fecha DESC
        renderNovedades(eventos);
    } catch (err) {
        console.error('Error al cargar eventos (novedades):', err);
    }
});


// ====================================================
//  RENDER — SECCIÓN NOVEDADES (desde tabla "eventos")
//  Collage dinámico con rotación automática de fotos/eventos
// ====================================================
let eventosCollage = [];
let offsetCollage = 0;
let intervaloCollage = null;
const INTERVALO_ROTACION = 4500; // Rotar cada 4.5 segundos

function renderNovedades(eventos) {
    const collage = document.getElementById('collage-novedades');
    if (!collage) return;

    eventosCollage = eventos || [];
    offsetCollage = 0;

    if (intervaloCollage) {
        clearInterval(intervaloCollage);
        intervaloCollage = null;
    }

    if (eventosCollage.length === 0) {
        collage.innerHTML = '<p style="color:#666;">No hay novedades por el momento.</p>';
        return;
    }

    actualizarContenidoCollage(false);

    // Pausar rotación si el usuario interactúa / hover
    collage.onmouseenter = detenerRotacionCollage;
    collage.onmouseleave = iniciarRotacionCollage;

    // Solo iniciar rotación si hay más de 1 evento
    if (eventosCollage.length > 1) {
        iniciarRotacionCollage();
    }
}

function iniciarRotacionCollage() {
    if (intervaloCollage) clearInterval(intervaloCollage);
    if (eventosCollage.length <= 1) return;

    intervaloCollage = setInterval(() => {
        rotarCollageSiguiente();
    }, INTERVALO_ROTACION);
}

function detenerRotacionCollage() {
    if (intervaloCollage) {
        clearInterval(intervaloCollage);
        intervaloCollage = null;
    }
}

function rotarCollageSiguiente() {
    if (eventosCollage.length <= 1) return;
    offsetCollage = (offsetCollage + 1) % eventosCollage.length;
    actualizarContenidoCollage(true);
}

function seleccionarEventoCollage(indexReal) {
    if (eventosCollage.length <= 1) return;
    offsetCollage = indexReal;
    actualizarContenidoCollage(true);
    iniciarRotacionCollage(); // Reiniciar el temporizador tras la interacción
}

function actualizarContenidoCollage(conTransicion = true) {
    const collage = document.getElementById('collage-novedades');
    if (!collage || eventosCollage.length === 0) return;

    const actualizarHTML = () => {
        collage.innerHTML = '';

        // Tarjeta grande (destacada): evento actual en offsetCollage
        const e = eventosCollage[offsetCollage];
        const grande = document.createElement('div');
        grande.className = 'tarjeta-grande' + (e.imagen ? '' : ' sin-imagen');
        if (e.imagen) grande.style.backgroundImage = `url('${imagenUrl(e.imagen)}')`;

        const fechaGrande = e.fecha ? formatearFechaLarga(e.fecha) : '';
        grande.innerHTML = `
            <div class="texto">
                <h2>${escaparHTML(e.nombre)}</h2>
                <p>${escaparHTML(e.descripcion || '')}</p>
                ${fechaGrande ? `<small class="fecha-evento">${fechaGrande}</small>` : ''}
                <button type="button" class="btn-ver-evento" aria-label="Ver más sobre este evento">
                    Ver más
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>
            </div>
        `;

        // Clic en el botón "Ver más" → abre el modal
        grande.querySelector('.btn-ver-evento').addEventListener('click', (ev) => {
            ev.stopPropagation();
            abrirEvento(offsetCollage);
        });
        // Clic en la tarjeta grande (fuera del botón) → también abre el modal
        grande.addEventListener('click', () => abrirEvento(offsetCollage));

        collage.appendChild(grande);

        // Tarjetas chicas (hasta 4 siguientes en orden circular)
        const totalChicas = Math.min(4, eventosCollage.length - 1);
        if (totalChicas > 0) {
            const chicas = document.createElement('div');
            chicas.className = 'chicas';

            for (let i = 1; i <= totalChicas; i++) {
                const idxReal = (offsetCollage + i) % eventosCollage.length;
                const ev = eventosCollage[idxReal];
                const chica = document.createElement('div');
                chica.className = 'tarjeta-chica' + (ev.imagen ? '' : ' sin-imagen');
                if (ev.imagen) chica.style.backgroundImage = `url('${imagenUrl(ev.imagen)}')`;
                chica.title = `Ver "${escaparHTML(ev.nombre)}"`;
                chica.innerHTML = `
                    <div class="texto">
                        <h3>${escaparHTML(ev.nombre)}</h3>
                    </div>
                `;
                // Clic en tarjeta chica → la pone como destacada Y abre el modal
                chica.addEventListener('click', () => {
                    seleccionarEventoCollage(idxReal);
                    abrirEvento(idxReal);
                });
                chicas.appendChild(chica);
            }

            collage.appendChild(chicas);
        }
    };

    if (conTransicion) {
        collage.classList.add('rotando-cambio');
        setTimeout(() => {
            actualizarHTML();
            requestAnimationFrame(() => {
                collage.classList.remove('rotando-cambio');
            });
        }, 300);
    } else {
        actualizarHTML();
    }
}

// ====================================================
//  RENDER — CARRUSEL
//  Usa TODAS las noticias (cada una es un slide).
// ====================================================
// ====================================================
//  UTILIDADES GLOBALES
// ====================================================
function escaparHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Convierte enlaces http/https dentro de un texto a etiquetas <a> clicables
function convertirEnlacesClicables(textoEscapado) {
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    return textoEscapado.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="modal-link">${url}</a>`;
    });
}

// Formatea texto largo (columna TEXT) en párrafos semánticos, saltos de línea y enlaces seguros
function formatearDescripcionNoticia(texto) {
    if (!texto || !texto.trim()) {
        return '<p class="modal-parrafo modal-sin-descripcion">Esta noticia no cuenta con una descripción detallada en este momento.</p>';
    }

    // Dividir en bloques separados por doble salto de línea
    const bloques = texto.split(/\r?\n\s*\r?\n/);

    return bloques.map((bloque, idx) => {
        const limpio = bloque.trim();
        if (!limpio) return '';

        // 1. Escapar HTML
        let contenido = escaparHTML(limpio);
        // 2. Transformar URLs en enlaces clicables
        contenido = convertirEnlacesClicables(contenido);
        // 3. Saltos simples a <br>
        contenido = contenido.replace(/\r?\n/g, '<br>');

        const claseLead = (idx === 0 && bloques.length > 1) ? ' modal-lead' : '';
        return `<p class="modal-parrafo${claseLead}">${contenido}</p>`;
    }).filter(Boolean).join('');
}

// Formatea fecha a estilo legible en español de Argentina sin desfasar la zona horaria
function formatearFechaLarga(fechaStr) {
    if (!fechaStr) return '';
    try {
        const esUtc = String(fechaStr).includes('GMT') || String(fechaStr).includes('Z');
        let fechaObj;

        // Si es formato AAAA-MM-DD
        const partes = String(fechaStr).split('-');
        if (partes.length === 3 && !esUtc) {
            fechaObj = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
        } else {
            fechaObj = new Date(fechaStr);
        }

        if (isNaN(fechaObj.getTime())) return String(fechaStr);

        const opciones = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            ...(esUtc ? { timeZone: 'UTC' } : {})
        };

        const texto = fechaObj.toLocaleDateString('es-AR', opciones);
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    } catch (e) {
        return String(fechaStr);
    }
}

// ====================================================
//  ESTADO Y VARIABLES DEL CARRUSEL / MODAL
// ====================================================
let indiceActual = 0;
let indiceNoticiaModal = 0;
let totalSlides = 0;
let autoplayInterval = null;
let autoplayPauseTimeout = null;
let noticiasCarrusel = [];
const AUTOPLAY_DELAY = 4500;   // ms entre slides
const AUTOPLAY_RESUME = 8000;  // ms de pausa tras interacción manual
const modalNoticia = document.getElementById('modal-noticia');

function renderCarrusel(noticias) {
    const pista = document.getElementById('pista');
    const puntos = document.getElementById('puntos');
    const noticiaNum = document.getElementById('noticia-num');
    if (!pista) return;

    noticiasCarrusel = noticias;
    totalSlides = noticias.length;
    if (totalSlides === 0) {
        pista.innerHTML = '<div class="elemento"><h2>No hay noticias</h2></div>';
        return;
    }

    // Generar slides
    pista.innerHTML = noticias.map((n, indice) => `
        <div class="elemento" style="background-image: url('${n.imagen ? imagenUrl(n.imagen) : ''}');">
            <div class="elemento-texto">
                <h2>${escaparHTML(n.nombre)}</h2>
                <p>${escaparHTML(n.descripcion || '')}</p>
                <small>${n.fecha ? formatearFechaLarga(n.fecha) : ''}</small>
                <button
                    type="button"
                    class="btn-ver-mas"
                    onclick="abrirNoticia(${indice})"
                    aria-label="Ver más sobre esta noticia: ${escaparHTML(n.nombre)}"
                >
                    Ver más
                </button>
            </div>
        </div>
    `).join('');

    // Generar puntos indicadores
    if (puntos) {
        puntos.innerHTML = noticias.map((_, i) =>
            `<button class="punto${i === 0 ? ' activo' : ''}" onclick="irA(${i})" aria-label="Ir a noticia ${i + 1}"></button>`
        ).join('');
    }

    // Número de noticia
    if (noticiaNum) noticiaNum.textContent = '1';

    indiceActual = 0;
    actualizarPosicion();
    iniciarAutoplay();

    // Comprobar si la URL viene con hash para abrir una noticia directamente (ej: #noticia-4)
    revisarHashUrlNoticia();
}

// ====================================================
//  VENTANA FLOTANTE — DETALLE COMPLETO DE LA NOTICIA
// ====================================================
function abrirNoticia(indice) {
    if (!noticiasCarrusel || noticiasCarrusel.length === 0) return;

    // Normalizar índice circular
    indice = ((indice % noticiasCarrusel.length) + noticiasCarrusel.length) % noticiasCarrusel.length;
    indiceNoticiaModal = indice;

    const noticia = noticiasCarrusel[indice];
    if (!noticia || !modalNoticia) return;

    // 1. Contador de noticia
    const contadorEl = document.getElementById('modal-noticia-contador');
    if (contadorEl) {
        contadorEl.textContent = `${indice + 1} de ${noticiasCarrusel.length}`;
    }

    // 2. Título completo
    const tituloEl = document.getElementById('modal-noticia-titulo');
    if (tituloEl) {
        tituloEl.textContent = noticia.nombre || 'Sin título';
    }

    // 3. Fecha formateada en español
    const fechaEl = document.getElementById('modal-noticia-fecha');
    if (fechaEl) {
        fechaEl.textContent = formatearFechaLarga(noticia.fecha);
        if (noticia.fecha) fechaEl.setAttribute('datetime', noticia.fecha);
    }

    // 4. Estimación de tiempo de lectura (apropiado para columnas TEXT extensas)
    const descTexto = noticia.descripcion || '';
    const palabras = descTexto.trim().split(/\s+/).filter(Boolean).length;
    const minutos = Math.max(1, Math.ceil(palabras / 180));
    const lecturaEl = document.getElementById('modal-noticia-lectura');
    if (lecturaEl) {
        lecturaEl.textContent = palabras > 0 ? `${minutos} min de lectura` : 'Lectura breve';
    }

    // 5. Imagen o Banner institucional de respaldo
    const imagenEl = document.getElementById('modal-noticia-imagen');
    const fallbackEl = document.getElementById('modal-noticia-banner-fallback');
    if (noticia.imagen) {
        if (imagenEl) {
            imagenEl.src = imagenUrl(noticia.imagen);
            imagenEl.alt = noticia.nombre || 'Imagen de la noticia';
            imagenEl.hidden = false;
        }
        if (fallbackEl) fallbackEl.hidden = true;
    } else {
        if (imagenEl) {
            imagenEl.hidden = true;
            imagenEl.removeAttribute('src');
            imagenEl.alt = '';
        }
        if (fallbackEl) fallbackEl.hidden = false;
    }

    // 6. Descripción completa con párrafos, enlaces y saltos
    const descEl = document.getElementById('modal-noticia-descripcion');
    if (descEl) {
        descEl.innerHTML = formatearDescripcionNoticia(descTexto);
    }

    // 7. Navegación en footer del modal
    const btnPrev = document.getElementById('modal-btn-prev');
    const btnNext = document.getElementById('modal-btn-next');
    if (btnPrev && btnNext) {
        btnPrev.disabled = noticiasCarrusel.length <= 1;
        btnNext.disabled = noticiasCarrusel.length <= 1;
    }

    // 8. Reiniciar scroll interno del cuerpo de la noticia
    const cuerpoEl = document.querySelector('.modal-noticia-cuerpo');
    if (cuerpoEl) cuerpoEl.scrollTop = 0;

    // 9. Pausar autoplay del carrusel mientras se lee la noticia
    detenerAutoplay();
    if (autoplayPauseTimeout) {
        clearTimeout(autoplayPauseTimeout);
        autoplayPauseTimeout = null;
    }

    // 10. Actualizar hash en la URL para permitir compartir o guardar el enlace
    if (history.replaceState) {
        const idNoticia = noticia.id || (indice + 1);
        history.replaceState(null, '', `#noticia-${idNoticia}`);
    }

    // 11. Abrir diálogo y bloquear scroll de fondo
    document.body.classList.add('modal-noticia-abierta');
    if (!modalNoticia.open) modalNoticia.showModal();
}

function navegarNoticiaModal(direccion) {
    if (noticiasCarrusel.length <= 1) return;
    abrirNoticia(indiceNoticiaModal + direccion);
}

// Función para compartir o copiar enlace directo a la noticia
async function compartirNoticiaModal() {
    const noticia = noticiasCarrusel[indiceNoticiaModal];
    if (!noticia) return;

    const shareUrl = window.location.href;
    const shareTitle = `${noticia.nombre} — Municipalidad de El Carril`;
    const btn = document.getElementById('modal-btn-compartir');
    const txt = document.getElementById('modal-compartir-texto');

    if (navigator.share && navigator.canShare && navigator.canShare({ title: shareTitle, url: shareUrl })) {
        try {
            await navigator.share({
                title: shareTitle,
                text: noticia.nombre,
                url: shareUrl
            });
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback: copiar al portapapeles con confirmación visual
    try {
        await navigator.clipboard.writeText(shareUrl);
        if (btn && txt) {
            const original = txt.textContent;
            btn.classList.add('copiado');
            txt.textContent = '¡Copiado!';
            setTimeout(() => {
                btn.classList.remove('copiado');
                txt.textContent = original;
            }, 2000);
        }
    } catch (err) {
        console.warn('No se pudo copiar al portapapeles:', err);
    }
}

// Abre la noticia si la URL ya incluye #noticia-X
function revisarHashUrlNoticia() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#noticia-') || !noticiasCarrusel.length) return;
    const idOIndex = hash.replace('#noticia-', '').trim();
    const porId = noticiasCarrusel.findIndex(n => String(n.id) === idOIndex);
    if (porId !== -1) {
        abrirNoticia(porId);
    } else {
        const num = parseInt(idOIndex, 10);
        if (!isNaN(num) && num >= 1 && num <= noticiasCarrusel.length) {
            abrirNoticia(num - 1);
        }
    }
}

// ====================================================
//  LISTENERS DEL MODAL DE NOTICIAS
// ====================================================
if (modalNoticia) {
    // Cerrar desde botón superior
    const btnCerrar = document.getElementById('cerrar-modal-noticia');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', () => modalNoticia.close());
    }

    // Cerrar desde botón del footer
    const btnCerrarFooter = document.getElementById('modal-btn-cerrar-footer');
    if (btnCerrarFooter) {
        btnCerrarFooter.addEventListener('click', () => modalNoticia.close());
    }

    // Botones de navegación Anterior / Siguiente en el modal
    const btnPrev = document.getElementById('modal-btn-prev');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => navegarNoticiaModal(-1));
    }

    const btnNext = document.getElementById('modal-btn-next');
    if (btnNext) {
        btnNext.addEventListener('click', () => navegarNoticiaModal(1));
    }

    // Botón Compartir
    const btnCompartir = document.getElementById('modal-btn-compartir');
    if (btnCompartir) {
        btnCompartir.addEventListener('click', compartirNoticiaModal);
    }

    // Cerrar únicamente cuando se hace clic sobre el fondo (backdrop) del dialog
    modalNoticia.addEventListener('click', (event) => {
        if (event.target === modalNoticia) modalNoticia.close();
    });

    // Se ejecuta al cerrar (botón, clic afuera o tecla Escape)
    modalNoticia.addEventListener('close', () => {
        document.body.classList.remove('modal-noticia-abierta');
        // Quitar hash de noticia si existía para mantener la URL limpia
        if (window.location.hash.startsWith('#noticia-') && history.replaceState) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        iniciarAutoplay();
    });

    // Atajos de teclado mientras el modal está abierto
    document.addEventListener('keydown', (event) => {
        if (!modalNoticia.open) return;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            navegarNoticiaModal(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            navegarNoticiaModal(1);
        }
    });
}

// ====================================================
//  MODAL DE EVENTOS — DETALLE COMPLETO
// ====================================================
let indiceEventoModal = 0;
const modalEvento = document.getElementById('modal-evento');

function abrirEvento(indice) {
    if (!eventosCollage || eventosCollage.length === 0) return;

    // Normalizar índice circular
    indice = ((indice % eventosCollage.length) + eventosCollage.length) % eventosCollage.length;
    indiceEventoModal = indice;

    const ev = eventosCollage[indice];
    if (!ev || !modalEvento) return;

    // Contador
    const contadorEl = document.getElementById('modal-evento-contador');
    if (contadorEl) contadorEl.textContent = `${indice + 1} de ${eventosCollage.length}`;

    // Título
    const tituloEl = document.getElementById('modal-evento-titulo');
    if (tituloEl) tituloEl.textContent = ev.nombre || 'Sin título';

    // Fecha
    const fechaEl = document.getElementById('modal-evento-fecha');
    if (fechaEl) {
        fechaEl.textContent = formatearFechaLarga(ev.fecha);
        if (ev.fecha) fechaEl.setAttribute('datetime', ev.fecha);
    }

    // Imagen o banner fallback
    const imagenEl = document.getElementById('modal-evento-imagen');
    const fallbackEl = document.getElementById('modal-evento-banner-fallback');
    if (ev.imagen) {
        if (imagenEl) {
            imagenEl.src = imagenUrl(ev.imagen);
            imagenEl.alt = ev.nombre || 'Imagen del evento';
            imagenEl.hidden = false;
        }
        if (fallbackEl) fallbackEl.hidden = true;
    } else {
        if (imagenEl) { imagenEl.hidden = true; imagenEl.removeAttribute('src'); }
        if (fallbackEl) fallbackEl.hidden = false;
    }

    // Descripción con formato rico
    const descEl = document.getElementById('modal-evento-descripcion');
    if (descEl) descEl.innerHTML = formatearDescripcionNoticia(ev.descripcion || '');

    // Navegación habilitada solo si hay más de 1 evento
    const btnPrev = document.getElementById('modal-evento-btn-prev');
    const btnNext = document.getElementById('modal-evento-btn-next');
    if (btnPrev) btnPrev.disabled = eventosCollage.length <= 1;
    if (btnNext) btnNext.disabled = eventosCollage.length <= 1;

    // Reiniciar scroll
    const cuerpoEl = modalEvento.querySelector('.modal-noticia-cuerpo');
    if (cuerpoEl) cuerpoEl.scrollTop = 0;

    // Pausar rotación del collage mientras se lee
    detenerRotacionCollage();

    // Abrir dialog
    document.body.classList.add('modal-noticia-abierta');
    if (!modalEvento.open) modalEvento.showModal();
}

function navegarEventoModal(dir) {
    if (eventosCollage.length <= 1) return;
    abrirEvento(indiceEventoModal + dir);
}

if (modalEvento) {
    // Cerrar topbar
    document.getElementById('cerrar-modal-evento')?.addEventListener('click', () => modalEvento.close());
    // Cerrar footer
    document.getElementById('modal-evento-btn-cerrar')?.addEventListener('click', () => modalEvento.close());
    // Anterior / Siguiente
    document.getElementById('modal-evento-btn-prev')?.addEventListener('click', () => navegarEventoModal(-1));
    document.getElementById('modal-evento-btn-next')?.addEventListener('click', () => navegarEventoModal(1));
    // Clic en backdrop
    modalEvento.addEventListener('click', (e) => { if (e.target === modalEvento) modalEvento.close(); });
    // Al cerrar
    modalEvento.addEventListener('close', () => {
        document.body.classList.remove('modal-noticia-abierta');
        // Reanudar rotación solo si hay más de 1 evento
        if (eventosCollage.length > 1) iniciarRotacionCollage();
    });
    // Teclas de flecha
    document.addEventListener('keydown', (e) => {
        if (!modalEvento.open) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); navegarEventoModal(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); navegarEventoModal(1); }
    });
}

// ====================================================
//  NAVEGACIÓN DEL CARRUSEL
// ====================================================
function actualizarPosicion() {
    const pista = document.getElementById('pista');
    if (pista) {
        pista.style.transform = `translateX(-${indiceActual * 100}%)`;
    }

    // Actualizar puntos
    document.querySelectorAll('.punto').forEach((p, i) => {
        p.classList.toggle('activo', i === indiceActual);
    });

    // Actualizar número
    const noticiaNum = document.getElementById('noticia-num');
    if (noticiaNum) noticiaNum.textContent = indiceActual + 1;
}

function mover(dir) {
    if (totalSlides === 0) return;
    indiceActual = (indiceActual + dir + totalSlides) % totalSlides;
    actualizarPosicion();
    pausarAutoplay();
}

function irA(i) {
    indiceActual = i;
    actualizarPosicion();
    pausarAutoplay();
}

// ====================================================
//  AUTOPLAY DEL CARRUSEL
// ====================================================
function iniciarAutoplay() {
    detenerAutoplay();
    if (totalSlides <= 1) return;
    autoplayInterval = setInterval(() => {
        indiceActual = (indiceActual + 1) % totalSlides;
        actualizarPosicion();
    }, AUTOPLAY_DELAY);
}

function detenerAutoplay() {
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
    }
}

// Pausa tras interacción manual y retoma después de AUTOPLAY_RESUME ms
function pausarAutoplay() {
    detenerAutoplay();
    if (autoplayPauseTimeout) clearTimeout(autoplayPauseTimeout);
    autoplayPauseTimeout = setTimeout(iniciarAutoplay, AUTOPLAY_RESUME);
}

// ====================================================
//  DROPDOWN INSTITUCIONES (Soporte clic y touch)
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById('dropdown-instituciones');
    const dropbtn = dropdown?.querySelector('.dropbtn');

    if (dropbtn && dropdown) {
        dropbtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const estaActivo = dropdown.classList.toggle('activo');
            dropbtn.setAttribute('aria-expanded', estaActivo ? 'true' : 'false');
        });

        // Cerrar al hacer clic en cualquier otro lugar
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('activo');
                dropbtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Cerrar al presionar Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('activo');
                dropbtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
});



// ============================================================
//  WIDGET DEL CLIMA (API OpenWeatherMap)
//  Asume que la API devuelve texto en español
// ============================================================
(function () {
    // Coordenadas oficiales de El Carril, Salta (CP 4421)
    const LAT = -25.07185;
    const LON = -65.49302;
    const estadosClima = {
        0: { desc: "Despejado", icono: "☀️" },
        1: { desc: "Mayormente despejado", icono: "🌤️" },
        2: { desc: "Parcialmente nublado", icono: "⛅" },
        3: { desc: "Nublado", icono: "☁️" },
        45: { desc: "Niebla", icono: "🌫️" },
        51: { desc: "Llovizna leve", icono: "🌦️" },
        61: { desc: "Lluvia leve", icono: "🌧️" },
        63: { desc: "Lluvia moderada", icono: "🌧️" },
        65: { desc: "Lluvia fuerte", icono: "🌧️" },
        80: { desc: "Chaparrones", icono: "🌧️" },
        95: { desc: "Tormenta eléctrica", icono: "⛈️" }
    };
    async function cargarClimaElCarril() {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America/Argentina/Salta`;
            const res = await fetch(url);
            const data = await res.json();
            const temp = Math.round(data.current.temperature_2m);
            const humedad = data.current.relative_humidity_2m;
            const viento = Math.round(data.current.wind_speed_10m);
            const codigo = data.current.weather_code;
            const estado = estadosClima[codigo] || { desc: "Variado", icono: "🌤️" };
            document.getElementById('carril-temp').textContent = `${temp}°C`;
            document.getElementById('carril-estado').textContent = estado.desc;
            document.getElementById('carril-icono').textContent = estado.icono;
            document.getElementById('carril-humedad').textContent = `${humedad}%`;
            document.getElementById('carril-viento').textContent = `${viento} km/h`;
        } catch (err) {
            document.getElementById('carril-estado').textContent = "No disponible";
        }
    }
    cargarClimaElCarril();
    // Se actualiza automáticamente cada 15 minutos sin recargar la página
    setInterval(cargarClimaElCarril, 15 * 60 * 1000);
})();
// ====================================================
//  CURSOS Y TALLERES — GRILLA PAGINADA + DETALLE (estilo noticias)
//  Depende de (definidos en tu código A / base): API_BASE, imagenUrl,
//  formatearFechaLarga, formatearDescripcionNoticia
// ====================================================
let listaCursos = [];
let paginaActualCursos = 1;
let indiceCursoModal = 0;
const CURSOS_POR_PAGINA = 10;

const modalCursos = document.getElementById('modal-cursos');
const modalCurso = document.getElementById('modal-curso');

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function imagenesDeCurso(c) {
    return c.imagenes && c.imagenes.length ? c.imagenes : (c.imagen ? [c.imagen] : []);
}

async function cargarCursos() {
    try {
        const res = await fetch(`${API_BASE}/cursos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        listaCursos = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('Error al cargar cursos:', err);
        listaCursos = [];
    }
}

// ---------- LISTADO (GRILLA) ----------
async function abrirModalCursos() {
    await cargarCursos();
    paginaActualCursos = 1;
    renderizarGrillaCursos();
    if (modalCursos) {
        document.body.classList.add('modal-noticia-abierta');
        if (!modalCursos.open) modalCursos.showModal();
    }
}

function parsearDiasDuracion(duracionStr) {
    if (!duracionStr) return 30;
    const texto = String(duracionStr).toLowerCase().trim();
    let dias = 0;

    const matchMeses = texto.match(/(\d+(?:[\.,]\d+)?)\s*(?:mes|meses)/);
    if (matchMeses) dias += Math.round(parseFloat(matchMeses[1].replace(',', '.')) * 30);

    const matchSemanas = texto.match(/(\d+(?:[\.,]\d+)?)\s*(?:semana|semanas|sem)/);
    if (matchSemanas) dias += Math.round(parseFloat(matchSemanas[1].replace(',', '.')) * 7);

    const matchDias = texto.match(/(\d+(?:[\.,]\d+)?)\s*(?:dia|dias|día|días)/);
    if (matchDias) dias += Math.round(parseFloat(matchDias[1].replace(',', '.')));

    const matchHoras = texto.match(/(\d+(?:[\.,]\d+)?)\s*(?:hora|horas|hr|hrs|hs)/);
    if (matchHoras && dias === 0) dias += Math.max(1, Math.round(parseFloat(matchHoras[1].replace(',', '.')) / 4));

    if (dias === 0) {
        const num = parseInt(texto, 10);
        if (!isNaN(num) && num > 0) dias = num;
    }

    return dias > 0 ? dias : 30;
}

function obtenerEstadoCurso(c) {
    if (c.estado && c.estado_texto) {
        return { estado: c.estado, texto: c.estado_texto };
    }

    const fechaStr = c.fecha_inicio || c['fecha de inicio'];
    if (!fechaStr) return { estado: 'en_curso', texto: 'En curso' };

    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return { estado: 'en_curso', texto: 'En curso' };

    const fInicio = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diffMs = fInicio.getTime() - hoy.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias > 0) {
        return {
            estado: 'proximo',
            texto: diffDias === 1 ? 'Empieza en 1 día' : `Empieza en ${diffDias} días`
        };
    }

    const diasDur = parsearDiasDuracion(c.duracion_curso);
    const fFin = new Date(fInicio);
    fFin.setDate(fFin.getDate() + diasDur);

    if (hoy <= fFin) {
        return { estado: 'en_curso', texto: 'En curso' };
    } else {
        return { estado: 'finalizado', texto: 'Finalizado' };
    }
}

function renderizarGrillaCursos() {
    const grilla = document.getElementById('cursos-grilla');
    const emptyMsg = document.getElementById('cursos-empty-msg');
    const contadorTotal = document.getElementById('modal-cursos-contador-total');
    const paginacionInfo = document.getElementById('cursos-paginacion-info');
    const btnPrev = document.getElementById('cursos-btn-prev');
    const btnNext = document.getElementById('cursos-btn-next');
    if (!grilla) return;

    grilla.innerHTML = '';
    const total = listaCursos.length;

    if (contadorTotal) {
        contadorTotal.textContent = `${total} ${total === 1 ? 'curso disponible' : 'cursos disponibles'}`;
    }

    if (total === 0) {
        grilla.hidden = true;
        if (emptyMsg) emptyMsg.hidden = false;
        if (paginacionInfo) paginacionInfo.textContent = 'Página 1 de 1';
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        return;
    }

    grilla.hidden = false;
    if (emptyMsg) emptyMsg.hidden = true;

    const totalPaginas = Math.ceil(total / CURSOS_POR_PAGINA);
    paginaActualCursos = Math.min(Math.max(paginaActualCursos, 1), totalPaginas);

    const inicio = (paginaActualCursos - 1) * CURSOS_POR_PAGINA;
    listaCursos.slice(inicio, inicio + CURSOS_POR_PAGINA).forEach((c, i) => {
        const nombre = escapeHtml(c.nombre_curso || 'Curso');
        const imagenes = imagenesDeCurso(c);
        const costo = escapeHtml(c.coste_inscripcion || 'Gratuito');
        const infoEstado = obtenerEstadoCurso(c);

        const badgeHtml = `
            <span class="curso-card-badge curso-card-badge--${infoEstado.estado}" title="${escapeHtml(infoEstado.texto)}">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
                <span>${escapeHtml(infoEstado.texto)}</span>
            </span>
        `;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'curso-card';
        card.setAttribute('aria-label', `Ver información de ${c.nombre_curso || 'curso'}`);

        if (imagenes[0]) {
            card.innerHTML = `
                <div class="curso-card-media">
                    <img src="${imagenUrl(imagenes[0])}" alt="Imagen de ${nombre}" loading="lazy">
                    ${badgeHtml}
                    <div class="curso-card-overlay">
                        <h3 class="curso-card-overlay-titulo">${nombre}</h3>
                        <span class="curso-card-overlay-costo">${costo}</span>
                    </div>
                </div>`;
        } else {
            card.innerHTML = `
                <div class="curso-card-media curso-card-media--vacio">
                    <img src="imagenes/logo1.png" alt="">
                    ${badgeHtml}
                    <div class="curso-card-overlay">
                        <h3 class="curso-card-overlay-titulo">${nombre}</h3>
                        <span class="curso-card-overlay-costo">${costo}</span>
                    </div>
                </div>`;
        }

        card.addEventListener('click', () => abrirCurso(inicio + i));
        grilla.appendChild(card);
    });

    if (paginacionInfo) {
        paginacionInfo.textContent = `Página ${paginaActualCursos} de ${totalPaginas} (${total} cursos)`;
    }
    if (btnPrev) btnPrev.disabled = paginaActualCursos <= 1;
    if (btnNext) btnNext.disabled = paginaActualCursos >= totalPaginas;

    const cuerpo = document.getElementById('modal-cursos-cuerpo');
    if (cuerpo) cuerpo.scrollTop = 0;
}

document.getElementById('cursos-btn-prev')?.addEventListener('click', () => {
    if (paginaActualCursos > 1) {
        paginaActualCursos--;
        renderizarGrillaCursos();
    }
});

document.getElementById('cursos-btn-next')?.addEventListener('click', () => {
    if (paginaActualCursos < Math.ceil(listaCursos.length / CURSOS_POR_PAGINA)) {
        paginaActualCursos++;
        renderizarGrillaCursos();
    }
});

function cerrarModalCursos() {
    if (modalCursos?.open) modalCursos.close();
}

document.getElementById('cerrar-modal-cursos')?.addEventListener('click', cerrarModalCursos);
document.getElementById('modal-cursos-btn-cerrar')?.addEventListener('click', cerrarModalCursos);

if (modalCursos) {
    modalCursos.addEventListener('click', (e) => {
        if (e.target === modalCursos) cerrarModalCursos();
    });
    modalCursos.addEventListener('close', () => {
        document.body.classList.remove('modal-noticia-abierta');
    });
}

// Botón "Cursos" de la sección Servicios
document.getElementById('btn-servicio-cursos')?.addEventListener('click', (e) => {
    e.preventDefault();
    abrirModalCursos();
});

// ---------- DETALLE DE UN CURSO (igual que abrirNoticia) ----------
function mostrarFotoCurso(ruta, nombre) {
    const imagenEl = document.getElementById('modal-curso-imagen');
    const fallbackEl = document.getElementById('modal-curso-banner-fallback');
    if (ruta) {
        imagenEl.src = imagenUrl(ruta);
        imagenEl.alt = nombre || 'Imagen del curso';
        imagenEl.hidden = false;
        fallbackEl.hidden = true;
    } else {
        imagenEl.hidden = true;
        imagenEl.removeAttribute('src');
        imagenEl.alt = '';
        fallbackEl.hidden = false;
    }
}

function abrirCurso(indice) {
    if (!listaCursos.length || !modalCurso) return;

    // Índice circular
    indice = ((indice % listaCursos.length) + listaCursos.length) % listaCursos.length;
    indiceCursoModal = indice;
    const curso = listaCursos[indice];
    const nombre = curso.nombre_curso || 'Curso';

    // Mantener la grilla de fondo en la página de este curso
    const paginaCurso = Math.floor(indice / CURSOS_POR_PAGINA) + 1;
    if (paginaCurso !== paginaActualCursos) {
        paginaActualCursos = paginaCurso;
        renderizarGrillaCursos();
    }

    document.getElementById('modal-curso-contador').textContent = `${indice + 1} de ${listaCursos.length}`;
    document.getElementById('modal-curso-titulo').textContent = nombre;
    document.getElementById('modal-curso-duracion').textContent = curso.duracion_curso || 'Duración a convenir';
    document.getElementById('modal-curso-costo').textContent = curso.coste_inscripcion || 'Gratuita';

    const fecha = curso.fecha_inicio || curso['fecha de inicio'] || '';
    const inicioEl = document.getElementById('modal-curso-inicio');
    inicioEl.textContent = fecha ? formatearFechaLarga(fecha) : 'A definir';
    if (fecha) inicioEl.setAttribute('datetime', fecha); else inicioEl.removeAttribute('datetime');

    document.getElementById('modal-curso-descripcion').innerHTML =
        formatearDescripcionNoticia(curso.descripcion_curso || '');

    // Imagen principal + fotos extra
    const imagenes = imagenesDeCurso(curso);
    mostrarFotoCurso(imagenes[0], nombre);

    const fotosEl = document.getElementById('modal-curso-fotos');
    fotosEl.innerHTML = '';
    fotosEl.hidden = imagenes.length < 2;
    if (imagenes.length > 1) {
        imagenes.forEach((ruta, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `curso-detalle-foto${i === 0 ? ' activa' : ''}`;
            btn.title = `Ver foto ${i + 1}`;
            btn.innerHTML = `<img src="${imagenUrl(ruta)}" alt="Miniatura ${i + 1} de ${escapeHtml(nombre)}">`;
            btn.addEventListener('click', () => {
                mostrarFotoCurso(ruta, nombre);
                fotosEl.querySelectorAll('.curso-detalle-foto').forEach(b => b.classList.remove('activa'));
                btn.classList.add('activa');
            });
            fotosEl.appendChild(btn);
        });
    }

    // Navegación
    const unico = listaCursos.length <= 1;
    document.getElementById('curso-btn-prev').disabled = unico;
    document.getElementById('curso-btn-next').disabled = unico;

    // Scroll interno arriba
    const cuerpoEl = modalCurso.querySelector('.modal-noticia-cuerpo');
    if (cuerpoEl) cuerpoEl.scrollTop = 0;

    // Hash para compartir
    if (history.replaceState) {
        history.replaceState(null, '', `#curso-${curso.id_curso ?? indice + 1}`);
    }

    if (!modalCurso.open) modalCurso.showModal();
}

function navegarCurso(dir) {
    if (listaCursos.length <= 1) return;
    abrirCurso(indiceCursoModal + dir);
}

async function compartirCurso() {
    const curso = listaCursos[indiceCursoModal];
    if (!curso) return;

    const shareUrl = window.location.href;
    const shareTitle = `${curso.nombre_curso} — Municipalidad de El Carril`;
    const btn = document.getElementById('curso-btn-compartir');
    const txt = document.getElementById('curso-compartir-texto');

    if (navigator.share && navigator.canShare && navigator.canShare({ title: shareTitle, url: shareUrl })) {
        try {
            await navigator.share({ title: shareTitle, text: curso.nombre_curso, url: shareUrl });
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    try {
        await navigator.clipboard.writeText(shareUrl);
        const original = txt.textContent;
        btn.classList.add('copiado');
        txt.textContent = '¡Copiado!';
        setTimeout(() => {
            btn.classList.remove('copiado');
            txt.textContent = original;
        }, 2000);
    } catch (err) {
        console.warn('No se pudo copiar al portapapeles:', err);
    }
}

if (modalCurso) {
    document.getElementById('cerrar-modal-curso')?.addEventListener('click', () => modalCurso.close());
    document.getElementById('curso-btn-cerrar')?.addEventListener('click', () => modalCurso.close());
    document.getElementById('curso-btn-prev')?.addEventListener('click', () => navegarCurso(-1));
    document.getElementById('curso-btn-next')?.addEventListener('click', () => navegarCurso(1));
    document.getElementById('curso-btn-compartir')?.addEventListener('click', compartirCurso);

    modalCurso.addEventListener('click', (e) => {
        if (e.target === modalCurso) modalCurso.close();
    });

    // Al cerrar el detalle se vuelve a la grilla (que sigue abierta debajo)
    modalCurso.addEventListener('close', () => {
        if (window.location.hash.startsWith('#curso-') && history.replaceState) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!modalCurso.open) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); navegarCurso(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); navegarCurso(1); }
    });
}

// Si la URL ya trae #curso-X, abre ese curso (con la grilla debajo)
async function revisarHashUrlCurso() {
    const hash = window.location.hash;
    if (!hash.startsWith('#curso-')) return;
    const clave = hash.replace('#curso-', '').trim();
    await cargarCursos();
    let indice = listaCursos.findIndex(c => String(c.id_curso) === clave);
    if (indice === -1) {
        const num = parseInt(clave, 10);
        if (!isNaN(num) && num >= 1 && num <= listaCursos.length) indice = num - 1;
    }
    if (indice === -1) return;
    document.body.classList.add('modal-noticia-abierta');
    renderizarGrillaCursos();
    if (!modalCursos.open) modalCursos.showModal();
    abrirCurso(indice);
}
revisarHashUrlCurso();

