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

// FUNCIÓN: Obtener valores CSS de las variables personalizadas
function getCSSVariable(variableName) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(variableName)
        .trim();
}

// FUNCIÓN: Configurar estilos base de SweetAlert según variables CSS
function configurarSweetAlertEstilos() {
    const colors = {
        primary: getCSSVariable('--color-text-primary') || '#ffffff',
        secondary: getCSSVariable('--color-text-secondary') || 'rgba(255, 255, 255, 0.8)',
        accentPrimary: getCSSVariable('--color-accent-primary') || '#c0c0c0',
        accentSecondary: getCSSVariable('--color-accent-secondary') || '#ffffff',
        bgPrimary: getCSSVariable('--color-bg-primary') || '#000000',
        bgSecondary: getCSSVariable('--color-bg-secondary') || '#00000000',
        bgTertiary: getCSSVariable('--color-bg-tertiary') || '#0000007a',
        bgLight: getCSSVariable('--color-bg-light') || '#ffffff',
        borderLight: getCSSVariable('--color-border-light') || 'rgba(255, 255, 255, 0.1)',
        textDark: getCSSVariable('--color-text-dark') || '#000000',
        hover: getCSSVariable('--color-hover') || 'rgba(245, 215, 66, 0)',
        active: getCSSVariable('--color-active') || '#c0c0c0'
    };
    
    return {
        colors: colors,
        fontFamily: getCSSVariable('--font-family-primary') || "'Orbitron', sans-serif",
        borderRadius: getCSSVariable('--border-radius-medium') || '8px',
        transition: getCSSVariable('--transition-default') || 'all 0.3s ease-in-out'
    };
}

