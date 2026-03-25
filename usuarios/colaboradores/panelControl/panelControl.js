// ========== panelControl.js - PANEL DE CONTROL CON PERMISOS ==========
// VERSIÓN ACTUALIZADA - Incluye módulos: Usuarios, Estadísticas, Tareas, Mapa de Alertas

// ========== VARIABLES GLOBALES ==========
let permisoManager = null;
let usuarioActual = null;
let permisosUsuario = null;
let areaUsuario = null;
let cargoUsuario = null;

// Mapeo de módulos a sus respectivas tarjetas y rutas (ACTUALIZADO)
const MODULOS_CONFIG = {
    // ========== MÓDULOS PRINCIPALES (grid superior) ==========
    'areas': {
        modulo: 'areas',
        selector: '[data-modulo="areas"]',
        url: '/usuarios/colaboradores/areas/areas.html',
        titulo: 'Áreas',
        descripcion: 'Gestionar áreas de la organización',
        icono: 'fa-sitemap'
    },
    'categorias': {
        modulo: 'categorias',
        selector: '[data-modulo="categorias"]',
        url: '/usuarios/colaboradores/categorias/categorias.html',
        titulo: 'Categorías',
        descripcion: 'Administrar categorías y subcategorías',
        icono: 'fa-tags'
    },
    'sucursales': {
        modulo: 'sucursales',
        selector: '[data-modulo="sucursales"]',
        url: '/usuarios/colaboradores/sucursales/sucursales.html',
        titulo: 'Sucursales',
        descripcion: 'Gestionar sucursales activas',
        icono: 'fa-store'
    },
    'regiones': {
        modulo: 'regiones',
        selector: '[data-modulo="regiones"]',
        url: '/usuarios/colaboradores/regiones/regiones.html',
        titulo: 'Regiones',
        descripcion: 'Administrar regiones geográficas',
        icono: 'fa-map-marked-alt'
    },
    'incidencias': {
        modulo: 'incidencias',
        selector: '[data-modulo="incidencias"]',
        url: '/usuarios/colaboradores/incidencias/incidencias.html',
        titulo: 'Incidencias',
        descripcion: 'Gestionar reportes de incidencias',
        icono: 'fa-exclamation-triangle'
    },
    // NUEVOS MÓDULOS PRINCIPALES
    'usuarios': {
        modulo: 'usuarios',
        selector: '[data-modulo="usuarios"]',
        url: '/usuarios/colaboradores/usuarios/usuarios.html',
        titulo: 'Usuarios',
        descripcion: 'Gestionar usuarios del sistema',
        icono: 'fa-users'
    },
    'estadisticas': {
        modulo: 'estadisticas',
        selector: '[data-modulo="estadisticas"]',
        url: '/usuarios/colaboradores/estadisticas/estadisticas.html',
        titulo: 'Estadísticas',
        descripcion: 'Visualizar estadísticas y reportes',
        icono: 'fa-chart-line'
    },
    'tareas': {
        modulo: 'tareas',
        selector: '[data-modulo="tareas"]',
        url: '/usuarios/colaboradores/tareas/tareas.html',
        titulo: 'Tareas',
        descripcion: 'Gestionar tareas asignadas',
        icono: 'fa-tasks'
    },
    'monitoreo': {
        modulo: 'monitoreo',
        selector: '[data-modulo="monitoreo"]',
        url: '/usuarios/colaboradores/mapa/mapa.html',
        titulo: 'Mapa de Alertas',
        descripcion: 'Visualización de alertas en mapa',
        icono: 'fa-map-marker-alt'
    },

    // ========== ACCIONES RÁPIDAS (sección izquierda) ==========
    'registroAccesos': {
        modulo: 'incidencias',
        icono: 'fa-door-open',
        seccion: '.side.left',
        url: '/registro-accesos/',
        titulo: 'Registro de Accesos',
        descripcion: 'Registrar entradas y salidas'
    },
    'nuevaIncidencia': {
        modulo: 'incidencias',
        icono: 'fa-triangle-exclamation',
        seccion: '.side.left',
        url: '/incidencias/crear/',
        titulo: 'Nueva Incidencia',
        descripcion: 'Reportar una incidencia'
    },
    'nuevoUsuario': {
        modulo: 'usuarios',
        icono: 'fa-user-plus',
        seccion: '.side.left',
        url: '/usuarios/crear/',
        titulo: 'Nuevo Usuario',
        descripcion: 'Registrar nuevo usuario',
        requiereAdmin: true
    },
    'nuevaTarea': {
        modulo: 'tareas',
        icono: 'fa-plus-circle',
        seccion: '.side.left',
        url: '/tareas/crear/',
        titulo: 'Nueva Tarea',
        descripcion: 'Crear nueva tarea'
    },

    // ========== ANÁLISIS Y REPORTES (sección derecha superior) ==========
    'graficasIncidencias': {
        modulo: 'incidencias',
        icono: 'fa-chart-line',
        seccion: '.side.right .section-container:first-child',
        url: '/graficas/incidencias/',
        titulo: 'Gráficas de Incidencias',
        descripcion: 'Tendencias y análisis'
    },
    'mapaAlertas': {
        modulo: 'monitoreo',
        icono: 'fa-map-location-dot',
        seccion: '.side.right .section-container:first-child',
        url: '/mapa/',
        titulo: 'Mapa de Alertas',
        descripcion: 'Visualización geográfica'
    },
    'estadisticasGenerales': {
        modulo: 'estadisticas',
        icono: 'fa-chart-pie',
        seccion: '.side.right .section-container:first-child',
        url: '/estadisticas/',
        titulo: 'Estadísticas',
        descripcion: 'Métricas y KPIs del sistema'
    },
    'reporteTareas': {
        modulo: 'tareas',
        icono: 'fa-file-alt',
        seccion: '.side.right .section-container:first-child',
        url: '/tareas/reportes/',
        titulo: 'Reporte de Tareas',
        descripcion: 'Seguimiento y cumplimiento'
    },

    // ========== ADMINISTRACIÓN (sección derecha inferior) ==========
    'tiposIncidencia': {
        modulo: 'categorias',
        icono: 'fa-list-check',
        seccion: '.side.right .section-container:last-child',
        url: '/categorias/',
        titulo: 'Tipos de Incidencia',
        descripcion: 'Gestionar categorías'
    },
    'rolesPermisos': {
        modulo: 'permisos',
        icono: 'fa-user-gear',
        seccion: '.side.right .section-container:last-child',
        url: '/permisos/',
        titulo: 'Roles y Permisos',
        descripcion: 'Control de accesos',
        requiereAdmin: true
    },
    'backup': {
        modulo: 'admin',
        icono: 'fa-database',
        seccion: '.side.right .section-container:last-child',
        url: '/backup/',
        titulo: 'Backup del Sistema',
        descripcion: 'Respaldo de datos',
        requiereAdmin: true
    },
    'configuracion': {
        modulo: 'admin',
        icono: 'fa-sliders',
        seccion: '.side.right .section-container:last-child',
        url: '/configuracion/',
        titulo: 'Configuración General',
        descripcion: 'Ajustes del sistema',
        requiereAdmin: true
    }
};

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function () {
    try {
        console.log('🚀 Iniciando panel de control...');

        // Mostrar estado de carga
        mostrarEstadoCarga();

        // Cargar usuario desde localStorage
        const usuarioCargado = cargarUsuarioDesdeStorage();

        if (!usuarioCargado) {
            console.error('❌ No hay usuario autenticado');
            mostrarErrorSesion();
            return;
        }

        console.log('✅ Usuario cargado:', usuarioActual);

        // Importar clases necesarias
        try {
            const { PermisoManager } = await import('/clases/permiso.js');
            permisoManager = new PermisoManager();

            // Establecer la organización del usuario en el permisoManager
            if (usuarioActual.organizacionCamelCase) {
                permisoManager.organizacionCamelCase = usuarioActual.organizacionCamelCase;
            }
        } catch (error) {
            console.warn('⚠️ Error importando PermisoManager:', error);
        }

        // Obtener permisos del usuario según su área y cargo
        await obtenerPermisosUsuario();

        // Filtrar tarjetas según permisos
        filtrarTarjetasPorPermisos();

        // Configurar eventos de las tarjetas
        configurarEventosTarjetas();

        // Cargar datos de KPI
        await cargarDatosKPI();

        // Ocultar estado de carga
        ocultarEstadoCarga();

        // Mostrar resumen de permisos en consola
        mostrarResumenPermisos();

    } catch (error) {
        console.error('❌ Error inicializando panel:', error);
        ocultarEstadoCarga();
        mostrarError(error.message);
    }
});

