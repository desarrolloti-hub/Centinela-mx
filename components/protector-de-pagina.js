// protect-centinela.js - Script para proteger páginas en Centinela
// Uso: <script src="/js/protect-centinela.js" data-modulo="incidencias"></script>
//      <script src="/js/protect-centinela.js" data-rol="administrador"></script>

(function () {
    // Obtener parámetros del script
    const scripts = document.getElementsByTagName('script');
    let requiredModule = null;
    let requiredRole = null;
    let alertMessage = 'No tienes permiso para acceder a esta página.';
    let alertTitle = 'Acceso Denegado';
    let redirectUrl = null;

    // Buscar script con configuración
    for (let script of scripts) {
        if (script.src && script.src.includes('protect-centinela.js')) {
            requiredModule = script.getAttribute('data-modulo');
            requiredRole = script.getAttribute('data-rol');
            alertMessage = script.getAttribute('data-mensaje') || alertMessage;
            alertTitle = script.getAttribute('data-titulo') || alertTitle;
            redirectUrl = script.getAttribute('data-redirigir');
            break;
        }
    }

    // Si no hay módulo ni rol, no hay restricción
    if (!requiredModule && !requiredRole) {
        console.log('[CentinelaProtect] Sin restricciones - página pública');
        return;
    }

    let redirected = false;
    let userManager = null;

    // ==================== FUNCIONES UI ====================
    function loadSweetAlert(callback) {
        if (typeof Swal !== 'undefined') {
            callback();
            return;
        }

        const swalScript = document.createElement('script');
        swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        swalScript.onload = callback;
        swalScript.onerror = callback;
        document.head.appendChild(swalScript);
    }

    function showLoading() {
        if (document.getElementById('centinela-protect-loading')) return;

        const loadingEl = document.createElement('div');
        loadingEl.id = 'centinela-protect-loading';
        loadingEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            backdrop-filter: blur(5px);
        `;
        loadingEl.innerHTML = `
            <div style="
                background: white;
                padding: 30px 40px;
                border-radius: 16px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            ">
                <i class="fas fa-shield-alt fa-spin fa-3x" style="color: #f5d742; margin-bottom: 20px;"></i>
                <p style="color: #333; margin: 0; font-family: 'Poppins', sans-serif;">
                    Verificando permisos...
                </p>
            </div>
        `;
        document.body.appendChild(loadingEl);

        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }
    }

    function hideLoading() {
        const loadingEl = document.getElementById('centinela-protect-loading');
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    function redirectToDashboard() {
        if (redirected) return;
        redirected = true;

        // Intentar ir a la página anterior
        if (document.referrer && document.referrer.includes(window.location.host)) {
            window.location.href = document.referrer;
            return;
        }

        // URL personalizada si está configurada
        if (redirectUrl) {
            window.location.href = redirectUrl;
            return;
        }

        // Determinar dashboard según rol del usuario
        if (userManager && userManager.currentUser) {
            const userRole = userManager.currentUser.rol;

            if (userRole === 'master') {
                window.location.href = '/adminSistema/dashboard/dashboard.html';
            } else if (userRole === 'administrador') {
                window.location.href = '/usuarios/administrador/dashboard/dashboard.html';
            } else {
                window.location.href = '/usuarios/colaborador/dashboardGeneral/dashboardGeneral.html';
            }
        } else {
            // Fallback
            window.location.href = '/login.html';
        }
    }

    // ==================== FUNCIONES DE USUARIO ====================
    async function getUserData() {
        try {
            // Buscar usuario en diferentes fuentes
            const sources = ['currentUser', 'userData'];
            for (const source of sources) {
                const data = localStorage.getItem(source);
                if (data) {
                    const user = JSON.parse(data);
                    console.log('[CentinelaProtect] Usuario encontrado en', source, user.email || user.correoElectronico);
                    return user;
                }
            }

            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                return JSON.parse(sessionUser);
            }

            return null;
        } catch (err) {
            console.error('[CentinelaProtect] Error obteniendo usuario:', err);
            return null;
        }
    }

    async function initUserManager() {
        try {
            const module = await import('/clases/user.js');
            const { UserManager } = module;
            userManager = new UserManager();

            // Esperar a que cargue el usuario actual
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (userManager.currentUser) {
                        clearInterval(checkInterval);
                        resolve(userManager.currentUser);
                    } else if (userManager.currentUser === null && window.auth?.currentUser === null) {
                        clearInterval(checkInterval);
                        resolve(null);
                    }
                }, 100);

                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve(null);
                }, 5000);
            });
        } catch (err) {
            console.error('[CentinelaProtect] Error inicializando UserManager:', err);
            return null;
        }
    }

    async function checkRolePermission(userRole) {
        // Si no se requiere rol específico, pasar
        if (!requiredRole) return true;

        // Verificar rol
        if (userRole === requiredRole) return true;

        // Master tiene acceso a todo si se requiere admin
        if (userRole === 'master' && requiredRole === 'administrador') return true;

        return false;
    }

    async function checkModulePermission(userRole, moduleId) {
        try {
            console.log('[CentinelaProtect] Verificando módulo:', moduleId, 'para rol:', userRole);

            // Master tiene acceso a todo
            if (userRole === 'master') {
                console.log('[CentinelaProtect] Master tiene acceso a todo');
                return true;
            }

            // Administrador tiene acceso a todo
            if (userRole === 'administrador') {
                console.log('[CentinelaProtect] Administrador tiene acceso a todo');
                return true;
            }

            // Para colaborador, verificar permisos
            if (userRole === 'colaborador') {
                try {
                    const permisoModule = await import('/clases/permiso.js');
                    const { PermisoManager } = permisoModule;
                    const permisoManager = new PermisoManager();
                    await permisoManager.cargarTodosPermisos();

                    const hasPermission = await permisoManager.verificarPermiso(userRole, moduleId);
                    console.log('[CentinelaProtect] Permiso para colaborador:', hasPermission);
                    return hasPermission;
                } catch (err) {
                    console.error('[CentinelaProtect] Error verificando permiso:', err);
                    return false;
                }
            }

            return false;

        } catch (err) {
            console.error('[CentinelaProtect] Error en checkModulePermission:', err);
            return false;
        }
    }

    async function checkPermission() {
        try {
            console.log('[CentinelaProtect] Iniciando verificación...');
            showLoading();

            // 1. Obtener usuario actual
            let currentUser = await getUserData();
            let userRole = null;

            // 2. Si no hay usuario en localStorage, intentar con UserManager
            if (!currentUser) {
                const user = await initUserManager();
                if (user) {
                    currentUser = user;
                    userRole = user.rol;
                    console.log('[CentinelaProtect] Usuario cargado desde UserManager:', user.correoElectronico);
                }
            } else {
                userRole = currentUser.rol || currentUser.role;
                console.log('[CentinelaProtect] Usuario cargado desde localStorage:', currentUser.correoElectronico || currentUser.email);
            }

            // 3. Verificar si hay sesión
            if (!currentUser || !userRole) {
                throw new Error('No hay sesión activa');
            }

            // 4. Verificar estado del usuario
            if (currentUser.status === false) {
                throw new Error('Usuario inactivo');
            }

            console.log('[CentinelaProtect] Usuario autenticado:', {
                nombre: currentUser.nombreCompleto || currentUser.name,
                rol: userRole,
                email: currentUser.correoElectronico || currentUser.email
            });

            // 5. Verificar por rol específico
            if (requiredRole) {
                const hasRole = await checkRolePermission(userRole);
                if (!hasRole) {
                    console.log('[CentinelaProtect] Rol no autorizado. Requerido:', requiredRole, 'Actual:', userRole);
                    hideLoading();

                    loadSweetAlert(() => {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                icon: 'error',
                                title: alertTitle,
                                html: `
                                    <i class="fas fa-lock fa-3x" style="color: #f5d742; margin-bottom: 15px;"></i>
                                    <p>${alertMessage}</p>
                                    <p style="font-size: 13px; margin-top: 10px;">
                                        Rol requerido: <strong>${requiredRole}</strong><br>
                                        Tu rol: <strong>${userRole}</strong>
                                    </p>
                                `,
                                timer: 3000,
                                timerProgressBar: true,
                                showConfirmButton: false,
                                allowOutsideClick: false
                            }).then(() => {
                                redirectToDashboard();
                            });
                        } else {
                            alert(`${alertTitle}\n\n${alertMessage}\n\nRol requerido: ${requiredRole}\nTu rol: ${userRole}`);
                            setTimeout(redirectToDashboard, 3000);
                        }
                    });
                    return;
                }
            }

            // 6. Verificar por módulo específico
            if (requiredModule) {
                const hasModulePermission = await checkModulePermission(userRole, requiredModule);

                if (!hasModulePermission) {
                    console.log('[CentinelaProtect] Módulo no autorizado. Módulo:', requiredModule);
                    hideLoading();

                    loadSweetAlert(() => {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                icon: 'error',
                                title: alertTitle,
                                html: `
                                    <i class="fas fa-ban fa-3x" style="color: #f5d742; margin-bottom: 15px;"></i>
                                    <p>${alertMessage}</p>
                                    <p style="font-size: 13px; margin-top: 10px;">
                                        Módulo requerido: <strong>${requiredModule}</strong><br>
                                        Tu rol: <strong>${userRole}</strong>
                                    </p>
                                `,
                                timer: 3000,
                                timerProgressBar: true,
                                showConfirmButton: false,
                                allowOutsideClick: false
                            }).then(() => {
                                redirectToDashboard();
                            });
                        } else {
                            alert(`${alertTitle}\n\n${alertMessage}\n\nMódulo: ${requiredModule}`);
                            setTimeout(redirectToDashboard, 3000);
                        }
                    });
                    return;
                }
            }

            // 7. Todo correcto, permitir acceso
            console.log('[CentinelaProtect] Acceso concedido');
            hideLoading();

        } catch (error) {
            console.error('[CentinelaProtect] Error:', error);
            hideLoading();

            // Redirigir a login si no hay sesión
            if (error.message === 'No hay sesión activa') {
                loadSweetAlert(() => {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'info',
                            title: 'Sesión Requerida',
                            text: 'Por favor, inicia sesión para continuar.',
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            window.location.href = '/login.html';
                        });
                    } else {
                        window.location.href = '/login.html';
                    }
                });
            } else {
                redirectToDashboard();
            }
        }
    }

    // Ejecutar verificación
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkPermission);
    } else {
        checkPermission();
    }
})();