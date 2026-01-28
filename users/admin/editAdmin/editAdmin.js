// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si SweetAlert2 está cargado
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado. Añade: <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>');
        return;
    }
    
    // Aplicar estilos personalizados a SweetAlert2
    applySweetAlertStyles();
    
    // Inicializar el editor de perfil
    initProfileEditor();
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
            font-family: 'Rajdhani', sans-serif !important;
        }
        
        .swal2-title {
            color: var(--color-text-primary) !important;
            font-family: var(--font-family-primary) !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
        }
        
        .swal2-html-container {
            color: var(--color-text-secondary) !important;
            font-size: 1rem !important;
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
        
        .swal2-input {
            background: var(--color-bg-secondary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-small) !important;
            color: var(--color-text-primary) !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
        }
        
        .swal2-input:focus {
            border-color: var(--color-accent-primary) !important;
            box-shadow: 0 0 0 1px var(--color-shadow) !important;
        }
        
        .swal2-select {
            background: var(--color-bg-secondary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-small) !important;
            color: var(--color-text-primary) !important;
            font-family: 'Rajdhani', sans-serif !important;
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
        
        /* Icon colors */
        .swal2-success [class^="swal2-success-line"] {
            background-color: var(--color-accent-primary) !important;
        }
        
        .swal2-success .swal2-success-ring {
            border-color: rgba(192, 192, 192, 0.3) !important;
        }
        
        .swal2-icon.swal2-error {
            border-color: #e74c3c !important;
        }
        
        .swal2-icon.swal2-error [class^="swal2-x-mark-line"] {
            background-color: #e74c3c !important;
        }
        
        .swal2-icon.swal2-warning {
            border-color: #f39c12 !important;
            color: #f39c12 !important;
        }
        
        .swal2-icon.swal2-info {
            border-color: #3498db !important;
            color: #3498db !important;
        }
        
        .swal2-icon.swal2-question {
            border-color: var(--color-accent-primary) !important;
            color: var(--color-accent-primary) !important;
        }
        
        /* Progress bar */
        .swal2-progress-steps .swal2-progress-step {
            background: var(--color-accent-primary) !important;
            color: var(--color-text-dark) !important;
        }
        
        .swal2-progress-steps .swal2-progress-step.swal2-active-progress-step {
            background: var(--color-accent-secondary) !important;
        }
        
        .swal2-progress-steps .swal2-progress-step-line {
            background: var(--color-border-light) !important;
        }
        
        /* Timer progress bar */
        .swal2-timer-progress-bar {
            background: var(--color-accent-primary) !important;
        }
    `;
    document.head.appendChild(style);
}

function initProfileEditor() {
    // Elementos del DOM
    const elements = {
        // Fotos
        profileCircle: document.getElementById('profileCircle'),
        profileImage: document.getElementById('profileImage'),
        profilePlaceholder: document.getElementById('profilePlaceholder'),
        editProfileOverlay: document.getElementById('editProfileOverlay'),
        profileInput: document.getElementById('profile-input'),
        
        orgCircle: document.getElementById('orgCircle'),
        orgImage: document.getElementById('orgImage'),
        orgPlaceholder: document.getElementById('orgPlaceholder'),
        editOrgOverlay: document.getElementById('editOrgOverlay'),
        orgInput: document.getElementById('org-input'),
        
        // Modal
        photoModal: document.getElementById('photoModal'),
        previewImage: document.getElementById('previewImage'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        confirmChangeBtn: document.getElementById('confirmChangeBtn'),
        cancelChangeBtn: document.getElementById('cancelChangeBtn'),
        
        // Formulario
        fullNameInput: document.getElementById('fullName'),
        currentPasswordInput: document.getElementById('currentPassword'),
        newPasswordInput: document.getElementById('newPassword'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        
        // Botones y mensajes
        saveChangesBtn: document.getElementById('saveChangesBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        mainMessage: document.getElementById('mainMessage'),
        passwordMessage: document.getElementById('passwordMessage')
    };

    let selectedFile = null;
    let currentPhotoType = '';

    // ========== FUNCIONES DE UTILIDAD ==========
    function showMessage(element, type, text) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        };
        
        element.className = `message-container ${type}`;
        element.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
                <span>${text}</span>
            </div>
        `;
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                element.style.display = 'none';
                element.style.animation = '';
            }, 300);
        }, 5000);
    }

    // ========== VALIDACIONES ==========
    function validateFile(file, maxSizeMB = 5) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = maxSizeMB * 1024 * 1024;
        
        if (!validTypes.includes(file.type)) {
            // Usar SweetAlert2 para error de formato
            Swal.fire({
                icon: 'error',
                title: 'Formato no válido',
                text: 'Solo se permiten archivos JPG, PNG o GIF',
                confirmButtonColor: '#e74c3c',
                confirmButtonText: 'ENTENDIDO'
            });
            return false;
        }
        
        if (file.size > maxSize) {
            // Usar SweetAlert2 para error de tamaño
            Swal.fire({
                icon: 'error',
                title: 'Archivo demasiado grande',
                text: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`,
                confirmButtonColor: '#e74c3c',
                confirmButtonText: 'ENTENDIDO'
            });
            return false;
        }
        
        return true;
    }

    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        let errors = [];
        
        if (password.length < minLength) errors.push(`Mínimo ${minLength} caracteres`);
        if (!hasUpperCase) errors.push('Al menos una letra mayúscula');
        if (!hasNumber) errors.push('Al menos un número');
        if (!hasSpecialChar) errors.push('Al menos un carácter especial (@, #, $, etc.)');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    function showConfirmationModal(file, type) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            elements.previewImage.src = e.target.result;
            currentPhotoType = type;
            
            if (type === 'profile') {
                elements.modalTitle.textContent = 'CAMBIAR FOTO DE PERFIL';
                elements.modalMessage.textContent = '¿Deseas usar esta imagen como tu nueva foto de perfil?';
            } else {
                elements.modalTitle.textContent = 'CAMBIAR LOGO DE ORGANIZACIÓN';
                elements.modalMessage.textContent = '¿Deseas usar esta imagen como el nuevo logo de tu organización?';
            }
            
            elements.photoModal.style.display = 'flex';
            selectedFile = file;
        };
        
        reader.readAsDataURL(file);
    }

    function updatePhoto(imageElement, placeholderElement, imageSrc) {
        imageElement.src = imageSrc;
        imageElement.style.display = 'block';
        placeholderElement.style.display = 'none';
    }

    // ========== EVENTOS DE FOTOS ==========
    elements.profileCircle.addEventListener('click', () => elements.profileInput.click());
    elements.editProfileOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.profileInput.click();
    });
    
    elements.profileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && validateFile(file, 5)) {
            showConfirmationModal(file, 'profile');
        }
        this.value = '';
    });

    elements.orgCircle.addEventListener('click', () => elements.orgInput.click());
    elements.editOrgOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.orgInput.click();
    });
    
    elements.orgInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && validateFile(file, 10)) {
            showConfirmationModal(file, 'organization');
        }
        this.value = '';
    });

    // Modal
    elements.confirmChangeBtn.addEventListener('click', () => {
        if (selectedFile) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                if (currentPhotoType === 'profile') {
                    updatePhoto(elements.profileImage, elements.profilePlaceholder, e.target.result);
                    localStorage.setItem('adminProfilePic', e.target.result);
                    
                    // Usar SweetAlert2 para éxito
                    Swal.fire({
                        icon: 'success',
                        title: '¡Foto actualizada!',
                        text: 'Tu foto de perfil se ha actualizado correctamente',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    });
                } else {
                    updatePhoto(elements.orgImage, elements.orgPlaceholder, e.target.result);
                    localStorage.setItem('adminOrgPic', e.target.result);
                    
                    // Usar SweetAlert2 para éxito
                    Swal.fire({
                        icon: 'success',
                        title: '¡Logo actualizado!',
                        text: 'El logo de organización se ha actualizado correctamente',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    });
                }
                
                elements.photoModal.style.display = 'none';
                selectedFile = null;
                currentPhotoType = '';
            };
            
            reader.readAsDataURL(selectedFile);
        }
    });

    elements.cancelChangeBtn.addEventListener('click', () => {
        elements.photoModal.style.display = 'none';
        selectedFile = null;
        currentPhotoType = '';
        
        // Usar SweetAlert2 para cancelación
        Swal.fire({
            icon: 'info',
            title: 'Cambio cancelado',
            text: 'No se realizaron cambios en la foto',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    });

    elements.photoModal.addEventListener('click', (e) => {
        if (e.target === elements.photoModal) {
            elements.photoModal.style.display = 'none';
            selectedFile = null;
            currentPhotoType = '';
        }
    });

    // ========== CONTRASEÑAS ==========
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
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

    // ========== GUARDAR CAMBIOS ==========
    elements.saveChangesBtn.addEventListener('click', async () => {
        let isValid = true;
        let messages = [];
        
        // Validar nombre
        if (!elements.fullNameInput.value.trim()) {
            isValid = false;
            messages.push('El nombre completo es obligatorio');
        }
        
        // Validar contraseñas
        const isChangingPassword = elements.currentPasswordInput.value || 
                                  elements.newPasswordInput.value || 
                                  elements.confirmPasswordInput.value;
        
        if (isChangingPassword) {
            if (!elements.currentPasswordInput.value) {
                isValid = false;
                messages.push('Debes ingresar tu contraseña actual');
            }
            
            if (!elements.newPasswordInput.value) {
                isValid = false;
                messages.push('Debes ingresar una nueva contraseña');
            }
            
            if (!elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('Debes confirmar la nueva contraseña');
            }
            
            if (elements.newPasswordInput.value && 
                elements.confirmPasswordInput.value && 
                elements.newPasswordInput.value !== elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('Las nuevas contraseñas no coinciden');
            }
            
            if (elements.newPasswordInput.value) {
                const passwordValidation = validatePassword(elements.newPasswordInput.value);
                if (!passwordValidation.isValid) {
                    isValid = false;
                    messages.push('La contraseña no cumple con los requisitos de seguridad');
                    
                    // Mostrar error específico con SweetAlert2
                    Swal.fire({
                        icon: 'error',
                        title: 'Contraseña insegura',
                        html: `La contraseña debe cumplir con:<br><br>
                               <ul style="text-align: left; padding-left: 20px;">
                                 <li>Mínimo 8 caracteres</li>
                                 <li>Al menos una letra mayúscula</li>
                                 <li>Al menos un número</li>
                                 <li>Al menos un carácter especial</li>
                               </ul>`,
                        confirmButtonColor: '#e74c3c'
                    });
                }
            }
        }
        
        if (!isValid) {
            // Mostrar errores con SweetAlert2
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                html: messages.map(msg => `• ${msg}`).join('<br>'),
                confirmButtonColor: '#e74c3c',
                confirmButtonText: 'CORREGIR'
            });
        } else {
            // Mostrar loader de SweetAlert2
            const swalInstance = Swal.fire({
                title: 'Guardando cambios...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Simular guardado
            setTimeout(async () => {
                // Guardar datos
                localStorage.setItem('adminFullName', elements.fullNameInput.value);
                
                // Cerrar loader
                await swalInstance.close();
                
                // Mostrar éxito
                await Swal.fire({
                    icon: 'success',
                    title: '¡Cambios guardados!',
                    text: 'Tus modificaciones se han guardado correctamente',
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
                
                // Limpiar contraseñas si se cambiaron
                if (isChangingPassword) {
                    elements.currentPasswordInput.value = '';
                    elements.newPasswordInput.value = '';
                    elements.confirmPasswordInput.value = '';
                    
                    // Mostrar mensaje de contraseña cambiada
                    showMessage(elements.passwordMessage, 'success', 'Contraseña cambiada exitosamente');
                }
                
                // Mostrar mensaje principal
                showMessage(elements.mainMessage, 'success', '¡Todos los cambios han sido guardados exitosamente!');
                
            }, 1500);
        }
    });

    // ========== CANCELAR CAMBIOS ==========
    elements.cancelBtn.addEventListener('click', () => {
        Swal.fire({
            title: '¿Cancelar cambios?',
            text: "Se perderán todos los cambios no guardados",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar editando'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'index.html';
            }
        });
    });

    // ========== CARGAR DATOS ==========
    function loadUserData() {
        const savedName = localStorage.getItem('adminFullName');
        const savedProfilePic = localStorage.getItem('adminProfilePic');
        const savedOrgPic = localStorage.getItem('adminOrgPic');
        
        if (savedName) elements.fullNameInput.value = savedName;
        if (savedProfilePic) updatePhoto(elements.profileImage, elements.profilePlaceholder, savedProfilePic);
        if (savedOrgPic) updatePhoto(elements.orgImage, elements.orgPlaceholder, savedOrgPic);
    }

    // ========== INICIALIZAR ==========
    loadUserData();
    
    // Mostrar mensaje de bienvenida con SweetAlert2 después de un breve retraso
    setTimeout(() => {
        showMessage(elements.mainMessage, 'info', 
            'Puedes editar tu nombre, contraseña y fotos. Recuerda guardar los cambios.');
    }, 1000);
}