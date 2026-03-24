// protector-de-pagina.js - Sistema de protección con página de acceso denegado integrada
// Ubicación: /components/protector-de-pagina.js
// Uso: <script src="/components/protector-de-pagina.js" data-modulo="incidencias"></script>

(function () {
    // ========== CONFIGURACIÓN ==========
    let requiredModule = null;
    let requiredRole = null;
    let customMessage = null;
    let customTitle = null;

    // Obtener configuración del script
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
        if (script.src && script.src.includes('protector-de-pagina.js')) {
            requiredModule = script.getAttribute('data-modulo');
            requiredRole = script.getAttribute('data-rol');
            customMessage = script.getAttribute('data-mensaje');
            customTitle = script.getAttribute('data-titulo');
            break;
        }
    }

    // Si no hay módulo ni rol requerido, no hay restricción
    if (!requiredModule && !requiredRole) {
        console.log('[Protector] Página pública - sin restricciones');
        return;
    }

    let validated = false;
    let userManager = null;
    let previousPage = document.referrer;

    // ========== FUNCIONES ==========

    /**
     * Muestra la página de acceso denegado integrada con estilo moderno
     */
    function showAccessDeniedPage(userRole, reason) {
        if (validated) return;
        validated = true;

        console.log('[Protector] ❌ Acceso DENEGADO');
        if (requiredModule) console.log('[Protector] Módulo requerido:', requiredModule);
        if (requiredRole) console.log('[Protector] Rol requerido:', requiredRole);
        console.log('[Protector] Rol actual:', userRole || 'No autenticado');
        console.log('[Protector] URL:', window.location.pathname);

        // Limpiar todo el contenido actual
        document.body.innerHTML = '';

        // Agregar metatags y favicon
        const meta = document.createElement('meta');
        meta.setAttribute('charset', 'UTF-8');
        document.head.appendChild(meta);

        const viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        document.head.appendChild(viewport);

        // Título de la página
        document.title = 'Centinela-MX | Acceso Denegado';

        // Favicon
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = '/assets/images/logo.png';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);

        // Fuentes
        const fontsLink = document.createElement('link');
        fontsLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@500;700&family=Poppins:wght@300;400;500;600;700&display=swap';
        fontsLink.rel = 'stylesheet';
        document.head.appendChild(fontsLink);

        // Font Awesome
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
        document.head.appendChild(faLink);

        // Estilos
        const style = document.createElement('style');
        style.textContent = `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                color: rgba(255, 255, 255, 0.8);
                font-family: 'Rajdhani', sans-serif;
                min-height: 100vh;
                position: relative;
                overflow-x: hidden;
            }

            /* Fondo de partículas animado */
            .particle-bg {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
                background: radial-gradient(circle at 20% 50%, rgba(100, 100, 255, 0.1) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(255, 100, 100, 0.05) 0%, transparent 50%);
                pointer-events: none;
            }
            
            .particle-bg::before {
                content: '';
                position: absolute;
                width: 200%;
                height: 200%;
                top: -50%;
                left: -50%;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 40px,
                    rgba(255, 255, 255, 0.03) 40px,
                    rgba(255, 255, 255, 0.03) 80px
                );
                animation: particleMove 60s linear infinite;
                pointer-events: none;
            }
            
            @keyframes particleMove {
                0% {
                    transform: translate(0, 0) rotate(0deg);
                }
                100% {
                    transform: translate(50px, 50px) rotate(360deg);
                }
            }

            .denied-container {
                position: relative;
                z-index: 1;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
            }

            .denied-card {
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 24px;
                padding: 48px 40px;
                max-width: 550px;
                width: 100%;
                text-align: center;
                animation: glowPulse 6s infinite, fadeInUp 0.6s ease-out;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }

            @keyframes glowPulse {
                0%, 100% {
                    box-shadow: 0 0 20px rgba(220, 38, 38, 0.2);
                    border-color: rgba(220, 38, 38, 0.3);
                }
                50% {
                    box-shadow: 0 0 40px rgba(220, 38, 38, 0.5);
                    border-color: rgba(220, 38, 38, 0.6);
                }
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
            }

            .denied-icon {
                margin-bottom: 24px;
                animation: shake 0.5s ease-in-out;
            }

            .denied-icon svg {
                width: 100px;
                height: 100px;
                filter: drop-shadow(0 0 15px rgba(220, 38, 38, 0.5));
            }

            .denied-title {
                font-family: 'Orbitron', sans-serif;
                font-size: 32px;
                font-weight: 700;
                color: #ef4444;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 2px;
                text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
            }

            .denied-subtitle {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 24px;
                font-weight: 500;
                font-family: 'Poppins', sans-serif;
            }

            .denied-message {
                background: rgba(239, 68, 68, 0.1);
                border-left: 4px solid #ef4444;
                padding: 20px;
                border-radius: 12px;
                margin: 24px 0;
                text-align: left;
            }

            .denied-message p {
                color: rgba(255, 255, 255, 0.9);
                margin: 10px 0;
                font-size: 14px;
                line-height: 1.6;
            }

            .denied-message strong {
                color: #ef4444;
            }

            .module-info {
                background: rgba(0, 0, 0, 0.5);
                padding: 12px;
                border-radius: 8px;
                margin-top: 12px;
                font-family: monospace;
                font-size: 13px;
                color: #94a3b8;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }

            .module-info i {
                color: #ef4444;
                margin-right: 8px;
            }

            code {
                background: rgba(0, 0, 0, 0.6);
                padding: 2px 8px;
                border-radius: 6px;
                font-size: 12px;
                color: #fbbf24;
                font-family: monospace;
            }

            .denied-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 32px;
                flex-wrap: wrap;
            }

            .btn {
                padding: 12px 28px;
                border-radius: 40px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                border: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                text-decoration: none;
                font-family: 'Orbitron', sans-serif;
                letter-spacing: 0.5px;
            }

            .btn-primary {
                background: linear-gradient(135deg, #dc2626, #b91c1c);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.5);
                background: linear-gradient(135deg, #ef4444, #dc2626);
            }

            .btn-secondary {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .btn-secondary:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }

            .denied-footer {
                margin-top: 24px;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.5);
            }

            .counter {
                font-weight: bold;
                color: #ef4444;
                font-size: 18px;
                display: inline-block;
                min-width: 30px;
                background: rgba(0, 0, 0, 0.5);
                padding: 2px 8px;
                border-radius: 20px;
                margin: 0 4px;
            }

            @media (max-width: 640px) {
                .denied-card {
                    padding: 32px 24px;
                    margin: 20px;
                }
                
                .denied-title {
                    font-size: 24px;
                }
                
                .denied-subtitle {
                    font-size: 16px;
                }
                
                .denied-actions {
                    flex-direction: column;
                }
                
                .btn {
                    justify-content: center;
                }
                
                .denied-message p {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);

        // Determinar mensaje personalizado
        let message = customMessage || '';
        if (!message) {
            if (requiredModule) {
                message = `No tienes permisos para acceder al módulo de <strong>"${requiredModule}"</strong>.`;
            } else if (requiredRole) {
                message = `Esta página está restringida para usuarios con rol <strong>"${requiredRole}"</strong>.`;
            } else {
                message = 'No tienes permiso para acceder a esta página.';
            }
        }

        let title = customTitle || 'Acceso Denegado';

        // Construir HTML de la página de denegado
        const deniedHtml = `
            <div class="particle-bg"></div>
            <div class="denied-container">
                <div class="denied-card">
                    <div class="denied-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" fill="#FEE2E2"/>
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" fill="#EF4444" fill-opacity="0.9"/>
                            <path d="M12 8c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" fill="#EF4444"/>
                            <circle cx="12" cy="16" r="1.5" fill="#EF4444"/>
                        </svg>
                    </div>
                    
                    <h1 class="denied-title">🚫 ${title}</h1>
                    <p class="denied-subtitle">${message}</p>
                    
                    <div class="denied-message">
                        <p><i class="fas fa-shield-alt"></i> <strong>Información del intento:</strong></p>
                        ${requiredModule ? `<p><i class="fas fa-cube"></i> <strong>Módulo requerido:</strong> <code>${requiredModule}</code></p>` : ''}
                        ${requiredRole ? `<p><i class="fas fa-user-tag"></i> <strong>Rol requerido:</strong> <code>${requiredRole}</code></p>` : ''}
                        <p><i class="fas fa-user-circle"></i> <strong>Tu rol actual:</strong> <code>${userRole || 'No autenticado'}</code></p>
                        <p><i class="fas fa-link"></i> <strong>URL intentada:</strong> <code>${window.location.pathname}</code></p>
                        ${previousPage && previousPage.includes(window.location.hostname) ? `<p><i class="fas fa-arrow-left"></i> <strong>Página anterior:</strong> <code>${previousPage.split('/').pop() || previousPage}</code></p>` : ''}
                        <div class="module-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>¿Necesitas acceso?</strong> Contacta al administrador del sistema para solicitar permisos.
                        </div>
                    </div>
                    
                    <div class="denied-actions">
                        <button class="btn btn-primary" id="protector-go-back">
                            <i class="fas fa-arrow-left"></i> Volver Atrás
                        </button>
                        <button class="btn btn-secondary" id="protector-go-home">
                            <i class="fas fa-home"></i> Ir al Inicio
                        </button>
                    </div>
                    
                    <div class="denied-footer">
                        <i class="fas fa-clock"></i> Serás redirigido en <span id="protector-countdown" class="counter">5</span> segundos
                    </div>
                </div>
            </div>
        `;

        // Reemplazar el contenido del body
        document.body.innerHTML = deniedHtml;

        // Funciones de redirección
        function goBack() {
            if (previousPage && previousPage.includes(window.location.hostname)) {
                window.location.href = previousPage;
            } else {
                goToHome();
            }
        }

        function goToHome() {
            const userData = getUserDataSync();
            if (userData) {
                const userRoleLocal = userData.rol || userData.role;
                if (userRoleLocal === 'master') {
                    window.location.href = '/adminSistema/dashboard/dashboard.html';
                } else if (userRoleLocal === 'administrador') {
                    window.location.href = '/usuarios/administrador/dashboard/dashboard.html';
                } else if (userRoleLocal === 'colaborador') {
                    window.location.href = '/usuarios/colaborador/dashboardGeneral/dashboardGeneral.html';
                } else {
                    window.location.href = '/login.html';
                }
            } else {
                window.location.href = '/login.html';
            }
        }

        // Agregar eventos después de que el DOM esté listo
        setTimeout(() => {
            const backBtn = document.getElementById('protector-go-back');
            const homeBtn = document.getElementById('protector-go-home');

            if (backBtn) backBtn.onclick = goBack;
            if (homeBtn) homeBtn.onclick = goToHome;
        }, 100);

        // Contador regresivo
        let countdown = 5;
        const countdownElement = document.getElementById('protector-countdown');

        const timer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }

            if (countdown <= 0) {
                clearInterval(timer);
                if (previousPage && previousPage.includes(window.location.hostname)) {
                    window.location.href = previousPage;
                } else {
                    goToHome();
                }
            }
        }, 1000);

        // Registrar en consola para auditoría
        console.warn('[Seguridad] Acceso denegado - Módulo:', requiredModule, 'Rol:', userRole, 'URL:', window.location.pathname);
    }

    /**
     * Obtiene datos del usuario sincrónicamente
     */
    function getUserDataSync() {
        try {
            const sources = ['currentUser', 'userData'];
            for (const source of sources) {
                const data = localStorage.getItem(source);
                if (data) {
                    const user = JSON.parse(data);
                    if (user && (user.rol || user.role)) {
                        return user;
                    }
                }
            }

            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                const user = JSON.parse(sessionUser);
                if (user && (user.rol || user.role)) {
                    return user;
                }
            }

            return null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Obtiene datos del usuario asincrónicamente
     */
    async function getUserData() {
        try {
            const syncUser = getUserDataSync();
            if (syncUser) return syncUser;

            try {
                const module = await import('/clases/user.js');
                const { UserManager } = module;
                userManager = new UserManager();

                return new Promise((resolve) => {
                    let attempts = 0;
                    const checkInterval = setInterval(() => {
                        attempts++;
                        if (userManager.currentUser) {
                            clearInterval(checkInterval);
                            resolve(userManager.currentUser);
                        } else if (attempts > 30) {
                            clearInterval(checkInterval);
                            resolve(null);
                        }
                    }, 100);
                });
            } catch (err) {
                console.log('[Protector] UserManager no disponible');
                return null;
            }
        } catch (err) {
            console.error('[Protector] Error obteniendo usuario:', err);
            return null;
        }
    }

    /**
     * Verifica permiso por rol
     */
    async function checkRolePermission(userRole) {
        if (!requiredRole) return true;
        if (userRole === requiredRole) return true;
        if (userRole === 'master') return true;
        if (requiredRole === 'colaborador' && userRole === 'administrador') return true;
        return false;
    }

    /**
     * Verifica permiso por módulo
     */
    async function checkModulePermission(userRole, moduleId) {
        try {
            console.log('[Protector] Verificando módulo:', moduleId, 'Rol:', userRole);

            // Master y administrador tienen acceso a todos los módulos
            if (userRole === 'master' || userRole === 'administrador') {
                console.log('[Protector] ✅ Acceso total por rol:', userRole);
                return true;
            }

            // Colaborador necesita verificar permisos específicos
            if (userRole === 'colaborador') {
                try {
                    let PermissionManager;
                    let module;

                    const paths = [
                        '../classes/permission.js',
                        '/clases/permission.js',
                        '/js/classes/permission.js',
                        '/components/classes/permission.js'
                    ];

                    for (const path of paths) {
                        try {
                            module = await import(path);
                            PermissionManager = module.PermissionManager || module.default;
                            if (PermissionManager) break;
                        } catch (e) {
                            continue;
                        }
                    }

                    if (!PermissionManager) {
                        console.error('[Protector] No se pudo cargar PermissionManager');
                        return false;
                    }

                    const permissionManager = new PermissionManager();
                    if (permissionManager.cargarTodosPermisos) {
                        await permissionManager.cargarTodosPermisos();
                    } else if (permissionManager.loadPermissions) {
                        await permissionManager.loadPermissions();
                    }

                    const hasPermission = permissionManager.verificarPermiso ?
                        await permissionManager.verificarPermiso(userRole, moduleId) :
                        await permissionManager.checkPermission(userRole, moduleId);

                    console.log('[Protector] Resultado verificación:', hasPermission);
                    return hasPermission;

                } catch (err) {
                    console.error('[Protector] Error en PermissionManager:', err);
                    return false;
                }
            }

            return false;

        } catch (err) {
            console.error('[Protector] Error en checkModulePermission:', err);
            return false;
        }
    }

    /**
     * Validación principal de acceso
     */
    async function validateAccess() {
        try {
            console.log('[Protector] ==========================================');
            console.log('[Protector] Iniciando validación de acceso');
            console.log('[Protector] URL:', window.location.pathname);
            if (requiredModule) console.log('[Protector] Módulo requerido:', requiredModule);
            if (requiredRole) console.log('[Protector] Rol requerido:', requiredRole);
            console.log('[Protector] ==========================================');

            // Obtener usuario actual
            const currentUser = await getUserData();
            let userRole = null;

            if (currentUser) {
                userRole = currentUser.rol || currentUser.role;
                console.log('[Protector] Usuario autenticado:', {
                    email: currentUser.correoElectronico || currentUser.email,
                    rol: userRole
                });
            } else {
                console.log('[Protector] No hay usuario autenticado');
            }

            // Verificar autenticación
            if (!currentUser || !userRole) {
                showAccessDeniedPage('No autenticado', 'no-auth');
                return;
            }

            // Verificar estado del usuario
            if (currentUser.status === false || currentUser.activo === false) {
                console.log('[Protector] Usuario inactivo');
                showAccessDeniedPage(userRole, 'inactive');
                return;
            }

            // Verificar por rol específico
            if (requiredRole) {
                const hasRole = await checkRolePermission(userRole);
                if (!hasRole) {
                    console.log('[Protector] Rol no autorizado');
                    showAccessDeniedPage(userRole, 'role');
                    return;
                }
            }

            // Verificar por módulo específico
            if (requiredModule) {
                const hasModule = await checkModulePermission(userRole, requiredModule);
                if (!hasModule) {
                    console.log('[Protector] Módulo no autorizado');
                    showAccessDeniedPage(userRole, 'module');
                    return;
                }
            }

            // TODO CORRECTO - Mostrar la página normal
            console.log('[Protector] ✅ Acceso CONCEDIDO');

        } catch (error) {
            console.error('[Protector] Error en validación:', error);
            showAccessDeniedPage(null, 'error');
        }
    }

    // Ejecutar validación inmediatamente
    validateAccess();
})();