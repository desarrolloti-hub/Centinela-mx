// ========== panelControl.js - PANEL DE CONTROL CON DATOS REALES Y PERMISOS DINÁMICOS ==========
// VERSIÓN LIMPIA - Con permisos del plan como el navbar

import { UserManager } from '/clases/user.js';
import { IncidenciaManager } from '/clases/incidencia.js';
import { RegionManager } from '/clases/region.js';
import { SucursalManager } from '/clases/sucursal.js';
import { AreaManager } from '/clases/area.js';

// ========== VARIABLES GLOBALES ==========
let permisoManager = null;
let usuarioActual = null;
let permisosUsuario = null;
let permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] }; // 🔥 PERMISOS DEL PLAN

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

// ========== CONFIGURACIÓN DE NAVEGACIÓN PARA TARJETAS KPI ==========
const KPI_NAVEGACION = {
    'kpi-incidencias': {
        url: '/usuarios/administrador/incidencias/incidencias.html',
        titulo: 'Incidencias',
        modulo: 'incidencias',
        permisoRequerido: 'incidencias'
    },
    'kpi-regiones': {
        url: '/usuarios/colaboradores/regiones/regiones.html',
        titulo: 'Regiones',
        modulo: 'regiones',
        permisoRequerido: 'regiones'
    },
    'kpi-sucursales': {
        url: '/usuarios/administrador/sucursales/sucursales.html',
        titulo: 'Sucursales',
        modulo: 'sucursales',
        permisoRequerido: 'sucursales'
    },
    'kpi-areas': {
        url: '/usuarios/colaboradores/areas/areas.html',
        titulo: 'Áreas',
        modulo: 'areas',
        permisoRequerido: 'areas'
    },
    'kpi-cargos': {
        url: '/usuarios/colaboradores/areas/areas.html',
        titulo: 'Cargos',
        modulo: 'areas',
        permisoRequerido: 'areas'
    },
    'kpi-usuarios': {
        url: '/usuarios/administrador/usuarios/usuarios.html',
        titulo: 'Colaboradores',
        modulo: 'usuarios',
        permisoRequerido: 'usuarios'
    }
};

