// consumoGlobal.js - Panel administrativo para ver consumo de todas las empresas
// VERSIÓN CORREGIDA - FCM muestra notificaciones push reales

import { db } from '/config/firebase-config.js';
import { collection, getDocs, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Elementos del DOM
const selectEmpresa = document.getElementById('selectEmpresa');
const btnCargar = document.getElementById('btnCargarEmpresa');
const btnActualizarTodo = document.getElementById('btnActualizarTodo');
const empresaInfo = document.getElementById('empresaInfo');
const empresaNombre = document.getElementById('empresaNombre');
const empresaUltimaActualizacion = document.getElementById('empresaUltimaActualizacion');
const tablaEmpresasBody = document.getElementById('tablaEmpresasBody');
const fechaGlobal = document.getElementById('fechaActualizacionGlobal');

// Variables para los listeners
let unsubscribeEmpresas = null;
let unsubscribeEmpresaSeleccionada = null;
let empresaIdActual = null;

// Métricas de empresa seleccionada
const metricas = {
    firestoreTotal: document.getElementById('empresaFirestoreTotal'),
    firestoreDetalle: document.getElementById('empresaFirestoreDetalle'),
    storageTotal: document.getElementById('empresaStorageTotal'),
    storageDetalle: document.getElementById('empresaStorageDetalle'),
    functionsTotal: document.getElementById('empresaFunctionsTotal'),
    functionsDetalle: document.getElementById('empresaFunctionsDetalle'),
    authTotal: document.getElementById('empresaAuthTotal'),
    authDetalle: document.getElementById('empresaAuthDetalle'),
    fcmTotal: document.getElementById('empresaFCMTotal'),
    fcmDetalle: document.getElementById('empresaFCMDetalle'),
    totalOperaciones: document.getElementById('empresaTotalOperaciones'),
    totalDetalle: document.getElementById('empresaTotalDetalle')
};

// Gráficas
let chartDistribucion = null;
let chartTipos = null;

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🌍 Iniciando panel global de consumo con listeners en tiempo real...');
        mostrarLoading();

        // Listeners de UI
        btnCargar.addEventListener('click', () => {
            if (selectEmpresa.value) {
                cargarEmpresaSeleccionada();
            }
        });
        
        btnActualizarTodo.addEventListener('click', () => {
            if (unsubscribeEmpresas) unsubscribeEmpresas();
            iniciarListenerEmpresas();
        });
        
        selectEmpresa.addEventListener('change', () => {
            if (selectEmpresa.value) {
                cargarEmpresaSeleccionada();
            }
        });

        // Iniciar listeners en tiempo real
        iniciarListenerEmpresas();

        // Limpiar listeners cuando la página se cierra
        window.addEventListener('beforeunload', () => {
            if (unsubscribeEmpresas) unsubscribeEmpresas();
            if (unsubscribeEmpresaSeleccionada) unsubscribeEmpresaSeleccionada();
        });

    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('No se pudo cargar el panel global.');
    }
});

// =============================================
// LISTENER EN TIEMPO REAL PARA TODAS LAS EMPRESAS
// =============================================
function iniciarListenerEmpresas() {
    console.log('📡 Iniciando listener en tiempo real para todas las empresas...');
    
    if (unsubscribeEmpresas) {
        unsubscribeEmpresas();
    }

    const consumoRef = collection(db, 'consumo');
    
    unsubscribeEmpresas = onSnapshot(consumoRef, (snapshot) => {
        console.log('🔄 Cambio detectado en la colección consumo');
        
        if (snapshot.empty) {
            tablaEmpresasBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay empresas con datos de consumo.</td></tr>';
            selectEmpresa.innerHTML = '<option value="">-- No hay empresas disponibles --</option>';
            return;
        }

        let empresas = [];
        let options = '<option value="">-- Selecciona una empresa --</option>';
        let empresaSeleccionadaAunExiste = false;

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const nombre = data.nombreEmpresa || id;
            
            empresas.push({ id, ...data });
            
            options += `<option value="${id}" ${id === selectEmpresa.value ? 'selected' : ''}>${nombre} (${id})</option>`;
            
            if (id === selectEmpresa.value) {
                empresaSeleccionadaAunExiste = true;
            }
        });

        empresas.sort((a, b) => (a.nombreEmpresa || a.id).localeCompare(b.nombreEmpresa || b.id));

        selectEmpresa.innerHTML = options;
        actualizarTablaEmpresas(empresas);
        fechaGlobal.textContent = new Date().toLocaleString('es-MX');

        if (selectEmpresa.value && !empresaSeleccionadaAunExiste) {
            empresaInfo.style.display = 'none';
            selectEmpresa.value = '';
        } 
        else if (selectEmpresa.value && empresaSeleccionadaAunExiste) {
            setTimeout(() => {
                if (selectEmpresa.value) {
                    actualizarEmpresaSeleccionada();
                }
            }, 100);
        }

    }, (error) => {
        console.error('Error en listener de empresas:', error);
        tablaEmpresasBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#ef4444;">Error en conexión en tiempo real</td></tr>';
    });
}

