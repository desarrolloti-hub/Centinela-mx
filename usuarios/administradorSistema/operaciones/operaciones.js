// operaciones.js - CONTROLLER CON CARGA DIFERIDA Y ESTIMADO DE TIEMPO
// GRÁFICA DE DOCUMENTOS POR EMPRESA MEJORADA CON RESPONSIVE Y SOPORTE PARA ZOOM

import { operacionesManager } from '/clases/operacion.js';

let currentEmpresa = 'global';
let charts = {
    tipos: null,
    almacenamientoEmpresas: null,
    documentosEmpresas: null
};
let ultimaActualizacion = null;
let resizeTimeout = null;
let resizeObserver = null;
let lastWindowWidth = window.innerWidth;
let lastWindowHeight = window.innerHeight;

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

// Función para ajustar altura de gráfica de barras según cantidad de empresas y zoom
function ajustarAlturaGraficaBarras(empresasCount) {
    const canvas = document.getElementById('graficoDocumentosPorEmpresa');
    const container = canvas?.closest('.card-body');
    if (!canvas || !container) return;
    
    // Obtener altura disponible del contenedor
    const containerHeight = container.clientHeight;
    const zoomLevel = window.devicePixelRatio || 1;
    
    // Calcular altura basada en cantidad de empresas y zoom
    const baseHeight = 280;
    const alturaPorEmpresa = 36;
    let alturaCalculada = Math.max(baseHeight, Math.min(600, empresasCount * alturaPorEmpresa));
    
    // Ajustar por zoom (cuando hay zoom out, la altura debe ser mayor proporcionalmente)
    if (zoomLevel < 1) {
        alturaCalculada = alturaCalculada / zoomLevel;
    }
    
    // Limitar altura máxima
    alturaCalculada = Math.min(alturaCalculada, 550);
    
    canvas.style.height = `${alturaCalculada}px`;
    canvas.style.minHeight = `${Math.min(alturaCalculada, 300)}px`;
    
    // Si la gráfica ya existe, redimensionar
    if (charts.documentosEmpresas) {
        setTimeout(() => {
            charts.documentosEmpresas.resize();
            charts.documentosEmpresas.update('none');
        }, 50);
    }
}

// Función para redimensionar gráficas cuando cambia el tamaño de pantalla o zoom
function resizeCharts() {
    if (!charts) return;
    
    try {
        if (charts.tipos && charts.tipos.resize) {
            charts.tipos.resize();
            charts.tipos.update('none');
        }
        if (charts.almacenamientoEmpresas && charts.almacenamientoEmpresas.resize) {
            charts.almacenamientoEmpresas.resize();
            charts.almacenamientoEmpresas.update('none');
        }
        if (charts.documentosEmpresas && charts.documentosEmpresas.resize) {
            charts.documentosEmpresas.resize();
            charts.documentosEmpresas.update('none');
            
            // Reajustar altura si es necesario
            if (charts.documentosEmpresas.data && charts.documentosEmpresas.data.labels) {
                ajustarAlturaGraficaBarras(charts.documentosEmpresas.data.labels.length);
            }
        }
    } catch (error) {
        console.warn('Error redimensionando gráficas:', error);
    }
}

