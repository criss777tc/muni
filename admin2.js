// ====================================================
//  Si ya existe sesión válida → redirigir al panel
// ====================================================
(async function comprobarSesionExistente() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/api/verificar-sesion', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            window.location.replace('adminmuni.html');
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
        }
    } catch {
        // Si el servidor no responde, se permite ingresar credenciales
    }
})();

// ====================================================
//  Toggle mostrar / ocultar contraseña
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-pass');
    const passInput = document.getElementById('password');
    const eyeIcon  = document.getElementById('eye-icon');

    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const visible = passInput.type === 'text';
            passInput.type = visible ? 'password' : 'text';
            toggleBtn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
            eyeIcon.innerHTML = visible
                // Ojo cerrado
                ? `<path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                   <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                   <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709z"/>
                   <path fill-rule="evenodd" d="M13.646 14.354l-12-12 .708-.708 12 12-.708.708z"/>`
                // Ojo abierto
                : `<path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                   <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>`;
        });
    }
});

// ====================================================
//  Formulario de login
// ====================================================
document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnLogin  = document.getElementById('btn-login');
    const errorDiv  = document.getElementById('login-error');
    const usuario   = document.getElementById('usuario').value.trim();
    const password  = document.getElementById('password').value;

    // Ocultar error previo
    errorDiv.textContent = '';
    errorDiv.classList.remove('visible');

    // Estado de carga
    btnLogin.disabled = true;
    btnLogin.classList.add('loading');

    try {
        const res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', data.usuario);
            window.location.href = 'adminmuni.html';
        } else {
            mostrarError(data.error || 'Usuario o contraseña incorrectos.');
        }

    } catch {
        mostrarError('No se pudo conectar con el servidor. Verificá tu conexión.');
    } finally {
        btnLogin.disabled = false;
        btnLogin.classList.remove('loading');
    }
});

function mostrarError(msg) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
        </svg>
        ${msg}
    `;
    errorDiv.classList.add('visible');
}