// =============================================
// LISTENER EN TIEMPO REAL PARA EMPRESA SELECCIONADA
// =============================================
function iniciarListenerEmpresaSeleccionada(empresaId) {
    if (!empresaId) return;
    
    console.log(`📡 Iniciando listener en tiempo real para empresa: ${empresaId}`);
    
    if (unsubscribeEmpresaSeleccionada) {
        unsubscribeEmpresaSeleccionada();
    }

    const docRef = doc(db, 'consumo', empresaId);
    
    unsubscribeEmpresaSeleccionada = onSnapshot(docRef, (docSnap) => {
        console.log(`🔄 Cambio detectado en empresa: ${empresaId}`);
        
        if (!docSnap.exists()) {
            Swal.fire({
                icon: 'error',
                title: 'Empresa eliminada',
                text: 'La empresa seleccionada ya no existe en la base de datos.',
                timer: 3000
            });
            empresaInfo.style.display = 'none';
            selectEmpresa.value = '';
            return;
        }

        const data = docSnap.data();
        mostrarDatosEmpresa(empresaId, data);
        mostrarNotificacionActualizacion();

    }, (error) => {
        console.error('Error en listener de empresa:', error);
        mostrarError('Error en la conexión en tiempo real para esta empresa.');
    });
}

// =============================================
// ACTUALIZAR EMPRESA SELECCIONADA
// =============================================
async function actualizarEmpresaSeleccionada() {
    const empresaId = selectEmpresa.value;
    
    if (!empresaId) return;

    try {
        const docRef = doc(db, 'consumo', empresaId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            empresaInfo.style.display = 'none';
            return;
        }

        const data = docSnap.data();
        mostrarDatosEmpresa(empresaId, data);
        
    } catch (error) {
        console.error('Error actualizando empresa:', error);
    }
}

// =============================================
// CARGAR EMPRESA SELECCIONADA
// =============================================
async function cargarEmpresaSeleccionada() {
    const empresaId = selectEmpresa.value;
    
    if (!empresaId) {
        Swal.fire({
            icon: 'warning',
            title: 'Selecciona una empresa',
            text: 'Debes seleccionar una empresa para ver sus datos.'
        });
        return;
    }

    try {
        mostrarLoadingEmpresa();
        empresaIdActual = empresaId;
        iniciarListenerEmpresaSeleccionada(empresaId);
        
    } catch (error) {
        console.error('Error cargando empresa:', error);
        mostrarError('No se pudo cargar los datos de la empresa.');
    }
}

