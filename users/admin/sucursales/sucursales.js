// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {    
    try {
        const { SucursalManager } = await import('/clases/sucursal.js');
        
        const sucursalManager = new SucursalManager();
        
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
        
        await loadBranches(admin, sucursalManager);
        setupEvents(admin, sucursalManager);
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CARGAR SUCURSALES ==========
async function loadBranches(admin, sucursalManager) {
    try {
        showLoadingState();
        
        const sucursales = await sucursalManager.getSucursalesByOrganizacion(
            admin.organizacionCamelCase
        );
        
        localStorage.setItem('sucursalesList', JSON.stringify(
            sucursales.map(suc => ({
                id: suc.id,
                nombre: suc.nombre,
                tipo: suc.tipo,
                ubicacion: suc.ubicacion,
                contacto: suc.contacto,
                coordenadas: suc.coordenadas,
                organizacionCamelCase: suc.organizacionCamelCase,
                fechaCreacion: suc.fechaCreacion
            }))
        ));
        
        if (sucursales.length === 0) {
            showEmptyState(admin);
        } else {
            renderBranchesTable(sucursales, admin);
        }
        
    } catch (error) {
        console.error('❌ Error cargando sucursales:', error);
        showFirebaseError(error);
    }
}

// ========== RENDERIZAR TABLA DE SUCURSALES ==========
function renderBranchesTable(sucursales, admin) {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    sucursales.forEach(suc => {
        const row = document.createElement('tr');
        
        let fechaCreacion = 'No disponible';
        if (suc.fechaCreacion) {
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
            }
        }
        
        // Construir ubicación completa
        const ubicacionPartes = [];
        if (suc.ubicacion?.direccion) ubicacionPartes.push(suc.ubicacion.direccion);
        if (suc.ubicacion?.ciudad) ubicacionPartes.push(suc.ubicacion.ciudad);
        if (suc.ubicacion?.estado) ubicacionPartes.push(suc.ubicacion.estado);
        if (suc.ubicacion?.regionNombre) ubicacionPartes.push(`Región: ${suc.ubicacion.regionNombre}`);
        const ubicacionCompleta = ubicacionPartes.join(', ') || 'No disponible';
        
        // Formatear teléfono
        let telefonoFormateado = suc.contacto || 'No disponible';
        if (suc.contacto) {
            const telefono = suc.contacto.replace(/\D/g, '');
            if (telefono.length === 10) {
                telefonoFormateado = `${telefono.slice(0,3)} ${telefono.slice(3,6)} ${telefono.slice(6)}`;
            }
        }
        
        // Obtener tipo
        const tipoDisplay = suc.tipo ? suc.tipo.replace(/_/g, ' ').toUpperCase() : 'No especificado';
        
        row.innerHTML = `
            <td data-label="NOMBRE">
                <div class="branch-info">
                    <strong>${suc.nombre}</strong>
                </div>
            </td>
            <td data-label="TIPO">
                <span class="tipo-badge">
                    ${tipoDisplay}
                </span>
            </td>
            <td data-label="UBICACIÓN">
                <div class="ubicacion-info">
                    ${ubicacionCompleta}
                </div>
            </td>
            <td data-label="CONTACTO">
                <div class="contacto-info">
                    ${telefonoFormateado}
                </div>
            </td>
            <td data-label="FECHA CREACIÓN">${fechaCreacion}</td>
            <td data-label="ACCIONES" class="actions-cell">
                <button class="row-btn view" title="Ver detalles" 
                    data-branch-id="${suc.id}"
                    data-branch-name="${suc.nombre}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="row-btn edit" title="Editar" 
                    data-branch-id="${suc.id}"
                    data-branch-name="${suc.nombre}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="row-btn delete" title="Eliminar" 
                    data-branch-id="${suc.id}"
                    data-branch-name="${suc.nombre}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ========== CONFIGURAR EVENTOS ==========
function setupEvents(admin, sucursalManager) {
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '/users/admin/crearSucursales/crearSucursales.html';
        });
    }
    
    const table = document.querySelector('.branches-table');
    if (table) {
        table.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const row = e.target.closest('tr');
            
            if (!button || !row) return;
            
            const branchId = button.getAttribute('data-branch-id');
            const branchName = button.getAttribute('data-branch-name');
            
            if (button.classList.contains('edit')) {
                await editBranch(branchId, branchName, admin);
            } 
            else if (button.classList.contains('view')) {
                await viewBranchDetails(branchId, branchName, admin, sucursalManager);
            }
            else if (button.classList.contains('delete')) {
                await deleteBranch(branchId, branchName, admin, sucursalManager);
            }
        });
    }
}

// ========== EDITAR SUCURSAL ==========
async function editBranch(branchId, branchName, admin) {    
    const selectedBranch = {
        id: branchId,
        nombre: branchName,
        organizacion: admin.organizacion,
        organizacionCamelCase: admin.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: admin.nombreCompleto
    };
    
    localStorage.setItem('selectedBranch', JSON.stringify(selectedBranch));
    
    window.location.href = `/users/admin/editarSucursales/editarSucursales.html?id=${branchId}&org=${admin.organizacionCamelCase}`;
}

// ========== VER DETALLES DE LA SUCURSAL ==========
async function viewBranchDetails(branchId, branchName, admin, sucursalManager) {
    try {
        const sucursal = await sucursalManager.getSucursalById(branchId, admin.organizacionCamelCase);
        
        if (!sucursal) {
            throw new Error('Sucursal no encontrada');
        }
        
        showBranchDetails(sucursal, branchName);
        
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
function showBranchDetails(sucursal, branchName) {
    // Usar los métodos de la clase Sucursal para formatear
    const fechaCreacion = sucursal.getFechaCreacionFormateada ? 
        sucursal.getFechaCreacionFormateada() : 
        new Date(sucursal.fechaCreacion).toLocaleDateString('es-MX');
    
    const fechaActualizacion = sucursal.getFechaActualizacionFormateada ? 
        sucursal.getFechaActualizacionFormateada() : 
        (sucursal.fechaActualizacion ? new Date(sucursal.fechaActualizacion).toLocaleDateString('es-MX') : 'No disponible');
    
    const contactoFormateado = sucursal.getContactoFormateado ? 
        sucursal.getContactoFormateado() : 
        sucursal.contacto;
    
    const ubicacionCompleta = sucursal.getUbicacionCompleta ? 
        sucursal.getUbicacionCompleta() : 
        'No disponible';
    
    const regionInfo = sucursal.getRegionInfo ? 
        sucursal.getRegionInfo() : 
        { nombre: sucursal.ubicacion?.regionNombre || 'No especificada' };
    
    const tipoDisplay = sucursal.tipo ? sucursal.tipo.replace(/_/g, ' ').toUpperCase() : 'No especificado';
    
    Swal.fire({
        title: `Detalles de: ${branchName}`,
        html: `
            <div class="swal-details-container">
                <div class="swal-icon-container">
                </div>
                
                <div class="swal-details-grid">
                    <div class="swal-detail-card">
                        <p><strong>Nombre:</strong><br><span>${sucursal.nombre}</span></p>
                        <p><strong>Tipo:</strong><br>
                            <span class="tipo-badge">
                                ${tipoDisplay}
                            </span>
                        </p>
                        <p><strong>Región:</strong><br><span>${regionInfo.nombre}</span></p>
                        <p><strong>Contacto:</strong><br>
                            <span class="contacto-info">
                                ${contactoFormateado}
                            </span>
                        </p>
                    </div>
                    <div class="swal-detail-card">
                        <p><strong>Ubicación completa:</strong><br>
                            <span class="ubicacion-info">
                                ${ubicacionCompleta}
                            </span>
                        </p>
                        <p><strong>Fecha de creación:</strong><br><span>${fechaCreacion}</span></p>
                        <p><strong>Última actualización:</strong><br><span>${fechaActualizacion}</span></p>
                        <p><strong>Creado por:</strong><br><span>${sucursal.creadoPorNombre || 'Sistema'}</span></p>
                    </div>
                </div>
            </div>
        `,
        width: 800,
        showCloseButton: true,
        showConfirmButton: false
    });
}

// ========== ELIMINAR SUCURSAL ==========
async function deleteBranch(branchId, branchName, admin, sucursalManager) {
    // Mostrar confirmación antes de eliminar
    const confirmResult = await Swal.fire({
        title: '¿Eliminar sucursal?',
        html: `
            <div class="delete-confirmation">
                <p>
                    ¿Estás seguro de que deseas eliminar la sucursal <strong>"${branchName}"</strong>?
                </p>
                <div class="warning-message">
                    <i class="fas fa-exclamation-triangle"></i>
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
        title: 'Eliminando sucursal...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        await sucursalManager.eliminarSucursal(branchId, admin.organizacionCamelCase);
        
        Swal.close();
        
        // Mostrar mensaje de éxito
        await Swal.fire({
            icon: 'success',
            title: '¡Sucursal eliminada!',
            html: `La sucursal <strong>"${branchName}"</strong> ha sido eliminada correctamente.`,
            confirmButtonText: 'ACEPTAR'
        });
        
        // Recargar la lista de sucursales
        await loadBranches(admin, sucursalManager);
        
    } catch (error) {
        console.error('❌ Error eliminando sucursal:', error);
        Swal.close();
        
        Swal.fire({
            icon: 'error',
            title: 'Error al eliminar',
            text: error.message || 'Ocurrió un error al eliminar la sucursal. Por favor intenta de nuevo.',
            confirmButtonText: 'ENTENDIDO'
        });
    }
}

// ========== ESTADO VACÍO ==========
function showEmptyState(admin) {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <div class="empty-state-content">
                    <i class="fas fa-store-alt"></i>
                    <h3>No hay sucursales en ${admin.organizacion || 'tu organización'}</h3>
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
}

// ========== ESTADO DE CARGA ==========
function showLoadingState() {
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
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
    
    tbody.innerHTML = `
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
    const tbody = document.getElementById('branchesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="error-state">
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