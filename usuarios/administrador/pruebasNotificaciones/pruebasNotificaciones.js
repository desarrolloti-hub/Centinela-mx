// /usuarios/administrador/pruebasNotificaciones/pruebasNotificaciones.js
import { UserManager } from '/clases/user.js';
import { fcmInitializer } from '/components/fcm-initializer.js';
import { notificationSound } from '/clases/notificationSound.js'; // Asegurar esta importación

const userManager = new UserManager();

// Estado de la aplicación
const AppState = {
    currentUser: null,
    userData: null,
    fcmToken: null,
    isProcessing: false,
    soundEnabled: true,
    selectedSound: 'ding-moderno',
    soundVolume: 0.7,
    audioInitialized: false // Nuevo: para saber si el audio está listo
};

// Función para inicializar audio con interacción del usuario
async function initAudioOnUserInteraction() {
    if (AppState.audioInitialized) return true;
    
    try {
        // Inicializar el sistema de sonido
        await notificationSound.initialize();
        
        // Intentar activar el AudioContext
        const activated = await notificationSound.requestAudioPermission();
        
        if (activated) {
            AppState.audioInitialized = true;
            AppState.soundEnabled = true;
            console.log('🔊 Sistema de audio inicializado correctamente');
            
            // Probar con un sonido suave para confirmar
            await notificationSound.play('ding-moderno', 0.3);
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error inicializando audio:', error);
        return false;
    }
}

// NUEVA FUNCIÓN: Reproducir sonido de notificación
async function reproducirSonidoNotificacion(tipo = 'normal') {
    if (!AppState.soundEnabled) {
        console.log('🔇 Sonidos desactivados');
        return;
    }
    
    // Si el audio no está inicializado, intentar inicializar
    if (!AppState.audioInitialized) {
        await initAudioOnUserInteraction();
        if (!AppState.audioInitialized) {
            console.log('🔇 No se pudo inicializar audio');
            return;
        }
    }
    
    // Mapear tipo de notificación a sonido
    const soundMap = {
        'critico': 'alarma-robo',
        'urgente': 'alerta-urgente',
        'alerta': 'alerta-critica',
        'pendiente': 'notificacion-pendiente',
        'mensaje': 'mensaje-recibido',
        'normal': 'ding-moderno',
        'campana': 'campana-suave',
        'oficina': 'timbre-oficina',
        'movil': 'notificacion-movil',
        'sintetizador': 'sintetizador-alerta'
    };
    
    const soundName = soundMap[tipo] || AppState.selectedSound;
    
    try {
        await notificationSound.play(soundName, AppState.soundVolume);
        console.log(`🔊 Sonido reproducido: ${soundName}`);
    } catch (error) {
        console.error('Error reproduciendo sonido:', error);
    }
}

// NUEVA FUNCIÓN: Solicitar permiso de audio
async function solicitarPermisoAudio() {
    try {
        const resultado = await Swal.fire({
            title: '🔊 Activar sonidos de notificaciones',
            html: `
                <div style="text-align: left;">
                    <p>¿Quieres activar los sonidos para las notificaciones?</p>
                    <p style="font-size: 13px; color: #888;">
                        Esto permitirá que las notificaciones reproduzcan sonidos 
                        cuando lleguen nuevas alertas.
                    </p>
                    <div style="margin-top: 15px; padding: 10px; background: rgba(0,207,255,0.1); border-radius: 8px;">
                        <i class="fas fa-info-circle"></i>
                        <small>Necesitarás hacer clic en algún lugar de la página para activar los sonidos.</small>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, activar sonidos',
            cancelButtonText: 'No, gracias',
            confirmButtonColor: 'var(--color-accent-primary, #00cfff)'
        });
        
        if (resultado.isConfirmed) {
            // Mostrar mensaje de que debe hacer clic en la página
            await Swal.fire({
                title: '🎵 Haz clic en la página',
                html: `
                    <p>Para activar los sonidos, necesitas hacer clic en cualquier parte de la página.</p>
                    <p style="font-size: 13px;">Esto es un requisito de seguridad del navegador.</p>
                    <button id="clickToEnableAudio" style="margin-top: 15px; padding: 10px 20px; background: #00cfff; color: black; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-volume-up"></i> Hacer clic aquí
                    </button>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                didOpen: () => {
                    const btn = document.getElementById('clickToEnableAudio');
                    if (btn) {
                        btn.onclick = async () => {
                            const success = await initAudioOnUserInteraction();
                            if (success) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Sonidos activados',
                                    text: 'Las notificaciones ahora reproducirán sonidos',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                                actualizarUI();
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'No se pudieron activar los sonidos'
                                });
                            }
                        };
                    }
                }
            });
        }
        
        return AppState.soundEnabled;
        
    } catch (error) {
        console.error('Error solicitando permiso de audio:', error);
        return false;
    }
}

