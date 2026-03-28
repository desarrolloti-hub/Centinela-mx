// ========== panelControl.js - PANEL DE CONTROL CON DATOS REALES Y PERMISOS DINÁMICOS ==========
// VERSIÓN COMPLETA: KPI funcionando + Acceso Rápido dinámico según permisos del plan
// MODIFICADO: La tarjeta de Cargos NO es clickeable

import { UserManager } from '/clases/user.js';
import { IncidenciaManager } from '/clases/incidencia.js';
import { RegionManager } from '/clases/region.js';
import { SucursalManager } from '/clases/sucursal.js';
import { AreaManager } from '/clases/area.js';

// ========== VARIABLES GLOBALES ==========
let usuarioActual = null;
let permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] };

// Managers principales
const userManager = new UserManager();
const incidenciaManager = new IncidenciaManager();
const regionManager = new RegionManager();
const sucursalManager = new SucursalManager();
const areaManager = new AreaManager();

// Estadísticas del panel
let estadisticas = {
    incidencias: 0,
    regiones: 0,
    sucursales: 0,
    areas: 0,
    cargos: 0,
    usuarios: 0,
    incidenciasPendientes: 0,
    usuariosActivos: 0,
    sucursalesActivas: 0,
    eficiencia: 0
};

// ========== CONFIGURACIÓN DE TARJETAS DE ACCESO RÁPIDO ==========
const MODULOS_CONFIG = {
    'incidenciasLista': {
        selector: '#card-incidencias-lista',
        url: '/usuarios/administrador/incidencias/incidencias.html',
        titulo: 'Incidencias',
        permisoRequerido: 'incidencias',
        subPermisoRequerido: 'listaIncidencias'
    },
    'nuevaIncidencia': {
        selector: '#card-nueva-incidencia',
        url: '/usuarios/administrador/crearIncidencias/crearIncidencias.html',
        titulo: 'Nueva Incidencia',
        permisoRequerido: 'incidencias',
        subPermisoRequerido: 'crearIncidencias'
    },
    'mapaAlertas': {
        selector: '#card-mapa-alertas',
        url: '/usuarios/administrador/mapaAlertas/mapaAlertas.html',
        titulo: 'Mapa de Alertas',
        permisoRequerido: 'monitoreo'
    }
};

// ========== CONFIGURACIÓN DE NAVEGACIÓN PARA TARJETAS KPI ==========
// NOTA: La tarjeta de CARGOS (kpi-cargos) NO tiene evento de click
const KPI_NAVEGACION = {
    'kpi-incidencias': {
        url: '/usuarios/administrador/incidencias/incidencias.html',
        titulo: 'Incidencias',
        permisoRequerido: 'incidencias'
    },
    'kpi-regiones': {
        url: '/usuarios/colaboradores/regiones/regiones.html',
        titulo: 'Regiones',
        permisoRequerido: 'regiones'
    },
    'kpi-sucursales': {
        url: '/usuarios/administrador/sucursales/sucursales.html',
        titulo: 'Sucursales',
        permisoRequerido: 'sucursales'
    },
    'kpi-areas': {
        url: '/usuarios/colaboradores/areas/areas.html',
        titulo: 'Áreas',
        permisoRequerido: 'areas'
    },
    // kpi-cargos NO está incluido en la navegación (no es clickeable)
    'kpi-usuarios': {
        url: '/usuarios/administrador/usuarios/usuarios.html',
        titulo: 'Colaboradores',
        permisoRequerido: 'usuarios'
    }
};

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function () {
    try {
        mostrarEstadoCarga();

        await esperarAutenticacion();
        usuarioActual = userManager.currentUser;

        if (!usuarioActual) {
            mostrarErrorSesion();
            return;
        }

        // Cargar permisos del plan (igual que en navbar)
        await cargarPermisosDelPlan();

        await cargarTodasLasEstadisticas();

        // Filtrar tarjetas de acceso rápido según permisos
        filtrarTarjetasPorPermisos();

        configurarEventosTarjetas();
        configurarEventosKPI();
        actualizarUI();

        ocultarEstadoCarga();

        setInterval(refrescarEstadisticas, 5 * 60 * 1000);

    } catch (error) {
        ocultarEstadoCarga();
        mostrarError(error.message);
    }
});