// INICIALIZACIÓN PRINCIPAL - Se ejecuta cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded - Sistema de sesión con SweetAlerts personalizados');
    
    const estilos = configurarSweetAlertEstilos();
    console.log('Estilos CSS cargados:', estilos.colors);
    
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const loginMessage = document.getElementById('loginMessage');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const registerBtn = document.getElementById('registerBtn');
    
    if (!loginForm || !emailInput || !passwordInput) {
        console.error('Elementos del formulario no encontrados');
        mostrarSweetAlertErrorCritico('Error de Configuración', 
            'El formulario de login no está configurado correctamente.', estilos);
        return;
    }
    
    console.log('Elementos del formulario encontrados');
    
    let userManager;
    try {
        userManager = new UserManager();
        console.log('UserManager inicializado:', userManager);
    } catch (error) {
        console.error('Error al crear UserManager:', error);
        mostrarSweetAlertErrorCritico('Sistema No Disponible', 
            'Error al inicializar el sistema de autenticación.', estilos);
        return;
    }
    
    // FUNCIÓN: Mostrar SweetAlert para error crítico
    function mostrarSweetAlertErrorCritico(titulo, mensaje, estilos) {
        Swal.fire({
            title: `<span style="color: ${estilos.colors.accentSecondary}; font-size: 1.5em; font-family: ${estilos.fontFamily};">${titulo}</span>`,
            html: `
                <div style="text-align: left; padding: 15px 0; color: ${estilos.colors.secondary};">
                    <p>${mensaje}</p>
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 12px; border-radius: ${estilos.borderRadius}; margin-top: 15px; border-left: 4px solid ${estilos.colors.accentSecondary};">
                        <p style="margin: 0; font-size: 0.9em; color: ${estilos.colors.accentPrimary};">
                            <i class="fas fa-exclamation-triangle" style="color: ${estilos.colors.accentSecondary}; margin-right: 8px;"></i> 
                            <strong>Recomendación:</strong>
                        </p>
                        <ul style="margin: 5px 0 0 25px; font-size: 0.85em; color: ${estilos.colors.secondary};">
                            <li>Recarga la página</li>
                            <li>Verifica tu conexión a internet</li>
                            <li>Contacta al administrador si el problema persiste</li>
                        </ul>
                    </div>
                </div>
            `,
            confirmButtonColor: estilos.colors.accentSecondary,
            confirmButtonText: 'Recargar Página',
            background: estilos.colors.bgPrimary,
            backdrop: `rgba(0, 0, 0, 0.8)`,
            customClass: {
                popup: 'sweetalert-popup-custom',
                title: 'sweetalert-title-custom',
                content: 'sweetalert-content-custom'
            },
            allowOutsideClick: false
        }).then(() => {
            location.reload();
        });
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
    
    function saveUserToLocalStorage(user) {
        try {
            const organizacionCamelCase = toCamelCase(user.organizacion);
            
            const userData = {
                id: user.id,
                email: user.email,
                nombreCompleto: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion,
                organizacionCamelCase: organizacionCamelCase,
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
            
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', user.cargo);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userOrganizacion', user.organizacion);
            localStorage.setItem('userOrganizacionCamelCase', organizacionCamelCase);
            localStorage.setItem('userNombre', user.nombreCompleto);
            
            console.log('Datos del usuario guardados en localStorage:', {
                id: user.id,
                nombre: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion,
                organizacionCamelCase: organizacionCamelCase,
                timestamp: userData.fechaLogin
            });
            
            return true;
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
            return false;
        }
    }
    
    function saveUserToSessionStorage(user) {
        try {
            const organizacionCamelCase = toCamelCase(user.organizacion);
            
            const sessionData = {
                id: user.id,
                email: user.email,
                nombreCompleto: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion,
                organizacionCamelCase: organizacionCamelCase,
                sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                sessionStart: new Date().toISOString(),
                sessionStartFormatted: new Date().toLocaleTimeString('es-ES'),
                token: 'auth_token_' + Date.now(),
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`
            };
            
            sessionStorage.setItem('currentSession', JSON.stringify(sessionData));
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('sessionStart', new Date().toISOString());
            sessionStorage.setItem('sessionOrganizacion', user.organizacion);
            sessionStorage.setItem('sessionOrganizacionCamelCase', organizacionCamelCase);
            sessionStorage.setItem('sessionUser', user.nombreCompleto);
            sessionStorage.setItem('sessionRole', user.cargo);
            
            console.log('Sesión guardada en sessionStorage:', {
                sessionId: sessionData.sessionId,
                user: user.nombreCompleto,
                organizacion: user.organizacion,
                organizacionCamelCase: organizacionCamelCase,
                timestamp: sessionData.sessionStartFormatted
            });
            
            return true;
        } catch (error) {
            console.error('Error al guardar en sessionStorage:', error);
            return false;
        }
    }
    
    function checkExistingSession() {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const hasSession = sessionStorage.getItem('isAuthenticated') === 'true';
            
            if (isLoggedIn && hasSession) {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const sessionData = JSON.parse(sessionStorage.getItem('currentSession') || '{}');
                
                console.log('Sesión existente encontrada:', {
                    usuario: userData.nombreCompleto,
                    organizacion: userData.organizacion,
                    organizacionCamelCase: userData.organizacionCamelCase,
                    sessionId: sessionData.sessionId,
                    tiempoSesion: sessionData.sessionStart
                });
            }
            
            return false;
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            return false;
        }
    }
    
    function logOrganizationInfo(organizacion, organizacionCamelCase) {
        console.log('INFORMACIÓN DE ORGANIZACIÓN:');
        console.log('   Nombre original:', organizacion);
        console.log('   CamelCase:', organizacionCamelCase);
    }
    
    // FUNCIÓN: Mostrar SweetAlert2 de éxito en login
    function mostrarSweetAlertExito(user) {
        const organizacionCamelCase = toCamelCase(user.organizacion);
        
        Swal.fire({
            title: `<span style="color: ${estilos.colors.accentSecondary}; font-size: 1.8em; font-family: ${estilos.fontFamily};">¡Bienvenido!</span>`,
            html: `
                <div style="text-align: center; font-family: ${estilos.fontFamily};">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary}); border-radius: ${estilos.borderRadius}; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-check" style="font-size: 2.5em; color: ${estilos.colors.textDark};"></i>
                    </div>
                    <h3 style="color: ${estilos.colors.primary}; margin-bottom: 10px; font-weight: bold;">${user.nombreCompleto}</h3>
                    <p style="color: ${estilos.colors.secondary}; margin-bottom: 20px;">Sesión iniciada correctamente</p>
                    
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 15px; border-radius: ${estilos.borderRadius}; text-align: left; margin: 15px 0; border: 1px solid ${estilos.colors.borderLight};">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <i class="fas fa-building" style="color: ${estilos.colors.accentPrimary}; width: 20px;"></i>
                            <span style="margin-left: 10px; color: ${estilos.colors.primary};"><strong>Organización:</strong> ${user.organizacion}</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <i class="fas fa-briefcase" style="color: ${estilos.colors.accentSecondary}; width: 20px;"></i>
                            <span style="margin-left: 10px; color: ${estilos.colors.primary};"><strong>Cargo:</strong> ${user.cargo}</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <i class="fas fa-user-shield" style="color: ${estilos.colors.accentPrimary}; width: 20px;"></i>
                            <span style="margin-left: 10px; color: ${estilos.colors.primary};"><strong>Estado:</strong> ${user.verificado ? 'Verificado' : 'Pendiente'}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 10px; background: linear-gradient(90deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary}); border-radius: 5px; color: ${estilos.colors.textDark}; font-weight: bold;">
                        <i class="fas fa-sync-alt fa-spin"></i>
                        <span style="margin-left: 10px;">Redirigiendo al sistema...</span>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
            background: estilos.colors.bgPrimary,
            backdrop: `rgba(0, 0, 0, 0.8)`,
            customClass: {
                popup: 'sweetalert-popup-custom',
                title: 'sweetalert-title-custom',
                content: 'sweetalert-content-custom'
            },
            didOpen: () => {
                const progressBar = Swal.getHtmlContainer().querySelector('.swal2-progress-bar');
                if (progressBar) {
                    progressBar.style.background = `linear-gradient(90deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary})`;
                }
            }
        });
    }
    
    // FUNCIÓN: Mostrar SweetAlert2 para correo inválido
    function mostrarSweetAlertCorreoInvalido() {
        Swal.fire({
            title: `<span style="color: ${estilos.colors.accentPrimary}; font-size: 1.5em; font-family: ${estilos.fontFamily};">Correo Inválido</span>`,
            html: `
                <div style="text-align: left; padding: 15px 0; color: ${estilos.colors.secondary};">
                    <p>El formato del correo electrónico no es válido.</p>
                    
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 12px; border-radius: ${estilos.borderRadius}; margin: 15px 0; border-left: 4px solid ${estilos.colors.accentPrimary};">
                        <p style="margin: 0 0 10px 0; color: ${estilos.colors.accentSecondary}; font-weight: bold;">
                            <i class="fas fa-lightbulb" style="color: ${estilos.colors.accentPrimary}; margin-right: 8px;"></i> Formato correcto:
                        </p>
                        <div style="background: ${estilos.colors.bgPrimary}; padding: 10px; border-radius: 4px; border: 1px solid ${estilos.colors.accentPrimary};">
                            <code style="color: ${estilos.colors.accentSecondary}; font-size: 0.9em;">usuario@dominio.com</code>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                        <div style="background: ${estilos.colors.bgTertiary}; padding: 8px; border-radius: 4px; border: 1px solid ${estilos.colors.accentSecondary};">
                            <p style="margin: 0; color: ${estilos.colors.accentSecondary}; font-size: 0.85em;">
                                <i class="fas fa-check-circle" style="color: ${estilos.colors.accentSecondary}; margin-right: 5px;"></i> Válido
                            </p>
                            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: ${estilos.colors.secondary};">
                                usuario@empresa.com
                            </p>
                        </div>
                        <div style="background: ${estilos.colors.bgTertiary}; padding: 8px; border-radius: 4px; border: 1px solid ${estilos.colors.accentPrimary};">
                            <p style="margin: 0; color: ${estilos.colors.accentPrimary}; font-size: 0.85em;">
                                <i class="fas fa-times-circle" style="color: ${estilos.colors.accentPrimary}; margin-right: 5px;"></i> Inválido
                            </p>
                            <p style="margin: 5px 0 0 0; font-size: 0.8em; color: ${estilos.colors.secondary};">
                                usuario@dominio
                            </p>
                        </div>
                    </div>
                </div>
            `,
            confirmButtonColor: estilos.colors.accentPrimary,
            confirmButtonText: 'Corregir',
            background: estilos.colors.bgPrimary,
            backdrop: `rgba(0, 0, 0, 0.8)`,
            customClass: {
                popup: 'sweetalert-popup-custom',
                title: 'sweetalert-title-custom',
                content: 'sweetalert-content-custom'
            },
            focusConfirm: false
        }).then(() => {
            emailInput.focus();
            emailInput.select();
        });
    }
    
    // FUNCIÓN: Mostrar SweetAlert2 para contraseña incorrecta
    function mostrarSweetAlertContraseñaIncorrecta() {
        Swal.fire({
            title: `<span style="color: ${estilos.colors.accentSecondary}; font-size: 1.5em; font-family: ${estilos.fontFamily};">Contraseña Incorrecta</span>`,
            html: `
                <div style="text-align: left; padding: 15px 0; color: ${estilos.colors.secondary};">
                    <p>La contraseña ingresada no es correcta.</p>
                    
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 12px; border-radius: ${estilos.borderRadius}; margin: 15px 0; border-left: 4px solid ${estilos.colors.accentSecondary};">
                        <p style="margin: 0 0 10px 0; color: ${estilos.colors.accentSecondary}; font-weight: bold;">
                            <i class="fas fa-key" style="color: ${estilos.colors.accentSecondary}; margin-right: 8px;"></i> ¿Olvidaste tu contraseña?
                        </p>
                        <button onclick="mostrarRecuperacionContraseña()" 
                                style="width: 100%; padding: 10px; background: linear-gradient(135deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary}); color: ${estilos.colors.textDark}; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 10px; font-weight: bold; transition: ${estilos.transition};"
                                onmouseover="this.style.opacity='0.9';"
                                onmouseout="this.style.opacity='1';">
                            <i class="fas fa-unlock-alt" style="margin-right: 8px;"></i> Recuperar Contraseña
                        </button>
                    </div>
                    
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 10px; border-radius: 5px; border: 1px solid ${estilos.colors.accentPrimary};">
                        <p style="margin: 0 0 8px 0; color: ${estilos.colors.accentPrimary}; font-weight: bold;">
                            <i class="fas fa-lightbulb" style="color: ${estilos.colors.accentPrimary}; margin-right: 8px;"></i> Recomendaciones:
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: ${estilos.colors.secondary};">
                            <li>Revisa las mayúsculas/minúsculas</li>
                            <li>Verifica que no haya espacios al inicio/final</li>
                            <li>Usa el botón <i class="fas fa-eye" style="color: ${estilos.colors.accentSecondary}; margin: 0 4px;"></i> para visualizar</li>
                            <li>Intenta con una contraseña anterior</li>
                        </ul>
                    </div>
                </div>
            `,
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: 'Reintentar',
            cancelButtonText: 'Recuperar',
            confirmButtonColor: estilos.colors.accentPrimary,
            cancelButtonColor: estilos.colors.accentSecondary,
            background: estilos.colors.bgPrimary,
            backdrop: `rgba(0, 0, 0, 0.8)`,
            customClass: {
                popup: 'sweetalert-popup-custom',
                title: 'sweetalert-title-custom',
                content: 'sweetalert-content-custom'
            },
            preConfirm: () => {
                passwordInput.focus();
                passwordInput.select();
            }
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
                mostrarRecuperacionContraseña();
            }
        });
    }
    
    // FUNCIÓN: Mostrar SweetAlert2 para usuario no encontrado
    function mostrarSweetAlertUsuarioNoEncontrado(email) {
        Swal.fire({
            title: `<span style="color: ${estilos.colors.accentSecondary}; font-size: 1.5em; font-family: ${estilos.fontFamily};">Usuario No Encontrado</span>`,
            html: `
                <div style="text-align: left; padding: 15px 0; color: ${estilos.colors.secondary};">
                    <p>No existe una cuenta registrada con:</p>
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: center; border: 1px solid ${estilos.colors.borderLight};">
                        <code style="color: ${estilos.colors.accentSecondary}; font-weight: bold;">${email}</code>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
                        <button onclick="irARegistro()" 
                                style="padding: 12px; background: linear-gradient(135deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary}); color: ${estilos.colors.textDark}; border: none; border-radius: ${estilos.borderRadius}; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; transition: ${estilos.transition};"
                                onmouseover="this.style.opacity='0.9';"
                                onmouseout="this.style.opacity='1';">
                            <i class="fas fa-user-plus" style="font-size: 1.5em; margin-bottom: 5px;"></i>
                            <span>Registrarse</span>
                        </button>
                        <button onclick="mostrarRecuperacionContraseña()" 
                                style="padding: 12px; background: linear-gradient(135deg, ${estilos.colors.accentSecondary}, ${estilos.colors.accentPrimary}); color: ${estilos.colors.textDark}; border: none; border-radius: ${estilos.borderRadius}; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; transition: ${estilos.transition};"
                                onmouseover="this.style.opacity='0.9';"
                                onmouseout="this.style.opacity='1';">
                            <i class="fas fa-key" style="font-size: 1.5em; margin-bottom: 5px;"></i>
                            <span>Recuperar</span>
                        </button>
                    </div>
                    
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 10px; border-radius: 5px; border: 1px solid ${estilos.colors.borderLight}; margin-top: 15px;">
                        <p style="margin: 0; color: ${estilos.colors.accentPrimary}; font-size: 0.9em;">
                            <i class="fas fa-info-circle" style="color: ${estilos.colors.accentPrimary}; margin-right: 8px;"></i> 
                            <strong>Posibles causas:</strong>
                        </p>
                        <ul style="margin: 5px 0 0 15px; color: ${estilos.colors.secondary}; font-size: 0.85em;">
                            <li>El correo fue escrito incorrectamente</li>
                            <li>La cuenta fue eliminada o desactivada</li>
                            <li>Debes registrarte primero en el sistema</li>
                        </ul>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            background: estilos.colors.bgPrimary,
            backdrop: `rgba(0, 0, 0, 0.8)`,
            customClass: {
                popup: 'sweetalert-popup-custom',
                title: 'sweetalert-title-custom',
                content: 'sweetalert-content-custom'
            },
            showCloseButton: true
        });
    }
    
    // FUNCIÓN: Mostrar SweetAlert2 para recuperación de contraseña
    function mostrarRecuperacionContraseña() {
        Swal.fire({
            title: `<span style="color: ${estilos.colors.accentSecondary}; font-size: 1.5em; font-family: ${estilos.fontFamily};">Recuperar Contraseña</span>`,
            html: `
                <div style="text-align: left; padding: 15px 0; color: ${estilos.colors.secondary}; font-family: ${estilos.fontFamily};">
                    <p>Ingresa tu correo electrónico para recibir un enlace de recuperación:</p>
                    
                    <div style="margin: 20px 0;">
                        <input type="email" id="recovery-email" 
                               placeholder="tu@correo.com" 
                               style="width: 100%; padding: 12px; border: 2px solid ${estilos.colors.accentSecondary}; border-radius: ${estilos.borderRadius}; font-size: 1em; background: ${estilos.colors.bgTertiary}; color: ${estilos.colors.primary};">
                    </div>
                    
                    <div style="background: ${estilos.colors.bgTertiary}; padding: 12px; border-radius: ${estilos.borderRadius}; margin: 15px 0; border-left: 4px solid ${estilos.colors.accentSecondary};">
                        <p style="margin: 0; color: ${estilos.colors.accentSecondary}; font-size: 0.9em;">
                            <i class="fas fa-envelope" style="color: ${estilos.colors.accentSecondary}; margin-right: 8px;"></i> 
                            <strong>Proceso de recuperación:</strong>
                        </p>
                        <ol style="margin: 5px 0 0 20px; color: ${estilos.colors.secondary}; font-size: 0.85em;">
                            <li>Recibirás un correo con un enlace seguro</li>
                            <li>Haz clic en el enlace para restablecer</li>
                            <li>Crea una nueva contraseña segura</li>
                            <li>Inicia sesión con tus nuevas credenciales</li>
                        </ol>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="enviarRecuperacion()" 
                                style="flex: 2; padding: 12px; background: linear-gradient(135deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary}); color: ${estilos.colors.textDark}; border: none; border-radius: ${estilos.borderRadius}; cursor: pointer; font-weight: bold; transition: ${estilos.transition};"
                                onmouseover="this.style.opacity='0.9';"
                                onmouseout="this.style.opacity='1';">
                            <i class="fas fa-paper-plane" style="margin-right: 8px;"></i> Enviar Enlace
                        </button>
                        <button onclick="Swal.close()" 
                                style="flex: 1; padding: 12px; background: ${estilos.colors.bgTertiary}; color: ${estilos.colors.primary}; border: 1px solid ${estilos.colors.borderLight}; border-radius: ${estilos.borderRadius}; cursor: pointer; transition: ${estilos.transition};"
                                onmouseover="this.style.background='${estilos.colors.accentPrimary}'; this.style.color='${estilos.colors.textDark}';"
                                onmouseout="this.style.background='${estilos.colors.bgTertiary}'; this.style.color='${estilos.colors.primary}';">
                            Cancelar
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            background: estilos.colors.bgPrimary,
            backdrop: `rgba(0, 0, 0, 0.8)`,
            customClass: {
                popup: 'sweetalert-popup-custom',
                title: 'sweetalert-title-custom',
                content: 'sweetalert-content-custom'
            },
            didOpen: () => {
                const recoveryEmail = document.getElementById('recovery-email');
                if (recoveryEmail) {
                    recoveryEmail.value = emailInput.value || '';
                    recoveryEmail.focus();
                    recoveryEmail.select();
                }
            }
        });
    }
    
    window.irARegistro = function() {
        window.location.href = '/users/visitors/registrarse/registro.html';
    };
    
    window.mostrarRecuperacionContraseña = function() {
        mostrarRecuperacionContraseña();
    };
    
    window.enviarRecuperacion = function() {
        const recoveryEmail = document.getElementById('recovery-email');
        if (recoveryEmail && recoveryEmail.value) {
            if (validateEmail(recoveryEmail.value)) {
                Swal.fire({
                    title: 'Enlace enviado',
                    text: `Se ha enviado un enlace de recuperación a ${recoveryEmail.value}`,
                    confirmButtonColor: estilos.colors.accentSecondary,
                    background: estilos.colors.bgPrimary,
                    color: estilos.colors.primary,
                    customClass: {
                        popup: 'sweetalert-popup-custom',
                        title: 'sweetalert-title-custom',
                        content: 'sweetalert-content-custom'
                    }
                });
            } else {
                Swal.fire({
                    title: 'Correo inválido',
                    text: 'Por favor ingresa un correo válido',
                    confirmButtonColor: estilos.colors.accentPrimary,
                    background: estilos.colors.bgPrimary,
                    color: estilos.colors.primary,
                    customClass: {
                        popup: 'sweetalert-popup-custom',
                        title: 'sweetalert-title-custom',
                        content: 'sweetalert-content-custom'
                    }
                });
            }
        }
    };
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function() {
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
                this.setAttribute('aria-label', 'Ocultar contraseña');
                this.style.color = estilos.colors.accentSecondary;
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
                this.setAttribute('aria-label', 'Mostrar contraseña');
                this.style.color = estilos.colors.accentPrimary;
            }
            
            passwordInput.focus();
        });
        
        console.log('Botón mostrar/ocultar contraseña configurado');
    }
    
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log('Formulario de login enviado');
        
        clearMessage();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        console.log('Datos ingresados:', { email: email, passwordLength: password.length });
        
        if (!email || !password) {
            Swal.fire({
                title: 'Campos incompletos',
                text: 'Por favor completa todos los campos',
                confirmButtonColor: estilos.colors.accentPrimary,
                background: estilos.colors.bgPrimary,
                color: estilos.colors.primary,
                customClass: {
                    popup: 'sweetalert-popup-custom',
                    title: 'sweetalert-title-custom',
                    content: 'sweetalert-content-custom'
                }
            });
            emailInput.focus();
            return;
        }
        
        if (!validateEmail(email)) {
            mostrarSweetAlertCorreoInvalido();
            return;
        }
        
        if (password.length < 6) {
            Swal.fire({
                title: 'Contraseña muy corta',
                html: `
                    <div style="text-align: left; color: ${estilos.colors.secondary};">
                        <p>La contraseña debe tener al menos 6 caracteres.</p>
                        <div style="background: ${estilos.colors.bgTertiary}; padding: 10px; border-radius: 5px; margin-top: 10px; border-left: 4px solid ${estilos.colors.accentPrimary};">
                            <p style="margin: 0; color: ${estilos.colors.accentPrimary}; font-size: 0.9em;">
                                <i class="fas fa-shield-alt" style="color: ${estilos.colors.accentPrimary}; margin-right: 8px;"></i> 
                                <strong>Recomendaciones de seguridad:</strong>
                            </p>
                            <ul style="margin: 5px 0 0 20px; font-size: 0.85em; color: ${estilos.colors.secondary};">
                                <li>Usa al menos 8 caracteres</li>
                                <li>Combina letras, números y símbolos</li>
                                <li>Evita información personal</li>
                            </ul>
                        </div>
                    </div>
                `,
                confirmButtonColor: estilos.colors.accentPrimary,
                background: estilos.colors.bgPrimary,
                customClass: {
                    popup: 'sweetalert-popup-custom',
                    title: 'sweetalert-title-custom',
                    content: 'sweetalert-content-custom'
                }
            });
            passwordInput.focus();
            passwordInput.select();
            return;
        }
        
        toggleButtonState(false, '<i class="fas fa-spinner fa-spin"></i> VERIFICANDO...');
        
        try {
            console.log('Intentando iniciar sesión con:', email);
            
            const user = await userManager.iniciarSesion(email, password);
            
            console.log('Login exitoso:', {
                id: user.id,
                nombre: user.nombreCompleto,
                cargo: user.cargo,
                organizacion: user.organizacion,
                status: user.status,
                verificado: user.verificado
            });
            
            const organizacionCamelCase = toCamelCase(user.organizacion);
            logOrganizationInfo(user.organizacion, organizacionCamelCase);
            
            const savedToLocal = saveUserToLocalStorage(user);
            const savedToSession = saveUserToSessionStorage(user);
            
            if (savedToLocal && savedToSession) {
                console.log('Datos de usuario guardados correctamente');
            } else {
                console.log('Algunos datos no se guardaron completamente');
            }
            
            toggleButtonState(false, '<i class="fas fa-check"></i> SESIÓN INICIADA');
            
            mostrarSweetAlertExito(user);
            
            setTimeout(() => {
                console.log('Redirigiendo usuario...');
                
                if (user.cargo === 'administrador') {
                    console.log('Redirigiendo a dashboard de administrador');
                    window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
                } else if (user.cargo === 'colaborador') {
                    console.log('Redirigiendo a dashboard de colaborador');
                    window.location.href = '/users/colaborador/dashboard.html';
                } else {
                    console.log('Tipo de usuario desconocido, redirigiendo a inicio');
                    window.location.href = '/index.html';
                }
            }, 2500);
            
        } catch (error) {
            console.error('Error en login:', error);
            
            toggleButtonState(true);
            
            if (error.message.includes('auth/invalid-credential') || 
                error.message.includes('auth/wrong-password')) {
                mostrarSweetAlertContraseñaIncorrecta();
                
            } else if (error.message.includes('auth/user-not-found') ||
                      error.message.includes('no encontrado')) {
                mostrarSweetAlertUsuarioNoEncontrado(email);
                
            } else if (error.message.includes('auth/too-many-requests')) {
                Swal.fire({
                    title: 'Demasiados intentos',
                    html: `
                        <div style="text-align: left; color: ${estilos.colors.secondary};">
                            <p>Has excedido el número máximo de intentos permitidos.</p>
                            <div style="background: ${estilos.colors.bgTertiary}; padding: 12px; border-radius: ${estilos.borderRadius}; margin-top: 15px; border-left: 4px solid ${estilos.colors.accentPrimary};">
                                <p style="margin: 0; color: ${estilos.colors.accentPrimary}; font-size: 0.9em;">
                                    <i class="fas fa-clock" style="color: ${estilos.colors.accentPrimary}; margin-right: 8px;"></i> 
                                    <strong>Debes esperar 15 minutos antes de intentar nuevamente.</strong>
                                </p>
                            </div>
                            <div style="margin-top: 15px;">
                                <button onclick="mostrarRecuperacionContraseña()" 
                                        style="width: 100%; padding: 10px; background: linear-gradient(135deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary}); color: ${estilos.colors.textDark}; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: ${estilos.transition};"
                                        onmouseover="this.style.opacity='0.9';"
                                        onmouseout="this.style.opacity='1';">
                                    <i class="fas fa-unlock-alt" style="margin-right: 8px;"></i> Recuperar Contraseña Ahora
                                </button>
                            </div>
                        </div>
                    `,
                    confirmButtonColor: estilos.colors.accentPrimary,
                    background: estilos.colors.bgPrimary,
                    customClass: {
                        popup: 'sweetalert-popup-custom',
                        title: 'sweetalert-title-custom',
                        content: 'sweetalert-content-custom'
                    },
                    showCancelButton: true,
                    cancelButtonText: 'Entendido'
                });
                
            } else if (error.message.includes('auth/network-request-failed')) {
                Swal.fire({
                    title: 'Error de conexión',
                    text: 'Verifica tu conexión a internet e intenta nuevamente',
                    confirmButtonColor: estilos.colors.accentPrimary,
                    background: estilos.colors.bgPrimary,
                    color: estilos.colors.primary,
                    customClass: {
                        popup: 'sweetalert-popup-custom',
                        title: 'sweetalert-title-custom',
                        content: 'sweetalert-content-custom'
                    }
                });
                emailInput.focus();
                
            } else if (error.message.includes('desactivada') || error.message.includes('inhabilitada')) {
                Swal.fire({
                    title: 'Cuenta desactivada',
                    text: 'Tu cuenta está desactivada. Contacta al administrador del sistema.',
                    confirmButtonColor: estilos.colors.accentPrimary,
                    background: estilos.colors.bgPrimary,
                    color: estilos.colors.primary,
                    customClass: {
                        popup: 'sweetalert-popup-custom',
                        title: 'sweetalert-title-custom',
                        content: 'sweetalert-content-custom'
                    }
                });
                
            } else if (error.message.includes('no está verificado')) {
                Swal.fire({
                    title: 'Email no verificado',
                    html: `
                        <div style="text-align: left; color: ${estilos.colors.secondary};">
                            <p>Debes verificar tu correo electrónico antes de iniciar sesión.</p>
                            <div style="background: ${estilos.colors.bgTertiary}; padding: 12px; border-radius: ${estilos.borderRadius}; margin-top: 15px; border-left: 4px solid ${estilos.colors.accentSecondary};">
                                <p style="margin: 0; color: ${estilos.colors.accentSecondary}; font-size: 0.9em;">
                                    <i class="fas fa-envelope-open-text" style="color: ${estilos.colors.accentSecondary}; margin-right: 8px;"></i> 
                                    <strong>Revisa tu bandeja de entrada (y spam) para el enlace de verificación.</strong>
                                </p>
                            </div>
                            <div style="margin-top: 15px;">
                                <button onclick="reenviarVerificacion()" 
                                        style="width: 100%; padding: 10px; background: linear-gradient(135deg, ${estilos.colors.accentPrimary}, ${estilos.colors.accentSecondary}); color: ${estilos.colors.textDark}; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: ${estilos.transition};"
                                        onmouseover="this.style.opacity='0.9';"
                                        onmouseout="this.style.opacity='1';">
                                    <i class="fas fa-redo" style="margin-right: 8px;"></i> Reenviar Email de Verificación
                                </button>
                            </div>
                        </div>
                    `,
                    confirmButtonColor: estilos.colors.accentSecondary,
                    background: estilos.colors.bgPrimary,
                    customClass: {
                        popup: 'sweetalert-popup-custom',
                        title: 'sweetalert-title-custom',
                        content: 'sweetalert-content-custom'
                    }
                });
                
            } else {
                Swal.fire({
                    title: 'Error en el login',
                    text: error.message || 'Ha ocurrido un error inesperado. Intenta nuevamente.',
                    confirmButtonColor: estilos.colors.accentSecondary,
                    background: estilos.colors.bgPrimary,
                    color: estilos.colors.primary,
                    customClass: {
                        popup: 'sweetalert-popup-custom',
                        title: 'sweetalert-title-custom',
                        content: 'sweetalert-content-custom'
                    }
                });
                emailInput.focus();
            }
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement === passwordInput) {
            console.log('Enter presionado en campo contraseña');
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Clic en recuperar contraseña');
            mostrarRecuperacionContraseña();
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            console.log('Clic en botón registrarse');
        });
    }
    
    checkExistingSession();
    
    setTimeout(() => {
        if (emailInput) {
            emailInput.focus();
            console.log('Campo email enfocado automáticamente');
        }
    }, 300);
    
    console.log('Sistema de login con SweetAlerts personalizados inicializado correctamente');
});

