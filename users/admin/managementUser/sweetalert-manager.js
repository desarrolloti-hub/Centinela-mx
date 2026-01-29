// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si SweetAlert2 está cargado
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado');
        return;
    }
    
    // Aplicar estilos personalizados a SweetAlert2
    applySweetAlertStyles();
    
    // Inicializar gestor de usuarios
    initUserManager();
});

// Aplicar estilos personalizados para SweetAlert2
function applySweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos personalizados para SweetAlert2 usando variables del theme */
        .swal2-popup {
            background: var(--color-bg-tertiary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-medium) !important;
            box-shadow: var(--shadow-large) !important;
            backdrop-filter: blur(8px) !important;
            font-family: 'Poppins', sans-serif !important;
        }
        
        .swal2-title {
            color: var(--color-text-primary) !important;
            font-family: 'Orbitron', sans-serif !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
        }
        
        .swal2-html-container {
            color: var(--color-text-secondary) !important;
            font-size: 1rem !important;
            font-family: 'Poppins', sans-serif !important;
        }
        
        .swal2-confirm {
            background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary)) !important;
            color: var(--color-text-dark) !important;
            border: none !important;
            border-radius: var(--border-radius-small) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
            box-shadow: var(--shadow-small) !important;
        }
        
        .swal2-confirm:hover {
            background: linear-gradient(135deg, var(--color-accent-secondary), var(--color-accent-primary)) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal) !important;
        }
        
        .swal2-cancel {
            background: linear-gradient(135deg, var(--color-bg-tertiary), var(--color-text-secondary)) !important;
            color: var(--color-text-primary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-small) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
            box-shadow: var(--shadow-small) !important;
        }
        
        .swal2-cancel:hover {
            background: linear-gradient(135deg, var(--color-text-secondary), var(--color-bg-tertiary)) !important;
            border-color: var(--color-accent-primary) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal) !important;
        }
        
        .swal2-input, .swal2-textarea, .swal2-select {
            background: var(--color-bg-secondary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-small) !important;
            color: var(--color-text-primary) !important;
            font-family: 'Poppins', sans-serif !important;
            transition: var(--transition-default) !important;
        }
        
        .swal2-input:focus, .swal2-textarea:focus {
            border-color: var(--color-accent-primary) !important;
            box-shadow: 0 0 0 1px var(--color-shadow) !important;
        }
        
        /* Toast notifications */
        .swal2-toast {
            background: var(--color-bg-tertiary) !important;
            border: 1px solid var(--color-border-light) !important;
            box-shadow: var(--shadow-normal) !important;
            backdrop-filter: blur(8px) !important;
        }
        
        .swal2-toast .swal2-title {
            color: var(--color-text-primary) !important;
            font-size: 0.875rem !important;
        }
    `;
    document.head.appendChild(style);
}

function initUserManager() {
    // Elementos del DOM
    const addBtn = document.getElementById('addBtn');
    const collaboratorsTable = document.querySelector('.collaborators-table');

    // ========== BOTÓN AGREGAR COLABORADOR ==========
    addBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Agregar Nuevo Colaborador',
            html: `
                <div style="text-align: left; margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                        <i class="fas fa-user"></i> Nombre
                    </label>
                    <input type="text" id="swal-input-name" class="swal2-input" placeholder="Ingresa el nombre">
                </div>
                <div style="text-align: left; margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                        <i class="fas fa-user"></i> Apellido
                    </label>
                    <input type="text" id="swal-input-lastname" class="swal2-input" placeholder="Ingresa el apellido">
                </div>
                <div style="text-align: left; margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                        <i class="fas fa-envelope"></i> Correo Electrónico
                    </label>
                    <input type="email" id="swal-input-email" class="swal2-input" placeholder="ejemplo@centinela.mx">
                </div>
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                        <i class="fas fa-lock"></i> Contraseña Temporal
                    </label>
                    <input type="password" id="swal-input-password" class="swal2-input" placeholder="Genera una contraseña segura">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Crear Colaborador',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--color-accent-primary)',
            cancelButtonColor: 'var(--color-bg-tertiary)',
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                const lastname = document.getElementById('swal-input-lastname').value;
                const email = document.getElementById('swal-input-email').value;
                const password = document.getElementById('swal-input-password').value;
                
                // Validaciones
                if (!name || !lastname || !email || !password) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }
                
                if (!validateEmail(email)) {
                    Swal.showValidationMessage('Por favor ingresa un correo válido');
                    return false;
                }
                
                if (password.length < 8) {
                    Swal.showValidationMessage('La contraseña debe tener al menos 8 caracteres');
                    return false;
                }
                
                return { name, lastname, email, password };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Simular creación de usuario
                const userId = generateUserId();
                const userData = result.value;
                
                // Mostrar loader
                Swal.fire({
                    title: 'Creando colaborador...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                // Simular petición al servidor
                setTimeout(async () => {
                    // Agregar fila a la tabla
                    addUserToTable(userId, userData);
                    
                    // Cerrar loader
                    await Swal.close();
                    
                    // Mostrar éxito
                    Swal.fire({
                        icon: 'success',
                        title: '¡Colaborador creado!',
                        html: `
                            <div style="text-align: left;">
                                <p><strong>Nombre:</strong> ${userData.name} ${userData.lastname}</p>
                                <p><strong>Email:</strong> ${userData.email}</p>
                                <p><strong>Contraseña temporal:</strong> ${userData.password}</p>
                                <p style="color: var(--color-accent-primary); font-size: 0.9rem; margin-top: 1rem;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    Recuerda compartir estas credenciales de forma segura
                                </p>
                            </div>
                        `,
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: 'var(--color-accent-primary)'
                    });
                }, 1500);
            }
        });
    });

    // ========== EVENTOS DE LA TABLA ==========
    collaboratorsTable.addEventListener('click', (e) => {
        const target = e.target;
        
        // Verificar si el clic fue en un botón o en un icono dentro del botón
        const button = target.closest('button');
        const icon = target.closest('i');
        const anchor = target.closest('a');
        const row = target.closest('tr');
        
        if (!row) return;
        
        // Si se hizo clic en un icono, obtener el botón padre
        const actualButton = button || (icon && icon.closest('button'));
        const actualAnchor = anchor || (icon && icon.closest('a'));
        
        // Botón INHABILITAR/HABILITAR
        if (actualButton && actualButton.classList.contains('enable')) {
            e.preventDefault();
            e.stopPropagation();
            toggleUserStatus(row, actualButton);
            return false;
        }
        
        // Enlace EDITAR
        if (actualAnchor && actualAnchor.classList.contains('edit')) {
            e.preventDefault();
            e.stopPropagation();
            editUser(row, actualAnchor);
            return false;
        }
        
        // Botón VER DETALLES
        if (actualButton && actualButton.classList.contains('view')) {
            e.preventDefault();
            e.stopPropagation();
            viewUserDetails(actualButton);
            return false;
        }
    });

    // ========== FUNCIONES DE GESTIÓN ==========
    
    function toggleUserStatus(row, button) {
        const statusSpan = row.querySelector('.status');
        const isActive = statusSpan.classList.contains('active');
        const userName = row.querySelector('.user-info div').textContent.trim();
        const userLastname = row.cells[1].textContent;
        const userEmail = row.cells[2].textContent;
        const fullName = `${userName} ${userLastname}`;
        
        Swal.fire({
            title: `${isActive ? 'Inhabilitar' : 'Habilitar'} Colaborador`,
            html: `
                <div style="text-align: center; margin-bottom: 1rem;">
                    <div style="background: ${isActive ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)'}; 
                         padding: 1rem; border-radius: 8px; border-left: 4px solid ${isActive ? '#e74c3c' : '#2ecc71'};">
                        <i class="fas fa-user" style="font-size: 2rem; color: ${isActive ? '#e74c3c' : '#2ecc71'}; margin-bottom: 0.5rem;"></i>
                        <h3 style="margin: 0.5rem 0; color: var(--color-text-primary);">${fullName}</h3>
                        <p style="margin: 0; color: var(--color-text-secondary);">${userEmail}</p>
                    </div>
                </div>
                <p>¿Estás seguro de ${isActive ? 'inhabilitar' : 'habilitar'} al colaborador?</p>
                ${isActive ? 
                    '<p style="color: #e74c3c; font-size: 0.9rem;"><i class="fas fa-exclamation-triangle"></i> El usuario no podrá acceder al sistema hasta que sea habilitado nuevamente</p>' :
                    '<p style="color: #2ecc71; font-size: 0.9rem;"><i class="fas fa-check-circle"></i> El usuario podrá acceder al sistema normalmente</p>'
                }
            `,
            icon: isActive ? 'warning' : 'info',
            showCancelButton: true,
            confirmButtonText: isActive ? 'Sí, inhabilitar' : 'Sí, habilitar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: isActive ? '#e74c3c' : '#2ecc71',
            cancelButtonColor: 'var(--color-bg-tertiary)',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                // Cambiar estado visual
                statusSpan.textContent = isActive ? 'Inactivo' : 'Activo';
                statusSpan.classList.toggle('active');
                statusSpan.classList.toggle('inactive');
                
                // Cambiar icono del botón
                button.querySelector('i').className = isActive ? 'fas fa-ban' : 'fas fa-user-check';
                button.title = isActive ? 'Habilitar' : 'Inhabilitar';
                
                // Cambiar color del icono
                button.style.background = isActive ? 
                    'linear-gradient(135deg, #95a5a6, #7f8c8d)' : 
                    'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))';
                
                // Mostrar mensaje de éxito
                const message = isActive ? 'inhabilitado' : 'habilitado';
                const iconColor = isActive ? '#e74c3c' : '#2ecc71';
                
                Swal.fire({
                    icon: 'success',
                    title: '¡Estado cambiado!',
                    html: `
                        <div style="text-align: center;">
                            <i class="fas fa-user-check" style="font-size: 3rem; color: ${iconColor}; margin-bottom: 1rem;"></i>
                            <p><strong>${fullName}</strong></p>
                            <p>ha sido ${message} exitosamente</p>
                        </div>
                    `,
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }
        });
    }

    function editUser(row, anchorElement) {
        const userName = row.querySelector('.user-info div').textContent.trim();
        const userLastname = row.cells[1].textContent;
        const userEmail = row.cells[2].textContent;
        const statusSpan = row.querySelector('.status');
        const isActive = statusSpan.classList.contains('active');
        
        Swal.fire({
            title: 'Editar Colaborador',
            html: `
                <div style="text-align: center; margin-bottom: 1rem;">
                    <div style="background: rgba(52, 152, 219, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #3498db;">
                        <i class="fas fa-user-edit" style="font-size: 2rem; color: #3498db; margin-bottom: 0.5rem;"></i>
                        <h3 style="margin: 0.5rem 0; color: var(--color-text-primary);">${userName} ${userLastname}</h3>
                        <p style="margin: 0; color: var(--color-text-secondary);">${userEmail}</p>
                    </div>
                </div>
                <div style="text-align: left;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                            <i class="fas fa-user"></i> Nombre
                        </label>
                        <input type="text" id="swal-edit-name" class="swal2-input" value="${userName}" placeholder="Nombre">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                            <i class="fas fa-user"></i> Apellido
                        </label>
                        <input type="text" id="swal-edit-lastname" class="swal2-input" value="${userLastname}" placeholder="Apellido">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                            <i class="fas fa-envelope"></i> Correo
                        </label>
                        <input type="email" id="swal-edit-email" class="swal2-input" value="${userEmail}" placeholder="Correo electrónico">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--color-text-secondary);">
                            <i class="fas fa-toggle-on"></i> Estado
                        </label>
                        <select id="swal-edit-status" class="swal2-select" style="width: 100%;">
                            <option value="active" ${isActive ? 'selected' : ''}>Activo</option>
                            <option value="inactive" ${!isActive ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--color-accent-primary)',
            cancelButtonColor: 'var(--color-bg-tertiary)',
            width: 500,
            preConfirm: () => {
                const newName = document.getElementById('swal-edit-name').value;
                const newLastname = document.getElementById('swal-edit-lastname').value;
                const newEmail = document.getElementById('swal-edit-email').value;
                const newStatus = document.getElementById('swal-edit-status').value;
                
                if (!newName || !newLastname || !newEmail) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }
                
                if (!validateEmail(newEmail)) {
                    Swal.showValidationMessage('Por favor ingresa un correo válido');
                    return false;
                }
                
                return { newName, newLastname, newEmail, newStatus };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Mostrar loader
                Swal.fire({
                    title: 'Actualizando datos...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                // Simular actualización
                setTimeout(async () => {
                    const data = result.value;
                    
                    // Actualizar tabla
                    row.querySelector('.user-info div').textContent = data.newName;
                    row.cells[1].textContent = data.newLastname;
                    row.cells[2].textContent = data.newEmail;
                    
                    // Actualizar estado
                    const statusSpan = row.querySelector('.status');
                    if (data.newStatus === 'active') {
                        statusSpan.textContent = 'Activo';
                        statusSpan.className = 'status active';
                        const enableBtn = row.querySelector('.enable');
                        if (enableBtn) {
                            enableBtn.querySelector('i').className = 'fas fa-user-check';
                            enableBtn.style.background = 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))';
                        }
                    } else {
                        statusSpan.textContent = 'Inactivo';
                        statusSpan.className = 'status inactive';
                        const enableBtn = row.querySelector('.enable');
                        if (enableBtn) {
                            enableBtn.querySelector('i').className = 'fas fa-ban';
                            enableBtn.style.background = 'linear-gradient(135deg, #95a5a6, #7f8c8d)';
                        }
                    }
                    
                    // Cerrar loader
                    await Swal.close();
                    
                    // Mostrar éxito y redirigir
                    Swal.fire({
                        icon: 'success',
                        title: '¡Cambios guardados!',
                        html: `
                            <div style="text-align: center;">
                                <i class="fas fa-check-circle" style="font-size: 3rem; color: #2ecc71; margin-bottom: 1rem;"></i>
                                <p>Los datos de <strong>${data.newName} ${data.newLastname}</strong></p>
                                <p>han sido actualizados correctamente</p>
                                <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 1rem;">
                                    Redirigiendo a la página de edición...
                                </p>
                            </div>
                        `,
                        timer: 2200,
                        timerProgressBar: true,
                        showConfirmButton: false
                    }).then(() => {
                        // Redirigir a la página de edición
                        window.location.href = anchorElement.href;
                    });
                    
                }, 1000);
            } else {
                // Si el usuario cancela, mostrar mensaje
                Swal.fire({
                    icon: 'info',
                    title: 'Edición cancelada',
                    text: 'No se realizaron cambios',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    }

    function viewUserDetails(button) {
        // Datos desde data attributes
        const org = button.getAttribute('data-org');
        const fullName = button.getAttribute('data-fullname');
        const email = button.getAttribute('data-email');
        const status = button.getAttribute('data-status');
        const authId = button.getAttribute('data-authid');
        const orgPhoto = button.getAttribute('data-orgphoto');
        const userPhoto = button.getAttribute('data-userphoto');
        const created = button.getAttribute('data-created');
        const updated = button.getAttribute('data-updated');
        const lastLogin = button.getAttribute('data-lastlogin');
        
        Swal.fire({
            title: 'Detalles del Colaborador',
            html: `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: left; width: 100%;">
                    <img src="${userPhoto}" alt="Foto del usuario" style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--color-accent-primary);">
                    
                    <h3 style="margin: 0; color: var(--color-text-primary); font-family: 'Orbitron', sans-serif;">${fullName}</h3>
                    
                    <div style="width: 100%;">
                        <p><strong><i class="fas fa-building"></i> Organización:</strong> ${org}</p>
                        <p><strong><i class="fas fa-envelope"></i> Correo:</strong> ${email}</p>
                        <p><strong><i class="fas fa-toggle-${status === 'Activo' ? 'on' : 'off'}"></i> Status:</strong> 
                            <span class="${status === 'Activo' ? 'status active' : 'status inactive'}" style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.9rem;">
                                ${status}
                            </span>
                        </p>
                        <p><strong><i class="fas fa-id-card"></i> ID Auth:</strong> ${authId}</p>
                        <p><strong><i class="fas fa-calendar-plus"></i> Fecha creación:</strong> ${created}</p>
                        <p><strong><i class="fas fa-calendar-check"></i> Última actualización:</strong> ${updated}</p>
                        <p><strong><i class="fas fa-sign-in-alt"></i> Último login:</strong> ${lastLogin}</p>
                    </div>
                    
                    <div style="width: 100%; margin-top: 1rem;">
                        <p style="margin-bottom: 0.5rem;"><strong><i class="fas fa-image"></i> Logo de la Organización</strong></p>
                        <img src="${orgPhoto}" alt="Logo organización" style="width: 100%; max-width: 200px; border-radius: 8px; border: 2px solid var(--color-border-light);">
                    </div>
                </div>
            `,
            width: 600,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: 'var(--color-accent-primary)'
        });
    }

    // ========== FUNCIONES UTILITARIAS ==========
    
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function generateUserId() {
        return Date.now().toString().slice(-6);
    }

    function addUserToTable(userId, userData) {
        const tbody = collaboratorsTable.querySelector('tbody');
        const newRow = document.createElement('tr');
        
        const isActive = true; // Por defecto activo
        
        newRow.innerHTML = `
            <td><div class="user-info"><div class="user-avatar"><i class="fas fa-user"></i></div>${userData.name}</div></td>
            <td>${userData.lastname}</td>
            <td>${userData.email}</td>
            <td><span class="status ${isActive ? 'active' : 'inactive'}">${isActive ? 'Activo' : 'Inactivo'}</span></td>
            <td class="actions-cell">
                <button class="row-btn enable" title="Inhabilitar">
                    <i class="fas fa-user-check"></i>
                </button>
                <a href="/users/admin/editUser/editUser.html" class="row-btn edit" title="Editar">
                    <i class="fas fa-edit"></i>
                </a>
                <button class="row-btn view" title="Ver detalles"
                    data-org="Centinela MX"
                    data-fullname="${userData.name} ${userData.lastname}"
                    data-email="${userData.email}"
                    data-status="${isActive ? 'Activo' : 'Inactivo'}"
                    data-authid="UID-${userId}"
                    data-orgphoto="https://i.imgur.com/8Km9tLL.png"
                    data-userphoto="https://i.imgur.com/6VBx3io.png"
                    data-created="${new Date().toISOString().split('T')[0]}"
                    data-updated="${new Date().toISOString().split('T')[0]}"
                    data-lastlogin="Nunca">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(newRow);
        updateTableCount();
    }

    function updateTableCount() {
        const activeCount = document.querySelectorAll('.status.active').length;
        const totalCount = document.querySelectorAll('tbody tr').length;
        
        console.log(`Total colaboradores: ${totalCount}, Activos: ${activeCount}`);
    }

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            Swal.close();
        }
    });

    // Inicializar contadores
    updateTableCount();
}

// Asegurar que el archivo CSS se cargue correctamente
window.addEventListener('load', function() {
    console.log('✅ Gestión de colaboradores inicializada con SweetAlerts');
});