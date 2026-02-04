// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM cargado, iniciando gestor de colaboradores...');
    
    // ESPERAR a que UserManager se cargue (ya incluye Firebase)
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
        
        // Verificar que Firebase esté disponible
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase no está disponible. UserManager no se inicializó correctamente.');
            showFirebaseNotLoadedError();
            return null;
        }
        
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
    console.log('🚀 Inicializando gestor de colaboradores...');
    
    // Verificar que Firebase esté disponible
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error('❌ Firebase no está inicializado');
        showFirebaseNotLoadedError();
        return;
    }
    
    // OBTENER ADMIN DESDE USERMANAGER
    let admin = null;
    let userManager = null;
    
    try {
        // 1. Intentar obtener desde UserManager
        const module = await import('/clases/user.js');
        const UserManager = module.UserManager;
        userManager = new UserManager();
        
        // Dar tiempo a que cargue
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (userManager.currentUser && userManager.currentUser.cargo === 'administrador') {
            admin = userManager.currentUser;
            console.log('✅ Admin encontrado en UserManager:', {
                nombre: admin.nombreCompleto,
                organizacion: admin.organizacion,
                organizacionCamelCase: admin.organizacionCamelCase,
                id: admin.id
            });
            
            // Verificar que tenga organizacionCamelCase
            if (!admin.organizacionCamelCase) {
                console.warn('⚠️ Admin no tiene organizacionCamelCase, generando...');
                admin.organizacionCamelCase = generateCamelCase(admin.organizacion);
            }
        }
    } catch (error) {
        console.warn('⚠️ Error con UserManager:', error);
    }
    
    // 2. Si UserManager no funcionó, buscar en localStorage (fallback)
    if (!admin) {
        console.log('🔍 Buscando admin en localStorage como fallback...');
        admin = getAdminFromLocalStorage();
        
        if (admin && !admin.organizacionCamelCase) {
            admin.organizacionCamelCase = generateCamelCase(admin.organizacion);
        }
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
        organizacionCamelCase: admin.organizacionCamelCase,
        cargo: admin.cargo,
        id: admin.id
    });
    
    // ACTUALIZAR INTERFAZ CON DATOS DEL ADMIN
    updatePageWithAdminInfo(admin);
    
    // CARGAR COLABORADORES DESDE FIREBASE
    const collaborators = await loadCollaboratorsFromFirebase(admin);
    
    // CONFIGURAR EVENTOS
    setupEvents(admin);
    
    console.log('✅ Gestor de colaboradores inicializado correctamente');
}

// ========== GENERAR NOMBRE CAMEL CASE MEJORADO ==========
function generateCamelCase(organizationName) {
    if (!organizationName) return 'organizacionDefault';
    
    // Limpiar y normalizar el nombre
    const cleanName = organizationName
        .trim()
        .toLowerCase()
        .normalize('NFD') // Separar acentos
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, ' '); // Reemplazar múltiples espacios por uno
    
    // Convertir a camelCase
    const camelCaseName = cleanName
        .split(' ')
        .map((word, index) => 
            index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
    
    console.log(`📝 Generando camelCase: "${organizationName}" -> "${camelCaseName}"`);
    
    // Si el resultado está vacío, devolver un valor por defecto
    return camelCaseName || 'organizacionDefault';
}

