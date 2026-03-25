// protector-admin.js - Protección exclusiva para páginas de administradores
// Ubicación: /components/protector-admin.js
// Uso: <script src="/components/protector-admin.js"></script>

(function () {
    // ========== CONFIGURACIÓN ==========
    let customMessage = null;
    let customTitle = null;

    // Obtener configuración del script
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
        if (script.src && script.src.includes('protector-admin.js')) {
            customMessage = script.getAttribute('data-mensaje');
            customTitle = script.getAttribute('data-titulo');
            break;
        }
    }

    let validated = false;
    let userManager = null;
    let previousPage = document.referrer;

    // ========== FUNCIONES ==========

    /**
     * Muestra la página de acceso denegado
     */
    function showAccessDeniedPage(userRole) {
        if (validated) return;
        validated = true;

        console.log('[Protector-Admin] ❌ Acceso DENEGADO');
        console.log('[Protector-Admin] Rol actual:', userRole || 'No autenticado');
        console.log('[Protector-Admin] URL:', window.location.pathname);

        // Limpiar todo el contenido actual
        document.body.innerHTML = '';

        // Metatags
        const meta = document.createElement('meta');
        meta.setAttribute('charset', 'UTF-8');
        document.head.appendChild(meta);

        const viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        document.head.appendChild(viewport);

        document.title = 'Centinela-MX | Acceso Denegado - Administradores';

        // Favicon
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = '/assets/images/logo.png';
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

            .particle-bg {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
                background: radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.15) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.1) 0%, transparent 50%);
                pointer-events: none;
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
                border: 1px solid rgba(220, 38, 38, 0.5);
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
                    box-shadow: 0 0 20px rgba(220, 38, 38, 0.3);
                    border-color: rgba(220, 38, 38, 0.5);
                }
                50% {
                    box-shadow: 0 0 40px rgba(220, 38, 38, 0.6);
                    border-color: rgba(220, 38, 38, 0.8);
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
            }

            .denied-subtitle {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 24px;
                font-weight: 500;
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
                font-size: 13px;
                border: 1px solid rgba(239, 68, 68, 0.3);
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
                font-family: 'Orbitron', sans-serif;
            }

            .btn-primary {
                background: linear-gradient(135deg, #dc2626, #b91c1c);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.5);
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
            }

            @media (max-width: 640px) {
                .denied-card {
                    padding: 32px 24px;
                    margin: 20px;
                }
                .denied-title {
                    font-size: 24px;
                }
                .denied-actions {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);

        let message = customMessage || 'Esta área es exclusiva para Administradores del sistema.';
        let title = customTitle || '👑 Área de Administradores';

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
                        <p><i class="fas fa-user-tag"></i> <strong>Rol requerido:</strong> <code>administrador</code> o <code>master</code></p>
                        <p><i class="fas fa-user-circle"></i> <strong>Tu rol actual:</strong> <code>${userRole || 'No autenticado'}</code></p>
                        <p><i class="fas fa-link"></i> <strong>URL intentada:</strong> <code>${window.location.pathname}</code></p>
                        <div class="module-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>¿Eres administrador?</strong> Inicia sesión con tu cuenta de administrador para acceder.
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

        document.body.innerHTML = deniedHtml;

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
                } else {
                    window.location.href = '/usuarios/colaborador/dashboardGeneral/dashboardGeneral.html';
                }
            } else {
                window.location.href = '/login.html';
            }
        }

        setTimeout(() => {
            const backBtn = document.getElementById('protector-go-back');
            const homeBtn = document.getElementById('protector-go-home');
            if (backBtn) backBtn.onclick = goBack;
            if (homeBtn) homeBtn.onclick = goToHome;
        }, 100);

        let countdown = 5;
        const countdownElement = document.getElementById('protector-countdown');
        const timer = setInterval(() => {
            countdown--;
            if (countdownElement) countdownElement.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(timer);
                if (previousPage && previousPage.includes(window.location.hostname)) {
                    window.location.href = previousPage;
                } else {
                    goToHome();
                }
            }
        }, 1000);
    }

    function getUserDataSync() {
        try {
            const sources = ['currentUser', 'userData'];
            for (const source of sources) {
                const data = localStorage.getItem(source);
                if (data) {
                    const user = JSON.parse(data);
                    if (user && (user.rol || user.role)) return user;
                }
            }
            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                const user = JSON.parse(sessionUser);
                if (user && (user.rol || user.role)) return user;
            }
            return null;
        } catch (err) {
            return null;
        }
    }

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
                return null;
            }
        } catch (err) {
            return null;
        }
    }

    async function validateAccess() {
        try {
            console.log('[Protector-Admin] ==========================================');
            console.log('[Protector-Admin] Verificando acceso a página de administrador');
            console.log('[Protector-Admin] URL:', window.location.pathname);

            const currentUser = await getUserData();
            let userRole = null;

            if (currentUser) {
                userRole = currentUser.rol || currentUser.role;
                console.log('[Protector-Admin] Usuario:', { email: currentUser.correoElectronico || currentUser.email, rol: userRole });
            } else {
                console.log('[Protector-Admin] No hay usuario autenticado');
            }

            if (!currentUser || !userRole) {
                showAccessDeniedPage('No autenticado');
                return;
            }

            if (currentUser.status === false || currentUser.activo === false) {
                console.log('[Protector-Admin] Usuario inactivo');
                showAccessDeniedPage(userRole);
                return;
            }

            // VERIFICACIÓN EXCLUSIVA PARA ADMINISTRADORES
            // Solo administrador o master pueden acceder
            if (userRole === 'administrador' || userRole === 'master') {
                console.log('[Protector-Admin] ✅ Acceso CONCEDIDO - Rol:', userRole);
                return;
            }

            // Si es colaborador, DENEGAR ACCESO
            console.log('[Protector-Admin] ❌ Acceso DENEGADO - Rol no autorizado:', userRole);
            showAccessDeniedPage(userRole);

        } catch (error) {
            console.error('[Protector-Admin] Error:', error);
            showAccessDeniedPage(null);
        }
    }

    validateAccess();
})();