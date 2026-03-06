// ========== panelControl.js - PANEL DE CONTROL CON PERMISOS ==========
// VERSIÓN FINAL - Relación usuario + área + cargo

// ========== VARIABLES GLOBALES ==========
let permisoManager = null;
let usuarioActual = null;
let permisosUsuario = null;
let areaUsuario = null;
let cargoUsuario = null;

// Mapeo de módulos a sus respectivas tarjetas y rutas
const MODULOS_CONFIG = {
    // MÓDULOS PRINCIPALES (se filtran por permisos)
    'areas': {
        modulo: 'areas',
        selector: '[data-modulo="areas"]',
        url: '/usuarios/colaboradores/areas/areas.html',
        titulo: 'Áreas',
        descripcion: 'Gestionar áreas de la organización'
    },
    'categorias': {
        modulo: 'categorias',
        selector: '[data-modulo="categorias"]',
        url: '/usuarios/colaboradores/categorias/categorias.html',
        titulo: 'Categorías',
        descripcion: 'Administrar categorías y subcategorías'
    },
    'sucursales': {
        modulo: 'sucursales',
        selector: '[data-modulo="sucursales"]',
        url: '/usuarios/colaboradores/sucursales/sucursales.html',
        titulo: 'Sucursales',
        descripcion: 'Gestionar sucursales activas'
    },
    'regiones': {
        modulo: 'regiones',
        selector: '[data-modulo="regiones"]',
        url: '/usuarios/colaboradores/regiones/regiones.html',
        titulo: 'Regiones',
        descripcion: 'Administrar regiones geográficas'
    },
    'incidencias': {
        modulo: 'incidencias',
        selector: '[data-modulo="incidencias"]',
        url: '/usuarios/colaboradores/incidencias/incidencias.html',
        titulo: 'Incidencias',
        descripcion: 'Gestionar reportes de incidencias'
    },

    // Registro (sección izquierda)
    'registroAccesos': {
        modulo: 'incidencias',
        icono: 'fa-door-open',
        seccion: '.side.left',
        url: '/registro-accesos/',
        titulo: 'Registro de Accesos'
    },
    'nuevaIncidencia': {
        modulo: 'incidencias',
        icono: 'fa-triangle-exclamation',
        seccion: '.side.left',
        url: '/incidencias/crear/',
        titulo: 'Nueva Incidencia'
    },
    'nuevoUsuario': {
        modulo: 'usuarios',
        icono: 'fa-user-plus',
        seccion: '.side.left',
        url: '/usuarios/crear/',
        titulo: 'Nuevo Usuario',
        requiereAdmin: true
    },

    // Gráficas y Mapas
    'graficasIncidencias': {
        modulo: 'incidencias',
        icono: 'fa-chart-line',
        seccion: '.side.right',
        url: '/graficas/incidencias/',
        titulo: 'Gráficas de Incidencias'
    },
    'mapa': {
        modulo: 'sucursales',
        icono: 'fa-map-location-dot',
        seccion: '.side.right',
        url: '/mapa/',
        titulo: 'Mapa'
    },
    'estadisticas': {
        modulo: 'incidencias',
        icono: 'fa-chart-pie',
        seccion: '.side.right',
        url: '/estadisticas/',
        titulo: 'Estadísticas'
    },

    // Administración
    'tiposIncidencia': {
        modulo: 'categorias',
        icono: 'fa-list-check',
        seccion: '.side.right .section-container:last-child',
        url: '/categorias/',
        titulo: 'Tipos de Incidencia'
    },
    'rolesPermisos': {
        modulo: 'permisos',
        icono: 'fa-user-gear',
        seccion: '.side.right .section-container:last-child',
        url: '/permisos/',
        titulo: 'Roles y Permisos',
        requiereAdmin: true
    },
    'backup': {
        modulo: 'admin',
        icono: 'fa-database',
        seccion: '.side.right .section-container:last-child',
        url: '/backup/',
        titulo: 'Backup del Sistema',
        requiereAdmin: true
    },
    'configuracion': {
        modulo: 'admin',
        icono: 'fa-sliders',
        seccion: '.side.right .section-container:last-child',
        url: '/configuracion/',
        titulo: 'Configuración General',
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
                areaId: userData.areaAsignadaId || userData.area || userData.areaId || '',
                cargoId: userData.cargoId || userData.cargo || '',
                rol: userData.rol || 'colaborador'
            };

            console.log('✅ Usuario cargado desde userData:', {
                nombre: usuarioActual.nombreCompleto,
                area: usuarioActual.areaId,
                cargo: usuarioActual.cargoId,
                rol: usuarioActual.rol
            });
            return true;
        }

        // Fallback a adminInfo (para administradores)
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
                areaId: adminData.areaAsignadaId || adminData.areaId || '',
                cargoId: adminData.cargoId || '',
                rol: adminData.rol || 'administrador'
            };
            console.log('✅ Usuario cargado desde adminInfo:', {
                nombre: usuarioActual.nombreCompleto,
                area: usuarioActual.areaId,
                cargo: usuarioActual.cargoId,
                rol: usuarioActual.rol
            });
            return true;
        }

        console.warn('⚠️ No hay datos de usuario en localStorage');
        return false;

    } catch (error) {
        console.error('Error cargando usuario:', error);
        return false;
    }
}

