// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL, ACTIONS } from '/config/urlCloudFunction.js';

// ==================== CONSTANTES ====================
const POWER_MANAGE_FUNCTION = 'proxyPowerManage';
const AUTO_REFRESH_INTERVAL = 30000; // 30 segundos

// ==================== VARIABLES GLOBALES ====================
let cuentaAppId = null;
let panelSerial = null;
let panelAlias = null;
let panelTipo = null;
let powerManageUserToken = null;
let sessionToken = null;
let autoRefreshTimer = null;
let eventosPage = 0;
let cargandoMasEventos = false;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    await initGestionPanel();
});

async function initGestionPanel() {
    const urlParams = new URLSearchParams(window.location.search);
    cuentaAppId = urlParams.get('appId');
    panelSerial = urlParams.get('panelSerial');
    
    if (!cuentaAppId || !panelSerial) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se especificó la cuenta o el panel',
            confirmButtonText: 'VOLVER'
        }).then(() => {
            window.location.href = '../listarPaneles/listarPaneles.html';
        });
        return;
    }
    
    try {
        // Obtener token de Power Manage
        const powerManageStr = localStorage.getItem('powerManageToken');
        if (!powerManageStr) {
            throw new Error('No hay sesión activa de Power Manage');
        }
        
        const powerManageData = JSON.parse(powerManageStr);
        powerManageUserToken = powerManageData.user_token;
        
        // Cargar información del panel desde localStorage
        const panelStr = localStorage.getItem('panelSeleccionado');
        if (panelStr) {
            const panel = JSON.parse(panelStr);
            panelAlias = panel.alias || 'Panel sin nombre';
            panelTipo = panel.tipo || 'PowerMaster';
            document.getElementById('panelAlias').textContent = panelAlias;
            document.getElementById('panelSerial').textContent = `Serial: ${panelSerial} | Tipo: ${panelTipo}`;
        } else {
            panelTipo = 'PowerMaster';
            document.getElementById('panelAlias').textContent = `Panel ${panelSerial}`;
            document.getElementById('panelSerial').textContent = `Serial: ${panelSerial}`;
        }
        
        // Obtener session_token
        await obtenerSessionToken();
        
        // Cargar datos del panel
        await cargarDatosPanel();
        
        // Iniciar auto-refresh
        iniciarAutoRefresh();
        
        // Configurar eventos
        configurarEventos();
        configurarTabs();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        
        if (error.message === 'Wrong user token') {
            redirectToLogin();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonText: 'VOLVER'
            }).then(() => {
                window.location.href = '../listarPaneles/listarPaneles.html';
            });
        }
    }
}

async function obtenerSessionToken() {
    mostrarProgreso('Conectando al panel...', 20);
    
    // Verificar session guardado
    const savedSession = localStorage.getItem(`session_${panelSerial}`);
    if (savedSession) {
        console.log('🔄 Verificando session token guardado...');
        sessionToken = savedSession;
        
        try {
            const testResponse = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: ACTIONS.VERIFICAR_SESION,
                    user_token: powerManageUserToken,
                    session_token: sessionToken,
                    panel_serial: panelSerial
                })
            });
            
            if (testResponse.ok) {
                console.log('✅ Session token válido');
                mostrarProgreso('Conexión establecida', 100);
                setTimeout(() => ocultarProgreso(), 500);
                return;
            }
        } catch (e) {
            console.log('⚠️ Session token expirado');
            localStorage.removeItem(`session_${panelSerial}`);
        }
    }
    
    try {
        const appType = panelTipo === 'Neo' ? 'com.visonic.neogo' : 'com.visonic.PowerMaxApp';
        
        const { value: userCode } = await Swal.fire({
            title: 'Código de usuario del panel',
            html: `
                <div style="text-align: left;">
                    <p>Para conectar con el panel <strong>${escapeHTML(panelAlias)}</strong></p>
                    <p>Ingresa el código de usuario (código maestro o de usuario con permisos)</p>
                </div>
            `,
            input: 'password',
            inputLabel: 'Código de usuario',
            inputPlaceholder: 'Ej: 1234',
            inputAttributes: {
                maxlength: '8',
                pattern: '[0-9]*',
                inputmode: 'numeric'
            },
            showCancelButton: true,
            confirmButtonText: 'CONECTAR',
            cancelButtonText: 'CANCELAR',
            inputValidator: (value) => {
                if (!value) return 'El código es requerido';
                if (!/^\d{4,8}$/.test(value)) return 'El código debe tener entre 4 y 8 dígitos';
                return null;
            }
        });
        
        if (!userCode) {
            throw new Error('Código de usuario no proporcionado');
        }
        
        mostrarProgreso(`Iniciando sesión en el panel (${panelTipo})...`, 40);
        
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: ACTIONS.LOGIN_PANEL,
                user_token: powerManageUserToken,
                panel_data: {
                    panel_serial: panelSerial,
                    user_code: userCode,
                    app_id: cuentaAppId,
                    app_type: appType
                }
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        const result = await response.json();
        
        if (!response.ok) {
            if (result.error_reason_code === 'WrongUserCode') {
                throw new Error('Código de usuario incorrecto');
            } else if (result.error_reason_code === 'UserIsDeactivatedOnPanel') {
                throw new Error('El usuario está desactivado en el panel');
            } else {
                throw new Error(result.error_message || 'Error al conectar con el panel');
            }
        }
        
        sessionToken = result.session_token;
        
        localStorage.setItem(`session_${panelSerial}`, sessionToken);
        localStorage.setItem(`panel_tipo_${panelSerial}`, panelTipo);
        
        mostrarProgreso('Conexión establecida', 100);
        setTimeout(() => ocultarProgreso(), 500);
        
    } catch (error) {
        console.error('❌ Error obteniendo session token:', error);
        ocultarProgreso();
        throw error;
    }
}

