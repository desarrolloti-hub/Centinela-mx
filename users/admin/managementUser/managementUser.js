// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {    
    try {
        const { UserManager } = await import('/clases/user.js');
        const userManager = new UserManager();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (!userManager.currentUser || !userManager.currentUser.esAdministrador()) {
            console.error('❌ No hay administrador autenticado');
            showNoAdminMessage();
            return;
        }
        
        const admin = userManager.currentUser;
        
        localStorage.setItem('adminInfo', JSON.stringify({
            id: admin.id,
            nombreCompleto: admin.nombreCompleto,
            organizacion: admin.organizacion,
            organizacionCamelCase: admin.organizacionCamelCase,
            rol: admin.rol,
            correoElectronico: admin.correoElectronico,
            timestamp: new Date().toISOString()
        }));
        
        localStorage.removeItem('selectedCollaborator');
        
        await loadCollaborators(admin, userManager);
        setupEvents(admin, userManager);
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CARGAR COLABORADORES ==========
async function loadCollaborators(admin, userManager) {
    
    try {
        showLoadingState();
        
        const colaboradores = await userManager.getColaboradoresByOrganizacion(
            admin.organizacionCamelCase,
            true
        );
        
        localStorage.setItem('colaboradoresList', JSON.stringify(
            colaboradores.map(col => ({
                id: col.id,
                nombreCompleto: col.nombreCompleto,
                correoElectronico: col.correoElectronico,
                rol: col.rol,
                status: col.status,
                organizacion: col.organizacion,
                fotoUsuario: col.fotoUsuario,
            }))
        ));
        
        if (colaboradores.length === 0) {
            showEmptyState(admin);
        } else {
            renderCollaboratorsTable(colaboradores, admin);
            updateStats(colaboradores);
        }
        
    } catch (error) {
        console.error('❌ Error cargando colaboradores:', error);
        showFirebaseError(error);
    }
}

// ========== RENDERIZAR TABLA DE COLABORADORES ==========
function renderCollaboratorsTable(collaborators, admin) {
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    collaborators.forEach(col => {
        const row = document.createElement('tr');
        const isActive = col.status === true || col.status === 'active';
        const statusInfo = isActive ? 
            { text: 'Activo', class: 'active', icon: 'fa-check-circle' } :
            { text: 'Inactivo', class: 'inactive', icon: 'fa-ban' };
        
        const enableBtnText = isActive ? 'Inhabilitar' : 'Habilitar';
        const enableBtnIcon = isActive ? 'fa-user-slash' : 'fa-user-check';
        const enableBtnClass = isActive ? 'disable' : 'enable';
        
        const fullName = col.nombreCompleto || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const fotoUrl = col.getFotoUrl ? col.getFotoUrl() : (col.fotoUsuario || '');
        
        row.className = isActive ? 'collaborator-row active' : 'collaborator-row inactive';
        row.innerHTML = `
            <td data-label="INFORMACIÓN">
                <div class="user-info">
                    <div class="user-avatar ${!fotoUrl ? 'no-photo' : ''}" 
                         ${fotoUrl ? `style="background-image: url('${fotoUrl}')"` : ''}>
                        ${!fotoUrl ? '<i class="fas fa-user"></i>' : ''}
                    </div>
                    <div class="user-details">
                        <div class="user-name">${col.nombreCompleto}</div>                    </div>
                </div>
            </td>
            <td data-label="CARGO" class="user-lastname">${col.rol}</td>
            <td data-label="EMAIL" class="user-email">${col.correoElectronico || 'sin@email.com'}</td>
            <td data-label="ESTADO">
                <span class="status ${statusInfo.class}">
                    <i class="fas ${statusInfo.icon}"></i> ${statusInfo.text}
                </span>
            </td>
            <td data-label="ACCIONES" class="actions-cell">
                <button class="row-btn ${enableBtnClass}" title="${enableBtnText}"
                    data-collaborator-id="${col.id}"
                    data-collaborator-name="${fullName}"
                    data-current-status="${isActive}">
                    <i class="fas ${enableBtnIcon}"></i>
                </button>
                <button class="row-btn edit" title="Editar" 
                    data-collaborator-id="${col.id}"
                    data-collaborator-name="${fullName}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="row-btn view" title="Ver detalles" 
                    data-collaborator-id="${col.id}"
                    data-collaborator-name="${fullName}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function updateStats(collaborators) {
    const total = collaborators.length;
    const active = collaborators.filter(c => c.status === true || c.status === 'active').length;
    const inactive = total - active;
    
    let statsContainer = document.getElementById('collaboratorsStats');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'collaboratorsStats';
        statsContainer.className = 'stats-container';
        
        const sectionHeader = document.querySelector('.card-header');
        if (sectionHeader) {
            sectionHeader.parentNode.insertBefore(statsContainer, sectionHeader.nextSibling);
        } else {
            const tableWrapper = document.querySelector('.table-wrapper');
            if (tableWrapper) {
                tableWrapper.parentNode.insertBefore(statsContainer, tableWrapper.nextSibling);
            }
        }
    }
    
    statsContainer.innerHTML = `
        <div class="stats-header">
            <h3><i class="fas fa-chart-bar"></i> ESTADÍSTICAS DE COLABORADORES</h3>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card total">
                <p><i class="fas fa-users"></i> TOTAL</p>
                <h2>${total}</h2>
            </div>
            
            <div class="stat-card active">
                <p><i class="fas fa-check-circle"></i> ACTIVOS</p>
                <h2>${active}</h2>
                <small>${total > 0 ? Math.round((active/total)*100) : 0}%</small>
            </div>
            
            <div class="stat-card inactive">
                <p><i class="fas fa-ban"></i> INACTIVOS</p>
                <h2>${inactive}</h2>
                <small>${total > 0 ? Math.round((inactive/total)*100) : 0}%</small>
            </div>
        </div>
    `;
    
    document.getElementById('refreshStats')?.addEventListener('click', async () => {
        location.reload();
    });
}

// ========== CONFIGURAR EVENTOS ==========
function setupEvents(admin, userManager) {
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '/users/admin/newUser/newUser.html';
        });
    }
    
    const table = document.querySelector('.collaborators-table');
    if (table) {
        table.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const row = e.target.closest('tr');
            
            if (!button || !row) return;
            
            const collaboratorId = button.getAttribute('data-collaborator-id');
            const collaboratorName = button.getAttribute('data-collaborator-name');
            const isEnableBtn = button.classList.contains('enable');
            const isDisableBtn = button.classList.contains('disable');
            
            if (isEnableBtn || isDisableBtn) {
                await toggleUserStatus(collaboratorId, collaboratorName, admin, userManager, isEnableBtn);
            } 
            else if (button.classList.contains('edit')) {
                await editUser(collaboratorId, collaboratorName, admin);
            } 
            else if (button.classList.contains('view')) {
                await viewUserDetails(collaboratorId, collaboratorName, admin, userManager);
            }
        });
    }
}

// ========== CAMBIAR ESTADO DEL COLABORADOR ==========
async function toggleUserStatus(collaboratorId, collaboratorName, admin, userManager, isEnabling) {
    try {
        const collaborator = await userManager.getUserById(collaboratorId);
        if (!collaborator) throw new Error('Colaborador no encontrado');
        
        const newStatus = isEnabling;
        const actionText = isEnabling ? 'Habilitar' : 'Inhabilitar';
        const statusText = isEnabling ? 'habilitado' : 'inhabilitado';
        const iconType = isEnabling ? 'question' : 'warning';
        
        const result = await Swal.fire({
            title: `${actionText} colaborador`,
            html: `
                <div>
                    <p><strong>${collaboratorName}</strong></p>
                    <p>${collaborator.correoElectronico || 'No email'}</p>
                    <p>¿Estás seguro de ${statusText} al colaborador?</p>
                    ${isEnabling ? 
                        '<p><i class="fas fa-check-circle"></i> El usuario podrá acceder al sistema normalmente</p>' :
                        '<p><i class="fas fa-exclamation-triangle"></i> El usuario no podrá acceder al sistema hasta que sea habilitado nuevamente</p>'
                    }
                </div>
            `,
            icon: iconType,
            showCancelButton: true,
            confirmButtonText: `Sí, ${statusText}`,
            cancelButtonText: 'Cancelar'
        });
        
        if (!result.isConfirmed) return;
        
        Swal.fire({
            title: `${actionText}...`,
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        if (isEnabling) {
            await userManager.reactivarUsuario(
                collaboratorId, 
                'colaborador', 
                admin.organizacionCamelCase
            );
        } else {
            await userManager.inactivarUsuario(
                collaboratorId, 
                'colaborador', 
                admin.organizacionCamelCase,
                'Estado cambiado por administrador'
            );
        }
        
        await userManager.updateUser(
            collaboratorId, 
            { status: newStatus }, 
            'colaborador', 
            admin.organizacionCamelCase
        );
        
        Swal.close();
        await loadCollaborators(admin, userManager);
        
        Swal.fire({
            icon: 'success',
            title: '¡Estado cambiado!',
            html: `
                <div>
                    <p><strong>${collaboratorName}</strong></p>
                    <p>ha sido ${statusText} exitosamente</p>
                </div>
            `,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        Swal.close();
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo cambiar el estado del colaborador'
        });
    }
}

// ========== EDITAR COLABORADOR ==========
async function editUser(collaboratorId, collaboratorName, admin) {    
    const selectedCollaborator = {
        id: collaboratorId,
        nombreCompleto: collaboratorName,
        organizacion: admin.organizacion,
        organizacionCamelCase: admin.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: admin.nombreCompleto
    };
    
    localStorage.setItem('selectedCollaborator', JSON.stringify(selectedCollaborator));
    
    window.location.href = `/users/admin/editUser/editUser.html?id=${collaboratorId}&org=${admin.organizacionCamelCase}`;
}

// ========== VER DETALLES DEL COLABORADOR ==========
async function viewUserDetails(collaboratorId, collaboratorName, admin, userManager) {
    try {
        const collaborator = await userManager.getUserById(collaboratorId);
        
        if (!collaborator) {
            throw new Error('Colaborador no encontrado');
        }
        
        showCollaboratorDetails(collaborator, collaboratorName);
        
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron obtener los detalles del colaborador'
        });
    }
}

// ========== MOSTRAR DETALLES EN MODAL ==========
function showCollaboratorDetails(collaborator, collaboratorName) {
    let fechaCreacion = 'No disponible';
    if (collaborator.fechaCreacion) {
        if (collaborator.fechaCreacion.toDate) {
            fechaCreacion = collaborator.fechaCreacion.toDate().toLocaleDateString('es-MX');
        } else if (typeof collaborator.fechaCreacion === 'string') {
            fechaCreacion = new Date(collaborator.fechaCreacion).toLocaleDateString('es-MX');
        }
    }
    
    Swal.fire({
        title: `Detalles de: ${collaboratorName}`,
        html: `
            <div class="swal-details-container">
                <div class="swal-user-profile">
                    <div class="swal-user-avatar-large">
                        ${collaborator.fotoUsuario ? 
                            `<img src="${collaborator.getFotoUrl()}" alt="${collaboratorName}">` : 
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <div class="swal-user-info-large">
                        <h3>${collaborator.nombreCompleto || 'Sin nombre'}</h3>
                        <p>${collaborator.rol || 'Colaborador'}</p>
                        
                    </div>
                </div>
                
                <div class="swal-details-grid">
                    <div class="swal-detail-card">
                        <p><strong>Email:</strong><br><span>${collaborator.correoElectronico || 'No especificado'}</span></p>
                        <p><strong>Estado:</strong><br>
                            <span class="status-detail ${collaborator.status ? 'active' : 'inactive'}">
                                <i class="fas ${collaborator.status ? 'fa-check-circle' : 'fa-ban'}"></i> 
                                ${collaborator.status ? 'Activo' : 'Inactivo'}
                            </span>
                        </p>
                        <p><strong>Organización:</strong><br><span>${collaborator.organizacion || 'No especificado'}</span></p>
                    </div>
                    <div class="swal-detail-card">
                        <p><strong>Fecha de creación:</strong><br><span>${fechaCreacion}</span></p>
                        <p><strong>Plan:</strong><br><span>${collaborator.plan || 'No especificado'}</span></p>
                        <p><strong>Verificado:</strong><br>
                            <span class="${collaborator.verificado ? 'verified' : 'not-verified'}">
                                ${collaborator.verificado ? 'Sí' : 'No'}
                            </span>
                        </p>
                    </div>
                </div>
                
                ${collaborator.eliminado ? `
                    <div class="swal-warning-alert">
                        <p><i class="fas fa-exclamation-triangle"></i> Este usuario está inhabilitado</p>
                    </div>
                ` : ''}
            </div>
        `,
        width: 700,
        showCloseButton: true,
        showConfirmButton: false
    });
}

// ========== ESTADO VACÍO ==========
function showEmptyState(admin) {
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <div class="empty-state-content">
                    <i class="fas fa-users"></i>
                    <h3>No hay colaboradores en ${admin.organizacion || 'tu organización'}</h3>
                    <p>Comienza agregando tu primer colaborador</p>
                </div>
            </td>
        </tr>
    `;
    
    document.getElementById('addFirstCollaborator')?.addEventListener('click', () => {
        window.location.href = '/users/admin/newUser/newUser.html';
    });
}

// ========== ESTADO DE CARGA ==========
function showLoadingState() {
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="loading-state">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3>Cargando colaboradores...</h3>
                    <p>Obteniendo datos de Firebase</p>
                </div>
            </td>
        </tr>
    `;
}

// ========== MANEJO DE ERRORES ==========
function showNoAdminMessage() {
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="error-state">
                <div class="error-content">
                    <i class="fas fa-user-slash"></i>
                    <h3>No se detectó sesión activa de administrador</h3>
                    <p>Para gestionar colaboradores, debes iniciar sesión como administrador.</p>
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
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="error-state">
                <div class="error-content firebase-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar colaboradores</h3>
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
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="error-state">
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