// Función para detectar cambios de zoom (usando resize con detección de cambios significativos)
function checkZoomChange() {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    
    // Si hubo un cambio significativo en tamaño (incluye zoom)
    if (Math.abs(currentWidth - lastWindowWidth) > 10 || 
        Math.abs(currentHeight - lastWindowHeight) > 10) {
        
        lastWindowWidth = currentWidth;
        lastWindowHeight = currentHeight;
        
        // Forzar redimensionamiento
        setTimeout(() => {
            resizeCharts();
            
            // Recrear gráficas si es necesario para asegurar proporciones correctas
            if (charts.documentosEmpresas && charts.documentosEmpresas.data) {
                const empresas = charts.documentosEmpresas.data.labels;
                const documentos = charts.documentosEmpresas.data.datasets[0].data;
                
                // Recrear con nuevas dimensiones
                const canvas = document.getElementById('graficoDocumentosPorEmpresa');
                if (canvas && empresas.length > 0) {
                    const ctx = canvas.getContext('2d');
                    charts.documentosEmpresas.destroy();
                    
                    const usarHorizontal = window.innerWidth >= 768;
                    const fontSize = window.innerWidth <= 480 ? 9 : (window.innerWidth <= 768 ? 10 : 11);
                    
                    charts.documentosEmpresas = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: empresas,
                            datasets: [{
                                label: 'Documentos',
                                data: documentos,
                                backgroundColor: '#00cfff',
                                borderRadius: 6,
                                barPercentage: usarHorizontal ? 0.7 : 0.8,
                                categoryPercentage: usarHorizontal ? 0.8 : 0.9
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            indexAxis: usarHorizontal ? 'y' : 'x',
                            plugins: { 
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return `${formatNumber(context.raw)} documentos`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: { 
                                    beginAtZero: true, 
                                    ticks: { 
                                        color: '#ffffff',
                                        font: { size: fontSize },
                                        callback: function(value) {
                                            return formatNumber(value);
                                        }
                                    },
                                    grid: { color: 'rgba(255,255,255,0.1)' },
                                    title: {
                                        display: true,
                                        text: 'Cantidad de Documentos',
                                        color: '#ffffff',
                                        font: { size: fontSize - 1, weight: 'normal' }
                                    }
                                },
                                y: { 
                                    ticks: { 
                                        color: '#ffffff', 
                                        font: { size: fontSize },
                                        callback: function(value, index) {
                                            let label = empresas[index] || value;
                                            const maxLength = window.innerWidth <= 480 ? 12 : (window.innerWidth <= 768 ? 18 : 22);
                                            if (label.length > maxLength) {
                                                return label.substring(0, maxLength - 3) + '...';
                                            }
                                            return label;
                                        }
                                    },
                                    grid: { display: false }
                                }
                            },
                            layout: {
                                padding: {
                                    left: window.innerWidth <= 480 ? 5 : 10,
                                    right: window.innerWidth <= 480 ? 5 : 10,
                                    top: 10,
                                    bottom: 10
                                }
                            }
                        }
                    });
                    
                    ajustarAlturaGraficaBarras(empresas.length);
                }
            }
        }, 100);
    }
}

// Escuchar cambios de tamaño de pantalla con debounce mejorado
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        checkZoomChange();
    }, 150);
});

// Usar ResizeObserver para detectar cambios en el contenedor
if (typeof ResizeObserver !== 'undefined') {
    const chartContainers = document.querySelectorAll('.card-body');
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCharts();
        }, 100);
    });
    
    chartContainers.forEach(container => {
        observer.observe(container);
    });
}

// Detectar cambios de zoom (también con wheel + ctrl)
let zoomTimeout;
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
            checkZoomChange();
        }, 200);
    }
});

// =============================================
// ACTUALIZACIÓN DE MÉTRICAS EN EL DOM
// =============================================

function actualizarMetricas(conteos) {
    if (!conteos) return;
    
    const firestore = conteos.firestore;
    const storage = conteos.storage;
    const auth = conteos.auth;
    
    document.getElementById('metricDocumentos').innerText = formatNumber(firestore.documentos || 0);
    document.getElementById('metricAdministradores').innerText = formatNumber(auth.administradores || 0);
    document.getElementById('metricColaboradores').innerText = formatNumber(auth.usuarios || 0);
    document.getElementById('metricTotalUsuarios').innerText = formatNumber((auth.usuarios || 0) + (auth.administradores || 0));
    
    document.getElementById('metricArchivosTotales').innerText = formatNumber(storage.total || 0);
    document.getElementById('metricTamanioTotal').innerHTML = `<i class="fas fa-hdd"></i> ${formatBytes(storage.totalSize || 0)}`;
    document.getElementById('metricPDF').innerText = formatNumber(storage.pdf || 0);
    document.getElementById('metricImagenes').innerText = formatNumber(storage.imagenes || 0);
    document.getElementById('metricDocumentosStorage').innerText = formatNumber(storage.documentos || 0);
    document.getElementById('metricMultimedia').innerText = formatNumber(storage.multimedia || 0);
    
    const total = storage.total || 1;
    document.getElementById('metricPDFPorcentaje').innerText = `${Math.round(((storage.pdf || 0) / total) * 100)}%`;
    document.getElementById('metricImagenesPorcentaje').innerText = `${Math.round(((storage.imagenes || 0) / total) * 100)}%`;
    document.getElementById('metricDocumentosPorcentaje').innerText = `${Math.round(((storage.documentos || 0) / total) * 100)}%`;
    document.getElementById('metricMultimediaPorcentaje').innerText = `${Math.round(((storage.multimedia || 0) / total) * 100)}%`;
}

