// consumoGlobal.js - Panel administrativo para ver consumo de todas las empresas
// VERSIÓN CORREGIDA - Campos en SINGULAR como en Firebase

import { db } from '/config/firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Elementos del DOM
const selectEmpresa = document.getElementById('selectEmpresa');
const btnCargar = document.getElementById('btnCargarEmpresa');
const btnActualizarTodo = document.getElementById('btnActualizarTodo');
const empresaInfo = document.getElementById('empresaInfo');
const empresaNombre = document.getElementById('empresaNombre');
const empresaUltimaActualizacion = document.getElementById('empresaUltimaActualizacion');
const tablaEmpresasBody = document.getElementById('tablaEmpresasBody');
const fechaGlobal = document.getElementById('fechaActualizacionGlobal');

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
        console.log('🌍 Iniciando panel global de consumo...');
        mostrarLoading();

        // Listeners
        btnCargar.addEventListener('click', cargarEmpresaSeleccionada);
        btnActualizarTodo.addEventListener('click', cargarTodasLasEmpresas);
        selectEmpresa.addEventListener('change', () => {
            if (selectEmpresa.value) {
                cargarEmpresaSeleccionada();
            }
        });

        // Cargar lista de empresas
        await cargarTodasLasEmpresas();

        // Actualizar cada 60 segundos
        setInterval(cargarTodasLasEmpresas, 60000);

    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('No se pudo cargar el panel global.');
    }
});

// =============================================
// CARGAR TODAS LAS EMPRESAS (lista resumen)
// =============================================
async function cargarTodasLasEmpresas() {
    console.log('📋 Cargando todas las empresas...');
    
    try {
        const consumoRef = collection(db, 'consumo');
        const snapshot = await getDocs(consumoRef);
        
        if (snapshot.empty) {
            tablaEmpresasBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay empresas con datos de consumo.</td></tr>';
            selectEmpresa.innerHTML = '<option value="">-- No hay empresas disponibles --</option>';
            return;
        }

        let empresas = [];
        let options = '<option value="">-- Selecciona una empresa --</option>';

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const nombre = data.nombreEmpresa || id;
            
            empresas.push({ id, ...data });
            
            options += `<option value="${id}">${nombre} (${id})</option>`;
        });

        // Ordenar por nombre
        empresas.sort((a, b) => (a.nombreEmpresa || a.id).localeCompare(b.nombreEmpresa || b.id));

        selectEmpresa.innerHTML = options;
        actualizarTablaEmpresas(empresas);
        fechaGlobal.textContent = new Date().toLocaleString('es-MX');

    } catch (error) {
        console.error('Error cargando empresas:', error);
        tablaEmpresasBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#ef4444;">Error al cargar empresas</td></tr>';
    }
}