// ========== OBTENER ADMIN DESDE LOCALSTORAGE (FALLBACK) ==========
function getAdminFromLocalStorage() {
    console.log('🔍 Buscando admin en localStorage...');
    
    try {
        // Buscar admin en centinela-currentUser
        const currentUserData = localStorage.getItem('centinela-currentUser');
        if (currentUserData) {
            const user = JSON.parse(currentUserData);
            if (user.cargo === 'administrador') {
                console.log('✅ Admin encontrado en centinela-currentUser');
                return user;
            }
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo admin desde localStorage:', error);
    }
    
    return null;
}

// ========== CARGAR COLABORADORES DESDE FIREBASE ==========
async function loadCollaboratorsFromFirebase(admin) {
    console.log(`🔄 Cargando colaboradores desde Firebase para admin: ${admin.nombreCompleto}`);
    console.log(`🏢 Admin tiene organizacionCamelCase: ${admin.organizacionCamelCase}`);
    
    // Verificar que Firebase esté disponible
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error('❌ Firebase no está disponible');
        showFirebaseNotLoadedError();
        return [];
    }
    
    try {
        // Obtener Firestore (ya debe estar inicializado por UserManager)
        const db = firebase.firestore();
        
        // PRIMERO: Intentar con la colección específica del admin
        const collectionName = `colaboradores_${admin.organizacionCamelCase}`;
        console.log(`🔍 CONSULTANDO COLECCIÓN PRINCIPAL: ${collectionName}`);
        
        try {
            const querySnapshot = await db.collection(collectionName).get();
            
            if (!querySnapshot.empty) {
                console.log(`✅ Colección ${collectionName} encontrada con ${querySnapshot.size} documentos`);
                const collaborators = processQueryResults(querySnapshot, admin);
                updateUIWithCollaborators(collaborators, admin, collectionName);
                return collaborators;
            } else {
                console.log(`📭 Colección ${collectionName} existe pero está vacía`);
                renderCollaboratorsTable([], admin);
                updateStats([]);
                return [];
            }
        } catch (error) {
            console.log(`❌ Error consultando ${collectionName}:`, error.message);
            
            // Si la colección no existe, intentar con alternativas
            const alternativeCollections = generateAlternativeCollectionNames(admin);
            
            for (const altCollection of alternativeCollections) {
                console.log(`🔍 Probando colección alternativa: ${altCollection}`);
                
                try {
                    const altSnapshot = await db.collection(altCollection)
                        .where('creadoPor', '==', admin.id)
                        .get();
                    
                    if (!altSnapshot.empty) {
                        console.log(`✅ Encontrados ${altSnapshot.size} colaboradores en ${altCollection}`);
                        const collaborators = processQueryResults(altSnapshot, admin);
                        updateUIWithCollaborators(collaborators, admin, altCollection);
                        return collaborators;
                    }
                } catch (altError) {
                    console.log(`⚠️ No se pudo acceder a ${altCollection}:`, altError.message);
                }
            }
            
            // Si no se encontraron colaboradores en ninguna colección
            renderCollaboratorsTable([], admin);
            updateStats([]);
            return [];
        }
        
    } catch (error) {
        console.error('❌ Error cargando colaboradores desde Firebase:', error);
        
        // Intentar cargar desde cache (localStorage)
        console.log('🔄 Intentando cargar desde cache...');
        const cachedCollaborators = getCollaboratorsFromCache(admin);
        
        if (cachedCollaborators.length > 0) {
            console.log(`✅ ${cachedCollaborators.length} colaboradores cargados desde cache`);
            renderCollaboratorsTable(cachedCollaborators, admin);
            updateStats(cachedCollaborators);
            return cachedCollaborators;
        }
        
        // Mostrar error
        showFirebaseError(error);
        return [];
    }
}

// ========== PROCESAR RESULTADOS DE CONSULTA ==========
function processQueryResults(querySnapshot, admin) {
    const collaborators = [];
    
    querySnapshot.forEach(doc => {
        const data = doc.data();
        
        // Verificar que el colaborador pertenezca a este admin
        const belongsToAdmin = 
            data.creadoPor === admin.id || 
            data.creadoPorEmail === admin.correoElectronico ||
            data.organizacion === admin.organizacion ||
            data.organizacionCamelCase === admin.organizacionCamelCase;
        
        if (belongsToAdmin) {
            collaborators.push({
                id: doc.id,
                name: data.nombreCompleto ? data.nombreCompleto.split(' ')[0] : 'Sin nombre',
                lastname: data.nombreCompleto ? data.nombreCompleto.split(' ').slice(1).join(' ') : '',
                email: data.correoElectronico || 'sin@email.com',
                status: data.status === true || data.status === 'active' ? 'active' : 'inactive',
                role: data.rol || 'Colaborador',
                organization: data.organizacion || admin.organizacion,
                profileImage: data.fotoUsuario || 'https://i.imgur.com/6VBx3io.png',
                authId: data.authId || data.id || doc.id,
                created: formatFirebaseDate(data.fechaCreacion),
                updated: formatFirebaseDate(data.fechaActualizacion),
                lastLogin: data.ultimoLogin || 'Nunca',
                rawData: data
            });
        }
    });
    
    console.log(`✅ ${collaborators.length} colaboradores procesados`);
    return collaborators;
}

