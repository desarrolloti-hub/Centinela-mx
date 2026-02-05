// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOM cargado, iniciando gestor de colaboradores...');
    
    try {
        // Cargar UserManager
        const { UserManager } = await import('/clases/user.js');
        const userManager = new UserManager();
        
        // Esperar a que se cargue el usuario actual
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verificar que hay un usuario administrador autenticado
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
        
        // Guardar info del admin en localStorage
        localStorage.setItem('adminInfo', JSON.stringify({
            id: admin.id,
            nombreCompleto: admin.nombreCompleto,
            organizacion: admin.organizacion,
            organizacionCamelCase: admin.organizacionCamelCase,
            correoElectronico: admin.correoElectronico,
            timestamp: new Date().toISOString()
        }));
        
        // Limpiar colaborador seleccionado previo
        localStorage.removeItem('selectedCollaborator');
        
        // Actualizar interfaz
        updatePageWithAdminInfo(admin);
        
        // Cargar colaboradores
        await loadCollaborators(admin, userManager);
        
        // Configurar eventos
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
        // Mostrar loading
        showLoadingState();
        
        // Usar el método del UserManager para obtener colaboradores
        // Cambiar a true para incluir inhabilitados
        const colaboradores = await userManager.getColaboradoresByOrganizacion(
            admin.organizacionCamelCase,
            true // Incluir todos, incluso inhabilitados
        );
        
        console.log(`✅ ${colaboradores.length} colaboradores encontrados (incluyendo inhabilitados)`);
        
        // Filtrar para mostrar solo los no eliminados
        const colaboradoresActivos = colaboradores;
        
        // Guardar lista de colaboradores en localStorage
        localStorage.setItem('colaboradoresList', JSON.stringify(
            colaboradoresActivos.map(col => ({
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
        
        if (colaboradoresActivos.length === 0) {
            showEmptyState(admin);
        } else {
            renderCollaboratorsTable(colaboradoresActivos, admin);
            updateStats(colaboradoresActivos);
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
        
        // Determinar estado (activo/inactivo)
        const isActive = col.status === true || col.status === 'active';
        const statusInfo = isActive ? 
            { text: 'Activo', class: 'active', icon: 'fa-check-circle' } :
            { text: 'Inactivo', class: 'inactive', icon: 'fa-ban' };
        
        // Determinar texto del botón de habilitar/deshabilitar
        const enableBtnText = isActive ? 'Inhabilitar' : 'Habilitar';
        const enableBtnIcon = isActive ? 'fa-user-slash' : 'fa-user-check';
        const enableBtnClass = isActive ? 'disable' : 'enable';
        
        // Extraer nombre y apellido
        const fullName = col.nombreCompleto || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Obtener URL de la foto
        const fotoUrl = col.getFotoUrl ? col.getFotoUrl() : (col.fotoUsuario || '');
        
        row.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-avatar" style="background-image: url('${fotoUrl}')">
                        ${!col.fotoUsuario ? '<i class="fas fa-user"></i>' : ''}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${firstName}</div>
                        <small style="color: var(--color-text-secondary); font-size: 0.85rem;">${col.rol || 'Colaborador'}</small>
                        <br><small style="color: #666; font-size: 0.7rem;">ID: ${col.id.substring(0, 8)}...</small>
                    </div>
                </div>
            </td>
            <td style="font-weight: 500;">${lastName}</td>
            <td style="color: var(--color-text-primary);">${col.correoElectronico || 'sin@email.com'}</td>
            <td>
                <span class="status ${statusInfo.class}">
                    <i class="fas ${statusInfo.icon}"></i> ${statusInfo.text}
                </span>
            </td>
            <td class="actions-cell">
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
    
    // Crear o actualizar contenedor de estadísticas
    let statsContainer = document.getElementById('collaboratorsStats');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'collaboratorsStats';
        statsContainer.style.cssText = `
            margin: 20px 0;
            padding: 20px;
            background: var(--color-bg-secondary);
            border-radius: 12px;
            border: 1px solid var(--color-border-light);
        `;
        
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.parentNode.insertBefore(statsContainer, sectionHeader.nextSibling);
        }
    }
    
    statsContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: var(--color-text-primary);">
                <i class="fas fa-chart-bar"></i> ESTADÍSTICAS DE COLABORADORES
            </h3>
            <button id="refreshStats" class="row-btn" 
                style="background: var(black); color: white;">
                <i class="fas fa-sync-alt"></i> Actualizar
            </button>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
            <div style="background: var(--color-bg-tertiary); padding: 15px; border-radius: 10px; border-left: 4px solid #3498db;">
                <p style="margin: 0 0 5px 0; color: var(--color-text-secondary); font-size: 0.85rem;">
                    <i class="fas fa-users"></i> TOTAL
                </p>
                <h2 style="margin: 0; font-size: 1.8rem; color: var(--color-text-primary);">${total}</h2>
            </div>
            
            <div style="background: var(--color-bg-tertiary); padding: 15px; border-radius: 10px; border-left: 4px solid #2ecc71;">
                <p style="margin: 0 0 5px 0; color: var(--color-text-secondary); font-size: 0.85rem;">
                    <i class="fas fa-check-circle"></i> ACTIVOS
                </p>
                <h2 style="margin: 0; font-size: 1.8rem; color: #2ecc71;">${active}</h2>
                <small style="color: var(--color-text-secondary);">${total > 0 ? Math.round((active/total)*100) : 0}%</small>
            </div>
            
            <div style="background: var(--color-bg-tertiary); padding: 15px; border-radius: 10px; border-left: 4px solid #e74c3c;">
                <p style="margin: 0 0 5px 0; color: var(--color-text-secondary); font-size: 0.85rem;">
                    <i class="fas fa-ban"></i> INACTIVOS
                </p>
                <h2 style="margin: 0; font-size: 1.8rem; color: #e74c3c;">${inactive}</h2>
                <small style="color: var(--color-text-secondary);">${total > 0 ? Math.round((inactive/total)*100) : 0}%</small>
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
    // Botón de agregar colaborador
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '/users/admin/newUser/newUser.html';
        });
    }
    
    // Eventos de la tabla
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
        // Obtener el colaborador
        const collaborator = await userManager.getUserById(collaboratorId);
        if (!collaborator) {
            throw new Error('Colaborador no encontrado');
        }
        
        const newStatus = isEnabling; // true para habilitar, false para inhabilitar
        const actionText = isEnabling ? 'Habilitar' : 'Inhabilitar';
        const statusText = isEnabling ? 'habilitado' : 'inhabilitado';
        
        // Confirmación
        const result = await Swal.fire({
            title: `${actionText} colaborador`,
            text: `¿Estás seguro de ${statusText} a ${collaboratorName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, ${statusText}`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: isEnabling ? '#28a745' : '#d33',
            cancelButtonColor: '#6c757d',
        });
        
        if (!result.isConfirmed) return;
        
        // Mostrar loading
        Swal.fire({
            title: `${actionText}...`,
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        if (isEnabling) {
            // HABILITAR: Reactivar usuario
            await userManager.reactivarUsuario(
                collaboratorId, 
                'colaborador', 
                admin.organizacionCamelCase
            );
        } else {
            // INHABILITAR: Usar método de inhabilitación
            await userManager.inhabilitarUsuario(
                collaboratorId, 
                'colaborador', 
                admin.organizacionCamelCase,
                'Estado cambiado por administrador'
            );
        }
        
        // También actualizar el campo status
        await userManager.updateUser(
            collaboratorId, 
            { status: newStatus }, 
            'colaborador', 
            admin.organizacionCamelCase
        );
        
        // Cerrar loading
        Swal.close();
        
        // Recargar la página para ver cambios
        await loadCollaborators(admin, userManager);
        
        // Mostrar éxito
        Swal.fire({
            icon: 'success',
            title: `${actionText} exitosamente`,
            text: `${collaboratorName} ha sido ${statusText}`,
            timer: 2000,
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
    
    // Guardar información del colaborador seleccionado en localStorage
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
    
    // Redirigir a la página de edición
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
    // Formatear fecha
    let fechaCreacion = 'No disponible';
    if (collaborator.fechaCreacion) {
        if (collaborator.fechaCreacion.toDate) {
            fechaCreacion = collaborator.fechaCreacion.toDate().toLocaleDateString('es-MX');
        } else if (typeof collaborator.fechaCreacion === 'string') {
            fechaCreacion = new Date(collaborator.fechaCreacion).toLocaleDateString('es-MX');
        }
    }
    
    // Obtener estado HTML
    const estadoHTML = collaborator.getEstadoBadge ? collaborator.getEstadoBadge() : 
        (collaborator.status ? 
            '<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Activo</span>' : 
            '<span style="color: #dc3545;"><i class="fas fa-ban"></i> Inactivo</span>');
    
    Swal.fire({
        title: `Detalles de: ${collaboratorName}`,
        html: `
            <div style="text-align: left; max-height: 60vh; overflow-y: auto; padding: 10px;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${collaborator.fotoUsuario ? 
                            `<img src="${collaborator.getFotoUrl()}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                            `<i class="fas fa-user" style="font-size: 2rem; color: #666;"></i>`
                        }
                    </div>
                    <div>
                        <h3 style="margin: 0;">${collaborator.nombreCompleto || 'Sin nombre'}</h3>
                        <p style="margin: 5px 0; color: #666;">${collaborator.rol || 'Colaborador'}</p>
                        <p style="margin: 0; font-size: 0.8rem; color: #999;">ID: ${collaborator.id.substring(0, 12)}...</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <p><strong>Email:</strong><br>${collaborator.correoElectronico || 'No especificado'}</p>
                        <p><strong>Estado:</strong><br>${estadoHTML}</p>
                        <p><strong>Organización:</strong><br>${collaborator.organizacion || 'No especificado'}</p>
                    </div>
                    <div>
                        <p><strong>Fecha de creación:</strong><br>${fechaCreacion}</p>
                        <p><strong>Plan:</strong><br>${collaborator.plan || 'No especificado'}</p>
                        <p><strong>Verificado:</strong><br>${collaborator.verificado ? 'Sí' : 'No'}</p>
                    </div>
                </div>
                
                ${collaborator.telefono ? `
                    <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                        <p><strong>Teléfono:</strong> ${collaborator.telefono}</p>
                        ${collaborator.departamento ? `<p><strong>Departamento:</strong> ${collaborator.departamento}</p>` : ''}
                    </div>
                ` : ''}
                
                ${collaborator.eliminado ? `
                    <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; border: 1px solid #ffc107;">
                        <p style="margin: 0; color: #856404;">
                            <i class="fas fa-exclamation-triangle"></i> Este usuario está inhabilitado
                        </p>
                    </div>
                ` : ''}
            </div>
        `,
        width: 700,
        showCloseButton: true,
        showConfirmButton: false
    });
}

// ========== ACTUALIZAR PÁGINA CON INFO DEL ADMIN ==========
function updatePageWithAdminInfo(admin) {
    console.log('🎨 Actualizando página con datos del admin...');
    
    // Actualizar título principal si existe
    const mainTitle = document.querySelector('.section-header h1');
    if (mainTitle && admin.organizacion) {
        mainTitle.innerHTML = `
            <i class="fas fa-users"></i> COLABORADORES DE 
            <span style="color: var(--color-accent-primary); font-weight: bold;">
                ${admin.organizacion.toUpperCase()}
            </span>
        `;
    }
    
    // Actualizar subtítulo
    const subTitle = document.querySelector('.section-header p');
    if (!subTitle && admin.organizacion) {
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle) {
            const newSubTitle = document.createElement('p');
            newSubTitle.style.cssText = `
                margin: 5px 0 0 0;
                color: var(--color-text-secondary);
                font-size: 0.9rem;
            `;
            newSubTitle.innerHTML = `
                <i class="fas fa-user-shield" style="color: var(--color-accent-primary);"></i>
                Administrador: <strong>${admin.nombreCompleto || 'Administrador'}</strong>
                ${admin.correoElectronico ? ` | ${admin.correoElectronico}` : ''}
                ${admin.organizacionCamelCase ? ` | Colección: <code>colaboradores_${admin.organizacionCamelCase}</code>` : ''}
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
            <td colspan="5" style="text-align: center; padding: 40px 20px;">
                <div style="color: var(--color-text-secondary);">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.4;"></i>
                    <h3 style="margin: 10px 0; color: var(--color-text-primary);">
                        No hay colaboradores en ${admin.organizacion || 'tu organización'}
                    </h3>
                    <p style="margin-bottom: 20px;">Comienza agregando tu primer colaborador</p>
                    <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 10px;">
                        Colección Firebase: <code>colaboradores_${admin.organizacionCamelCase || 'tu_organizacion'}</code>
                    </p>
                    <button id="addFirstCollaborator" class="add-btn" 
                        style="margin: 0 auto; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-user-plus"></i> Agregar primer colaborador
                    </button>
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
            <td colspan="5" style="text-align: center; padding: 40px 20px;">
                <div style="color: var(--color-text-secondary);">
                    <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                    <h3 style="margin: 10px 0; color: var(--color-text-primary);">
                        Cargando colaboradores...
                    </h3>
                    <p style="margin-bottom: 20px; font-size: 0.9rem;">
                        Obteniendo datos de Firebase
                    </p>
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
            <td colspan="5" style="text-align: center; padding: 50px 20px;">
                <div style="color: var(--color-text-secondary);">
                    <i class="fas fa-user-slash" style="font-size: 3rem; margin-bottom: 15px; color: #f39c12;"></i>
                    <h3 style="margin: 10px 0; color: var(--color-text-primary);">
                        No se detectó sesión activa de administrador
                    </h3>
                    <p style="margin-bottom: 25px; font-size: 0.9rem; color: #b0b0d0;">
                        Para gestionar colaboradores, debes iniciar sesión como administrador.
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.location.reload()" class="row-btn" 
                            style="background: var(--color-accent-primary); color: white;">
                            <i class="fas fa-sync-alt"></i> Recargar
                        </button>
                        <button onclick="window.location.href='/users/visitors/login/login.html'" 
                            class="add-btn">
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
            <td colspan="5" style="text-align: center; padding: 50px 20px;">
                <div style="color: var(--color-text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px; color: #e74c3c;"></i>
                    <h3 style="margin: 10px 0; color: var(--color-text-primary);">
                        Error al cargar colaboradores
                    </h3>
                    <p style="margin-bottom: 10px; color: #e74c3c;">
                        ${error.message || 'Error de conexión con Firebase'}
                    </p>
                    <p style="margin-bottom: 25px; font-size: 0.9rem; color: #b0b0d0;">
                        Verifica tu conexión a internet y recarga la página.
                    </p>
                    <button onclick="window.location.reload()" class="add-btn">
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
            <td colspan="5" style="text-align: center; padding: 50px 20px;">
                <div style="color: var(--color-text-secondary);">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 15px; color: #f39c12;"></i>
                    <h3 style="margin: 10px 0; color: var(--color-text-primary);">
                        ${message}
                    </h3>
                    <button onclick="window.location.reload()" class="add-btn">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>
            </td>
        </tr>
    `;
}

console.log('✅ Script de gestión de colaboradores cargado');