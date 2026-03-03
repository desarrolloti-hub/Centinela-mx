// ========== permisos.js - GESTIÓN DE PERMISOS ==========
// Basado en la estructura de regiones.js

// ========== VARIABLES GLOBALES ==========
let permisoManager = null;
let areaManager = null;
let adminActual = null;

// Configuración de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;
let terminoBusqueda = '';
let todosLosPermisos = []; // Almacena todos los permisos para búsqueda
let permisosFiltrados = []; // Permisos filtrados para mostrar

// Cache de áreas para mostrar nombres
let areasCache = new Map();

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Importar las clases necesarias
        const { PermisoManager } = await import('/clases/permiso.js');
        const { AreaManager } = await import('/clases/area.js');

        permisoManager = new PermisoManager();
        areaManager = new AreaManager();

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verificar autenticación
        if (!window.userManager || !window.userManager.currentUser || !window.userManager.currentUser.esAdministrador()) {
            console.error('❌ No hay administrador autenticado');
            showNoAdminMessage();
            return;
        }

        adminActual = window.userManager.currentUser;

        localStorage.setItem('adminInfo', JSON.stringify({
            id: adminActual.id,
            nombreCompleto: adminActual.nombreCompleto,
            organizacion: adminActual.organizacion,
            organizacionCamelCase: adminActual.organizacionCamelCase,
            rol: adminActual.rol,
            correoElectronico: adminActual.correoElectronico,
            timestamp: new Date().toISOString()
        }));

        // Cargar áreas primero para tener los nombres
        await loadAreas();
        // Luego cargar permisos
        await loadPermisos();
        configurarBusqueda();
        setupEvents();

    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CARGAR ÁREAS ==========
async function loadAreas() {
    try {
        const areas = await areaManager.getAreasByOrganizacion(adminActual.organizacionCamelCase);
        areasCache.clear();
        areas.forEach(area => {
            areasCache.set(area.id, {
                nombre: area.nombreArea,
                cargos: area.cargos || {}
            });
        });
    } catch (error) {
        console.error('Error cargando áreas:', error);
    }
}

// ========== CONFIGURAR BÚSQUEDA ==========
function configurarBusqueda() {
    const inputBuscar = document.getElementById('buscarPermiso');
    const btnBuscar = document.getElementById('btnBuscarPermiso');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            terminoBusqueda = inputBuscar?.value.trim() || '';
            paginaActual = 1;
            filtrarYRenderizar();
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if (inputBuscar) inputBuscar.value = '';
            terminoBusqueda = '';
            paginaActual = 1;
            filtrarYRenderizar();
        });
    }

    // Búsqueda en tiempo real con debounce
    if (inputBuscar) {
        let timeoutId;
        inputBuscar.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                terminoBusqueda = e.target.value.trim();
                paginaActual = 1;
                filtrarYRenderizar();
            }, 300);
        });

        inputBuscar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                terminoBusqueda = e.target.value.trim();
                paginaActual = 1;
                filtrarYRenderizar();
            }
        });
    }
}

// ========== FUNCIÓN DE FILTRADO ==========
function filtrarYRenderizar() {
    if (!todosLosPermisos.length) {
        permisosFiltrados = [];
    } else if (!terminoBusqueda || terminoBusqueda.length < 2) {
        // Si no hay término de búsqueda, mostrar todos
        permisosFiltrados = [...todosLosPermisos];
    } else {
        // Filtrar en memoria
        const terminoLower = terminoBusqueda.toLowerCase();
        permisosFiltrados = todosLosPermisos.filter(permiso => {
            const area = areasCache.get(permiso.areaId);
            const areaNombre = area?.nombre?.toLowerCase() || '';
            const cargoNombre = permiso.cargoNombre?.toLowerCase() || '';

            return areaNombre.includes(terminoLower) ||
                cargoNombre.includes(terminoLower);
        });
    }

    renderizarConPaginacion();
}

