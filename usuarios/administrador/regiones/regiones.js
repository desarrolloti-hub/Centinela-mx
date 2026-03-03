// ========== VARIABLES GLOBALES ==========
let regionManager = null;
let adminActual = null;

// Configuración de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;
let terminoBusqueda = '';
let todasLasRegiones = []; // Almacena todas las regiones para búsqueda
let regionesFiltradas = []; // Regiones filtradas para mostrar

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {    
    try {
        const { RegionManager } = await import('/clases/region.js');
        
        regionManager = new RegionManager();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Acceder directamente al usuario actual desde window.userManager
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
        
        await loadRegions();
        configurarBusqueda();
        setupEvents();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CONFIGURAR BÚSQUEDA ==========
function configurarBusqueda() {
    const inputBuscar = document.getElementById('buscarRegion');
    const btnBuscar = document.getElementById('btnBuscarRegion');
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
    if (!todasLasRegiones.length) {
        regionesFiltradas = [];
    } else if (!terminoBusqueda || terminoBusqueda.length < 2) {
        // Si no hay término de búsqueda, mostrar todas
        regionesFiltradas = [...todasLasRegiones];
    } else {
        // Filtrar en memoria
        const terminoLower = terminoBusqueda.toLowerCase();
        regionesFiltradas = todasLasRegiones.filter(reg => 
            (reg.nombre && reg.nombre.toLowerCase().includes(terminoLower)) ||
            (reg.color && reg.color.toLowerCase().includes(terminoLower))
        );
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
                <button class="page-link" onclick="window.irPaginaRegion(${i})">${i}</button>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

// Hacer la función global para que funcionen los botones
window.irPaginaRegion = function(pagina) {
    paginaActual = pagina;
    renderizarConPaginacion();
    
    // Scroll suave hacia arriba
    document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ========== RENDERIZAR CON PAGINACIÓN ==========
function renderizarConPaginacion() {
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;

    const totalItems = regionesFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    
    // Ajustar página actual si está fuera de rango
    if (paginaActual > totalPaginas && totalPaginas > 0) {
        paginaActual = totalPaginas;
    }
    
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const regionesPagina = regionesFiltradas.slice(inicio, fin);

    // Actualizar información de paginación
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        if (totalItems === 0) {
            paginationInfo.textContent = 'No se encontraron regiones';
        } else {
            paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} regiones`;
        }
    }

    // Mostrar/ocultar contenedor de paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = totalItems > ITEMS_POR_PAGINA ? 'flex' : 'none';
    }

    if (totalItems === 0) {
        if (!todasLasRegiones.length) {
            showEmptyState();
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state" style="text-align:center; padding:60px 20px;">
                        <div style="text-align:center;">
                            <i class="fas fa-search" style="font-size: 48px; color: rgba(255,255,255,0.3); margin-bottom: 16px;"></i>
                            <h5 style="color:white;">No se encontraron regiones</h5>
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

    renderRegionsTable(regionesPagina);
    renderizarPaginacion(totalPaginas);
}

// ========== CARGAR REGIONES ==========
async function loadRegions() {
    try {
        showLoadingState();
        
        todasLasRegiones = await regionManager.getRegionesByOrganizacion(
            adminActual.organizacionCamelCase
        );
        
        localStorage.setItem('regionesList', JSON.stringify(
            todasLasRegiones.map(reg => ({
                id: reg.id,
                nombre: reg.nombre,
                color: reg.color,
                organizacion: reg.organizacion,
                fechaCreacion: reg.fechaCreacion
            }))
        ));
        
        // Inicializar filtradas
        regionesFiltradas = [...todasLasRegiones];
        
        renderizarConPaginacion();
        
    } catch (error) {
        console.error('❌ Error cargando regiones:', error);
        showFirebaseError(error);
    }
}

// ========== RENDERIZAR TABLA DE REGIONES ==========
function renderRegionsTable(regiones) {
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    regiones.forEach(reg => {
        const row = document.createElement('tr');
        
        let fechaCreacion = 'No disponible';
        if (reg.fechaCreacion) {
            if (reg.fechaCreacion.toDate) {
                fechaCreacion = reg.fechaCreacion.toDate().toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } else if (reg.fechaCreacion instanceof Date) {
                fechaCreacion = reg.fechaCreacion.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } else if (typeof reg.fechaCreacion === 'string') {
                fechaCreacion = new Date(reg.fechaCreacion).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        }

        // Usar las clases de CSS y la estructura de data-label para móvil
        row.innerHTML = `
            <td data-label="Nombre">
                <div style="display: flex; align-items: center;">
                    <div style="width:4px; height:24px; background:${reg.color}; border-radius:2px; margin-right:12px; flex-shrink:0;"></div>
                    <div>
                        <strong style="color:white;" title="${escapeHTML(reg.nombre || '')}">${escapeHTML(reg.nombre)}</strong>
                    </div>
                </div>
            </td>
            <td data-label="Color">
                <div class="color-display">
                    <span class="color-indicator" style="background-color: ${reg.color};"></span>
                    <span>${reg.color}</span>
                </div>
            </td>
            <td data-label="Fecha Creación">${fechaCreacion}</td>
            <td data-label="Acciones">
                <div class="btn-group" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button type="button" class="btn" data-action="view" data-region-id="${reg.id}" data-region-name="${reg.nombre}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-warning" data-action="edit" data-region-id="${reg.id}" data-region-name="${reg.nombre}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-danger" data-action="delete" data-region-id="${reg.id}" data-region-name="${reg.nombre}" title="Eliminar">
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
    // El botón "Agregar Región" ahora es un enlace <a> en el header, pero mantenemos el evento por si acaso
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            // No prevenir el default para que el enlace funcione.
            // window.location.href = '/users/admin/crearRegiones/crearRegiones.html';
        });
    }
    
    const tableBody = document.getElementById('regionsTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            
            if (!button) return;
            
            const regionId = button.getAttribute('data-region-id');
            const regionName = button.getAttribute('data-region-name');
            const action = button.getAttribute('data-action');
            
            if (action === 'edit' || button.classList.contains('btn-warning')) {
                await editRegion(regionId, regionName);
            } 
            else if (action === 'view' || (button.classList.contains('btn') && !button.classList.contains('btn-warning') && !button.classList.contains('btn-danger'))) {
                await viewRegionDetails(regionId, regionName);
            }
            else if (action === 'delete' || button.classList.contains('btn-danger')) {
                await deleteRegion(regionId, regionName);
            }
        });
    }
}

