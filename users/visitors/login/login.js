// login.js - Sistema básico de inicio de sesión
// Solo maneja autenticación y redirección
// =============================================

// IMPORTACIÓN CORREGIDA - usa '/classes/user.js' en lugar de '/clases/user.js'
import { UserManager } from '/clases/user.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Login page loaded');
    
    // Elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const loginMessage = document.getElementById('loginMessage');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    
    // Verificar elementos esenciales
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
    
    // Instancia de UserManager con manejo de errores
    let userManager;
    try {
        userManager = new UserManager();
        console.log('✅ UserManager inicializado:', userManager);
    } catch (error) {
        console.error('❌ Error al crear UserManager:', error);
        showMessage(loginMessage, 'error', 'Error: Sistema no disponible. Contacta al administrador.');
        return;
    }
    
    // ========== FUNCIONES DE UTILIDAD ==========
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
    
    function clearMessage() {
        if (loginMessage) {
            loginMessage.innerHTML = '';
            loginMessage.style.display = 'none';
        }
    }
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
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
    
    // ========== MOSTRAR/OCULTAR CONTRASEÑA ==========
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
    
    // ========== FORMULARIO DE LOGIN ==========
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log('📤 Formulario de login enviado');
        
        // Limpiar mensajes anteriores
        clearMessage();
        
        // Obtener valores
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        console.log('📝 Datos ingresados:', { email: email, passwordLength: password.length });
        
        // Validaciones básicas
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
            
            // Intentar iniciar sesión usando UserManager
            const user = await userManager.iniciarSesion(email, password);
            
            console.log('✅ Login exitoso:', {
                id: user.id,
                nombre: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion,
                status: user.status,
                verificado: user.verificado
            });
            
            // Mostrar mensaje de éxito
            showMessage(loginMessage, 'success', `🎉 ¡Bienvenido ${user.nombreCompleto}! Redirigiendo al sistema...`);
            
            // Cambiar texto del botón
            toggleButtonState(false, '<i class="fas fa-check"></i> SESIÓN INICIADA');
            
            // Redirigir según el tipo de usuario después de 2 segundos
            setTimeout(() => {
                console.log('🔄 Redirigiendo usuario...');
                if (user.cargo === 'administrador') {
                    console.log('👑 Redirigiendo a dashboard de administrador');
                    window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
                } else if (user.cargo === 'colaborador') {
                    console.log('👤 Redirigiendo a dashboard de colaborador');
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
    
    // ========== ENTER PARA SUBMIT ==========
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === passwordInput) {
            console.log('↵ Enter presionado en campo contraseña');
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // ========== RECUPERAR CONTRASEÑA ==========
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔗 Clic en recuperar contraseña');
            showMessage(loginMessage, 'info', '⏳ Función de recuperación de contraseña en desarrollo. Contacta al administrador.');
        });
    }
    
    // ========== BOTÓN REGISTRARSE ==========
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            console.log('👤 Clic en botón registrarse');
            // Ya tiene href, no necesita handler adicional
        });
    }
    
    // ========== ESTILOS PARA ANIMACIONES ==========
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
    `;
    document.head.appendChild(style);
    
    // ========== AUTOFOCO ==========
    // Enfocar automáticamente el campo email
    setTimeout(() => {
        if (emailInput) {
            emailInput.focus();
            console.log('🎯 Campo email enfocado automáticamente');
        }
    }, 300);
    
    console.log('✅ Sistema de login inicializado correctamente');
});

console.log('📄 login.js cargado y listo');