// =============================================
// MOSTRAR NOTIFICACIÓN DE ACTUALIZACIÓN
// =============================================
function mostrarNotificacionActualizacion() {
    let indicator = document.getElementById('updateIndicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'updateIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(indicator);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Datos actualizados en tiempo real';
    
    setTimeout(() => {
        if (indicator) {
            indicator.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (indicator && indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }
    }, 2000);
}

// =============================================
// ACTUALIZAR TABLA DE EMPRESAS (CORREGIDO)
// =============================================
function actualizarTablaEmpresas(empresas) {
    if (!empresas || empresas.length === 0) {
        tablaEmpresasBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay datos disponibles</td></tr>';
        return;
    }

    tablaEmpresasBody.innerHTML = empresas.map(emp => {
        // FIRESTORE
        const firestore = emp.firestore || { 
            total: 0, 
            lectura: 0,
            escritura: 0,
            actualizacion: 0,
            eliminacion: 0
        };
        
        // STORAGE
        const storage = emp.storage || { 
            total: 0, 
            subida: 0,
            descarga: 0,
            eliminacion: 0
        };
        
        // FUNCTIONS - Sumamos invocacion + invocaciones
        const functions = emp.functions || { 
            total: 0, 
            invocacion: 0,
            invocaciones: 0
        };
        const invocacionesTotales = (functions.invocacion || 0) + (functions.invocaciones || 0);
        
        // AUTH
        const auth = emp.autenticacion || { 
            total: 0, 
            inicioSesion: 0,
            cierreSesion: 0,
            registro: 0
        };
        
        // FCM - NOTIFICACIONES PUSH REALES
        const notificacionesPushReales = emp.functions?.notificacionesPushEnviadas || 0;
        const usuariosNotificados = emp.functions?.usuariosNotificados || 0;
        
        // FCM tradicional
        const fcm = emp.fcm || { 
            total: 0, 
            notificacionEnviada: 0,
            tokenRegistrado: 0,
            tokenEliminado: 0
        };
        
        const total = firestore.total + storage.total + (functions.total || invocacionesTotales) + auth.total + fcm.total;
        const ultima = emp.ultimaActualizacion ? new Date(emp.ultimaActualizacion.seconds * 1000).toLocaleString('es-MX') : 'N/A';
        const nombre = emp.nombreEmpresa || emp.id;

        return `
            <tr onclick="document.getElementById('selectEmpresa').value='${emp.id}'; window.cargarEmpresaSeleccionada()">
                <td><strong>${nombre}</strong><br><small style="color:#6c757d;">${emp.id}</small></td>
                
                <!-- FIRESTORE -->
                <td>
                    <span class="badge-value badge-info">${firestore.total}</span><br>
                    <small style="font-size:10px;">
                        L:${firestore.lectura} | E:${firestore.escritura}<br>
                        U:${firestore.actualizacion} | D:${firestore.eliminacion}
                    </small>
                </td>
                
                <!-- STORAGE -->
                <td>
                    <span class="badge-value badge-warning">${storage.total}</span><br>
                    <small style="font-size:10px;">
                        Sub:${storage.subida} | Desc:${storage.descarga}<br>
                        Elim:${storage.eliminacion}
                    </small>
                </td>
                
                <!-- FUNCTIONS (SOLO invocaciones) -->
                <td>
                    <span class="badge-value badge-secondary">${functions.total || invocacionesTotales}</span><br>
                    <small style="font-size:10px;">
                        Invocaciones: ${invocacionesTotales}
                    </small>
                </td>
                
                <!-- AUTH -->
                <td>
                    <span class="badge-value badge-success">${auth.total}</span><br>
                    <small style="font-size:10px;">
                        Lg:${auth.inicioSesion} | Lo:${auth.cierreSesion}<br>
                        Rg:${auth.registro}
                    </small>
                </td>
                
                <!-- FCM (Notificaciones push reales) -->
                <td>
                    <span class="badge-value badge-danger" style="font-size:1.2rem; font-weight:bold;">${notificacionesPushReales}</span><br>
                    <small style="font-size:10px;">
                        👥 Usuarios: ${usuariosNotificados}<br>
                        Tok:${fcm.tokenRegistrado} | Elim:${fcm.tokenEliminado}
                    </small>
                </td>
                
                <td><span class="badge-value" style="background:rgba(13,202,240,0.2); color:#0dcaf0;">${total}</span></td>
                <td>${ultima}</td>
                <td><button class="btn-seleccionar" onclick="event.stopPropagation(); document.getElementById('selectEmpresa').value='${emp.id}'; window.cargarEmpresaSeleccionada()"><i class="fas fa-eye"></i> Ver</button></td>
            </tr>
        `;
    }).join('');
}

// =============================================
// MOSTRAR DATOS DE EMPRESA (CORREGIDO)
// =============================================
function mostrarDatosEmpresa(id, data) {
    empresaInfo.style.display = 'block';
    
    const nombre = data.nombreEmpresa || id;
    empresaNombre.textContent = nombre;
    
    const ultimaAct = data.ultimaActualizacion ? 
        new Date(data.ultimaActualizacion.seconds * 1000).toLocaleString('es-MX') : 
        'No disponible';
    empresaUltimaActualizacion.innerHTML = `<i class="fas fa-clock"></i> Última actualización: ${ultimaAct}`;
    
    // FIRESTORE
    const fs = data.firestore || { 
        lectura: 0, escritura: 0, actualizacion: 0, eliminacion: 0, total: 0 
    };
    metricas.firestoreTotal.textContent = fs.total;
    metricas.firestoreDetalle.innerHTML = `L:${fs.lectura} / E:${fs.escritura} / U:${fs.actualizacion} / D:${fs.eliminacion}`;
    
    // STORAGE
    const st = data.storage || { 
        subida: 0, descarga: 0, eliminacion: 0, total: 0 
    };
    metricas.storageTotal.textContent = st.total;
    metricas.storageDetalle.innerHTML = `Sub:${st.subida} / Desc:${st.descarga} / Elim:${st.eliminacion}`;
    
    // FUNCTIONS - Sumamos invocacion + invocaciones
    const fn = data.functions || { 
        invocacion: 0, 
        invocaciones: 0, 
        total: 0 
    };
    const invocacionesTotales = (fn.invocacion || 0) + (fn.invocaciones || 0);
    
    metricas.functionsTotal.textContent = fn.total || invocacionesTotales;
    metricas.functionsDetalle.innerHTML = `Invocaciones: ${invocacionesTotales}`;
    
    // AUTH
    const au = data.autenticacion || { 
        inicioSesion: 0, cierreSesion: 0, registro: 0, total: 0 
    };
    metricas.authTotal.textContent = au.total;
    metricas.authDetalle.innerHTML = `Login:${au.inicioSesion} / Logout:${au.cierreSesion} / Reg:${au.registro}`;
    
    // FCM - NOTIFICACIONES PUSH REALES (número grande)
    const notificacionesPushReales = data.functions?.notificacionesPushEnviadas || 0;
    const usuariosNotificados = data.functions?.usuariosNotificados || 0;
    
    // FCM tradicional
    const fcm = data.fcm || { 
        notificacionEnviada: 0, 
        tokenRegistrado: 0, 
        tokenEliminado: 0, 
        total: 0 
    };
    
    metricas.fcmTotal.textContent = notificacionesPushReales;
    metricas.fcmDetalle.innerHTML = ` Usuarios notificados: ${usuariosNotificados}<br> Tokens registrados: ${fcm.tokenRegistrado} | Eliminados: ${fcm.tokenEliminado}`;
    
    // Total general
    const total = fs.total + st.total + (fn.total || invocacionesTotales) + au.total + fcm.total;
    metricas.totalOperaciones.textContent = total;
    metricas.totalDetalle.innerHTML = `${total} operaciones en total (${notificacionesPushReales} notificaciones push reales)`;
    
    // Última operación
    mostrarUltimaOperacion(data.ultimaOperacion);
    
    // Actualizar gráficas
    actualizarGraficasEmpresa(fs, st, { ...fn, invocacionesTotales, notificacionesPushReales, usuariosNotificados }, au, fcm);
}

// =============================================
// MOSTRAR ÚLTIMA OPERACIÓN
// =============================================
function mostrarUltimaOperacion(ultima) {
    const container = document.getElementById('ultimaOperacion');
    
    if (!ultima || !ultima.servicio) {
        container.innerHTML = '<span class="sin-datos">No hay operaciones registradas</span>';
        return;
    }
    
    const fecha = ultima.timestamp ? 
        new Date(ultima.timestamp.seconds * 1000).toLocaleString('es-MX') : 
        'Fecha no disponible';
    
    let detalles = '';
    if (ultima.detalles) {
        // Manejar detalles de notificaciones push
        if (ultima.detalles.notificacionesEnviadas) {
            detalles = ` Notificaciones push: ${ultima.detalles.notificacionesEnviadas} (${ultima.detalles.usuariosNotificados} usuarios)`;
            if (ultima.detalles.incidenciaId) {
                detalles += `<br> Incidencia: ${ultima.detalles.incidenciaId}`;
            }
        } else if (ultima.detalles.coleccion) {
            detalles = `Colección: ${ultima.detalles.coleccion}`;
            if (ultima.detalles.documento) detalles += `, Documento: ${ultima.detalles.documento}`;
        } else if (ultima.detalles.nombreFuncion) {
            detalles = `Función: ${ultima.detalles.nombreFuncion}`;
            if (ultima.detalles.userId) detalles += `, Usuario: ${ultima.detalles.userId}`;
        } else {
            detalles = JSON.stringify(ultima.detalles);
        }
    }
    
    container.innerHTML = `
        <div class="operacion-detalle">
            <span class="operacion-servicio"><i class="fas fa-${getIconoServicio(ultima.servicio)}"></i> ${ultima.servicio}</span>
            <span class="operacion-tipo">${ultima.tipo}</span>
            <span class="operacion-detalles">${detalles}</span>
            <span class="operacion-fecha"><i class="far fa-clock"></i> ${fecha}</span>
        </div>
    `;
}

function getIconoServicio(servicio) {
    switch(servicio) {
        case 'firestore': return 'database';
        case 'storage': return 'cloud-upload-alt';
        case 'functions': return 'code';
        case 'auth': return 'user-lock';
        case 'fcm': return 'bell';
        default: return 'circle';
    }
}

// =============================================
// GRÁFICAS (CORREGIDO)
// =============================================
function actualizarGraficasEmpresa(fs, st, fn, au, fcm) {
    // Totales por servicio
    const fsTotal = fs.total || 0;
    const stTotal = st.total || 0;
    const fnTotal = fn.total || fn.invocacionesTotales || 0;
    const auTotal = au.total || 0;
    const fcmTotal = fcm.total || 0;
    
    // Gráfica de distribución por servicio
    const ctxDist = document.getElementById('graficoEmpresaDistribucion').getContext('2d');
    
    const dataDist = {
        labels: ['Firestore', 'Storage', 'Functions', 'Auth', 'FCM'],
        datasets: [{
            data: [fsTotal, stTotal, fnTotal, auTotal, fcmTotal],
            backgroundColor: ['#3b82f6', '#f97316', '#8b5cf6', '#10b981', '#ec4899'],
            borderWidth: 0
        }]
    };
    
    if (chartDistribucion) {
        chartDistribucion.data = dataDist;
        chartDistribucion.update();
    } else {
        chartDistribucion = new Chart(ctxDist, {
            type: 'pie',
            data: dataDist,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: 'white' }, position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                                return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfica de desglose por tipo
    const ctxTipos = document.getElementById('graficoEmpresaTipos').getContext('2d');
    
    const dataTipos = {
        labels: ['Firestore', 'Storage', 'Auth', 'FCM (Push)', 'Functions'],
        datasets: [
            {
                label: 'Lecturas / Subidas / Logins / Notif. Push / Invocaciones',
                data: [
                    fs.lectura || 0,
                    st.subida || 0,
                    au.inicioSesion || 0,
                    fn.notificacionesPushReales || 0,
                    fn.invocacion || 0
                ],
                backgroundColor: '#3b82f6',
                stack: 'stack0'
            },
            {
                label: 'Escrituras / Descargas / Logouts / Usuarios Notif. / Invocaciones (alt)',
                data: [
                    fs.escritura || 0,
                    st.descarga || 0,
                    au.cierreSesion || 0,
                    fn.usuariosNotificados || 0,
                    fn.invocaciones || 0
                ],
                backgroundColor: '#f97316',
                stack: 'stack0'
            },
            {
                label: 'Actualizaciones / Eliminaciones / Registros / Tokens / Total',
                data: [
                    fs.actualizacion || 0,
                    st.eliminacion || 0,
                    au.registro || 0,
                    fcm.tokenRegistrado || 0,
                    0
                ],
                backgroundColor: '#10b981',
                stack: 'stack0'
            }
        ]
    };
    
    if (chartTipos) {
        chartTipos.data = dataTipos;
        chartTipos.update();
    } else {
        chartTipos = new Chart(ctxTipos, {
            type: 'bar',
            data: dataTipos,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: 'white', font: { size: 10 } } },
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: 'white' }
                    },
                    x: { 
                        ticks: { color: 'white' }
                    }
                }
            }
        });
    }
}

// =============================================
// UTILIDADES
// =============================================
function mostrarLoading() {
    tablaEmpresasBody.innerHTML = '<tr><td colspan="9" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando empresas...</td></tr>';
    selectEmpresa.innerHTML = '<option value="">-- Cargando empresas... --</option>';
}

function mostrarLoadingEmpresa() {
    metricas.firestoreTotal.textContent = '...';
    metricas.storageTotal.textContent = '...';
    metricas.functionsTotal.textContent = '...';
    metricas.authTotal.textContent = '...';
    metricas.fcmTotal.textContent = '...';
    metricas.totalOperaciones.textContent = '...';
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje
    });
}

// Hacer funciones globales para los onclick
window.cargarEmpresaSeleccionada = cargarEmpresaSeleccionada;