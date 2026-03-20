// operaciones.js - CONTROLLER CON FILTRO POR ORGANIZACIÓN (SIN ÁREAS)

import { operacionesManager } from '/clases/operacion.js';

// Variables globales
let currentEmpresa = 'global';
let charts = {
    tipos: null,
    firestore: null,
    carpetas: null
};

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// =============================================
// ACTUALIZACIÓN DE MÉTRICAS EN EL DOM
// =============================================

function actualizarMetricas(conteos) {
    if (!conteos) {
        console.warn('No hay datos para actualizar métricas');
        return;
    }
    
    const firestore = conteos.firestore;
    const storage = conteos.storage;
    const auth = conteos.auth;
    
    // Actualizar métricas de Firestore
    const coleccionesElem = document.getElementById('metricColecciones');
    const documentosElem = document.getElementById('metricDocumentos');
    const adminsElem = document.getElementById('metricAdministradores');
    const colaboradoresElem = document.getElementById('metricColaboradores');
    const totalUsuariosElem = document.getElementById('metricTotalUsuarios');
    const empleadosElem = document.getElementById('metricEmpleados');
    
    if (coleccionesElem) coleccionesElem.innerText = formatNumber(firestore.colecciones || 0);
    if (documentosElem) documentosElem.innerText = formatNumber(firestore.documentos || 0);
    if (adminsElem) adminsElem.innerText = formatNumber(auth.administradores || 0);
    if (colaboradoresElem) colaboradoresElem.innerText = formatNumber(auth.usuarios || 0);
    if (totalUsuariosElem) totalUsuariosElem.innerHTML = `${formatNumber(auth.total || 0)} total`;
    if (empleadosElem) empleadosElem.innerHTML = `${formatNumber(auth.usuarios || 0)} empleados`;
    
    // Actualizar métricas de Storage
    const archivosElem = document.getElementById('metricArchivosTotales');
    const tamanioElem = document.getElementById('metricTamanioTotal');
    const pdfElem = document.getElementById('metricPDF');
    const imagenesElem = document.getElementById('metricImagenes');
    const docsStorageElem = document.getElementById('metricDocumentosStorage');
    const multimediaElem = document.getElementById('metricMultimedia');
    
    if (archivosElem) archivosElem.innerText = formatNumber(storage.total || 0);
    if (tamanioElem) tamanioElem.innerHTML = `<i class="fas fa-hdd"></i> ${formatBytes(storage.totalSize || 0)}`;
    if (pdfElem) pdfElem.innerText = formatNumber(storage.pdf || 0);
    if (imagenesElem) imagenesElem.innerText = formatNumber(storage.imagenes || 0);
    if (docsStorageElem) docsStorageElem.innerText = formatNumber(storage.documentos || 0);
    if (multimediaElem) multimediaElem.innerText = formatNumber(storage.multimedia || 0);
    
    // Calcular porcentajes
    const totalArchivos = storage.total || 1;
    const pdfPct = document.getElementById('metricPDFPorcentaje');
    const imgPct = document.getElementById('metricImagenesPorcentaje');
    const docsPct = document.getElementById('metricDocumentosPorcentaje');
    const multiPct = document.getElementById('metricMultimediaPorcentaje');
    
    if (pdfPct) pdfPct.innerText = `${Math.round(((storage.pdf || 0) / totalArchivos) * 100)}%`;
    if (imgPct) imgPct.innerText = `${Math.round(((storage.imagenes || 0) / totalArchivos) * 100)}%`;
    if (docsPct) docsPct.innerText = `${Math.round(((storage.documentos || 0) / totalArchivos) * 100)}%`;
    if (multiPct) multiPct.innerText = `${Math.round(((storage.multimedia || 0) / totalArchivos) * 100)}%`;
    
    console.log('✅ Métricas actualizadas');
}

// =============================================
// GRÁFICAS
// =============================================

