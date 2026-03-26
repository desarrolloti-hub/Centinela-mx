// estadisticasExtravios.js - Dashboard de Pérdidas y Recuperaciones
// VERSIÓN CON FILTROS MANUALES - Sin auto-refresco
// OPTIMIZADO - Sin scroll horizontal, gráficas mejoradas y CLICKEABLES

import { MercanciaPerdidaManager } from '/clases/mercanciaPerdida.js';

// =============================================
// VARIABLES GLOBALES
// =============================================
let mercanciaManager = null;
let organizacionActual = null;
let sucursalesCache = [];
let datosActuales = {
    registros: [],
    estadisticas: null
};

// Gráficas
let graficoTipoEvento = null;
let graficoEvolucionMensual = null;
let graficoTopSucursales = null;
let graficoComparativa = null;

// Almacenes para datos clickeables
window.registrosPorTipo = {};
window.registrosPorMes = {};
window.registrosPorSucursal = {};

// Configuración de colores para gráficas
const COLORS = {
    rojo: '#ef4444',
    rojoClaro: 'rgba(239, 68, 68, 0.1)',
    verde: '#10b981',
    verdeClaro: 'rgba(16, 185, 129, 0.1)',
    naranja: '#f59e0b',
    azul: '#3b82f6',
    morado: '#8b5cf6',
    rosa: '#ec4899',
    celeste: '#06b6d4',
    gris: '#6b7280'
};

// =============================================
// FUNCIÓN PARA OBTENER USUARIO ACTUAL
// =============================================
function obtenerUsuarioActual() {
    try {
        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo) {
            const adminData = JSON.parse(adminInfo);
            return {
                id: adminData.id || adminData.uid,
                uid: adminData.uid || adminData.id,
                nombreCompleto: adminData.nombreCompleto || 'Administrador',
                organizacion: adminData.organizacion,
                organizacionCamelCase: adminData.organizacionCamelCase,
                correo: adminData.correoElectronico || '',
                email: adminData.correoElectronico || ''
            };
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData && Object.keys(userData).length > 0) {
            return {
                id: userData.uid || userData.id,
                uid: userData.uid || userData.id,
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                organizacion: userData.organizacion || userData.empresa,
                organizacionCamelCase: userData.organizacionCamelCase,
                correo: userData.correo || userData.email || '',
                email: userData.correo || userData.email || ''
            };
        }

        return null;
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        return null;
    }
}

// =============================================
// OBTENER DATOS DE ORGANIZACIÓN
// =============================================
async function obtenerDatosOrganizacion() {
    try {
        const usuario = obtenerUsuarioActual();
        if (usuario) {
            organizacionActual = {
                nombre: usuario.organizacion || 'Mi Empresa',
                camelCase: usuario.organizacionCamelCase || ''
            };
            console.log('📌 Organización:', organizacionActual);
            return;
        }
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
        
        organizacionActual = {
            nombre: userData.organizacion || adminInfo.organizacion || 'Mi Empresa',
            camelCase: userData.organizacionCamelCase || adminInfo.organizacionCamelCase || ''
        };
    } catch (error) {
        organizacionActual = { nombre: 'Mi Empresa', camelCase: '' };
    }
}

// =============================================
// CARGAR SUCURSALES PARA FILTRO
// =============================================
async function cargarSucursales() {
    try {
        if (!organizacionActual?.camelCase) {
            console.warn('No hay organización configurada');
            return;
        }
        
        const { SucursalManager } = await import('/clases/sucursal.js');
        const sucursalManager = new SucursalManager();
        
        const sucursales = await sucursalManager.getSucursalesByOrganizacion(
            organizacionActual.camelCase
        );
        
        sucursalesCache = sucursales.map(s => s.nombre);
        sucursalesCache = [...new Set(sucursalesCache)];
        
        const filtroSucursal = document.getElementById('filtroSucursal');
        if (filtroSucursal) {
            filtroSucursal.innerHTML = '<option value="todas">Todas las sucursales</option>';
            sucursalesCache.forEach(suc => {
                const option = document.createElement('option');
                option.value = suc;
                option.textContent = suc.length > 40 ? suc.substring(0, 37) + '...' : suc;
                filtroSucursal.appendChild(option);
            });
        }
        
        console.log(`✅ ${sucursalesCache.length} sucursales cargadas`);
        
    } catch (error) {
        console.error('Error cargando sucursales:', error);
        sucursalesCache = [];
        
        const filtroSucursal = document.getElementById('filtroSucursal');
        if (filtroSucursal) {
            filtroSucursal.innerHTML = '<option value="todas">Todas las sucursales</option>';
        }
    }
}

