// ========== panelControl.js - ADMINISTRADOR CON FILTRO POR PLAN (OPTIMIZADO) ==========

import { UserManager } from '/clases/user.js';
import { IncidenciaManager } from '/clases/incidencia.js';
import { RegionManager } from '/clases/region.js';
import { SucursalManager } from '/clases/sucursal.js';
import { AreaManager } from '/clases/area.js';
import { PlanPersonalizadoManager } from '/clases/plan.js';

let usuarioActual = null;
let planUsuario = null;
let mapasActivos = {
    incidencias: false,
    alertas: false
};
let datosCargados = false;

const userManager = new UserManager();
const planManager = new PlanPersonalizadoManager();
const incidenciaManager = new IncidenciaManager();
const regionManager = new RegionManager();
const sucursalManager = new SucursalManager();
const areaManager = new AreaManager();

let estadisticas = {
    incidencias: 0,
    incidenciasDiarias: 0,
    regiones: 0,
    sucursales: 0,
    areas: 0,
    usuarios: 0
};

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // 1. Ocultar contenido inicialmente
        ocultarContenido();

        // 2. Intentar cargar usuario desde localStorage PRIMERO (más rápido)
        const usuarioLocal = cargarUsuarioDesdeStorage();

        if (usuarioLocal) {
            usuarioActual = usuarioLocal;
            // Si tenemos usuario en localStorage, cargamos el plan rápidamente
            await cargarPlanUsuarioRapido();

            // Si el plan ya está en localStorage, mostramos contenido inmediatamente
            if (mapasActivos.incidencias !== undefined || mapasActivos.alertas !== undefined) {
                await renderizarDashboardRapido();
                mostrarContenido();
            }
        }

        // 3. Esperar autenticación completa en segundo plano
        await esperarAutenticacion(5000);
        const usuarioFirebase = userManager.currentUser;

        if (!usuarioFirebase) {
            // Si no hay usuario en Firebase pero tenemos uno local, mantenemos lo mostrado
            if (!usuarioLocal) {
                mostrarErrorSesion();
            }
            return;
        }

        // 4. Si el usuario de Firebase es diferente al local, actualizar
        if (!usuarioLocal || usuarioFirebase.id !== usuarioLocal.id) {
            usuarioActual = usuarioFirebase;
            await cargarPlanUsuario();
            await renderizarDashboardCompleto();
            mostrarContenido();
        } else {
            // Si ya estábamos mostrando, solo actualizar estadísticas
            await cargarTodasLasEstadisticas();
            actualizarUI();
        }

        // 5. Configurar eventos (ya configurados en renderizado rápido, pero asegurar)
        configurarEventosTarjetas();
        configurarEventosKPI();

        // 6. Intervalo para actualizar estadísticas
        setInterval(async () => {
            if (usuarioActual) {
                await cargarTodasLasEstadisticas();
                actualizarUI();
            }
        }, 5 * 60 * 1000);

    } catch (error) {
        console.error('Error:', error);
        // Si ya hay contenido mostrado, no mostrar error
        if (!datosCargados) {
            mostrarError(error.message);
        }
    }
});

// ========== CARGA RÁPIDA DESDE LOCALSTORAGE ==========
function cargarUsuarioDesdeStorage() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData && Object.keys(userData).length > 0) {
            return {
                id: userData.id || userData.uid || 'usuario',
                uid: userData.uid || userData.id || 'usuario',
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                correo: userData.correoElectronico || userData.correo || '',
                organizacion: userData.organizacion || 'Mi Organización',
                organizacionCamelCase: userData.organizacionCamelCase || '',
                planId: userData.planId || userData.planNombre || userData.plan || null,
                rol: userData.rol || 'administrador'
            };
        }
        return null;
    } catch (error) {
        console.error('Error cargando usuario desde storage:', error);
        return null;
    }
}

// ========== CARGAR PLAN RÁPIDO (desde cache/localStorage) ==========
async function cargarPlanUsuarioRapido() {
    try {
        // Intentar obtener plan desde localStorage cache
        const planCache = localStorage.getItem('planCache');
        if (planCache) {
            const planData = JSON.parse(planCache);
            // Verificar si el cache es reciente (menos de 1 hora)
            if (planData.timestamp && (Date.now() - planData.timestamp) < 3600000) {
                mapasActivos = planData.mapasActivos || { incidencias: true, alertas: true };
                planUsuario = planData.plan;
                console.log('Plan cargado desde cache:', mapasActivos);
                return;
            }
        }

        // Si no hay cache o expiró, intentar obtener el planId
        let planId = usuarioActual.planId;
        if (!planId) {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            planId = userData.planId || userData.planNombre || userData.plan;
        }

        if (!planId) {
            mapasActivos = { incidencias: true, alertas: true };
            return;
        }

        // Intentar obtener el plan de Firestore (rápido)
        const plan = await planManager.obtenerPorId(planId);
        if (plan) {
            planUsuario = plan;
            mapasActivos = plan.mapasActivos || { incidencias: false, alertas: false };

            // Guardar en cache
            localStorage.setItem('planCache', JSON.stringify({
                plan: plan,
                mapasActivos: mapasActivos,
                timestamp: Date.now()
            }));
        } else {
            mapasActivos = { incidencias: true, alertas: true };
        }
    } catch (error) {
        console.warn('Error en carga rápida del plan:', error);
        mapasActivos = { incidencias: true, alertas: true };
    }
}

