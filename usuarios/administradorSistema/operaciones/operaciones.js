// operaciones.js - Script principal para la vista de estadísticas de operaciones
// VERSIÓN CORREGIDA CON TODAS LAS IMPORTACIONES

import { operacionesManager } from '/clases/operacion.js';
import { UserManager } from '/clases/user.js';
import { db } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Variables globales
let currentData = null;
let currentEmpresa = 'global';
let graficoTiposArchivo = null;
let graficoFirestore = null;
let graficoCarpetas = null;
let userManager = null;
let usuarioActual = null;

// Formatear bytes a formato legible
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Formatear número con separadores de miles
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Actualizar métricas de Firestore
function actualizarMetricasFirestore(operacion) {
    const firestore = operacion.conteos.firestore;
    const auth = operacion.conteos.auth;
    const coleccionesPersonalizadas = operacion.conteos.coleccionesPersonalizadas || {};
    
    // Calcular áreas desde coleccionesPersonalizadas
    let areasCount = 0;
    let cargosCount = 0;
    
    Object.keys(coleccionesPersonalizadas).forEach(key => {
        if (key.includes('areas_')) {
            areasCount = coleccionesPersonalizadas[key];
        }
        if (key.includes('cargos') || key.includes('roles')) {
            cargosCount = coleccionesPersonalizadas[key];
        }
    });
    
    document.getElementById('metricColecciones').innerText = formatNumber(firestore.colecciones || 0);
    document.getElementById('metricDocumentos').innerText = formatNumber(firestore.documentos || 0);
    document.getElementById('metricAdministradores').innerText = formatNumber(auth.administradores || 0);
    document.getElementById('metricAreas').innerText = formatNumber(areasCount);
    
    const empleados = (auth.usuarios || 0);
    document.getElementById('metricEmpleados').innerHTML = `${formatNumber(empleados)} empleados`;
    
    const cargosTotal = cargosCount;
    document.getElementById('metricRoles').innerHTML = `${formatNumber(cargosTotal)} cargos`;
}

// Actualizar métricas de Storage
function actualizarMetricasStorage(operacion) {
    const storage = operacion.conteos.storage;
    const totalArchivos = storage.total || 0;
    const totalSize = storage.totalSize || 0;
    const pdf = storage.pdf || 0;
    const imagenes = storage.imagenes || 0;
    const documentos = storage.documentos || 0;
    const multimedia = storage.multimedia || 0;
    const otros = storage.otros || 0;
    
    document.getElementById('metricArchivosTotales').innerText = formatNumber(totalArchivos);
    document.getElementById('metricTamanioTotal').innerHTML = `<i class="fas fa-hdd"></i> ${formatBytes(totalSize)}`;
    document.getElementById('metricPDF').innerText = formatNumber(pdf);
    document.getElementById('metricImagenes').innerText = formatNumber(imagenes);
    document.getElementById('metricDocumentosStorage').innerText = formatNumber(documentos);
    document.getElementById('metricMultimedia').innerText = formatNumber(multimedia);
    
    // Calcular porcentajes
    if (totalArchivos > 0) {
        document.getElementById('metricPDFPorcentaje').innerText = `${Math.round((pdf / totalArchivos) * 100)}%`;
        document.getElementById('metricImagenesPorcentaje').innerText = `${Math.round((imagenes / totalArchivos) * 100)}%`;
        document.getElementById('metricDocumentosPorcentaje').innerText = `${Math.round((documentos / totalArchivos) * 100)}%`;
        document.getElementById('metricMultimediaPorcentaje').innerText = `${Math.round((multimedia / totalArchivos) * 100)}%`;
    }
}

