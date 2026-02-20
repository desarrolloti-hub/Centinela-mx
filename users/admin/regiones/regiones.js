// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {    
    try {
        const { RegionManager } = await import('/clases/region.js');
        
        const regionManager = new RegionManager();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Acceder directamente al usuario actual desde window.userManager
        if (!window.userManager || !window.userManager.currentUser || !window.userManager.currentUser.esAdministrador()) {
            console.error('❌ No hay administrador autenticado');
            showNoAdminMessage();
            return;
        }
        
        const admin = window.userManager.currentUser;
        
        localStorage.setItem('adminInfo', JSON.stringify({
            id: admin.id,
            nombreCompleto: admin.nombreCompleto,
            organizacion: admin.organizacion,
            organizacionCamelCase: admin.organizacionCamelCase,
            rol: admin.rol,
            correoElectronico: admin.correoElectronico,
            timestamp: new Date().toISOString()
        }));
        
        await loadRegions(admin, regionManager);
        setupEvents(admin, regionManager);
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CARGAR REGIONES ==========
async function loadRegions(admin, regionManager) {
    try {
        showLoadingState();
        
        const regiones = await regionManager.getRegionesByOrganizacion(
            admin.organizacionCamelCase
        );
        
        localStorage.setItem('regionesList', JSON.stringify(
            regiones.map(reg => ({
                id: reg.id,
                nombre: reg.nombre,
                color: reg.color,
                organizacion: reg.organizacion,
                fechaCreacion: reg.fechaCreacion
            }))
        ));
        
        if (regiones.length === 0) {
            showEmptyState(admin);
        } else {
            renderRegionsTable(regiones, admin);
        }
        
    } catch (error) {
        console.error('❌ Error cargando regiones:', error);
        showFirebaseError(error);
    }
}

// ========== RENDERIZAR TABLA DE REGIONES ==========
function renderRegionsTable(regiones, admin) {
    const tbody = document.querySelector('.regions-table tbody');
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
        
        row.innerHTML = `
            <td data-label="NOMBRE">
                <div class="region-info">
                    <span class="color-preview" style="background: ${reg.color}; width: 20px; height: 20px; display: inline-block; border-radius: 4px; margin-right: 10px;"></span>
                    <strong>${reg.nombre}</strong>
                </div>
            </td>
            <td data-label="COLOR">
                <span class="color-badge" style="background: ${reg.color}; color: white; padding: 4px 8px; border-radius: 4px; font-family: monospace;">
                    ${reg.color}
                </span>
            </td>
            <td data-label="FECHA CREACIÓN">${fechaCreacion}</td>
            <td data-label="ACCIONES" class="actions-cell">
                <button class="row-btn view" title="Ver detalles" 
                    data-region-id="${reg.id}"
                    data-region-name="${reg.nombre}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="row-btn edit" title="Editar" 
                    data-region-id="${reg.id}"
                    data-region-name="${reg.nombre}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="row-btn delete" title="Eliminar" 
                    data-region-id="${reg.id}"
                    data-region-name="${reg.nombre}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ========== CONFIGURAR EVENTOS ==========
function setupEvents(admin, regionManager) {
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '/users/admin/crearRegiones/crearRegiones.html';
        });
    }
    
    const table = document.querySelector('.regions-table');
    if (table) {
        table.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const row = e.target.closest('tr');
            
            if (!button || !row) return;
            
            const regionId = button.getAttribute('data-region-id');
            const regionName = button.getAttribute('data-region-name');
            
            if (button.classList.contains('edit')) {
                await editRegion(regionId, regionName, admin);
            } 
            else if (button.classList.contains('view')) {
                await viewRegionDetails(regionId, regionName, admin, regionManager);
            }
            else if (button.classList.contains('delete')) {
                await deleteRegion(regionId, regionName, admin, regionManager);
            }
        });
    }
}

// ========== EDITAR REGIÓN ==========
async function editRegion(regionId, regionName, admin) {    
    const selectedRegion = {
        id: regionId,
        nombre: regionName,
        organizacion: admin.organizacion,
        organizacionCamelCase: admin.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: admin.nombreCompleto
    };
    
    localStorage.setItem('selectedRegion', JSON.stringify(selectedRegion));
    
    window.location.href = `/users/admin/editarRegiones/editarRegiones.html?id=${regionId}&org=${admin.organizacionCamelCase}`;
}

// ========== VER DETALLES DE LA REGIÓN ==========
async function viewRegionDetails(regionId, regionName, admin, regionManager) {
    try {
        const region = await regionManager.getRegionById(regionId, admin.organizacionCamelCase);
        
        if (!region) {
            throw new Error('Región no encontrada');
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
    // Usar los métodos de la clase Region para formatear las fechas
    const fechaCreacion = region.getFechaCreacionFormateada();
    const fechaActualizacion = region.getFechaActualizacionFormateada();
    
    Swal.fire({
        title: `Detalles de: ${regionName}`,
        html: `
            <div class="swal-details-container">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; width: 60px; height: 60px; background: ${region.color}; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>
                </div>
                
                <div class="swal-details-grid">
                    <div class="swal-detail-card">
                        <p><strong>Nombre:</strong><br><span>${region.nombre}</span></p>
                        <p><strong>Color:</strong><br>
                            <span style="display: inline-block; padding: 4px 8px; background: ${region.color}; color: white; border-radius: 4px; font-family: monospace;">
                                ${region.color}
                            </span>
                        </p>
                        <p><strong>Organización:</strong><br><span>${region.organizacion || 'No especificada'}</span></p>
                    </div>
                    <div class="swal-detail-card">
                        <p><strong>Fecha de creación:</strong><br><span>${fechaCreacion}</span></p>
                        <p><strong>Última actualización:</strong><br><span>${fechaActualizacion}</span></p>
                        <p><strong>Creado por:</strong><br><span>${region.creadoPorNombre || 'Sistema'}</span></p>
                        <p><strong>Email creador:</strong><br><span>${region.creadoPorEmail || 'No disponible'}</span></p>
                    </div>
                </div>
            </div>
        `,
        width: 700,
        showCloseButton: true,
        showConfirmButton: false
    });
}

// ========== ELIMINAR REGIÓN ==========
async function deleteRegion(regionId, regionName, admin, regionManager) {
    // Mostrar confirmación antes de eliminar
    const confirmResult = await Swal.fire({
        title: '¿Eliminar región?',
        html: `
            <div style="text-align: center;">
                <p style="font-size: 1.1rem; margin-bottom: 15px;">
                    ¿Estás seguro de que deseas eliminar la región <strong>"${regionName}"</strong>?
                </p>
                <div padding: 10px; border-radius: 4px; margin-top: 10px;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                    <strong>Advertencia:</strong> Esta acción no se puede deshacer.
                </div>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'SÍ, ELIMINAR',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        allowOutsideClick: false
    });

    if (!confirmResult.isConfirmed) return;

    // Mostrar loader
    Swal.fire({
        title: 'Eliminando región...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // Eliminar la región
        await regionManager.deleteRegion(regionId, admin.organizacionCamelCase);
        
        Swal.close();
        
        // Mostrar mensaje de éxito
        await Swal.fire({
            icon: 'success',
            title: '¡Región eliminada!',
            html: `La región <strong>"${regionName}"</strong> ha sido eliminada correctamente.`,
            confirmButtonText: 'ACEPTAR'
        });
        
        // Recargar la lista de regiones
        await loadRegions(admin, regionManager);
        
    } catch (error) {
        console.error('❌ Error eliminando región:', error);
        Swal.close();
        
        Swal.fire({
            icon: 'error',
            title: 'Error al eliminar',
            text: error.message || 'Ocurrió un error al eliminar la región. Por favor intenta de nuevo.',
            confirmButtonText: 'ENTENDIDO'
        });
    }
}