// ========== CARGAR PLAN COMPLETO (con validación) ==========
async function cargarPlanUsuario() {
    try {
        let planId = usuarioActual.planId || usuarioActual.planNombre;

        if (!planId) {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            planId = userData.planId || userData.planNombre || userData.plan;
        }

        if (!planId) {
            console.warn('No se encontró plan asignado, usando plan por defecto');
            mapasActivos = { incidencias: true, alertas: true };
            return;
        }

        const plan = await planManager.obtenerPorId(planId);

        if (plan) {
            planUsuario = plan;
            mapasActivos = plan.mapasActivos || { incidencias: false, alertas: false };
            console.log(`Plan cargado: ${plan.nombre}`, mapasActivos);

            // Actualizar cache
            localStorage.setItem('planCache', JSON.stringify({
                plan: plan,
                mapasActivos: mapasActivos,
                timestamp: Date.now()
            }));
        } else {
            console.warn(`Plan con ID "${planId}" no encontrado, usando plan por defecto`);
            mapasActivos = { incidencias: true, alertas: true };
        }

    } catch (error) {
        console.error('Error cargando plan del usuario:', error);
        mapasActivos = { incidencias: true, alertas: true };
    }
}

// ========== RENDERIZADO RÁPIDO (sin esperar estadísticas) ==========
async function renderizarDashboardRapido() {
    try {
        aplicarFiltroPorPlan();
        configurarEventosTarjetas();
        configurarEventosKPI();
        datosCargados = true;
    } catch (error) {
        console.warn('Error en renderizado rápido:', error);
    }
}

// ========== RENDERIZADO COMPLETO (con estadísticas) ==========
async function renderizarDashboardCompleto() {
    try {
        aplicarFiltroPorPlan();
        configurarEventosTarjetas();
        configurarEventosKPI();
        await cargarTodasLasEstadisticas();
        actualizarUI();
        datosCargados = true;
    } catch (error) {
        console.warn('Error en renderizado completo:', error);
    }
}

// ========== FUNCIONES DE CONTROL DE VISIBILIDAD ==========
function ocultarContenido() {
    const rightLayout = document.querySelector('.right-layout');
    if (rightLayout) {
        rightLayout.style.display = 'none';
    }
}

function mostrarContenido() {
    const rightLayout = document.querySelector('.right-layout');
    if (rightLayout) {
        rightLayout.style.display = 'block';
    }
}

// ========== APLICAR FILTRO POR PLAN ==========
function aplicarFiltroPorPlan() {
    // 1. Filtrar columnas de módulos por data-modulo
    const columnas = document.querySelectorAll('.modulo-columna');
    columnas.forEach(columna => {
        const modulo = columna.dataset.modulo || 'default';
        const debeOcultarse = debeOcultarPorModulo(modulo);

        if (debeOcultarse) {
            columna.style.display = 'none';
        } else {
            columna.style.display = '';
        }
    });

    // 2. Filtrar tarjetas por data-modulo
    const tarjetas = document.querySelectorAll('.dashboard-card');
    tarjetas.forEach(tarjeta => {
        const modulo = tarjeta.dataset.modulo || 'default';
        const debeOcultarse = debeOcultarPorModulo(modulo);

        if (debeOcultarse) {
            tarjeta.style.display = 'none';
        } else {
            tarjeta.style.display = '';
        }
    });

    // 3. Filtrar KPIs
    const kpis = document.querySelectorAll('.kpi-card');
    kpis.forEach(kpi => {
        const id = kpi.id || '';

        if (id.includes('incidencias')) {
            kpi.style.display = mapasActivos.incidencias ? '' : 'none';
        }
        else if (id.includes('alertas')) {
            kpi.style.display = mapasActivos.alertas ? '' : 'none';
        }
        else {
            kpi.style.display = '';
        }
    });
}

function debeOcultarPorModulo(modulo) {
    if (modulo === 'default') return false;
    if (modulo === 'incidencias') return !mapasActivos.incidencias;
    if (modulo === 'alertas') return !mapasActivos.alertas;
    return false;
}

