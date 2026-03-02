// ========== VARIABLES GLOBALES ==========
let sucursalManager = null;
let adminActual = null;

// Configuración de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;
let terminoBusqueda = '';
let todasLasSucursales = []; // Almacena todas las sucursales para búsqueda
let sucursalesFiltradas = []; // Sucursales filtradas para mostrar

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {    
    try {
        const { SucursalManager } = await import('/clases/sucursal.js');
        
        sucursalManager = new SucursalManager();
        
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
        
        await loadBranches();
        configurarBusqueda();
        setupEvents();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CONFIGURAR BÚSQUEDA ==========
function configurarBusqueda() {
    const inputBuscar = document.getElementById('buscarSucursal');
    const btnBuscar = document.getElementById('btnBuscarSucursal');
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
    if (!todasLasSucursales.length) {
        sucursalesFiltradas = [];
    } else if (!terminoBusqueda || terminoBusqueda.length < 2) {
        // Si no hay término de búsqueda, mostrar todas
        sucursalesFiltradas = [...todasLasSucursales];
    } else {
        // Filtrar en memoria
        const terminoLower = terminoBusqueda.toLowerCase();
        sucursalesFiltradas = todasLasSucursales.filter(suc => 
            (suc.nombre && suc.nombre.toLowerCase().includes(terminoLower)) ||
            (suc.direccion && suc.direccion.toLowerCase().includes(terminoLower)) ||
            (suc.ciudad && suc.ciudad.toLowerCase().includes(terminoLower)) ||
            (suc.contacto && suc.contacto.toLowerCase().includes(terminoLower)) ||
            (suc.tipo && suc.tipo.toLowerCase().includes(terminoLower))
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
                <button class="page-link" onclick="window.irPaginaSucursal(${i})">${i}</button>
            </li>
        `;
    }

    pagination.innerHTML = html;
}

// Hacer la función global para que funcionen los botones
window.irPaginaSucursal = function(pagina) {
    paginaActual = pagina;
    renderizarConPaginacion();
    
    // Scroll suave hacia arriba
    document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ========== RENDERIZAR CON PAGINACIÓN ==========
function renderizarConPaginacion() {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;

    const totalItems = sucursalesFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    
    // Ajustar página actual si está fuera de rango
    if (paginaActual > totalPaginas && totalPaginas > 0) {
        paginaActual = totalPaginas;
    }
    
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const sucursalesPagina = sucursalesFiltradas.slice(inicio, fin);

    // Actualizar información de paginación
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        if (totalItems === 0) {
            paginationInfo.textContent = 'No se encontraron sucursales';
        } else {
            paginationInfo.textContent = `Mostrando ${inicio + 1}-${fin} de ${totalItems} sucursales`;
        }
    }

    // Mostrar/ocultar contenedor de paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = totalItems > ITEMS_POR_PAGINA ? 'flex' : 'none';
    }

    if (totalItems === 0) {
        if (!todasLasSucursales.length) {
            showEmptyState();
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-search"></i>
                            <h3>No se encontraron sucursales</h3>
                            <p>${terminoBusqueda ? `No hay resultados para "${terminoBusqueda}"` : ''}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        renderizarPaginacion(0);
        return;
    }

    renderBranchesTable(sucursalesPagina);
    renderizarPaginacion(totalPaginas);
}

// ========== CARGAR SUCURSALES ==========
async function loadBranches() {
    try {
        showLoadingState();
        
        todasLasSucursales = await sucursalManager.getSucursalesByOrganizacion(
            adminActual.organizacionCamelCase
        );
        
        // Guardar en localStorage con campos directos
        localStorage.setItem('sucursalesList', JSON.stringify(
            todasLasSucursales.map(suc => ({
                id: suc.id,
                nombre: suc.nombre,
                tipo: suc.tipo,
                direccion: suc.direccion,
                ciudad: suc.ciudad,
                estado: suc.estado,
                zona: suc.zona,
                regionId: suc.regionId,
                contacto: suc.contacto,
                latitud: suc.latitud,
                longitud: suc.longitud,
                organizacionCamelCase: suc.organizacionCamelCase,
                fechaCreacion: suc.fechaCreacion
            }))
        ));
        
        // Inicializar filtradas
        sucursalesFiltradas = [...todasLasSucursales];
        
        renderizarConPaginacion();
        
    } catch (error) {
        console.error('❌ Error cargando sucursales:', error);
        showFirebaseError(error);
    }
}

// ========== RENDERIZAR TABLA DE SUCURSALES ==========
function renderBranchesTable(sucursales) {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    sucursales.forEach(suc => {
        const row = document.createElement('tr');
        
        // Formatear fecha de creación
        let fechaCreacion = 'No disponible';
        if (suc.fechaCreacion) {
            try {
                if (suc.fechaCreacion.toDate) {
                    fechaCreacion = suc.fechaCreacion.toDate().toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } else if (suc.fechaCreacion instanceof Date) {
                    fechaCreacion = suc.fechaCreacion.toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } else if (typeof suc.fechaCreacion === 'string') {
                    fechaCreacion = new Date(suc.fechaCreacion).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } else if (suc.fechaCreacion && typeof suc.fechaCreacion === 'object' && 'seconds' in suc.fechaCreacion) {
                    fechaCreacion = new Date(suc.fechaCreacion.seconds * 1000).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                console.warn('Error formateando fecha:', e);
                fechaCreacion = 'Fecha inválida';
            }
        }
        
        // Construir ubicación completa con campos directos
        const ubicacionPartes = [];
        if (suc.direccion) ubicacionPartes.push(suc.direccion);
        if (suc.ciudad) ubicacionPartes.push(suc.ciudad);
        if (suc.estado) ubicacionPartes.push(suc.estado);
        const ubicacionCompleta = ubicacionPartes.join(', ') || 'No disponible';
        
        // Formatear teléfono
        let telefonoFormateado = suc.contacto || 'No disponible';
        if (suc.contacto) {
            const telefono = suc.contacto.replace(/\D/g, '');
            if (telefono.length === 10) {
                telefonoFormateado = `${telefono.slice(0,3)} ${telefono.slice(3,6)} ${telefono.slice(6)}`;
            } else if (telefono.length > 0) {
                telefonoFormateado = suc.contacto; // Mostrar como está si no tiene 10 dígitos
            }
        }
        
        // Formatear tipo
        const tipoDisplay = suc.tipo ? suc.tipo.replace(/_/g, ' ').toUpperCase() : 'No especificado';
        
        row.innerHTML = `
            <td data-label="NOMBRE">
                <div class="branch-info">
                    <strong>${escapeHTML(suc.nombre)}</strong>
                </div>
            </td>
            <td data-label="TIPO">
                <span class="tipo-badge">
                    ${escapeHTML(tipoDisplay)}
                </span>
            </td>
            <td data-label="UBICACIÓN">
                <div class="ubicacion-info">
                    ${escapeHTML(ubicacionCompleta)}
                </div>
            </td>
            <td data-label="CONTACTO">
                <div class="contacto-info">
                    ${escapeHTML(telefonoFormateado)}
                </div>
            </td>
            <td data-label="FECHA CREACIÓN">
                <span style="color: var(--color-text-dim);">
                    ${escapeHTML(fechaCreacion)}
                </span>
            </td>
            <td data-label="ACCIONES">
                <div class="btn-group">
                    <button type="button" class="btn btn-view" data-action="view" data-branch-id="${suc.id}" data-branch-name="${escapeHTML(suc.nombre)}" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-edit" data-action="edit" data-branch-id="${suc.id}" data-branch-name="${escapeHTML(suc.nombre)}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-delete" data-action="delete" data-branch-id="${suc.id}" data-branch-name="${escapeHTML(suc.nombre)}" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Función auxiliar para escapar HTML
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ========== CONFIGURAR EVENTOS ==========
function setupEvents() {
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '/users/admin/crearSucursales/crearSucursales.html';
        });
    }
    
    const table = document.querySelector('.table');
    if (table) {
        table.addEventListener('click', async (e) => {
            const button = e.target.closest('.btn');
            
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            const branchId = button.getAttribute('data-branch-id');
            const branchName = button.getAttribute('data-branch-name');
            
            if (action === 'edit') {
                await editBranch(branchId, branchName);
            } 
            else if (action === 'view') {
                await viewBranchDetails(branchId, branchName);
            }
            else if (action === 'delete') {
                await deleteBranch(branchId, branchName);
            }
        });
    }
}

// ========== EDITAR SUCURSAL ==========
async function editBranch(branchId, branchName) {    
    const selectedBranch = {
        id: branchId,
        nombre: branchName,
        organizacion: adminActual.organizacion,
        organizacionCamelCase: adminActual.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: adminActual.nombreCompleto
    };
    
    localStorage.setItem('selectedBranch', JSON.stringify(selectedBranch));
    
    window.location.href = `/users/admin/editarSucursales/editarSucursales.html?id=${branchId}&org=${adminActual.organizacionCamelCase}`;
}

// ========== VER DETALLES DE LA SUCURSAL ==========
async function viewBranchDetails(branchId, branchName) {
    try {
        const sucursal = await sucursalManager.getSucursalById(branchId, adminActual.organizacionCamelCase);
        
        if (!sucursal) {
            throw new Error('Sucursal no encontrada');
        }
        
        await showBranchDetails(sucursal, branchName);
        
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron obtener los detalles de la sucursal'
        });
    }
}