// ========== FUNCIONES DE PAGINACIÓN ==========
function irPagina(pagina) {
    paginaActual = pagina;
    renderizarConPaginacion();

    // Scroll suave hacia arriba
    document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (totalPaginas <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="window.irPaginaPermiso(${i})">${i}</button>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

// Hacer la función global para que funcionen los botones
window.irPaginaPermiso = function (pagina) {
    paginaActual = pagina;
    renderizarConPaginacion();

    // Scroll suave hacia arriba
    document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ========== RENDERIZAR CON PAGINACIÓN ==========
function renderizarConPaginacion() {
    const tbody = document.getElementById('permisosTableBody');
    if (!tbody) return;

    const totalItems = permisosFiltrados.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);

    // Ajustar página actual si está fuera de rango
    if (paginaActual > totalPaginas && totalPaginas > 0) {
        paginaActual = totalPaginas;
    }

    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const permisosPagina = permisosFiltrados.slice(inicio, fin);

    // Actualizar información de paginación
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        if (totalItems === 0) {
            paginationInfo.textContent = 'No se encontraron permisos';
        } else {
            paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} permisos`;
        }
    }

    // Mostrar/ocultar contenedor de paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = totalItems > ITEMS_POR_PAGINA ? 'flex' : 'none';
    }

    if (totalItems === 0) {
        if (!todosLosPermisos.length) {
            showEmptyState();
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-search" style="font-size: 48px; color: rgba(255,255,255,0.3); margin-bottom: 16px;"></i>
                            <h5 style="color:white;">No se encontraron permisos</h5>
                            <p style="color: var(--color-text-dim); margin-top: 10px;">
                                ${terminoBusqueda ? `No hay resultados para "${terminoBusqueda}"` : ''}
                            </p>
                        </div>
                    </td>
                </tr>
            `;
        }
        renderizarPaginacion(0);
        return;
    }

    renderPermisosTable(permisosPagina);
    renderizarPaginacion(totalPaginas);
}

// ========== CARGAR PERMISOS ==========
async function loadPermisos() {
    try {
        showLoadingState();

        todosLosPermisos = await permisoManager.getPermisosByOrganizacion(
            adminActual.organizacionCamelCase
        );

        // Enriquecer permisos con nombres de área y cargo
        todosLosPermisos = todosLosPermisos.map(permiso => {
            const area = areasCache.get(permiso.areaId);
            let cargoNombre = '';

            if (area && area.cargos && permiso.cargoId) {
                cargoNombre = area.cargos[permiso.cargoId]?.nombre || '';
            }

            return {
                ...permiso,
                areaNombre: area?.nombre || 'Área no encontrada',
                cargoNombre: cargoNombre
            };
        });

        localStorage.setItem('permisosList', JSON.stringify(
            todosLosPermisos.map(perm => ({
                id: perm.id,
                areaId: perm.areaId,
                cargoId: perm.cargoId,
                areaNombre: perm.areaNombre,
                cargoNombre: perm.cargoNombre,
                permisos: perm.permisos,
                estado: perm.estado,
                fechaCreacion: perm.fechaCreacion
            }))
        ));

        // Inicializar filtradas
        permisosFiltrados = [...todosLosPermisos];

        renderizarConPaginacion();

    } catch (error) {
        console.error('❌ Error cargando permisos:', error);
        showFirebaseError(error);
    }
}