// ========== CARGAR ESTADÍSTICAS (en paralelo) ==========
async function cargarTodasLasEstadisticas() {
    try {
        const organizacion = usuarioActual?.organizacionCamelCase;
        if (!organizacion) return;

        // Cargar todas las estadísticas en paralelo
        const promesas = [
            cargarRegiones(organizacion),
            cargarSucursales(organizacion),
            cargarAreas(organizacion),
            cargarUsuarios(organizacion)
        ];

        if (mapasActivos.incidencias) {
            promesas.push(cargarIncidencias(organizacion));
        } else {
            estadisticas.incidencias = 0;
            estadisticas.incidenciasDiarias = 0;
        }

        await Promise.all(promesas);
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function cargarIncidencias(organizacion) {
    try {
        const incidencias = await incidenciaManager.getIncidenciasByOrganizacion(organizacion);
        estadisticas.incidencias = incidencias.length;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const incidenciasHoy = incidencias.filter(inc => {
            const fechaCreacion = inc.fechaCreacion;
            if (!fechaCreacion) return false;
            let fechaComparar = fechaCreacion.toDate ? fechaCreacion.toDate() : new Date(fechaCreacion);
            fechaComparar.setHours(0, 0, 0, 0);
            return fechaComparar.getTime() === hoy.getTime();
        });

        estadisticas.incidenciasDiarias = incidenciasHoy.length;
    } catch (error) {
        estadisticas.incidencias = 0;
        estadisticas.incidenciasDiarias = 0;
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
    } catch (error) {
        estadisticas.sucursales = 0;
    }
}

async function cargarAreas(organizacion) {
    try {
        const areas = await areaManager.getAreasByOrganizacion(organizacion);
        estadisticas.areas = areas.length;
    } catch (error) {
        estadisticas.areas = 0;
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
        estadisticas.usuarios = totalUsuarios;
    } catch (error) {
        estadisticas.usuarios = 0;
    }
}

function actualizarUI() {
    const elementos = {
        'total-incidencias': estadisticas.incidencias,
        'total-incidencias-diarias': estadisticas.incidenciasDiarias,
        'total-regiones': estadisticas.regiones,
        'total-sucursales': estadisticas.sucursales,
        'total-areas': estadisticas.areas,
        'total-usuarios': estadisticas.usuarios
    };

    Object.entries(elementos).forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    });
}

// ========== CONFIGURAR EVENTOS ==========
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

function configurarEventosKPI() {
    const kpis = [
        { id: 'kpi-incidencias', url: '/usuarios/administrador/incidencias/incidencias.html' },
        { id: 'kpi-incidencias-diarias', url: '/usuarios/administrador/incidencias/incidencias.html' },
        { id: 'kpi-regiones', url: '/usuarios/administrador/regiones/regiones.html' },
        { id: 'kpi-sucursales', url: '/usuarios/administrador/sucursales/sucursales.html' },
        { id: 'kpi-areas', url: '/usuarios/administrador/areas/areas.html' },
        { id: 'kpi-usuarios', url: '/usuarios/administrador/usuarios/usuarios.html' }
    ];

    kpis.forEach(kpi => {
        const tarjeta = document.getElementById(kpi.id);
        if (tarjeta) {
            tarjeta.style.cursor = 'pointer';
            tarjeta.removeEventListener('click', manejarClickKPI);
            tarjeta.addEventListener('click', (e) => manejarClickKPI(e, kpi.url));
        }
    });
}

function manejarClickKPI(e, url) {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = url;
}

function mostrarErrorSesion() {
    const container = document.querySelector('.right-layout');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-user-slash" style="font-size: 64px; color: #ff4d4d; margin-bottom: 20px;"></i>
                <h2 style="color: white;">SESIÓN NO DETECTADA</h2>
                <p style="color: #a5a5a5; margin: 20px 0;">Inicia sesión para acceder al panel</p>
                <button onclick="window.location.href='/index.html'" 
                    style="background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
                           border: 1px solid #c0c0c0;
                           color: white;
                           padding: 12px 24px;
                           border-radius: 8px;
                           cursor: pointer;">
                    <i class="fas fa-sign-in-alt"></i> INICIAR SESIÓN
                </button>
            </div>
        `;
    }
}

function mostrarError(mensaje) {
    const container = document.querySelector('.right-layout');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = `
            <div style="text-align:center;padding:60px;">
                <i class="fas fa-exclamation-circle" style="font-size:64px;color:#ff4d4d;"></i>
                <h2 style="color:white;">ERROR</h2>
                <p style="color:#a5a5a5;">${mensaje}</p>
                <button onclick="window.location.reload()" 
                    style="background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
                           border: 1px solid #c0c0c0;
                           color: white;
                           padding: 12px 24px;
                           border-radius: 8px;
                           cursor: pointer;
                           margin-top: 15px;">
                    REINTENTAR
                </button>
            </div>
        `;
    }
}

async function esperarAutenticacion(timeout = 5000) {
    const startTime = Date.now();
    while (!userManager.currentUser) {
        if (Date.now() - startTime > timeout) {
            return; // No lanzar error, solo continuar con lo que tenemos
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}