// ========== ESTADO VACÍO ==========
function showEmptyState(admin) {
    const tbody = document.querySelector('.regions-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="empty-state">
                <div class="empty-state-content">
                    <i class="fas fa-map-marked-alt"></i>
                    <h3>No hay regiones en ${admin.organizacion || 'tu organización'}</h3>
                    <p>Comienza agregando tu primera región</p>
                    <button class="add-first-btn" id="addFirstRegion">
                        <i class="fas fa-plus-circle"></i> CREAR PRIMERA REGIÓN
                    </button>
                </div>
            </td>
        </tr>
    `;
    
    document.getElementById('addFirstRegion')?.addEventListener('click', () => {
        window.location.href = '/users/admin/crearRegiones/crearRegiones.html';
    });
}

// ========== ESTADO DE CARGA ==========
function showLoadingState() {
    const tbody = document.querySelector('.regions-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="loading-state">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3>Cargando regiones...</h3>
                    <p>Obteniendo datos de Firebase</p>
                </div>
            </td>
        </tr>
    `;
}

// ========== MANEJO DE ERRORES ==========
function showNoAdminMessage() {
    const tbody = document.querySelector('.regions-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="error-state">
                <div class="error-content">
                    <i class="fas fa-user-slash"></i>
                    <h3>No se detectó sesión activa de administrador</h3>
                    <p>Para gestionar regiones, debes iniciar sesión como administrador.</p>
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
}

function showFirebaseError(error) {
    const tbody = document.querySelector('.regions-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="error-state">
                <div class="error-content firebase-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar regiones</h3>
                    <p class="error-message">${error.message || 'Error de conexión con Firebase'}</p>
                    <p>Verifica tu conexión a internet y recarga la página.</p>
                    <button onclick="window.location.reload()" class="reload-btn">
                        <i class="fas fa-sync-alt"></i> Recargar página
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function showError(message) {
    const tbody = document.querySelector('.regions-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="error-state">
                <div class="error-content">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>${message}</h3>
                    <button onclick="window.location.reload()" class="reload-btn">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>
            </td>
        </tr>
    `;
}