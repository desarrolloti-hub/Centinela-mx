// /usuarios/administrador/pruebasNotificaciones/pruebasNotificaciones.js
import { UserManager } from '../../../clases/user.js';
import { fcmInitializer } from '../../../components/fcm-initializer.js';

const userManager = new UserManager();

// Estado de la aplicación
const AppState = {
    currentUser: null,
    userData: null,
    fcmToken: null,
    isProcessing: false
};

// Función para mostrar mensajes con SweetAlert
function mostrarMensaje(tipo, titulo, mensaje, timer = 3000) {
    Swal.fire({
        icon: tipo,
        title: titulo,
        text: mensaje,
        timer: timer,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
}

// Función para actualizar la UI con el estado actual
function actualizarUI() {
    const statusBadge = document.getElementById('deviceStatusBadge');
    const tokenSpan = document.getElementById('deviceToken');
    const enableBtn = document.getElementById('enableNotificationsBtn');
    const disableBtn = document.getElementById('disableNotificationsBtn');
    const entornoInfo = document.getElementById('entornoInfo');
    
    // Actualizar información del entorno
    if (window.location.protocol === 'https:') {
        entornoInfo.innerHTML = '🌐 Entorno de PRODUCCIÓN - Notificaciones disponibles';
        entornoInfo.style.color = '#28a745';
    } else {
        entornoInfo.innerHTML = '💻 Entorno de DESARROLLO - Las notificaciones solo funcionarán después del deploy';
        entornoInfo.style.color = '#ffc107';
    }
    
    // Actualizar estado de notificaciones
    if (fcmInitializer.isEnabled()) {
        statusBadge.textContent = 'Activadas';
        statusBadge.className = 'badge-enabled';
        const token = fcmInitializer.getCurrentToken();
        tokenSpan.textContent = token ? token.substring(0, 30) + '...' : 'Token obtenido';
        enableBtn.disabled = true;
        disableBtn.disabled = false;
    } else {
        statusBadge.textContent = 'Desactivadas';
        statusBadge.className = 'badge-disabled';
        tokenSpan.textContent = 'No disponible';
        enableBtn.disabled = false;
        disableBtn.disabled = true;
    }
}

// Función para guardar el estado de notificaciones en el objeto User (dispositivos)
async function guardarEstadoNotificaciones(habilitadas, token = null) {
    if (!AppState.currentUser) return false;
    
    try {
        console.log(`📋 Guardando estado de notificaciones: ${habilitadas ? 'HABILITADAS' : 'DESHABILITADAS'}`);
        
        if (habilitadas && token) {
            await userManager.guardarDispositivo({
                token: token,
                deviceId: fcmInitializer.deviceId,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                enabled: true
            });
            console.log('✅ Token guardado en el array dispositivos del usuario');
        } else {
            // Si se deshabilitan, eliminar el dispositivo
            await userManager.eliminarDispositivo(fcmInitializer.deviceId);
            console.log('✅ Dispositivo eliminado del array dispositivos');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error al guardar estado de notificaciones:', error);
        return false;
    }
}

// Función para manejar la finalización del proceso
function manejarFinalizacion(exito = true, permisoDenegado = false) {
    if (exito) {
        console.log("✅ Proceso completado exitosamente");
        mostrarMensaje('success', '✅ Completado', 'Configuración de notificaciones finalizada');
    } else if (permisoDenegado) {
        console.log("⚠️ Permiso denegado");
        mostrarMensaje('warning', '⚠️ Permiso denegado', 'Las notificaciones han sido desactivadas');
    } else {
        console.log("⚠️ Proceso finalizado con error");
        mostrarMensaje('error', '❌ Error', 'No se pudo completar la configuración');
    }
    actualizarUI();
}

// Función principal de suscripción
async function suscribirANotificaciones() {
    if (AppState.isProcessing) return;
    
    AppState.isProcessing = true;
    console.log("🚀 Iniciando proceso de suscripción a notificaciones...");
    
    try {
        // Verificar soporte
        console.log("📋 Verificando soporte del navegador...");
        
        // Solicitar permiso y token
        const token = await fcmInitializer.enableNotifications();
        
        if (!token) {
            throw new Error('No se pudo obtener el token FCM');
        }
        
        AppState.fcmToken = token;
        
        // Guardar en Firestore (en el array dispositivos del usuario)
        let saved = false;
        for (let i = 1; i <= 3; i++) {
            try {
                await guardarEstadoNotificaciones(true, token);
                saved = true;
                break;
            } catch (writeError) {
                console.error(`❌ Error intento ${i}:`, writeError);
                if (i < 3) {
                    console.log(`⏳ Reintentando guardar (${i}/3)...`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        
        if (!saved) {
            throw new Error('No se pudo guardar el token en el servidor');
        }
        
        console.log("🎉 ¡PROCESO COMPLETADO! Notificaciones configuradas correctamente");
        console.log("📱 Token FCM:", token);
        
        manejarFinalizacion(true);
        
    } catch (error) {
        console.error("❌ Error crítico en el proceso:", error);
        
        // En caso de error, guardar estado deshabilitado
        try {
            await guardarEstadoNotificaciones(false);
        } catch (saveError) {
            console.error("❌ No se pudo guardar el estado de error:", saveError);
        }
        
        manejarFinalizacion(false, error.message.includes('denegado'));
        
    } finally {
        AppState.isProcessing = false;
    }
}

// Función para preguntar al usuario si quiere activar notificaciones
async function preguntarPermisoNotificaciones() {
    const result = await Swal.fire({
        title: '🔔 ¿Activar notificaciones?',
        html: `
            <div style="text-align: left; color: var(--color-text-primary);">
                <p style="margin-bottom: 15px;">Las notificaciones te permitirán:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-bell" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Recibir alertas de nuevas incidencias
                    </li>
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-clock" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Actualizaciones en tiempo real
                    </li>
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-exclamation-triangle" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Notificaciones importantes del sistema
                    </li>
                </ul>
                <p style="margin-top: 15px; font-size: 14px; color: var(--color-text-secondary);">
                    <i class="fas fa-info-circle" style="color: var(--color-accent-primary);"></i>
                    Puedes cambiar esta configuración en cualquier momento.
                </p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar notificaciones',
        cancelButtonText: 'No, gracias',
        confirmButtonColor: 'var(--color-accent-primary)',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        allowOutsideClick: false,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)'
    });

    return result.isConfirmed;
}

// Verificar configuración actual al cargar la página
async function verificarConfiguracionActual() {
    if (!AppState.currentUser) return;

    try {
        console.log("🔍 Verificando configuración actual de notificaciones...");
        
        // Verificar si el usuario ya tiene dispositivos activos
        const tieneDispositivosActivos = AppState.currentUser.dispositivos?.some(
            d => d.deviceId === fcmInitializer.deviceId && d.enabled !== false
        );
        
        if (tieneDispositivosActivos) {
            console.log("✅ Este dispositivo ya tiene notificaciones activas");
            AppState.fcmToken = AppState.currentUser.dispositivos.find(
                d => d.deviceId === fcmInitializer.deviceId
            )?.token;
            fcmInitializer.notificationsEnabled = true;
            localStorage.setItem(`fcm_enabled_${fcmInitializer.deviceId}`, 'true');
        } else {
            console.log("ℹ️ Este dispositivo no tiene notificaciones configuradas");
        }
        
        actualizarUI();
        
    } catch (error) {
        console.error('Error al verificar configuración:', error);
    }
}

// Función para inicializar la página
async function init() {
    try {
        console.log('🚀 Inicializando página de pruebas...');
        
        // Esperar a que UserManager tenga el usuario actual
        const checkUser = setInterval(async () => {
            if (userManager.currentUser) {
                clearInterval(checkUser);
                
                console.log('👤 Usuario:', userManager.currentUser.nombreCompleto);
                AppState.currentUser = userManager.currentUser;
                
                // Inicializar FCM
                await fcmInitializer.init(userManager);
                
                // Verificar configuración actual
                await verificarConfiguracionActual();
                
                // Configurar botones
                document.getElementById('enableNotificationsBtn').addEventListener('click', async () => {
                    const quiereActivar = await preguntarPermisoNotificaciones();
                    if (quiereActivar) {
                        await suscribirANotificaciones();
                    }
                });

                document.getElementById('disableNotificationsBtn').addEventListener('click', async () => {
                    const result = await Swal.fire({
                        title: '¿Desactivar notificaciones?',
                        text: 'Dejarás de recibir notificaciones en este dispositivo.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, desactivar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#dc3545',
                        cancelButtonColor: '#6c757d'
                    });
                    
                    if (result.isConfirmed) {
                        await fcmInitializer.disableNotifications();
                        await guardarEstadoNotificaciones(false);
                        manejarFinalizacion(true);
                    }
                });

                // Configurar formulario de envío de notificaciones de prueba
                document.getElementById('notificationForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const userId = document.getElementById('userId').value.trim();
                    const userType = document.getElementById('userType').value;
                    const title = document.getElementById('title').value.trim();
                    const body = document.getElementById('body').value.trim();
                    const url = document.getElementById('url').value.trim();
                    
                    if (!userId || !title || !body) {
                        mostrarMensaje('warning', 'Campos incompletos', 'Usuario, título y mensaje son obligatorios');
                        return;
                    }
                    
                    Swal.fire({
                        title: 'Enviando notificación...',
                        text: 'Por favor espera',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });
                    
                    try {
                        const functionUrl = 'https://us-central1-centinela-mx.cloudfunctions.net/sendPushNotification';
                        
                        const response = await fetch(functionUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                userId: userId,
                                userType: userType,
                                organizacionCamelCase: userManager.currentUser?.organizacionCamelCase,
                                title: title,
                                body: body,
                                url: url,
                                senderToken: userManager.currentUser?.id
                            })
                        });
                        
                        const result = await response.json();
                        Swal.close();
                        
                        if (response.ok && result.success) {
                            Swal.fire({
                                icon: 'success',
                                title: '✅ Notificación enviada',
                                html: `
                                    <p>${result.message || 'Notificación enviada correctamente'}</p>
                                    ${result.failures ? `<p>Fallos: ${result.failures}</p>` : ''}
                                `,
                                timer: 3000,
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)'
                            });
                        } else {
                            throw new Error(result.error || 'Error al enviar la notificación');
                        }
                        
                    } catch (error) {
                        console.error('❌ Error:', error);
                        Swal.close();
                        Swal.fire({
                            icon: 'error',
                            title: '❌ Error',
                            text: error.message,
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-primary)'
                        });
                    }
                });
                
                actualizarUI();
                console.log('✅ Página de pruebas lista');
            }
        }, 500);

        // Timeout de seguridad
        setTimeout(() => {
            if (!userManager.currentUser) {
                console.error('⏰ Timeout: No hay usuario');
                mostrarMensaje('error', 'Error', 'No hay sesión activa');
            }
        }, 5000);

    } catch (error) {
        console.error('❌ Error fatal:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Crítico',
            text: error.message
        });
    }
}

// Iniciar
init();