// ========== MOSTRAR DETALLES EN MODAL ==========
async function showBranchDetails(sucursal, branchName) {
    try {
        // Mostrar loading mientras se obtienen los detalles de la región
        Swal.fire({
            title: 'Cargando detalles...',
            html: '<i class="fas fa-spinner fa-spin" style="font-size: 48px;"></i>',
            allowOutsideClick: false,
            showConfirmButton: false
        });
        
        // Obtener información de la región (asíncrona)
        const regionInfo = await sucursal.getRegionInfo();
        
        // Usar los métodos de la clase Sucursal para formatear
        const contactoFormateado = sucursal.getContactoFormateado();
        const ubicacionCompleta = sucursal.getUbicacionCompleta();
        const tipoDisplay = sucursal.tipo ? sucursal.tipo.replace(/_/g, ' ').toUpperCase() : 'No especificado';
        const coordenadas = sucursal.getCoordenadas();
        
        // Cerrar loading
        Swal.close();
        
        // Mostrar detalles
        Swal.fire({
            title: sucursal.nombre,
            html: /*html*/`
                <div style="text-align: left;">
                    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--color-border-light);">
                        <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">INFORMACIÓN GENERAL</h4>
                        <p style="margin: 8px 0;"><strong style="color: var(--color-accent-primary);">Tipo:</strong> <span style="color: var(--color-text-primary);">${escapeHTML(tipoDisplay)}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: var(--color-accent-primary);">Región:</strong> <span style="color: var(--color-text-primary);">${escapeHTML(regionInfo.nombre)}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: var(--color-accent-primary);">Contacto:</strong> <span style="color: var(--color-text-primary);">${escapeHTML(contactoFormateado)}</span></p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="color: var(--color-accent-primary); margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase;">UBICACIÓN</h4>
                        <p style="margin: 8px 0;"><strong style="color: var(--color-accent-primary);">Dirección:</strong> <span style="color: var(--color-text-primary);">${escapeHTML(ubicacionCompleta)}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: var(--color-accent-primary);">Coordenadas:</strong> <span style="color: var(--color-text-primary);">${escapeHTML(coordenadas.lat)}, ${escapeHTML(coordenadas.lng)}</span></p>
                    </div>
                </div>
            `,
            width: 600,
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: 'EDITAR',
            cancelButtonText: 'CERRAR',
            reverseButtons: false,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                editBranch(sucursal.id, sucursal.nombre);
            }
        });
        
    } catch (error) {
        console.error('Error mostrando detalles:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los detalles completos de la sucursal'
        });
    }
}

