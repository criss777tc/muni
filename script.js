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
const INTERVALO_ROTACION = 1000; // Rotar cada 4.5 segundos

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
        grande.innerHTML = `
            <div class="texto">
                <h2>${e.nombre}</h2>
                <p>${e.descripcion || ''}</p>
            </div>
        `;
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
                chica.title = `Ver "${ev.nombre}"`;
                chica.innerHTML = `
                    <div class="texto">
                        <h3>${ev.nombre}</h3>
                    </div>
                `;
                // Al hacer clic en una tarjeta chica, pasa al frente como destacada
                chica.onclick = () => seleccionarEventoCollage(idxReal);
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
let indiceActual = 0;
let totalSlides = 0;

function renderCarrusel(noticias) {
    const pista = document.getElementById('pista');
    const puntos = document.getElementById('puntos');
    const noticiaNum = document.getElementById('noticia-num');
    if (!pista) return;

    totalSlides = noticias.length;
    if (totalSlides === 0) {
        pista.innerHTML = '<div class="elemento"><h2>No hay noticias</h2></div>';
        return;
    }

    // Generar slides
    pista.innerHTML = noticias.map(n => `
        <div class="elemento" style="background-image: url('${n.imagen ? imagenUrl(n.imagen) : ''}');">
            <div class="elemento-texto">
                <h2>${n.nombre}</h2>
                <p>${n.descripcion || ''}</p>
                <small>${n.fecha ? new Date(n.fecha).toLocaleDateString('es-AR') : ''}</small>
            </div>
        </div>
    `).join('');

    // Generar puntos indicadores
    if (puntos) {
        puntos.innerHTML = noticias.map((_, i) =>
            `<button class="punto${i === 0 ? ' activo' : ''}" onclick="irA(${i})"></button>`
        ).join('');
    }

    // Número de noticia
    if (noticiaNum) noticiaNum.textContent = '1';

    indiceActual = 0;
    actualizarPosicion();
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
}

function irA(i) {
    indiceActual = i;
    actualizarPosicion();
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