// Actualizar gráfica de tipos de archivo
function actualizarGraficoTiposArchivo(operacion) {
    const storage = operacion.conteos.storage;
    const ctx = document.getElementById('graficoTiposArchivo').getContext('2d');
    
    const datos = {
        labels: ['PDF', 'Imágenes', 'Documentos', 'Multimedia', 'Otros'],
        datasets: [{
            data: [
                storage.pdf || 0,
                storage.imagenes || 0,
                storage.documentos || 0,
                storage.multimedia || 0,
                storage.otros || 0
            ],
            backgroundColor: [
                '#ef4444',
                '#8b5cf6',
                '#10b981',
                '#f59e0b',
                '#6c757d'
            ],
            borderWidth: 0,
            hoverOffset: 10
        }]
    };
    
    const config = {
        type: 'pie',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: { family: 'Rajdhani', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${formatNumber(value)} (${porcentaje}%)`;
                        }
                    }
                }
            }
        }
    };
    
    if (graficoTiposArchivo) {
        graficoTiposArchivo.destroy();
    }
    graficoTiposArchivo = new Chart(ctx, config);
}

// Actualizar gráfica de Firestore
function actualizarGraficoFirestore(operacion) {
    const firestore = operacion.conteos.firestore;
    const auth = operacion.conteos.auth;
    const coleccionesPersonalizadas = operacion.conteos.coleccionesPersonalizadas || {};
    
    let areasCount = 0;
    let sucursalesCount = 0;
    let incidenciasCount = 0;
    
    Object.keys(coleccionesPersonalizadas).forEach(key => {
        if (key.includes('areas_')) areasCount = coleccionesPersonalizadas[key];
        if (key.includes('sucursales_')) sucursalesCount = coleccionesPersonalizadas[key];
        if (key.includes('incidencias_')) incidenciasCount = coleccionesPersonalizadas[key];
    });
    
    const ctx = document.getElementById('graficoFirestore').getContext('2d');
    
    const datos = {
        labels: ['Documentos', 'Usuarios', 'Administradores', 'Áreas', 'Sucursales', 'Incidencias'],
        datasets: [{
            label: 'Cantidad',
            data: [
                firestore.documentos || 0,
                auth.usuarios || 0,
                auth.administradores || 0,
                areasCount,
                sucursalesCount,
                incidenciasCount
            ],
            backgroundColor: '#00cfff',
            borderColor: '#ffffff',
            borderWidth: 1,
            borderRadius: 8
        }]
    };
    
    const config = {
        type: 'bar',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toLocaleString()} elementos`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#ffffff' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#ffffff', font: { size: 11 } }
                }
            }
        }
    };
    
    if (graficoFirestore) {
        graficoFirestore.destroy();
    }
    graficoFirestore = new Chart(ctx, config);
}

// Actualizar gráfica de carpetas
function actualizarGraficoCarpetas(operacion) {
    const coleccionesPersonalizadas = operacion.conteos.coleccionesPersonalizadas || {};
    
    const carpetas = [];
    const valores = [];
    const colores = ['#00cfff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ff6b6b', '#4ecdc4', '#45b7d1'];
    
    let colorIndex = 0;
    Object.keys(coleccionesPersonalizadas).forEach(key => {
        if (key !== 'operaciones' && !key.includes('historial') && !key.includes('notificaciones')) {
            carpetas.push(key.replace(/_.*$/, ''));
            valores.push(coleccionesPersonalizadas[key]);
        }
    });
    
    if (carpetas.length === 0) {
        carpetas.push('No hay datos');
        valores.push(0);
    }
    
    const ctx = document.getElementById('graficoCarpetas').getContext('2d');
    
    const datos = {
        labels: carpetas,
        datasets: [{
            label: 'Documentos por colección',
            data: valores,
            backgroundColor: carpetas.map((_, i) => colores[i % colores.length]),
            borderWidth: 0,
            borderRadius: 8
        }]
    };
    
    const config = {
        type: 'bar',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toLocaleString()} documentos`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#ffffff' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#ffffff', font: { size: 11 } }
                }
            }
        }
    };
    
    if (graficoCarpetas) {
        graficoCarpetas.destroy();
    }
    graficoCarpetas = new Chart(ctx, config);
}

// Actualizar tabla de organizaciones
async function actualizarTablaOrganizaciones() {
    const tbody = document.getElementById('tablaOrganizacionesBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="loading-spinner"></div> Cargando...</td></tr>';
    
    try {
        const estadisticasGlobales = await operacionesManager.getEstadisticasGlobales();
        
        if (!estadisticasGlobales) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Error al cargar datos</td></tr>';
            return;
        }
        
        // Obtener lista de organizaciones desde la colección operaciones
        const operacionesCollectionRef = collection(db, 'operaciones');
        const snapshot = await getDocs(operacionesCollectionRef);
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay datos de organizaciones</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const storage = data.conteos?.storage || {};
            const firestore = data.conteos?.firestore || {};
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${doc.id}</strong></td>
                <td>${formatNumber(firestore.documentos || 0)}</td>
                <td>${formatNumber(storage.total || 0)}</td>
                <td><span class="size-badge">${formatBytes(storage.totalSize || 0)}</span></td>
                <td><span class="badge-value badge-danger">${formatNumber(storage.pdf || 0)}</span></td>
                <td><span class="badge-value badge-purple">${formatNumber(storage.imagenes || 0)}</span></td>
            `;
            tbody.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error actualizando tabla de organizaciones:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Error al cargar datos</td></tr>';
    }
}

