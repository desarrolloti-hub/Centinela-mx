// operaciones.js - Controlador principal para estadísticas de operaciones

import { OperacionesManager } from '/clases/operacion.js';
import { auth } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// =============================================
// INSTANCIA GLOBAL DEL MANAGER
// =============================================
const operacionesManager = new OperacionesManager();

// =============================================
// ESTADO DE LA APLICACIÓN
// =============================================
const estado = {
    organizacionActual: 'global',
    estadisticasActuales: null,
    estadisticasGlobales: null,
    estadisticasPorOrganizacion: [],
    filtros: {
        tipoArchivo: 'todos',
        coleccion: 'todas',
        fecha: null
    },
    graficos: {
        tiposArchivo: null,
        firestore: null,
        carpetas: null
    },
    usuarioActual: null
};

// =============================================
// DETECCIÓN AUTOMÁTICA DE COLECCIONES
// =============================================

/**
 * Detecta automáticamente todas las colecciones en Firestore
 * Esta función intenta descubrir colecciones de varias maneras
 */
async function detectarColecciones() {
    console.log('🔍 Detectando colecciones automáticamente...');
    
    try {
        const coleccionesDetectadas = new Set();
        
        // Método 1: Intentar obtener colecciones de nivel raíz a través de un documento conocido
        // En Firestore web, no hay una API directa para listar colecciones raíz,
        // así que usamos un enfoque basado en documentos conocidos
        
        // Lista de colecciones comunes que podrían existir
        const coleccionesComunes = [
            'usuarios',
            'incidencias',
            'historial',
            'notificaciones',
            'configuracion',
            'logs',
            'backups',
            'auditoria'
        ];
        
        // Verificar cada colección común
        for (const coleccion of coleccionesComunes) {
            try {
                const { getDocs, collection, query, limit } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
                const { db } = await import('/config/firebase-config.js');
                
                const coleccionRef = collection(db, coleccion);
                const q = query(coleccionRef, limit(1));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty || snapshot.size > 0) {
                    coleccionesDetectadas.add(coleccion);
                    console.log(`✅ Colección detectada: ${coleccion}`);
                }
            } catch (e) {
                // La colección no existe o no se puede acceder
            }
        }
        
        // Método 2: Detectar colecciones por organización (prefijos)
        // Si hay organizaciones, buscar colecciones con sus prefijos
        if (estado.estadisticasPorOrganizacion.length > 0) {
            const organizaciones = estado.estadisticasPorOrganizacion.map(org => org.id.replace('_', ''));
            
            for (const org of organizaciones) {
                const coleccionesPorOrg = [
                    `areas_${org}`,
                    `roles_${org}`,
                    `departamentos_${org}`,
                    `empleados_${org}`,
                    `proyectos_${org}`
                ];
                
                for (const coleccion of coleccionesPorOrg) {
                    try {
                        const { getDocs, collection, query, limit } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
                        const { db } = await import('/config/firebase-config.js');
                        
                        const coleccionRef = collection(db, coleccion);
                        const q = query(coleccionRef, limit(1));
                        const snapshot = await getDocs(q);
                        
                        if (!snapshot.empty || snapshot.size > 0) {
                            coleccionesDetectadas.add(coleccion);
                            console.log(`✅ Colección por organización detectada: ${coleccion}`);
                        }
                    } catch (e) {
                        // La colección no existe
                    }
                }
            }
        }
        
        // Método 3: Usar la API de administración si está disponible (solo en servidor)
        // En cliente, no podemos listar todas las colecciones directamente
        
        // Convertir Set a Array y ordenar
        const coleccionesArray = Array.from(coleccionesDetectadas).sort();
        
        console.log('📚 Colecciones detectadas:', coleccionesArray);
        
        // Actualizar el selector de colecciones en la UI
        actualizarSelectorColecciones(coleccionesArray);
        
        return coleccionesArray;
        
    } catch (error) {
        console.error('Error detectando colecciones:', error);
        return [];
    }
}

/**
 * Actualiza el selector de colecciones en la UI
 */