// NUEVA FUNCIÓN: Probar sonidos disponibles
async function probarSonidos() {
    // Asegurar que el audio está inicializado
    if (!AppState.audioInitialized) {
        const init = await initAudioOnUserInteraction();
        if (!init) {
            Swal.fire({
                icon: 'warning',
                title: 'Necesitas activar los sonidos',
                text: 'Haz clic en "Activar Sonidos" primero'
            });
            return;
        }
    }
    
    const sounds = notificationSound.getAvailableSounds();
    
    const buttonsHtml = sounds.map(sound => `
        <button class="sound-test-btn" data-sound="${sound.id}" style="
            margin: 5px;
            padding: 10px 15px;
            background: var(--color-bg-secondary, #1a1a1a);
            border: 1px solid var(--color-border-light, #333);
            border-radius: 8px;
            cursor: pointer;
            color: var(--color-text-primary, #fff);
            transition: all 0.3s ease;
        ">
            <i class="fas fa-music"></i>
            ${sound.name}
        </button>
    `).join('');
    
    const { isConfirmed } = await Swal.fire({
        title: '🎵 Probar Sonidos',
        html: `
            <div style="max-height: 400px; overflow-y: auto; padding: 10px;">
                <p style="margin-bottom: 15px;">Selecciona un sonido para probarlo:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    ${buttonsHtml}
                </div>
                <div style="margin-top: 20px;">
                    <label style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fas fa-volume-up"></i>
                        <input type="range" id="testVolumeSlider" min="0" max="100" value="${AppState.soundVolume * 100}" style="width: 200px;">
                        <span id="volumeValue">${Math.round(AppState.soundVolume * 100)}%</span>
                    </label>
                </div>
                <div style="margin-top: 15px;">
                    <label style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <input type="checkbox" id="testLoopCheckbox">
                        <span>Repetir en bucle</span>
                    </label>
                </div>
            </div>
        `,
        width: '550px',
        showConfirmButton: true,
        confirmButtonText: 'Cerrar',
        didOpen: () => {
            // Configurar botones de prueba
            document.querySelectorAll('.sound-test-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const soundId = btn.dataset.sound;
                    const volume = document.getElementById('testVolumeSlider').value / 100;
                    const loop = document.getElementById('testLoopCheckbox').checked;
                    
                    // Detener sonidos anteriores si están en loop
                    if (loop) {
                        notificationSound.stopAll();
                    }
                    
                    await notificationSound.play(soundId, volume, loop);
                });
            });
            
            // Configurar slider de volumen
            const volumeSlider = document.getElementById('testVolumeSlider');
            const volumeValue = document.getElementById('volumeValue');
            
            volumeSlider.addEventListener('input', (e) => {
                const vol = e.target.value;
                volumeValue.textContent = `${vol}%`;
            });
        }
    });
}

// NUEVA FUNCIÓN: Configurar selector de sonido predeterminado
async function configurarSonidoPredeterminado() {
    if (!AppState.audioInitialized) {
        await initAudioOnUserInteraction();
    }
    
    const sounds = notificationSound.getAvailableSounds();
    
    const { value: selectedSound } = await Swal.fire({
        title: '🎵 Sonido Predeterminado',
        text: 'Selecciona el sonido que se usará para las notificaciones',
        input: 'select',
        inputOptions: sounds.reduce((opts, sound) => {
            opts[sound.id] = sound.name;
            return opts;
        }, {}),
        inputValue: AppState.selectedSound,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar'
    });
    
    if (selectedSound) {
        AppState.selectedSound = selectedSound;
        
        // Probar el sonido seleccionado
        await notificationSound.play(selectedSound, AppState.soundVolume);
        
        Swal.fire({
            icon: 'success',
            title: 'Sonido guardado',
            text: `Se usará "${sounds.find(s => s.id === selectedSound)?.name}" para las notificaciones`,
            timer: 2000,
            showConfirmButton: false
        });
    }
}

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
    
    // Reproducir sonido según el tipo de mensaje
    if (tipo === 'success') {
        reproducirSonidoNotificacion('normal');
    } else if (tipo === 'error') {
        reproducirSonidoNotificacion('alerta');
    } else if (tipo === 'warning') {
        reproducirSonidoNotificacion('pendiente');
    }
}

