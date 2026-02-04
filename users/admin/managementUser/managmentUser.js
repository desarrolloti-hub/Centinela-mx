// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM cargado, iniciando gestor de usuarios...');
    
    // Esperar a que UserManager se cargue
    await waitForUserManager();
    
    // Inicializar el gestor
    await initUserManager();
});

// ========== ESPERAR A QUE USERMANAGER SE CARGUE ==========
async function waitForUserManager() {
    console.log('⏳ Esperando a que UserManager cargue el admin...');
    
    // Esperar un poco para que UserManager se inicialice
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Intentar importar UserManager
    try {
        const module = await import('/clases/user.js');
        const UserManager = module.UserManager;
        const userManager = new UserManager();
        
        // Esperar a que tenga el usuario actual
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts && (!userManager.currentUser || !userManager.currentUser.cargo)) {
            console.log(`🔄 Intento ${attempts + 1}: Esperando usuario...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        if (userManager.currentUser && userManager.currentUser.cargo) {
            console.log('✅ UserManager listo con usuario:', userManager.currentUser.correoElectronico);
            return userManager;
        } else {
            console.warn('⚠️ UserManager no cargó usuario después de esperar');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error cargando UserManager:', error);
        return null;
    }
}

// ========== GESTOR DE USUARIOS ==========
async function initUserManager() {
    console.log('🚀 Inicializando gestor de usuarios...');
    
    // OBTENER ADMIN DESDE USERMANAGER
    let admin = null;
    let userManager = null;
    
    try {
        // 1. Intentar obtener desde UserManager
        const module = await import('/clases/user.js');
        const UserManager = module.UserManager;
        userManager = new UserManager();
        
        // Dar tiempo a que cargue
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (userManager.currentUser && userManager.currentUser.cargo === 'administrador') {
            admin = userManager.currentUser;
            console.log('✅ Admin encontrado en UserManager:', {
                nombre: admin.nombreCompleto,
                organizacion: admin.organizacion,
                id: admin.id
            });
        }
    } catch (error) {
        console.warn('⚠️ Error con UserManager:', error);
    }
    
    // 2. Si UserManager no funcionó, buscar en localStorage (fallback)
    if (!admin) {
        console.log('🔍 Buscando admin en localStorage como fallback...');
        admin = getAdminFromLocalStorage();
    }
    
    // 3. Si aún no hay admin, mostrar error
    if (!admin) {
        console.error('❌ NO SE ENCONTRÓ ADMINISTRADOR');
        showNoAdminMessage();
        return;
    }
    
    console.log('✅ ADMINISTRADOR FINAL:', {
        nombre: admin.nombreCompleto,
        email: admin.correoElectronico,
        organizacion: admin.organizacion,
        cargo: admin.cargo,
        id: admin.id
    });
    
    // ACTUALIZAR INTERFAZ CON DATOS DEL ADMIN
    updatePageWithAdminInfo(admin);
    
    // CARGAR COLABORADORES DE ESTE ADMIN
    const collaborators = await loadCollaboratorsForAdmin(admin);
    
    // CONFIGURAR EVENTOS
    setupEvents(admin);
    
    console.log('✅ Gestor de usuarios inicializado correctamente');
}

// ========== OBTENER ADMIN DESDE LOCALSTORAGE (FALLBACK) ==========
function getAdminFromLocalStorage() {
    console.log('🔍 Buscando admin en localStorage...');
    
    // Ver todas las claves en localStorage para debugging
    console.log('📋 Claves en localStorage:', Object.keys(localStorage));
    
    // Según tu consola, el admin NO está en localStorage, pero hay colaboradores
    // Los colaboradores tienen info del admin que los creó
    try {
        const colaboradoresData = localStorage.getItem('centinela-colaboradores');
        if (colaboradoresData) {
            const colaboradores = JSON.parse(colaboradoresData);
            if (colaboradores.length > 0) {
                // Tomar la info del admin del primer colaborador
                const primerColaborador = colaboradores[0];
                console.log('📋 Info del admin desde colaboradores:', {
                    creadoPor: primerColaborador.creadoPor,
                    creadoPorNombre: primerColaborador.creadoPorNombre,
                    creadoPorEmail: primerColaborador.creadoPorEmail,
                    organizacion: primerColaborador.organizacion
                });
                
                // Crear objeto admin basado en la info de los colaboradores
                return {
                    id: primerColaborador.creadoPor,
                    nombreCompleto: primerColaborador.creadoPorNombre,
                    correoElectronico: primerColaborador.creadoPorEmail,
                    organizacion: primerColaborador.organizacion,
                    organizacionCamelCase: primerColaborador.organizacionCamelCase,
                    cargo: 'administrador',
                    theme: primerColaborador.theme,
                    plan: primerColaborador.plan
                };
            }
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo admin desde colaboradores:', error);
    }
    
    return null;
}

// ========== CARGAR COLABORADORES DEL ADMIN ==========
async function loadCollaboratorsForAdmin(admin) {
    console.log(`🔄 Cargando colaboradores para admin: ${admin.nombreCompleto}`);
    
    // Obtener colaboradores desde localStorage
    const collaborators = getCollaboratorsFromStorage(admin);
    
    // Renderizar en tabla
    renderCollaboratorsTable(collaborators, admin);
    
    // Actualizar estadísticas
    updateStats(collaborators);
    
    return collaborators;
}

// ========== OBTENER COLABORADORES DESDE STORAGE ==========
function getCollaboratorsFromStorage(admin) {
    console.log(`🔍 Buscando colaboradores para admin ID: ${admin.id}`);
    
    try {
        const colaboradoresData = localStorage.getItem('centinela-colaboradores');
        if (colaboradoresData) {
            const todosColaboradores = JSON.parse(colaboradoresData);
            
            // Filtrar solo los colaboradores de ESTE admin
            const colaboradoresDelAdmin = todosColaboradores.filter(col => {
                // Verificar por ID del admin creador
                if (col.creadoPor === admin.id) {
                    return true;
                }
                
                // Verificar por email del admin creador
                if (col.creadoPorEmail === admin.correoElectronico) {
                    return true;
                }
                
                // Verificar por organización
                if (col.organizacion === admin.organizacion) {
                    return true;
                }
                
                return false;
            });
            
            console.log(`✅ ${colaboradoresDelAdmin.length} colaboradores encontrados de ${colaboradoresDelAdmin.length} totales`);
            
            // Formatear para la tabla
            return colaboradoresDelAdmin.map(col => ({
                id: col.id,
                name: col.nombreCompleto ? col.nombreCompleto.split(' ')[0] : 'Sin nombre',
                lastname: col.nombreCompleto ? col.nombreCompleto.split(' ').slice(1).join(' ') : '',
                email: col.correoElectronico || 'sin@email.com',
                status: col.status === true ? 'active' : 'inactive',
                role: col.rol || 'Colaborador',
                organization: col.organizacion || admin.organizacion,
                profileImage: col.fotoUsuario || 'https://i.imgur.com/6VBx3io.png',
                authId: col.id || 'UID-' + Math.random().toString(36).substr(2, 6),
                created: col.fechaCreacion ? new Date(col.fechaCreacion).toLocaleDateString() : 'Hoy',
                updated: col.fechaCreacion ? new Date(col.fechaCreacion).toLocaleDateString() : 'Hoy',
                lastLogin: col.ultimoLogin || 'Nunca'
            }));
        }
    } catch (error) {
        console.error('❌ Error cargando colaboradores:', error);
    }
    
    console.log('📭 No se encontraron colaboradores');
    return [];
}

// ========== ACTUALIZAR PÁGINA CON INFO DEL ADMIN ==========
function updatePageWithAdminInfo(admin) {
    console.log('🎨 Actualizando página con datos del admin...');
    
    // Actualizar título principal
    const mainTitle = document.querySelector('.section-header h1');
    if (mainTitle && admin.organizacion) {
        mainTitle.innerHTML = `
            <i class="fas fa-users"></i> COLABORADORES DE 
            <span style="color: var(--color-accent-primary); font-weight: bold;">
                ${admin.organizacion.toUpperCase()}
            </span>
        `;
    } else if (mainTitle) {
        mainTitle.innerHTML = `
            <i class="fas fa-users"></i> GESTIÓN DE COLABORADORES
        `;
    }
    
    // Actualizar subtítulo
    const subTitle = document.querySelector('.section-header p');
    if (subTitle) {
        subTitle.innerHTML = `
            <i class="fas fa-user-shield" style="color: var(--color-accent-primary);"></i>
            Administrador: <strong>${admin.nombreCompleto || 'Administrador'}</strong>
            ${admin.correoElectronico ? ` | ${admin.correoElectronico}` : ''}
        `;
    }
    
    // Actualizar botón de agregar
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.innerHTML = `<i class="fas fa-user-plus"></i> AGREGAR COLABORADOR A ${admin.organizacion || 'ORGANIZACIÓN'}`;
    }
    
    // Crear badge del admin
    updateAdminBadge(admin);
    
    console.log('✅ Interfaz actualizada con datos del admin');
}

// ========== ACTUALIZAR BADGE DEL ADMIN ==========
function updateAdminBadge(admin) {
    // Remover badge anterior si existe
    const oldBadge = document.getElementById('adminBadge');
    if (oldBadge) {
        oldBadge.remove();
    }
    
    // Crear nuevo badge
    const badge = document.createElement('div');
    badge.id = 'adminBadge';
    badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        background: var(--color-bg-tertiary);
        border-radius: 25px;
        border: 1px solid var(--color-accent-primary);
        font-size: 0.9rem;
        margin-left: 15px;
    `;
    
    badge.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary));
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <i class="fas fa-user-tie" style="color: white; font-size: 0.9rem;"></i>
            </div>
            <div style="line-height: 1.2;">
                <div style="font-weight: 600; color: var(--color-text-primary);">
                    ${admin.nombreCompleto ? admin.nombreCompleto.split(' ')[0] : 'Admin'}
                </div>
                <div style="font-size: 0.8rem; color: var(--color-text-secondary);">
                    ${admin.organizacion || 'Centinela MX'}
                </div>
            </div>
        </div>
    `;
    
    // Agregar al header
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        headerActions.appendChild(badge);
    }
}

// ========== RENDERIZAR TABLA ==========
function renderCollaboratorsTable(collaborators, admin) {
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) {
        console.error('❌ No se encontró la tabla');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (collaborators.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px 20px;">
                    <div style="color: var(--color-text-secondary);">
                        <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.4;"></i>
                        <h3 style="margin: 10px 0; color: var(--color-text-primary);">
                            No hay colaboradores en ${admin.organizacion || 'tu organización'}
                        </h3>
                        <p style="margin-bottom: 20px;">Comienza agregando tu primer colaborador</p>
                        <button id="addFirstCollaborator" class="add-btn" 
                            style="margin: 0 auto; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-user-plus"></i> Agregar primer colaborador
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        document.getElementById('addFirstCollaborator')?.addEventListener('click', () => {
            window.location.href = '/users/admin/crear-colaborador/crear-colaborador.html';
        });
        
        return;
    }
    
    // Renderizar cada colaborador
    collaborators.forEach(col => {
        const row = document.createElement('tr');
        
        const statusInfo = col.status === 'active' ? 
            { text: 'Activo', class: 'active', icon: 'fa-check-circle' } :
            { text: 'Inactivo', class: 'inactive', icon: 'fa-ban' };
        
        row.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-avatar" style="background-image: url('${col.profileImage}')">
                        ${!col.profileImage ? '<i class="fas fa-user"></i>' : ''}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${col.name}</div>
                        <small style="color: var(--color-text-secondary); font-size: 0.85rem;">${col.role}</small>
                    </div>
                </div>
            </td>
            <td style="font-weight: 500;">${col.lastname}</td>
            <td style="color: var(--color-text-primary);">${col.email}</td>
            <td>
                <span class="status ${statusInfo.class}">
                    <i class="fas ${statusInfo.icon}"></i> ${statusInfo.text}
                </span>
            </td>
            <td class="actions-cell">
                <button class="row-btn enable" title="${col.status === 'active' ? 'Inhabilitar' : 'Habilitar'}"
                    data-collaborator-id="${col.id}"
                    data-current-status="${col.status}">
                    <i class="fas ${col.status === 'active' ? 'fa-user-check' : 'fa-ban'}"></i>
                </button>
                <button class="row-btn edit" title="Editar" data-collaborator-id="${col.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="row-btn view" title="Ver detalles" data-collaborator-id="${col.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`✅ ${collaborators.length} colaboradores renderizados en la tabla`);
}

// ========== ACTUALIZAR ESTADÍSTICAS ==========
function updateStats(collaborators) {
    const total = collaborators.length;
    const active = collaborators.filter(c => c.status === 'active').length;
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
                <i class="fas fa-chart-bar"></i> ESTADÍSTICAS
            </h3>
            <button id="refreshStats" class="row-btn" 
                style="background: transparent; color: var(--color-accent-primary);">
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
        const admin = await getAdminFromUserManager();
        if (admin) {
            loadCollaboratorsForAdmin(admin);
        }
    });
}

// ========== CONFIGURAR EVENTOS ==========
function setupEvents(admin) {
    // Botón de agregar colaborador
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '/users/admin/crear-colaborador/crear-colaborador.html';
        });
    }
    
    // Eventos de la tabla
    const table = document.querySelector('.collaborators-table');
    if (table) {
        table.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            const row = e.target.closest('tr');
            
            if (!button || !row) return;
            
            if (button.classList.contains('enable')) {
                toggleUserStatus(row, button, admin);
            } 
            else if (button.classList.contains('edit')) {
                editUser(row, button, admin);
            } 
            else if (button.classList.contains('view')) {
                viewUserDetails(button, admin);
            }
        });
    }
}

// ========== FUNCIÓN AUXILIAR PARA OBTENER ADMIN DESDE USERMANAGER ==========
async function getAdminFromUserManager() {
    try {
        const module = await import('/clases/user.js');
        const UserManager = module.UserManager;
        const userManager = new UserManager();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (userManager.currentUser && userManager.currentUser.cargo === 'administrador') {
            return userManager.currentUser;
        }
    } catch (error) {
        console.warn('Error obteniendo admin:', error);
    }
    return null;
}

// ========== MENSAJE CUANDO NO HAY ADMIN ==========
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
                    <p style="margin-bottom: 10px;">
                        Para gestionar colaboradores, debes iniciar sesión como administrador.
                    </p>
                    <p style="margin-bottom: 25px; font-size: 0.9rem; color: #b0b0d0;">
                        Si ya iniciaste sesión, recarga la página.
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.location.reload()" class="row-btn" 
                            style="background: var(--color-accent-primary); color: white;">
                            <i class="fas fa-sync-alt"></i> Recargar página
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

// ========== FUNCIONES PARA LOS BOTONES ==========
function toggleUserStatus(row, button, admin) {
    console.log('Cambiar estado de colaborador');
    // Implementar lógica
}

function editUser(row, button, admin) {
    console.log('Editar colaborador');
    // Implementar lógica
}

function viewUserDetails(button, admin) {
    console.log('Ver detalles del colaborador');
    // Implementar lógica
}

console.log('✅ Script de gestión de colaboradores cargado');