function actualizarSelectorColecciones(colecciones) {
    const selector = document.getElementById('filtroColeccion');
    if (!selector) return;
    
    // Guardar el valor seleccionado actual
    const valorActual = selector.value;
    
    // Limpiar opciones existentes (excepto la primera)
    while (selector.options.length > 1) {
        selector.remove(1);
    }
    
    // Agregar nuevas opciones
    colecciones.forEach(coleccion => {
        const option = document.createElement('option');
        option.value = coleccion;
        
        // Formatear nombre para mostrar
        let nombreMostrar = coleccion
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        option.textContent = nombreMostrar;
        selector.appendChild(option);
    });
    
    // Restaurar valor si existe
    if (valorActual && valorActual !== 'todas') {
        const existe = Array.from(selector.options).some(opt => opt.value === valorActual);
        if (existe) {
            selector.value = valorActual;
        } else {
            selector.value = 'todas';
        }
    }
}

// =============================================
// CARGA INICIAL DE DATOS
// =============================================

/**
 * Carga las organizaciones disponibles
 */
async function cargarOrganizaciones() {
    try {
        // Obtener organizaciones de los usuarios
        const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
        const { db } = await import('/config/firebase-config.js');
        
        const usuariosRef = collection(db, 'usuarios');
        const snapshot = await getDocs(usuariosRef);
        
        const organizacionesMap = new Map();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.organizacionCamelCase) {
                organizacionesMap.set(data.organizacionCamelCase, {
                    id: data.organizacionCamelCase,
                    nombre: data.organizacion || data.organizacionCamelCase
                });
            }
        });
        
        const organizaciones = Array.from(organizacionesMap.values());
        
        // Actualizar selector
        const selector = document.getElementById('selectorEmpresa');
        if (selector) {
            // Limpiar opciones existentes
            selector.innerHTML = '<option value="global">🌐 Todas las organizaciones (Global)</option>';
            
            organizaciones.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(org => {
                const option = document.createElement('option');
                option.value = org.id;
                option.textContent = `🏢 ${org.nombre}`;
                selector.appendChild(option);
            });
        }
        
        return organizaciones;
        
    } catch (error) {
        console.error('Error cargando organizaciones:', error);
        return [];
    }
}

/**
 * Carga todas las estadísticas iniciales
 */
async function cargarEstadisticasIniciales() {
    try {
        console.log('📊 Cargando estadísticas iniciales...');
        
        // Mostrar estado de carga
        mostrarCargando(true);
        
        // 1. Cargar estadísticas globales
        const globalStats = await operacionesManager.getEstadisticas(null);
        estado.estadisticasActuales = globalStats;
        estado.estadisticasGlobales = globalStats;
        
        // 2. Cargar estadísticas por organización
        const organizaciones = await cargarOrganizaciones();
        
        const statsPorOrg = [];
        for (const org of organizaciones) {
            try {
                const stats = await operacionesManager.getEstadisticas(org.id);
                if (stats) {
                    statsPorOrg.push(stats);
                }
            } catch (e) {
                console.warn(`No se pudieron cargar estadísticas para ${org.id}:`, e);
            }
        }
        estado.estadisticasPorOrganizacion = statsPorOrg;
        
        // 3. Detectar colecciones automáticamente
        await detectarColecciones();
        
        // 4. Actualizar UI con todos los datos
        actualizarUICompleta();
        
        console.log('✅ Carga inicial completada');
        
    } catch (error) {
        console.error('Error en carga inicial:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las estadísticas'
        });
    } finally {
        mostrarCargando(false);
    }
}

// =============================================
// ACTUALIZACIÓN DE UI
// =============================================

/**
 * Actualiza toda la interfaz con los datos actuales
 */
function actualizarUICompleta() {
    if (!estado.estadisticasActuales) return;
    
    const stats = estado.estadisticasActuales.toUI();
    
    // Actualizar métricas de Firestore
    actualizarMetricasFirestore(stats);
    
    // Actualizar métricas de Storage
    actualizarMetricasStorage(stats);
    
    // Actualizar gráficas
    actualizarGraficas(stats);
    
    // Actualizar tablas
    actualizarTablaOrganizaciones();
    actualizarTablaCarpetas(stats);
    
    // Actualizar fecha de actualización
    actualizarFechaActualizacion(stats);
    
    // Actualizar badge de organización
    actualizarBadgeOrganizacion();
}

/**
 * Actualiza las métricas de Firestore
 */
function actualizarMetricasFirestore(stats) {
    document.getElementById('metricColecciones').textContent = stats.firestore.colecciones || 0;
    document.getElementById('metricDocumentos').textContent = stats.firestore.documentos || 0;
    document.getElementById('metricAdministradores').textContent = stats.firestore.administradores || 0;
    document.getElementById('metricAreas').textContent = stats.firestore.areas || 0;
    
    document.getElementById('metricEmpleados').textContent = `${stats.firestore.empleados || 0} empleados`;
    document.getElementById('metricRoles').textContent = `${stats.firestore.roles || 0} roles`;
    document.getElementById('metricColeccionesDetalle').textContent = `${stats.firestore.colecciones || 0} activas`;
    document.getElementById('metricDocumentosDetalle').textContent = `Total: ${stats.firestore.documentos || 0}`;
}