// Función para actualizar la UI con el estado actual
function actualizarUI() {
    const statusBadge = document.getElementById('deviceStatusBadge');
    const tokenSpan = document.getElementById('deviceToken');
    const enableBtn = document.getElementById('enableNotificationsBtn');
    const disableBtn = document.getElementById('disableNotificationsBtn');
    const entornoInfo = document.getElementById('entornoInfo');
    const soundStatus = document.getElementById('soundStatus');
    const selectedSoundSpan = document.getElementById('selectedSound');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    // Actualizar información del entorno
    if (window.location.protocol === 'https:') {
        entornoInfo.innerHTML = '🌐 Entorno de PRODUCCIÓN - Notificaciones disponibles';
        entornoInfo.style.color = '#28a745';
    } else {
        entornoInfo.innerHTML = '💻 Entorno de DESARROLLO - Las notificaciones solo funcionarán después del deploy';
        entornoInfo.style.color = '#ffc107';
    }
    
    // Actualizar estado de notificaciones
    if (fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
        statusBadge.textContent = 'Activadas';
        statusBadge.className = 'badge-enabled';
        const token = fcmInitializer.getCurrentToken ? fcmInitializer.getCurrentToken() : null;
        tokenSpan.textContent = token ? token.substring(0, 30) + '...' : 'Token obtenido';
        if (enableBtn) enableBtn.disabled = true;
        if (disableBtn) disableBtn.disabled = false;
    } else {
        statusBadge.textContent = 'Desactivadas';
        statusBadge.className = 'badge-disabled';
        tokenSpan.textContent = 'No disponible';
        if (enableBtn) enableBtn.disabled = false;
        if (disableBtn) disableBtn.disabled = true;
    }
    
    // Actualizar estado de sonido
    if (soundStatus) {
        const soundIcon = AppState.soundEnabled && AppState.audioInitialized ? 'fa-volume-up' : 'fa-volume-mute';
        soundStatus.innerHTML = `<i class="fas ${soundIcon}"></i> ${AppState.soundEnabled && AppState.audioInitialized ? 'Sonidos activados' : 'Sonidos desactivados'}`;
        soundStatus.style.color = (AppState.soundEnabled && AppState.audioInitialized) ? '#28a745' : '#ffc107';
    }
    
    // Mostrar sonido seleccionado
    if (selectedSoundSpan) {
        const soundName = notificationSound.getAvailableSounds().find(s => s.id === AppState.selectedSound)?.name || 'Ding Moderno';
        selectedSoundSpan.textContent = `🎵 ${soundName}`;
    }
    
    // Actualizar slider de volumen
    if (volumeSlider && !volumeSlider.hasListener) {
        volumeSlider.value = AppState.soundVolume * 100;
        volumeSlider.hasListener = true;
    }
    if (volumeValue) {
        volumeValue.textContent = `${Math.round(AppState.soundVolume * 100)}%`;
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
                enabled: true,
                soundEnabled: AppState.soundEnabled,
                selectedSound: AppState.selectedSound,
                soundVolume: AppState.soundVolume
            });
            console.log('✅ Token guardado en el array dispositivos del usuario');
        } else {
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
        
        // Guardar en Firestore
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
        
        // Reproducir sonido de éxito
        await reproducirSonidoNotificacion('normal');
        
        manejarFinalizacion(true);
        
    } catch (error) {
        console.error("❌ Error crítico en el proceso:", error);
        
        // Reproducir sonido de error
        await reproducirSonidoNotificacion('alerta');
        
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
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-volume-up" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Sonidos de alerta personalizables
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

    if (result.isConfirmed) {
        // Preguntar por sonidos después de activar notificaciones
        await solicitarPermisoAudio();
    }

    return result.isConfirmed;
}