async function cargarDatosPanel() {
    if (!sessionToken) {
        throw new Error('No hay sesión activa en el panel');
    }
    
    mostrarProgreso('Cargando información del panel...', 10);
    
    await Promise.all([
        cargarEstadoPanel(),
        cargarZonas(),
        cargarEventos(true),
        cargarDispositivos()
    ]);
    
    ocultarProgreso();
}

async function cargarEstadoPanel() {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: ACTIONS.OBTENER_ESTADO_PANEL,
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelSerial
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error_message);
        
        const partition = result.partitions?.[0] || {};
        const estado = partition.state || 'UNKNOWN';
        
        const stateDisplay = document.getElementById('systemState');
        const currentStateSpan = document.getElementById('currentState');
        
        stateDisplay.classList.remove('state-disarm', 'state-home', 'state-away');
        
        switch(estado) {
            case 'DISARM':
                stateDisplay.classList.add('state-disarm');
                currentStateSpan.textContent = 'Desarmado';
                break;
            case 'HOME':
                stateDisplay.classList.add('state-home');
                currentStateSpan.textContent = 'Modo Casa';
                break;
            case 'AWAY':
                stateDisplay.classList.add('state-away');
                currentStateSpan.textContent = 'Modo Ausente';
                break;
            default:
                currentStateSpan.textContent = estado || 'Desconocido';
        }
        
        const statusIndicator = document.querySelector('.status-indicator');
        const isOnline = result.connected_status?.gprs?.connected || result.connected_status?.bba?.connected;
        
        if (isOnline) {
            statusIndicator.className = 'status-indicator online';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>En línea</span>';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>Sin conexión</span>';
        }
        
        const signalLevel = document.getElementById('signalLevel');
        const lastConnection = document.getElementById('lastConnection');
        
        if (result.rssi?.level) {
            signalLevel.innerHTML = `<i class="fas fa-signal"></i> <span>${result.rssi.level}</span>`;
        }
        
        lastConnection.textContent = new Date().toLocaleString();
        
    } catch (error) {
        console.error('❌ Error cargando estado:', error);
        if (error.message === 'Wrong user token') {
            redirectToLogin();
        }
    }
}

