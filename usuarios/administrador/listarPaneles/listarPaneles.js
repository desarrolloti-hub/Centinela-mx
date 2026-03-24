// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL } from '/config/urlCloudFunction.js';

// ==================== CONSTANTES ====================
const POWER_MANAGE_FUNCTION = 'proxyPowerManage';

// ==================== VARIABLES GLOBALES ====================
let cuentaAppId = null;
let cuentaData = null;
let powerManageToken = null;
let paneles = [];

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    await initListaPaneles();
});

async function initListaPaneles() {
    const urlParams = new URLSearchParams(window.location.search);
    cuentaAppId = urlParams.get('appId') || urlParams.get('id');
    
    if (!cuentaAppId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se especificó la cuenta de monitoreo',
            confirmButtonText: 'VOLVER'
        }).then(() => {
            window.location.href = '/usuarios/administrador/cuentasPM/cuentasPM.html';
        });
        return;
    }
    
    try {
        // Cargar datos de la cuenta de monitoreo
        await cargarCuenta();
        
        // Obtener token de Power Manage desde localStorage
        const powerManageStr = localStorage.getItem('powerManageToken');
        
        if (!powerManageStr) {
            console.warn('⚠️ No hay token de Power Manage en localStorage');
            redirectToLogin('No hay sesión activa de Power Manage');
            return;
        }
        
        const powerManageData = JSON.parse(powerManageStr);
        powerManageToken = powerManageData.user_token;
        
        console.log('✅ Token Power Manage cargado');
        
        // Verificar que el token no sea undefined o vacío
        if (!powerManageToken || powerManageToken === 'undefined') {
            console.warn('⚠️ Token inválido');
            redirectToLogin('Token de autenticación inválido');
            return;
        }
        
        // Cargar paneles desde Power Manage
        await cargarPanelesPowerManage();
        
        // Mostrar paneles
        mostrarPaneles();
        
        // Configurar eventos
        configurarEventos();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        
        // Si es error de autenticación, redirigir al login
        if (error.message === 'Wrong user token' || error.message.includes('401') || error.message.includes('token')) {
            redirectToLogin('La sesión de monitoreo ha expirado');
        } else {
            mostrarError(error.message);
        }
    }
}

function redirectToLogin(mensaje) {
    // Limpiar token inválido
    localStorage.removeItem('powerManageToken');
    
    Swal.fire({
        icon: 'warning',
        title: 'Sesión expirada',
        text: mensaje || 'Debes autenticarte nuevamente con tu cuenta de monitoreo',
        confirmButtonText: 'IR A AUTENTICACIÓN'
    }).then(() => {
        window.location.href = `/usuarios/administrador/loginMonitoreo/loginMonitoreo.html?redirect=listarPaneles&appId=${cuentaAppId}`;
    });
}

async function cargarCuenta() {
    const cuenta = await CuentaPM.obtenerPorAppId(cuentaAppId);
    if (!cuenta) throw new Error('Cuenta no encontrada');
    
    cuentaData = cuenta.toJSON();
    
    // Mostrar información de la cuenta
    const emailElement = document.getElementById('cuentaEmail');
    const appIdElement = document.getElementById('cuentaAppId');
    const emailInfoElement = document.getElementById('cuentaEmailInfo');
    const appIdInfoElement = document.getElementById('cuentaAppIdInfo');
    const organizacionElement = document.getElementById('cuentaOrganizacion');
    
    if (emailElement) emailElement.textContent = cuentaData.email;
    if (appIdElement) appIdElement.textContent = cuentaData.appId;
    if (emailInfoElement) emailInfoElement.textContent = cuentaData.email;
    if (appIdInfoElement) appIdInfoElement.textContent = cuentaData.appId;
    if (organizacionElement) organizacionElement.textContent = cuentaData.organizacion || 'No asignada';
}

