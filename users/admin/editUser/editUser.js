// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM cargado, iniciando editor de colaborador...');
    
    // Verificar si SweetAlert2 está cargado
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado');
        loadSweetAlert();
        return;
    }
    
    console.log('✅ SweetAlert2 ya está cargado');
    applySweetAlertStyles();
    initCollaboratorEditor();
});

// ========== CARGAR SWEETALERT DINÁMICAMENTE ==========
function loadSweetAlert() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    script.onload = () => {
        console.log('✅ SweetAlert2 cargado dinámicamente');
        applySweetAlertStyles();
        initCollaboratorEditor();
    };
    script.onerror = () => {
        console.error('❌ Error cargando SweetAlert2');
        alert('Error: No se pudo cargar SweetAlert2. Recarga la página.');
    };
    document.head.appendChild(script);
}

// ========== APLICAR ESTILOS SWEETALERT ==========
function applySweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos personalizados para SweetAlert2 */
        .swal2-popup {
            background: var(--color-bg-tertiary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: 12px !important;
            box-shadow: var(--shadow-large) !important;
            backdrop-filter: blur(8px) !important;
            font-family: 'Rajdhani', sans-serif !important;
            color: var(--color-text-primary) !important;
        }
        
        .swal2-title {
            color: var(--color-text-primary) !important;
            font-family: var(--font-family-primary) !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            text-shadow: var(--text-shadow-effect) !important;
        }
        
        .swal2-html-container {
            color: var(--color-text-secondary) !important;
            font-size: 1rem !important;
            line-height: 1.5 !important;
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
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
            padding: 10px 15px !important;
        }
        
        .swal2-input:focus, .swal2-textarea:focus {
            border-color: var(--color-accent-primary) !important;
            box-shadow: 0 0 0 1px var(--color-shadow) !important;
            outline: none !important;
        }
        
        /* Icon colors */
        .swal2-icon.swal2-success {
            border-color: #2ecc71 !important;
            color: #2ecc71 !important;
        }
        
        .swal2-icon.swal2-error {
            border-color: #e74c3c !important;
            color: #e74c3c !important;
        }
        
        .swal2-icon.swal2-warning {
            border-color: #f39c12 !important;
            color: #f39c12 !important;
        }
        
        .swal2-icon.swal2-info {
            border-color: #3498db !important;
            color: #3498db !important;
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Estilos SweetAlert aplicados');
}

// ========== EDITOR DE COLABORADOR ==========
function initCollaboratorEditor() {
    console.log('🚀 Inicializando editor de colaborador...');
    
    // Elementos del DOM
    const elements = {
        // Botones principales
        saveChangesBtn: document.getElementById('saveChangesBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        generatePasswordBtn: document.getElementById('generatePasswordBtn'),
        
        // Fotos
        collaboratorCircle: document.getElementById('collaboratorCircle'),
        collaboratorInput: document.getElementById('collaborator-input'),
        
        // Formulario
        fullNameInput: document.getElementById('fullName'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        organizationSelect: document.getElementById('organization'),
        statusInput: document.getElementById('status'),
        
        // Botones mostrar/ocultar contraseña
        togglePasswordBtns: document.querySelectorAll('.toggle-password'),
        
        // Status options
        statusOptions: document.querySelectorAll('.role-option'),
        
        // Permisos
        permissionCheckboxes: document.querySelectorAll('input[name="permissions"]')
    };
    
    // Variables globales
    let currentFile = null;
    
    // ========== EVENT LISTENERS ==========
    
    // 1. BOTÓN GUARDAR CAMBIOS
    elements.saveChangesBtn.addEventListener('click', () => {
        console.log('💾 Botón guardar cambios clickeado');
        validateAndSaveChanges();
    });
    
    // 2. BOTÓN CANCELAR
    elements.cancelBtn.addEventListener('click', () => {
        console.log('❌ Botón cancelar clickeado');
        showCancelConfirmation();
    });
    
    // 3. BOTÓN ELIMINAR
    elements.deleteBtn.addEventListener('click', () => {
        console.log('🗑️ Botón eliminar clickeado');
        showDeleteConfirmation();
    });
    
    // 4. BOTÓN GENERAR CONTRASEÑA
    elements.generatePasswordBtn.addEventListener('click', () => {
        console.log('🔑 Botón generar contraseña clickeado');
        generateSecurePassword();
    });
    
    // 5. FOTO DEL COLABORADOR
    elements.collaboratorCircle.addEventListener('click', () => {
        elements.collaboratorInput.click();
    });
    
    elements.collaboratorInput.addEventListener('change', (e) => {
        handleFileSelect(e);
    });
    
    // 6. MOSTRAR/OCULTAR CONTRASEÑA
    elements.togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
    
    // 7. SELECCIÓN DE STATUS
    elements.statusOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remover clase selected de todas las opciones
            elements.statusOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Agregar clase selected a la opción clickeada
            this.classList.add('selected');
            
            // Actualizar el valor del campo oculto
            const statusValue = this.getAttribute('data-status');
            elements.statusInput.value = statusValue;
            
            console.log(`🔄 Status cambiado a: ${statusValue}`);
        });
    });
    
    console.log('✅ Event listeners asignados correctamente');
}

