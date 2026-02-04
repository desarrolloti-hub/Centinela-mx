// login.js - Sistema completo de inicio de sesión
// Maneja autenticación, almacenamiento de sesión y redirección
// ===============================================================

// IMPORTACIÓN DE MÓDULOS
import { UserManager } from '/clases/user.js';

// FUNCIÓN AUXILIAR: Convertir texto a camelCase
function toCamelCase(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '')
        .replace(/^(.)/, (match) => match.toLowerCase());
}

// INICIALIZACIÓN PRINCIPAL - Se ejecuta cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Login page loaded - Sistema de sesión con almacenamiento local');
    
    // ELEMENTOS DEL DOM - Referencias a los elementos HTML
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const loginMessage = document.getElementById('loginMessage');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const registerBtn = document.getElementById('registerBtn');
    
    // VERIFICACIÓN DE ELEMENTOS - Comprobar que existen los elementos esenciales
    if (!loginForm || !emailInput || !passwordInput) {
        console.error('❌ Elementos del formulario no encontrados:', {
            loginForm: !!loginForm,
            emailInput: !!emailInput,
            passwordInput: !!passwordInput
        });
        showMessage(loginMessage, 'error', 'Error: Formulario no configurado correctamente');
        return;
    }
    
    console.log('✅ Elementos del formulario encontrados');
    
    // INICIALIZACIÓN DE USERMANAGER - Crear instancia para manejo de usuarios
    let userManager;
    try {
        userManager = new UserManager();
        console.log('✅ UserManager inicializado:', userManager);
    } catch (error) {
        console.error('❌ Error al crear UserManager:', error);
        showMessage(loginMessage, 'error', 'Error: Sistema no disponible. Contacta al administrador.');
        return;
    }
    
    // FUNCIONES DE UTILIDAD - Funciones auxiliares para el sistema
    // ===============================================================
    
    // FUNCIÓN: Mostrar mensajes en la interfaz
    function showMessage(element, type, text) {
        if (!element) {
            console.warn('❌ Elemento para mensaje no encontrado');
            return;
        }
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        const colors = {
            'success': '#4CAF50',
            'error': '#F44336',
            'warning': '#FF9800',
            'info': '#2196F3'
        };
        
        element.innerHTML = `
            <div class="message-${type}" style="
                background: ${colors[type]}15;
                border-left: 4px solid ${colors[type]};
                padding: 12px 16px;
                border-radius: 4px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease;
            ">
                <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 1.2em;"></i>
                <span style="color: var(--color-text-primary); font-weight: 500;">${text}</span>
            </div>
        `;
        element.style.display = 'block';
        
        // Auto-ocultar mensajes de éxito después de 5 segundos
        if (type === 'success') {
            setTimeout(() => {
                clearMessage();
            }, 5000);
        }
    }
    
    // FUNCIÓN: Limpiar mensajes de la interfaz
    function clearMessage() {
        if (loginMessage) {
            loginMessage.innerHTML = '';
            loginMessage.style.display = 'none';
        }
    }
    
    // FUNCIÓN: Validar formato de email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // FUNCIÓN: Controlar estado del botón de login
    function toggleButtonState(enabled = true, text = null) {
        if (!loginSubmitBtn) return;
        
        if (enabled) {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> INICIAR SESIÓN';
            loginSubmitBtn.style.opacity = '1';
            loginSubmitBtn.style.cursor = 'pointer';
        } else {
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerHTML = text || '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            loginSubmitBtn.style.opacity = '0.7';
            loginSubmitBtn.style.cursor = 'not-allowed';
        }
    }
    
    // FUNCIÓN: Guardar datos del usuario en localStorage (persistente)
    function saveUserToLocalStorage(user) {
        try {
            // Generar organizacionCamelCase
            const organizacionCamelCase = toCamelCase(user.organizacion);
            
            // Crear objeto con datos seguros del usuario
            const userData = {
                id: user.id,
                email: user.email,
                nombreCompleto: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion, // Nombre original de la organización
                organizacionCamelCase: organizacionCamelCase, // Nombre en camelCase
                status: user.status,
                verificado: user.verificado,
                fotoURL: user.fotoURL || '',
                ultimoAcceso: new Date().toISOString(),
                sessionStart: new Date().toISOString(),
                fechaLogin: new Date().toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            
            // Guardar en localStorage (persiste entre sesiones del navegador)
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', user.cargo);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userOrganizacion', user.organizacion);
            localStorage.setItem('userOrganizacionCamelCase', organizacionCamelCase);
            localStorage.setItem('userNombre', user.nombreCompleto);
            
            console.log('💾 Datos del usuario guardados en localStorage:', {
                id: user.id,
                nombre: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion,
                organizacionCamelCase: organizacionCamelCase,
                timestamp: userData.fechaLogin
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error al guardar en localStorage:', error);
            return false;
        }
    }
    
    // FUNCIÓN: Guardar datos del usuario en sessionStorage (temporal)
    function saveUserToSessionStorage(user) {
        try {
            // Generar organizacionCamelCase
            const organizacionCamelCase = toCamelCase(user.organizacion);
            
            // Crear objeto con datos de sesión
            const sessionData = {
                id: user.id,
                email: user.email,
                nombreCompleto: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion, // Nombre original de la organización
                organizacionCamelCase: organizacionCamelCase, // Nombre en camelCase
                sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                sessionStart: new Date().toISOString(),
                sessionStartFormatted: new Date().toLocaleTimeString('es-ES'),
                token: 'auth_token_' + Date.now(),
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`
            };
            
            // Guardar en sessionStorage (se borra al cerrar el navegador)
            sessionStorage.setItem('currentSession', JSON.stringify(sessionData));
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('sessionStart', new Date().toISOString());
            sessionStorage.setItem('sessionOrganizacion', user.organizacion);
            sessionStorage.setItem('sessionOrganizacionCamelCase', organizacionCamelCase);
            sessionStorage.setItem('sessionUser', user.nombreCompleto);
            sessionStorage.setItem('sessionRole', user.cargo);
            
            console.log('🔐 Sesión guardada en sessionStorage:', {
                sessionId: sessionData.sessionId,
                user: user.nombreCompleto,
                organizacion: user.organizacion,
                organizacionCamelCase: organizacionCamelCase,
                timestamp: sessionData.sessionStartFormatted
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error al guardar en sessionStorage:', error);
            return false;
        }
    }
    
    // FUNCIÓN: Limpiar datos de usuario del almacenamiento (para logout)
    function clearUserStorage() {
        try {
            // Limpiar localStorage
            localStorage.removeItem('userData');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userId');
            localStorage.removeItem('userOrganizacion');
            localStorage.removeItem('userOrganizacionCamelCase');
            localStorage.removeItem('userNombre');
            
            // Limpiar sessionStorage
            sessionStorage.removeItem('currentSession');
            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('sessionStart');
            sessionStorage.removeItem('sessionOrganizacion');
            sessionStorage.removeItem('sessionOrganizacionCamelCase');
            sessionStorage.removeItem('sessionUser');
            sessionStorage.removeItem('sessionRole');
            
            console.log('🗑️ Datos de usuario eliminados del almacenamiento');
            console.log('📋 Información eliminada:', {
                localStorage: ['userData', 'isLoggedIn', 'userRole', 'userId', 'userOrganizacion', 'userOrganizacionCamelCase', 'userNombre'],
                sessionStorage: ['currentSession', 'isAuthenticated', 'sessionStart', 'sessionOrganizacion', 'sessionOrganizacionCamelCase', 'sessionUser', 'sessionRole']
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error al limpiar almacenamiento:', error);
            return false;
        }
    }
    
    // FUNCIÓN: Verificar si hay una sesión activa
    function checkExistingSession() {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const hasSession = sessionStorage.getItem('isAuthenticated') === 'true';
            
            if (isLoggedIn && hasSession) {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const sessionData = JSON.parse(sessionStorage.getItem('currentSession') || '{}');
                
                console.log('🔍 Sesión existente encontrada:', {
                    usuario: userData.nombreCompleto,
                    organizacion: userData.organizacion,
                    organizacionCamelCase: userData.organizacionCamelCase,
                    sessionId: sessionData.sessionId,
                    tiempoSesion: sessionData.sessionStart
                });
                
                // Mostrar información útil en consola
                if (userData.organizacionCamelCase) {
                    console.log('🏢 CamelCase disponible:', userData.organizacionCamelCase);
                    console.log('📝 Ejemplos de uso:');
                    console.log('   - Para nombres de clase CSS: .' + userData.organizacionCamelCase + '-widget');
                    console.log('   - Para nombres de variables: const ' + userData.organizacionCamelCase + 'Data = ...');
                    console.log('   - Para nombres de archivos: reporte-' + userData.organizacionCamelCase + '.pdf');
                }
                
                // Podríamos redirigir automáticamente si la sesión es válida
                // return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error al verificar sesión:', error);
            return false;
        }
    }
    
    // FUNCIÓN: Mostrar información de la organización en consola
    function logOrganizationInfo(organizacion, organizacionCamelCase) {
        console.log('🏢 INFORMACIÓN DE ORGANIZACIÓN:');
        console.log('   Nombre original:', organizacion);
        console.log('   CamelCase:', organizacionCamelCase);
        console.log('   Longitud:', organizacion.length, 'caracteres');
        console.log('   CamelCase length:', organizacionCamelCase.length, 'caracteres');
        console.log('   Uso práctico:', {
            cssClass: '.' + organizacionCamelCase + '-card',
            jsVariable: 'const ' + organizacionCamelCase + 'Config',
            localStorageKey: organizacionCamelCase + '_preferences',
            apiEndpoint: '/api/' + organizacionCamelCase + '/data'
        });
    }
    
    // MOSTRAR/OCULTAR CONTRASEÑA - Configurar botón de visibilidad
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
                this.setAttribute('aria-label', 'Ocultar contraseña');
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
                this.setAttribute('aria-label', 'Mostrar contraseña');
            }
            
            // Mantener el foco en el input
            passwordInput.focus();
        });
        
        console.log('✅ Botón mostrar/ocultar contraseña configurado');
    }
    
    // FORMULARIO DE LOGIN - Manejar el envío del formulario
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log('📤 Formulario de login enviado');
        
        // Limpiar mensajes anteriores
        clearMessage();
        
        // Obtener valores
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        console.log('📝 Datos ingresados:', { email: email, passwordLength: password.length });
        
        // VALIDACIONES BÁSICAS
        if (!email || !password) {
            showMessage(loginMessage, 'error', '⚠️ Por favor completa todos los campos');
            emailInput.focus();
            return;
        }
        
        if (!validateEmail(email)) {
            showMessage(loginMessage, 'error', '⚠️ Por favor ingresa un correo electrónico válido');
            emailInput.focus();
            emailInput.select();
            return;
        }
        
        if (password.length < 6) {
            showMessage(loginMessage, 'error', '⚠️ La contraseña debe tener al menos 6 caracteres');
            passwordInput.focus();
            passwordInput.select();
            return;
        }
        
        // Deshabilitar botón para evitar múltiples clics
        toggleButtonState(false, '<i class="fas fa-spinner fa-spin"></i> VERIFICANDO...');
        
        try {
            console.log('🔐 Intentando iniciar sesión con:', email);
            
            // INTENTAR INICIAR SESIÓN usando UserManager
            const user = await userManager.iniciarSesion(email, password);
            
            console.log('✅ Login exitoso:', {
                id: user.id,
                nombre: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion,
                status: user.status,
                verificado: user.verificado
            });
            
            // Mostrar información de la organización
            const organizacionCamelCase = toCamelCase(user.organizacion);
            logOrganizationInfo(user.organizacion, organizacionCamelCase);
            
            // GUARDAR DATOS EN ALMACENAMIENTO
            const savedToLocal = saveUserToLocalStorage(user);
            const savedToSession = saveUserToSessionStorage(user);
            
            if (savedToLocal && savedToSession) {
                console.log('💾✅ Datos de usuario guardados correctamente en ambos almacenamientos');
                
                // Verificar que los datos se guardaron correctamente
                const localOrg = localStorage.getItem('userOrganizacion');
                const localOrgCamel = localStorage.getItem('userOrganizacionCamelCase');
                const sessionOrg = sessionStorage.getItem('sessionOrganizacion');
                const sessionOrgCamel = sessionStorage.getItem('sessionOrganizacionCamelCase');
                
                console.log('🔍 Verificación de almacenamiento:', {
                    localStorage: { organizacion: localOrg, camelCase: localOrgCamel },
                    sessionStorage: { organizacion: sessionOrg, camelCase: sessionOrgCamel }
                });
            } else {
                console.warn('⚠️ Algunos datos no se guardaron completamente');
            }
            
            // Mostrar mensaje de éxito con información de la organización
            showMessage(loginMessage, 'success', 
                `🎉 ¡Bienvenido ${user.nombreCompleto}!<br>
                 <small>Organización: ${user.organizacion}<br>
                 Redirigiendo al sistema...</small>`
            );
            
            // Cambiar texto del botón
            toggleButtonState(false, '<i class="fas fa-check"></i> SESIÓN INICIADA');
            
            // REDIRIGIR según el tipo de usuario después de 2 segundos
            setTimeout(() => {
                console.log('🔄 Redirigiendo usuario...');
                console.log('📍 Información disponible para redirección:', {
                    cargo: user.cargo,
                    organizacion: user.organizacion,
                    organizacionCamelCase: organizacionCamelCase
                });
                
                // Ejemplo de cómo usar organizacionCamelCase en redirecciones
                if (user.cargo === 'administrador') {
                    console.log('👑 Redirigiendo a dashboard de administrador');
                    // Podrías usar: window.location.href = `/admin/${organizacionCamelCase}/dashboard.html`;
                    window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
                } else if (user.cargo === 'colaborador') {
                    console.log('👤 Redirigiendo a dashboard de colaborador');
                    // Podrías usar: window.location.href = `/collaborator/${organizacionCamelCase}/dashboard.html`;
                    window.location.href = '/users/colaborador/dashboard.html';
                } else {
                    console.log('❓ Tipo de usuario desconocido, redirigiendo a inicio');
                    window.location.href = '/index.html';
                }
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error en login:', error);
            
            // Rehabilitar botón
            toggleButtonState(true);
            
            // Determinar mensaje de error
            let errorMessage = 'Error al iniciar sesión';
            let errorType = 'error';
            
            if (error.message.includes('auth/invalid-credential') || 
                error.message.includes('auth/wrong-password')) {
                errorMessage = '❌ Correo electrónico o contraseña incorrectos';
                errorType = 'error';
            } else if (error.message.includes('auth/user-not-found')) {
                errorMessage = '❌ No existe una cuenta con este correo electrónico';
                errorType = 'error';
            } else if (error.message.includes('auth/too-many-requests')) {
                errorMessage = '⚠️ Demasiados intentos fallidos. Intenta más tarde o recupera tu contraseña';
                errorType = 'warning';
            } else if (error.message.includes('auth/network-request-failed')) {
                errorMessage = '🌐 Error de conexión. Verifica tu conexión a internet';
                errorType = 'warning';
            } else if (error.message.includes('no encontrado')) {
                errorMessage = '❌ Usuario no encontrado en la base de datos';
                errorType = 'error';
            } else if (error.message.includes('desactivada') || error.message.includes('inhabilitada')) {
                errorMessage = '🚫 Tu cuenta está desactivada. Contacta al administrador';
                errorType = 'warning';
            } else if (error.message.includes('no está verificado')) {
                errorMessage = '📧 Tu email no está verificado. Revisa tu correo y haz clic en el enlace de verificación';
                errorType = 'warning';
            } else if (error.message.includes('inactiva')) {
                errorMessage = '⏸️ Tu cuenta está inactiva. Contacta al administrador';
                errorType = 'warning';
            } else {
                errorMessage = `❌ Error: ${error.message || 'Error desconocido'}`;
            }
            
            // Mostrar error
            showMessage(loginMessage, errorType, errorMessage);
            
            // Enfocar campo apropiado
            if (error.message.includes('password') || error.message.includes('contraseña')) {
                passwordInput.focus();
                passwordInput.select();
            } else {
                emailInput.focus();
                emailInput.select();
            }
        }
    });
    
    // ENTER PARA SUBMIT - Permitir enviar formulario con Enter
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === passwordInput) {
            console.log('↵ Enter presionado en campo contraseña');
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // RECUPERAR CONTRASEÑA - Manejar clic en enlace "Olvidé mi contraseña"
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔗 Clic en recuperar contraseña');
            showMessage(loginMessage, 'info', '⏳ Función de recuperación de contraseña en desarrollo. Contacta al administrador.');
        });
    }
    
    // BOTÓN REGISTRARSE - Redirigir a página de registro
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            console.log('👤 Clic en botón registrarse');
            // Ya tiene href, no necesita handler adicional
        });
    }
    
    // VERIFICAR SESIÓN EXISTENTE al cargar la página
    const hasExistingSession = checkExistingSession();
    if (hasExistingSession) {
        console.log('🔍 Sesión activa detectada, podrías redirigir automáticamente');
        // Opcional: Redirigir automáticamente si hay sesión
        // showMessage(loginMessage, 'info', '📱 Tienes una sesión activa. Redirigiendo...');
    }
    
    // ESTILOS PARA ANIMACIONES - Agregar estilos dinámicamente
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
        }
        
        .message-success, .message-error, .message-warning, .message-info {
            padding: 12px 16px;
            border-radius: 6px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .message-success {
            background: rgba(76, 175, 80, 0.1);
            border-left: 4px solid #4CAF50;
        }
        
        .message-error {
            background: rgba(244, 67, 54, 0.1);
            border-left: 4px solid #F44336;
        }
        
        .message-warning {
            background: rgba(255, 152, 0, 0.1);
            border-left: 4px solid #FF9800;
        }
        
        .message-info {
            background: rgba(33, 150, 243, 0.1);
            border-left: 4px solid #2196F3;
        }
        
        .submit-login-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            animation: pulse 1.5s infinite;
        }
        
        .submit-login-btn:disabled:hover {
            transform: none !important;
            box-shadow: none !important;
        }
        
        .password-toggle-btn {
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .password-toggle-btn:hover {
            color: var(--color-primary) !important;
            transform: scale(1.1);
        }
        
        .message-success small {
            display: block;
            font-size: 0.85em;
            opacity: 0.9;
            margin-top: 4px;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
    
    // AUTOFOCO - Enfocar automáticamente el campo email
    setTimeout(() => {
        if (emailInput) {
            emailInput.focus();
            console.log('🎯 Campo email enfocado automáticamente');
        }
    }, 300);
    
    console.log('✅ Sistema de login inicializado correctamente');
});

// Mensaje inicial al cargar el script
console.log('📄 login.js cargado y listo - Con almacenamiento de organización en camelCase');