// ========== CARGAR PERMISOS DEL PLAN DESDE FIRESTORE ==========
async function cargarPermisosDelPlan() {
    try {
        if (!usuarioActual || !usuarioActual.id) {
            permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] };
            return;
        }

        const planId = usuarioActual.plan;

        if (!planId || planId === 'sin-plan' || planId === 'gratis') {
            permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] };
            return;
        }

        const { PlanPersonalizadoManager } = await import('/clases/plan.js');
        const planManager = new PlanPersonalizadoManager();
        const plan = await planManager.obtenerPorId(planId);

        if (!plan) {
            permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] };
            return;
        }

        const mapasActivos = plan.mapasActivos;
        const tieneIncidencias = mapasActivos.incidencias === true;
        const tieneMonitoreo = mapasActivos.alertas === true;

        const permisosIncidencias = [];

        if (tieneIncidencias) {
            const moduloIncidencias = plan.obtenerMapasCompletos?.().find(m => m.id === 'incidencias');
            if (moduloIncidencias && moduloIncidencias.permisosActivos) {
                moduloIncidencias.permisosActivos.forEach(permiso => {
                    permisosIncidencias.push(permiso.id);
                });
            }
        }

        permisosPlan = {
            incidencias: tieneIncidencias,
            monitoreo: tieneMonitoreo,
            permisosIncidencias: permisosIncidencias
        };

    } catch (error) {
        permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] };
    }
}