/**
 * Actualiza las métricas de Storage
 */
function actualizarMetricasStorage(stats) {
    const totalArchivos = stats.storage.total || 0;
    const porTipo = stats.storage.porTipo || {};
    const totalSize = stats.storage.totalSize || 0;
    
    document.getElementById('metricArchivosTotales').textContent = totalArchivos;
    document.getElementById('metricTamanioTotal').textContent = stats.storage.totalSizeFormatted || '0 B';
    document.getElementById('metricPDF').textContent = porTipo.pdf || 0;
    document.getElementById('metricImagenes').textContent = porTipo.imagen || 0;
    document.getElementById('metricDocumentosStorage').textContent = porTipo.documento || 0;
    document.getElementById('metricMultimedia').textContent = porTipo.multimedia || 0;
    
    // Calcular porcentajes
    if (totalArchivos > 0) {
        document.getElementById('metricPDFPorcentaje').textContent = 
            `${Math.round((porTipo.pdf || 0) / totalArchivos * 100)}%`;
        document.getElementById('metricImagenesPorcentaje').textContent = 
            `${Math.round((porTipo.imagen || 0) / totalArchivos * 100)}%`;
        document.getElementById('metricDocumentosPorcentaje').textContent = 
            `${Math.round((porTipo.documento || 0) / totalArchivos * 100)}%`;
        document.getElementById('metricMultimediaPorcentaje').textContent = 
            `${Math.round((porTipo.multimedia || 0) / totalArchivos * 100)}%`;
    }
}

/**
 * Actualiza todas las gráficas
 */
function actualizarGraficas(stats) {
    actualizarGraficoTiposArchivo(stats);
    actualizarGraficoFirestore(stats);
    actualizarGraficoCarpetas(stats);
}

/**
 * Actualiza gráfica de tipos de archivo
 */
function actualizarGraficoTiposArchivo(stats) {
    const ctx = document.getElementById('graficoTiposArchivo')?.getContext('2d');
    if (!ctx) return;
    
    const porTipo = stats.storage.porTipo || {};
    
    // Destruir gráfica anterior si existe
    if (estado.graficos.tiposArchivo) {
        estado.graficos.tiposArchivo.destroy();
    }
    
    estado.graficos.tiposArchivo = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['PDF', 'Imágenes', 'Documentos', 'Multimedia', 'Otros'],
            datasets: [{
                data: [
                    porTipo.pdf || 0,
                    porTipo.imagen || 0,
                    porTipo.documento || 0,
                    porTipo.multimedia || 0,
                    porTipo.otros || 0
                ],
                backgroundColor: [
                    '#ef4444',
                    '#8b5cf6',
                    '#3b82f6',
                    '#10b981',
                    '#6c757d'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

/**
 * Actualiza gráfica de Firestore
 */
function actualizarGraficoFirestore(stats) {
    const ctx = document.getElementById('graficoFirestore')?.getContext('2d');
    if (!ctx) return;
    
    const firestore = stats.firestore || {};
    
    // Destruir gráfica anterior
    if (estado.graficos.firestore) {
        estado.graficos.firestore.destroy();
    }
    
    estado.graficos.firestore = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Usuarios', 'Áreas', 'Roles', 'Admins', 'Empleados'],
            datasets: [{
                label: 'Cantidad',
                data: [
                    firestore.usuarios || 0,
                    firestore.areas || 0,
                    firestore.roles || 0,
                    firestore.administradores || 0,
                    firestore.empleados || 0
                ],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff' }
                },
                x: {
                    ticks: { color: '#fff' }
                }
            }
        }
    });
}

/**
 * Actualiza gráfica de carpetas
 */
function actualizarGraficoCarpetas(stats) {
    const ctx = document.getElementById('graficoCarpetas')?.getContext('2d');
    if (!ctx) return;
    
    const porCarpeta = stats.storage.porCarpeta || {};
    const carpetas = Object.entries(porCarpeta)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 carpetas
    
    // Destruir gráfica anterior
    if (estado.graficos.carpetas) {
        estado.graficos.carpetas.destroy();
    }
    
    estado.graficos.carpetas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: carpetas.map(([nombre]) => 
                nombre.length > 20 ? nombre.substring(0, 20) + '...' : nombre
            ),
            datasets: [{
                label: 'Archivos',
                data: carpetas.map(([, cantidad]) => cantidad),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff' }
                },
                y: {
                    ticks: { color: '#fff' }
                }
            }
        }
    });
}