// ========== CONFIGURACIÓN DE TARJETAS DE ACCESO RÁPIDO ==========
const MODULOS_CONFIG = {
    'areas': {
        modulo: 'areas',
        selector: '[data-modulo="areas"]',
        url: '/usuarios/colaboradores/areas/areas.html',
        titulo: 'Áreas',
        descripcion: 'Gestionar áreas de la organización',
        permisoRequerido: 'areas'
    },
    'categorias': {
        modulo: 'categorias',
        selector: '[data-modulo="categorias"]',
        url: '/usuarios/administrador/categorias/categorias.html',
        titulo: 'Categorías',
        descripcion: 'Administrar categorías y subcategorías',
        permisoRequerido: 'categorias'
    },
    'sucursales': {
        modulo: 'sucursales',
        selector: '[data-modulo="sucursales"]',
        url: '/usuarios/administrador/sucursales/sucursales.html',
        titulo: 'Sucursales',
        descripcion: 'Gestionar sucursales activas',
        permisoRequerido: 'sucursales'
    },
    'regiones': {
        modulo: 'regiones',
        selector: '[data-modulo="regiones"]',
        url: '/usuarios/colaboradores/regiones/regiones.html',
        titulo: 'Regiones',
        descripcion: 'Administrar regiones geográficas',
        permisoRequerido: 'regiones'
    },
    'incidencias': {
        modulo: 'incidencias',
        selector: '[data-modulo="incidencias"]',
        url: '/usuarios/administrador/incidencias/incidencias.html',
        titulo: 'Incidencias',
        descripcion: 'Gestionar reportes de incidencias',
        permisoRequerido: 'incidencias',
        subPermisoRequerido: 'listaIncidencias' // 🔥 Permiso específico dentro de incidencias
    },
    'nuevaIncidencia': {
        modulo: 'incidencias',
        selector: '#card-nueva-incidencia',
        url: '/usuarios/administrador/crearIncidencias/crearIncidencias.html',
        titulo: 'Nueva Incidencia',
        descripcion: 'Crear nuevo reporte de incidencia',
        permisoRequerido: 'incidencias',
        subPermisoRequerido: 'crearIncidencias' // 🔥 Permiso específico
    },
    'nuevoUsuario': {
        modulo: 'usuarios',
        selector: '#card-nuevo-usuario',
        url: '/usuarios/administrador/crearUsuarios/crearUsuarios.html',
        titulo: 'Nuevo Colaborador',
        descripcion: 'Crear nueva cuenta de usuario',
        permisoRequerido: 'usuarios',
        requiereAdmin: true
    },
    'bitacora': {
        modulo: 'bitacora',
        selector: '#card-bitacora',
        url: '/usuarios/administrador/bitacoraActividades/bitacoraActividades.html',
        titulo: 'Bitácora',
        descripcion: 'Ver historial de actividades',
        permisoRequerido: 'bitacora',
        siempreVisible: true // Siempre visible para admins
    },
    'mapaAlertas': {
        modulo: 'monitoreo',
        selector: '#card-mapa-alertas',
        url: '/usuarios/administrador/mapaAlertas/mapaAlertas.html',
        titulo: 'Mapa de Alertas',
        descripcion: 'Monitoreo en tiempo real',
        permisoRequerido: 'monitoreo'
    },
    'estadisticas': {
        modulo: 'incidencias',
        selector: '.dashboard-card[data-modulo="incidencias"] .card-icon.cyan .fa-chart-pie',
        url: '/estadisticas/',
        titulo: 'Estadísticas'
    },
    'tiposIncidencia': {
        modulo: 'categorias',
        selector: '.dashboard-card[data-modulo="categorias"] .card-icon.blue .fa-list-check',
        url: '/categorias/',
        titulo: 'Tipos de Incidencia'
    },
    'rolesPermisos': {
        modulo: 'permisos',
        selector: '.dashboard-card[data-modulo="permisos"]',
        url: '/permisos/',
        titulo: 'Roles y Permisos',
        requiereAdmin: true
    },
    'backup': {
        modulo: 'admin',
        selector: '.dashboard-card[data-modulo="admin"] .card-icon.yellow .fa-database',
        url: '/backup/',
        titulo: 'Backup del Sistema',
        requiereAdmin: true
    },
    'configuracion': {
        modulo: 'admin',
        selector: '.dashboard-card[data-modulo="admin"] .card-icon.purple .fa-sliders',
        url: '/configuracion/',
        titulo: 'Configuración General',
        requiereAdmin: true
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

        // 🔥 CARGAR PERMISOS DEL PLAN (igual que en navbar)
        await cargarPermisosDelPlan();

        try {
            const { PermisoManager } = await import('/clases/permiso.js');
            permisoManager = new PermisoManager();
            if (usuarioActual.organizacionCamelCase) {
                permisoManager.organizacionCamelCase = usuarioActual.organizacionCamelCase;
            }
        } catch (error) {
            // PermisoManager no disponible
        }

        await cargarTodasLasEstadisticas();
        await obtenerPermisosUsuario();
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

// ========== 🔥 CARGAR PERMISOS DEL PLAN DESDE FIRESTORE ==========
async function cargarPermisosDelPlan() {
    try {
        if (!usuarioActual || !usuarioActual.id) {
            console.log('⚠️ No hay usuario cargado para obtener permisos');
            permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] };
            return;
        }

        const planId = usuarioActual.plan;
        
        if (!planId || planId === 'sin-plan' || planId === 'gratis') {
            console.log('📋 Usuario sin plan asignado o con plan gratis');
            permisosPlan = { incidencias: false, monitoreo: false, permisosIncidencias: [] };
            return;
        }

        const { PlanPersonalizadoManager } = await import('/clases/plan.js');
        const planManager = new PlanPersonalizadoManager();
        const plan = await planManager.obtenerPorId(planId);
        
        if (!plan) {
            console.warn(`⚠️ Plan "${planId}" no encontrado`);
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
        
        console.log('🎯 Permisos del plan cargados en panel:', permisosPlan);
        
    } catch (error) {
        console.error('❌ Error cargando permisos del plan:', error);
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

    } catch (error) {
        // Error silencioso
    }
}

// ========== CARGAR INCIDENCIAS ==========
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

// ========== CARGAR REGIONES ==========
async function cargarRegiones(organizacion) {
    try {
        const regiones = await regionManager.getRegionesByOrganizacion(organizacion);
        estadisticas.regiones = regiones.length;
    } catch (error) {
        estadisticas.regiones = 0;
    }
}

// ========== CARGAR SUCURSALES ==========
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

// ========== CARGAR ÁREAS Y CARGOS ==========
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

// ========== CARGAR USUARIOS ==========
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

// ========== REFRESCAR ESTADÍSTICAS ==========
async function refrescarEstadisticas() {
    await cargarTodasLasEstadisticas();
    actualizarUI();
}

// ========== OBTENER PERMISOS DEL USUARIO ==========
async function obtenerPermisosUsuario() {
    try {
        if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
            permisosUsuario = {
                areas: true, categorias: true, sucursales: true,
                regiones: true, incidencias: true, usuarios: true,
                permisos: true, admin: true, monitoreo: true, bitacora: true
            };
            return;
        }

        if (!usuarioActual.areaAsignadaId || !usuarioActual.cargoId) {
            permisosUsuario = {
                areas: false, categorias: false, sucursales: false,
                regiones: false, incidencias: true, usuarios: false,
                permisos: false, admin: false, monitoreo: false, bitacora: false
            };
            return;
        }

        if (permisoManager) {
            try {
                const permiso = await permisoManager.obtenerPorCargoYArea(
                    usuarioActual.cargoId,
                    usuarioActual.areaAsignadaId,
                    usuarioActual.organizacionCamelCase
                );

                if (permiso) {
                    permisosUsuario = {
                        areas: permiso.puedeAcceder('areas'),
                        categorias: permiso.puedeAcceder('categorias'),
                        sucursales: permiso.puedeAcceder('sucursales'),
                        regiones: permiso.puedeAcceder('regiones'),
                        incidencias: permiso.puedeAcceder('incidencias'),
                        usuarios: false, permisos: false, admin: false,
                        monitoreo: false, bitacora: false
                    };
                    return;
                }
            } catch (error) {
                // Error silencioso
            }
        }

        permisosUsuario = {
            areas: false, categorias: false, sucursales: false,
            regiones: false, incidencias: true, usuarios: false,
            permisos: false, admin: false, monitoreo: false, bitacora: false
        };

    } catch (error) {
        permisosUsuario = {
            areas: false, categorias: false, sucursales: false,
            regiones: false, incidencias: true, usuarios: false,
            permisos: false, admin: false, monitoreo: false, bitacora: false
        };
    }
}