// ========== ESPERAR AUTENTICACIÓN ==========
async function esperarAutenticacion(timeout = 10000) {
    const startTime = Date.now();
    while (!userManager.currentUser) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Tiempo de espera agotado esperando autenticación');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// ========== CARGAR TODAS LAS ESTADÍSTICAS ==========
async function cargarTodasLasEstadisticas() {
    try {
        const organizacion = usuarioActual.organizacionCamelCase;
        if (!organizacion) return;

        await Promise.all([
            cargarIncidencias(organizacion),
            cargarRegiones(organizacion),
            cargarSucursales(organizacion),
            cargarAreasYCargos(organizacion),
            cargarUsuarios(organizacion)
        ]);

    } catch (error) { }
}

async function cargarIncidencias(organizacion) {
    try {
        const incidencias = await incidenciaManager.getIncidenciasByOrganizacion(organizacion);
        estadisticas.incidencias = incidencias.length;
        estadisticas.incidenciasPendientes = incidencias.filter(i => i.estado === 'pendiente').length;
        const finalizadas = incidencias.filter(i => i.estado === 'finalizada').length;
        estadisticas.eficiencia = incidencias.length > 0 ? Math.round((finalizadas / incidencias.length) * 100) : 0;
    } catch (error) {
        estadisticas.incidencias = 0;
        estadisticas.incidenciasPendientes = 0;
        estadisticas.eficiencia = 0;
    }
}

async function cargarRegiones(organizacion) {
    try {
        const regiones = await regionManager.getRegionesByOrganizacion(organizacion);
        estadisticas.regiones = regiones.length;
    } catch (error) {
        estadisticas.regiones = 0;
    }
}

async function cargarSucursales(organizacion) {
    try {
        const sucursales = await sucursalManager.getSucursalesByOrganizacion(organizacion);
        estadisticas.sucursales = sucursales.length;
        estadisticas.sucursalesActivas = sucursales.filter(s => s.estado !== 'inactiva').length;
    } catch (error) {
        estadisticas.sucursales = 0;
        estadisticas.sucursalesActivas = 0;
    }
}

async function cargarAreasYCargos(organizacion) {
    try {
        const areas = await areaManager.getAreasByOrganizacion(organizacion);
        estadisticas.areas = areas.length;
        let totalCargos = 0;
        areas.forEach(area => {
            totalCargos += area.getCantidadCargosTotal();
        });
        estadisticas.cargos = totalCargos;
    } catch (error) {
        estadisticas.areas = 0;
        estadisticas.cargos = 0;
    }
}

async function cargarUsuarios(organizacion) {
    try {
        let totalUsuarios = 0;
        const administradores = await userManager.getAdministradores(true);
        const adminsOrganizacion = administradores.filter(admin => admin.organizacionCamelCase === organizacion);
        const adminsExcluyendoActual = adminsOrganizacion.filter(admin => admin.id !== usuarioActual.id).length;
        totalUsuarios += adminsExcluyendoActual;
        const colaboradores = await userManager.getColaboradoresByOrganizacion(organizacion, true);
        totalUsuarios += colaboradores.length;
        const usuariosActivos = adminsOrganizacion.filter(a => a.estaActivo()).length + colaboradores.filter(c => c.estaActivo()).length;
        estadisticas.usuarios = totalUsuarios;
        estadisticas.usuariosActivos = usuariosActivos;
    } catch (error) {
        estadisticas.usuarios = 0;
        estadisticas.usuariosActivos = 0;
    }
}

// ========== ACTUALIZAR UI ==========
function actualizarUI() {
    const totalIncidencias = document.getElementById('total-incidencias');
    if (totalIncidencias) totalIncidencias.textContent = estadisticas.incidencias;

    const totalRegiones = document.getElementById('total-regiones');
    if (totalRegiones) totalRegiones.textContent = estadisticas.regiones;

    const totalSucursales = document.getElementById('total-sucursales');
    if (totalSucursales) totalSucursales.textContent = estadisticas.sucursales;

    const totalAreas = document.getElementById('total-areas');
    if (totalAreas) totalAreas.textContent = estadisticas.areas;

    const totalCargos = document.getElementById('total-cargos');
    if (totalCargos) totalCargos.textContent = estadisticas.cargos;

    const totalUsuarios = document.getElementById('total-usuarios');
    if (totalUsuarios) totalUsuarios.textContent = estadisticas.usuarios;

    const kpiIncidenciasPendientes = document.getElementById('kpi-incidencias-pendientes');
    if (kpiIncidenciasPendientes) kpiIncidenciasPendientes.textContent = estadisticas.incidenciasPendientes;

    const kpiUsuariosActivos = document.getElementById('kpi-usuarios-activos');
    if (kpiUsuariosActivos) kpiUsuariosActivos.textContent = estadisticas.usuariosActivos;

    const kpiSucursalesActivas = document.getElementById('kpi-sucursales-activas');
    if (kpiSucursalesActivas) kpiSucursalesActivas.textContent = estadisticas.sucursalesActivas;

    const kpiEficiencia = document.getElementById('kpi-eficiencia');
    if (kpiEficiencia) kpiEficiencia.textContent = estadisticas.eficiencia + '%';
}

async function refrescarEstadisticas() {
    await cargarTodasLasEstadisticas();
    actualizarUI();
}

// ========== VERIFICAR PERMISO DE MÓDULO ==========
function tienePermisoModulo(config) {
    const permisoRequerido = config.permisoRequerido;

    if (permisoRequerido === 'incidencias') {
        if (!permisosPlan.incidencias) return false;
        if (config.subPermisoRequerido) {
            return permisosPlan.permisosIncidencias.includes(config.subPermisoRequerido);
        }
        return true;
    }

    if (permisoRequerido === 'monitoreo') {
        return permisosPlan.monitoreo === true;
    }

    return false;
}

// ========== FILTRAR TARJETAS DE ACCESO RÁPIDO POR PERMISOS ==========
function filtrarTarjetasPorPermisos() {
    let tarjetasVisibles = 0;

    Object.entries(MODULOS_CONFIG).forEach(([key, config]) => {
        const tarjeta = document.querySelector(config.selector);
        if (!tarjeta) return;

        const debeMostrarse = tienePermisoModulo(config);

        if (debeMostrarse) {
            tarjeta.style.display = 'flex';
            tarjeta.dataset.url = config.url;
            tarjetasVisibles++;
        } else {
            tarjeta.style.display = 'none';
        }
    });

    // También filtrar KPI según permisos
    filtrarKPIPorPermisos();
}

// ========== FILTRAR KPI SEGÚN PERMISOS DEL PLAN ==========
function filtrarKPIPorPermisos() {
    Object.entries(KPI_NAVEGACION).forEach(([id, config]) => {
        const kpiCard = document.getElementById(id);
        if (!kpiCard) return;

        let debeMostrarse = false;
        const permisoRequerido = config.permisoRequerido;

        if (permisoRequerido === 'incidencias') {
            debeMostrarse = permisosPlan.incidencias === true;
        } else if (permisoRequerido === 'monitoreo') {
            debeMostrarse = permisosPlan.monitoreo === true;
        } else {
            // Para módulos que no están en el plan (regiones, sucursales, áreas, usuarios)
            debeMostrarse = true;
        }

        kpiCard.style.display = debeMostrarse ? 'flex' : 'none';
    });

    // ========== TARJETA DE CARGOS - NO CLICKEABLE ==========
    const tarjetaCargos = document.getElementById('kpi-cargos');
    if (tarjetaCargos) {
        // Remover cursor pointer
        tarjetaCargos.style.cursor = 'default';
        // Remover evento de click si existe (se configura después en configurarEventosKPI)
    }
}

// ========== CONFIGURAR EVENTOS DE LAS TARJETAS ==========
function configurarEventosTarjetas() {
    const tarjetas = document.querySelectorAll('.dashboard-card');
    tarjetas.forEach(tarjeta => {
        tarjeta.removeEventListener('click', manejarClickTarjeta);
        tarjeta.addEventListener('click', manejarClickTarjeta);
    });
}

function manejarClickTarjeta(e) {
    e.preventDefault();
    e.stopPropagation();
    const tarjeta = e.currentTarget;
    const url = tarjeta.dataset.url;
    if (url) {
        window.location.href = url;
    }
}

// ========== CONFIGURAR EVENTOS DE LAS TARJETAS KPI ==========
function configurarEventosKPI() {
    Object.entries(KPI_NAVEGACION).forEach(([id, config]) => {
        const tarjeta = document.getElementById(id);
        if (tarjeta) {
            tarjeta.style.cursor = 'pointer';
            tarjeta.removeEventListener('click', manejarClickKPI);
            tarjeta.addEventListener('click', (e) => manejarClickKPI(e, config));
        }
    });

    // ========== TARJETA DE CARGOS - SIN EVENTO DE CLICK ==========
    const tarjetaCargos = document.getElementById('kpi-cargos');
    if (tarjetaCargos) {
        tarjetaCargos.style.cursor = 'default';
        // Asegurar que no tenga evento de click
        tarjetaCargos.removeEventListener('click', manejarClickKPI);
        // También prevenir cualquier click que pueda propagarse
        tarjetaCargos.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // No hacer nada, solo evitar la navegación
        });
    }
}