/**
 * Actualiza tabla de organizaciones
 */
function actualizarTablaOrganizaciones() {
    const tbody = document.getElementById('tablaOrganizacionesBody');
    if (!tbody) return;
    
    if (estado.estadisticasPorOrganizacion.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay datos de organizaciones</td></tr>';
        return;
    }
    
    let html = '';
    
    // Agregar fila de global si está seleccionada
    if (estado.organizacionActual === 'global' && estado.estadisticasGlobales) {
        const global = estado.estadisticasGlobales.toUI();
        html += generarFilaOrganizacion('🌐 Global', global);
    }
    
    // Agregar filas de organizaciones
    estado.estadisticasPorOrganizacion.forEach(org => {
        const ui = org.toUI();
        html += generarFilaOrganizacion(ui.organizacionNombre || ui.id, ui);
    });
    
    tbody.innerHTML = html;
}

/**
 * Genera una fila para la tabla de organizaciones
 */
function generarFilaOrganizacion(nombre, stats) {
    const storage = stats.storage || {};
    const porTipo = storage.porTipo || {};
    
    return `
        <tr>
            <td><strong>${nombre}</strong></td>
            <td><span class="badge-value badge-primary">${stats.firestore?.documentos || 0}</span></td>
            <td><span class="badge-value badge-success">${storage.total || 0}</span></td>
            <td><span class="badge-value badge-info">${storage.totalSizeFormatted || '0 B'}</span></td>
            <td><span class="badge-value badge-danger">${porTipo.pdf || 0}</span></td>
            <td><span class="badge-value badge-purple">${porTipo.imagen || 0}</span></td>
        </tr>
    `;
}

/**
 * Actualiza tabla de carpetas
 */