// ========== ELIMINAR SUCURSAL ==========
async function deleteBranch(branchId, branchName) {
    // Mostrar confirmación antes de eliminar
    const confirmResult = await Swal.fire({
        title: '¿Eliminar sucursal?',
        html: /*html*/`
            <div class="delete-confirmation">
                <p style="color: var(--color-text-primary); margin: 10px 0; font-size: 1.1rem;">
                    <strong style="color: #ff4d4d;">"${escapeHTML(branchName)}"</strong>
                </p>
                <div class="warning-message" style="background: rgba(255, 77, 77, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <i class="fas fa-exclamation-triangle" style="color: #ff4d4d; margin-right: 8px;"></i>
                    <strong style="color: #ff4d4d;">Advertencia:</strong> Esta acción no se puede deshacer.
                </div>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ELIMINAR',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        reverseButtons: false,
        focusCancel: true,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)'
    });

    if (!confirmResult.isConfirmed) return;

    // Mostrar loader
    Swal.fire({
        title: 'Eliminando sucursal...',
        html: '<i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #ff4d4d;"></i>',
        allowOutsideClick: false,
        showConfirmButton: false,
        background: 'var(--color-bg-secondary)'
    });

    try {
        await sucursalManager.eliminarSucursal(branchId, adminActual.organizacionCamelCase);
        
        Swal.close();
        
        // Mostrar mensaje de éxito
        await Swal.fire({
            icon: 'success',
            title: '¡Sucursal eliminada!',
            html: `La sucursal <strong style="color: #ff4d4d;">"${escapeHTML(branchName)}"</strong> ha sido eliminada correctamente.`,
            timer: 2000,
            showConfirmButton: false,
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
        
        // Recargar la lista de sucursales
        await loadBranches();
        
    } catch (error) {
        console.error('❌ Error eliminando sucursal:', error);
        Swal.close();
        
        Swal.fire({
            icon: 'error',
            title: 'Error al eliminar',
            text: error.message || 'Ocurrió un error al eliminar la sucursal. Por favor intenta de nuevo.',
            confirmButtonText: 'ENTENDIDO',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)'
        });
    }
}

// ========== ESTADO VACÍO ==========
function showEmptyState() {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <div class="empty-state-content">
                    <i class="fas fa-store-alt"></i>
                    <h3>No hay sucursales en ${escapeHTML(adminActual?.organizacion || 'tu organización')}</h3>
                    <p>Comienza agregando tu primera sucursal</p>
                    <button class="add-first-btn" id="addFirstBranch">
                        <i class="fas fa-plus-circle"></i> CREAR PRIMERA SUCURSAL
                    </button>
                </div>
            </td>
        </tr>
    `;
    
    document.getElementById('addFirstBranch')?.addEventListener('click', () => {
        window.location.href = '/users/admin/crearSucursales/crearSucursales.html';
    });

    // Ocultar paginación
    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = 'none';
    }
}

// ========== ESTADO DE CARGA ==========
function showLoadingState() {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = /*html*/`
        <tr>
            <td colspan="6" class="loading-state">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3>Cargando sucursales...</h3>
                    <p>Obteniendo datos de Firebase</p>
                </div>
            </td>
        </tr>
    `;
}

// ========== MANEJO DE ERRORES ==========
function showNoAdminMessage() {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = /*html*/`
        <tr>
            <td colspan="6" class="error-state">
                <div class="error-content">
                    <i class="fas fa-user-slash"></i>
                    <h3>No se detectó sesión activa de administrador</h3>
                    <p>Para gestionar sucursales, debes iniciar sesión como administrador.</p>
                    <div class="error-buttons">
                        <button onclick="window.location.reload()" class="reload-btn">
                            <i class="fas fa-sync-alt"></i> Recargar
                        </button>
                        <button onclick="window.location.href='/users/visitors/login/login.html'" class="login-btn">
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
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="error-state">
                <div class="error-content firebase-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar sucursales</h3>
                    <p class="error-message">${escapeHTML(error.message || 'Error de conexión con Firebase')}</p>
                    <p>Verifica tu conexión a internet y recarga la página.</p>
                    <button onclick="window.location.reload()" class="reload-btn">
                        <i class="fas fa-sync-alt"></i> Recargar página
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
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="error-state">
                <div class="error-content">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>${escapeHTML(message)}</h3>
                    <button onclick="window.location.reload()" class="reload-btn">
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