// ========== CARGAR USUARIO DESDE LOCALSTORAGE ==========
function cargarUsuarioDesdeStorage() {
    try {
        console.log('🔍 Verificando localStorage...');

        // Intentar obtener de userData (para colaboradores)
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');

        if (userData && Object.keys(userData).length > 0) {
            usuarioActual = {
                id: userData.id || userData.uid || 'usuario',
                uid: userData.uid || userData.id || 'usuario',
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                correo: userData.correoElectronico || userData.correo || '',
                organizacion: userData.organizacion || 'Mi Organización',
                organizacionCamelCase: userData.organizacionCamelCase || '',
                areaId: userData.areaAsignadaId || '',
                cargoId: userData.cargoId || '',
                rol: userData.rol || 'colaborador'
            };

            console.log('✅ Usuario cargado desde userData:', {
                nombre: usuarioActual.nombreCompleto,
                areaAsignadaId: usuarioActual.areaId,
                cargoId: usuarioActual.cargoId,
                rol: usuarioActual.rol
            });

            if (!usuarioActual.areaId) {
                console.warn('⚠️ El usuario NO tiene área asignada');
            }
            if (!usuarioActual.cargoId) {
                console.warn('⚠️ El usuario NO tiene cargo asignado');
            }

            return true;
        }

        // Fallback a adminInfo
        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo) {
            const adminData = JSON.parse(adminInfo);
            usuarioActual = {
                id: adminData.id || adminData.uid,
                uid: adminData.uid || adminData.id,
                nombreCompleto: adminData.nombreCompleto || 'Administrador',
                correo: adminData.correoElectronico || '',
                organizacion: adminData.organizacion || 'Mi Organización',
                organizacionCamelCase: adminData.organizacionCamelCase || '',
                areaId: adminData.areaAsignadaId || '',
                cargoId: adminData.cargoId || '',
                rol: adminData.rol || 'administrador'
            };
            console.log('✅ Usuario cargado desde adminInfo');
            return true;
        }

        console.warn('⚠️ No hay datos de usuario en localStorage');
        return false;

    } catch (error) {
        console.error('❌ Error cargando usuario:', error);
        return false;
    }
}