// =============================================
// CARGAR REGISTROS CON FILTROS
// =============================================
async function cargarRegistrosConFiltros() {
    if (!organizacionActual?.camelCase || !mercanciaManager) {
        console.error('No hay organización o manager configurado');
        mostrarError('No se pudo inicializar el módulo de datos');
        return;
    }
    
    try {
        mostrarLoading();
        
        const sucursal = document.getElementById('filtroSucursal')?.value || 'todas';
        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaFin = document.getElementById('fechaFin')?.value;
        const tipoEvento = document.getElementById('filtroTipoEvento')?.value || 'todos';
        const estado = document.getElementById('filtroEstado')?.value || 'todos';
        
        const todosRegistros = await mercanciaManager.getRegistrosByOrganizacion(
            organizacionActual.camelCase
        );
        
        let registrosFiltrados = todosRegistros;
        
        // Filtro por sucursal
        if (sucursal !== 'todas') {
            registrosFiltrados = registrosFiltrados.filter(r => 
                r.nombreEmpresaCC === sucursal
            );
        }
        
        // Filtro por fecha
        if (fechaInicio) {
            const fechaInicioObj = new Date(fechaInicio);
            fechaInicioObj.setHours(0, 0, 0, 0);
            registrosFiltrados = registrosFiltrados.filter(r => {
                const fechaRegistro = r.fecha ? new Date(r.fecha) : null;
                return fechaRegistro && fechaRegistro >= fechaInicioObj;
            });
        }
        
        if (fechaFin) {
            const fechaFinObj = new Date(fechaFin);
            fechaFinObj.setHours(23, 59, 59, 999);
            registrosFiltrados = registrosFiltrados.filter(r => {
                const fechaRegistro = r.fecha ? new Date(r.fecha) : null;
                return fechaRegistro && fechaRegistro <= fechaFinObj;
            });
        }
        
        // Filtro por tipo de evento
        if (tipoEvento !== 'todos') {
            registrosFiltrados = registrosFiltrados.filter(r => 
                r.tipoEvento === tipoEvento
            );
        }
        
        // Filtro por estado
        if (estado !== 'todos') {
            registrosFiltrados = registrosFiltrados.filter(r => 
                r.estado === estado
            );
        }
        
        datosActuales.registros = registrosFiltrados;
        
        const estadisticas = calcularEstadisticas(registrosFiltrados);
        datosActuales.estadisticas = estadisticas;
        
        mostrarKPIs(estadisticas);
        actualizarGraficas(registrosFiltrados, estadisticas);
        actualizarTablaResumen(registrosFiltrados);
        mostrarContenedores();
        
        document.getElementById('fechaActualizacion').textContent = new Date().toLocaleString('es-MX');
        
    } catch (error) {
        console.error('Error cargando registros con filtros:', error);
        mostrarError('No se pudieron cargar los datos: ' + error.message);
    }
}

// =============================================
// CALCULAR ESTADÍSTICAS
// =============================================
function calcularEstadisticas(registros) {
    if (!registros || registros.length === 0) {
        return {
            totalPerdido: 0,
            totalRecuperado: 0,
            totalNeto: 0,
            porcentajeRecuperacion: 0,
            totalEventos: 0,
            promedioPerdida: 0
        };
    }
    
    let totalPerdido = 0;
    let totalRecuperado = 0;
    
    registros.forEach(r => {
        totalPerdido += r.montoPerdido || 0;
        totalRecuperado += r.montoRecuperado || 0;
    });
    
    const totalNeto = totalPerdido - totalRecuperado;
    const porcentajeRecuperacion = totalPerdido > 0 
        ? (totalRecuperado / totalPerdido) * 100 
        : 0;
    const promedioPerdida = registros.length > 0 
        ? totalPerdido / registros.length 
        : 0;
    
    return {
        totalPerdido,
        totalRecuperado,
        totalNeto,
        porcentajeRecuperacion,
        totalEventos: registros.length,
        promedioPerdida
    };
}

