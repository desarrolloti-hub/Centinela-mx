// verPermiso.js - VISUALIZACIÓN DE PERMISOS (SOLO LECTURA)
// MISMO ESTILO QUE CREAR PERMISOS - SIN CAMPO "CREADO POR"

// =============================================
// VARIABLES GLOBALES
// =============================================
let permisoManager = null;
let areaManager = null;
let usuarioActual = null;
let permisoActual = null;
let areasMap = new Map();

// Nombres amigables para los módulos
const nombresModulos = {
    areas: 'Áreas',
    categorias: 'Categorías',
    sucursales: 'Sucursales',
    regiones: 'Regiones',
    incidencias: 'Incidencias'
};

// Iconos para los módulos
const iconosModulos = {
    areas: 'fa-sitemap',
    categorias: 'fa-tags',
    sucursales: 'fa-store',
    regiones: 'fa-map-marked-alt',
    incidencias: 'fa-exclamation-triangle'
};

// =============================================
// INICIALIZACIÓN
// =============================================
async function inicializarVerPermiso() {
    try {
        console.log('Inicializando vista de permiso...');

        const urlParams = new URLSearchParams(window.location.search);
        const permisoId = urlParams.get('id');

        if (!permisoId) {
            throw new Error('No se especificó el ID del permiso');
        }

        cargarUsuario();

        if (!usuarioActual) {
            throw new Error('No se pudo cargar información del usuario');
        }

        await inicializarManagers();
        await cargarAreas();
        await cargarPermiso(permisoId);

        mostrarInfoPermiso();
        configurarEventos();

        console.log('Vista de permiso inicializada correctamente');

    } catch (error) {
        console.error('Error inicializando:', error);
        mostrarError('Error al cargar el permiso: ' + error.message);

        const container = document.querySelector('.custom-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" style="margin: 20px; padding: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error al cargar el permiso</h4>
                    <p>${error.message}</p>
                    <button class="btn-volver" onclick="window.location.href='/usuarios/administrador/permisos/permisos.html'" style="margin-top: 15px;">
                        <i class="fas fa-arrow-left"></i> Volver a la lista
                    </button>
                </div>
            `;
        }
    }
}

async function inicializarManagers() {
    try {
        const { PermisoManager } = await import('/clases/permiso.js');
        const { AreaManager } = await import('/clases/area.js');

        permisoManager = new PermisoManager();
        areaManager = new AreaManager();
    } catch (error) {
        console.error('Error cargando managers:', error);
        throw error;
    }
}

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
                correo: adminData.correoElectronico || ''
            };
            console.log('✅ Usuario cargado desde adminInfo:', usuarioActual);
            return;
        }

        // Intentar obtener de window.userManager
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            usuarioActual = {
                id: user.id || user.uid,
                uid: user.uid || user.id,
                nombreCompleto: user.nombreCompleto || 'Administrador',
                organizacion: user.organizacion || 'Mi Organización',
                organizacionCamelCase: user.organizacionCamelCase,
                correo: user.correoElectronico || ''
            };
            console.log('✅ Usuario cargado desde userManager:', usuarioActual);
            return;
        }

        throw new Error('No hay sesión activa');

    } catch (error) {
        console.error('Error cargando usuario:', error);
        throw error;
    }
}

async function cargarAreas() {
    try {
        if (!usuarioActual?.organizacionCamelCase) {
            console.warn('No hay organización definida para cargar áreas');
            return;
        }

        const areas = await areaManager.getAreasByOrganizacion(usuarioActual.organizacionCamelCase);
        areasMap.clear();
        areas.forEach(area => {
            areasMap.set(area.id, {
                nombre: area.nombreArea,
                cargos: area.cargos || {}
            });
        });
        console.log(`✅ Cargadas ${areas.length} áreas`);
    } catch (error) {
        console.error('Error cargando áreas:', error);
    }
}

async function cargarPermiso(permisoId) {
    try {
        permisoActual = await permisoManager.obtenerPorId(
            permisoId,
            usuarioActual.organizacionCamelCase
        );

        if (!permisoActual) {
            throw new Error('Permiso no encontrado');
        }

        // Verificar que el elemento existe antes de asignar
        // Opcional: mostrar ID si el elemento existe
        const permisoIdElement = document.getElementById('permisoId');
        if (permisoIdElement) {
            permisoIdElement.textContent = permisoActual.id;
        }
        // Eliminado el warning

    } catch (error) {
        console.error('Error cargando permiso:', error);
        throw error;
    }
}

// =============================================
// MOSTRAR INFORMACIÓN
// =============================================
function mostrarInfoPermiso() {
    if (!permisoActual) return;

    console.log('Mostrando información del permiso:', permisoActual);

    // Función auxiliar para asignar valor a un input
    const setInputValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '-';
        } else {
            console.warn(`Elemento ${id} no encontrado`);
        }
    };

    // Organización
    setInputValue('infoOrganizacion', usuarioActual.organizacion);

    // Área
    const area = areasMap.get(permisoActual.areaId);
    setInputValue('infoArea', area?.nombre || permisoActual.areaId || 'No especificada');

    // Cargo
    let cargoNombre = permisoActual.cargoId;
    if (area && area.cargos && permisoActual.cargoId) {
        cargoNombre = area.cargos[permisoActual.cargoId]?.nombre || permisoActual.cargoId;
    }
    setInputValue('infoCargo', cargoNombre || 'No especificado');

    // Fechas
    setInputValue('infoFechaCreacion', formatearFecha(permisoActual.fechaCreacion));
    setInputValue('infoFechaActualizacion', formatearFecha(permisoActual.fechaActualizacion));

    // Módulos
    mostrarModulos();
}

function mostrarModulos() {
    const container = document.getElementById('modulosContainer');
    if (!container) {
        console.warn('Contenedor de módulos no encontrado');
        return;
    }
    if (!permisoActual) return;

    const modulos = ['areas', 'categorias', 'sucursales', 'regiones', 'incidencias'];
    let html = '';

    modulos.forEach(modulo => {
        const activo = permisoActual.permisos?.[modulo] || false;
        const nombreMostrar = nombresModulos[modulo] || modulo;
        const icono = iconosModulos[modulo] || 'fa-circle';
        const estadoClase = activo ? 'activo' : 'inactivo';
        const estadoTexto = activo ? 'Con acceso' : 'Sin acceso';

        html += `
            <div class="modulo-item ${estadoClase}">
                <div class="modulo-icon">
                    <i class="fas ${icono}"></i>
                </div>
                <div class="modulo-info">
                    <span class="modulo-nombre">${nombreMostrar}</span>
                    <span class="modulo-estado">
                        <i class="fas ${activo ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${estadoTexto}
                    </span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function formatearFecha(fecha) {
    if (!fecha) return 'No disponible';

    try {
        // Si es un objeto Date
        if (fecha instanceof Date) {
            return fecha.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Si es un string ISO
        if (typeof fecha === 'string') {
            const date = new Date(fecha);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Si es un timestamp de Firestore
        if (fecha && typeof fecha.toDate === 'function') {
            return fecha.toDate().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return 'Fecha no disponible';
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return 'Fecha inválida';
    }
}

// =============================================
// CONFIGURACIÓN DE EVENTOS
// =============================================
function configurarEventos() {
    try {
        const btnVolverLista = document.getElementById('btnVolverLista');
        if (btnVolverLista) {
            btnVolverLista.addEventListener('click', () => volverALista());
        } else {
            console.warn('Botón btnVolverLista no encontrado');
        }

        const btnVolverLista2 = document.getElementById('btnVolverLista2');
        if (btnVolverLista2) {
            btnVolverLista2.addEventListener('click', () => volverALista());
        }

        const btnEditar = document.getElementById('btnEditar');
        if (btnEditar) {
            btnEditar.addEventListener('click', () => editarPermiso());
        }

    } catch (error) {
        console.error('Error configurando eventos:', error);
    }
}

// =============================================
// NAVEGACIÓN
// =============================================
function volverALista() {
    window.location.href = '/usuarios/administrador/permisos/permisos.html';
}

function editarPermiso() {
    if (!permisoActual) return;

    const selectedPermiso = {
        id: permisoActual.id,
        areaId: permisoActual.areaId,
        cargoId: permisoActual.cargoId,
        permisos: permisoActual.permisos,
        organizacion: usuarioActual.organizacion,
        organizacionCamelCase: usuarioActual.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: usuarioActual.nombreCompleto
    };

    localStorage.setItem('selectedPermiso', JSON.stringify(selectedPermiso));
    window.location.href = `/usuarios/administrador/editarPermiso/editarPermiso.html?id=${permisoActual.id}`;
}

// =============================================
// UTILIDADES
// =============================================
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonText: 'Entendido'
    });
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    inicializarVerPermiso();
});