// ========== EDITAR REGIÓN ==========
async function editRegion(regionId, regionName) {    
    const selectedRegion = {
        id: regionId,
        nombre: regionName,
        organizacion: adminActual.organizacion,
        organizacionCamelCase: adminActual.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: adminActual.nombreCompleto
    };
    
    localStorage.setItem('selectedRegion', JSON.stringify(selectedRegion));
    
    window.location.href = `/usuarios/administrador/editarRegiones/editarRegiones.html?id=${regionId}&org=${adminActual.organizacionCamelCase}`;
}

// ========== VER DETALLES DE LA REGIÓN ==========
async function viewRegionDetails(regionId, regionName) {
    try {
        const region = await regionManager.getRegionById(regionId, adminActual.organizacionCamelCase);
        
        if (!region) {
            throw new Error('Región no encontrada');
        }
        
        // Asegurarse de que la región tenga organizacionCamelCase
        if (!region.organizacionCamelCase) {
            region.organizacionCamelCase = adminActual.organizacionCamelCase;
        }
        
        showRegionDetails(region, regionName);
        
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron obtener los detalles de la región'
        });
    }
}

// ========== MOSTRAR DETALLES EN MODAL ==========
function showRegionDetails(region, regionName) {
    const fechaCreacion = region.getFechaCreacionFormateada ? region.getFechaCreacionFormateada() : (region.fechaCreacion || 'No disponible');
    const fechaActualizacion = region.getFechaActualizacionFormateada ? region.getFechaActualizacionFormateada() : (region.fechaActualizacion || 'No disponible');
    
    Swal.fire({
        title: regionName,
        html:/*html*/ `
            <div style="text-align: left;">
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                    <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">
                        <i class="fas fa-info-circle" style="margin-right: 8px;"></i>INFORMACIÓN GENERAL
                    </h4>
                    <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                        <span style="display:inline-block; width:40px; height:40px; background:${region.color}; border-radius:6px; border:2px solid rgba(255,255,255,0.1);"></span>
                        <span style="color: var(--color-text-secondary);"><strong>Color:</strong> ${region.color}</span>
                        <span style="color: var(--color-text-secondary);"><strong>Organización:</strong> ${region.organizacion || 'No especificada'}</span>
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
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Creado por</small>
                            <span style="color: var(--color-text-secondary);"><i class="fas fa-user" style="margin-right: 5px;"></i> ${region.creadoPorNombre || 'Sistema'}</span>
                        </div>
                        <div>
                            <small style="color: var(--color-accent-primary); display: block; font-size: 0.7rem; text-transform: uppercase;">Email</small>
                            <span style="color: var(--color-text-secondary);">${region.creadoPorEmail || 'No disponible'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        width: 700,
        showCloseButton: true,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: 'EDITAR REGIÓN',
        cancelButtonText: 'CERRAR',
        confirmButtonColor: 'var(--color-accent-primary)',
        cancelButtonColor: 'var(--color-border-light)',
        reverseButtons: false,
        focusCancel: true,
        preConfirm: () => {
            window.location.href = `/usuarios/administrador/editarRegiones/editarRegiones.html?id=${region.id}&org=${region.organizacionCamelCase || ''}`;
        }
    });
}

// ========== ELIMINAR REGIÓN ==========
async function deleteRegion(regionId, regionName) {
    const confirmResult = await Swal.fire({
        title: '¿Eliminar región?',
        html: `
            <p style="color: var(--color-text-primary); margin: 10px 0; font-size: 1.1rem;">
                <strong style="color: #ff4d4d;">"${escapeHTML(regionName)}"</strong>
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
        await regionManager.deleteRegion(regionId, adminActual.organizacionCamelCase);
        
        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: '¡Región eliminada!',
            text: `"${regionName}" ha sido eliminada.`,
            timer: 2000,
            showConfirmButton: false
        });
        
        await loadRegions();
        
    } catch (error) {
        console.error('❌ Error eliminando región:', error);
        Swal.close();
        
        if (error.message.includes('tiene') && error.message.includes('sucursal')) {
            Swal.fire({
                icon: 'error',
                title: 'No se puede eliminar la región',
                html: `
                    <div style="text-align: left;">
                        <p style="color: var(--color-text-secondary);">
                            <i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 8px;"></i> 
                            ${error.message}
                        </p>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error al eliminar',
                text: error.message || 'Ocurrió un error al eliminar la región.'
            });
        }
    }
}

// ========== ESTADOS DE CARGA Y ERROR ==========
function showLoadingState() {
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-spinner fa-spin" style="font-size:48px; color:var(--color-accent-primary); margin-bottom:16px;"></i>
                    <h5 style="color:white;">Cargando regiones...</h5>
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
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = /*html*/ `
        <tr>
            <td colspan="4" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-map-marked-alt" style="font-size:48px; color:rgba(16,185,129,0.3); margin-bottom:16px;"></i>
                    <h5 style="color:white;">No hay regiones en ${adminActual?.organizacion || 'tu organización'}</h5>
                    <a href="/usuarios/administrador/crearRegiones/crearRegiones.html" class="btn-nueva-region-header" style="display:inline-flex; margin-top:16px;">
                        <i class="fas fa-plus-circle"></i> Crear Primera Región
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
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = /*html*/ `
        <tr>
            <td colspan="4" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-user-slash" style="font-size:48px; color:#ef4444; margin-bottom:16px;"></i>
                    <h5 style="color:white;">No se detectó sesión activa de administrador</h5>
                    <p style="color:var(--color-text-dim);">Para gestionar regiones, debes iniciar sesión como administrador.</p>
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
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#f97316; margin-bottom:16px;"></i>
                    <h5 style="color:white;">Error al cargar regiones</h5>
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
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding:60px 20px;">
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