// ========== ALERTAS DE SWEETALERT ==========

// 1. VALIDAR Y GUARDAR CAMBIOS
function validateAndSaveChanges() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const organization = document.getElementById('organization').value;
    const status = document.getElementById('status').value;
    
    const errors = [];
    
    // Validar nombre
    if (!fullName) {
        errors.push('El nombre completo es obligatorio');
    }
    
    // Validar email
    if (!email) {
        errors.push('El correo electrónico es obligatorio');
    } else if (!validateEmail(email)) {
        errors.push('El correo electrónico no es válido');
    }
    
    // Validar organización
    if (!organization) {
        errors.push('Debe seleccionar una organización');
    }
    
    // Validar contraseñas si se proporcionan
    if (password || confirmPassword) {
        if (!password) {
            errors.push('Debe ingresar una contraseña');
        }
        
        if (!confirmPassword) {
            errors.push('Debe confirmar la contraseña');
        }
        
        if (password && confirmPassword && password !== confirmPassword) {
            errors.push('Las contraseñas no coinciden');
        }
        
        if (password && password.length < 8) {
            errors.push('La contraseña debe tener al menos 8 caracteres');
        }
        
        if (password) {
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                errors.push('La contraseña no cumple con los requisitos de seguridad');
            }
        }
    }
    
    // Si hay errores, mostrar alerta
    if (errors.length > 0) {
        showErrorAlert(
            '⚠️ ERROR DE VALIDACIÓN',
            `<div style="text-align: left;">
                <p>Por favor corrige los siguientes errores:</p>
                <ul style="margin: 10px 0 0 20px;">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>`
        );
        return;
    }
    
    // Mostrar confirmación antes de guardar
    showSaveConfirmation(fullName, email, password, status);
}

