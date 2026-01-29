import { UserService, Administrador } from '/clases/user.js';

// ==================== INICIALIZACIÓN ====================
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
        modalIcon: document.getElementById('modalIcon'),
        modalMessage: document.getElementById('modalMessage'),
        confirmChangeBtn: document.getElementById('confirmChangeBtn'),
        cancelChangeBtn: document.getElementById('cancelChangeBtn'),
        
        // Formulario
        organizationInput: document.getElementById('organization'),
        fullNameInput: document.getElementById('fullName'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        termsCheckbox: document.getElementById('termsCheckbox'),
        
        // Contadores y indicadores
        orgCharCount: document.getElementById('orgCharCount'),
        nameCharCount: document.getElementById('nameCharCount'),
        strengthBar: document.getElementById('strengthBar'),
        strengthText: document.getElementById('strengthText'),
        
        // Requisitos de contraseña
        reqLength: document.getElementById('reqLength'),
        reqUppercase: document.getElementById('reqUppercase'),
        reqNumber: document.getElementById('reqNumber'),
        reqSpecial: document.getElementById('reqSpecial'),
        
        // Botones y mensajes
        registerBtn: document.getElementById('registerBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        mainMessage: document.getElementById('mainMessage'),
        registerForm: document.getElementById('registerForm')
    };

    // Instancia del UserService
    const userService = new UserService();
    
    // Variables para imágenes
    let selectedFile = null;
    let currentPhotoType = '';
    let profileImageBase64 = null;
    let orgImageBase64 = null;

    // ========== FUNCIONES DE UTILIDAD ==========
    function showMessage(element, type, text) {
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
                <i class="fas ${icons[type] || 'fa-info-circle'}" style="color: ${colors[type]};"></i>
                <span style="color: var(--color-text-primary);">${text}</span>
            </div>
        `;
        element.style.display = 'block';
        
        // Auto-ocultar para mensajes no críticos
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                element.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    element.style.display = 'none';
                    element.style.animation = '';
                }, 300);
            }, 5000);
        }
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
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        let score = 0;
        let errors = [];
        let requirements = [];
        
        if (password.length >= minLength) {
            score++;
            requirements.push({ id: 'reqLength', valid: true });
        } else {
            errors.push(`Mínimo ${minLength} caracteres`);
            requirements.push({ id: 'reqLength', valid: false });
        }
        
        if (hasUpperCase) {
            score++;
            requirements.push({ id: 'reqUppercase', valid: true });
        } else {
            errors.push('Al menos una letra mayúscula');
            requirements.push({ id: 'reqUppercase', valid: false });
        }
        
        if (hasNumber) {
            score++;
            requirements.push({ id: 'reqNumber', valid: true });
        } else {
            errors.push('Al menos un número');
            requirements.push({ id: 'reqNumber', valid: false });
        }
        
        if (hasSpecialChar) {
            score++;
            requirements.push({ id: 'reqSpecial', valid: true });
        } else {
            errors.push('Al menos un carácter especial (@, #, $, etc.)');
            requirements.push({ id: 'reqSpecial', valid: false });
        }
        
        // Verificar que tenga al menos una minúscula
        if (!hasLowerCase) {
            errors.push('Al menos una letra minúscula');
        }
        
        return {
            isValid: errors.length === 0,
            score: score,
            errors: errors,
            requirements: requirements
        };
    }

    function updatePasswordStrength(password) {
        const validation = validatePassword(password);
        const strengthColors = {
            0: '#F44336', // Rojo
            1: '#FF5722', // Naranja
            2: '#FFC107', // Amarillo
            3: '#4CAF50', // Verde claro
            4: '#2E7D32'  // Verde oscuro
        };
        
        const strengthTexts = {
            0: 'Muy débil',
            1: 'Débil',
            2: 'Regular',
            3: 'Fuerte',
            4: 'Muy fuerte'
        };
        
        // Actualizar barra de fortaleza
        const percentage = (validation.score / 4) * 100;
        elements.strengthBar.style.width = `${percentage}%`;
        elements.strengthBar.style.backgroundColor = strengthColors[validation.score] || '#F44336';
        elements.strengthText.textContent = strengthTexts[validation.score] || 'Muy débil';
        elements.strengthText.style.color = strengthColors[validation.score] || '#F44336';
        
        // Actualizar iconos de requisitos
        validation.requirements.forEach(req => {
            const element = elements[req.id];
            if (element) {
                const icon = element.querySelector('i');
                if (icon) {
                    icon.className = req.valid ? 'fas fa-check-circle' : 'fas fa-circle';
                    icon.style.color = req.valid ? '#4CAF50' : '#757575';
                }
            }
        });
    }

    function convertToCamelCase(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
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
                elements.modalIcon.className = 'fas fa-user';
            } else {
                elements.modalTitle.textContent = 'CAMBIAR LOGO DE ORGANIZACIÓN';
                elements.modalMessage.textContent = '¿Deseas usar esta imagen como logo de tu organización?';
                elements.modalIcon.className = 'fas fa-building';
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
            
            // Guardar en variable correspondiente
            if (isProfile) {
                profileImageBase64 = imageSrc;
            } else {
                orgImageBase64 = imageSrc;
            }
        } else {
            imageElement.style.display = 'none';
            placeholderElement.style.display = 'flex';
            
            // Limpiar variable
            if (isProfile) {
                profileImageBase64 = null;
            } else {
                orgImageBase64 = null;
            }
        }
    }

    // ========== EVENTOS DE IMÁGENES ==========
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

    // Eventos del modal
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
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    });
                } else {
                    updatePhoto(elements.orgImage, elements.orgPlaceholder, e.target.result, false);
                    
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

    // ========== EVENTOS DE FORMULARIO ==========
    // Contadores de caracteres
    elements.organizationInput.addEventListener('input', function() {
        const count = this.value.length;
        elements.orgCharCount.textContent = `${count}/100`;
        elements.orgCharCount.style.color = count > 90 ? '#F44336' : '#757575';
    });

    elements.fullNameInput.addEventListener('input', function() {
        const count = this.value.length;
        elements.nameCharCount.textContent = `${count}/50`;
        elements.nameCharCount.style.color = count > 40 ? '#F44336' : '#757575';
    });

    // Fortaleza de contraseña en tiempo real
    elements.passwordInput.addEventListener('input', function() {
        updatePasswordStrength(this.value);
    });

    // Mostrar/ocultar contraseña
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

    // ========== REGISTRO CON USER SERVICE ==========
    elements.registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Validar términos y condiciones
        if (!elements.termsCheckbox.checked) {
            Swal.fire({
                icon: 'error',
                title: 'Términos no aceptados',
                text: 'Debes aceptar los términos y condiciones para continuar',
                confirmButtonColor: '#e74c3c',
                confirmButtonText: 'ENTENDIDO'
            });
            return;
        }
        
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
                showMessage(elements.mainMessage, 'error', 
                    'La contraseña no cumple con los requisitos de seguridad');
                
                Swal.fire({
                    icon: 'error',
                    title: 'Contraseña insegura',
                    html: `La contraseña debe cumplir con:<br><br>
                           <ul style="text-align: left; padding-left: 20px;">
                             <li>Mínimo 8 caracteres</li>
                             <li>Al menos una letra mayúscula y una minúscula</li>
                             <li>Al menos un número</li>
                             <li>Al menos un carácter especial (@, #, $, etc.)</li>
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
            return;
        }
        
        // Mostrar confirmación final
        const confirmResult = await Swal.fire({
            title: '¿Crear cuenta de administrador?',
            html: `
                <div style="text-align: left; font-size: 0.9rem;">
                    <p><strong>IMPORTANTE:</strong> Esta será la primera y única cuenta de administrador.</p>
                    <p>Una vez creada, solo este administrador podrá:</p>
                    <ul style="margin-left: 20px;">
                        <li>Crear colaboradores</li>
                        <li>Gestionar toda la organización</li>
                        <li>Configurar el sistema</li>
                    </ul>
                    <p style="color: #FF9800; margin-top: 10px;">
                        <i class="fas fa-exclamation-triangle"></i> Asegúrate de guardar las credenciales en un lugar seguro.
                    </p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#00b894',
            cancelButtonColor: '#d33',
            confirmButtonText: 'SÍ, CREAR ADMINISTRADOR',
            cancelButtonText: 'CANCELAR',
            reverseButtons: true
        });
        
        if (!confirmResult.isConfirmed) {
            return;
        }
        
        // Mostrar loader de registro
        const swalInstance = Swal.fire({
            title: 'Creando cuenta de administrador...',
            html: `
                <div style="text-align: center;">
                    <p>Estamos creando tu cuenta de super administrador</p>
                    <div class="spinner-border" style="margin: 20px auto;"></div>
                    <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 10px;">
                        Esto puede tomar unos segundos...
                    </p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                // Agregar spinner
                const content = Swal.getHtmlContainer();
                const spinner = content.querySelector('.spinner-border');
                if (spinner) {
                    spinner.style.cssText = `
                        width: 3rem;
                        height: 3rem;
                        border: 0.25em solid rgba(0, 184, 148, 0.2);
                        border-right-color: #00b894;
                        border-radius: 50%;
                        animation: spinner-border 0.75s linear infinite;
                        display: block;
                        margin: 20px auto;
                    `;
                }
            }
        });
        
        try {
            // Crear objeto Administrador
            const organizacionCamelCase = convertToCamelCase(elements.organizationInput.value.trim());
            
            const adminData = new Administrador({
                organizacion: elements.organizationInput.value.trim(),
                organizacionCamelCase: organizacionCamelCase,
                nombreCompleto: elements.fullNameInput.value.trim(),
                correoElectronico: elements.emailInput.value.trim(),
                fotoUsuario: profileImageBase64,
                fotoOrganizacion: orgImageBase64,
                esSuperAdmin: true,
                status: true,
                theme: 'light' // Tema por defecto
            });
            
            // Registrar administrador usando el UserService
            const resultado = await userService.registrarAdministradorInicial(
                adminData,
                elements.passwordInput.value
            );
            
            // Cerrar loader
            await swalInstance.close();
            
            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Administrador creado!',
                html: `
                    <div style="text-align: center;">
                        <div style="font-size: 4rem; color: #00b894; margin-bottom: 20px;">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <p>Tu cuenta de super administrador ha sido creada exitosamente</p>
                        <div style="background: rgba(0, 184, 148, 0.1); border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
                            <p style="margin: 5px 0;"><strong>Organización:</strong> ${resultado.organizacion}</p>
                            <p style="margin: 5px 0;"><strong>Administrador:</strong> ${resultado.nombreCompleto}</p>
                            <p style="margin: 5px 0;"><strong>Correo:</strong> ${resultado.correoElectronico}</p>
                            <p style="margin: 5px 0; color: #FF9800;">
                                <i class="fas fa-key"></i> <strong>Contraseña:</strong> Guardada correctamente
                            </p>
                        </div>
                        <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
                            <i class="fas fa-lightbulb"></i> Ahora puedes iniciar sesión y comenzar a usar el sistema.
                        </p>
                    </div>
                `,
                confirmButtonText: 'INICIAR SESIÓN',
                confirmButtonColor: '#00b894',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                // Redirigir al login
                window.location.href = '/users/visitors/login/login.html';
            });
            
        } catch (error) {
            // Cerrar loader
            await swalInstance.close();
            
            // Mostrar error específico
            console.error('Error en registro:', error);
            
            let errorMessage = 'Ocurrió un error al crear la cuenta';
            
            // Mensajes específicos según el error
            if (error.message.includes('Ya existe un administrador')) {
                errorMessage = 'Ya existe un administrador registrado en el sistema. Solo se permite un administrador inicial.';
            } else if (error.message.includes('email-already-in-use')) {
                errorMessage = 'Este correo electrónico ya está registrado en el sistema.';
            } else if (error.message.includes('weak-password')) {
                errorMessage = 'La contraseña es demasiado débil. Usa una contraseña más segura.';
            } else if (error.message.includes('network-request-failed')) {
                errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Error al crear cuenta',
                html: `
                    <div style="text-align: center;">
                        <div style="font-size: 4rem; color: #e74c3c; margin-bottom: 20px;">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <p>${errorMessage}</p>
                        <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 10px;">
                            <i class="fas fa-lightbulb"></i> Si el problema persiste, contacta al soporte técnico.
                        </p>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: '#e74c3c'
            });
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
            'Bienvenido al registro de administrador. Esta es la primera y única vez que podrás crear una cuenta de administrador para el sistema.');
    }, 1000);
}