// ========== FORMATO DE FECHA DE FIREBASE ==========
function formatFirebaseDate(firebaseDate) {
    if (!firebaseDate) return 'No disponible';
    
    try {
        if (firebaseDate.toDate) {
            return firebaseDate.toDate().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (typeof firebaseDate === 'string') {
            return new Date(firebaseDate).toLocaleDateString('es-MX');
        } else if (firebaseDate._seconds) {
            return new Date(firebaseDate._seconds * 1000).toLocaleDateString('es-MX');
        }
    } catch (error) {
        console.warn('⚠️ Error formateando fecha:', error);
    }
    
    return 'Fecha no válida';
}

// ========== GENERAR NOMBRES ALTERNATIVOS DE COLECCIONES ==========
function generateAlternativeCollectionNames(admin) {
    const alternatives = [];
    
    // 1. Nombre base sin camelCase
    if (admin.organizacion) {
        const simpleName = admin.organizacion
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/\s+/g, '');
        
        alternatives.push(`colaboradores_${simpleName}`);
    }
    
    // 2. Nombre con guiones bajos
    if (admin.organizacion) {
        const underscoredName = admin.organizacion
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        
        alternatives.push(`colaboradores_${underscoredName}`);
    }
    
    // 3. Colección general
    alternatives.push('colaboradores');
    alternatives.push('users');
    
    // 4. Colecciones específicas conocidas
    alternatives.push('colaboradores_rsiEnterprice');
    alternatives.push('colaboradores_rsiEnterprise');
    alternatives.push('colaboradores_rsi');
    
    console.log(`🔧 Colecciones alternativas generadas: ${alternatives.join(', ')}`);
    return alternatives;
}

// ========== ACTUALIZAR INTERFAZ CON COLABORADORES ==========
function updateUIWithCollaborators(collaborators, admin, collectionName) {
    console.log(`✅ ${collaborators.length} colaboradores encontrados en ${collectionName}`);
    
    // Guardar en localStorage para cache
    localStorage.setItem(`colaboradores_${admin.organizacionCamelCase}`, JSON.stringify(collaborators));
    
    // Renderizar en tabla
    renderCollaboratorsTable(collaborators, admin);
    
    // Actualizar estadísticas
    updateStats(collaborators);
    
    // Actualizar subtítulo con colección encontrada
    const subTitle = document.querySelector('.section-header p');
    if (subTitle && collectionName) {
        const currentHTML = subTitle.innerHTML;
        subTitle.innerHTML = currentHTML.replace(
            /Colección Firebase:.*/,
            `Colección Firebase: <code>${collectionName}</code>`
        );
    }
}

// ========== OBTENER COLABORADORES DESDE CACHE ==========
function getCollaboratorsFromCache(admin) {
    try {
        const collectionName = `colaboradores_${admin.organizacionCamelCase}`;
        const cachedData = localStorage.getItem(collectionName);
        
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    } catch (error) {
        console.warn('⚠️ Error cargando desde cache:', error);
    }
    
    return [];
}