// ========== OBTENER PERMISOS DEL USUARIO ==========
async function obtenerPermisosUsuario() {
    try {
        // Administrador o master tienen todos los permisos
        if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
            console.log('👑 Usuario administrador - todos los permisos');
            permisosUsuario = {
                areas: true,
                categorias: true,
                sucursales: true,
                regiones: true,
                incidencias: true,
                // NUEVOS PERMISOS
                usuarios: true,
                estadisticas: true,
                tareas: true,
                monitoreo: true,
                permisos: true,
                admin: true
            };
            return;
        }

        // Verificar si el usuario tiene área y cargo
        if (!usuarioActual.areaId || !usuarioActual.cargoId) {
            console.log('ℹ️ Usuario sin área/cargo - permisos por defecto');
            permisosUsuario = {
                areas: false,
                categorias: false,
                sucursales: false,
                regiones: false,
                incidencias: true,
                usuarios: false,
                estadisticas: false,
                tareas: false,
                monitoreo: false,
                permisos: false,
                admin: false
            };
            return;
        }

        // Buscar permiso en Firebase
        if (permisoManager) {
            const permiso = await permisoManager.obtenerPorCargoYArea(
                usuarioActual.cargoId,
                usuarioActual.areaId,
                usuarioActual.organizacionCamelCase
            );

            if (permiso) {
                permisosUsuario = {
                    areas: permiso.puedeAcceder('areas'),
                    categorias: permiso.puedeAcceder('categorias'),
                    sucursales: permiso.puedeAcceder('sucursales'),
                    regiones: permiso.puedeAcceder('regiones'),
                    incidencias: permiso.puedeAcceder('incidencias'),
                    // NUEVOS PERMISOS
                    usuarios: permiso.puedeAcceder('usuarios'),
                    estadisticas: permiso.puedeAcceder('estadisticas'),
                    tareas: permiso.puedeAcceder('tareas'),
                    monitoreo: permiso.puedeAcceder('monitoreo'),
                    permisos: false,
                    admin: false
                };
                console.log('✅ Permisos encontrados:', permisosUsuario);
                return;
            }
        }

        // Permisos por defecto
        console.log('ℹ️ Usando permisos por defecto');
        permisosUsuario = {
            areas: false,
            categorias: false,
            sucursales: false,
            regiones: false,
            incidencias: true,
            usuarios: false,
            estadisticas: false,
            tareas: false,
            monitoreo: false,
            permisos: false,
            admin: false
        };

    } catch (error) {
        console.error('Error en obtenerPermisosUsuario:', error);
        permisosUsuario = {
            areas: false,
            categorias: false,
            sucursales: false,
            regiones: false,
            incidencias: true,
            usuarios: false,
            estadisticas: false,
            tareas: false,
            monitoreo: false,
            permisos: false,
            admin: false
        };
    }
}