// 2. ALERTA DE CONFIRMACIÓN PARA GUARDAR
function showSaveConfirmation(fullName, email, password, status) {
    // Obtener permisos seleccionados
    const selectedPermissions = Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
        .map(checkbox => {
            const labels = {
                'dashboard': 'Ver Dashboard',
                'reports': 'Generar Reportes',
                'users': 'Gestionar Usuarios',
                'settings': 'Configuración',
                'analytics': 'Analíticas',
                'notifications': 'Enviar Notificaciones',
                'export': 'Exportar Datos',
                'admin': 'Acceso Admin'
            };
            return labels[checkbox.value] || checkbox.value;
        });
    
    // Obtener organización seleccionada
    const organizationSelect = document.getElementById('organization');
    const selectedOrg = organizationSelect.options[organizationSelect.selectedIndex].text;
    
    // Mapear status a texto
    const statusText = {
        'active': '🟢 Activo',
        'inactive': '🔴 Inactivo',
        'pending': '🟡 Pendiente'
    }[status] || status;
    
    const htmlContent = `
        <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; background: rgba(46, 204, 113, 0.1); 
                 padding: 20px; border-radius: 50%; border: 3px solid #2ecc71; margin-bottom: 15px;">
                <i class="fas fa-save" style="font-size: 2.5rem; color: #2ecc71;"></i>
            </div>
            <h3 style="color: white; margin: 10px 0;">¿Actualizar colaborador?</h3>
            <p style="color: #b0b0d0; margin: 0;">Se actualizarán los siguientes datos:</p>
        </div>
        
        <div style="background: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #3498db; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-user"></i> NOMBRE COMPLETO</p>
            <p style="margin: 0; color: white; font-weight: 500;">${fullName}</p>
        </div>
        
        <div style="background: rgba(155, 89, 182, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #9b59b6; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-envelope"></i> CORREO</p>
            <p style="margin: 0; color: white; font-weight: 500;">${email}</p>
        </div>
        
        <div style="background: rgba(241, 196, 15, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #f1c40f; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-building"></i> ORGANIZACIÓN</p>
            <p style="margin: 0; color: white; font-weight: 500;">${selectedOrg}</p>
        </div>
        
        <div style="background: rgba(46, 204, 113, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #2ecc71; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-toggle-on"></i> ESTATUS</p>
            <p style="margin: 0; color: white; font-weight: 500;">${statusText}</p>
        </div>
        
        ${password ? `
        <div style="background: rgba(155, 89, 182, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #9b59b6; margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-key"></i> CONTRASEÑA</p>
            <p style="margin: 0; color: white; font-weight: 500;">Se actualizará la contraseña</p>
        </div>
        ` : ''}
        
        <div style="background: rgba(44, 62, 80, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #2c3e50; margin-bottom: 15px;">
            <p style="margin: 0 0 5px 0; color: #b0b0d0; font-size: 0.9rem;"><i class="fas fa-shield-alt"></i> PERMISOS (${selectedPermissions.length})</p>
            <p style="margin: 0; color: white; font-weight: 500; font-size: 0.9rem;">
                ${selectedPermissions.length > 0 ? selectedPermissions.join(', ') : 'Sin permisos asignados'}
            </p>
        </div>
        
        <div style="background: rgba(241, 196, 15, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #f1c40f;">
            <p style="margin: 0; color: #f1c40f; font-size: 0.8rem;">
                <i class="fas fa-info-circle"></i> Esta acción actualizará la información del colaborador en el sistema
            </p>
        </div>
    `;
    
    Swal.fire({
        title: '💾 ACTUALIZAR COLABORADOR',
        html: htmlContent,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-save"></i> SÍ, ACTUALIZAR',
        cancelButtonText: '<i class="fas fa-times"></i> CANCELAR',
        confirmButtonColor: '#2ecc71',
        cancelButtonColor: '#e74c3c',
        reverseButtons: true,
        width: '550px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            saveCollaboratorChanges();
        }
    });
}

