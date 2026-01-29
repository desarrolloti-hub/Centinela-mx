import { UserService, Administrador } from '/clases/user.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si SweetAlert2 está cargado
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    // Inicializar el formulario de registro
    initRegistrationForm();
});

// Aplicar estilos personalizados para SweetAlert2
function applySweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos personalizados para SweetAlert2 */
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
            font-family: 'Orbitron', sans-serif !important;
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
            color: white !important;
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
    `;
    document.head.appendChild(style);
}

function initRegistrationForm() {
    console.log('Iniciando formulario de registro...');
    
    // Elementos del DOM - SOLO LOS QUE EXISTEN EN TU HTML
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
        
        // Formulario - SOLO LOS QUE EXISTEN
        organizationInput: document.getElementById('organization'),
        fullNameInput: document.getElementById('fullName'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        
        // Botones y mensajes - SOLO LOS QUE EXISTEN
        registerBtn: document.getElementById('registerBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        mainMessage: document.getElementById('mainMessage'),
        registerForm: document.getElementById('registerForm')
    };

    // Verificar que todos los elementos necesarios existan
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Elemento no encontrado: ${key}`);
        }
    }

    // Instancia del UserService
    const userService = new UserService();
    console.log('UserService creado:', userService);
    
    // Variables para imágenes
    let selectedFile = null;
    let currentPhotoType = '';
    let profileImageBase64 = null;
    let orgImageBase64 = null;

    // ========== FUNCIONES DE UTILIDAD ==========
    function showMessage(element, type, text) {
        if (!element) return;
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        const colors = {
            'success': '#4CAF50',
            'error': '#F44336',
            'warning': '#FF9800',
            'info': '#2196F3'
        };
        
        element.innerHTML = `
            <div class="message-${type}" style="
                background: ${colors[type]}15;
                border-left: 4px solid ${colors[type]};
                padding: 12px 16px;
                border-radius: 4px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease;
            ">
                <i class="fas ${icons[type]}" style="color: ${colors[type]};"></i>
                <span style="color: var(--color-text-primary);">${text}</span>
            </div>
        `;
        element.style.display = 'block';
    }

    // ========== FUNCIONES DE VALIDACIÓN ==========
    function validateFile(file, maxSizeMB = 5) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = maxSizeMB * 1024 * 1024;
        
        if (!validTypes.includes(file.type)) {
            Swal.fire({
                icon: 'error',
                title: 'Formato no válido',
                text: 'Solo se permiten archivos JPG, PNG, GIF o WebP',
                confirmButtonText: 'ENTENDIDO'
            });
            return false;
        }
        
        if (file.size > maxSize) {
            Swal.fire({
                icon: 'error',
                title: 'Archivo demasiado grande',
                text: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`,
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
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return password.length >= minLength && 
               hasUpperCase && 
               hasLowerCase && 
               hasNumber && 
               hasSpecialChar;
    }

    function convertToCamelCase(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    // ========== MANEJO DE IMÁGENES ==========
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

    function updatePhoto(imageElement, placeholderElement, imageSrc, isProfile = true) {
        if (imageSrc) {
            imageElement.src = imageSrc;
            imageElement.style.display = 'block';
            placeholderElement.style.display = 'none';
            
            if (isProfile) {
                profileImageBase64 = imageSrc;
                console.log('Foto de perfil guardada (base64 length):', imageSrc.length);
            } else {
                orgImageBase64 = imageSrc;
                console.log('Logo de organización guardado (base64 length):', imageSrc.length);
            }
        } else {
            imageElement.style.display = 'none';
            placeholderElement.style.display = 'flex';
            
            if (isProfile) {
                profileImageBase64 = null;
            } else {
                orgImageBase64 = null;
            }
        }
    }

    // ========== EVENTOS DE IMÁGENES ==========
    if (elements.profileCircle) {
        elements.profileCircle.addEventListener('click', () => elements.profileInput.click());
    }
    
    if (elements.editProfileOverlay) {
        elements.editProfileOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.profileInput.click();
        });
    }
    
    if (elements.profileInput) {
        elements.profileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file && validateFile(file, 5)) {
                showConfirmationModal(file, 'profile');
            }
            this.value = '';
        });
    }

    if (elements.orgCircle) {
        elements.orgCircle.addEventListener('click', () => elements.orgInput.click());
    }
    
    if (elements.editOrgOverlay) {
        elements.editOrgOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.orgInput.click();
        });
    }
    
    if (elements.orgInput) {
        elements.orgInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file && validateFile(file, 10)) {
                showConfirmationModal(file, 'organization');
            }
            this.value = '';
        });
    }

    // Eventos del modal
    if (elements.confirmChangeBtn) {
        elements.confirmChangeBtn.addEventListener('click', () => {
            if (selectedFile) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    if (currentPhotoType === 'profile') {
                        updatePhoto(elements.profileImage, elements.profilePlaceholder, e.target.result, true);
                        
                        Swal.fire({
                            icon: 'success',
                            title: '¡Foto guardada!',
                            text: 'Tu foto de perfil se ha guardado correctamente',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    } else {
                        updatePhoto(elements.orgImage, elements.orgPlaceholder, e.target.result, false);
                        
                        Swal.fire({
                            icon: 'success',
                            title: '¡Logo guardado!',
                            text: 'El logo de organización se ha guardado correctamente',
                            timer: 2000,
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
    }

    if (elements.cancelChangeBtn) {
        elements.cancelChangeBtn.addEventListener('click', () => {
            elements.photoModal.style.display = 'none';
            selectedFile = null;
            currentPhotoType = '';
        });
    }

    if (elements.photoModal) {
        elements.photoModal.addEventListener('click', (e) => {
            if (e.target === elements.photoModal) {
                elements.photoModal.style.display = 'none';
                selectedFile = null;
                currentPhotoType = '';
            }
        });
    }

    // ========== MOSTRAR/OCULTAR CONTRASEÑA ==========
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
        });
    });

    // ========== REGISTRO CON USER SERVICE ==========
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('Formulario enviado');
            
            // Validaciones básicas
            let isValid = true;
            let messages = [];
            
            if (!elements.organizationInput || !elements.organizationInput.value.trim()) {
                isValid = false;
                messages.push('El nombre de la organización es obligatorio');
            }
            
            if (!elements.fullNameInput || !elements.fullNameInput.value.trim()) {
                isValid = false;
                messages.push('El nombre completo es obligatorio');
            }
            
            if (!elements.emailInput || !elements.emailInput.value.trim()) {
                isValid = false;
                messages.push('El correo electrónico es obligatorio');
            } else if (!validateEmail(elements.emailInput.value)) {
                isValid = false;
                messages.push('El correo electrónico no es válido');
            }
            
            if (!elements.passwordInput || !elements.passwordInput.value) {
                isValid = false;
                messages.push('La contraseña es obligatoria');
            }
            
            if (!elements.confirmPasswordInput || !elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('Debes confirmar la contraseña');
            }
            
            // Validar contraseñas coinciden
            if (elements.passwordInput && elements.confirmPasswordInput && 
                elements.passwordInput.value !== elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('Las contraseñas no coinciden');
            }
            
            // Validar seguridad de contraseña
            if (elements.passwordInput && elements.passwordInput.value) {
                if (!validatePassword(elements.passwordInput.value)) {
                    isValid = false;
                    messages.push('La contraseña no cumple con los requisitos de seguridad');
                }
            }
            
            if (!isValid) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de validación',
                    html: messages.map(msg => `• ${msg}`).join('<br>'),
                    confirmButtonText: 'CORREGIR'
                });
                return;
            }
            
            // Mostrar confirmación
            const confirmResult = await Swal.fire({
                title: '¿Crear cuenta de administrador?',
                html: 'Esta será la primera y única cuenta de administrador.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'SÍ, CREAR ADMINISTRADOR',
                cancelButtonText: 'CANCELAR'
            });
            
            if (!confirmResult.isConfirmed) {
                return;
            }
            
            // Mostrar loader
            Swal.fire({
                title: 'Creando cuenta...',
                html: 'Por favor espera...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                // Crear objeto Administrador
                const organizacionCamelCase = convertToCamelCase(elements.organizationInput.value.trim());
                
                // IMPORTANTE: Crear el objeto Administrador CORRECTAMENTE
                // No uses "new Administrador()" directamente, pasa los datos como objeto plano
                const adminData = {
                    organizacion: elements.organizationInput.value.trim(),
                    organizacionCamelCase: organizacionCamelCase,
                    nombreCompleto: elements.fullNameInput.value.trim(),
                    correoElectronico: elements.emailInput.value.trim(),
                    fotoUsuario: profileImageBase64,
                    fotoOrganizacion: orgImageBase64,
                    esSuperAdmin: true,
                    status: true,
                    theme: 'light'
                };
                
                console.log('Datos a registrar:', adminData);
                console.log('Contraseña (primeros 3 chars):', elements.passwordInput.value.substring(0, 3) + '***');
                
                // Registrar administrador usando el UserService
                const resultado = await userService.registrarAdministradorInicial(
                    adminData,
                    elements.passwordInput.value
                );
                
                // Cerrar loader
                Swal.close();
                
                // Mostrar éxito
                await Swal.fire({
                    icon: 'success',
                    title: '¡Administrador creado!',
                    html: `Cuenta creada exitosamente para:<br><br>
                          <strong>${resultado.organizacion}</strong><br>
                          ${resultado.nombreCompleto}<br>
                          ${resultado.correoElectronico}`,
                    confirmButtonText: 'INICIAR SESIÓN'
                }).then(() => {
                    // Redirigir al login
                    window.location.href = '/users/visitors/login/login.html';
                });
                
            } catch (error) {
                // Cerrar loader
                Swal.close();
                
                // Mostrar error específico
                console.error('Error en registro:', error);
                
                let errorMessage = 'Ocurrió un error al crear la cuenta';
                
                if (error.message.includes('Ya existe un administrador')) {
                    errorMessage = 'Ya existe un administrador registrado. Solo se permite un administrador inicial.';
                } else if (error.message.includes('email-already-in-use')) {
                    errorMessage = 'Este correo electrónico ya está registrado.';
                } else if (error.message.includes('weak-password')) {
                    errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 8 caracteres, mayúsculas, minúsculas, números y caracteres especiales.';
                } else if (error.message.includes('network-request-failed')) {
                    errorMessage = 'Error de conexión. Verifica tu internet.';
                } else if (error.message.includes('Firestore')) {
                    errorMessage = 'Error en la base de datos: ' + error.message;
                }
                
                Swal.fire({
                    icon: 'error',
                    title: 'Error al crear cuenta',
                    text: errorMessage,
                    confirmButtonText: 'ENTENDIDO'
                });
            }
        });
    }

    // ========== CANCELAR ==========
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => {
            Swal.fire({
                title: '¿Cancelar registro?',
                text: "Se perderán todos los datos ingresados",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/users/visitors/login/login.html';
                }
            });
        });
    }

    // Mensaje inicial
    setTimeout(() => {
        if (elements.mainMessage) {
            showMessage(elements.mainMessage, 'info', 
                'Bienvenido al registro de administrador. Completa todos los campos para crear tu cuenta.');
        }
    }, 1000);
    
    // Aplicar estilos SweetAlert después de cargar todo
    applySweetAlertStyles();
}