// ========== OBTENER PERMISOS DEL USUARIO SEGÚN SU ÁREA Y CARGO ==========
async function obtenerPermisosUsuario() {
    try {
        // Si es administrador o master, todos los permisos
        if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
            console.log('👑 Usuario administrador - todos los permisos');
            permisosUsuario = {
                areas: true,
                categorias: true,
                sucursales: true,
                regiones: true,
                incidencias: true,
                usuarios: true,
                permisos: true,
                admin: true
            };
            return;
        }

        // Verificar si el usuario tiene área y cargo asignados
        if (!usuarioActual.areaId || !usuarioActual.cargoId) {
            console.log('ℹ️ Usuario sin área o cargo asignado - solo incidencias por defecto');
            permisosUsuario = {
                areas: false,
                categorias: false,
                sucursales: false,
                regiones: false,
                incidencias: true, // Por defecto todos pueden ver incidencias
                usuarios: false,
                permisos: false,
                admin: false
            };
            return;
        }

        console.log('🔍 Buscando permisos para:', {
            areaId: usuarioActual.areaId,
            cargoId: usuarioActual.cargoId,
            organizacion: usuarioActual.organizacionCamelCase
        });

        // Buscar permiso específico en Firebase usando el PermisoManager
        if (permisoManager) {
            try {
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
                        usuarios: false,
                        permisos: false,
                        admin: false
                    };
                    console.log('✅ Permisos encontrados en Firebase:', permisosUsuario);
                    return;
                } else {
                    console.log('ℹ️ No se encontró permiso configurado para esta área y cargo');
                }
            } catch (error) {
                console.warn('Error consultando permisos en Firebase:', error);
            }
        }

        // Si no hay permisos configurados, solo incidencias
        console.log('ℹ️ Usando permisos por defecto - solo incidencias');
        permisosUsuario = {
            areas: false,
            categorias: false,
            sucursales: false,
            regiones: false,
            incidencias: true,
            usuarios: false,
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
    console.log('📋 Permisos del usuario:', permisosUsuario);

    let tarjetasVisibles = 0;
    let modulosVisibles = [];

    // Procesar todas las tarjetas según su configuración
    Object.entries(MODULOS_CONFIG).forEach(([key, config]) => {
        // Buscar la tarjeta
        let tarjeta = null;

        if (config.selector) {
            // Es un selector directo (data-modulo)
            tarjeta = document.querySelector(config.selector);
        } else if (config.icono) {
            // Es un icono - buscar el padre
            const icono = document.querySelector(`${config.seccion || ''} .${config.icono}`);
            if (icono) {
                tarjeta = icono.closest('.dashboard-card');
            }
        }

        if (!tarjeta) {
            // Intentar búsqueda alternativa
            if (config.icono) {
                const icono = document.querySelector(`.${config.icono}`);
                if (icono) {
                    tarjeta = icono.closest('.dashboard-card');
                }
            }
        }

        if (!tarjeta) {
            console.warn(`⚠️ Tarjeta no encontrada: ${key}`);
            return;
        }

        const debeMostrarse = verificarPermisoModulo(config);

        if (debeMostrarse) {
            tarjeta.style.display = 'flex';
            tarjetasVisibles++;
            modulosVisibles.push(config.titulo);

            // Guardar URL para el evento click
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

    // Verificar secciones vacías
    verificarSeccionesVacias();
}

// ========== VERIFICAR PERMISO ==========
function verificarPermisoModulo(config) {
    // Admin ve todo
    if (usuarioActual.rol === 'administrador' || usuarioActual.rol === 'master') {
        return true;
    }

    // Verificar si requiere admin
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
            console.log('ℹ️ Ocultando sección Módulos Principales (sin tarjetas visibles)');
        } else {
            modulosPrincipales.style.display = 'block';
        }
    }

    // Sección izquierda (Registro)
    const sideLeft = document.querySelector('.side.left');
    if (sideLeft) {
        const secciones = sideLeft.querySelectorAll('.section-container');
        secciones.forEach((seccion, index) => {
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
        secciones.forEach((seccion, index) => {
            const tarjetasVisibles = seccion.querySelectorAll('.dashboard-card[style*="display: flex"]');
            if (tarjetasVisibles.length === 0) {
                seccion.style.display = 'none';
            } else {
                seccion.style.display = 'block';
            }
        });
    }
}

// ========== MOSTRAR RESUMEN DE PERMISOS ==========
function mostrarResumenPermisos() {
    console.log('='.repeat(50));
    console.log('📋 RESUMEN DE PERMISOS');
    console.log('='.repeat(50));
    console.log(`👤 Usuario: ${usuarioActual.nombreCompleto}`);
    console.log(`🏢 Organización: ${usuarioActual.organizacion}`);
    console.log(`📌 Área ID: ${usuarioActual.areaId || 'No asignada'}`);
    console.log(`👔 Cargo ID: ${usuarioActual.cargoId || 'No asignado'}`);
    console.log(`👑 Rol: ${usuarioActual.rol}`);
    console.log('-'.repeat(50));
    console.log('🔑 Permisos:');
    if (permisosUsuario) {
        Object.entries(permisosUsuario).forEach(([modulo, tiene]) => {
            console.log(`   ${tiene ? '✅' : '❌'} ${modulo}`);
        });
    } else {
        console.log('   ❌ No hay permisos cargados');
    }
    console.log('='.repeat(50));
}

// ========== CONFIGURAR EVENTOS DE LAS TARJETAS ==========
function configurarEventosTarjetas() {
    const tarjetas = document.querySelectorAll('.dashboard-card');

    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('click', (e) => {
            e.preventDefault();

            const url = tarjeta.dataset.url;
            const titulo = tarjeta.dataset.titulo;
            const modulo = tarjeta.dataset.modulo;

            if (url) {
                // Verificar permiso nuevamente (por seguridad)
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

// ========== UTILIDADES ==========
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}