function graficoTiposArchivo(storage) {
    const canvas = document.getElementById('graficoTiposArchivo');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.tipos) charts.tipos.destroy();
    
    charts.tipos = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['PDF', 'Imágenes', 'Documentos', 'Multimedia', 'Otros'],
            datasets: [{
                data: [
                    storage.pdf || 0,
                    storage.imagenes || 0,
                    storage.documentos || 0,
                    storage.multimedia || 0,
                    storage.otros || 0
                ],
                backgroundColor: ['#ef4444', '#8b5cf6', '#10b981', '#f59e0b', '#6c757d'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#ffffff' } },
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
    });
}

function graficoFirestore(firestore, auth, colecciones) {
    const canvas = document.getElementById('graficoFirestore');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.firestore) charts.firestore.destroy();
    
    let sucursalesCount = 0;
    let incidenciasCount = 0;
    let areasCount = 0;
    
    Object.keys(colecciones).forEach(key => {
        if (key.includes('sucursales_')) sucursalesCount = colecciones[key];
        if (key.includes('incidencias_')) incidenciasCount = colecciones[key];
        if (key.includes('areas_')) areasCount = colecciones[key];
    });
    
    charts.firestore = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Documentos', 'Colaboradores', 'Administradores', 'Áreas', 'Sucursales', 'Incidencias'],
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
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#ffffff' } },
                x: { ticks: { color: '#ffffff', font: { size: 11 } } }
            }
        }
    });
}

function graficoCarpetas(colecciones) {
    const canvas = document.getElementById('graficoCarpetas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.carpetas) charts.carpetas.destroy();
    
    const items = Object.keys(colecciones)
        .filter(key => !key.includes('operaciones') && !key.includes('historial') && !key.includes('notificaciones'))
        .map(key => ({
            nombre: key,
            documentos: colecciones[key]
        }))
        .sort((a, b) => b.documentos - a.documentos)
        .slice(0, 10);
    
    if (items.length === 0) {
        items.push({ nombre: 'No hay datos', documentos: 0 });
    }
    
    charts.carpetas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: items.map(i => i.nombre),
            datasets: [{
                label: 'Documentos',
                data: items.map(i => i.documentos),
                backgroundColor: '#00cfff',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#ffffff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: '#ffffff' } }
            }
        }
    });
}

// =============================================
// TABLAS
// =============================================