// =============================================
// GRÁFICAS
// =============================================

function graficoTiposArchivo(storage) {
    const canvas = document.getElementById('graficoTiposArchivo');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.tipos) charts.tipos.destroy();
    
    // Ajustar tamaño de fuente según pantalla y zoom
    const fontSize = window.innerWidth <= 480 ? 9 : (window.innerWidth <= 768 ? 10 : 11);
    const boxSize = window.innerWidth <= 480 ? 8 : (window.innerWidth <= 768 ? 10 : 12);
    
    charts.tipos = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['PDF', 'Imágenes', 'Documentos', 'Multimedia', 'Otros'],
            datasets: [{
                data: [storage.pdf || 0, storage.imagenes || 0, storage.documentos || 0, storage.multimedia || 0, storage.otros || 0],
                backgroundColor: ['#ef4444', '#8b5cf6', '#10b981', '#f59e0b', '#6c757d'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#ffffff',
                        font: { size: fontSize },
                        boxWidth: boxSize,
                        padding: window.innerWidth <= 480 ? 6 : 8
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${formatNumber(value)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
    
    setTimeout(() => {
        if (charts.tipos) charts.tipos.resize();
    }, 100);
}

function graficoAlmacenamientoPorEmpresa(datosEmpresas) {
    const canvas = document.getElementById('graficoAlmacenamientoPorEmpresa');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.almacenamientoEmpresas) charts.almacenamientoEmpresas.destroy();
    
    const empresas = datosEmpresas.map(e => e.nombre);
    const tamanios = datosEmpresas.map(e => e.totalSize);
    
    // Limitar a 8 empresas para no saturar el pie
    const maxEmpresas = window.innerWidth <= 480 ? 5 : (window.innerWidth <= 768 ? 6 : 8);
    const mostrarEmpresas = empresas.slice(0, maxEmpresas);
    const mostrarTamanios = tamanios.slice(0, maxEmpresas);
    
    const fontSize = window.innerWidth <= 480 ? 9 : (window.innerWidth <= 768 ? 10 : 11);
    const boxSize = window.innerWidth <= 480 ? 8 : (window.innerWidth <= 768 ? 10 : 12);
    
    if (mostrarEmpresas.length === 0) {
        charts.almacenamientoEmpresas = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['No hay datos'],
                datasets: [{ data: [1], backgroundColor: ['#6c757d'] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { labels: { color: '#ffffff', font: { size: fontSize } } } }
            }
        });
        return;
    }
    
    charts.almacenamientoEmpresas = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: mostrarEmpresas,
            datasets: [{
                data: mostrarTamanios,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#14b8a6', '#f97316'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#ffffff',
                        font: { size: fontSize },
                        boxWidth: boxSize,
                        padding: window.innerWidth <= 480 ? 5 : 8
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${formatBytes(value)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
    
    setTimeout(() => {
        if (charts.almacenamientoEmpresas) charts.almacenamientoEmpresas.resize();
    }, 100);
}

/**
 * GRÁFICA DE DOCUMENTOS POR EMPRESA - VERSIÓN MEJORADA CON RESPONSIVE Y ZOOM
 */
function graficoDocumentosPorEmpresa(datosEmpresas) {
    const canvas = document.getElementById('graficoDocumentosPorEmpresa');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.documentosEmpresas) charts.documentosEmpresas.destroy();
    
    // Ordenar por documentos (mayor a menor)
    const datosOrdenados = [...datosEmpresas].sort((a, b) => b.documentos - a.documentos);
    
    // Limitar a máximo 15 empresas para no saturar la gráfica
    const datosMostrar = datosOrdenados.slice(0, 15);
    const empresas = datosMostrar.map(e => e.nombre);
    const documentos = datosMostrar.map(e => e.documentos);
    
    // Ajustar altura según cantidad de empresas
    ajustarAlturaGraficaBarras(empresas.length);
    
    if (empresas.length === 0) {
        charts.documentosEmpresas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No hay datos'],
                datasets: [{ label: 'Documentos', data: [0], backgroundColor: '#00cfff' }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { color: '#ffffff' } },
                    y: { ticks: { color: '#ffffff' } }
                }
            }
        });
        return;
    }
    
    // Determinar si usar gráfica horizontal basado en el ancho de pantalla
    const usarHorizontal = window.innerWidth >= 768;
    const fontSize = window.innerWidth <= 480 ? 9 : (window.innerWidth <= 768 ? 10 : 11);
    
    charts.documentosEmpresas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: empresas,
            datasets: [{
                label: 'Documentos',
                data: documentos,
                backgroundColor: '#00cfff',
                borderRadius: 6,
                barPercentage: usarHorizontal ? 0.7 : 0.8,
                categoryPercentage: usarHorizontal ? 0.8 : 0.9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: usarHorizontal ? 'y' : 'x',
            plugins: { 
                legend: { 
                    display: false 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${formatNumber(context.raw)} documentos`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    beginAtZero: true, 
                    ticks: { 
                        color: '#ffffff',
                        font: { size: fontSize },
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    },
                    grid: { 
                        color: 'rgba(255,255,255,0.1)' 
                    },
                    title: {
                        display: true,
                        text: 'Cantidad de Documentos',
                        color: '#ffffff',
                        font: { size: fontSize - 1, weight: 'normal' }
                    }
                },
                y: { 
                    ticks: { 
                        color: '#ffffff', 
                        font: { size: fontSize },
                        callback: function(value, index) {
                            let label = empresas[index] || value;
                            const maxLength = window.innerWidth <= 480 ? 12 : (window.innerWidth <= 768 ? 18 : 22);
                            if (label.length > maxLength) {
                                return label.substring(0, maxLength - 3) + '...';
                            }
                            return label;
                        }
                    },
                    grid: { 
                        display: false 
                    }
                }
            },
            layout: {
                padding: {
                    left: window.innerWidth <= 480 ? 5 : 10,
                    right: window.innerWidth <= 480 ? 5 : 10,
                    top: 10,
                    bottom: 10
                }
            }
        }
    });
    
    setTimeout(() => {
        if (charts.documentosEmpresas) {
            charts.documentosEmpresas.resize();
            charts.documentosEmpresas.update('none');
        }
    }, 100);
}

// =============================================
// TABLAS
// =============================================

async function tablaOrganizaciones() {
    const tbody = document.getElementById('tablaOrganizacionesBody');
    if (!tbody) return;
    
    tbody.innerHTML = '发展<td colspan="7" style="text-align:center;"><div class="loading-spinner"></div> Cargando...发展</tr>';
    
    try {
        const organizaciones = await operacionesManager.getOrganizaciones();
        
        if (organizaciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay organizaciones registradas</td></tr>';
            return;
        }
        
        const statsPromises = organizaciones.map(async org => {
            const op = await operacionesManager.getOperaciones(org.camelCase);
            return {
                id: org.camelCase,
                nombre: org.nombre,
                documentos: op?.conteos?.firestore?.documentos || 0,
                archivos: op?.conteos?.storage?.total || 0,
                totalSize: op?.conteos?.storage?.totalSize || 0,
                administradores: op?.conteos?.auth?.administradores || 0,
                colaboradores: op?.conteos?.auth?.usuarios || 0
            };
        });
        
        const resultados = await Promise.all(statsPromises);
        const ordenados = resultados.sort((a, b) => b.documentos - a.documentos);
        
        tbody.innerHTML = ordenados.map(emp => `
            <tr>
                <td><strong>${emp.nombre}</strong><br><small style="color: #888;">${emp.id}</small></td>
                <td>${formatNumber(emp.documentos)}</td>
                <td>${formatNumber(emp.archivos)}</td>
                <td><span class="size-badge">${formatBytes(emp.totalSize)}</span></td>
                <td>${formatNumber(emp.administradores)}</td>
                <td>${formatNumber(emp.colaboradores)}</td>
                <td>${formatNumber(emp.administradores + emp.colaboradores)}</td>
            </tr>
        `).join('');
        
        return ordenados;
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Error al cargar datos</td></tr>';
        return [];
    }
}

// =============================================
// CARGA DE DATOS GUARDADOS
// =============================================

async function cargarDatosGuardados() {
    console.log('📀 Cargando datos guardados...');
    
    try {
        const organizaciones = await operacionesManager.getOrganizaciones();
        
        if (organizaciones.length === 0) return false;
        
        const statsPromises = organizaciones.map(async org => {
            const op = await operacionesManager.getOperaciones(org.camelCase);
            return {
                id: org.camelCase,
                nombre: org.nombre,
                documentos: op?.conteos?.firestore?.documentos || 0,
                archivos: op?.conteos?.storage?.total || 0,
                totalSize: op?.conteos?.storage?.totalSize || 0,
                administradores: op?.conteos?.auth?.administradores || 0,
                colaboradores: op?.conteos?.auth?.usuarios || 0,
                storage: op?.conteos?.storage || { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
                firestore: op?.conteos?.firestore || { documentos: 0 },
                auth: op?.conteos?.auth || { usuarios: 0, administradores: 0 }
            };
        });
        
        const resultados = await Promise.all(statsPromises);
        
        const tieneDatos = resultados.some(r => r.documentos > 0 || r.archivos > 0);
        
        if (!tieneDatos) {
            console.log('📀 No hay datos guardados previamente');
            return false;
        }
        
        // Cargar vista global con datos guardados
        const globalConteos = {
            firestore: { documentos: 0 },
            storage: { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
            auth: { usuarios: 0, administradores: 0 }
        };
        
        resultados.forEach(r => {
            globalConteos.firestore.documentos += r.documentos;
            globalConteos.storage.total += r.archivos;
            globalConteos.storage.totalSize += r.totalSize;
            globalConteos.storage.pdf += r.storage.pdf || 0;
            globalConteos.storage.imagenes += r.storage.imagenes || 0;
            globalConteos.storage.documentos += r.storage.documentos || 0;
            globalConteos.storage.multimedia += r.storage.multimedia || 0;
            globalConteos.storage.otros += r.storage.otros || 0;
            globalConteos.auth.usuarios += r.colaboradores;
            globalConteos.auth.administradores += r.administradores;
        });
        
        actualizarMetricas(globalConteos);
        graficoTiposArchivo(globalConteos.storage);
        
        const datosGraficas = resultados.map(r => ({
            nombre: r.nombre,
            documentos: r.documentos,
            totalSize: r.totalSize
        })).sort((a, b) => b.totalSize - a.totalSize);
        
        graficoAlmacenamientoPorEmpresa(datosGraficas);
        graficoDocumentosPorEmpresa(datosGraficas);
        
        await tablaOrganizaciones();
        
        // Buscar la fecha de la última actualización
        const fechas = [];
        for (const org of organizaciones) {
            const op = await operacionesManager.getOperaciones(org.camelCase);
            if (op?.fechaActualizacion) {
                fechas.push(new Date(op.fechaActualizacion));
            }
        }
        
        if (fechas.length > 0) {
            const fechaMasReciente = new Date(Math.max(...fechas));
            ultimaActualizacion = fechaMasReciente;
            document.getElementById('fechaActualizacion').innerText = fechaMasReciente.toLocaleString();
        }
        
        console.log('📀 Datos guardados cargados correctamente');
        return true;
        
    } catch (error) {
        console.error('Error cargando datos guardados:', error);
        return false;
    }
}

// =============================================
// ACTUALIZACIÓN DE DATOS REALES
// =============================================

async function actualizarDatosReales(mostrarProgress = true) {
    console.log('🔄 Actualizando datos reales...');
    
    let progressInterval;
    let startTime = Date.now();
    let estimatedTime = 0;
    
    if (mostrarProgress) {
        Swal.fire({
            title: 'Actualizando estadísticas',
            html: `
                <div style="text-align: center;">
                    <div class="loading-spinner" style="margin: 20px auto;"></div>
                    <p id="progressText" style="margin-top: 15px;">Recopilando datos de Firestore y Storage...</p>
                    <p id="progressTime" style="font-size: 12px; color: #888;">Estimado: calculando...</p>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                let elapsed = 0;
                progressInterval = setInterval(() => {
                    elapsed = Math.floor((Date.now() - startTime) / 1000);
                    const progressText = document.getElementById('progressText');
                    const progressTime = document.getElementById('progressTime');
                    
                    if (progressText) {
                        if (elapsed < 5) {
                            progressText.innerHTML = '📡 Conectando con Firebase...';
                            estimatedTime = 10;
                        } else if (elapsed < 10) {
                            progressText.innerHTML = '📁 Contando documentos en Firestore...';
                            estimatedTime = 15;
                        } else if (elapsed < 15) {
                            progressText.innerHTML = '💾 Escaneando archivos en Storage...';
                            estimatedTime = 20;
                        } else if (elapsed < 25) {
                            progressText.innerHTML = '📊 Procesando datos y generando estadísticas...';
                            estimatedTime = 30;
                        } else {
                            progressText.innerHTML = '⏳ Casi listo, finalizando...';
                            estimatedTime = Math.max(5, 40 - elapsed);
                        }
                        
                        const remaining = Math.max(0, estimatedTime - elapsed);
                        if (progressTime) {
                            progressTime.innerHTML = `⏱️ Tiempo transcurrido: ${elapsed}s | Estimado restante: ~${remaining}s`;
                        }
                    }
                }, 1000);
            }
        });
    }
    
    try {
        await operacionesManager.recopilarTodasLasOrganizaciones();
        await actualizarVista(currentEmpresa);
        
        ultimaActualizacion = new Date();
        document.getElementById('fechaActualizacion').innerText = ultimaActualizacion.toLocaleString();
        
        if (progressInterval) clearInterval(progressInterval);
        
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        
        if (mostrarProgress) {
            Swal.fire({
                icon: 'success',
                title: 'Actualización completada',
                html: `Datos actualizados correctamente.<br>⏱️ Tiempo total: ${totalTime} segundos`,
                timer: 3000,
                showConfirmButton: true
            });
        }
        
        console.log(`✅ Actualización completada en ${totalTime} segundos`);
        return true;
        
    } catch (error) {
        console.error('❌ Error actualizando datos:', error);
        
        if (progressInterval) clearInterval(progressInterval);
        
        if (mostrarProgress) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron actualizar los datos. Verifica tu conexión.'
            });
        }
        
        return false;
    }
}