// ========== MOSTRAR ERROR DE FIREBASE NO CARGADO ==========
function showFirebaseNotLoadedError() {
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 50px 20px;">
                <div style="color: var(--color-text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px; color: #f39c12;"></i>
                    <h3 style="margin: 10px 0; color: var(--color-text-primary);">
                        Firebase no está inicializado
                    </h3>
                    <p style="margin-bottom: 10px; color: #f39c12;">
                        UserManager no pudo cargar Firebase correctamente
                    </p>
                    <p style="margin-bottom: 25px; font-size: 0.9rem; color: #b0b0d0;">
                        Recarga la página o verifica la conexión a internet
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.location.reload()" class="row-btn" 
                            style="background: var(--color-accent-primary); color: white;">
                            <i class="fas fa-sync-alt"></i> Recargar página
                        </button>
                        <button onclick="location.href='/users/admin/dashboard/dashboard.html'" 
                            class="add-btn">
                            <i class="fas fa-arrow-left"></i> Volver al Dashboard
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

// ========== MOSTRAR ERROR DE FIREBASE ==========
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
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.location.reload()" class="row-btn" 
                            style="background: var(--color-accent-primary); color: white;">
                            <i class="fas fa-sync-alt"></i> Recargar página
                        </button>
                        <button onclick="location.href='/users/admin/dashboard/dashboard.html'" 
                            class="add-btn">
                            <i class="fas fa-arrow-left"></i> Volver al Dashboard
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
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
            ${admin.organizacionCamelCase ? ` | Colección Firebase: <code>colaboradores_${admin.organizacionCamelCase}</code>` : ''}
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
                    ${admin.organizacionCamelCase ? `<br><small>ID: ${admin.organizacionCamelCase}</small>` : ''}
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
                        <br><small style="color: #666; font-size: 0.7rem;">ID: ${col.id.substring(0, 8)}...</small>
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
                    data-collection="colaboradores_${admin.organizacionCamelCase}"
                    data-current-status="${col.status}">
                    <i class="fas ${col.status === 'active' ? 'fa-user-check' : 'fa-ban'}"></i>
                </button>
                <button class="row-btn edit" title="Editar" 
                    data-collaborator-id="${col.id}"
                    data-collection="colaboradores_${admin.organizacionCamelCase}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="row-btn view" title="Ver detalles" 
                    data-collaborator-id="${col.id}"
                    data-collection="colaboradores_${admin.organizacionCamelCase}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="row-btn delete" title="Eliminar" 
                    data-collaborator-id="${col.id}"
                    data-collection="colaboradores_${admin.organizacionCamelCase}"
                    style="color: #e74c3c;">
                    <i class="fas fa-trash"></i>
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
                <i class="fas fa-chart-bar"></i> ESTADÍSTICAS DE COLABORADORES
                <small style="font-size: 0.8rem; color: var(--color-text-secondary); margin-left: 10px;">
                    (Fuente: Firebase)
                </small>
            </h3>
            <button id="refreshStats" class="row-btn" 
                style="background: var(--color-accent-primary); color: white;">
                <i class="fas fa-sync-alt"></i> Actualizar desde Firebase
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
        console.log('🔄 Recargando colaboradores desde Firebase...');
        const admin = await getAdminFromUserManager();
        if (admin) {
            // Actualizar organizacionCamelCase si no existe
            if (!admin.organizacionCamelCase && admin.organizacion) {
                admin.organizacionCamelCase = generateCamelCase(admin.organizacion);
            }
            loadCollaboratorsFromFirebase(admin);
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
        table.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const row = e.target.closest('tr');
            
            if (!button || !row) return;
            
            if (button.classList.contains('enable')) {
                await toggleUserStatus(button, admin);
            } 
            else if (button.classList.contains('edit')) {
                await editUser(button, admin);
            } 
            else if (button.classList.contains('view')) {
                await viewUserDetails(button, admin);
            }
            else if (button.classList.contains('delete')) {
                await deleteUser(button, admin);
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
            const admin = userManager.currentUser;
            
            // Asegurar que tenga organizacionCamelCase
            if (!admin.organizacionCamelCase && admin.organizacion) {
                admin.organizacionCamelCase = generateCamelCase(admin.organizacion);
            }
            
            return admin;
        }
    } catch (error) {
        console.warn('Error obteniendo admin:', error);
    }
    return null;
}