function actualizarTablaCarpetas(stats) {
    const tbody = document.getElementById('tablaCarpetasBody');
    if (!tbody) return;
    
    const porCarpeta = stats.storage?.porCarpeta || {};
    const totalArchivos = stats.storage?.total || 0;
    
    const carpetas = Object.entries(porCarpeta)
        .sort((a, b) => b[1] - a[1]);
    
    if (carpetas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay datos de carpetas</td></tr>';
        return;
    }
    
    let html = '';
    carpetas.forEach(([carpeta, cantidad]) => {
        const porcentaje = totalArchivos > 0 ? Math.round((cantidad / totalArchivos) * 100) : 0;
        
        html += `
            <tr>
                <td><i class="fas fa-folder" style="color: #ffd700; margin-right: 8px;"></i>${carpeta}</td>
                <td><span class="badge-value badge-info">${cantidad}</span></td>
                <td>${porcentaje}%</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${porcentaje}%;"></div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Actualiza la fecha de última actualización
 */
function actualizarFechaActualizacion(stats) {
    const span = document.getElementById('fechaActualizacion');
    if (span && stats.ultimaActualizacion) {
        span.textContent = stats.ultimaActualizacion;
    }
}

/**
 * Actualiza el badge de organización seleccionada
 */
function actualizarBadgeOrganizacion() {
    const badge = document.getElementById('empresaSeleccionada');
    const span = badge?.querySelector('span');
    const selector = document.getElementById('selectorEmpresa');
    
    if (badge && span && selector) {
        const selectedOption = selector.options[selector.selectedIndex];
        const texto = selectedOption ? selectedOption.textContent.replace(/[🌐🏢]/g, '').trim() : 'Global';
        span.textContent = texto;
    }
}

// =============================================
// CAMBIO DE ORGANIZACIÓN
// =============================================

/**
 * Maneja el cambio de organización en el selector
 */
async function cambiarOrganizacion(organizacionId) {
    try {
        console.log(`🔄 Cambiando a organización: ${organizacionId}`);
        
        mostrarCargando(true);
        
        estado.organizacionActual = organizacionId;
        
        // Obtener estadísticas de la organización seleccionada
        const stats = await operacionesManager.getEstadisticas(
            organizacionId === 'global' ? null : organizacionId
        );
        
        if (stats) {
            estado.estadisticasActuales = stats;
            actualizarUICompleta();
            
            // Actualizar modo de visualización
            const modoSpan = document.getElementById('modoVisualizacion');
            if (modoSpan) {
                const nombreOrg = organizacionId === 'global' ? 'Global' : 
                    (stats.organizacionNombre || organizacionId);
                modoSpan.innerHTML = `<i class="fas ${organizacionId === 'global' ? 'fa-globe' : 'fa-building'}"></i> Vista: ${nombreOrg}`;
            }
        }
        
    } catch (error) {
        console.error('Error cambiando organización:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las estadísticas de la organización'
        });
    } finally {
        mostrarCargando(false);
    }
}

// =============================================
// ACTUALIZACIÓN MANUAL
// =============================================

/**
 * Actualiza manualmente todas las estadísticas
 */
async function actualizarManual() {
    try {
        console.log('🔄 Actualizando estadísticas manualmente...');
        
        const result = await Swal.fire({
            title: '¿Actualizar estadísticas?',
            text: 'Esto puede tomar unos segundos dependiendo del tamaño de los datos',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#00c3ff',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, actualizar',
            cancelButtonText: 'Cancelar'
        });
        
        if (!result.isConfirmed) return;
        
        mostrarCargando(true);
        
        // Actualizar estadísticas para la organización actual
        if (estado.organizacionActual === 'global') {
            // Actualizar global
            await operacionesManager.actualizarEstadisticas(null, estado.usuarioActual);
            
            // Actualizar cada organización
            for (const org of estado.estadisticasPorOrganizacion) {
                await operacionesManager.actualizarEstadisticas(org.id, estado.usuarioActual);
            }
            
            // Recargar todas las estadísticas
            await cargarEstadisticasIniciales();
            
        } else {
            // Actualizar solo la organización actual
            await operacionesManager.actualizarEstadisticas(estado.organizacionActual, estado.usuarioActual);
            
            // Recargar estadísticas
            const stats = await operacionesManager.getEstadisticas(estado.organizacionActual);
            estado.estadisticasActuales = stats;
            
            // Actualizar también en el array de organizaciones
            const index = estado.estadisticasPorOrganizacion.findIndex(org => org.id === estado.organizacionActual);
            if (index !== -1) {
                estado.estadisticasPorOrganizacion[index] = stats;
            }
            
            actualizarUICompleta();
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Las estadísticas se actualizaron correctamente',
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error en actualización manual:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron actualizar las estadísticas'
        });
    } finally {
        mostrarCargando(false);
    }
}

// =============================================
// EXPORTAR A EXCEL
// =============================================

/**
 * Exporta los datos a Excel
 */
function exportarExcel() {
    try {
        console.log('📥 Exportando a Excel...');
        
        // Preparar datos para Excel
        const datos = [];
        
        // Cabeceras
        datos.push(['ESTADÍSTICAS DE OPERACIONES - SISTEMA CENTINELA']);
        datos.push(['Fecha de exportación:', new Date().toLocaleString()]);
        datos.push([]);
        
        // Resumen global
        if (estado.estadisticasGlobales) {
            const global = estado.estadisticasGlobales.toUI();
            datos.push(['RESUMEN GLOBAL']);
            datos.push(['Métrica', 'Valor']);
            datos.push(['Colecciones', global.firestore?.colecciones || 0]);
            datos.push(['Documentos totales', global.firestore?.documentos || 0]);
            datos.push(['Usuarios', global.firestore?.usuarios || 0]);
            datos.push(['Administradores', global.firestore?.administradores || 0]);
            datos.push(['Empleados', global.firestore?.empleados || 0]);
            datos.push(['Áreas', global.firestore?.areas || 0]);
            datos.push(['Roles', global.firestore?.roles || 0]);
            datos.push(['Archivos en Storage', global.storage?.total || 0]);
            datos.push(['Tamaño total', global.storage?.totalSizeFormatted || '0 B']);
            datos.push([]);
        }
        
        // Datos por organización
        datos.push(['ESTADÍSTICAS POR ORGANIZACIÓN']);
        datos.push(['Organización', 'Documentos', 'Archivos', 'Tamaño', 'PDF', 'Imágenes', 'Documentos', 'Multimedia']);
        
        estado.estadisticasPorOrganizacion.forEach(org => {
            const ui = org.toUI();
            const storage = ui.storage || {};
            const porTipo = storage.porTipo || {};
            
            datos.push([
                ui.organizacionNombre || ui.id,
                ui.firestore?.documentos || 0,
                storage.total || 0,
                storage.totalSizeFormatted || '0 B',
                porTipo.pdf || 0,
                porTipo.imagen || 0,
                porTipo.documento || 0,
                porTipo.multimedia || 0
            ]);
        });
        
        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(datos);
        
        // Ajustar ancho de columnas
        ws['!cols'] = [
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');
        
        // Guardar archivo
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `estadisticas_operaciones_${fecha}.xlsx`);
        
        Swal.fire({
            icon: 'success',
            title: 'Exportado',
            text: 'Datos exportados a Excel correctamente',
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron exportar los datos'
        });
    }
}

// =============================================
// LIMPIAR FILTROS
// =============================================

/**
 * Limpia todos los filtros
 */
function limpiarFiltros() {
    document.getElementById('filtroTipoArchivo').value = 'todos';
    document.getElementById('filtroColeccion').value = 'todas';
    document.getElementById('filtroFecha').value = '';
    
    estado.filtros = {
        tipoArchivo: 'todos',
        coleccion: 'todas',
        fecha: null
    };
    
    // Aquí se podría aplicar filtrado si es necesario
    
    Swal.fire({
        icon: 'info',
        title: 'Filtros limpiados',
        text: 'Todos los filtros han sido restablecidos',
        timer: 1500,
        showConfirmButton: false
    });
}

// =============================================
// UTILIDADES
// =============================================

/**
 * Muestra u oculta el indicador de carga
 */
function mostrarCargando(mostrar) {
    if (mostrar) {
        // Deshabilitar botones y mostrar spinner
        document.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
        });
        
        // Agregar clase loading a las cards
        document.querySelectorAll('.metric-card, .card').forEach(el => {
            el.classList.add('loading');
        });
    } else {
        // Habilitar botones
        document.querySelectorAll('button').forEach(btn => {
            btn.disabled = false;
        });
        
        // Quitar clase loading
        document.querySelectorAll('.metric-card, .card').forEach(el => {
            el.classList.remove('loading');
        });
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================

/**
 * Inicializa la aplicación
 */
async function inicializar() {
    console.log('🚀 Inicializando estadísticas de operaciones...');
    
    try {
        // Verificar autenticación
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('👤 Usuario autenticado:', user.email);
                estado.usuarioActual = {
                    id: user.uid,
                    email: user.email,
                    nombre: user.displayName
                };
                
                // Cargar datos iniciales
                await cargarEstadisticasIniciales();
                
                // Configurar listeners de eventos
                configurarEventos();
                
                // Programar actualizaciones automáticas (cada 30 minutos)
                operacionesManager.programarActualizaciones(30);
                
            } else {
                console.log('❌ Usuario no autenticado, redirigiendo...');
                window.location.href = '/index.html';
            }
        });
        
    } catch (error) {
        console.error('Error en inicialización:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de inicialización',
            text: 'No se pudo inicializar la aplicación'
        });
    }
}

/**
 * Configura los event listeners
 */
function configurarEventos() {
    // Selector de empresa
    const selectorEmpresa = document.getElementById('selectorEmpresa');
    if (selectorEmpresa) {
        selectorEmpresa.addEventListener('change', (e) => {
            cambiarOrganizacion(e.target.value);
        });
    }
    
    // Botón actualizar
    const btnActualizar = document.getElementById('btnActualizar');
    if (btnActualizar) {
        btnActualizar.addEventListener('click', actualizarManual);
    }
    
    // Botón limpiar
    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
    
    // Botón exportar Excel
    const btnExportar = document.getElementById('btnExportarExcel');
    if (btnExportar) {
        btnExportar.addEventListener('click', exportarExcel);
    }
    
    // Filtros
    document.getElementById('filtroTipoArchivo')?.addEventListener('change', (e) => {
        estado.filtros.tipoArchivo = e.target.value;
        // Aquí se podría aplicar filtrado
    });
    
    document.getElementById('filtroColeccion')?.addEventListener('change', (e) => {
        estado.filtros.coleccion = e.target.value;
        // Aquí se podría aplicar filtrado
    });
    
    document.getElementById('filtroFecha')?.addEventListener('change', (e) => {
        estado.filtros.fecha = e.target.value;
        // Aquí se podría aplicar filtrado
    });
}

// =============================================
// INICIAR APLICACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', inicializar);

// Limpiar listeners al cerrar la página
window.addEventListener('beforeunload', () => {
    operacionesManager.limpiarListeners();
});