const sweetAlertStyles = document.createElement('style');
sweetAlertStyles.textContent = `
    .sweetalert-popup-custom {
        background: var(--color-bg-primary) !important;
        border: 1px solid var(--color-border-light) !important;
        border-radius: var(--border-radius-large) !important;
        backdrop-filter: blur(10px) !important;
    }
    
    .sweetalert-title-custom {
        color: var(--color-text-primary) !important;
        font-family: var(--font-family-primary) !important;
        font-weight: 600 !important;
    }
    
    .sweetalert-content-custom {
        color: var(--color-text-secondary) !important;
        font-family: var(--font-family-secondary) !important;
    }
    
    .swal2-confirm {
        background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary)) !important;
        color: var(--color-text-dark) !important;
        border: none !important;
        border-radius: var(--border-radius-medium) !important;
        font-weight: bold !important;
        transition: var(--transition-default) !important;
    }
    
    .swal2-confirm:hover {
        opacity: 0.9 !important;
    }
    
    .swal2-cancel {
        background: var(--color-bg-tertiary) !important;
        color: var(--color-text-primary) !important;
        border: 1px solid var(--color-border-light) !important;
        border-radius: var(--border-radius-medium) !important;
        transition: var(--transition-default) !important;
    }
    
    .swal2-cancel:hover {
        background: var(--color-accent-primary) !important;
        color: var(--color-text-dark) !important;
    }
    
    .swal2-progress-bar {
        background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary)) !important;
    }
    
    .swal2-icon {
        border-color: var(--color-accent-secondary) !important;
    }
    
    .swal2-icon.swal2-success {
        border-color: var(--color-accent-secondary) !important;
    }
    
    .swal2-icon.swal2-success .swal2-success-ring {
        border-color: var(--color-accent-secondary) !important;
    }
    
    .swal2-icon.swal2-error {
        border-color: var(--color-accent-secondary) !important;
    }
    
    .swal2-icon.swal2-warning {
        border-color: var(--color-accent-primary) !important;
    }
    
    .swal2-icon.swal2-info {
        border-color: var(--color-accent-secondary) !important;
    }
    
    .swal2-icon .swal2-icon-content {
        color: var(--color-accent-secondary) !important;
    }
`;
document.head.appendChild(sweetAlertStyles);

console.log('login.js cargado - Con SweetAlerts usando variables CSS personalizadas');