// ========== 🔥 VERIFICAR PERMISO DE MÓDULO CON PERMISOS DEL PLAN ==========
function tienePermisoModulo(config) {
    // Admin o Master siempre tienen acceso
    if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
        return true;
    }
    
    // Si requiere admin y no es admin, false
    if (config.requiereAdmin) {
        return false;
    }
    
    // Si es siempre visible
    if (config.siempreVisible) {
        return true;
    }
    
    const permisoRequerido = config.permisoRequerido;
    
    // Verificar permisos del plan (para módulos como incidencias y monitoreo)
    if (permisoRequerido === 'incidencias') {
        if (!permisosPlan.incidencias) return false;
        
        // Si tiene subpermiso específico, verificarlo
        if (config.subPermisoRequerido) {
            return permisosPlan.permisosIncidencias.includes(config.subPermisoRequerido);
        }
        return true;
    }
    
    if (permisoRequerido === 'monitoreo') {
        return permisosPlan.monitoreo === true;
    }
    
    // Para otros módulos, usar permisosUsuario
    if (permisoRequerido && permisosUsuario) {
        return permisosUsuario[permisoRequerido] === true;
    }
    
    return false;
}

// ========== FILTRAR TARJETAS POR PERMISOS ==========
function filtrarTarjetasPorPermisos() {
    if (!permisosUsuario) return;

    Object.entries(MODULOS_CONFIG).forEach(([key, config]) => {
        const tarjeta = document.querySelector(config.selector);
        if (!tarjeta) return;

        const debeMostrarse = tienePermisoModulo(config);

        if (debeMostrarse) {
            tarjeta.style.display = 'flex';
            tarjeta.dataset.url = config.url;
            tarjeta.dataset.titulo = config.titulo;
            tarjeta.dataset.modulo = config.modulo;
            if (config.requiereAdmin) {
                tarjeta.dataset.requiereAdmin = 'true';
            }
        } else {
            tarjeta.style.display = 'none';
        }
    });
    
    // También filtrar KPI según permisos
    filtrarKPIPorPermisos();
}

// ========== 🔥 FILTRAR KPI SEGÚN PERMISOS DEL PLAN ==========
function filtrarKPIPorPermisos() {
    Object.entries(KPI_NAVEGACION).forEach(([id, config]) => {
        const kpiCard = document.getElementById(id);
        if (!kpiCard) return;
        
        let debeMostrarse = false;
        
        // Admin o Master siempre ven todo
        if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
            debeMostrarse = true;
        } else {
            const permisoRequerido = config.permisoRequerido;
            
            if (permisoRequerido === 'incidencias') {
                debeMostrarse = permisosPlan.incidencias === true;
            } else if (permisoRequerido === 'monitoreo') {
                debeMostrarse = permisosPlan.monitoreo === true;
            } else if (permisoRequerido && permisosUsuario) {
                debeMostrarse = permisosUsuario[permisoRequerido] === true;
            }
        }
        
        kpiCard.style.display = debeMostrarse ? 'flex' : 'none';
    });
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
}

function manejarClickKPI(e, config) {
    e.preventDefault();
    e.stopPropagation();

    // Verificar permisos del plan para KPI
    let tieneAcceso = false;
    
    if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
        tieneAcceso = true;
    } else {
        const permisoRequerido = config.permisoRequerido;
        
        if (permisoRequerido === 'incidencias') {
            tieneAcceso = permisosPlan.incidencias === true;
        } else if (permisoRequerido === 'monitoreo') {
            tieneAcceso = permisosPlan.monitoreo === true;
        } else if (permisoRequerido && permisosUsuario) {
            tieneAcceso = permisosUsuario[permisoRequerido] === true;
        }
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
    permisosUsuario,
    permisosPlan,
    KPI_NAVEGACION
};