// =============================================
// ACTUALIZACIÓN DE VISTA
// =============================================

async function actualizarVista(empresaId = 'global') {
    console.log(`🔄 Actualizando vista para: ${empresaId}`);
    
    try {
        const organizaciones = await operacionesManager.getOrganizaciones();
        
        if (organizaciones.length === 0) return;
        
        const statsPromises = organizaciones.map(async org => {
            const op = await operacionesManager.getOperaciones(org.camelCase);
            return {
                id: org.camelCase,
                nombre: org.nombre,
                documentos: op?.conteos?.firestore?.documentos || 0,
                archivos: op?.conteos?.storage?.total || 0,
                totalSize: op?.conteos?.storage?.totalSize || 0,
                administradores: op?.conteos?.auth?.administradores || 0,
                colaboradores: op?.conteos?.auth?.usuarios || 0,
                storage: op?.conteos?.storage || { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
                firestore: op?.conteos?.firestore || { documentos: 0 },
                auth: op?.conteos?.auth || { usuarios: 0, administradores: 0 }
            };
        });
        
        const resultados = await Promise.all(statsPromises);
        
        if (empresaId === 'global') {
            document.getElementById('modoVisualizacion').innerHTML = '<i class="fas fa-globe"></i> Vista: Global';
            
            const globalConteos = {
                firestore: { documentos: 0 },
                storage: { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
                auth: { usuarios: 0, administradores: 0 }
            };
            
            resultados.forEach(r => {
                globalConteos.firestore.documentos += r.documentos;
                globalConteos.storage.total += r.archivos;
                globalConteos.storage.totalSize += r.totalSize;
                globalConteos.storage.pdf += r.storage.pdf || 0;
                globalConteos.storage.imagenes += r.storage.imagenes || 0;
                globalConteos.storage.documentos += r.storage.documentos || 0;
                globalConteos.storage.multimedia += r.storage.multimedia || 0;
                globalConteos.storage.otros += r.storage.otros || 0;
                globalConteos.auth.usuarios += r.colaboradores;
                globalConteos.auth.administradores += r.administradores;
            });
            
            actualizarMetricas(globalConteos);
            graficoTiposArchivo(globalConteos.storage);
            
        } else {
            const empresaData = resultados.find(r => r.id === empresaId);
            if (empresaData) {
                document.getElementById('modoVisualizacion').innerHTML = `<i class="fas fa-building"></i> Vista: ${empresaData.nombre}`;
                const empresaConteos = {
                    firestore: { documentos: empresaData.documentos },
                    storage: empresaData.storage,
                    auth: { usuarios: empresaData.colaboradores, administradores: empresaData.administradores }
                };
                actualizarMetricas(empresaConteos);
                graficoTiposArchivo(empresaData.storage);
            }
        }
        
        const datosGraficas = resultados.map(r => ({
            nombre: r.nombre,
            documentos: r.documentos,
            totalSize: r.totalSize
        })).sort((a, b) => b.totalSize - a.totalSize);
        
        graficoAlmacenamientoPorEmpresa(datosGraficas);
        graficoDocumentosPorEmpresa(datosGraficas);
        
        await tablaOrganizaciones();
        
        console.log('✅ Vista actualizada');
        
    } catch (error) {
        console.error('❌ Error:', error);
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
        
        while (selector.options.length > 1) selector.remove(1);
        
        organizaciones.forEach(org => {
            if (org.camelCase) {
                const option = document.createElement('option');
                option.value = org.camelCase;
                option.textContent = org.nombre;
                selector.appendChild(option);
            }
        });
        
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
            await actualizarVista(currentEmpresa);
        });
    }
    
    if (btnActualizar) {
        btnActualizar.addEventListener('click', async () => {
            await actualizarDatosReales(true);
        });
    }
    
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            Swal.fire({ icon: 'info', title: 'Exportar', text: 'Función en desarrollo' });
        });
    }
}