async function cargarPanelesPowerManage() {
    const panelesGrid = document.getElementById('panelesGrid');
    
    // Mostrar loading
    panelesGrid.innerHTML = `
        <div class="loading-paneles">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Cargando paneles...</span>
        </div>
    `;
    
    try {
        const url = `${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`;
        
        console.log('📤 Solicitando paneles con token:', powerManageToken.substring(0, 20) + '...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'listarPaneles',
                user_token: powerManageToken
            })
        });
        
        if (response.status === 401) {
            console.warn('⚠️ Token inválido o expirado');
            throw new Error('Wrong user token');
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_message || 'Error al obtener paneles');
        }
        
        paneles = await response.json();
        
        console.log('📊 Paneles obtenidos:', paneles.length);
        
        // Actualizar contador
        const totalElement = document.getElementById('totalPaneles');
        if (totalElement) totalElement.textContent = paneles.length;
        
    } catch (error) {
        console.error('❌ Error cargando paneles:', error);
        
        if (error.message === 'Wrong user token') {
            redirectToLogin('La sesión de monitoreo ha expirado');
            return;
        }
        
        panelesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar paneles</p>
                <small>${error.message}</small>
                <button class="btn-refresh" id="btnRetry" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
        
        const btnRetry = document.getElementById('btnRetry');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                cargarPanelesPowerManage();
            });
        }
        
        throw error;
    }
}

function mostrarPaneles() {
    const panelesGrid = document.getElementById('panelesGrid');
    
    if (!paneles || paneles.length === 0) {
        panelesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tachometer-alt"></i>
                <p>No hay paneles vinculados a esta cuenta de monitoreo</p>
                <small>Usa el botón "Vincular Nuevo Panel" para agregar uno</small>
            </div>
        `;
        return;
    }
    
    panelesGrid.innerHTML = paneles.map(panel => `
        <div class="panel-card" data-serial="${panel.panel_serial}">
            <div class="panel-card-header">
                <i class="fas fa-microchip"></i>
                <h4>${escapeHTML(panel.alias || 'Panel sin nombre')}</h4>
                <span class="status-badge active">Activo</span>
            </div>
            <div class="panel-details">
                <div class="panel-detail">
                    <span class="label">Serial:</span>
                    <span class="value">${escapeHTML(panel.panel_serial)}</span>
                </div>
                <div class="panel-detail">
                    <span class="label">Modelo:</span>
                    <span class="value">${escapeHTML(panel.panel_model || 'Desconocido')}</span>
                </div>
                <div class="panel-detail">
                    <span class="label">Tipo:</span>
                    <span class="value">${escapeHTML(panel.type || 'No especificado')}</span>
                </div>
                <div class="panel-detail">
                    <span class="label">Rol:</span>
                    <span class="value">${escapeHTML(panel.role || 'USER')}</span>
                </div>
            </div>
            <div class="panel-footer">
                <button class="btn-gestionar" data-serial="${panel.panel_serial}">
                    <i class="fas fa-chart-line"></i> Gestionar
                </button>
                <button class="btn-eliminar" data-serial="${panel.panel_serial}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Agregar eventos a los botones
    document.querySelectorAll('.btn-gestionar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const serial = btn.getAttribute('data-serial');
            gestionarPanel(serial);
        });
    });
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const serial = btn.getAttribute('data-serial');
            eliminarPanel(serial);
        });
    });
}

async function gestionarPanel(serial) {
    // Buscar el panel seleccionado
    const panel = paneles.find(p => p.panel_serial === serial);
    
    if (!panel) {
        mostrarError('Panel no encontrado');
        return;
    }
    
    // Guardar el panel seleccionado en localStorage para la gestión
    const panelSeleccionado = {
        serial: panel.panel_serial,
        alias: panel.alias,
        modelo: panel.panel_model,
        tipo: panel.type,
        role: panel.role
    };
    
    localStorage.setItem('panelSeleccionado', JSON.stringify(panelSeleccionado));
    
    // Redirigir a la página de gestión del panel
    window.location.href = `../gestionarPanel/gestionarPanel.html?appId=${cuentaAppId}&panelSerial=${serial}`;
}

