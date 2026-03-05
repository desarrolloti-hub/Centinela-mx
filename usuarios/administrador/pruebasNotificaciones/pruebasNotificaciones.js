// /usuarios/administrador/pruebasNotificaciones/pruebasNotificaciones.js
import { fcmInitializer } from '/components/fcm-initializer.js';
import { UserManager } from '/clases/user.js';

const userManager = new UserManager();

function isProduction() {
    return window.location.protocol === 'https:' || 
           (window.location.hostname !== 'localhost' && 
            window.location.hostname !== '127.0.0.1');
}

function updateUIStatus() {
    const statusBadge = document.getElementById('deviceStatusBadge');
    const tokenSpan = document.getElementById('deviceToken');
    const enableBtn = document.getElementById('enableNotificationsBtn');
    const disableBtn = document.getElementById('disableNotificationsBtn');
    
    if (!isProduction()) {
        statusBadge.textContent = 'No disponible en desarrollo';
        statusBadge.className = 'badge-disabled';
        tokenSpan.textContent = 'Solo funciona en producción (HTTPS)';
        if (enableBtn) enableBtn.disabled = true;
        if (disableBtn) disableBtn.disabled = true;
        return;
    }
    
    if (fcmInitializer.isEnabled()) {
        statusBadge.textContent = 'Activadas';
        statusBadge.className = 'badge-enabled';
        const token = fcmInitializer.getCurrentToken();
        tokenSpan.textContent = token ? token.substring(0, 30) + '...' : 'Token obtenido';
    } else {
        statusBadge.textContent = 'Desactivadas';
        statusBadge.className = 'badge-disabled';
        tokenSpan.textContent = 'No disponible';
    }
}

function mostrarMensaje(tipo, titulo, mensaje) {
    Swal.fire({
        icon: tipo,
        title: titulo,
        text: mensaje,
        timer: tipo === 'success' ? 2000 : 3000,
        showConfirmButton: false
    });
}

async function init() {
    try {
        console.log('🚀 Inicializando página de pruebas...');
        console.log('🌐 Entorno:', isProduction() ? 'PRODUCCIÓN' : 'DESARROLLO');
        
        // Esperar a que UserManager tenga el usuario actual
        const checkUser = setInterval(async () => {
            if (userManager.currentUser) {
                clearInterval(checkUser);
                
                console.log('👤 Usuario:', userManager.currentUser.nombreCompleto);
                console.log('📧 Email:', userManager.currentUser.correoElectronico);
                console.log('🏢 Organización:', userManager.currentUser.organizacionCamelCase);
                
                try {
                    // Inicializar FCM
                    await fcmInitializer.init(userManager);
                    
                    // Configurar botones
                    const enableBtn = document.getElementById('enableNotificationsBtn');
                    const disableBtn = document.getElementById('disableNotificationsBtn');
                    
                    if (enableBtn) {
                        enableBtn.addEventListener('click', async () => {
                            try {
                                const success = await fcmInitializer.enableNotifications();
                                if (success) {
                                    mostrarMensaje('success', '✅ Activado', 'Notificaciones activadas');
                                    setTimeout(() => window.location.reload(), 2000);
                                } else {
                                    mostrarMensaje('error', '❌ Error', 'No se pudieron activar');
                                }
                                updateUIStatus();
                            } catch (error) {
                                console.error('Error:', error);
                                mostrarMensaje('error', '❌ Error', error.message);
                            }
                        });
                    }

                    if (disableBtn) {
                        disableBtn.addEventListener('click', async () => {
                            try {
                                await fcmInitializer.disableNotifications();
                                mostrarMensaje('info', '🔕 Desactivado', 'Notificaciones desactivadas');
                                updateUIStatus();
                            } catch (error) {
                                console.error('Error:', error);
                                mostrarMensaje('error', '❌ Error', error.message);
                            }
                        });
                    }

                    updateUIStatus();
                    console.log('✅ Página de pruebas lista');
                    
                } catch (fcmError) {
                    console.error('❌ Error FCM:', fcmError);
                    mostrarMensaje('error', 'Error FCM', fcmError.message);
                }
            }
        }, 500);

        // Configurar el formulario de envío
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
                // URL de la Cloud Function (ya desplegada)
                const functionUrl = 'https://us-central1-centinela-mx.cloudfunctions.net/sendPushNotification';
                
                console.log('📤 Enviando solicitud a:', functionUrl);
                console.log('📦 Datos:', {
                    userId,
                    userType,
                    organizacionCamelCase: userManager.currentUser?.organizacionCamelCase,
                    title,
                    body,
                    url
                });
                
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
                console.log('📥 Respuesta:', result);
                
                Swal.close();
                
                if (response.ok && result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '✅ Notificación enviada',
                        html: `
                            <p>${result.message || 'Notificación enviada correctamente'}</p>
                            ${result.failures ? `<p>Fallos: ${result.failures}</p>` : ''}
                        `,
                        timer: 3000
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
                    text: error.message
                });
            }
        });

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

init();