// ========== RENDERIZAR TABLA DE PERMISOS ==========
function renderPermisosTable(permisos) {
    const tbody = document.getElementById('permisosTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    permisos.forEach(permiso => {
        const row = document.createElement('tr');

        // Determinar estado
        const estado = permiso.estado || 'activo';
        const estadoTexto = estado === 'activo' ? 'Activo' : 'Inactivo';
        const estadoColor = estado === 'activo' ? '#10b981' : '#ef4444';

        // Construir badges de permisos
        const permisosHTML = `
            <div class="permisos-container">
                <span class="permiso-badge ${permiso.permisos?.ver ? 'activo' : 'inactivo'}">
                    <i class="fas fa-eye"></i> Ver
                </span>
                <span class="permiso-badge ${permiso.permisos?.crear ? 'activo' : 'inactivo'}">
                    <i class="fas fa-plus-circle"></i> Crear
                </span>
                <span class="permiso-badge ${permiso.permisos?.editar ? 'activo' : 'inactivo'}">
                    <i class="fas fa-edit"></i> Editar
                </span>
                <span class="permiso-badge ${permiso.permisos?.eliminar ? 'activo' : 'inactivo'}">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </span>
            </div>
        `;

        // Usar data-label para responsive
        row.innerHTML = `
            <td data-label="Área">
                <div style="display: flex; align-items: center;">
                    <i class= style="color: var(--color-accent-primary); margin-right: 8px; font-size: 14px;"></i>
                    <strong style="color:white;" title="${escapeHTML(permiso.areaNombre || '')}">${escapeHTML(permiso.areaNombre)}</strong>
                </div>
            </td>
            <td data-label="Cargo">
                <div style="display: flex; align-items: center;">
                    <i class="" style="color: var(--color-accent-secondary); margin-right: 8px; font-size: 14px;"></i>
                    <span>${escapeHTML(permiso.cargoNombre || 'Cargo no encontrado')}</span>
                </div>
            </td>
            <td data-label="Permisos">
                ${permisosHTML}
            </td>
            <td data-label="Estado">
                <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 20px; background: rgba(0,0,0,0.3); border: 1px solid ${estadoColor}20;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${estadoColor};"></span>
                    <span style="color: ${estadoColor};">${estadoTexto}</span>
                </span>
            </td>
            <td data-label="Acciones">
                <div class="btn-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button type="button" class="btn" data-action="view" data-permiso-id="${permiso.id}" data-permiso-area="${permiso.areaNombre}" data-permiso-cargo="${permiso.cargoNombre}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-warning" data-action="edit" data-permiso-id="${permiso.id}" data-permiso-area="${permiso.areaNombre}" data-permiso-cargo="${permiso.cargoNombre}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-danger" data-action="delete" data-permiso-id="${permiso.id}" data-permiso-area="${permiso.areaNombre}" data-permiso-cargo="${permiso.cargoNombre}" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ========== CONFIGURAR EVENTOS ==========
function setupEvents() {
    // El botón "Agregar Permiso" es un enlace <a> en el header
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            // No prevenir el default para que el enlace funcione
        });
    }

    const tableBody = document.getElementById('permisosTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button');

            if (!button) return;

            const permisoId = button.getAttribute('data-permiso-id');
            const permisoArea = button.getAttribute('data-permiso-area');
            const permisoCargo = button.getAttribute('data-permiso-cargo');
            const action = button.getAttribute('data-action');

            if (action === 'edit' || button.classList.contains('btn-warning')) {
                await editPermiso(permisoId, permisoArea, permisoCargo);
            }
            else if (action === 'view' || (button.classList.contains('btn') && !button.classList.contains('btn-warning') && !button.classList.contains('btn-danger'))) {
                await viewPermisoDetails(permisoId, permisoArea, permisoCargo);
            }
            else if (action === 'delete' || button.classList.contains('btn-danger')) {
                await deletePermiso(permisoId, permisoArea, permisoCargo);
            }
        });
    }
}

// ========== EDITAR PERMISO ==========
async function editPermiso(permisoId, areaNombre, cargoNombre) {
    const permiso = todosLosPermisos.find(p => p.id === permisoId);
    if (!permiso) return;

    const selectedPermiso = {
        id: permisoId,
        areaId: permiso.areaId,
        cargoId: permiso.cargoId,
        areaNombre: areaNombre,
        cargoNombre: cargoNombre,
        permisos: permiso.permisos,
        organizacion: adminActual.organizacion,
        organizacionCamelCase: adminActual.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: adminActual.nombreCompleto
    };

    localStorage.setItem('selectedPermiso', JSON.stringify(selectedPermiso));

    window.location.href = `/usuarios/administrador/editarPermiso/editarPermiso.html?id=${permisoId}&org=${adminActual.organizacionCamelCase}`;
}

// ========== VER DETALLES DEL PERMISO ==========
async function viewPermisoDetails(permisoId, areaNombre, cargoNombre) {
    try {
        const permiso = todosLosPermisos.find(p => p.id === permisoId);

        if (!permiso) {
            throw new Error('Permiso no encontrado');
        }

        // Asegurarse de que el permiso tenga organizacionCamelCase
        if (!permiso.organizacionCamelCase) {
            permiso.organizacionCamelCase = adminActual.organizacionCamelCase;
        }

        showPermisoDetails(permiso, areaNombre, cargoNombre);

    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron obtener los detalles del permiso'
        });
    }
}

// ========== MOSTRAR DETALLES EN MODAL ==========
function showPermisoDetails(permiso, areaNombre, cargoNombre) {
    const fechaCreacion = permiso.getFechaCreacionFormateada ?
        permiso.getFechaCreacionFormateada() :
        (permiso.fechaCreacion || 'No disponible');
    const fechaActualizacion = permiso.getFechaActualizacionFormateada ?
        permiso.getFechaActualizacionFormateada() :
        (permiso.fechaActualizacion || 'No disponible');

    // Construir lista de permisos activos
    const permisosActivos = [];
    if (permiso.permisos?.ver) permisosActivos.push('<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Ver</span>');
    if (permiso.permisos?.crear) permisosActivos.push('<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Crear</span>');
    if (permiso.permisos?.editar) permisosActivos.push('<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Editar</span>');
    if (permiso.permisos?.eliminar) permisosActivos.push('<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Eliminar</span>');

    const permisosHTML = permisosActivos.length > 0 ?
        permisosActivos.join(' ') :
        '<span style="color: #ef4444;"><i class="fas fa-times-circle"></i> Sin permisos</span>';

    Swal.fire({
        title: 'Detalles del Permiso',
        html:/*html*/ `
            <div style="text-align: left;">
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-info-circle" style="margin-right: 8px;"></i>INFORMACIÓN GENERAL
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Área</small>
                            <span style="color: var(--color-text-secondary);"><i class="fas fa-building" style="margin-right: 5px;"></i> ${escapeHTML(areaNombre)}</span>
                        </div>
                        <div>
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Cargo</small>
                            <span style="color: var(--color-text-secondary);"><i class="fas fa-user-tie" style="margin-right: 5px;"></i> ${escapeHTML(cargoNombre)}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-lock" style="margin-right: 8px;"></i>PERMISOS ASIGNADOS
                    </h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                        ${permisosHTML}
                    </div>
                </div>

                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-calendar-alt" style="margin-right: 8px;"></i>FECHAS
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Creación</small>
                            <span style="color: var(--color-text-secondary);"><i class="fas fa-calendar-plus" style="margin-right: 5px;"></i> ${fechaCreacion}</span>
                        </div>
                        <div>
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Actualización</small>
                            <span style="color: var(--color-text-secondary);"><i class="fas fa-calendar-check" style="margin-right: 5px;"></i> ${fechaActualizacion}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-user-shield" style="margin-right: 8px;"></i>AUDITORÍA
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Estado</small>
                            <span style="color: ${permiso.estado === 'activo' ? '#10b981' : '#ef4444'};">
                                <i class="fas ${permiso.estado === 'activo' ? 'fa-check-circle' : 'fa-times-circle'}" style="margin-right: 5px;"></i> 
                                ${permiso.estado === 'activo' ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div>
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Organización</small>
                            <span style="color: var(--color-text-secondary);"><i class="fas fa-globe" style="margin-right: 5px;"></i> ${permiso.organizacionCamelCase || adminActual.organizacion}</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        width: 700,
        showCloseButton: true,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: 'EDITAR PERMISO',
        cancelButtonText: 'CERRAR',
        confirmButtonColor: 'var(--color-accent-primary)',
        cancelButtonColor: 'var(--color-border-light)',
        reverseButtons: false,
        focusCancel: true,
        preConfirm: () => {
            window.location.href = `/usuarios/administrador/editarPermiso/editarPermiso.html?id=${permiso.id}&org=${adminActual.organizacionCamelCase}`;
        }
    });
}

