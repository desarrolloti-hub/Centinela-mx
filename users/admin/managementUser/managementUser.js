// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOM cargado, iniciando gestor de colaboradores...');
    
    try {
        const { UserManager } = await import('/clases/user.js');
        const userManager = new UserManager();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (!userManager.currentUser || userManager.currentUser.cargo !== 'administrador') {
            console.error('❌ No hay administrador autenticado');
            showNoAdminMessage();
            return;
        }
        
        const admin = userManager.currentUser;
        console.log('✅ Administrador encontrado:', {
            nombre: admin.nombreCompleto,
            organizacion: admin.organizacion,
            organizacionCamelCase: admin.organizacionCamelCase,
            id: admin.id
        });
        
        localStorage.setItem('adminInfo', JSON.stringify({
            id: admin.id,
            nombreCompleto: admin.nombreCompleto,
            organizacion: admin.organizacion,
            organizacionCamelCase: admin.organizacionCamelCase,
            correoElectronico: admin.correoElectronico,
            timestamp: new Date().toISOString()
        }));
        
        localStorage.removeItem('selectedCollaborator');
        updatePageWithAdminInfo(admin);
        await loadCollaborators(admin, userManager);
        setupEvents(admin, userManager);
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CARGAR COLABORADORES ==========
async function loadCollaborators(admin, userManager) {
    console.log(`🔄 Cargando colaboradores para: ${admin.organizacion}`);
    
    try {
        showLoadingState();
        
        const colaboradores = await userManager.getColaboradoresByOrganizacion(
            admin.organizacionCamelCase,
            true
        );
        
        console.log(`✅ ${colaboradores.length} colaboradores encontrados (incluyendo inhabilitados)`);
        
        localStorage.setItem('colaboradoresList', JSON.stringify(
            colaboradores.map(col => ({
                id: col.id,
                nombreCompleto: col.nombreCompleto,
                correoElectronico: col.correoElectronico,
                rol: col.rol,
                status: col.status,
                organizacion: col.organizacion,
                fotoUsuario: col.fotoUsuario,
                telefono: col.telefono,
                departamento: col.departamento
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
                        <div class="user-name">${firstName}</div>
                        <small class="user-role">${col.rol || 'Colaborador'}</small>
                        <br><small class="user-id">ID: ${col.id.substring(0, 8)}...</small>
                    </div>
                </div>
            </td>
            <td data-label="APELLIDO" class="user-lastname">${lastName}</td>
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
        
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.parentNode.insertBefore(statsContainer, sectionHeader.nextSibling);
        }
    }
    
    statsContainer.innerHTML = `
        <div class="stats-header">
            <h3><i class="fas fa-chart-bar"></i> ESTADÍSTICAS DE COLABORADORES</h3>
            <button id="refreshStats" class="refresh-btn">
                <i class="fas fa-sync-alt"></i> Actualizar
            </button>
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
        console.log('🔄 Recargando colaboradores...');
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
                <div class="swal-user-info ${isEnabling ? 'enable' : 'disable'}">
                    <div class="swal-user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <h3>${collaboratorName}</h3>
                    <p>${collaborator.correoElectronico || 'No email'}</p>
                </div>
                <p>¿Estás seguro de ${statusText} al colaborador?</p>
                ${isEnabling ? 
                    '<p class="swal-enable-text"><i class="fas fa-check-circle"></i> El usuario podrá acceder al sistema normalmente</p>' :
                    '<p class="swal-disable-text"><i class="fas fa-exclamation-triangle"></i> El usuario no podrá acceder al sistema hasta que sea habilitado nuevamente</p>'
                }
            `,
            icon: iconType,
            showCancelButton: true,
            confirmButtonText: `Sí, ${statusText}`,
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            customClass: {
                popup: 'swal2-custom-popup',
                confirmButton: 'swal2-confirm-custom',
                cancelButton: 'swal2-cancel-custom',
                icon: 'swal2-icon-custom'
            }
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
            await userManager.inhabilitarUsuario(
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
                <div class="swal-success-content">
                    <i class="fas fa-user-check ${isEnabling ? 'success-icon' : 'warning-icon'}"></i>
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
    console.log(`✏️ Editando colaborador: ${collaboratorId} - ${collaboratorName}`);
    
    const selectedCollaborator = {
        id: collaboratorId,
        nombreCompleto: collaboratorName,
        organizacion: admin.organizacion,
        organizacionCamelCase: admin.organizacionCamelCase,
        fechaSeleccion: new Date().toISOString(),
        admin: admin.nombreCompleto
    };
    
    localStorage.setItem('selectedCollaborator', JSON.stringify(selectedCollaborator));
    console.log('💾 Colaborador guardado en localStorage:', selectedCollaborator);
    
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
    
    const estadoHTML = collaborator.status ? 
        `<span class="status-detail active">
            <i class="fas fa-check-circle"></i> Activo
        </span>` : 
        `<span class="status-detail inactive">
            <i class="fas fa-ban"></i> Inactivo
        </span>`;
    
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
                        <small>ID: ${collaborator.id.substring(0, 12)}...</small>
                    </div>
                </div>
                
                <div class="swal-details-grid">
                    <div class="swal-detail-card">
                        <p><strong>Email:</strong><br><span>${collaborator.correoElectronico || 'No especificado'}</span></p>
                        <p><strong>Estado:</strong><br>${estadoHTML}</p>
                        <p><strong>Organización:</strong><br><span>${collaborator.organizacion || 'No especificado'}</span></p>
                    </div>
                    <div class="swal-detail-card">
                        <p><strong>Fecha de creación:</strong><br><span>${fechaCreacion}</span></p>
                        <p><strong>Plan:</strong><br><span>${collaborator.plan || 'No especificado'}</span></p>
                        <p><strong>Verificado:</strong><br><span class="${collaborator.verificado ? 'verified' : 'not-verified'}">${collaborator.verificado ? 'Sí' : 'No'}</span></p>
                    </div>
                </div>
                
                ${collaborator.telefono ? `
                    <div class="swal-additional-info">
                        <p><strong>Teléfono:</strong> <span>${collaborator.telefono}</span></p>
                        ${collaborator.departamento ? `<p><strong>Departamento:</strong> <span>${collaborator.departamento}</span></p>` : ''}
                    </div>
                ` : ''}
                
                ${collaborator.eliminado ? `
                    <div class="swal-warning-alert">
                        <p><i class="fas fa-exclamation-triangle"></i> Este usuario está inhabilitado</p>
                    </div>
                ` : ''}
            </div>
        `,
        width: 700,
        showCloseButton: true,
        showConfirmButton: false,
        customClass: {
            popup: 'swal2-details-popup',
            closeButton: 'swal2-close-custom'
        }
    });
}

// ========== ACTUALIZAR PÁGINA CON INFO DEL ADMIN ==========
function updatePageWithAdminInfo(admin) {
    console.log('🎨 Actualizando página con datos del admin...');
    
    const mainTitle = document.querySelector('.section-header h1');
    if (mainTitle && admin.organizacion) {
        mainTitle.innerHTML = `
            <i class="fas fa-users"></i> COLABORADORES DE 
            <span class="organization-name">${admin.organizacion.toUpperCase()}</span>
        `;
    }
    
    const subTitle = document.querySelector('.section-header p');
    if (!subTitle && admin.organizacion) {
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle) {
            const newSubTitle = document.createElement('p');
            newSubTitle.className = 'admin-info-subtitle';
            newSubTitle.innerHTML = `
                <i class="fas fa-user-shield"></i>
                Administrador: <strong>${admin.nombreCompleto || 'Administrador'}</strong>
                ${admin.correoElectronico ? ` | <span>${admin.correoElectronico}</span>` : ''}
            `;
            sectionTitle.parentNode.insertBefore(newSubTitle, sectionTitle.nextSibling);
        }
    }
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

console.log('✅ Script de gestión de colaboradores cargado');