// ========== FILTRAR TARJETAS POR PERMISOS ==========
function filtrarTarjetasPorPermisos() {
    if (!permisosUsuario) {
        console.warn('No hay permisos - ocultando todo');
        return;
    }

    console.log('🎯 Aplicando filtros de permisos...');

    let tarjetasVisibles = 0;
    let modulosVisibles = [];

    Object.entries(MODULOS_CONFIG).forEach(([key, config]) => {
        let tarjeta = null;

        // Buscar la tarjeta por selector o icono
        if (config.selector) {
            tarjeta = document.querySelector(config.selector);
        } else if (config.icono) {
            const icono = document.querySelector(`.${config.icono}`);
            if (icono) {
                tarjeta = icono.closest('.dashboard-card');
            }
        }

        // Búsqueda alternativa
        if (!tarjeta && config.icono) {
            const icono = document.querySelector(`.${config.icono}`);
            if (icono) {
                tarjeta = icono.closest('.dashboard-card');
            }
        }

        if (!tarjeta) {
            return;
        }

        const debeMostrarse = verificarPermisoModulo(config);

        if (debeMostrarse) {
            tarjeta.style.display = 'flex';
            tarjetasVisibles++;
            modulosVisibles.push(config.titulo);
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

    console.log(`📊 Total tarjetas visibles: ${tarjetasVisibles}`);
    if (modulosVisibles.length > 0) {
        console.log('📋 Módulos visibles:', modulosVisibles.join(', '));
    }

    verificarSeccionesVacias();
}

// ========== VERIFICAR PERMISO DE MÓDULO ==========
function verificarPermisoModulo(config) {
    // Admin ve todo
    if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
        return true;
    }

    // Si requiere admin y no es admin
    if (config.requiereAdmin) {
        return false;
    }

    // Verificar permiso específico
    if (config.modulo && permisosUsuario) {
        return permisosUsuario[config.modulo] === true;
    }

    return false;
}

// ========== VERIFICAR SECCIONES VACÍAS ==========
function verificarSeccionesVacias() {
    // Módulos Principales
    const modulosPrincipales = document.querySelector('.modulos-principales');
    if (modulosPrincipales) {
        const tarjetasVisibles = modulosPrincipales.querySelectorAll('.dashboard-card[style*="display: flex"]');
        if (tarjetasVisibles.length === 0) {
            modulosPrincipales.style.display = 'none';
        } else {
            modulosPrincipales.style.display = 'block';
        }
    }

    // Sección izquierda
    const sideLeft = document.querySelector('.side.left');
    if (sideLeft) {
        const secciones = sideLeft.querySelectorAll('.section-container');
        secciones.forEach(seccion => {
            const tarjetasVisibles = seccion.querySelectorAll('.dashboard-card[style*="display: flex"]');
            if (tarjetasVisibles.length === 0) {
                seccion.style.display = 'none';
            } else {
                seccion.style.display = 'block';
            }
        });
    }

    // Sección derecha
    const sideRight = document.querySelector('.side.right');
    if (sideRight) {
        const secciones = sideRight.querySelectorAll('.section-container');
        secciones.forEach(seccion => {
            const tarjetasVisibles = seccion.querySelectorAll('.dashboard-card[style*="display: flex"]');
            if (tarjetasVisibles.length === 0) {
                seccion.style.display = 'none';
            } else {
                seccion.style.display = 'block';
            }
        });
    }
}

// ========== CARGAR DATOS DE KPI ==========
async function cargarDatosKPI() {
    // Aquí iría la lógica para cargar datos reales
    // Por ahora, valores de ejemplo
    const kpiIncidencias = document.getElementById('kpi-incidencias-pendientes');
    const kpiUsuarios = document.getElementById('kpi-usuarios-activos');
    const kpiSucursales = document.getElementById('kpi-sucursales-activas');
    const kpiEficiencia = document.getElementById('kpi-eficiencia');

    if (kpiIncidencias) kpiIncidencias.textContent = '12';
    if (kpiUsuarios) kpiUsuarios.textContent = '8';
    if (kpiSucursales) kpiSucursales.textContent = '5';
    if (kpiEficiencia) kpiEficiencia.textContent = '94%';
}

// ========== MOSTRAR RESUMEN DE PERMISOS ==========
function mostrarResumenPermisos() {
    console.log('='.repeat(50));
    console.log('📋 RESUMEN DE PERMISOS');
    console.log('='.repeat(50));
    console.log(`👤 Usuario: ${usuarioActual.nombreCompleto}`);
    console.log(`🏢 Organización: ${usuarioActual.organizacion}`);
    console.log(`📌 Área: ${usuarioActual.areaId || 'No asignada'}`);
    console.log(`👔 Cargo: ${usuarioActual.cargoId || 'No asignado'}`);
    console.log(`👑 Rol: ${usuarioActual.rol}`);
    console.log('-'.repeat(50));
    console.log('🔑 Permisos:');
    if (permisosUsuario) {
        Object.entries(permisosUsuario).forEach(([modulo, tiene]) => {
            if (tiene) console.log(`   ✅ ${modulo}`);
        });
    }
    console.log('='.repeat(50));
}

// ========== CONFIGURAR EVENTOS DE TARJETAS ==========
function configurarEventosTarjetas() {
    const tarjetas = document.querySelectorAll('.dashboard-card');

    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('click', (e) => {
            e.preventDefault();

            const url = tarjeta.dataset.url;
            const titulo = tarjeta.dataset.titulo;
            const modulo = tarjeta.dataset.modulo;

            if (url) {
                const config = {
                    modulo: modulo,
                    requiereAdmin: tarjeta.dataset.requiereAdmin === 'true'
                };

                if (verificarPermisoModulo(config)) {
                    console.log(`➡️ Navegando a: ${titulo}`);
                    window.location.href = url;
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Acceso Denegado',
                        text: `No tienes permisos para acceder a ${titulo}`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
        });
    });
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
        `;
        overlay.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #c0c0c0; margin-bottom: 16px;"></i>
                <h3 style="color: white; font-family: 'Orbitron', sans-serif;">CARGANDO PANEL</h3>
                <p style="color: #a5a5a5;">Verificando permisos...</p>
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
                <button onclick="window.location.href='/iniciar-sesion/'" 
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
                           cursor: pointer;">
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