// Actualizar tabla de carpetas
function actualizarTablaCarpetas(operacion) {
    const tbody = document.getElementById('tablaCarpetasBody');
    const colecciones = operacion.conteos.coleccionesPersonalizadas || {};
    
    const carpetas = [];
    Object.keys(colecciones).forEach(key => {
        if (key !== 'operaciones' && !key.includes('historial') && !key.includes('notificaciones')) {
            carpetas.push({
                nombre: key,
                documentos: colecciones[key]
            });
        }
    });
    
    carpetas.sort((a, b) => b.documentos - a.documentos);
    
    const totalDocumentos = carpetas.reduce((sum, c) => sum + c.documentos, 0);
    
    if (carpetas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay datos disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    carpetas.forEach(carpeta => {
        const porcentaje = totalDocumentos > 0 ? ((carpeta.documentos / totalDocumentos) * 100).toFixed(1) : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><i class="fas fa-folder" style="color: #00cfff; margin-right: 8px;"></i>${carpeta.nombre}</td>
            <td><strong>${formatNumber(carpeta.documentos)}</strong></td>
            <td><span class="badge-value badge-info">${porcentaje}%</span></td>
            <td style="width: 120px;">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${porcentaje}%;"></div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar toda la vista
async function actualizarVista(empresaId = null) {
    const empresa = empresaId || currentEmpresa;
    
    try {
        document.getElementById('fechaActualizacion').innerText = new Date().toLocaleString();
        
        if (empresa === 'global') {
            document.getElementById('modoVisualizacion').innerHTML = '<i class="fas fa-globe"></i> <span>Vista: Global</span>';
            
            const estadisticasGlobales = await operacionesManager.getEstadisticasGlobales();
            
            if (estadisticasGlobales) {
                // Crear objeto de operación temporal para mostrar
                const operacionTemp = {
                    conteos: {
                        firestore: estadisticasGlobales.firestore,
                        storage: estadisticasGlobales.storage,
                        auth: estadisticasGlobales.auth,
                        coleccionesPersonalizadas: {}
                    }
                };
                actualizarMetricasFirestore(operacionTemp);
                actualizarMetricasStorage(operacionTemp);
                actualizarGraficoTiposArchivo(operacionTemp);
                actualizarGraficoFirestore(operacionTemp);
                await actualizarTablaOrganizaciones();
            }
            
            // Obtener datos globales para gráfica de carpetas
            const operacionGlobal = await operacionesManager.getOperaciones('global');
            if (operacionGlobal) {
                actualizarGraficoCarpetas(operacionGlobal);
                actualizarTablaCarpetas(operacionGlobal);
            }
            
        } else {
            document.getElementById('modoVisualizacion').innerHTML = '<i class="fas fa-building"></i> <span>Vista: ' + empresa + '</span>';
            
            const operacion = await operacionesManager.getOperaciones(empresa);
            
            if (operacion) {
                actualizarMetricasFirestore(operacion);
                actualizarMetricasStorage(operacion);
                actualizarGraficoTiposArchivo(operacion);
                actualizarGraficoFirestore(operacion);
                actualizarGraficoCarpetas(operacion);
                actualizarTablaCarpetas(operacion);
            } else {
                console.warn('No se encontraron datos para la empresa:', empresa);
            }
        }
        
    } catch (error) {
        console.error('Error actualizando vista:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los datos de operaciones'
        });
    }
}

// Cargar lista de empresas en el selector
async function cargarListaEmpresas() {
    const selector = document.getElementById('selectorEmpresa');
    
    try {
        const operacionesCollectionRef = collection(db, 'operaciones');
        const snapshot = await getDocs(operacionesCollectionRef);
        
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.id;
            selector.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando lista de empresas:', error);
    }
}

// Exportar a Excel
function exportarAExcel() {
    try {
        const data = [];
        
        // Agregar encabezados
        data.push(['Estadísticas de Operaciones - Centinela']);
        data.push(['Fecha:', new Date().toLocaleString()]);
        data.push([]);
        
        // Métricas Firestore
        data.push(['MÉTRICAS FIRESTORE']);
        data.push(['Colecciones', document.getElementById('metricColecciones').innerText]);
        data.push(['Documentos', document.getElementById('metricDocumentos').innerText]);
        data.push(['Administradores', document.getElementById('metricAdministradores').innerText]);
        data.push(['Empleados', document.getElementById('metricEmpleados').innerText.replace(' empleados', '')]);
        data.push([]);
        
        // Métricas Storage
        data.push(['MÉTRICAS STORAGE']);
        data.push(['Archivos Totales', document.getElementById('metricArchivosTotales').innerText]);
        data.push(['Tamaño Total', document.getElementById('metricTamanioTotal').innerText.replace('📁 ', '')]);
        data.push(['PDF', document.getElementById('metricPDF').innerText]);
        data.push(['Imágenes', document.getElementById('metricImagenes').innerText]);
        data.push(['Documentos', document.getElementById('metricDocumentosStorage').innerText]);
        data.push(['Multimedia', document.getElementById('metricMultimedia').innerText]);
        data.push([]);
        
        // Tabla de organizaciones
        data.push(['ESTADÍSTICAS POR ORGANIZACIÓN']);
        data.push(['Organización', 'Documentos', 'Archivos', 'Tamaño', 'PDF', 'Imágenes']);
        
        const tablaOrg = document.getElementById('tablaOrganizacionesBody');
        tablaOrg.querySelectorAll('tr').forEach(row => {
            if (row.cells.length === 6 && row.cells[0].innerText !== 'Cargando...' && row.cells[0].innerText !== 'Error al cargar datos') {
                data.push([
                    row.cells[0].innerText,
                    row.cells[1].innerText,
                    row.cells[2].innerText,
                    row.cells[3].innerText,
                    row.cells[4].innerText,
                    row.cells[5].innerText
                ]);
            }
        });
        
        // Crear libro de Excel
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Operaciones');
        
        // Ajustar anchos de columna
        const colWidths = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 10}, {wch: 10}];
        ws['!cols'] = colWidths;
        
        // Descargar
        XLSX.writeFile(wb, `operaciones_${new Date().toISOString().slice(0, 19)}.xlsx`);
        
        Swal.fire({
            icon: 'success',
            title: 'Exportado',
            text: 'Archivo Excel generado correctamente',
            toast: true,
            timer: 3000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el archivo Excel'
        });
    }
}

// Inicializar suscripción en tiempo real
function inicializarSuscripcion() {
    if (currentEmpresa !== 'global') {
        operacionesManager.suscribirACambios(currentEmpresa, (operacion) => {
            if (operacion) {
                actualizarMetricasFirestore(operacion);
                actualizarMetricasStorage(operacion);
                actualizarGraficoTiposArchivo(operacion);
                actualizarGraficoFirestore(operacion);
                actualizarGraficoCarpetas(operacion);
                actualizarTablaCarpetas(operacion);
                document.getElementById('fechaActualizacion').innerText = new Date().toLocaleString();
            }
        });
    }
}

// Configurar event listeners
function configurarEventListeners() {
    const selectorEmpresa = document.getElementById('selectorEmpresa');
    const btnActualizar = document.getElementById('btnActualizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    const filtroTipoArchivo = document.getElementById('filtroTipoArchivo');
    const filtroColeccion = document.getElementById('filtroColeccion');
    const filtroFecha = document.getElementById('filtroFecha');
    
    selectorEmpresa.addEventListener('change', async (e) => {
        currentEmpresa = e.target.value;
        const badgeSpan = document.querySelector('#empresaSeleccionada span');
        if (badgeSpan) {
            badgeSpan.innerText = currentEmpresa === 'global' ? 'Global' : currentEmpresa;
        }
        await actualizarVista(currentEmpresa);
        inicializarSuscripcion();
    });
    
    btnActualizar.addEventListener('click', async () => {
        await actualizarVista(currentEmpresa);
        Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Datos actualizados correctamente',
            toast: true,
            timer: 2000,
            showConfirmButton: false
        });
    });
    
    btnLimpiar.addEventListener('click', () => {
        filtroTipoArchivo.value = 'todos';
        filtroColeccion.value = 'todas';
        filtroFecha.value = '';
        actualizarVista(currentEmpresa);
    });
    
    btnExportarExcel.addEventListener('click', exportarAExcel);
}

// Verificar autenticación
async function verificarAutenticacion() {
    userManager = new UserManager();
    
    const checkUser = () => {
        if (userManager.currentUser) {
            usuarioActual = userManager.currentUser;
            inicializar();
        }
    };
    
    if (userManager.currentUser) {
        usuarioActual = userManager.currentUser;
        inicializar();
    } else {
        const checkInterval = setInterval(() => {
            if (userManager.currentUser) {
                clearInterval(checkInterval);
                usuarioActual = userManager.currentUser;
                inicializar();
            }
        }, 500);
        
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!userManager.currentUser) {
                window.location.href = '/index.html';
            }
        }, 5000);
    }
}

// Inicialización principal
async function inicializar() {
    await cargarListaEmpresas();
    await actualizarVista('global');
    configurarEventListeners();
}

// Iniciar
verificarAutenticacion();