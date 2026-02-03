// Importar las clases correctamente desde user.js
import { UserManager } from '/clases/user.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initRegistrationForm();
});

function applySweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = /*css*/`
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
    console.log('Iniciando formulario de registro de administrador...');
    
    // Verificar que todos los elementos del DOM existan
    const elements = {
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
        
        photoModal: document.getElementById('photoModal'),
        previewImage: document.getElementById('previewImage'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        confirmChangeBtn: document.getElementById('confirmChangeBtn'),
        cancelChangeBtn: document.getElementById('cancelChangeBtn'),
        
        organizationInput: document.getElementById('organization'),
        fullNameInput: document.getElementById('fullName'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        
        registerBtn: document.getElementById('registerBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        mainMessage: document.getElementById('mainMessage'),
        registerForm: document.getElementById('registerForm')
    };

    // Verificar elementos críticos
    const elementosCriticos = ['organizationInput', 'fullNameInput', 'emailInput', 'passwordInput', 'confirmPasswordInput', 'registerForm'];
    for (const elemento of elementosCriticos) {
        if (!elements[elemento]) {
            console.error(`Elemento crítico no encontrado: ${elemento}`);
            showErrorMessage(`Error: No se encontró el elemento ${elemento}. Contacta al administrador.`);
            return;
        }
    }

    // Instancia del UserManager
    const userManager = new UserManager();
    console.log('UserManager inicializado para registro');
    
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
        
        // Auto-ocultar mensajes después de 5 segundos (excepto errores)
        if (type !== 'error') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    function showErrorMessage(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonText: 'ENTENDIDO',
            confirmButtonColor: '#d33'
        });
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
            if (elements.previewImage) elements.previewImage.src = e.target.result;
            currentPhotoType = type;
            
            if (type === 'profile') {
                if (elements.modalTitle) elements.modalTitle.textContent = 'CAMBIAR FOTO DE PERFIL';
                if (elements.modalMessage) elements.modalMessage.textContent = '¿Deseas usar esta imagen como tu foto de perfil?';
            } else {
                if (elements.modalTitle) elements.modalTitle.textContent = 'CAMBIAR LOGO DE ORGANIZACIÓN';
                if (elements.modalMessage) elements.modalMessage.textContent = '¿Deseas usar esta imagen como logo de tu organización?';
            }
            
            if (elements.photoModal) elements.photoModal.style.display = 'flex';
            selectedFile = file;
        };
        
        reader.readAsDataURL(file);
    }

    function updatePhoto(imageElement, placeholderElement, imageSrc, isProfile = true) {
        if (imageSrc && imageElement && placeholderElement) {
            imageElement.src = imageSrc;
            imageElement.style.display = 'block';
            placeholderElement.style.display = 'none';
            
            if (isProfile) {
                profileImageBase64 = imageSrc;
            } else {
                orgImageBase64 = imageSrc;
            }
        } else if (imageElement && placeholderElement) {
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
    if (elements.profileCircle && elements.profileInput) {
        elements.profileCircle.addEventListener('click', () => elements.profileInput.click());
    }
    
    if (elements.editProfileOverlay && elements.profileInput) {
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

    if (elements.orgCircle && elements.orgInput) {
        elements.orgCircle.addEventListener('click', () => elements.orgInput.click());
    }
    
    if (elements.editOrgOverlay && elements.orgInput) {
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
                    
                    if (elements.photoModal) elements.photoModal.style.display = 'none';
                    selectedFile = null;
                    currentPhotoType = '';
                };
                
                reader.readAsDataURL(selectedFile);
            }
        });
    }

    if (elements.cancelChangeBtn && elements.photoModal) {
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

    // ========== REGISTRO DE ADMINISTRADOR ==========
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('Formulario de registro de administrador enviado');
            
            // Deshabilitar botón de registro para evitar doble envío
            if (elements.registerBtn) {
                elements.registerBtn.disabled = true;
                elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            }
            
            // Validaciones básicas
            let isValid = true;
            let messages = [];
            
            // Validar organización
            if (!elements.organizationInput.value.trim()) {
                isValid = false;
                messages.push('El nombre de la organización es obligatorio');
            } else if (elements.organizationInput.value.trim().length < 3) {
                isValid = false;
                messages.push('El nombre de la organización debe tener al menos 3 caracteres');
            }
            
            // Validar nombre completo
            if (!elements.fullNameInput.value.trim()) {
                isValid = false;
                messages.push('El nombre completo es obligatorio');
            } else if (elements.fullNameInput.value.trim().length < 5) {
                isValid = false;
                messages.push('El nombre completo debe tener al menos 5 caracteres');
            }
            
            // Validar email
            if (!elements.emailInput.value.trim()) {
                isValid = false;
                messages.push('El correo electrónico es obligatorio');
            } else if (!validateEmail(elements.emailInput.value)) {
                isValid = false;
                messages.push('El correo electrónico no es válido');
            }
            
            // Validar contraseña
            if (!elements.passwordInput.value) {
                isValid = false;
                messages.push('La contraseña es obligatoria');
            } else if (!validatePassword(elements.passwordInput.value)) {
                isValid = false;
                messages.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
            }
            
            // Validar confirmación de contraseña
            if (!elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('Debes confirmar la contraseña');
            } else if (elements.passwordInput.value !== elements.confirmPasswordInput.value) {
                isValid = false;
                messages.push('Las contraseñas no coinciden');
            }
            
            if (!isValid) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de validación',
                    html: messages.map(msg => `• ${msg}`).join('<br>'),
                    confirmButtonText: 'CORREGIR'
                });
                
                // Rehabilitar botón
                if (elements.registerBtn) {
                    elements.registerBtn.disabled = false;
                    elements.registerBtn.innerHTML = '<i class="fas fa-user-shield"></i> CREAR CUENTA DE ADMINISTRADOR';
                }
                return;
            }
            
            // Mostrar confirmación final
            const confirmResult = await Swal.fire({
                title: 'CREAR CUENTA DE ADMINISTRADOR',
                html: `
                    <div style="text-align: left; padding: 10px 0;">
                        <p><strong>Organización:</strong> ${elements.organizationInput.value.trim()}</p>
                        <p><strong>Nombre:</strong> ${elements.fullNameInput.value.trim()}</p>
                        <p><strong>Email:</strong> ${elements.emailInput.value.trim()}</p>
                        <p style="color: #ff9800; margin-top: 15px;">
                            <i class="fas fa-exclamation-triangle"></i> Se enviará un correo de verificación a tu email.
                        </p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'CONFIRMAR REGISTRO',
                cancelButtonText: 'CANCELAR',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                allowOutsideClick: false
            });
            
            if (!confirmResult.isConfirmed) {
                // Rehabilitar botón si cancela
                if (elements.registerBtn) {
                    elements.registerBtn.disabled = false;
                    elements.registerBtn.innerHTML = '<i class="fas fa-user-shield"></i> CREAR CUENTA DE ADMINISTRADOR';
                }
                return;
            }
            
            // Mostrar loader
            Swal.fire({
                title: 'Creando cuenta de administrador...',
                html: 'Esto puede tomar unos segundos. Por favor espera...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                // Crear objeto de datos para el administrador
                const organizacionCamelCase = convertToCamelCase(elements.organizationInput.value.trim());
                
                const adminData = {
                    organizacion: elements.organizationInput.value.trim(),
                    organizacionCamelCase: organizacionCamelCase,
                    nombreCompleto: elements.fullNameInput.value.trim(),
                    correoElectronico: elements.emailInput.value.trim(),
                    fotoUsuario: profileImageBase64,
                    fotoOrganizacion: orgImageBase64,
                    esSuperAdmin: true,
                    status: true,
                    theme: 'light',
                    plan: 'gratis'
                };
                
                console.log('Registrando administrador con datos:', {
                    organizacion: adminData.organizacion,
                    nombre: adminData.nombreCompleto,
                    email: adminData.correoElectronico,
                    tieneFotoUsuario: !!adminData.fotoUsuario,
                    tieneFotoOrganizacion: !!adminData.fotoOrganizacion
                });
                
                // Registrar administrador usando UserManager
                const resultado = await userManager.createAdministrador(
                    adminData,
                    elements.passwordInput.value
                );
                
                console.log('Administrador creado exitosamente:', resultado);
                
                // Cerrar loader
                Swal.close();
                
                // Mostrar éxito con instrucciones de verificación
                await Swal.fire({
                    icon: 'success',
                    title: '¡REGISTRO EXITOSO!',
                    html: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 60px; color: #28a745; margin-bottom: 20px;">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <h3 style="color: var(--color-text-primary); margin-bottom: 15px;">
                                ¡Cuenta creada exitosamente!
                            </h3>
                            <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p><strong>Organización:</strong> ${adminData.organizacion}</p>
                                <p><strong>Administrador:</strong> ${adminData.nombreCompleto}</p>
                                <p><strong>Email:</strong> ${adminData.correoElectronico}</p>
                                <p><strong>Rol:</strong> SUPER ADMINISTRADOR</p>
                            </div>
                            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <h4 style="color: #0a2540; margin-bottom: 10px;">
                                    <i class="fas fa-envelope"></i> Verificación de Email
                                </h4>
                                <p style="color: #666; margin-bottom: 10px;">
                                    Se ha enviado un correo de verificación a <strong>${adminData.correoElectronico}</strong>
                                </p>
                                <p style="color: #666; font-size: 0.9rem;">
                                    <i class="fas fa-info-circle"></i> Debes verificar tu email antes de iniciar sesión
                                </p>
                            </div>
                            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                                <p style="color: #0a2540; font-weight: bold; margin-bottom: 10px;">
                                    <i class="fas fa-lightbulb"></i> Instrucciones:
                                </p>
                                <ol style="text-align: left; margin: 0; padding-left: 20px; color: #666;">
                                    <li>Revisa tu bandeja de entrada (y carpeta de spam)</li>
                                    <li>Haz clic en el enlace de verificación del correo</li>
                                    <li>Inicia sesión con tus credenciales</li>
                                    <li>Una vez verificado, podrás crear colaboradores</li>
                                </ol>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'IR AL INICIO DE SESIÓN',
                    confirmButtonColor: '#28a745',
                    allowOutsideClick: false
                }).then(() => {
                    // Redirigir al login
                    window.location.href = '/users/visitors/login/login.html';
                });
                
            } catch (error) {
                // Cerrar loader
                Swal.close();
                
                // Rehabilitar botón
                if (elements.registerBtn) {
                    elements.registerBtn.disabled = false;
                    elements.registerBtn.innerHTML = '<i class="fas fa-user-shield"></i> CREAR CUENTA DE ADMINISTRADOR';
                }
                
                // Mostrar error específico
                console.error('Error en registro de administrador:', error);
                
                let errorMessage = 'Ocurrió un error al crear la cuenta de administrador';
                let errorDetails = error.message || '';
                let errorTitle = 'Error al crear cuenta';
                
                // Manejar errores específicos de Firebase
                if (error.code) {
                    switch(error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'Este correo electrónico ya está registrado en el sistema.';
                            errorTitle = 'Email en uso';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'El correo electrónico no es válido.';
                            errorTitle = 'Email inválido';
                            break;
                        case 'auth/operation-not-allowed':
                            errorMessage = 'El registro por correo/contraseña no está habilitado. Contacta al administrador.';
                            errorTitle = 'Registro deshabilitado';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales.';
                            errorTitle = 'Contraseña débil';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Error de conexión a internet. Verifica tu conexión e intenta nuevamente.';
                            errorTitle = 'Error de conexión';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
                            errorTitle = 'Demasiados intentos';
                            break;
                        default:
                            // Si es un error personalizado de nuestra lógica
                            if (error.message.includes('El correo electrónico ya está registrado')) {
                                errorMessage = error.message;
                                errorTitle = 'Email duplicado';
                            } else if (error.message.includes('Ya existe un administrador registrado')) {
                                errorMessage = error.message;
                                errorTitle = 'Administrador existente';
                            } else if (error.message.includes('Firestore')) {
                                errorMessage = 'Error en la base de datos: ' + error.message;
                                errorTitle = 'Error de base de datos';
                            }
                    }
                } else if (error.message) {
                    // Errores personalizados de nuestra lógica
                    if (error.message.includes('El correo electrónico ya está registrado')) {
                        errorMessage = error.message;
                        errorTitle = 'Email duplicado';
                    } else if (error.message.includes('Límite de usuarios alcanzado')) {
                        errorMessage = error.message;
                        errorTitle = 'Límite alcanzado';
                    }
                }
                
                Swal.fire({
                    icon: 'error',
                    title: errorTitle,
                    html: `
                        <div style="text-align: left;">
                            <p>${errorMessage}</p>
                            ${errorDetails ? `<p style="color: #666; font-size: 0.9rem; margin-top: 10px;"><strong>Detalles:</strong> ${errorDetails}</p>` : ''}
                            <p style="color: #ff9800; margin-top: 15px; font-size: 0.9rem;">
                                <i class="fas fa-exclamation-triangle"></i> Si el problema persiste, contacta al soporte técnico.
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#d33',
                    allowOutsideClick: true
                });
            }
        });
    }

    // ========== CANCELAR REGISTRO ==========
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', async () => {
            const confirmResult = await Swal.fire({
                title: '¿Cancelar registro?',
                text: "Se perderán todos los datos ingresados",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6'
            });
            
            if (confirmResult.isConfirmed) {
                window.location.href = '/users/visitors/login/login.html';
            }
        });
    }

    // ========== VALIDACIÓN EN TIEMPO REAL ==========
    if (elements.passwordInput && elements.confirmPasswordInput) {
        elements.confirmPasswordInput.addEventListener('input', function() {
            if (elements.passwordInput.value && this.value) {
                if (elements.passwordInput.value !== this.value) {
                    this.style.borderColor = '#dc3545';
                    this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
                } else {
                    this.style.borderColor = '#28a745';
                    this.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
                }
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
    }

    if (elements.emailInput) {
        elements.emailInput.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                this.style.borderColor = '#dc3545';
                this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            } else if (this.value) {
                this.style.borderColor = '#28a745';
                this.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
    }

    // Mensaje inicial
    setTimeout(() => {
        if (elements.mainMessage) {
            showMessage(elements.mainMessage, 'info', 
                'REGISTRO DE ADMINISTRADOR: Completa todos los campos para crear una nueva cuenta de administrador para tu organización.');
        }
    }, 1000);
    
    // Aplicar estilos SweetAlert
    applySweetAlertStyles();
    
    console.log('Formulario de registro inicializado correctamente');
}

export { initRegistrationForm };