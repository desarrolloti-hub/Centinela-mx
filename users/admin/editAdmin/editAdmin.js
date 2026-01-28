// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    initProfileEditor();
});

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

    function showAlert(message, type = 'info') {
        const colors = {
            'success': '#2ecc71',
            'error': '#e74c3c',
            'info': '#3498db'
        };
        
        // Remover alertas anteriores
        const existingAlerts = document.querySelectorAll('.floating-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'floating-alert';
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            position: fixed;
            top: 25px;
            right: 25px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.4);
            animation: slideInRight 0.4s ease;
            max-width: 350px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => alertDiv.remove(), 400);
        }, 4000);
    }

    // Agregar estilos para animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    function validateFile(file, maxSizeMB = 5) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = maxSizeMB * 1024 * 1024;
        
        if (!validTypes.includes(file.type)) {
            showAlert('FORMATO NO VÁLIDO. USA JPG, PNG O GIF.', 'error');
            return false;
        }
        
        if (file.size > maxSize) {
            showAlert(`IMAGEN DEMASIADO GRANDE. MÁXIMO ${maxSizeMB}MB.`, 'error');
            return false;
        }
        
        return true;
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
                    showAlert('FOTO DE PERFIL ACTUALIZADA', 'success');
                } else {
                    updatePhoto(elements.orgImage, elements.orgPlaceholder, e.target.result);
                    localStorage.setItem('adminOrgPic', e.target.result);
                    showAlert('LOGO DE ORGANIZACIÓN ACTUALIZADO', 'success');
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
        showAlert('CAMBIO DE FOTO CANCELADO', 'info');
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

    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        let errors = [];
        
        if (password.length < minLength) errors.push(`MÍNIMO ${minLength} CARACTERES`);
        if (!hasUpperCase) errors.push('AL MENOS UNA LETRA MAYÚSCULA');
        if (!hasNumber) errors.push('AL MENOS UN NÚMERO');
        if (!hasSpecialChar) errors.push('AL MENOS UN CARÁCTER ESPECIAL');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ========== GUARDAR CAMBIOS ==========
    elements.saveChangesBtn.addEventListener('click', () => {
        let isValid = true;
        let messages = [];
        
        // Validar nombre
        if (!elements.fullNameInput.value.trim()) {
            isValid = false;
            messages.push('EL NOMBRE COMPLETO ES OBLIGATORIO');
        }
        
        // Validar contraseñas
        const isChangingPassword = elements.currentPasswordInput.value || 
                                  elements.newPasswordInput.value || 
                                  elements.confirmPasswordInput.value;
        
        if (isChangingPassword) {
            if (!elements.currentPasswordInput.value) {
                isValid = false;
                messages.push('DEBES INGRESAR TU CONTRASEÑA ACTUAL');
            }
            
            if (!elements.newPasswordInput.value) {
                isValid = false;
                messages.push('DEBES INGRESAR UNA NUEVA CONTRASEÑA');
            }
            
            if (!elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('DEBES CONFIRMAR LA NUEVA CONTRASEÑA');
            }
            
            if (elements.newPasswordInput.value && 
                elements.confirmPasswordInput.value && 
                elements.newPasswordInput.value !== elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('LAS CONTRASEÑAS NO COINCIDEN');
            }
            
            if (elements.newPasswordInput.value) {
                const passwordValidation = validatePassword(elements.newPasswordInput.value);
                if (!passwordValidation.isValid) {
                    isValid = false;
                    messages.push('CONTRASEÑA INSEGURA');
                    showMessage(elements.passwordMessage, 'error', 
                        `ERRORES: ${passwordValidation.errors.join(', ')}`);
                }
            }
        }
        
        if (!isValid) {
            showMessage(elements.mainMessage, 'error', messages.join('<br>'));
        } else {
            showMessage(elements.mainMessage, 'info', 'GUARDANDO CAMBIOS...');
            
            setTimeout(() => {
                // Guardar datos
                localStorage.setItem('adminFullName', elements.fullNameInput.value);
                
                // Limpiar contraseñas
                if (isChangingPassword) {
                    elements.currentPasswordInput.value = '';
                    elements.newPasswordInput.value = '';
                    elements.confirmPasswordInput.value = '';
                    showMessage(elements.passwordMessage, 'success', 'CONTRASEÑA CAMBIADA');
                }
                
                showMessage(elements.mainMessage, 'success', '¡CAMBIOS GUARDADOS!');
                showAlert('PERFIL ACTUALIZADO', 'success');
            }, 1500);
        }
    });

    // ========== OTRAS FUNCIONALIDADES ==========
    elements.cancelBtn.addEventListener('click', () => {
        if (confirm('¿CANCELAR CAMBIOS?')) {
            window.location.href = 'index.html';
        }
    });

    // Cargar datos guardados
    function loadUserData() {
        const savedName = localStorage.getItem('adminFullName');
        const savedProfilePic = localStorage.getItem('adminProfilePic');
        const savedOrgPic = localStorage.getItem('adminOrgPic');
        
        if (savedName) elements.fullNameInput.value = savedName;
        if (savedProfilePic) updatePhoto(elements.profileImage, elements.profilePlaceholder, savedProfilePic);
        if (savedOrgPic) updatePhoto(elements.orgImage, elements.orgPlaceholder, savedOrgPic);
    }

    // Inicializar
    loadUserData();
    showMessage(elements.mainMessage, 'info', 
        'EDITA TU NOMBRE, CONTRASEÑA Y FOTOS. RECUERDA GUARDAR LOS CAMBIOS.');
}