async function cargarZonas() {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: ACTIONS.LISTAR_ZONAS,
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelSerial
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        const zonas = await response.json();
        
        if (!response.ok) throw new Error(zonas.error_message);
        
        const zonasGrid = document.getElementById('zonasGrid');
        const zonasCount = document.getElementById('zonasCount');
        
        if (!zonas || zonas.length === 0) {
            zonasGrid.innerHTML = '<div class="empty-state"><i class="fas fa-map-marker-alt"></i><p>No hay zonas configuradas</p></div>';
            zonasCount.textContent = '0';
            return;
        }
        
        zonasCount.textContent = zonas.length;
        
        zonasGrid.innerHTML = zonas.map(zona => `
            <div class="zona-card">
                <div class="zona-header">
                    <i class="fas fa-map-marker-alt"></i>
                    <strong>Zona ${zona.id || zona.zone || zona.device_number}</strong>
                    <span class="zona-estado">${zona.status || 'Normal'}</span>
                </div>
                <div class="zona-info">
                    ${zona.name || 'Sin nombre'} - Tipo: ${zona.zone_type || zona.device_type || 'Desconocido'}
                </div>
                <div class="zona-bateria">
                    <i class="fas fa-battery-${zona.battery?.status === 'low' ? 'quarter' : 'full'}"></i>
                    Batería: ${zona.battery?.level || zona.battery?.status || 'Normal'}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error cargando zonas:', error);
        document.getElementById('zonasGrid').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error cargando zonas</p></div>';
    }
}

async function cargarEventos(reset = false) {
    if (reset) {
        eventosPage = 0;
        document.getElementById('eventosList').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando eventos...</div>';
    }
    
    if (cargandoMasEventos) return;
    cargandoMasEventos = true;
    
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: ACTIONS.LISTAR_EVENTOS,
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelSerial,
                limit: 20,
                offset: eventosPage * 20
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        const eventos = await response.json();
        
        if (!response.ok) throw new Error(eventos.error_message);
        
        const eventosList = document.getElementById('eventosList');
        const eventosCount = document.getElementById('eventosCount');
        const btnCargarMas = document.getElementById('btnCargarMas');
        
        if (reset) {
            eventosCount.textContent = eventos.total || eventos.length;
        }
        
        if (!eventos || eventos.length === 0) {
            if (reset) {
                eventosList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No hay eventos recientes</p></div>';
            }
            btnCargarMas.style.display = 'none';
            cargandoMasEventos = false;
            return;
        }
        
        if (reset) {
            eventosList.innerHTML = '';
        }
        
        eventos.forEach(evento => {
            const eventoCard = document.createElement('div');
            eventoCard.className = 'evento-card';
            eventoCard.innerHTML = `
                <div class="evento-fecha">${new Date(evento.datetime).toLocaleString()}</div>
                <div class="evento-tipo">
                    <i class="fas ${getEventoIcon(evento.label)}"></i>
                    ${evento.description}
                </div>
                <div class="evento-detalle">
                    ${evento.appointment ? `Usuario: ${evento.appointment}` : ''}
                    ${evento.zone ? `Zona: ${evento.zone}` : ''}
                    ${evento.name ? `Dispositivo: ${evento.name}` : ''}
                </div>
            `;
            eventosList.appendChild(eventoCard);
        });
        
        eventosPage++;
        
        if (eventos.length === 20) {
            btnCargarMas.style.display = 'block';
        } else {
            btnCargarMas.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        if (reset) {
            document.getElementById('eventosList').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error cargando eventos</p></div>';
        }
    } finally {
        cargandoMasEventos = false;
    }
}

async function cargarDispositivos() {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: ACTIONS.LISTAR_DISPOSITIVOS,
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelSerial
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        const dispositivos = await response.json();
        
        if (!response.ok) throw new Error(dispositivos.error_message);
        
        const dispositivosList = document.getElementById('dispositivosList');
        const dispositivosCount = document.getElementById('dispositivosCount');
        
        if (!dispositivos || dispositivos.length === 0) {
            dispositivosList.innerHTML = '<div class="empty-state"><i class="fas fa-microchip"></i><p>No hay dispositivos adicionales</p></div>';
            dispositivosCount.textContent = '0';
            return;
        }
        
        dispositivosCount.textContent = dispositivos.length;
        
        dispositivosList.innerHTML = dispositivos.map(disp => `
            <div class="dispositivo-card">
                <div class="dispositivo-header">
                    <i class="fas ${getDeviceIcon(disp.device_type)}"></i>
                    <strong>${disp.name || disp.device_type}</strong>
                    <span class="dispositivo-id">ID: ${disp.device_number}</span>
                </div>
                <div class="dispositivo-info">
                    <span>Tipo: ${disp.device_type}</span>
                    ${disp.subtype ? `<span>Subtipo: ${disp.subtype}</span>` : ''}
                </div>
                <div class="dispositivo-bateria">
                    <i class="fas fa-battery-${disp.battery?.status === 'low' ? 'quarter' : 'full'}"></i>
                    Batería: ${disp.battery?.level || 'Normal'}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error cargando dispositivos:', error);
        document.getElementById('dispositivosList').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error cargando dispositivos</p></div>';
    }
}