// =============================================
// MOSTRAR KPIs
// =============================================
function mostrarKPIs(estadisticas) {
    const formatter = new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    document.getElementById('totalPerdidas').textContent = formatter.format(estadisticas.totalPerdido);
    document.getElementById('totalRecuperado').textContent = formatter.format(estadisticas.totalRecuperado);
    document.getElementById('totalNeto').textContent = formatter.format(estadisticas.totalNeto);
    document.getElementById('porcentajeRecuperacion').textContent = `${estadisticas.porcentajeRecuperacion.toFixed(2)}%`;
    document.getElementById('totalEventos').textContent = estadisticas.totalEventos;
    document.getElementById('promedioPerdida').textContent = formatter.format(estadisticas.promedioPerdida);
}

// =============================================
// ACTUALIZAR GRÁFICAS
// =============================================
function actualizarGraficas(registros, estadisticas) {
    if (!registros || registros.length === 0) {
        actualizarGraficaVacia();
        return;
    }
    
    actualizarGraficoTipoEvento(registros);
    actualizarGraficoEvolucionMensual(registros);
    actualizarGraficoTopSucursales(registros);
    actualizarGraficoComparativa(estadisticas);
}

// =============================================
// GRÁFICA POR TIPO DE EVENTO (Donut CLICKEABLE)
// =============================================
function actualizarGraficoTipoEvento(registros) {
    const tipos = {
        'robo': 0,
        'extravio': 0,
        'accidente': 0,
        'otro': 0
    };
    
    // Guardar registros por tipo para el click
    window.registrosPorTipo = {
        'robo': [],
        'extravio': [],
        'accidente': [],
        'otro': []
    };
    
    const nombresTipos = {
        'robo': 'Robo',
        'extravio': 'Extravío',
        'accidente': 'Accidente',
        'otro': 'Otro'
    };
    
    const colores = {
        'robo': COLORS.rojo,
        'extravio': COLORS.naranja,
        'accidente': COLORS.azul,
        'otro': COLORS.morado
    };
    
    // Agrupar registros por tipo y sumar montos
    registros.forEach(r => {
        const tipo = r.tipoEvento || 'otro';
        tipos[tipo] = (tipos[tipo] || 0) + (r.montoPerdido || 0);
        window.registrosPorTipo[tipo].push(r);
    });
    
    const ctx = document.getElementById('graficoTipoEvento').getContext('2d');
    const labels = Object.keys(tipos).map(k => nombresTipos[k] || k);
    const data = Object.values(tipos);
    const backgroundColors = Object.keys(tipos).map(k => colores[k] || COLORS.gris);
    
    if (graficoTipoEvento) {
        graficoTipoEvento.data.labels = labels;
        graficoTipoEvento.data.datasets[0].data = data;
        graficoTipoEvento.data.datasets[0].backgroundColor = backgroundColors;
        graficoTipoEvento.update();
    } else {
        graficoTipoEvento = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 15,
                    cutout: '65%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const tipoKey = Object.keys(tipos)[index];
                        const tipoNombre = nombresTipos[tipoKey];
                        const registrosTipo = window.registrosPorTipo[tipoKey] || [];
                        
                        if (registrosTipo.length === 0) {
                            Swal.fire({
                                icon: 'info',
                                title: 'Sin registros',
                                text: `No hay registros de tipo ${tipoNombre}`,
                                background: 'var(--color-bg-primary)',
                                color: 'white'
                            });
                            return;
                        }
                        
                        mostrarRegistrosEnSweet(registrosTipo, `Registros de tipo: ${tipoNombre}`, `📋 ${tipoNombre}`);
                    }
                },
                plugins: {
                    legend: { 
                        labels: { color: 'white', font: { size: 11, family: "'Rajdhani', sans-serif" } }, 
                        position: 'bottom',
                        rtl: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                                const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
                                return `${ctx.label}: ${formatter.format(ctx.raw)} (${pct}%)`;
                            }
                        },
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#ddd'
                    }
                }
            }
        });
    }
}