// 3. GUARDAR CAMBIOS CON LOADER
function saveCollaboratorChanges() {
    // Mostrar loader
    Swal.fire({
        title: '⏳ ACTUALIZANDO COLABORADOR',
        text: 'Por favor espera un momento...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Simular guardado (2 segundos)
    setTimeout(() => {
        // Obtener datos del formulario
        const formData = {
            organization: document.getElementById('organization').value,
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            status: document.getElementById('status').value,
            password: document.getElementById('password').value || null,
            permissions: Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                            .map(checkbox => checkbox.value)
        };
        
        // Limpiar contraseñas si se cambiaron
        if (formData.password) {
            document.getElementById('password').value = '';
            document.getElementById('confirmPassword').value = '';
        }
        
        // Cerrar loader y mostrar éxito
        Swal.close();
        
        showSuccessAlert(
            '✅ COLABORADOR ACTUALIZADO',
            `<div style="text-align: center; margin: 15px 0;">
                <div style="display: inline-block; background: rgba(46, 204, 113, 0.2); 
                     padding: 15px; border-radius: 50%; border: 2px solid #2ecc71;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; color: #2ecc71;"></i>
                </div>
                <p style="color: white; margin: 10px 0 0 0; font-weight: 500;">${formData.fullName}</p>
                <p style="color: #b0b0d0; margin: 5px 0;">ha sido actualizado exitosamente</p>
            </div>
            <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #3498db;">
                <p style="margin: 0; color: #3498db; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> Los cambios han sido aplicados al sistema
                </p>
            </div>`
        );
        
        console.log('💾 Colaborador actualizado:', formData);
        
        // Opcional: Redirigir después de 3 segundos
        setTimeout(() => {
            // window.location.href = 'gestionColaboradores.html';
        }, 3000);
        
    }, 2000);
}

// 4. ALERTA DE CONFIRMACIÓN PARA CANCELAR
function showCancelConfirmation() {
    Swal.fire({
        title: '⚠️ ¿CANCELAR CAMBIOS?',
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: rgba(231, 76, 60, 0.1); 
                     padding: 20px; border-radius: 50%; border: 3px solid #e74c3c; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: #e74c3c;"></i>
                </div>
                <p style="color: white; font-size: 1.1rem; margin: 0 0 10px 0;">
                    ¿Estás seguro de cancelar los cambios?
                </p>
                <p style="color: #b0b0d0; margin: 0;">
                    Se perderán todos los cambios no guardados
                </p>
            </div>
            <div style="background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #e74c3c;">
                <p style="margin: 0; color: #e74c3c; font-size: 0.9rem;">
                    <i class="fas fa-exclamation-circle"></i> Esta acción no se puede deshacer
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-times"></i> SÍ, CANCELAR',
        cancelButtonText: '<i class="fas fa-arrow-left"></i> NO, CONTINUAR',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#3498db',
        reverseButtons: true,
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'gestionColaboradores.html';
        }
    });
}

// 5. ALERTA DE CONFIRMACIÓN PARA ELIMINAR
function showDeleteConfirmation() {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    
    Swal.fire({
        title: '🗑️ ¿ELIMINAR COLABORADOR?',
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: rgba(231, 76, 60, 0.1); 
                     padding: 20px; border-radius: 50%; border: 3px solid #e74c3c; margin-bottom: 15px;">
                    <i class="fas fa-trash-alt" style="font-size: 2.5rem; color: #e74c3c;"></i>
                </div>
                <h3 style="color: white; margin: 10px 0;">${fullName}</h3>
                <p style="color: #b0b0d0; margin: 0;">${email}</p>
            </div>
            
            <p style="text-align: center; font-size: 1.1rem;">
                ¿Estás seguro de <strong style="color: #e74c3c;">eliminar permanentemente</strong> a este colaborador?
            </p>
            
            <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #e74c3c; margin-top: 15px;">
                <p style="margin: 0 0 5px 0; color: #e74c3c; font-size: 0.9rem;"><i class="fas fa-exclamation-triangle"></i> CONSECUENCIAS</p>
                <ul style="margin: 0; color: #b0b0d0; font-size: 0.9rem; padding-left: 20px;">
                    <li>Se perderán todos los datos del colaborador</li>
                    <li>Se eliminará el acceso al sistema</li>
                    <li>No se podrá recuperar la información</li>
                    <li>Esta acción es permanente</li>
                </ul>
            </div>
            
            <div style="background: rgba(241, 196, 15, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #f1c40f;">
                <p style="margin: 0; color: #f1c40f; font-size: 0.8rem;">
                    <i class="fas fa-lightbulb"></i> <strong>Recomendación:</strong> Considera desactivar al colaborador en lugar de eliminarlo
                </p>
            </div>
        `,
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-trash"></i> SÍ, ELIMINAR',
        cancelButtonText: '<i class="fas fa-ban"></i> DESACTIVAR',
        showDenyButton: true,
        denyButtonText: '<i class="fas fa-times"></i> CANCELAR',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6',
        denyButtonColor: '#3498db',
        reverseButtons: true,
        width: '600px',
        backdrop: 'rgba(0, 0, 0, 0.9)'
    }).then((result) => {
        if (result.isConfirmed) {
            // Eliminar colaborador
            deleteCollaborator();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Desactivar colaborador
            deactivateCollaborator();
        }
    });
}

// 6. ELIMINAR COLABORADOR
function deleteCollaborator() {
    const fullName = document.getElementById('fullName').value;
    
    // Mostrar loader
    Swal.fire({
        title: '⏳ ELIMINANDO COLABORADOR',
        text: 'Por favor espera...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Simular eliminación (2 segundos)
    setTimeout(() => {
        Swal.close();
        
        showSuccessAlert(
            '✅ COLABORADOR ELIMINADO',
            `<div style="text-align: center; margin: 15px 0;">
                <div style="display: inline-block; background: rgba(231, 76, 60, 0.2); 
                     padding: 15px; border-radius: 50%; border: 2px solid #e74c3c;">
                    <i class="fas fa-trash-alt" style="font-size: 2rem; color: #e74c3c;"></i>
                </div>
                <p style="color: white; margin: 10px 0 0 0; font-weight: 500;">${fullName}</p>
                <p style="color: #b0b0d0; margin: 5px 0;">ha sido eliminado del sistema</p>
            </div>
            <div style="background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #e74c3c;">
                <p style="margin: 0; color: #e74c3c; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> Redirigiendo a la gestión de colaboradores...
                </p>
            </div>`
        );
        
        console.log(`🗑️ Colaborador eliminado: ${fullName}`);
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
            window.location.href = 'gestionColaboradores.html';
        }, 3000);
        
    }, 2000);
}

// 7. DESACTIVAR COLABORADOR
function deactivateCollaborator() {
    const fullName = document.getElementById('fullName').value;
    
    // Cambiar status a inactivo
    document.getElementById('status').value = 'inactive';
    const statusOptions = document.querySelectorAll('.role-option');
    statusOptions.forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.role-option[data-status="inactive"]').classList.add('selected');
    
    // Mostrar loader
    Swal.fire({
        title: '⏳ DESACTIVANDO COLABORADOR',
        text: 'Actualizando estatus...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Simular desactivación (1.5 segundos)
    setTimeout(() => {
        Swal.close();
        
        showSuccessAlert(
            '✅ COLABORADOR DESACTIVADO',
            `<div style="text-align: center; margin: 15px 0;">
                <div style="display: inline-block; background: rgba(149, 165, 166, 0.2); 
                     padding: 15px; border-radius: 50%; border: 2px solid #95a5a6;">
                    <i class="fas fa-ban" style="font-size: 2rem; color: #95a5a6;"></i>
                </div>
                <p style="color: white; margin: 10px 0 0 0; font-weight: 500;">${fullName}</p>
                <p style="color: #b0b0d0; margin: 5px 0;">ha sido desactivado del sistema</p>
            </div>
            <div style="background: rgba(149, 165, 166, 0.1); padding: 10px; border-radius: 6px; margin-top: 15px; border-left: 3px solid #95a5a6;">
                <p style="margin: 0; color: #95a5a6; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> El colaborador ya no podrá acceder al sistema
                </p>
            </div>`
        );
        
        console.log(`🔴 Colaborador desactivado: ${fullName}`);
        
    }, 1500);
}

// 8. MANEJO DE ARCHIVOS DE IMAGEN
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const maxSize = 5; // MB
    const validTypes = ['image/jpeg', 'image/png'];
    
    // Validar tipo de archivo
    if (!validTypes.includes(file.type)) {
        showErrorAlert(
            '❌ FORMATO NO VÁLIDO',
            `El formato del archivo no es compatible.<br><br>
            <strong>Formatos permitidos:</strong><br>
            • JPG / JPEG<br>
            • PNG<br><br>
            <span style="color: #f39c12;">
                <i class="fas fa-exclamation-triangle"></i> Por favor selecciona una imagen válida.
            </span>`
        );
        event.target.value = '';
        return;
    }
    
    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
        showErrorAlert(
            '❌ ARCHIVO DEMASIADO GRANDE',
            `El archivo excede el tamaño máximo permitido.<br><br>
            <strong>Tamaño del archivo:</strong> ${(file.size / (1024 * 1024)).toFixed(2)} MB<br>
            <strong>Límite permitido:</strong> ${maxSize} MB<br><br>
            <span style="color: #f39c12;">
                <i class="fas fa-exclamation-triangle"></i> Por favor selecciona una imagen más pequeña.
            </span>`
        );
        event.target.value = '';
        return;
    }
    
    // Mostrar preview
    showImagePreview(file);
}

// 9. PREVIEW DE IMAGEN
function showImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        
        Swal.fire({
            title: '📷 FOTO DEL COLABORADOR',
            html: `
                <div style="text-align: center; margin: 20px 0;">
                    <img src="${imageUrl}" alt="Preview" 
                         style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; border: 4px solid #667eea; margin-bottom: 15px;">
                    <p style="color: white; font-size: 1.1rem; margin: 0 0 10px 0;">
                        Vista previa
                    </p>
                    <p style="color: #b0b0d0; margin: 0;">
                        ¿Deseas usar esta imagen como foto del colaborador?
                    </p>
                </div>
                <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #3498db;">
                    <p style="margin: 0; color: #3498db; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Tamaño: ${(file.size / (1024 * 1024)).toFixed(2)} MB • Formato: ${file.type.split('/')[1].toUpperCase()}
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check"></i> SÍ, USAR ESTA IMAGEN',
            cancelButtonText: '<i class="fas fa-times"></i> CANCELAR',
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#e74c3c',
            width: '500px',
            backdrop: 'rgba(0, 0, 0, 0.8)'
        }).then((result) => {
            if (result.isConfirmed) {
                saveCollaboratorImage(imageUrl);
            } else {
                document.getElementById('collaborator-input').value = '';
            }
        });
    };
    
    reader.readAsDataURL(file);
}