function manejarClickKPI(e, config) {
    e.preventDefault();
    e.stopPropagation();

    let tieneAcceso = false;
    const permisoRequerido = config.permisoRequerido;

    if (permisoRequerido === 'incidencias') {
        tieneAcceso = permisosPlan.incidencias === true;
    } else if (permisoRequerido === 'monitoreo') {
        tieneAcceso = permisosPlan.monitoreo === true;
    } else {
        // Para otros módulos, permitir acceso
        tieneAcceso = true;
    }

    if (!tieneAcceso) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Acceso Denegado',
                text: `No tienes permisos para acceder a ${config.titulo}. Contacta al administrador.`,
                icon: 'warning',
                confirmButtonColor: '#ff4d00',
                background: '#1a1a1a',
                color: '#fff'
            });
        }
        return;
    }

    window.location.href = config.url;
}

// ========== ESTADOS DE CARGA Y ERROR ==========
function mostrarEstadoCarga() {
    if (!document.getElementById('loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease;
        `;
        overlay.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #c0c0c0; margin-bottom: 16px;"></i>
                <h3 style="color: white; font-family: 'Orbitron', sans-serif;">CARGANDO PANEL</h3>
                <p style="color: #a5a5a5;">Cargando estadísticas...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

function ocultarEstadoCarga() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }
}

function mostrarErrorSesion() {
    ocultarEstadoCarga();
    const container = document.querySelector('.right-layout');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-user-slash" style="font-size: 64px; color: #ff4d4d; margin-bottom: 20px;"></i>
                <h2 style="color: white;">SESIÓN NO DETECTADA</h2>
                <p style="color: #a5a5a5; margin: 20px 0;">Inicia sesión para acceder al panel</p>
                <button onclick="window.location.href='/usuarios/visitantes/inicioSesion/inicioSesion.html'" 
                    style="background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
                           border: 1px solid #c0c0c0;
                           color: white;
                           padding: 12px 24px;
                           border-radius: 8px;
                           cursor: pointer;
                           font-family: 'Orbitron', sans-serif;">
                    <i class="fas fa-sign-in-alt"></i> INICIAR SESIÓN
                </button>
            </div>
        `;
    }
}

function mostrarError(mensaje) {
    ocultarEstadoCarga();
    const container = document.querySelector('.right-layout');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 64px; color: #ff4d4d; margin-bottom: 20px;"></i>
                <h2 style="color: white;">ERROR</h2>
                <p style="color: #a5a5a5; margin: 20px 0;">${escapeHTML(mensaje)}</p>
                <button onclick="window.location.reload()" 
                    style="background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
                           border: 1px solid #c0c0c0;
                           color: white;
                           padding: 12px 24px;
                           border-radius: 8px;
                           cursor: pointer;
                           font-family: 'Orbitron', sans-serif;">
                    <i class="fas fa-sync-alt"></i> REINTENTAR
                </button>
            </div>
        `;
    }
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exponer para debugging
window.panelDebug = {
    userManager,
    incidenciaManager,
    regionManager,
    sucursalManager,
    areaManager,
    usuarioActual,
    estadisticas,
    permisosPlan,
    MODULOS_CONFIG,
    KPI_NAVEGACION
};