// ========== CAMBIAR ESTADO DEL COLABORADOR EN FIREBASE ==========
async function toggleUserStatus(button, admin) {
    const collaboratorId = button.getAttribute('data-collaborator-id');
    const collectionName = button.getAttribute('data-collection');
    const currentStatus = button.getAttribute('data-current-status');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    console.log(`🔄 Cambiando estado de ${collaboratorId} en ${collectionName} a ${newStatus}`);
    
    try {
        // Confirmación
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: '¿Cambiar estado?',
                text: `¿Estás seguro de cambiar el estado a ${newStatus === 'active' ? 'Activo' : 'Inactivo'}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cambiar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });
            
            if (!result.isConfirmed) return;
        } else if (!confirm(`¿Cambiar estado a ${newStatus === 'active' ? 'Activo' : 'Inactivo'}?`)) {
            return;
        }
        
        // Actualizar en Firebase
        const db = firebase.firestore();
        await db.collection(collectionName).doc(collaboratorId).update({
            status: newStatus === 'active',
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Estado actualizado en Firebase`);
        
        // Actualizar cache local
        updateLocalCache(collectionName, collaboratorId, { status: newStatus === 'active' });
        
        // Recargar colaboradores
        loadCollaboratorsFromFirebase(admin);
        
        // Mostrar éxito
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Estado actualizado',
                text: 'El estado del colaborador ha sido actualizado en Firebase',
                timer: 2000,
                showConfirmButton: false
            });
        }
        
    } catch (error) {
        console.error('❌ Error actualizando estado en Firebase:', error);
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo actualizar el estado: ${error.message}`
            });
        }
    }
}

// ========== ACTUALIZAR CACHE LOCAL ==========
function updateLocalCache(collectionName, collaboratorId, updates) {
    try {
        const cachedData = localStorage.getItem(collectionName);
        if (cachedData) {
            const collaborators = JSON.parse(cachedData);
            const index = collaborators.findIndex(c => c.id === collaboratorId);
            
            if (index !== -1) {
                collaborators[index] = { ...collaborators[index], ...updates };
                localStorage.setItem(collectionName, JSON.stringify(collaborators));
            }
        }
    } catch (error) {
        console.warn('⚠️ Error actualizando cache local:', error);
    }
}

// ========== EDITAR COLABORADOR ==========
async function editUser(button, admin) {
    const collaboratorId = button.getAttribute('data-collaborator-id');
    console.log(`✏️ Editando colaborador: ${collaboratorId}`);
    
    // Redirigir a la página de edición con parámetros
    window.location.href = `/users/admin/editar-colaborador/editar-colaborador.html?id=${collaboratorId}&collection=colaboradores_${admin.organizacionCamelCase}`;
}

// ========== VER DETALLES DEL COLABORADOR ==========
async function viewUserDetails(button, admin) {
    const collaboratorId = button.getAttribute('data-collaborator-id');
    const collectionName = button.getAttribute('data-collection');
    
    console.log(`👁️ Ver detalles de colaborador: ${collaboratorId}`);
    
    try {
        // Obtener datos del colaborador desde Firebase
        const db = firebase.firestore();
        const doc = await db.collection(collectionName).doc(collaboratorId).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            // Mostrar modal con los detalles
            showCollaboratorDetails(data, doc.id);
        } else {
            alert('Colaborador no encontrado en Firebase');
        }
    } catch (error) {
        console.error('❌ Error obteniendo detalles:', error);
        alert('Error al obtener detalles del colaborador');
    }
}

// ========== MOSTRAR DETALLES EN MODAL ==========
function showCollaboratorDetails(data, docId) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `Detalles del Colaborador`,
            html: `
                <div style="text-align: left; max-height: 60vh; overflow-y: auto;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            ${data.fotoUsuario ? 
                                `<img src="${data.fotoUsuario}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                                `<i class="fas fa-user" style="font-size: 2rem; color: #666;"></i>`
                            }
                        </div>
                        <div>
                            <h3 style="margin: 0;">${data.nombreCompleto || 'Sin nombre'}</h3>
                            <p style="margin: 5px 0; color: #666;">${data.rol || 'Colaborador'}</p>
                            <p style="margin: 0; font-size: 0.8rem; color: #999;">ID: ${docId.substring(0, 12)}...</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p><strong>Email:</strong><br>${data.correoElectronico || 'No especificado'}</p>
                            <p><strong>Estado:</strong><br>
                                <span style="color: ${data.status ? '#2ecc71' : '#e74c3c'}">
                                    ${data.status ? '✅ Activo' : '❌ Inactivo'}
                                </span>
                            </p>
                            <p><strong>Organización:</strong><br>${data.organizacion || 'No especificado'}</p>
                        </div>
                        <div>
                            <p><strong>Fecha de creación:</strong><br>
                                ${data.fechaCreacion ? 
                                    (data.fechaCreacion.toDate ? 
                                        data.fechaCreacion.toDate().toLocaleDateString() : 
                                        new Date(data.fechaCreacion).toLocaleDateString()
                                    ) : 'No especificada'
                                }
                            </p>
                            <p><strong>Último login:</strong><br>${data.ultimoLogin || 'Nunca'}</p>
                            <p><strong>Creado por:</strong><br>${data.creadoPorNombre || data.creadoPorEmail || 'Admin'}</p>
                        </div>
                    </div>
                    
                    ${data.notas ? `
                        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <strong>Notas:</strong><br>${data.notas}
                        </div>
                    ` : ''}
                </div>
            `,
            width: 700,
            showCloseButton: true,
            showConfirmButton: false,
            showCancelButton: false
        });
    } else {
        // Fallback simple
        alert(`Detalles del colaborador:\n\nNombre: ${data.nombreCompleto}\nEmail: ${data.correoElectronico}\nEstado: ${data.status ? 'Activo' : 'Inactivo'}\nRol: ${data.rol}`);
    }
}

