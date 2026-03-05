
// panelControl.js - PANEL DE CONTROL BASADO EN PERMISOS

// =============================================
// VARIABLES GLOBALES
// =============================================
let permisoManager = null;
let usuarioActual = null;
let permisosUsuario = null;

// Configuración de módulos principales (para la sección inferior)
const modulos = [
    {
        id: 'areas',
        nombre: 'Áreas',
        descripcion: 'Gestionar áreas de la organización',
        icono: 'fa-sitemap',
        color: '#2f8cff',
        bgColor: '#0d1f33',
        url: '/usuarios/administrador/areas/areas.html',
        clase: 'areas'
    },
    {
        id: 'categorias',
        nombre: 'Categorías',
        descripcion: 'Gestionar categorías de incidencias',
        icono: 'fa-tags',
        color: '#00cfff',
        bgColor: '#0b2430',
        url: '/usuarios/administrador/categorias/categorias.html',
        clase: 'categorias'
    },
    {
        id: 'sucursales',
        nombre: 'Sucursales',
        descripcion: 'Gestionar sucursales',
        icono: 'fa-store',
        color: '#ffcc00',
        bgColor: '#2b260c',
        url: '/usuarios/administrador/sucursales/sucursales.html',
        clase: 'sucursales'
    },
    {
        id: 'regiones',
        nombre: 'Regiones',
        descripcion: 'Gestionar regiones geográficas',
        icono: 'fa-map-marked-alt',
        color: '#b16bff',
        bgColor: '#24102f',
        url: '/usuarios/administrador/regiones/regiones.html',
        clase: 'regiones'
    },
    {
        id: 'incidencias',
        nombre: 'Incidencias',
        descripcion: 'Gestionar incidencias',
        icono: 'fa-exclamation-triangle',
        color: '#ff4d00',
        bgColor: '#331100',
        url: '/users/admin/incidencias/incidencias.html',
        clase: 'incidencias'
    }
];

// NOTA: Se ha eliminado la configuración de KPI

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializarPanelControl() {
    try {
        mostrarLoading(true);

        // 1. Cargar usuario desde localStorage
        const usuarioCargado = cargarUsuario();

        if (!usuarioCargado) {
            console.warn('No hay sesión activa, redirigiendo al login...');
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
            return;
        }

        // 2. Cargar PermisoManager
        await cargarPermisoManager();

        // 3. Cargar permisos del usuario (SIN valores por defecto)
        await cargarPermisosUsuario();

        // 4. Renderizar módulos según permisos
        renderizarModulos();

        // 5. Configurar eventos
        configurarEventos();

        // 6. Ocultar loading
        mostrarLoading(false);

        console.log('✅ Panel de control inicializado correctamente');

    } catch (error) {
        console.error('❌ Error inicializando panel de control:', error);
        mostrarLoading(false);
        mostrarError('Error al cargar el panel: ' + error.message);
    }
}

// =============================================
// CARGA DE USUARIO
// =============================================
function cargarUsuario() {
    try {
        // Intentar obtener de adminInfo
        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo) {
            const adminData = JSON.parse(adminInfo);
            usuarioActual = {
                id: adminData.id || adminData.uid,
                uid: adminData.uid || adminData.id,
                nombreCompleto: adminData.nombreCompleto || 'Administrador',
                organizacion: adminData.organizacion || 'Sin organización',
                organizacionCamelCase: adminData.organizacionCamelCase,
                cargoId: adminData.cargoId || null,
                areaId: adminData.areaId || null,
                correo: adminData.correoElectronico || ''
            };
            console.log('✅ Usuario cargado desde adminInfo:', usuarioActual);
            return true;
        }

        // Intentar obtener de userData
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData && Object.keys(userData).length > 0) {
            usuarioActual = {
                id: userData.uid || userData.id,
                uid: userData.uid || userData.id,
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                organizacionCamelCase: userData.organizacionCamelCase,
                cargoId: userData.cargoId || null,
                areaId: userData.areaId || null,
                correo: userData.correo || userData.email || ''
            };
            console.log('✅ Usuario cargado desde userData:', usuarioActual);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error cargando usuario:', error);
        return false;
    }
}

// =============================================
// CARGA DE PERMISO MANAGER
// =============================================
async function cargarPermisoManager() {
    try {
        const { PermisoManager } = await import('/clases/permiso.js');
        permisoManager = new PermisoManager();
        console.log('✅ PermisoManager cargado correctamente');
    } catch (error) {
        console.error('❌ Error cargando PermisoManager:', error);
        throw new Error('No se pudo cargar el sistema de permisos');
    }
}

