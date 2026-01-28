// registro.js
// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si SweetAlert2 está cargado
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado. Añade: <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>');
        return;
    }
    
    // Aplicar estilos personalizados a SweetAlert2
    applySweetAlertStyles();
    
    // Inicializar el formulario de registro
    initRegistrationForm();
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

function initRegistrationForm() {
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
        organizationInput: document.getElementById('organization'),
        fullNameInput: document.getElementById('fullName'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        
        // Botones y mensajes
        registerBtn: document.getElementById('registerBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        mainMessage: document.getElementById('mainMessage'),
        registerForm: document.getElementById('registerForm')
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

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
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
                elements.modalMessage.textContent = '¿Deseas usar esta imagen como tu foto de perfil?';
            } else {
                elements.modalTitle.textContent = 'CAMBIAR LOGO DE ORGANIZACIÓN';
                elements.modalMessage.textContent = '¿Deseas usar esta imagen como logo de tu organización?';
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
                    
                    Swal.fire({
                        icon: 'success',
                        title: '¡Foto guardada!',
                        text: 'Tu foto de perfil se ha guardado correctamente',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    });
                } else {
                    updatePhoto(elements.orgImage, elements.orgPlaceholder, e.target.result);
                    
                    Swal.fire({
                        icon: 'success',
                        title: '¡Logo guardado!',
                        text: 'El logo de organización se ha guardado correctamente',
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
        
        Swal.fire({
            icon: 'info',
            title: 'Cambio cancelado',
            text: 'No se realizaron cambios',
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

    // ========== REGISTRO ==========
    elements.registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        let isValid = true;
        let messages = [];
        
        // Validar campos obligatorios
        if (!elements.organizationInput.value.trim()) {
            isValid = false;
            messages.push('El nombre de la organización es obligatorio');
        }
        
        if (!elements.fullNameInput.value.trim()) {
            isValid = false;
            messages.push('El nombre completo es obligatorio');
        }
        
        if (!elements.emailInput.value.trim()) {
            isValid = false;
            messages.push('El correo electrónico es obligatorio');
        } else if (!validateEmail(elements.emailInput.value)) {
            isValid = false;
            messages.push('El correo electrónico no es válido');
        }
        
        if (!elements.passwordInput.value) {
            isValid = false;
            messages.push('La contraseña es obligatoria');
        }
        
        if (!elements.confirmPasswordInput.value) {
            isValid = false;
            messages.push('Debes confirmar la contraseña');
        }
        
        // Validar contraseñas coinciden
        if (elements.passwordInput.value !== elements.confirmPasswordInput.value) {
            isValid = false;
            messages.push('Las contraseñas no coinciden');
        }
        
        // Validar seguridad de contraseña
        if (elements.passwordInput.value) {
            const passwordValidation = validatePassword(elements.passwordInput.value);
            if (!passwordValidation.isValid) {
                isValid = false;
                messages.push('La contraseña no cumple con los requisitos de seguridad');
                
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
        
        if (!isValid) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                html: messages.map(msg => `• ${msg}`).join('<br>'),
                confirmButtonColor: '#e74c3c',
                confirmButtonText: 'CORREGIR'
            });
        } else {
            // Mostrar loader
            const swalInstance = Swal.fire({
                title: 'Creando cuenta...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Simular registro
            setTimeout(async () => {
                // Guardar datos (en un caso real, aquí iría el envío al servidor)
                const userData = {
                    organization: elements.organizationInput.value,
                    fullName: elements.fullNameInput.value,
                    email: elements.emailInput.value,
                    password: elements.passwordInput.value, // En realidad esto debería estar encriptado
                    profilePic: elements.profileImage.src || null,
                    orgPic: elements.orgImage.src || null,
                    registrationDate: new Date().toISOString()
                };
                
                // Guardar en localStorage (simulación)
                localStorage.setItem('registeredUser', JSON.stringify(userData));
                localStorage.setItem('userLoggedIn', 'true');
                localStorage.setItem('userEmail', userData.email);
                localStorage.setItem('userName', userData.fullName);
                
                // Cerrar loader
                await swalInstance.close();
                
                // Mostrar éxito
                await Swal.fire({
                    icon: 'success',
                    title: '¡Cuenta creada!',
                    html: `
                        <div style="text-align: center;">
                            <p>Tu cuenta ha sido creada exitosamente</p>
                            <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 10px;">
                                Redirigiendo al sistema...
                            </p>
                        </div>
                    `,
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
                
                // Redirigir al dashboard o login
                window.location.href = '/users/admin/dashboard.html';
                
            }, 2000);
        }
    });

    // ========== CANCELAR ==========
    elements.cancelBtn.addEventListener('click', () => {
        Swal.fire({
            title: '¿Cancelar registro?',
            text: "Se perderán todos los datos ingresados",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/users/visitors/login/login.html';
            }
        });
    });

    // ========== MENSAJE INICIAL ==========
    setTimeout(() => {
        showMessage(elements.mainMessage, 'info', 
            'Completa todos los campos para crear tu cuenta. Todos los campos son obligatorios.');
    }, 1000);
}