// Verificar configuración actual al cargar la página
async function verificarConfiguracionActual() {
    if (!AppState.currentUser) return;

    try {
        console.log("🔍 Verificando configuración actual de notificaciones...");
        
        const dispositivoActual = AppState.currentUser.dispositivos?.find(
            d => d.deviceId === fcmInitializer.deviceId
        );
        
        if (dispositivoActual && dispositivoActual.enabled !== false) {
            console.log("✅ Este dispositivo ya tiene notificaciones activas");
            AppState.fcmToken = dispositivoActual.token;
            if (fcmInitializer.notificationsEnabled !== undefined) {
                fcmInitializer.notificationsEnabled = true;
            }
            localStorage.setItem(`fcm_enabled_${fcmInitializer.deviceId}`, 'true');
            
            // Cargar preferencias de sonido
            if (dispositivoActual.soundEnabled !== undefined) {
                AppState.soundEnabled = dispositivoActual.soundEnabled;
            }
            if (dispositivoActual.selectedSound) {
                AppState.selectedSound = dispositivoActual.selectedSound;
            }
            if (dispositivoActual.soundVolume) {
                AppState.soundVolume = dispositivoActual.soundVolume;
            }
        } else {
            console.log("ℹ️ Este dispositivo no tiene notificaciones configuradas");
        }
        
        actualizarUI();
        
    } catch (error) {
        console.error('Error al verificar configuración:', error);
    }
}

// Escuchar notificaciones push con sonido
function setupPushListener() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'NOTIFICATION_RECEIVED') {
                const notification = event.data.notification;
                
                console.log('📨 Notificación push recibida:', notification);
                
                let soundType = 'normal';
                if (notification.nivelRiesgo === 'critico') {
                    soundType = 'critico';
                } else if (notification.nivelRiesgo === 'alto') {
                    soundType = 'urgente';
                } else if (notification.tipo === 'canalizacion') {
                    soundType = 'pendiente';
                } else if (notification.tipo === 'incidencia') {
                    soundType = 'campana';
                }
                
                await reproducirSonidoNotificacion(soundType);
                
                // Mostrar notificación del sistema
                if (Notification.permission === 'granted') {
                    const systemNotif = new Notification(notification.titulo, {
                        body: notification.mensaje,
                        icon: '/assets/images/logo.png',
                        badge: '/assets/images/logo.png',
                        silent: false,
                        vibrate: [200, 100, 200]
                    });
                    
                    systemNotif.onclick = () => {
                        window.focus();
                        if (notification.url) {
                            window.location.href = notification.url;
                        }
                        systemNotif.close();
                    };
                }
            }
        });
    }
}

