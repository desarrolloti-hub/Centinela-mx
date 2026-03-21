// operaciones.js - VERSIÓN CON FILTROS MEJORADOS Y SECCIONES OCULTABLES

import { operacionesManager } from '/clases/operacion.js';

let currentEmpresa = 'global';
let charts = {
    tipos: null,
    almacenamientoEmpresas: null,
    documentosEmpresas: null
};
let datosOriginales = [];
let ultimaActualizacion = null;

// Estado de filtros
let filtroActivo = {
    tipo: '',
    fechaInicio: null,
    fechaFin: null,
    texto: ''
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

function parseFecha(fecha) {
    if (!fecha) return null;
    if (fecha && typeof fecha.toDate === 'function') {
        return fecha.toDate();
    }
    if (typeof fecha === 'string') {
        return new Date(fecha);
    }
    if (fecha instanceof Date) {
        return fecha;
    }
    return null;
}

// =============================================
// FUNCIONES DE VISUALIZACIÓN DE SECCIONES
// =============================================

function mostrarSinDatos(mensaje = 'No hay datos disponibles para el período seleccionado') {
    const contenido = document.getElementById('contenidoPrincipal');
    const sinDatos = document.getElementById('sinDatosMensaje');
    const textoElement = document.getElementById('sinDatosTexto');
    
    if (contenido) contenido.style.display = 'none';
    if (sinDatos) {
        sinDatos.style.display = 'flex';
        if (textoElement) textoElement.innerHTML = mensaje;
    }
}

function mostrarContenido() {
    const contenido = document.getElementById('contenidoPrincipal');
    const sinDatos = document.getElementById('sinDatosMensaje');
    
    if (contenido) contenido.style.display = 'block';
    if (sinDatos) sinDatos.style.display = 'none';
}

function ocultarSeccionesSinDatos(datos) {
    const seccionMetricas = document.getElementById('seccionMetricas');
    const seccionStorage = document.getElementById('seccionStorage');
    const seccionGraficas = document.getElementById('seccionGraficas');
    const seccionTabla = document.getElementById('seccionTabla');
    
    if (!datos || datos.length === 0) {
        if (seccionMetricas) seccionMetricas.style.display = 'none';
        if (seccionStorage) seccionStorage.style.display = 'none';
        if (seccionGraficas) seccionGraficas.style.display = 'none';
        if (seccionTabla) seccionTabla.style.display = 'none';
        return;
    }
    
    // Verificar si hay métricas con datos
    const tieneMetricas = datos.some(d => d.documentos > 0 || d.archivos > 0);
    const tieneStorage = datos.some(d => (d.storage?.total || 0) > 0);
    const tieneGraficas = datos.some(d => d.documentos > 0 || d.archivos > 0);
    const tieneTabla = datos.length > 0;
    
    if (seccionMetricas) seccionMetricas.style.display = tieneMetricas ? 'block' : 'none';
    if (seccionStorage) seccionStorage.style.display = tieneStorage ? 'block' : 'none';
    if (seccionGraficas) seccionGraficas.style.display = tieneGraficas ? 'block' : 'none';
    if (seccionTabla) seccionTabla.style.display = tieneTabla ? 'block' : 'none';
}

function actualizarBadgeFiltro() {
    const badges = ['badgeFiltro1', 'badgeFiltro2', 'badgeFiltro3'];
    badges.forEach(id => {
        const badge = document.getElementById(id);
        if (badge) {
            if (filtroActivo.texto) {
                badge.innerHTML = `<i class="fas fa-calendar-alt"></i> ${filtroActivo.texto}`;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

// =============================================
// ACTUALIZACIÓN DE MÉTRICAS EN EL DOM
// =============================================

function actualizarMetricas(conteos) {
    if (!conteos) return;
    
    const firestore = conteos.firestore;
    const storage = conteos.storage;
    const auth = conteos.auth;
    
    const docElement = document.getElementById('metricDocumentos');
    if (docElement) docElement.innerText = formatNumber(firestore.documentos || 0);
    
    const adminElement = document.getElementById('metricAdministradores');
    if (adminElement) adminElement.innerText = formatNumber(auth.administradores || 0);
    
    const colabElement = document.getElementById('metricColaboradores');
    if (colabElement) colabElement.innerText = formatNumber(auth.usuarios || 0);
    
    const totalUserElement = document.getElementById('metricTotalUsuarios');
    if (totalUserElement) totalUserElement.innerText = formatNumber((auth.usuarios || 0) + (auth.administradores || 0));
    
    const archivosElement = document.getElementById('metricArchivosTotales');
    if (archivosElement) archivosElement.innerText = formatNumber(storage.total || 0);
    
    const tamanioElement = document.getElementById('metricTamanioTotal');
    if (tamanioElement) tamanioElement.innerHTML = `<i class="fas fa-hdd"></i> ${formatBytes(storage.totalSize || 0)}`;
    
    const pdfElement = document.getElementById('metricPDF');
    if (pdfElement) pdfElement.innerText = formatNumber(storage.pdf || 0);
    
    const imagenesElement = document.getElementById('metricImagenes');
    if (imagenesElement) imagenesElement.innerText = formatNumber(storage.imagenes || 0);
    
    const documentosElement = document.getElementById('metricDocumentosStorage');
    if (documentosElement) documentosElement.innerText = formatNumber(storage.documentos || 0);
    
    const multimediaElement = document.getElementById('metricMultimedia');
    if (multimediaElement) multimediaElement.innerText = formatNumber(storage.multimedia || 0);
    
    const total = storage.total || 1;
    const pdfPctElement = document.getElementById('metricPDFPorcentaje');
    if (pdfPctElement) pdfPctElement.innerText = `${Math.round(((storage.pdf || 0) / total) * 100)}%`;
    
    const imgPctElement = document.getElementById('metricImagenesPorcentaje');
    if (imgPctElement) imgPctElement.innerText = `${Math.round(((storage.imagenes || 0) / total) * 100)}%`;
    
    const docPctElement = document.getElementById('metricDocumentosPorcentaje');
    if (docPctElement) docPctElement.innerText = `${Math.round(((storage.documentos || 0) / total) * 100)}%`;
    
    const multiPctElement = document.getElementById('metricMultimediaPorcentaje');
    if (multiPctElement) multiPctElement.innerText = `${Math.round(((storage.multimedia || 0) / total) * 100)}%`;
}

// =============================================
// GRÁFICAS
// =============================================

function graficoTiposArchivo(storage) {
    const canvas = document.getElementById('graficoTiposArchivo');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.tipos) charts.tipos.destroy();
    
    const tieneDatos = (storage.pdf || 0) + (storage.imagenes || 0) + (storage.documentos || 0) + (storage.multimedia || 0) + (storage.otros || 0) > 0;
    
    if (!tieneDatos) {
        charts.tipos = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sin datos'],
                datasets: [{ data: [1], backgroundColor: ['#6c757d'] }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: { legend: { labels: { color: '#ffffff', font: { size: 10 } } } }
            }
        });
        return;
    }
    
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
            responsive: false,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#ffffff',
                        font: { size: 10 }
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
}

function graficoAlmacenamientoPorEmpresa(datosEmpresas) {
    const canvas = document.getElementById('graficoAlmacenamientoPorEmpresa');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.almacenamientoEmpresas) charts.almacenamientoEmpresas.destroy();
    
    const empresasMostrar = datosEmpresas.slice(0, 6);
    const empresas = empresasMostrar.map(e => e.nombre);
    const tamanios = empresasMostrar.map(e => e.totalSize);
    
    const tieneDatos = tamanios.some(t => t > 0);
    
    if (!tieneDatos || empresas.length === 0) {
        charts.almacenamientoEmpresas = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sin datos'],
                datasets: [{ data: [1], backgroundColor: ['#6c757d'] }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: { legend: { labels: { color: '#ffffff', font: { size: 10 } } } }
            }
        });
        return;
    }
    
    charts.almacenamientoEmpresas = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: empresas,
            datasets: [{
                data: tamanios,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#ffffff',
                        font: { size: 10 }
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
}

function graficoDocumentosPorEmpresa(datosEmpresas) {
    const canvas = document.getElementById('graficoDocumentosPorEmpresa');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (charts.documentosEmpresas) charts.documentosEmpresas.destroy();
    
    const datosOrdenados = [...datosEmpresas].sort((a, b) => b.documentos - a.documentos);
    const datosMostrar = datosOrdenados.slice(0, 10);
    const empresas = datosMostrar.map(e => e.nombre);
    const documentos = datosMostrar.map(e => e.documentos);
    
    const tieneDatos = documentos.some(d => d > 0);
    
    if (!tieneDatos || empresas.length === 0) {
        charts.documentosEmpresas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Sin datos'],
                datasets: [{ label: 'Documentos', data: [0], backgroundColor: '#00cfff' }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#ffffff' } },
                    x: { ticks: { color: '#ffffff' } }
                }
            }
        });
        return;
    }
    
    charts.documentosEmpresas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: empresas,
            datasets: [{
                label: 'Documentos',
                data: documentos,
                backgroundColor: '#00cfff',
                borderRadius: 4,
                barPercentage: 0.8,
                categoryPercentage: 0.9
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: true,
            indexAxis: 'y',
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
                        font: { size: 9 },
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                            return value;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    title: {
                        display: true,
                        text: 'Cantidad de Documentos',
                        color: '#ffffff',
                        font: { size: 8 }
                    }
                },
                y: { 
                    ticks: { 
                        color: '#ffffff', 
                        font: { size: 9 },
                        callback: function(value, index) {
                            let label = empresas[index] || value;
                            if (label.length > 18) return label.substring(0, 15) + '...';
                            return label;
                        }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

// =============================================
// TABLA DE ORGANIZACIONES
// =============================================

function tablaOrganizaciones(datos) {
    const tbody = document.getElementById('tablaOrganizacionesBody');
    if (!tbody) return;
    
    if (!datos || datos.length === 0) {
        tbody.innerHTML = '发展<td colspan="7" style="text-align:center;">No hay datos disponibles</td></tr>';
        return;
    }
    
    const ordenados = [...datos].sort((a, b) => b.documentos - a.documentos);
    
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
}

// =============================================
// FUNCIONES DE FILTRADO
// =============================================

function calcularFechasPorPeriodo(tipo) {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    
    let fechaInicio = null;
    let texto = '';
    
    switch(tipo) {
        case 'semanal':
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(hoy.getDate() - 7);
            fechaInicio.setHours(0, 0, 0, 0);
            texto = 'Últimos 7 días';
            break;
        case 'quincenal':
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(hoy.getDate() - 15);
            fechaInicio.setHours(0, 0, 0, 0);
            texto = 'Últimos 15 días';
            break;
        case 'mensual':
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(hoy.getDate() - 30);
            fechaInicio.setHours(0, 0, 0, 0);
            texto = 'Últimos 30 días';
            break;
        default:
            return null;
    }
    
    return {
        fechaInicio: fechaInicio,
        fechaFin: hoy,
        texto: texto
    };
}

function filtrarDatosPorFecha(datos, fechaInicio, fechaFin) {
    if (!fechaInicio && !fechaFin) return datos;
    
    return datos.filter(item => {
        let fechaItem = null;
        
        if (item.fechaActualizacion) {
            fechaItem = parseFecha(item.fechaActualizacion);
        }
        
        if (!fechaItem) return true;
        
        if (fechaInicio && fechaItem < fechaInicio) return false;
        if (fechaFin && fechaItem > fechaFin) return false;
        
        return true;
    });
}

function actualizarVistaConDatos(datos, textoFiltro) {
    if (!datos || datos.length === 0) {
        mostrarSinDatos('No hay empresas actualizadas en el período seleccionado');
        ocultarSeccionesSinDatos([]);
        return;
    }
    
    let datosAMostrar = datos;
    if (currentEmpresa !== 'global') {
        datosAMostrar = datos.filter(d => d.id === currentEmpresa);
    }
    
    if (datosAMostrar.length === 0) {
        mostrarSinDatos('No hay datos para la empresa seleccionada en este período');
        ocultarSeccionesSinDatos([]);
        return;
    }
    
    mostrarContenido();
    
    // Calcular métricas globales con datos filtrados
    const globalConteos = {
        firestore: { documentos: 0 },
        storage: { total: 0, totalSize: 0, pdf: 0, imagenes: 0, documentos: 0, multimedia: 0, otros: 0 },
        auth: { usuarios: 0, administradores: 0 }
    };
    
    datosAMostrar.forEach(r => {
        globalConteos.firestore.documentos += r.documentos;
        globalConteos.storage.total += r.archivos;
        globalConteos.storage.totalSize += r.totalSize;
        globalConteos.storage.pdf += r.storage?.pdf || 0;
        globalConteos.storage.imagenes += r.storage?.imagenes || 0;
        globalConteos.storage.documentos += r.storage?.documentos || 0;
        globalConteos.storage.multimedia += r.storage?.multimedia || 0;
        globalConteos.storage.otros += r.storage?.otros || 0;
        globalConteos.auth.usuarios += r.colaboradores;
        globalConteos.auth.administradores += r.administradores;
    });
    
    actualizarMetricas(globalConteos);
    
    // Datos para gráficas
    const datosGraficas = datosAMostrar.map(r => ({
        nombre: r.nombre,
        documentos: r.documentos,
        totalSize: r.totalSize
    })).sort((a, b) => b.totalSize - a.totalSize);
    
    graficoTiposArchivo(globalConteos.storage);
    graficoAlmacenamientoPorEmpresa(datosGraficas);
    graficoDocumentosPorEmpresa(datosGraficas);
    tablaOrganizaciones(datosAMostrar);
    
    // Ocultar secciones si no tienen datos
    ocultarSeccionesSinDatos(datosAMostrar);
    
    // Actualizar badge
    filtroActivo.texto = textoFiltro;
    actualizarBadgeFiltro();
    
    console.log(`✅ Mostrando ${datosAMostrar.length} empresas - Período: ${textoFiltro || 'Todos'}`);
}

// =============================================
// FUNCIONES DE FILTRO
// =============================================

function aplicarFiltros() {
    const tipoFiltroSelect = document.getElementById('tipoFiltro');
    const tipo = tipoFiltroSelect?.value || '';
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    
    if (!tipo) {
        Swal.fire({
            icon: 'info',
            title: 'Selecciona un período',
            text: 'Por favor, selecciona un período para filtrar los datos.'
        });
        return;
    }
    
    if (tipo === 'personalizado') {
        const inicio = fechaInicioInput?.value;
        const fin = fechaFinInput?.value;
        
        if (!inicio || !fin) {
            Swal.fire({
                icon: 'warning',
                title: 'Fechas incompletas',
                text: 'Selecciona ambas fechas para el filtro personalizado.'
            });
            return;
        }
        
        const fechaInicio = new Date(inicio);
        fechaInicio.setHours(0, 0, 0, 0);
        
        const fechaFin = new Date(fin);
        fechaFin.setHours(23, 59, 59, 999);
        
        filtroActivo = {
            tipo: 'personalizado',
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            texto: `${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`
        };
        
    } else {
        const periodo = calcularFechasPorPeriodo(tipo);
        if (periodo) {
            filtroActivo = {
                tipo: tipo,
                fechaInicio: periodo.fechaInicio,
                fechaFin: periodo.fechaFin,
                texto: periodo.texto
            };
        }
    }
    
    const datosFiltrados = filtrarDatosPorFecha(datosOriginales, filtroActivo.fechaInicio, filtroActivo.fechaFin);
    
    if (datosFiltrados.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: `No hay empresas actualizadas en el período seleccionado: ${filtroActivo.texto}`
        });
        mostrarSinDatos(`No hay empresas actualizadas en ${filtroActivo.texto}`);
        ocultarSeccionesSinDatos([]);
        return;
    }
    
    actualizarVistaConDatos(datosFiltrados, filtroActivo.texto);
}

function limpiarFiltros() {
    filtroActivo = {
        tipo: '',
        fechaInicio: null,
        fechaFin: null,
        texto: ''
    };
    
    const tipoFiltroSelect = document.getElementById('tipoFiltro');
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    const rangoGrupo = document.getElementById('rangoFechasGrupo');
    
    if (tipoFiltroSelect) tipoFiltroSelect.value = '';
    if (fechaInicioInput) fechaInicioInput.value = '';
    if (fechaFinInput) fechaFinInput.value = '';
    if (rangoGrupo) rangoGrupo.style.display = 'none';
    
    if (datosOriginales.length > 0) {
        actualizarVistaConDatos(datosOriginales, '');
        Swal.fire({
            icon: 'success',
            title: 'Filtros limpiados',
            text: 'Mostrando todos los datos disponibles.',
            toast: true,
            timer: 2000,
            showConfirmButton: false
        });
    } else {
        mostrarSinDatos('No hay datos disponibles');
        ocultarSeccionesSinDatos([]);
    }
}

// =============================================
// CARGA DE DATOS ORIGINALES
// =============================================

async function cargarDatosOriginales() {
    console.log('📀 Cargando datos originales...');
    
    try {
        const organizaciones = await operacionesManager.getOrganizaciones();
        
        if (organizaciones.length === 0) {
            mostrarSinDatos('No hay organizaciones registradas');
            ocultarSeccionesSinDatos([]);
            return false;
        }
        
        const statsPromises = organizaciones.map(async org => {
            const op = await operacionesManager.getOperaciones(org.camelCase);
            
            let fechaActualizacion = null;
            if (op?.fechaActualizacion) {
                if (typeof op.fechaActualizacion.toDate === 'function') {
                    fechaActualizacion = op.fechaActualizacion.toDate();
                } else if (op.fechaActualizacion instanceof Date) {
                    fechaActualizacion = op.fechaActualizacion;
                } else if (typeof op.fechaActualizacion === 'string') {
                    fechaActualizacion = new Date(op.fechaActualizacion);
                }
            }
            
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
                auth: op?.conteos?.auth || { usuarios: 0, administradores: 0 },
                fechaActualizacion: fechaActualizacion,
                fechaStr: fechaActualizacion ? fechaActualizacion.toLocaleDateString() : 'Sin fecha'
            };
        });
        
        datosOriginales = await Promise.all(statsPromises);
        
        datosOriginales = datosOriginales.filter(d => d.documentos > 0 || d.archivos > 0);
        
        const tieneDatos = datosOriginales.length > 0;
        
        if (!tieneDatos) {
            mostrarSinDatos('No hay datos estadísticos disponibles');
            ocultarSeccionesSinDatos([]);
            return false;
        }
        
        const fechasValidas = datosOriginales
            .filter(d => d.fechaActualizacion)
            .map(d => d.fechaActualizacion);
        
        if (fechasValidas.length > 0) {
            const fechaMasReciente = new Date(Math.max(...fechasValidas));
            ultimaActualizacion = fechaMasReciente;
            const fechaElement = document.getElementById('fechaActualizacion');
            if (fechaElement) fechaElement.innerText = fechaMasReciente.toLocaleString();
        }
        
        console.log('📀 Datos originales cargados:', datosOriginales.length, 'empresas');
        
        return true;
        
    } catch (error) {
        console.error('Error cargando datos originales:', error);
        mostrarSinDatos('Error al cargar los datos');
        ocultarSeccionesSinDatos([]);
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
    
    if (mostrarProgress) {
        Swal.fire({
            title: 'Actualizando estadísticas',
            html: `
                <div style="text-align: center;">
                    <div class="loading-spinner" style="margin: 20px auto;"></div>
                    <p id="progressText" style="margin-top: 15px;">Recopilando datos de Firestore y Storage...</p>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                let elapsed = 0;
                progressInterval = setInterval(() => {
                    elapsed = Math.floor((Date.now() - startTime) / 1000);
                    const progressText = document.getElementById('progressText');
                    if (progressText) {
                        if (elapsed < 5) progressText.innerHTML = '📡 Conectando con Firebase...';
                        else if (elapsed < 10) progressText.innerHTML = '📁 Contando documentos en Firestore...';
                        else if (elapsed < 15) progressText.innerHTML = '💾 Escaneando archivos en Storage...';
                        else progressText.innerHTML = '📊 Procesando datos y generando estadísticas...';
                    }
                }, 1000);
            }
        });
    }
    
    try {
        await operacionesManager.recopilarTodasLasOrganizaciones();
        await cargarDatosOriginales();
        
        if (filtroActivo.fechaInicio && filtroActivo.fechaFin) {
            const datosFiltrados = filtrarDatosPorFecha(datosOriginales, filtroActivo.fechaInicio, filtroActivo.fechaFin);
            if (datosFiltrados.length > 0) {
                actualizarVistaConDatos(datosFiltrados, filtroActivo.texto);
            } else {
                mostrarSinDatos('Los datos actualizados no contienen información en el período seleccionado');
                ocultarSeccionesSinDatos([]);
            }
        } else {
            if (datosOriginales.length > 0) {
                actualizarVistaConDatos(datosOriginales, '');
            } else {
                mostrarSinDatos('No hay datos disponibles después de la actualización');
                ocultarSeccionesSinDatos([]);
            }
        }
        
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
    const btnAplicar = document.getElementById('btnAplicarFiltros');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const tipoFiltro = document.getElementById('tipoFiltro');
    const rangoGrupo = document.getElementById('rangoFechasGrupo');
    
    if (selector) {
        selector.addEventListener('change', async (e) => {
            currentEmpresa = e.target.value;
            const optionText = selector.options[selector.selectedIndex]?.text || currentEmpresa;
            document.getElementById('modoVisualizacion').innerHTML = currentEmpresa === 'global' 
                ? '<i class="fas fa-globe"></i> Vista: Global'
                : `<i class="fas fa-building"></i> Vista: ${optionText}`;
            
            if (filtroActivo.fechaInicio && filtroActivo.fechaFin) {
                const datosFiltrados = filtrarDatosPorFecha(datosOriginales, filtroActivo.fechaInicio, filtroActivo.fechaFin);
                actualizarVistaConDatos(datosFiltrados, filtroActivo.texto);
            } else if (datosOriginales.length > 0) {
                actualizarVistaConDatos(datosOriginales, '');
            }
        });
    }
    
    if (tipoFiltro) {
        tipoFiltro.addEventListener('change', () => {
            const valor = tipoFiltro.value;
            if (rangoGrupo) {
                rangoGrupo.style.display = valor === 'personalizado' ? 'block' : 'none';
            }
        });
    }
    
    if (btnAplicar) {
        btnAplicar.addEventListener('click', aplicarFiltros);
    }
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
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
    
    mostrarSinDatos('Selecciona un período y presiona "Aplicar Filtros"');
    ocultarSeccionesSinDatos([]);
    
    const datosCargados = await cargarDatosOriginales();
    
    if (datosCargados && datosOriginales.length > 0) {
        console.log('📀 Datos cargados:', datosOriginales.length, 'empresas');
        
        const fechasDisponibles = datosOriginales
            .filter(d => d.fechaActualizacion)
            .map(d => d.fechaStr);
        
        const fechasUnicas = [...new Set(fechasDisponibles)];
        
        Swal.fire({
            icon: 'info',
            title: 'Datos disponibles',
            html: `<div style="text-align: left;">
                <p>✅ <strong>${datosOriginales.length}</strong> empresas con datos</p>
                <p>📅 Últimas actualizaciones:</p>
                <ul style="margin: 5px 0 0 20px;">
                    ${fechasUnicas.slice(0, 5).map(f => `<li>${f}</li>`).join('')}
                </ul>
                <p style="margin-top: 10px;">👇 Selecciona un período y presiona "Aplicar Filtros"</p>
            </div>`,
            showConfirmButton: true,
            confirmButtonText: 'Entendido'
        });
        
    } else {
        console.log('📀 No hay datos');
        Swal.fire({
            icon: 'warning',
            title: 'Sin datos',
            html: 'No hay estadísticas guardadas.<br><br>Presiona "Actualizar Datos" para generar los datos.'
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

// INICIAR APLICACIÓN
inicializar();