// ========== ELIMINAR COLABORADOR ==========
async function deleteUser(button, admin) {
    const collaboratorId = button.getAttribute('data-collaborator-id');
    const collectionName = button.getAttribute('data-collection');
    
    console.log(`🗑️ Eliminando colaborador: ${collaboratorId}`);
    
    try {
        // Confirmación
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: '¿Eliminar colaborador?',
                text: 'Esta acción no se puede deshacer. El colaborador será eliminado permanentemente.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                reverseButtons: true
            });
            
            if (!result.isConfirmed) return;
        } else if (!confirm('¿Estás seguro de eliminar este colaborador permanentemente?')) {
            return;
        }
        
        // Eliminar de Firebase
        const db = firebase.firestore();
        await db.collection(collectionName).doc(collaboratorId).delete();
        
        console.log(`✅ Colaborador eliminado de Firebase`);
        
        // Actualizar cache local
        removeFromLocalCache(collectionName, collaboratorId);
        
        // Recargar colaboradores
        loadCollaboratorsFromFirebase(admin);
        
        // Mostrar éxito
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Colaborador eliminado',
                text: 'El colaborador ha sido eliminado exitosamente',
                timer: 2000,
                showConfirmButton: false
            });
        }
        
    } catch (error) {
        console.error('❌ Error eliminando colaborador:', error);
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo eliminar el colaborador: ${error.message}`
            });
        }
    }
}

// ========== REMOVER DEL CACHE LOCAL ==========
function removeFromLocalCache(collectionName, collaboratorId) {
    try {
        const cachedData = localStorage.getItem(collectionName);
        if (cachedData) {
            const collaborators = JSON.parse(cachedData);
            const filtered = collaborators.filter(c => c.id !== collaboratorId);
            localStorage.setItem(collectionName, JSON.stringify(filtered));
        }
    } catch (error) {
        console.warn('⚠️ Error removiendo del cache local:', error);
    }
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

console.log('✅ Script de gestión de colaboradores (Firebase) cargado');