// =============================================
// GRÁFICA DE EVOLUCIÓN MENSUAL (Línea CLICKEABLE)
// =============================================
function actualizarGraficoEvolucionMensual(registros) {
    const meses = {};
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Guardar registros por mes para el click
    window.registrosPorMes = {};
    
    registros.forEach(r => {
        if (r.fecha) {
            const fecha = new Date(r.fecha);
            const mesKey = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
            const mesNombre = `${mesesNombres[fecha.getMonth()]} ${fecha.getFullYear()}`;
            
            if (!meses[mesKey]) {
                meses[mesKey] = {
                    nombre: mesNombre,
                    perdido: 0,
                    recuperado: 0
                };
                window.registrosPorMes[mesKey] = [];
            }
            meses[mesKey].perdido += r.montoPerdido || 0;
            meses[mesKey].recuperado += r.montoRecuperado || 0;
            window.registrosPorMes[mesKey].push(r);
        }
    });
    
    const mesesOrdenados = Object.keys(meses).sort();
    const labels = mesesOrdenados.map(m => meses[m].nombre);
    const perdidosData = mesesOrdenados.map(m => meses[m].perdido);
    const recuperadosData = mesesOrdenados.map(m => meses[m].recuperado);
    
    const ctx = document.getElementById('graficoEvolucionMensual').getContext('2d');
    
    if (graficoEvolucionMensual) {
        graficoEvolucionMensual.data.labels = labels;
        graficoEvolucionMensual.data.datasets[0].data = perdidosData;
        graficoEvolucionMensual.data.datasets[1].data = recuperadosData;
        graficoEvolucionMensual.update();
    } else {
        graficoEvolucionMensual = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Pérdidas',
                        data: perdidosData,
                        borderColor: COLORS.rojo,
                        backgroundColor: COLORS.rojoClaro,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: COLORS.rojo,
                        pointBorderColor: '#fff',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderWidth: 2
                    },
                    {
                        label: 'Recuperaciones',
                        data: recuperadosData,
                        borderColor: COLORS.verde,
                        backgroundColor: COLORS.verdeClaro,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: COLORS.verde,
                        pointBorderColor: '#fff',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const datasetIndex = activeElements[0].datasetIndex;
                        const index = activeElements[0].index;
                        const mesKey = mesesOrdenados[index];
                        const registrosMes = window.registrosPorMes[mesKey] || [];
                        const mesNombre = meses[mesKey]?.nombre || 'Mes desconocido';
                        const tipo = datasetIndex === 0 ? 'Pérdidas' : 'Recuperaciones';
                        
                        if (registrosMes.length === 0) {
                            Swal.fire({
                                icon: 'info',
                                title: 'Sin registros',
                                text: `No hay registros para ${mesNombre}`,
                                background: 'var(--color-bg-primary)',
                                color: 'white'
                            });
                            return;
                        }
                        
                        mostrarRegistrosEnSweet(registrosMes, `Registros de ${mesNombre}`, `📅 ${mesNombre}`);
                    }
                },
                plugins: {
                    legend: { labels: { color: 'white', font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
                                return `${ctx.dataset.label}: ${formatter.format(ctx.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => {
                                const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact' });
                                return formatter.format(value);
                            },
                            color: '#aaa'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#aaa', maxRotation: 45, minRotation: 45, autoSkip: true },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

// =============================================
// GRÁFICA TOP SUCURSALES (Barras horizontales CLICKEABLES)
// =============================================
function actualizarGraficoTopSucursales(registros) {
    const sucursalesMap = {};
    
    // Guardar registros por sucursal para el click
    window.registrosPorSucursal = {};
    
    registros.forEach(r => {
        const sucursal = r.nombreEmpresaCC || 'Sin asignar';
        if (!sucursalesMap[sucursal]) {
            sucursalesMap[sucursal] = {
                perdido: 0,
                recuperado: 0,
                eventos: 0
            };
            window.registrosPorSucursal[sucursal] = [];
        }
        sucursalesMap[sucursal].perdido += r.montoPerdido || 0;
        sucursalesMap[sucursal].recuperado += r.montoRecuperado || 0;
        sucursalesMap[sucursal].eventos += 1;
        window.registrosPorSucursal[sucursal].push(r);
    });
    
    const sucursalesArray = Object.entries(sucursalesMap)
        .map(([nombre, datos]) => ({ nombre, ...datos }))
        .sort((a, b) => b.perdido - a.perdido)
        .slice(0, 8);
    
    const labels = sucursalesArray.map(s => s.nombre.length > 25 ? s.nombre.substring(0, 22) + '...' : s.nombre);
    const perdidosData = sucursalesArray.map(s => s.perdido);
    const nombresCompletos = sucursalesArray.map(s => s.nombre);
    
    const ctx = document.getElementById('graficoTopSucursales').getContext('2d');
    
    if (graficoTopSucursales) {
        graficoTopSucursales.data.labels = labels;
        graficoTopSucursales.data.datasets[0].data = perdidosData;
        graficoTopSucursales.data.datasets[0].backgroundColor = '#ffffff';
        graficoTopSucursales.data.datasets[0].borderColor = '#ffffff';
        graficoTopSucursales.update();
    } else {
        graficoTopSucursales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monto perdido',
                    data: perdidosData,
                    backgroundColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderRadius: 8,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const sucursalNombre = nombresCompletos[index];
                        const registrosSucursal = window.registrosPorSucursal[sucursalNombre] || [];
                        
                        if (registrosSucursal.length === 0) {
                            Swal.fire({
                                icon: 'info',
                                title: 'Sin registros',
                                text: `No hay registros para ${sucursalNombre}`,
                                background: 'var(--color-bg-primary)',
                                color: 'white'
                            });
                            return;
                        }
                        
                        mostrarRegistrosEnSweet(registrosSucursal, `Registros de ${sucursalNombre}`, `🏢 ${sucursalNombre}`);
                    }
                },
                plugins: {
                    legend: { 
                        labels: { 
                            color: 'white', 
                            font: { size: 10 } 
                        } 
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
                                return `${ctx.dataset.label}: ${formatter.format(ctx.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: (value) => {
                                const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact' });
                                return formatter.format(value);
                            },
                            color: '#aaa'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { color: '#aaa', font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

// =============================================
// GRÁFICA COMPARATIVA (Barras CLICKEABLES)
// =============================================
function actualizarGraficoComparativa(estadisticas) {
    const ctx = document.getElementById('graficoComparativa').getContext('2d');
    
    if (graficoComparativa) {
        graficoComparativa.data.datasets[0].data = [estadisticas.totalPerdido, estadisticas.totalRecuperado];
        graficoComparativa.update();
    } else {
        graficoComparativa = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pérdidas', 'Recuperaciones'],
                datasets: [{
                    label: 'Monto total',
                    data: [estadisticas.totalPerdido, estadisticas.totalRecuperado],
                    backgroundColor: [COLORS.rojo, COLORS.verde],
                    borderRadius: 12,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const tipo = index === 0 ? 'Pérdidas' : 'Recuperaciones';
                        const registros = datosActuales.registros || [];
                        
                        if (registros.length === 0) {
                            Swal.fire({
                                icon: 'info',
                                title: 'Sin registros',
                                text: `No hay registros para mostrar`,
                                background: 'var(--color-bg-primary)',
                                color: 'white'
                            });
                            return;
                        }
                        
                        if (tipo === 'Pérdidas') {
                            mostrarRegistrosEnSweet(registros, 'Todos los registros de pérdidas', `📉 Todos los registros`);
                        } else {
                            const registrosConRecuperacion = registros.filter(r => (r.montoRecuperado || 0) > 0);
                            if (registrosConRecuperacion.length === 0) {
                                Swal.fire({
                                    icon: 'info',
                                    title: 'Sin recuperaciones',
                                    text: 'No hay registros con recuperaciones registradas',
                                    background: 'var(--color-bg-primary)',
                                    color: 'white'
                                });
                                return;
                            }
                            mostrarRegistrosEnSweet(registrosConRecuperacion, 'Registros con recuperaciones', `💰 Recuperaciones registradas`);
                        }
                    }
                },
                plugins: {
                    legend: { labels: { color: 'white', font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
                                return `${ctx.dataset.label}: ${formatter.format(ctx.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (value) => {
                                const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact' });
                                return formatter.format(value);
                            },
                            color: '#aaa'
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#aaa', font: { size: 12, weight: 'bold' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

// =============================================
// FUNCIÓN PARA MOSTRAR REGISTROS EN SWEETALERT
// =============================================
function mostrarRegistrosEnSweet(registros, titulo, icono = '📋') {
    if (!registros || registros.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: 'No hay registros para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const totalPerdido = registros.reduce((acc, r) => acc + (r.montoPerdido || 0), 0);
    const totalRecuperado = registros.reduce((acc, r) => acc + (r.montoRecuperado || 0), 0);
    
    // Limitar a los primeros 10 registros para no saturar el modal
    const registrosMostrar = registros.slice(0, 10);
    const hayMas = registros.length > 10;
    
    let registrosHtml = `
        <div style="max-height: 400px; overflow-y: auto; margin-top: 12px;">
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <span><strong>📊 Total registros:</strong> ${registros.length}</span>
                    <span><strong>💰 Total perdido:</strong> ${formatter.format(totalPerdido)}</span>
                    <span><strong>🔄 Total recuperado:</strong> ${formatter.format(totalRecuperado)}</span>
                    <span><strong>📈 Tasa recuperación:</strong> ${totalPerdido > 0 ? ((totalRecuperado / totalPerdido) * 100).toFixed(2) : 0}%</span>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
    `;
    
    registrosMostrar.forEach(registro => {
        const fecha = registro.getFechaFormateada ? registro.getFechaFormateada() : (registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-MX') : 'N/A');
        const tipoTexto = registro.getTipoEventoTexto ? registro.getTipoEventoTexto() : (registro.tipoEvento || 'N/A');
        const estadoTexto = registro.getEstadoTexto ? registro.getEstadoTexto() : (registro.estado || 'activo');
        
        let estadoClass = '';
        if (estadoTexto === 'Recuperado') estadoClass = '#10b981';
        else if (estadoTexto === 'Activo') estadoClass = '#ffc107';
        else estadoClass = '#6c757d';
        
        registrosHtml += `
            <div style="background: rgba(0,0,0,0.3); border-left: 3px solid ${estadoClass}; border-radius: 8px; padding: 12px; transition: all 0.2s ease; cursor: pointer;" 
                 onclick="window.verDetalleRegistroDesdeSweet('${registro.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                    <span style="font-family: monospace; font-size: 12px; color: #aaa;">${escapeHTML(registro.id)}</span>
                    <span style="background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 12px; font-size: 11px;">${fecha}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <strong style="color: white;">${escapeHTML(registro.nombreEmpresaCC || 'Sin asignar')}</strong>
                        <span style="color: #aaa; font-size: 12px; margin-left: 8px;">${tipoTexto}</span>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <span style="color: ${COLORS.rojo}; font-weight: 600;">${formatter.format(registro.montoPerdido || 0)}</span>
                        <span style="color: ${COLORS.verde}; font-weight: 600;">${formatter.format(registro.montoRecuperado || 0)}</span>
                    </div>
                </div>
                ${registro.narracionEventos ? `<div style="color: #aaa; font-size: 11px; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📝 ${escapeHTML(registro.narracionEventos.substring(0, 80))}${registro.narracionEventos.length > 80 ? '...' : ''}</div>` : ''}
            </div>
        `;
    });
    
    if (hayMas) {
        registrosHtml += `
            <div style="text-align: center; padding: 12px; color: #aaa; font-size: 12px;">
                ... y ${registros.length - 10} registros más. Haz clic en un registro para ver detalles completos.
            </div>
        `;
    }
    
    registrosHtml += `
            </div>
        </div>
    `;
    
    Swal.fire({
        title: `${icono} ${titulo}`,
        html: registrosHtml,
        width: '800px',
        background: 'var(--color-bg-primary)',
        color: 'white',
        showConfirmButton: true,
        confirmButtonText: '<i class="fas fa-check"></i> Cerrar',
        confirmButtonColor: '#28a745',
        showCancelButton: false,
        customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom'
        }
    });
}

// =============================================
// FUNCIÓN GLOBAL PARA VER DETALLE DE REGISTRO DESDE SWEET
// =============================================
window.verDetalleRegistroDesdeSweet = function(registroId) {
    // Cerrar SweetAlert actual
    Swal.close();
    
    // Buscar el registro en los datos actuales
    const registro = datosActuales.registros.find(r => r.id === registroId);
    
    if (!registro) {
        Swal.fire({
            icon: 'error',
            title: 'Registro no encontrado',
            text: 'No se pudo encontrar el registro seleccionado',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    // Mostrar modal de detalles (reutilizando la función existente si está disponible)
    if (typeof mostrarModalDetalles === 'function') {
        mostrarModalDetalles(registro);
    } else {
        // Fallback: mostrar Sweet con detalles básicos
        const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
        Swal.fire({
            title: `📋 Detalles del registro`,
            html: `
                <div style="text-align: left;">
                    <p><strong><i class="fas fa-building"></i> Empresa:</strong> ${escapeHTML(registro.nombreEmpresaCC || 'N/A')}</p>
                    <p><strong><i class="fas fa-calendar"></i> Fecha:</strong> ${registro.getFechaFormateada ? registro.getFechaFormateada() : 'N/A'}</p>
                    <p><strong><i class="fas fa-clock"></i> Hora:</strong> ${registro.hora || 'N/A'}</p>
                    <p><strong><i class="fas fa-tag"></i> Tipo:</strong> ${registro.getTipoEventoTexto ? registro.getTipoEventoTexto() : registro.tipoEvento}</p>
                    <p><strong><i class="fas fa-chart-line"></i> Estado:</strong> ${registro.getEstadoTexto ? registro.getEstadoTexto() : registro.estado}</p>
                    <p><strong><i class="fas fa-dollar-sign"></i> Monto perdido:</strong> ${formatter.format(registro.montoPerdido || 0)}</p>
                    <p><strong><i class="fas fa-undo-alt"></i> Monto recuperado:</strong> ${formatter.format(registro.montoRecuperado || 0)}</p>
                    <p><strong><i class="fas fa-file-alt"></i> Narración:</strong> ${escapeHTML(registro.narracionEventos?.substring(0, 200) || 'N/A')}${registro.narracionEventos?.length > 200 ? '...' : ''}</p>
                </div>
            `,
            width: '500px',
            background: 'var(--color-bg-primary)',
            color: 'white',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#28a745'
        });
    }
};

// =============================================
// ACTUALIZAR GRÁFICA VACÍA
// =============================================
function actualizarGraficaVacia() {
    const canvasIds = ['graficoTipoEvento', 'graficoEvolucionMensual', 'graficoTopSucursales', 'graficoComparativa'];
    
    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '12px "Rajdhani", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📊 Sin datos para mostrar', canvas.width / 2, canvas.height / 2);
        }
    });
}

// =============================================
// ACTUALIZAR TABLA DE RESUMEN
// =============================================
function actualizarTablaResumen(registros) {
    const tbody = document.getElementById('tablaResumenBody');
    if (!tbody) return;
    
    const sucursalesMap = {};
    
    registros.forEach(r => {
        const sucursal = r.nombreEmpresaCC || 'Sin asignar';
        if (!sucursalesMap[sucursal]) {
            sucursalesMap[sucursal] = {
                eventos: 0,
                perdido: 0,
                recuperado: 0
            };
        }
        sucursalesMap[sucursal].eventos++;
        sucursalesMap[sucursal].perdido += r.montoPerdido || 0;
        sucursalesMap[sucursal].recuperado += r.montoRecuperado || 0;
    });
    
    const sucursalesArray = Object.entries(sucursalesMap)
        .map(([nombre, datos]) => ({ 
            nombre, 
            ...datos,
            neto: datos.perdido - datos.recuperado,
            porcentaje: datos.perdido > 0 ? (datos.recuperado / datos.perdido) * 100 : 0
        }))
        .sort((a, b) => b.perdido - a.perdido);
    
    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    
    if (sucursalesArray.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">📭 No hay datos para mostrar con los filtros seleccionados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sucursalesArray.map(s => `
        <tr>
            <td title="${escapeHTML(s.nombre)}">${escapeHTML(s.nombre.length > 35 ? s.nombre.substring(0, 32) + '...' : s.nombre)}</td>
            <td>${s.eventos}</td>
            <td style="color: ${COLORS.rojo}; font-weight: 600;">${formatter.format(s.perdido)}</td>
            <td style="color: ${COLORS.verde}; font-weight: 600;">${formatter.format(s.recuperado)}</td>
            <td style="color: ${s.neto > 0 ? COLORS.rojo : COLORS.verde};">${formatter.format(s.neto)}</td>
            <td><span style="background: rgba(59,130,246,0.2); padding: 4px 8px; border-radius: 20px;">${s.porcentaje.toFixed(2)}%</span></td>
        </tr>
    `).join('');
}

// =============================================
// MOSTRAR CONTENEDORES
// =============================================
function mostrarContenedores() {
    const emptyState = document.getElementById('emptyState');
    const kpisContainer = document.getElementById('kpisContainer');
    const graficasContainer = document.getElementById('graficasContainer');
    
    if (emptyState) emptyState.style.display = 'none';
    if (kpisContainer) kpisContainer.style.display = 'grid';
    if (graficasContainer) graficasContainer.style.display = 'block';
}

function mostrarEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const kpisContainer = document.getElementById('kpisContainer');
    const graficasContainer = document.getElementById('graficasContainer');
    
    if (emptyState) emptyState.style.display = 'block';
    if (kpisContainer) kpisContainer.style.display = 'none';
    if (graficasContainer) graficasContainer.style.display = 'none';
}

function mostrarLoading() {
    const loadingIds = ['totalPerdidas', 'totalRecuperado', 'totalNeto', 'porcentajeRecuperacion', 'totalEventos', 'promedioPerdida'];
    loadingIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '...';
    });
}

// =============================================
// LIMPIAR FILTROS
// =============================================
function limpiarFiltros() {
    const filtroSucursal = document.getElementById('filtroSucursal');
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    const filtroTipoEvento = document.getElementById('filtroTipoEvento');
    const filtroEstado = document.getElementById('filtroEstado');
    
    if (filtroSucursal) filtroSucursal.value = 'todas';
    if (fechaInicio) fechaInicio.value = '';
    if (fechaFin) fechaFin.value = '';
    if (filtroTipoEvento) filtroTipoEvento.value = 'todos';
    if (filtroEstado) filtroEstado.value = 'todos';
    
    mostrarEmptyState();
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonText: 'Entendido',
        background: 'var(--color-bg-primary)',
        color: 'white'
    });
}

// =============================================
// CONFIGURAR EVENTOS
// =============================================
function configurarEventos() {
    const btnAplicar = document.getElementById('btnAplicarFiltros');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const btnEmptyAplicar = document.getElementById('btnEmptyAplicar');
    
    if (btnAplicar) btnAplicar.addEventListener('click', cargarRegistrosConFiltros);
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    if (btnEmptyAplicar) btnEmptyAplicar.addEventListener('click', cargarRegistrosConFiltros);
    
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    
    if (fechaInicio) fechaInicio.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') cargarRegistrosConFiltros();
    });
    
    if (fechaFin) fechaFin.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') cargarRegistrosConFiltros();
    });
}

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializarDashboard() {
    try {
        console.log('🚀 Inicializando Dashboard de Pérdidas...');
        
        await obtenerDatosOrganizacion();
        
        if (!organizacionActual?.camelCase) {
            console.error('No se pudo obtener la organización');
            mostrarEmptyState();
            return;
        }
        
        mercanciaManager = new MercanciaPerdidaManager();
        await cargarSucursales();
        configurarEventos();
        mostrarEmptyState();
        
        console.log('✅ Dashboard inicializado correctamente');
        
    } catch (error) {
        console.error('Error inicializando dashboard:', error);
        mostrarError('No se pudo cargar el dashboard');
        mostrarEmptyState();
    }
}

document.addEventListener('DOMContentLoaded', inicializarDashboard);