// ========== ELIMINAR PERMISO ==========
async function deletePermiso(permisoId, areaNombre, cargoNombre) {
    const confirmResult = await Swal.fire({
        title: '¿Eliminar permiso?',
        html: `
            <p style="color: var(--color-text-primary); margin: 10px 0; font-size: 1.1rem;">
                <strong style="color: #ff4d4d;">"${escapeHTML(areaNombre)} - ${escapeHTML(cargoNombre)}"</strong>
            </p>
            <p style="color: var(--color-text-dim); font-size: 0.8rem; margin-top: 15px;">
                Esta acción no se puede deshacer.
            </p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ELIMINAR',
        cancelButtonText: 'CANCELAR',
        reverseButtons: false,
        focusCancel: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        await permisoManager.eliminarPermiso(permisoId, adminActual.id, adminActual.organizacionCamelCase);

        Swal.close();

        await Swal.fire({
            icon: 'success',
            title: '¡Permiso eliminado!',
            text: `El permiso para "${areaNombre} - ${cargoNombre}" ha sido eliminado.`,
            timer: 2000,
            showConfirmButton: false
        });

        await loadPermisos();

    } catch (error) {
        console.error('❌ Error eliminando permiso:', error);
        Swal.close();

        Swal.fire({
            icon: 'error',
            title: 'Error al eliminar',
            text: error.message || 'Ocurrió un error al eliminar el permiso.'
        });
    }
}

// ========== ESTADOS DE CARGA Y ERROR ==========
function showLoadingState() {
    const tbody = document.getElementById('permisosTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-spinner fa-spin" style="font-size:48px; color:var(--color-accent-primary); margin-bottom:16px;"></i>
                    <h5 style="color:white;">Cargando permisos...</h5>
                    <p style="color:var(--color-text-dim);">Obteniendo datos de Firebase</p>
                </div>
            </td>
        </tr>
    `;

    // Ocultar paginación mientras carga
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = 'none';
    }
}

function showEmptyState() {
    const tbody = document.getElementById('permisosTableBody');
    if (!tbody) return;

    tbody.innerHTML = /*html*/ `
        <tr>
            <td colspan="5" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-shield-alt" style="font-size:48px; color:rgba(0,207,255,0.3); margin-bottom:16px;"></i>
                    <h5 style="color:white;">No hay permisos configurados en ${adminActual?.organizacion || 'tu organización'}</h5>
                    <p style="color:var(--color-text-dim); max-width:400px; margin:10px auto;">
                        Los permisos te permiten controlar qué acciones puede realizar cada cargo en las diferentes áreas.
                    </p>
                    <a href="/usuarios/administrador/crearPermiso/crearPermiso.html" class="btn-nuevo-permiso-header" style="display:inline-flex; margin-top:16px;">
                        <i class="fas fa-plus-circle"></i> Crear Primer Permiso
                    </a>
                </div>
            </td>
        </tr>
    `;

    // Ocultar paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = 'none';
    }
}