// =============================================
// ACTUALIZAR TABLA DE EMPRESAS (VERSIÓN CORREGIDA - SINGULAR)
// =============================================
function actualizarTablaEmpresas(empresas) {
    if (!empresas || empresas.length === 0) {
        tablaEmpresasBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay datos disponibles</td></tr>';
        return;
    }

    tablaEmpresasBody.innerHTML = empresas.map(emp => {
        // FIRESTORE - Campos en SINGULAR como en Firebase
        const firestore = emp.firestore || { 
            total: 0, 
            lectura: 0,      // ← singular
            escritura: 0,    // ← singular
            actualizacion: 0, // ← singular
            eliminacion: 0    // ← singular
        };
        
        // STORAGE
        const storage = emp.storage || { 
            total: 0, 
            subida: 0,       // ← singular
            descarga: 0,     // ← singular
            eliminacion: 0   // ← singular
        };
        
        // FUNCTIONS
        const functions = emp.functions || { 
            total: 0, 
            invocacion: 0    // ← singular
        };
        
        // AUTH
        const auth = emp.autenticacion || { 
            total: 0, 
            inicioSesion: 0,   // ← singular
            cierreSesion: 0,   // ← singular
            registro: 0         // ← singular
        };
        
        // FCM
        const fcm = emp.fcm || { 
            total: 0, 
            notificacionEnviada: 0,  // ← singular
            tokenRegistrado: 0,       // ← singular
            tokenEliminado: 0         // ← singular
        };
        
        const total = firestore.total + storage.total + functions.total + auth.total + fcm.total;
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
                
                <!-- FUNCTIONS -->
                <td>
                    <span class="badge-value badge-secondary">${functions.total}</span><br>
                    <small style="font-size:10px;">Inv:${functions.invocacion}</small>
                </td>
                
                <!-- AUTH -->
                <td>
                    <span class="badge-value badge-success">${auth.total}</span><br>
                    <small style="font-size:10px;">
                        Lg:${auth.inicioSesion} | Lo:${auth.cierreSesion}<br>
                        Rg:${auth.registro}
                    </small>
                </td>
                
                <!-- FCM -->
                <td>
                    <span class="badge-value badge-danger">${fcm.total}</span><br>
                    <small style="font-size:10px;">
                        Not:${fcm.notificacionEnviada}<br>
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
        
        const docRef = doc(db, 'consumo', empresaId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            Swal.fire({
                icon: 'error',
                title: 'Sin datos',
                text: 'La empresa seleccionada no tiene datos de consumo.'
            });
            empresaInfo.style.display = 'none';
            return;
        }

        const data = docSnap.data();
        mostrarDatosEmpresa(empresaId, data);
        
    } catch (error) {
        console.error('Error cargando empresa:', error);
        mostrarError('No se pudo cargar los datos de la empresa.');
    }
}

// =============================================
// MOSTRAR DATOS DE EMPRESA (VERSIÓN CORREGIDA - SINGULAR)
// =============================================
function mostrarDatosEmpresa(id, data) {
    // Mostrar el contenedor
    empresaInfo.style.display = 'block';
    
    // Datos generales
    const nombre = data.nombreEmpresa || id;
    empresaNombre.textContent = nombre;
    
    const ultimaAct = data.ultimaActualizacion ? 
        new Date(data.ultimaActualizacion.seconds * 1000).toLocaleString('es-MX') : 
        'No disponible';
    empresaUltimaActualizacion.innerHTML = `<i class="fas fa-clock"></i> Última actualización: ${ultimaAct}`;
    
    // FIRESTORE - Campos en SINGULAR
    const fs = data.firestore || { 
        lectura: 0, 
        escritura: 0, 
        actualizacion: 0, 
        eliminacion: 0, 
        total: 0 
    };
    metricas.firestoreTotal.textContent = fs.total;
    metricas.firestoreDetalle.innerHTML = `L:${fs.lectura} / E:${fs.escritura} / U:${fs.actualizacion} / D:${fs.eliminacion}`;
    
    // STORAGE
    const st = data.storage || { 
        subida: 0, 
        descarga: 0, 
        eliminacion: 0, 
        total: 0 
    };
    metricas.storageTotal.textContent = st.total;
    metricas.storageDetalle.innerHTML = `Sub:${st.subida} / Desc:${st.descarga} / Elim:${st.eliminacion}`;
    
    // FUNCTIONS
    const fn = data.functions || { 
        invocacion: 0, 
        total: 0 
    };
    metricas.functionsTotal.textContent = fn.total;
    metricas.functionsDetalle.innerHTML = `Invocaciones: ${fn.invocacion}`;
    
    // AUTH
    const au = data.autenticacion || { 
        inicioSesion: 0, 
        cierreSesion: 0, 
        registro: 0, 
        total: 0 
    };
    metricas.authTotal.textContent = au.total;
    metricas.authDetalle.innerHTML = `Login:${au.inicioSesion} / Logout:${au.cierreSesion} / Reg:${au.registro}`;
    
    // FCM
    const fcm = data.fcm || { 
        notificacionEnviada: 0, 
        tokenRegistrado: 0, 
        tokenEliminado: 0, 
        total: 0 
    };
    metricas.fcmTotal.textContent = fcm.total;
    metricas.fcmDetalle.innerHTML = `Notif:${fcm.notificacionEnviada} / Tokens:${fcm.tokenRegistrado} / TokElim:${fcm.tokenEliminado}`;
    
    // Total
    const total = fs.total + st.total + fn.total + au.total + fcm.total;
    metricas.totalOperaciones.textContent = total;
    metricas.totalDetalle.innerHTML = `${total} operaciones en total`;
    
    // Última operación
    mostrarUltimaOperacion(data.ultimaOperacion);
    
    // Actualizar gráficas
    actualizarGraficasEmpresa(fs, st, fn, au, fcm);
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
        if (ultima.detalles.coleccion) {
            detalles = `Colección: ${ultima.detalles.coleccion}`;
            if (ultima.detalles.documento) detalles += `, Documento: ${ultima.detalles.documento}`;
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
// GRÁFICAS (VERSIÓN CORREGIDA)
// =============================================
function actualizarGraficasEmpresa(fs, st, fn, au, fcm) {
    // Totales por servicio
    const fsTotal = fs.total || 0;
    const stTotal = st.total || 0;
    const fnTotal = fn.total || 0;
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
        labels: ['Firestore', 'Storage', 'Auth', 'FCM'],
        datasets: [
            {
                label: 'Lecturas / Subidas / Logins / Notificaciones',
                data: [
                    fs.lectura || 0,
                    st.subida || 0,
                    au.inicioSesion || 0,
                    fcm.notificacionEnviada || 0
                ],
                backgroundColor: '#3b82f6',
                stack: 'stack0'
            },
            {
                label: 'Escrituras / Descargas / Logouts / Tokens',
                data: [
                    fs.escritura || 0,
                    st.descarga || 0,
                    au.cierreSesion || 0,
                    fcm.tokenRegistrado || 0
                ],
                backgroundColor: '#f97316',
                stack: 'stack0'
            },
            {
                label: 'Actualizaciones / Eliminaciones / Registros / TokElim',
                data: [
                    fs.actualizacion || 0,
                    st.eliminacion || 0,
                    au.registro || 0,
                    fcm.tokenEliminado || 0
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