async function eliminarPanel(serial) {
    // Primero pedir la contraseña de Power Manage
    const { value: password } = await Swal.fire({
        title: 'Confirmar desvinculación',
        html: `
            <div style="text-align: left;">
                <p>Para desvincular el panel <strong>${escapeHTML(serial)}</strong> de tu cuenta de monitoreo,</p>
                <p>ingresa tu contraseña de monitoreo:</p>
            </div>
        `,
        input: 'password',
        inputLabel: 'Contraseña monitoreo',
        inputPlaceholder: '********',
        showCancelButton: true,
        confirmButtonText: 'DESVINCULAR',
        cancelButtonText: 'CANCELAR',
        inputValidator: (value) => {
            if (!value) {
                return 'La contraseña es requerida';
            }
            return null;
        }
    });
    
    if (!password) return;
    
    // Obtener el appId de la cuenta
    const appId = cuentaData.appId;
    
    mostrarProgreso('Desvinculando panel...', 30);
    
    try {
        const url = `${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`;
        
        console.log('📤 Desvinculando panel:', { serial, appId });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'desvincularPanel',
                user_token: powerManageToken,
                panel_serial: serial,
                password: password,
                app_id: appId
            })
        });
        
        mostrarProgreso('Procesando...', 70);
        
        if (response.status === 401) {
            throw new Error('Wrong user token');
        }
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Error respuesta:', error);
            throw new Error(error.error_message || 'Error al desvincular panel');
        }
        
        ocultarProgreso();
        
        Swal.fire({
            icon: 'success',
            title: 'Panel desvinculado',
            text: `El panel ${serial} ha sido desvinculado de tu cuenta de monitoreo`,
            timer: 2000,
            showConfirmButton: false
        });
        
        // Recargar la lista de paneles
        await cargarPanelesPowerManage();
        mostrarPaneles();
        
        // Actualizar contador
        const totalElement = document.getElementById('totalPaneles');
        if (totalElement) totalElement.textContent = paneles.length;
        
    } catch (error) {
        console.error('❌ Error eliminando panel:', error);
        ocultarProgreso();
        
        if (error.message === 'Wrong user token') {
            redirectToLogin('La sesión de monitoreo ha expirado');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error al desvincular',
                text: error.message || 'No se pudo desvincular el panel. Verifica tu contraseña.',
                confirmButtonText: 'ENTENDIDO'
            });
        }
    }
}

function configurarEventos() {
    // Botón refrescar
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            await cargarPanelesPowerManage();
            mostrarPaneles();
        });
    }
    
    // Botón vincular nuevo panel
    const btnVincularNuevo = document.getElementById('btnVincularNuevo');
    if (btnVincularNuevo) {
        btnVincularNuevo.addEventListener('click', () => {
            window.location.href = `enlaceCuentaPaneles.html?appId=${cuentaAppId}`;
        });
    }
}

function mostrarProgreso(mensaje, porcentaje) {
    // Crear contenedor de progreso si no existe
    let container = document.getElementById('progressContainer');
    if (!container) {
        const panelesSection = document.querySelector('.paneles-section');
        if (panelesSection) {
            const div = document.createElement('div');
            div.id = 'progressContainer';
            div.style.display = 'none';
            div.innerHTML = `
                <div class="progress-info">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span id="progressMessage">Procesando...</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar" style="width: 0%"></div>
                </div>
            `;
            panelesSection.insertAdjacentElement('afterend', div);
            container = document.getElementById('progressContainer');
        }
    }
    
    if (!container) return;
    
    const message = document.getElementById('progressMessage');
    const bar = document.getElementById('progressBar');
    
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

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje
    });
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