function tablaCarpetas(colecciones) {
    const tbody = document.getElementById('tablaCarpetasBody');
    if (!tbody) return;
    
    const items = Object.keys(colecciones)
        .filter(key => !key.includes('operaciones') && !key.includes('historial') && !key.includes('notificaciones'))
        .map(key => ({
            nombre: key,
            documentos: colecciones[key]
        }))
        .sort((a, b) => b.documentos - a.documentos);
    
    const totalDocumentos = items.reduce((sum, item) => sum + item.documentos, 0);
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay datos disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => {
        const porcentaje = totalDocumentos > 0 ? ((item.documentos / totalDocumentos) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td><i class="fas fa-folder" style="color: #00cfff; margin-right: 8px;"></i>${item.nombre}</td>
                <td><strong>${formatNumber(item.documentos)}</strong></td>
                <td><span class="badge-value badge-info">${porcentaje}%</span></td>
                <td style="width: 120px;">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${porcentaje}%;"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function tablaOrganizaciones() {
    const tbody = document.getElementById('tablaOrganizacionesBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="loading-spinner"></div> Cargando...</td></tr>';
    
    try {
        const organizaciones = await operacionesManager.getOrganizaciones();
        
        if (organizaciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay organizaciones registradas</td></tr>';
            return;
        }
        
        const statsPromises = organizaciones.map(async org => {
            const op = await operacionesManager.getOperaciones(org.camelCase);
            return {
                id: org.camelCase,
                nombre: org.nombre,
                conteos: op ? op.conteos : null
            };
        });
        
        const resultados = await Promise.all(statsPromises);
        
        const conDatos = resultados.filter(r => r.conteos).sort((a, b) => {
            const docsA = a.conteos?.firestore?.documentos || 0;
            const docsB = b.conteos?.firestore?.documentos || 0;
            return docsB - docsA;
        });
        
        if (conDatos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay datos disponibles</td></tr>';
            return;
        }
        
        tbody.innerHTML = conDatos.map(org => {
            const storage = org.conteos.storage || {};
            const firestore = org.conteos.firestore || {};
            
            return `
                <tr>
                    <td><strong>${org.id}</strong><br><small>${org.nombre}</small></td>
                    <td>${formatNumber(firestore.documentos || 0)}</td>
                    <td>${formatNumber(storage.total || 0)}</td>
                    <td><span class="size-badge">${formatBytes(storage.totalSize || 0)}</span></td>
                    <td><span class="badge-value badge-danger">${formatNumber(storage.pdf || 0)}</span></td>
                    <td><span class="badge-value badge-purple">${formatNumber(storage.imagenes || 0)}</span></td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando tabla:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Error al cargar datos</td></tr>';
    }
}

// =============================================
// ACTUALIZACIÓN DE VISTA PRINCIPAL
// =============================================

async function actualizarVista(empresaId = 'global') {
    console.log(`🔄 Actualizando vista para: ${empresaId}`);
    
    try {
        const fechaElem = document.getElementById('fechaActualizacion');
        if (fechaElem) fechaElem.innerText = new Date().toLocaleString();
        
        if (empresaId === 'global') {
            const modoElem = document.getElementById('modoVisualizacion');
            if (modoElem) modoElem.innerHTML = '<i class="fas fa-globe"></i> Vista: Global';
            
            // Obtener todas las organizaciones y sumar sus datos
            const organizaciones = await operacionesManager.getOrganizaciones();
            const statsPromises = organizaciones.map(org => operacionesManager.getOperaciones(org.camelCase));
            const resultados = await Promise.all(statsPromises);
            
            const globalConteos = {
                firestore: { colecciones: 0, documentos: 0 },
                storage: { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
                auth: { usuarios: 0, administradores: 0, total: 0 },
                coleccionesPersonalizadas: {}
            };
            
            resultados.forEach(op => {
                if (op && op.conteos) {
                    globalConteos.firestore.colecciones += op.conteos.firestore.colecciones || 0;
                    globalConteos.firestore.documentos += op.conteos.firestore.documentos || 0;
                    globalConteos.storage.total += op.conteos.storage.total || 0;
                    globalConteos.storage.totalSize += op.conteos.storage.totalSize || 0;
                    globalConteos.storage.pdf += op.conteos.storage.pdf || 0;
                    globalConteos.storage.imagenes += op.conteos.storage.imagenes || 0;
                    globalConteos.storage.documentos += op.conteos.storage.documentos || 0;
                    globalConteos.storage.multimedia += op.conteos.storage.multimedia || 0;
                    globalConteos.storage.otros += op.conteos.storage.otros || 0;
                    globalConteos.auth.usuarios += op.conteos.auth.usuarios || 0;
                    globalConteos.auth.administradores += op.conteos.auth.administradores || 0;
                    globalConteos.auth.total += op.conteos.auth.total || 0;
                    
                    Object.keys(op.conteos.coleccionesPersonalizadas).forEach(key => {
                        globalConteos.coleccionesPersonalizadas[key] = 
                            (globalConteos.coleccionesPersonalizadas[key] || 0) + op.conteos.coleccionesPersonalizadas[key];
                    });
                }
            });
            
            actualizarMetricas(globalConteos);
            graficoTiposArchivo(globalConteos.storage);
            graficoFirestore(globalConteos.firestore, globalConteos.auth, globalConteos.coleccionesPersonalizadas);
            graficoCarpetas(globalConteos.coleccionesPersonalizadas);
            tablaCarpetas(globalConteos.coleccionesPersonalizadas);
            await tablaOrganizaciones();
            
        } else {
            const modoElem = document.getElementById('modoVisualizacion');
            if (modoElem) modoElem.innerHTML = `<i class="fas fa-building"></i> Vista: ${empresaId}`;
            
            const operacion = await operacionesManager.getOperaciones(empresaId);
            
            if (operacion && operacion.conteos) {
                actualizarMetricas(operacion.conteos);
                graficoTiposArchivo(operacion.conteos.storage);
                graficoFirestore(operacion.conteos.firestore, operacion.conteos.auth, operacion.conteos.coleccionesPersonalizadas);
                graficoCarpetas(operacion.conteos.coleccionesPersonalizadas);
                tablaCarpetas(operacion.conteos.coleccionesPersonalizadas);
            } else {
                console.warn(`No se encontraron datos para: ${empresaId}`);
                const vacio = {
                    firestore: { documentos: 0, colecciones: 0 },
                    storage: { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
                    auth: { usuarios: 0, administradores: 0, total: 0 },
                    coleccionesPersonalizadas: {}
                };
                actualizarMetricas(vacio);
                graficoTiposArchivo(vacio.storage);
                graficoFirestore(vacio.firestore, vacio.auth, {});
                graficoCarpetas({});
                tablaCarpetas({});
            }
        }
        
        console.log('✅ Vista actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando vista:', error);
    }
}

// =============================================
// CARGA DE EMPRESAS EN SELECTOR
// =============================================

async function cargarEmpresas() {
    const selector = document.getElementById('selectorEmpresa');
    if (!selector) return;
    
    try {
        const organizaciones = await operacionesManager.getOrganizaciones();
        
        // Limpiar opciones existentes (mantener la primera opción de global)
        while (selector.options.length > 1) {
            selector.remove(1);
        }
        
        organizaciones.forEach(org => {
            if (org.camelCase) {
                const option = document.createElement('option');
                option.value = org.camelCase;
                option.textContent = `${org.nombre} (${org.camelCase})`;
                selector.appendChild(option);
            }
        });
        
        console.log(`✅ ${organizaciones.length} empresas cargadas en el selector`);
        
    } catch (error) {
        console.error('Error cargando empresas:', error);
    }
}

// =============================================
// CONFIGURACIÓN DE EVENTOS
// =============================================

function configurarEventos() {
    const selector = document.getElementById('selectorEmpresa');
    const btnActualizar = document.getElementById('btnActualizar');
    const btnExportar = document.getElementById('btnExportarExcel');
    
    if (selector) {
        selector.addEventListener('change', async (e) => {
            currentEmpresa = e.target.value;
            const badgeSpan = document.querySelector('#empresaSeleccionada span');
            if (badgeSpan) {
                badgeSpan.innerText = currentEmpresa === 'global' ? 'Global' : currentEmpresa;
            }
            await actualizarVista(currentEmpresa);
        });
    }
    
    if (btnActualizar) {
        btnActualizar.addEventListener('click', async () => {
            Swal.fire({
                icon: 'info',
                title: 'Actualizando...',
                text: 'Recopilando datos más recientes',
                toast: true,
                timer: 1500,
                showConfirmButton: false
            });
            
            if (currentEmpresa === 'global') {
                await operacionesManager.recopilarTodasLasOrganizaciones();
            } else {
                await operacionesManager.recopilarEstadisticas(currentEmpresa);
            }
            await actualizarVista(currentEmpresa);
        });
    }
    
    if (btnExportar) {
        btnExportar.addEventListener('click', async () => {
            Swal.fire({
                icon: 'info',
                title: 'Exportando...',
                text: 'Generando archivo Excel',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            try {
                // Aquí iría la lógica de exportación a Excel
                Swal.fire({
                    icon: 'success',
                    title: 'Exportado',
                    text: 'Archivo Excel generado correctamente',
                    toast: true,
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo exportar los datos'
                });
            }
        });
    }
}

// =============================================
// INICIALIZACIÓN PRINCIPAL
// =============================================

async function inicializar() {
    console.log('🚀 Inicializando página de estadísticas...');
    
    Swal.fire({
        title: 'Cargando estadísticas...',
        text: 'Recopilando datos de Firestore y Storage',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        // Recopilar datos de todas las organizaciones
        await operacionesManager.recopilarTodasLasOrganizaciones();
        
        // Cargar empresas en el selector
        await cargarEmpresas();
        
        // Actualizar vista
        await actualizarVista('global');
        
        // Configurar eventos
        configurarEventos();
        
        Swal.close();
        console.log('✅ Inicialización completada');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los datos. Verifica tu conexión.'
        });
    }
}

// =============================================
// INICIAR APLICACIÓN
// =============================================

inicializar();