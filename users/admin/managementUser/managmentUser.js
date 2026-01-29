// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, iniciando gestor de usuarios...');
    
    // Verificar si SweetAlert2 está cargado
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado');
        // Crear un script para cargar SweetAlert2 dinámicamente
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.onload = () => {
            console.log('✅ SweetAlert2 cargado dinámicamente');
            applyAdaptiveSweetAlertStyles();
            initUserManager();
        };
        script.onerror = () => {
            console.error('❌ Error cargando SweetAlert2');
            initUserManager(); // Iniciar sin SweetAlert2
        };
        document.head.appendChild(script);
    } else {
        console.log('✅ SweetAlert2 ya está cargado');
        applyAdaptiveSweetAlertStyles();
        initUserManager();
    }
});

// ========== APLICAR ESTILOS SWEETALERT ADAPTATIVOS ==========
function applyAdaptiveSweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos adaptativos para SweetAlert2 usando variables CSS del tema */
        .swal2-popup {
            background: var(--color-bg-tertiary, #1a1a2e) !important;
            border: 1px solid var(--color-border-light, #2d2d4d) !important;
            border-radius: var(--border-radius-medium, 12px) !important;
            box-shadow: var(--shadow-large, 0 10px 30px rgba(0, 0, 0, 0.5)) !important;
            backdrop-filter: blur(8px) !important;
            font-family: 'Rajdhani', sans-serif !important;
            color: var(--color-text-primary, #ffffff) !important;
        }
        
        .swal2-title {
            color: var(--color-text-primary, #ffffff) !important;
            font-family: var(--font-family-primary, 'Orbitron'), sans-serif !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            text-shadow: var(--text-shadow-effect, 0 2px 4px rgba(0, 0, 0, 0.5)) !important;
        }
        
        .swal2-html-container {
            color: var(--color-text-secondary, #b0b0d0) !important;
            font-size: 1rem !important;
            font-family: 'Rajdhani', sans-serif !important;
            line-height: 1.5 !important;
        }
        
        /* Botón Confirmar */
        .swal2-confirm {
            background: linear-gradient(135deg, var(--color-accent-primary, #667eea), var(--color-accent-secondary, #764ba2)) !important;
            color: var(--color-text-dark, #ffffff) !important;
            border: none !important;
            border-radius: var(--border-radius-small, 8px) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default, all 0.3s ease) !important;
            box-shadow: var(--shadow-small, 0 4px 15px rgba(102, 126, 234, 0.4)) !important;
        }
        
        .swal2-confirm:hover {
            background: linear-gradient(135deg, var(--color-accent-secondary, #764ba2), var(--color-accent-primary, #667eea)) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal, 0 6px 20px rgba(102, 126, 234, 0.6)) !important;
        }
        
        /* Botón Cancelar */
        .swal2-cancel {
            background: linear-gradient(135deg, var(--color-bg-tertiary, #2d2d4d), var(--color-text-secondary, #4a4a6e)) !important;
            color: var(--color-text-primary, #b0b0d0) !important;
            border: 1px solid var(--color-border-light, #3d3d5d) !important;
            border-radius: var(--border-radius-small, 8px) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default, all 0.3s ease) !important;
            box-shadow: var(--shadow-small, 0 4px 10px rgba(0, 0, 0, 0.3)) !important;
        }
        
        .swal2-cancel:hover {
            background: linear-gradient(135deg, var(--color-text-secondary, #4a4a6e), var(--color-bg-tertiary, #2d2d4d)) !important;
            border-color: var(--color-accent-primary, #667eea) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal, 0 6px 15px rgba(0, 0, 0, 0.4)) !important;
        }
        
        /* Inputs */
        .swal2-input, .swal2-textarea, .swal2-select {
            background: var(--color-bg-secondary, #2d2d4d) !important;
            border: 1px solid var(--color-border-light, #3d3d5d) !important;
            border-radius: var(--border-radius-small, 8px) !important;
            color: var(--color-text-primary, #ffffff) !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default, all 0.3s ease) !important;
            padding: 10px 15px !important;
        }
        
        .swal2-input:focus, .swal2-textarea:focus {
            border-color: var(--color-accent-primary, #667eea) !important;
            box-shadow: 0 0 0 3px var(--color-shadow, rgba(102, 126, 234, 0.2)) !important;
            outline: none !important;
        }
        
        /* Mensajes de validación */
        .swal2-validation-message {
            background: rgba(231, 76, 60, 0.1) !important;
            color: #e74c3c !important;
            border: 1px solid rgba(231, 76, 60, 0.3) !important;
        }
        
        /* Iconos con colores adaptativos */
        .swal2-icon.swal2-success {
            border-color: var(--color-success, #2ecc71) !important;
            color: var(--color-success, #2ecc71) !important;
        }
        
        .swal2-icon.swal2-error {
            border-color: var(--color-error, #e74c3c) !important;
            color: var(--color-error, #e74c3c) !important;
        }
        
        .swal2-icon.swal2-warning {
            border-color: var(--color-warning, #f39c12) !important;
            color: var(--color-warning, #f39c12) !important;
        }
        
        .swal2-icon.swal2-info {
            border-color: var(--color-info, #3498db) !important;
            color: var(--color-info, #3498db) !important;
        }
        
        .swal2-icon.swal2-question {
            border-color: var(--color-accent-primary, #667eea) !important;
            color: var(--color-accent-primary, #667eea) !important;
        }
        
        /* Progress bar */
        .swal2-progress-steps .swal2-progress-step {
            background: var(--color-accent-primary, #667eea) !important;
            color: var(--color-text-dark, #ffffff) !important;
        }
        
        .swal2-timer-progress-bar {
            background: linear-gradient(135deg, var(--color-accent-primary, #667eea), var(--color-accent-secondary, #764ba2)) !important;
        }
        
        /* Toast notifications */
        .swal2-toast {
            background: var(--color-bg-tertiary, #1a1a2e) !important;
            border: 1px solid var(--color-border-light, #2d2d4d) !important;
            box-shadow: var(--shadow-normal, 0 5px 15px rgba(0, 0, 0, 0.5)) !important;
            backdrop-filter: blur(8px) !important;
        }
        
        /* Close button */
        .swal2-close {
            color: var(--color-text-secondary, #b0b0d0) !important;
            transition: var(--transition-default, all 0.3s ease) !important;
        }
        
        .swal2-close:hover {
            color: var(--color-accent-primary, #667eea) !important;
            transform: scale(1.1) !important;
        }
        
        /* Animaciones */
        @keyframes swal2-show {
            0% {
                transform: scale(0.7);
                opacity: 0;
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
        @keyframes swal2-hide {
            0% {
                transform: scale(1);
                opacity: 1;
            }
            100% {
                transform: scale(0.5);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Estilos SweetAlert adaptativos aplicados');
}

// ========== GESTOR DE USUARIOS ==========
function initUserManager() {
    console.log('🚀 Inicializando gestor de usuarios...');
    
    // Elementos del DOM
    const addBtn = document.getElementById('addBtn');
    const collaboratorsTable = document.querySelector('.collaborators-table');
    
    if (!addBtn) {
        console.error('❌ No se encontró el botón addBtn');
        return;
    }
    
    if (!collaboratorsTable) {
        console.error('❌ No se encontró la tabla collaboratorsTable');
        return;
    }
    
    console.log('✅ Elementos DOM encontrados');
    
    // ========== BOTÓN AGREGAR COLABORADOR ==========
    addBtn.addEventListener('click', () => {
        console.log('➕ Botón agregar colaborador clickeado');
        showAddCollaboratorAlert();
    });
    
    // ========== EVENTOS DE LA TABLA ==========
    collaboratorsTable.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button');
        const row = target.closest('tr');
        
        if (!row) return;
        
        // Determinar qué acción ejecutar
        if (button) {
            e.preventDefault();
            e.stopPropagation();
            
            if (button.classList.contains('enable')) {
                console.log('🔄 Botón habilitar/inhabilitar clickeado');
                toggleUserStatus(row, button);
            } 
            else if (button.classList.contains('edit')) {
                console.log('✏️ Botón editar clickeado');
                editUser(row);
            } 
            else if (button.classList.contains('view')) {
                console.log(' Botón ver detalles clickeado');
                viewUserDetails(button);
            }
        }
    });
    
    console.log('✅ Eventos asignados correctamente');
}

// ========== ALERTAS DE SWEETALERT CON ESTILOS ADAPTATIVOS ==========

// Función para obtener colores dinámicos del tema
function getThemeColors() {
    // Intentar obtener colores de las variables CSS
    const style = getComputedStyle(document.documentElement);
    
    return {
        primary: style.getPropertyValue('--color-accent-primary').trim() || '#667eea',
        secondary: style.getPropertyValue('--color-accent-secondary').trim() || '#764ba2',
        success: style.getPropertyValue('--color-success').trim() || '#2ecc71',
        error: style.getPropertyValue('--color-error').trim() || '#e74c3c',
        warning: style.getPropertyValue('--color-warning').trim() || '#f39c12',
        info: style.getPropertyValue('--color-info').trim() || '#3498db',
        bgPrimary: style.getPropertyValue('--color-bg-primary').trim() || '#0f0f1e',
        bgSecondary: style.getPropertyValue('--color-bg-secondary').trim() || '#1a1a2e',
        bgTertiary: style.getPropertyValue('--color-bg-tertiary').trim() || '#2d2d4d',
        textPrimary: style.getPropertyValue('--color-text-primary').trim() || '#ffffff',
        textSecondary: style.getPropertyValue('--color-text-secondary').trim() || '#b0b0d0',
        borderLight: style.getPropertyValue('--color-border-light').trim() || '#3d3d5d'
    };
}

// 1. ALERTA PARA AGREGAR COLABORADOR
function showAddCollaboratorAlert() {
    const colors = getThemeColors();
    
    Swal.fire({
        title: '➕ AGREGAR NUEVO COLABORADOR',
        html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-user"></i> NOMBRE
                    </label>
                    <input type="text" id="swal-name" class="swal2-input" placeholder="Ingresa el nombre">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-user"></i> APELLIDO
                    </label>
                    <input type="text" id="swal-lastname" class="swal2-input" placeholder="Ingresa el apellido">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-envelope"></i> CORREO ELECTRÓNICO
                    </label>
                    <input type="email" id="swal-email" class="swal2-input" placeholder="ejemplo@centinela.mx">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-lock"></i> CONTRASEÑA TEMPORAL
                    </label>
                    <input type="password" id="swal-password" class="swal2-input" placeholder="Mínimo 8 caracteres">
                </div>
                <div style="background: ${colors.primary}15; padding: 10px; border-radius: 6px; margin-top: 10px; border-left: 3px solid ${colors.primary};">
                    <p style="margin: 0; color: ${colors.textSecondary}; font-size: 0.8rem;">
                        <i class="fas fa-info-circle"></i> La contraseña será enviada al correo del colaborador
                    </p>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-user-plus"></i> CREAR COLABORADOR',
        cancelButtonText: '<i class="fas fa-times"></i> CANCELAR',
        confirmButtonColor: colors.primary,
        cancelButtonColor: colors.bgTertiary,
        width: '500px',
        backdrop: `rgba(0, 0, 0, 0.8)`,
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            confirmButton: 'custom-swal-confirm',
            cancelButton: 'custom-swal-cancel'
        },
        preConfirm: () => {
            const name = document.getElementById('swal-name').value.trim();
            const lastname = document.getElementById('swal-lastname').value.trim();
            const email = document.getElementById('swal-email').value.trim();
            const password = document.getElementById('swal-password').value;
            
            // Validaciones
            const errors = [];
            
            if (!name) errors.push('El nombre es obligatorio');
            if (!lastname) errors.push('El apellido es obligatorio');
            if (!email) errors.push('El correo es obligatorio');
            if (!password) errors.push('La contraseña es obligatoria');
            
            if (email && !validateEmail(email)) {
                errors.push('El correo electrónico no es válido');
            }
            
            if (password && password.length < 8) {
                errors.push('La contraseña debe tener al menos 8 caracteres');
            }
            
            if (errors.length > 0) {
                Swal.showValidationMessage(errors.join('<br>'));
                return false;
            }
            
            return { name, lastname, email, password };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const userData = result.value;
            console.log('📝 Datos del nuevo colaborador:', userData);
            
            // Mostrar loader
            Swal.fire({
                title: '⏳ CREANDO COLABORADOR',
                text: 'Por favor espera un momento...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Simular creación (2 segundos)
            setTimeout(() => {
                // Cerrar loader
                Swal.close();
                
                // Mostrar éxito
                showSuccessAlert(
                    '✅ COLABORADOR CREADO',
                    `El colaborador <strong>${userData.name} ${userData.lastname}</strong> ha sido creado exitosamente.<br><br>
                    <strong>Correo:</strong> ${userData.email}<br>
                    <strong>Contraseña temporal:</strong> ${userData.password}<br><br>
                    <span style="color: ${colors.warning};"><i class="fas fa-exclamation-triangle"></i> Recuerda compartir estas credenciales de forma segura.</span>`
                );
                
                // Aquí puedes agregar la lógica para añadir a la tabla
                addUserToTable(userData);
                
            }, 2000);
        }
    });
}

// 2. ALERTA PARA CAMBIAR ESTADO (HABILITAR/INHABILITAR)
function toggleUserStatus(row, button) {
    const colors = getThemeColors();
    const statusSpan = row.querySelector('.status');
    const isActive = statusSpan.classList.contains('active');
    const userName = row.querySelector('.user-info div').textContent.trim();
    const userLastname = row.cells[1].textContent;
    const userEmail = row.cells[2].textContent;
    const fullName = `${userName} ${userLastname}`;
    
    const action = isActive ? 'inhabilitar' : 'habilitar';
    const actionCapitalized = action.toUpperCase();
    const icon = isActive ? 'fa-user-slash' : 'fa-user-check';
    const iconColor = isActive ? colors.error : colors.success;
    const confirmColor = isActive ? colors.error : colors.success;
    
    Swal.fire({
        title: `⚠️ ${actionCapitalized} COLABORADOR`,
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: ${isActive ? colors.error + '15' : colors.success + '15'}; 
                     padding: 20px; border-radius: 50%; border: 3px solid ${iconColor}; margin-bottom: 15px;">
                    <i class="fas ${icon}" style="font-size: 2.5rem; color: ${iconColor};"></i>
                </div>
                <h3 style="color: ${colors.textPrimary}; margin: 10px 0;">${fullName}</h3>
                <p style="color: ${colors.textSecondary}; margin: 0;">${userEmail}</p>
            </div>
            <p style="text-align: center; font-size: 1.1rem; color: ${colors.textPrimary};">
                ¿Estás seguro de <strong>${action}</strong> a este colaborador?
            </p>
            ${isActive ? 
                `<div style="background: ${colors.error}15; padding: 10px; border-radius: 6px; border-left: 3px solid ${colors.error}; margin-top: 15px;">
                    <p style="margin: 0; color: ${colors.error}; font-size: 0.9rem;">
                        <i class="fas fa-exclamation-triangle"></i> El usuario no podrá acceder al sistema hasta que sea habilitado nuevamente.
                    </p>
                </div>` :
                `<div style="background: ${colors.success}15; padding: 10px; border-radius: 6px; border-left: 3px solid ${colors.success}; margin-top: 15px;">
                    <p style="margin: 0; color: ${colors.success}; font-size: 0.9rem;">
                        <i class="fas fa-check-circle"></i> El usuario podrá acceder al sistema normalmente.
                    </p>
                </div>`
            }
        `,
        icon: isActive ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonText: `<i class="fas ${icon}"></i> SÍ, ${actionCapitalized}`,
        cancelButtonText: '<i class="fas fa-times"></i> CANCELAR',
        confirmButtonColor: confirmColor,
        cancelButtonColor: colors.bgTertiary,
        reverseButtons: true,
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            confirmButton: 'custom-swal-confirm',
            cancelButton: 'custom-swal-cancel'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Cambiar estado visual
            const newStatus = isActive ? 'Inactivo' : 'Activo';
            const newStatusClass = isActive ? 'inactive' : 'active';
            const newIcon = isActive ? 'fa-ban' : 'fas fa-user-check';
            const newTitle = isActive ? 'Habilitar' : 'Inhabilitar';
            const newButtonColor = isActive ? 
                `linear-gradient(135deg, ${colors.bgTertiary}, ${colors.textSecondary})` : 
                `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
            
            // Actualizar interfaz
            statusSpan.textContent = newStatus;
            statusSpan.className = `status ${newStatusClass}`;
            button.innerHTML = `<i class="${newIcon}"></i>`;
            button.title = newTitle;
            button.style.background = newButtonColor;
            
            // Mostrar mensaje de éxito
            showSuccessAlert(
                '✅ ESTADO CAMBIADO',
                `El colaborador <strong>${fullName}</strong> ha sido <strong>${action}do</strong> exitosamente.<br><br>
                <span style="color: ${iconColor};"><i class="fas ${icon}"></i> Estado actual: <strong>${newStatus}</strong></span>`
            );
            
            console.log(`🔄 Estado cambiado: ${fullName} -> ${newStatus}`);
        }
    });
}

// 3. ALERTA PARA EDITAR USUARIO
function editUser(row) {
    const colors = getThemeColors();
    const userName = row.querySelector('.user-info div').textContent.trim();
    const userLastname = row.cells[1].textContent;
    const userEmail = row.cells[2].textContent;
    const statusSpan = row.querySelector('.status');
    const isActive = statusSpan.classList.contains('active');
    const fullName = `${userName} ${userLastname}`;
    
    Swal.fire({
        title: '✏️ EDITAR COLABORADOR',
        html: `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-block; background: ${colors.info}15; 
                     padding: 20px; border-radius: 50%; border: 3px solid ${colors.info};">
                    <i class="fas fa-user-edit" style="font-size: 2.5rem; color: ${colors.info};"></i>
                </div>
                <h3 style="color: ${colors.textPrimary}; margin: 10px 0;">${fullName}</h3>
                <p style="color: ${colors.textSecondary}; margin: 0;">ID: UID-${Date.now().toString().slice(-6)}</p>
            </div>
            
            <div style="text-align: left;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-user"></i> NOMBRE
                    </label>
                    <input type="text" id="edit-name" class="swal2-input" value="${userName}" placeholder="Nombre">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-user"></i> APELLIDO
                    </label>
                    <input type="text" id="edit-lastname" class="swal2-input" value="${userLastname}" placeholder="Apellido">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-envelope"></i> CORREO ELECTRÓNICO
                    </label>
                    <input type="email" id="edit-email" class="swal2-input" value="${userEmail}" placeholder="correo@centinela.mx">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary}; font-size: 0.9rem;">
                        <i class="fas fa-toggle-on"></i> ESTADO
                    </label>
                    <select id="edit-status" class="swal2-select" style="width: 100%;">
                        <option value="active" ${isActive ? 'selected' : ''}>🟢 Activo</option>
                        <option value="inactive" ${!isActive ? 'selected' : ''}>🔴 Inactivo</option>
                    </select>
                </div>
                
                <div style="background: ${colors.primary}15; padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid ${colors.primary};">
                    <p style="margin: 0; color: ${colors.textSecondary}; font-size: 0.8rem;">
                        <i class="fas fa-info-circle"></i> Los cambios se aplicarán inmediatamente
                    </p>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-save"></i> GUARDAR CAMBIOS',
        cancelButtonText: '<i class="fas fa-times"></i> CANCELAR',
        confirmButtonColor: colors.primary,
        cancelButtonColor: colors.bgTertiary,
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            confirmButton: 'custom-swal-confirm',
            cancelButton: 'custom-swal-cancel'
        },
        preConfirm: () => {
            const newName = document.getElementById('edit-name').value.trim();
            const newLastname = document.getElementById('edit-lastname').value.trim();
            const newEmail = document.getElementById('edit-email').value.trim();
            const newStatus = document.getElementById('edit-status').value;
            
            // Validaciones
            const errors = [];
            
            if (!newName) errors.push('El nombre es obligatorio');
            if (!newLastname) errors.push('El apellido es obligatorio');
            if (!newEmail) errors.push('El correo es obligatorio');
            
            if (newEmail && !validateEmail(newEmail)) {
                errors.push('El correo electrónico no es válido');
            }
            
            if (errors.length > 0) {
                Swal.showValidationMessage(errors.join('<br>'));
                return false;
            }
            
            return { newName, newLastname, newEmail, newStatus };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const data = result.value;
            
            // Mostrar loader
            Swal.fire({
                title: '⏳ ACTUALIZANDO DATOS',
                text: 'Guardando los cambios...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Simular actualización
            setTimeout(() => {
                // Actualizar tabla
                row.querySelector('.user-info div').textContent = data.newName;
                row.cells[1].textContent = data.newLastname;
                row.cells[2].textContent = data.newEmail;
                
                // Actualizar estado
                const statusSpan = row.querySelector('.status');
                const enableBtn = row.querySelector('.enable');
                
                if (data.newStatus === 'active') {
                    statusSpan.textContent = 'Activo';
                    statusSpan.className = 'status active';
                    if (enableBtn) {
                        enableBtn.innerHTML = '<i class="fas fa-user-check"></i>';
                        enableBtn.title = 'Inhabilitar';
                        enableBtn.style.background = `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
                    }
                } else {
                    statusSpan.textContent = 'Inactivo';
                    statusSpan.className = 'status inactive';
                    if (enableBtn) {
                        enableBtn.innerHTML = '<i class="fas fa-ban"></i>';
                        enableBtn.title = 'Habilitar';
                        enableBtn.style.background = `linear-gradient(135deg, ${colors.bgTertiary}, ${colors.textSecondary})`;
                    }
                }
                
                // Cerrar loader y mostrar éxito
                Swal.close();
                showSuccessAlert(
                    '✅ CAMBIOS GUARDADOS',
                    `Los datos de <strong>${data.newName} ${data.newLastname}</strong> han sido actualizados correctamente.<br><br>
                    <strong>Nuevo correo:</strong> ${data.newEmail}<br>
                    <strong>Nuevo estado:</strong> ${data.newStatus === 'active' ? '🟢 Activo' : '🔴 Inactivo'}`
                );
                
                console.log(`📝 Usuario editado: ${data.newName} ${data.newLastname}`);
                
            }, 1500);
        }
    });
}

// 4. ALERTA PARA VER DETALLES
function viewUserDetails(button) {
    const colors = getThemeColors();
    const org = button.getAttribute('data-org') || 'Centinela MX';
    const fullName = button.getAttribute('data-fullname') || 'Sin nombre';
    const email = button.getAttribute('data-email') || 'Sin correo';
    const status = button.getAttribute('data-status') || 'Desconocido';
    const authId = button.getAttribute('data-authid') || 'UID-000000';
    const orgPhoto = button.getAttribute('data-orgphoto') || 'https://i.imgur.com/8Km9tLL.png';
    const userPhoto = button.getAttribute('data-userphoto') || 'https://i.imgur.com/6VBx3io.png';
    const created = button.getAttribute('data-created') || 'No especificada';
    const updated = button.getAttribute('data-updated') || 'No especificada';
    const lastLogin = button.getAttribute('data-lastlogin') || 'Nunca';
    
    const statusColor = status === 'Activo' ? colors.success : colors.error;
    const statusIcon = status === 'Activo' ? 'fa-check-circle' : 'fa-ban';
    
    Swal.fire({
        title: '👁️ DETALLES DEL COLABORADOR',
        html: `
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${userPhoto}" alt="Foto del usuario" 
                     style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid ${colors.primary}; object-fit: cover; margin-bottom: 15px;">
                <h3 style="color: ${colors.textPrimary}; margin: 0 0 5px 0; font-family: var(--font-family-primary, 'Orbitron'), sans-serif;">${fullName}</h3>
                <p style="color: ${colors.textSecondary}; margin: 0; font-size: 0.9rem;">
                    <i class="fas fa-building"></i> ${org}
                </p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: ${colors.info}15; padding: 12px; border-radius: 8px; border-left: 3px solid ${colors.info};">
                    <p style="margin: 0 0 5px 0; color: ${colors.textSecondary}; font-size: 0.8rem;"><i class="fas fa-envelope"></i> CORREO</p>
                    <p style="margin: 0; color: ${colors.textPrimary}; font-weight: 500; word-break: break-all;">${email}</p>
                </div>
                
                <div style="background: ${statusColor}15; padding: 12px; border-radius: 8px; border-left: 3px solid ${statusColor};">
                    <p style="margin: 0 0 5px 0; color: ${colors.textSecondary}; font-size: 0.8rem;"><i class="fas ${statusIcon}"></i> ESTADO</p>
                    <p style="margin: 0; color: ${statusColor}; font-weight: 500;">${status}</p>
                </div>
                
                <div style="background: ${colors.primary}15; padding: 12px; border-radius: 8px; border-left: 3px solid ${colors.primary};">
                    <p style="margin: 0 0 5px 0; color: ${colors.textSecondary}; font-size: 0.8rem;"><i class="fas fa-id-card"></i> ID AUTH</p>
                    <p style="margin: 0; color: ${colors.textPrimary}; font-weight: 500; font-family: monospace;">${authId}</p>
                </div>
                
                <div style="background: ${colors.warning}15; padding: 12px; border-radius: 8px; border-left: 3px solid ${colors.warning};">
                    <p style="margin: 0 0 5px 0; color: ${colors.textSecondary}; font-size: 0.8rem;"><i class="fas fa-sign-in-alt"></i> ÚLTIMO LOGIN</p>
                    <p style="margin: 0; color: ${colors.textPrimary}; font-weight: 500;">${lastLogin}</p>
                </div>
            </div>
            
            <div style="background: ${colors.bgSecondary}50; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: ${colors.textSecondary}; font-size: 0.9rem;"><i class="fas fa-history"></i> HISTORIAL</p>
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p style="margin: 0 0 5px 0; color: ${colors.textSecondary}; font-size: 0.8rem;">CREACIÓN</p>
                        <p style="margin: 0; color: ${colors.textPrimary}; font-size: 0.9rem;">${created}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 5px 0; color: ${colors.textSecondary}; font-size: 0.8rem;">ACTUALIZACIÓN</p>
                        <p style="margin: 0; color: ${colors.textPrimary}; font-size: 0.9rem;">${updated}</p>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center;">
                <p style="margin: 0 0 10px 0; color: ${colors.textSecondary}; font-size: 0.9rem;"><i class="fas fa-image"></i> LOGO DE LA ORGANIZACIÓN</p>
                <img src="${orgPhoto}" alt="Logo organización" 
                     style="width: 100%; max-width: 200px; border-radius: 8px; border: 2px solid ${colors.borderLight};">
            </div>
        `,
        confirmButtonText: '<i class="fas fa-times"></i> CERRAR',
        confirmButtonColor: colors.bgTertiary,
        width: '600px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        showCloseButton: true,
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            confirmButton: 'custom-swal-confirm',
            cancelButton: 'custom-swal-cancel',
            closeButton: 'custom-swal-close'
        }
    });
}

// 5. ALERTA DE ÉXITO (reutilizable)
function showSuccessAlert(title, html) {
    const colors = getThemeColors();
    
    Swal.fire({
        title: title,
        html: html,
        icon: 'success',
        confirmButtonText: '<i class="fas fa-check"></i> ACEPTAR',
        confirmButtonColor: colors.success,
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true,
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            confirmButton: 'custom-swal-confirm'
        }
    });
}

// 6. ALERTA DE ERROR (reutilizable)
function showErrorAlert(title, message) {
    const colors = getThemeColors();
    
    Swal.fire({
        title: title,
        text: message,
        icon: 'error',
        confirmButtonText: '<i class="fas fa-times"></i> CERRAR',
        confirmButtonColor: colors.error,
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            confirmButton: 'custom-swal-confirm'
        }
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

function addUserToTable(userData) {
    const tbody = document.querySelector('.collaborators-table tbody');
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    const userId = generateUserId();
    const isActive = true;
    
    newRow.innerHTML = `
        <td><div class="user-info"><div class="user-avatar"><i class="fas fa-user"></i></div>${userData.name}</div></td>
        <td>${userData.lastname}</td>
        <td>${userData.email}</td>
        <td><span class="status ${isActive ? 'active' : 'inactive'}">${isActive ? 'Activo' : 'Inactivo'}</span></td>
        <td class="actions-cell">
            <button class="row-btn enable" title="Inhabilitar">
                <i class="fas fa-user-check"></i>
            </button>
            <button class="row-btn edit" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
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
    console.log(`✅ Usuario agregado a la tabla: ${userData.name} ${userData.lastname}`);
    
    // Actualizar contador
    updateTableCount();
}

function updateTableCount() {
    const activeCount = document.querySelectorAll('.status.active').length;
    const totalCount = document.querySelectorAll('tbody tr').length;
    console.log(`📊 Total colaboradores: ${totalCount}, Activos: ${activeCount}`);
}

// ========== EXPORTAR FUNCIONES PARA USO EN HTML ==========
window.showAddCollaboratorAlert = showAddCollaboratorAlert;
window.toggleUserStatus = toggleUserStatus;
window.editUser = editUser;
window.viewUserDetails = viewUserDetails;
window.showSuccessAlert = showSuccessAlert;
window.showErrorAlert = showErrorAlert;

console.log('🎯 Gestor de usuarios listo con estilos adaptativos');