// 10. GUARDAR IMAGEN DEL COLABORADOR
function saveCollaboratorImage(imageUrl) {
    const collaboratorImage = document.getElementById('collaboratorImage');
    const collaboratorPlaceholder = document.getElementById('collaboratorPlaceholder');
    
    // Mostrar loader
    Swal.fire({
        title: '⏳ GUARDANDO IMAGEN',
        text: 'Por favor espera...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Simular guardado
    setTimeout(() => {
        // Actualizar imagen
        collaboratorImage.src = imageUrl;
        collaboratorImage.style.display = 'block';
        collaboratorPlaceholder.style.display = 'none';
        
        // Cerrar loader y mostrar éxito
        Swal.close();
        showSuccessAlert(
            '✅ IMAGEN ACTUALIZADA',
            `La foto del colaborador se ha actualizado exitosamente.<br><br>
            <div style="text-align: center; margin: 15px 0;">
                <div style="display: inline-block; background: rgba(46, 204, 113, 0.2); 
                     padding: 15px; border-radius: 50%; border: 2px solid #2ecc71;">
                    <i class="fas fa-camera" style="font-size: 2rem; color: #2ecc71;"></i>
                </div>
            </div>`
        );
        
        console.log('📸 Imagen del colaborador actualizada');
        
    }, 1500);
}

// 11. GENERAR CONTRASEÑA SEGURA
function generateSecurePassword() {
    // Caracteres disponibles
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    // Asegurar al menos un carácter de cada tipo
    let password = '';
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    // Completar con caracteres aleatorios
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 4; i < 12; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Mezclar la contraseña
    password = password.split('').sort(() => 0.5 - Math.random()).join('');
    
    // Asignar la contraseña generada
    document.getElementById('password').value = password;
    document.getElementById('confirmPassword').value = password;
    
    // Mostrar alerta con la contraseña
    Swal.fire({
        title: '🔑 CONTRASEÑA GENERADA',
        html: `
            <div style="text-align: center; margin: 20px 0;">
                <div style="display: inline-block; background: rgba(155, 89, 182, 0.1); 
                     padding: 20px; border-radius: 8px; border: 2px solid #9b59b6; margin-bottom: 15px;">
                    <code style="font-family: 'Courier New', monospace; font-size: 1.2rem; color: white; letter-spacing: 2px;">
                        ${password}
                    </code>
                </div>
                <p style="color: #b0b0d0; margin: 10px 0 0 0; font-size: 0.9rem;">
                    <i class="fas fa-copy"></i> La contraseña ha sido copiada automáticamente
                </p>
            </div>
            <div style="background: rgba(241, 196, 15, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #f1c40f;">
                <p style="margin: 0; color: #f1c40f; font-size: 0.8rem;">
                    <i class="fas fa-exclamation-triangle"></i> Guarda esta contraseña en un lugar seguro
                </p>
            </div>
        `,
        icon: 'success',
        confirmButtonText: '<i class="fas fa-check"></i> ENTENDIDO',
        confirmButtonColor: '#9b59b6',
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        showCloseButton: true
    });
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(password).then(() => {
        console.log('📋 Contraseña copiada al portapapeles');
    });
}

// ========== FUNCIONES UTILITARIAS ==========

// 12. VALIDAR CONTRASEÑA
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let errors = [];
    
    if (password.length < minLength) errors.push(`Mínimo ${minLength} caracteres`);
    if (!hasUpperCase) errors.push('Al menos una letra mayúscula');
    if (!hasLowerCase) errors.push('Al menos una letra minúscula');
    if (!hasNumber) errors.push('Al menos un número');
    if (!hasSpecialChar) errors.push('Al menos un carácter especial');
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 13. VALIDAR EMAIL
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ========== ALERTAS REUTILIZABLES ==========

// 14. ALERTA DE ÉXITO
function showSuccessAlert(title, html) {
    Swal.fire({
        title: title,
        html: html,
        icon: 'success',
        confirmButtonText: '<i class="fas fa-check"></i> ACEPTAR',
        confirmButtonColor: '#2ecc71',
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true
    });
}

// 15. ALERTA DE ERROR
function showErrorAlert(title, message) {
    Swal.fire({
        title: title,
        html: message,
        icon: 'error',
        confirmButtonText: '<i class="fas fa-times"></i> CERRAR',
        confirmButtonColor: '#e74c3c',
        width: '500px',
        backdrop: 'rgba(0, 0, 0, 0.8)'
    });
}

// ========== EXPORTAR FUNCIONES ==========
window.validateAndSaveChanges = validateAndSaveChanges;
window.showCancelConfirmation = showCancelConfirmation;
window.showDeleteConfirmation = showDeleteConfirmation;
window.generateSecurePassword = generateSecurePassword;
window.showSuccessAlert = showSuccessAlert;
window.showErrorAlert = showErrorAlert;

console.log('🎯 Editor de colaborador listo. Funciones disponibles:');
console.log('- validateAndSaveChanges()');
console.log('- showCancelConfirmation()');
console.log('- showDeleteConfirmation()');
console.log('- generateSecurePassword()');
console.log('- showSuccessAlert(title, html)');
console.log('- showErrorAlert(title, message)');