// =============================================
// INICIALIZACIÓN PRINCIPAL
// =============================================

async function inicializar() {
    console.log('🚀 Inicializando página...');
    
    const tieneDatosGuardados = await cargarDatosGuardados();
    
    if (tieneDatosGuardados) {
        console.log('📀 Mostrando datos guardados de la última actualización');
        Swal.fire({
            icon: 'info',
            title: 'Datos cargados',
            html: `Mostrando datos de la última actualización.<br>Presiona "Actualizar" para obtener datos recientes.`,
            toast: true,
            timer: 3000,
            showConfirmButton: false
        });
    } else {
        console.log('📀 No hay datos guardados, será necesario actualizar');
        Swal.fire({
            icon: 'warning',
            title: 'Sin datos previos',
            html: `No hay estadísticas guardadas. Presiona "Actualizar" para generar los datos.`,
            toast: true,
            timer: 3000,
            showConfirmButton: false
        });
    }
    
    await cargarEmpresas();
    configurarEventos();
    
    if (ultimaActualizacion) {
        document.getElementById('fechaActualizacion').innerText = ultimaActualizacion.toLocaleString();
    } else {
        document.getElementById('fechaActualizacion').innerText = 'No actualizado';
    }
    
    console.log('✅ Inicialización completada');
}

// =============================================
// INICIAR APLICACIÓN
// =============================================

inicializar();