async function cambiarEstadoPanel(estado) {
    if (!sessionToken) {
        Swal.fire({
            icon: 'warning',
            title: 'Sesión expirada',
            text: 'La conexión con el panel ha expirado. Reconectando...',
            confirmButtonText: 'RECONECTAR'
        }).then(() => {
            obtenerSessionToken().then(() => {
                cambiarEstadoPanel(estado);
            });
        });
        return;
    }
    
    mostrarProgreso(`Cambiando a ${estado === 'DISARM' ? 'Desarmado' : estado === 'HOME' ? 'Modo Casa' : 'Modo Ausente'}...`, 30);
    
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: ACTIONS.SET_ESTADO_PANEL,
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelSerial,
                state: estado,
                partition: 1,
                options: []
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        mostrarProgreso('Comando enviado, actualizando estado...', 70);
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error_message);
        
        ocultarProgreso();
        
        Swal.fire({
            icon: 'success',
            title: 'Comando enviado',
            text: `El panel está cambiando a ${estado === 'DISARM' ? 'Desarmado' : estado === 'HOME' ? 'Modo Casa' : 'Modo Ausente'}`,
            timer: 2000,
            showConfirmButton: false
        });
        
        setTimeout(() => {
            cargarEstadoPanel();
            cargarEventos(true);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error cambiando estado:', error);
        ocultarProgreso();
        
        if (error.message === 'Wrong user token') {
            redirectToLogin();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo cambiar el estado del panel'
            });
        }
    }
}

function getEventoIcon(label) {
    const icons = {
        'ARM': 'fa-shield-alt',
        'DISARM': 'fa-shield-alt',
        'BURGLER': 'fa-bell',
        'FIRE': 'fa-fire',
        'PANIC': 'fa-exclamation-triangle',
        'ONLINE': 'fa-wifi',
        'OFFLINE': 'fa-plug',
        'BATTERY': 'fa-battery-quarter',
        'TAMPER': 'fa-tools'
    };
    return icons[label] || 'fa-info-circle';
}

function getDeviceIcon(type) {
    const icons = {
        'KEYFOB': 'fa-key',
        'ZONE': 'fa-map-marker-alt',
        'CONTROL_PANEL': 'fa-microchip',
        'CAMERA': 'fa-camera',
        'SIREN': 'fa-bell',
        'SMOKE': 'fa-smog'
    };
    return icons[type] || 'fa-microchip';
}

function redirectToLogin() {
    localStorage.removeItem('powerManageToken');
    Swal.fire({
        icon: 'warning',
        title: 'Sesión expirada',
        text: 'Debes autenticarte nuevamente en Power Manage',
        confirmButtonText: 'IR A AUTENTICACIÓN'
    }).then(() => {
        window.location.href = `/usuarios/administrador/loginMonitoreo/loginMonitoreo.html?redirect=gestionarPanel&appId=${cuentaAppId}&panelSerial=${panelSerial}`;
    });
}

function iniciarAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        if (sessionToken) {
            cargarEstadoPanel();
            cargarZonas();
        }
    }, AUTO_REFRESH_INTERVAL);
}

function configurarEventos() {
    const btnDisarm = document.getElementById('btnDisarm');
    const btnHome = document.getElementById('btnHome');
    const btnAway = document.getElementById('btnAway');
    const btnCargarMas = document.getElementById('btnCargarMas');
    
    if (btnDisarm) btnDisarm.addEventListener('click', () => cambiarEstadoPanel('DISARM'));
    if (btnHome) btnHome.addEventListener('click', () => cambiarEstadoPanel('HOME'));
    if (btnAway) btnAway.addEventListener('click', () => cambiarEstadoPanel('AWAY'));
    if (btnCargarMas) btnCargarMas.addEventListener('click', () => cargarEventos(false));
}

function configurarTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('🔧 Configurando tabs...');
    console.log('Botones encontrados:', tabBtns.length);
    console.log('Contenidos encontrados:', tabContents.length);
    
    // Ocultar todos los tabs inicialmente
    tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Mostrar el primer tab (zonas)
    const firstTab = document.getElementById('tab-zonas');
    if (firstTab) {
        firstTab.classList.add('active');
        firstTab.style.display = 'block';
        console.log('✅ Mostrando tab inicial: zonas');
    }
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = btn.getAttribute('data-tab');
            console.log('📌 Click en tab:', tabId);
            
            // Cambiar clase activa en botones
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Ocultar todos los tabs
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Mostrar el tab seleccionado
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.style.display = 'block';
                console.log('✅ Mostrando tab:', tabId);
            } else {
                console.error('❌ No se encontró el tab:', `tab-${tabId}`);
            }
        });
    });
}

function mostrarProgreso(mensaje, porcentaje) {
    const container = document.getElementById('progressContainer');
    const message = document.getElementById('progressMessage');
    const bar = document.getElementById('progressBar');
    
    if (!container) return;
    
    container.style.display = 'block';
    if (message) message.textContent = mensaje;
    if (bar) bar.style.width = `${porcentaje}%`;
}

function ocultarProgreso() {
    const container = document.getElementById('progressContainer');
    const bar = document.getElementById('progressBar');
    
    if (!container) return;
    
    setTimeout(() => {
        container.style.display = 'none';
        if (bar) bar.style.width = '0%';
    }, 500);
}

function escapeHTML(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}