// Función para inicializar la página
async function init() {
    try {
        console.log('🚀 Inicializando página de pruebas...');
        
        // Inicializar sistema de sonido (sin activar aún)
        await notificationSound.initialize();
        
        // Detectar clic en cualquier parte para activar audio
        const activateAudioOnClick = async () => {
            if (!AppState.audioInitialized && AppState.soundEnabled) {
                const success = await notificationSound.requestAudioPermission();
                if (success) {
                    AppState.audioInitialized = true;
                    console.log('🔊 Audio activado por interacción del usuario');
                    actualizarUI();
                    
                    // Remover el listener después de la primera activación
                    document.removeEventListener('click', activateAudioOnClick);
                    document.removeEventListener('touchstart', activateAudioOnClick);
                }
            }
        };
        
        document.addEventListener('click', activateAudioOnClick);
        document.addEventListener('touchstart', activateAudioOnClick);
        
        // Esperar a que UserManager tenga el usuario actual
        const checkUser = setInterval(async () => {
            if (userManager.currentUser) {
                clearInterval(checkUser);
                
                console.log('👤 Usuario:', userManager.currentUser.nombreCompleto);
                AppState.currentUser = userManager.currentUser;
                
                // Inicializar FCM
                if (fcmInitializer.init) {
                    await fcmInitializer.init(userManager);
                }
                
                await verificarConfiguracionActual();
                
                // Configurar botones
                const enableBtn = document.getElementById('enableNotificationsBtn');
                const disableBtn = document.getElementById('disableNotificationsBtn');
                
                if (enableBtn) {
                    enableBtn.addEventListener('click', async () => {
                        const quiereActivar = await preguntarPermisoNotificaciones();
                        if (quiereActivar) {
                            await suscribirANotificaciones();
                        }
                    });
                }

                if (disableBtn) {
                    disableBtn.addEventListener('click', async () => {
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
                            if (fcmInitializer.disableNotifications) {
                                await fcmInitializer.disableNotifications();
                            }
                            await guardarEstadoNotificaciones(false);
                            manejarFinalizacion(true);
                        }
                    });
                }
                
                // Configurar botón de activar/desactivar sonidos
                const toggleSoundBtn = document.getElementById('toggleSoundBtn');
                if (toggleSoundBtn) {
                    toggleSoundBtn.addEventListener('click', async () => {
                        if (AppState.soundEnabled && AppState.audioInitialized) {
                            AppState.soundEnabled = false;
                            notificationSound.stopAll();
                            Swal.fire({
                                icon: 'info',
                                title: 'Sonidos desactivados',
                                text: 'Ya no se reproducirán sonidos para las notificaciones',
                                timer: 2000,
                                showConfirmButton: false
                            });
                        } else {
                            const success = await initAudioOnUserInteraction();
                            if (success) {
                                AppState.soundEnabled = true;
                                await reproducirSonidoNotificacion('normal');
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Sonidos activados',
                                    text: 'Las notificaciones ahora reproducirán sonidos',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            } else {
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Necesitas interactuar',
                                    text: 'Haz clic en la página para activar los sonidos'
                                });
                            }
                        }
                        actualizarUI();
                        
                        if (fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
                            await guardarEstadoNotificaciones(true, fcmInitializer.getCurrentToken());
                        }
                    });
                }
                
                // Configurar botón de probar sonidos
                const testSoundsBtn = document.getElementById('testSoundsBtn');
                if (testSoundsBtn) {
                    testSoundsBtn.addEventListener('click', async () => {
                        await probarSonidos();
                    });
                }
                
                // Configurar botón de seleccionar sonido
                const selectSoundBtn = document.getElementById('selectSoundBtn');
                if (selectSoundBtn) {
                    selectSoundBtn.addEventListener('click', async () => {
                        await configurarSonidoPredeterminado();
                        actualizarUI();
                        
                        if (fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
                            await guardarEstadoNotificaciones(true, fcmInitializer.getCurrentToken());
                        }
                    });
                }
                
                // Configurar slider de volumen
                const volumeSlider = document.getElementById('volumeSlider');
                if (volumeSlider) {
                    volumeSlider.addEventListener('input', async (e) => {
                        AppState.soundVolume = e.target.value / 100;
                        notificationSound.setGlobalVolume(AppState.soundVolume);
                        const volumeValue = document.getElementById('volumeValue');
                        if (volumeValue) {
                            volumeValue.textContent = `${e.target.value}%`;
                        }
                        
                        if (fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
                            await guardarEstadoNotificaciones(true, fcmInitializer.getCurrentToken());
                        }
                    });
                }
                
                // Configurar formulario de envío de notificaciones de prueba
                const notificationForm = document.getElementById('notificationForm');
                if (notificationForm) {
                    notificationForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const userId = document.getElementById('userId').value.trim();
                        const userType = document.getElementById('userType').value;
                        const title = document.getElementById('title').value.trim();
                        const body = document.getElementById('body').value.trim();
                        const url = document.getElementById('url').value.trim();
                        const soundType = document.getElementById('soundType')?.value || 'normal';
                        
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
                                    senderToken: userManager.currentUser?.id,
                                    soundType: soundType
                                })
                            });
                            
                            const result = await response.json();
                            Swal.close();
                            
                            if (response.ok && result.success) {
                                if (soundType && soundType !== 'ninguno') {
                                    await reproducirSonidoNotificacion(soundType);
                                } else {
                                    await reproducirSonidoNotificacion('normal');
                                }
                                
                                Swal.fire({
                                    icon: 'success',
                                    title: '✅ Notificación enviada',
                                    html: `
                                        <p>${result.message || 'Notificación enviada correctamente'}</p>
                                        ${result.failures ? `<p>Fallos: ${result.failures}</p>` : ''}
                                        ${soundType !== 'ninguno' ? `<p>🔊 Sonido: ${soundType}</p>` : ''}
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
                }
                
                setupPushListener();
                actualizarUI();
                console.log('✅ Página de pruebas lista');
            }
        }, 500);

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