function showNoAdminMessage() {
    const tbody = document.getElementById('permisosTableBody');
    if (!tbody) return;

    tbody.innerHTML = /*html*/ `
        <tr>
            <td colspan="5" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-user-slash" style="font-size:48px; color:#ef4444; margin-bottom:16px;"></i>
                    <h5 style="color:white;">No se detectó sesión activa de administrador</h5>
                    <p style="color:var(--color-text-dim);">Para gestionar permisos, debes iniciar sesión como administrador.</p>
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:16px;">
                        <button onclick="window.location.reload()" class="btn" style="padding:8px 16px !important; min-width:auto !important;">
                            <i class="fas fa-sync-alt"></i> Recargar
                        </button>
                        <button onclick="window.location.href='/usuarios/visitantes/inicioSesion/inicioSesion.html'" class="btn btn-warning" style="padding:8px 16px !important; min-width:auto !important;">
                            <i class="fas fa-sign-in-alt"></i> Iniciar sesión
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;

    // Ocultar paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = 'none';
    }
}

function showFirebaseError(error) {
    const tbody = document.getElementById('permisosTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#f97316; margin-bottom:16px;"></i>
                    <h5 style="color:white;">Error al cargar permisos</h5>
                    <p style="color:var(--color-text-dim); max-width:400px; margin:0 auto;">${escapeHTML(error.message || 'Error de conexión con Firebase')}</p>
                    <button onclick="window.location.reload()" class="btn" style="margin-top:16px; padding:8px 16px !important; min-width:auto !important;">
                        <i class="fas fa-sync-alt"></i> Recargar
                    </button>
                </div>
            </td>
        </tr>
    `;

    // Ocultar paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = 'none';
    }
}

function showError(message) {
    const tbody = document.getElementById('permisosTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-exclamation-circle" style="font-size:48px; color:#ef4444; margin-bottom:16px;"></i>
                    <h5 style="color:white;">${escapeHTML(message)}</h5>
                    <button onclick="window.location.reload()" class="btn" style="margin-top:16px; padding:8px 16px !important; min-width:auto !important;">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>
            </td>
        </tr>
    `;

    // Ocultar paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = 'none';
    }
}

// ========== UTILIDADES ==========
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}