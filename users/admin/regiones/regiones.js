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

        // Usar las clases de CSS y la estructura de datos-label para móvil
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
function setupEvents(admin, regionManager) {
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
            
            if (button.classList.contains('btn-warning') || button.dataset.action === 'edit') {
                await editRegion(regionId, regionName, admin);
            } 
            else if (button.classList.contains('btn') && !button.classList.contains('btn-warning') && !button.classList.contains('btn-danger') || button.dataset.action === 'view') {
                await viewRegionDetails(regionId, regionName, admin, regionManager);
            }
            else if (button.classList.contains('btn-danger') || button.dataset.action === 'delete') {
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
        
        // Asegurarse de que la región tenga organizacionCamelCase
        if (!region.organizacionCamelCase) {
            region.organizacionCamelCase = admin.organizacionCamelCase;
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
        reverseButtons: false, // false = Cancelar a la izquierda, Editar a la derecha
        focusCancel: true,
        preConfirm: () => {
            window.location.href = `/users/admin/editarRegiones/editarRegiones.html?id=${region.id}&org=${region.organizacionCamelCase || ''}`;
        }
    });
}

// ========== ELIMINAR REGIÓN ==========
async function deleteRegion(regionId, regionName, admin, regionManager) {
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
        await regionManager.deleteRegion(regionId, admin.organizacionCamelCase);
        
        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: '¡Región eliminada!',
            text: `"${regionName}" ha sido eliminada.`,
            timer: 2000,
            showConfirmButton: false
        });
        
        await loadRegions(admin, regionManager);
        
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
}

function showEmptyState(admin) {
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = /*html*/ `
        <tr>
            <td colspan="4" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-map-marked-alt" style="font-size:48px; color:rgba(16,185,129,0.3); margin-bottom:16px;"></i>
                    <h5 style="color:white;">No hay regiones en ${admin.organizacion || 'tu organización'}</h5>
                    <a href="/users/admin/crearRegiones/crearRegiones.html" class="btn-nueva-region-header" style="display:inline-flex; margin-top:16px;">
                        <i class="fas fa-plus-circle"></i> Crear Primera Región
                    </a>
                </div>
            </td>
        </tr>
    `;
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
                        <button onclick="window.location.href='/users/visitors/login/login.html'" class="btn btn-warning" style="padding:8px 16px !important; min-width:auto !important;">
                            <i class="fas fa-sign-in-alt"></i> Iniciar sesión
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
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
                    <p style="color:var(--color-text-dim); max-width:400px; margin:0 auto;">${error.message || 'Error de conexión con Firebase'}</p>
                    <button onclick="window.location.reload()" class="btn" style="margin-top:16px; padding:8px 16px !important; min-width:auto !important;">
                        <i class="fas fa-sync-alt"></i> Recargar
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function showError(message) {
    const tbody = document.getElementById('regionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center; padding:60px 20px;">
                <div style="text-align:center;">
                    <i class="fas fa-exclamation-circle" style="font-size:48px; color:#ef4444; margin-bottom:16px;"></i>
                    <h5 style="color:white;">${message}</h5>
                    <button onclick="window.location.reload()" class="btn" style="margin-top:16px; padding:8px 16px !important; min-width:auto !important;">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ========== UTILIDADES ==========
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}