// =============================================
// CARGA DE PERMISOS DEL USUARIO
// =============================================
async function cargarPermisosUsuario() {
    try {
        // Inicializar permisos como false (sin acceso a nada)
        permisosUsuario = {
            areas: false,
            categorias: false,
            sucursales: false,
            regiones: false,
            incidencias: false,
            usuarios: false,
            estadisticas: false
        };

        // Si no hay cargo o área, no podemos cargar permisos específicos
        if (!usuarioActual || !usuarioActual.cargoId || !usuarioActual.areaId) {
            console.warn('⚠️ Usuario sin cargo o área definida, no se pueden cargar permisos específicos');
            return; // Mantiene todos los permisos en false
        }

        // Intentar obtener permisos específicos para el cargo y área del usuario
        const permiso = await permisoManager.obtenerPorCargoYArea(
            usuarioActual.cargoId,
            usuarioActual.areaId,
            usuarioActual.organizacionCamelCase
        );

        if (permiso) {
            // Actualizar solo los permisos que vienen de Firebase
            permisosUsuario = {
                ...permisosUsuario, // Mantiene false por defecto
                ...permiso.permisos  // Sobrescribe con los permisos reales
            };
            console.log('✅ Permisos del usuario cargados:', permisosUsuario);
        } else {
            console.warn('⚠️ No se encontraron permisos para este cargo/área');
            // Mantiene todos los permisos en false
        }
    } catch (error) {
        console.error('❌ Error cargando permisos del usuario:', error);
        // Mantiene todos los permisos en false
    }
}

// =============================================
// RENDERIZAR MÓDULOS SEGÚN PERMISOS
// =============================================
function renderizarModulos() {
    const container = document.getElementById('modulosContainer');
    if (!container) return;

    // Filtrar módulos según permisos
    const modulosPermitidos = modulos.filter(modulo =>
        permisosUsuario && permisosUsuario[modulo.id] === true
    );

    console.log('📊 Módulos permitidos:', modulosPermitidos.map(m => m.id));

    if (modulosPermitidos.length === 0) {
        container.innerHTML = `
            <div class="sin-permisos">
                <i class="fas fa-lock"></i>
                <h3>Sin acceso a módulos</h3>
                <p>No tienes permisos para acceder a ningún módulo del sistema.</p>
                <p style="font-size: 0.8rem; margin-top: 15px;">Contacta al administrador para solicitar acceso.</p>
            </div>
        `;
        return;
    }

    // Generar HTML para cada módulo permitido
    let html = '';
    modulosPermitidos.forEach(modulo => {
        html += `
            <div class="modulo-card ${modulo.clase}" data-url="${modulo.url}" data-modulo="${modulo.id}">
                <div class="modulo-icon" style="background: ${modulo.bgColor}; color: ${modulo.color};">
                    <i class="fas ${modulo.icono}"></i>
                </div>
                <div class="modulo-contenido">
                    <h3 class="modulo-nombre">${modulo.nombre}</h3>
                    <p class="modulo-descripcion">${modulo.descripcion}</p>
                </div>
                <div class="modulo-arrow">
                    <i class="fas fa-arrow-right"></i>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// =============================================
// CONFIGURAR EVENTOS
// =============================================
function configurarEventos() {
    try {
        // Eventos para módulos
        document.querySelectorAll('.modulo-card').forEach(card => {
            card.addEventListener('click', () => {
                const url = card.dataset.url;
                if (url) {
                    window.location.href = url;
                }
            });
        });

    } catch (error) {
        console.error('Error configurando eventos:', error);
    }
}

// =============================================
// UTILIDADES
// =============================================
function mostrarLoading(mostrar) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = mostrar ? 'flex' : 'none';
    }
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonText: 'Entendido'
    });
}

function mostrarAdvertencia(mensaje) {
    Swal.fire({
        icon: 'warning',
        title: 'Acceso denegado',
        text: mensaje,
        confirmButtonText: 'Entendido'
    });
}

function mostrarInformacion(mensaje) {
    Swal.fire({
        icon: 'info',
        title: 'Información',
        text: mensaje,
        confirmButtonText: 'Entendido'
    });
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', inicializarPanelControl);