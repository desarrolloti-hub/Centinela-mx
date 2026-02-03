// editAdmin.js - Editor de perfil de administrador con Firebase
// ==================== IMPORTS ====================
import { getAuth, onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } 
    from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } 
    from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { firebaseConfig } from '/config/firebase-config.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Editor de perfil cargado');
    
    // Verificar SweetAlert2
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado');
        return;
    }
    
    // Aplicar estilos
    applySweetAlertStyles();
    
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    // Inicializar editor
    initProfileEditor(auth, db);
});

// ==================== FUNCIONES PRINCIPALES ====================
function applySweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos para campos de solo lectura */
        .readonly-field {
            background-color: #f5f5f5 !important;
            border-color: #ddd !important;
            color: #666 !important;
            cursor: not-allowed !important;
        }
        
        .readonly-badge {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: #e0e0e0;
            color: #666;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        /* Estilos específicos del editor */
        .password-section {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border: 1px solid #e0e0e0;
        }
        
        .section-subtitle {
            color: #333;
            margin-bottom: 10px;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-description {
            color: #666;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }
        
        .permissions-note {
            background: #fff8e1;
            border-left: 4px solid #ffb300;
            padding: 12px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 0.9rem;
            color: #5d4037;
        }
        
        /* Animaciones */
        @keyframes slideOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
}

async function initProfileEditor(auth, db) {
    // Elementos del DOM
    const elements = {
        // Fotos (EDITABLES)
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
        emailInput: document.getElementById('email'),
        organizationNameInput: document.getElementById('organizationName'),
        positionInput: document.getElementById('position'),
        currentPasswordInput: document.getElementById('currentPassword'),
        newPasswordInput: document.getElementById('newPassword'),
        confirmPasswordInput: document.getElementById('confirmPassword'),
        
        // Botones y mensajes
        saveChangesBtn: document.getElementById('saveChangesBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        backToDashboard: document.getElementById('backToDashboard'),
        mainMessage: document.getElementById('mainMessage'),
        passwordMessage: document.getElementById('passwordMessage')
    };

    // Variables
    let currentUser = null;
    let userData = {};
    let selectedFile = null;
    let currentPhotoType = '';
    let originalData = {};

    // ========== FUNCIONES DE UTILIDAD ==========
    function showMessage(element, type, text) {
        if (!element) return;
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle',
            'warning': 'fa-exclamation-triangle'
        };
        
        const colors = {
            'success': '#4CAF50',
            'error': '#F44336',
            'info': '#2196F3',
            'warning': '#FF9800'
        };
        
        element.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 5px; background: ${colors[type]}15; border-left: 4px solid ${colors[type]}">
                <i class="fas ${icons[type]}" style="color: ${colors[type]};"></i>
                <span>${text}</span>
            </div>
        `;
        element.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos
        if (type !== 'error') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    function clearMessages() {
        if (elements.mainMessage) elements.mainMessage.style.display = 'none';
        if (elements.passwordMessage) elements.passwordMessage.style.display = 'none';
    }

    function validateFile(file, maxSizeMB = 5) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = maxSizeMB * 1024 * 1024;
        
        if (!validTypes.includes(file.type)) {
            Swal.fire({
                icon: 'error',
                title: 'Formato no válido',
                text: 'Solo se permiten archivos JPG, PNG, GIF o WebP',
                confirmButtonColor: '#e74c3c'
            });
            return false;
        }
        
        if (file.size > maxSize) {
            Swal.fire({
                icon: 'error',
                title: 'Archivo demasiado grande',
                text: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`,
                confirmButtonColor: '#e74c3c'
            });
            return false;
        }
        
        return true;
    }

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

    function getImageUrl(base64String) {
        if (!base64String || base64String.trim() === '') {
            return '';
        }
        
        if (base64String.startsWith('http')) {
            return base64String;
        }
        
        if (base64String.startsWith('data:')) {
            return base64String;
        }
        
        return `data:image/jpeg;base64,${base64String}`;
    }

    function updatePhoto(imageElement, placeholderElement, imageSrc) {
        if (imageSrc) {
            imageElement.src = imageSrc;
            imageElement.style.display = 'block';
            placeholderElement.style.display = 'none';
        } else {
            imageElement.style.display = 'none';
            placeholderElement.style.display = 'flex';
        }
    }

    // ========== CARGAR DATOS DEL USUARIO ==========
    async function loadUserData(userId) {
        try {
            console.log('🔍 Cargando datos del usuario:', userId);
            
            const userRef = doc(db, "administradores", userId);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                showMessage(elements.mainMessage, 'error', 'Usuario no encontrado en la base de datos');
                return;
            }
            
            userData = userSnap.data();
            originalData = { ...userData };
            
            console.log('📊 Datos cargados:', userData);
            
            // Actualizar interfaz
            updateUI(userData);
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            showMessage(elements.mainMessage, 'error', 'Error al cargar datos del usuario');
        }
    }

    function updateUI(data) {
        // Fotos
        const profilePicUrl = getImageUrl(data.fotoUsuario);
        const orgPicUrl = getImageUrl(data.fotoOrganizacion);
        
        updatePhoto(elements.profileImage, elements.profilePlaceholder, profilePicUrl);
        updatePhoto(elements.orgImage, elements.orgPlaceholder, orgPicUrl);
        
        // Campos editables
        if (elements.fullNameInput) {
            elements.fullNameInput.value = data.nombreCompleto || '';
        }
        
        // Campos de solo lectura
        if (elements.emailInput) {
            elements.emailInput.value = data.correoElectronico || currentUser?.email || '';
        }
        
        if (elements.organizationNameInput) {
            elements.organizationNameInput.value = data.organizacion || '';
        }
        
        if (elements.positionInput) {
            elements.positionInput.value = data.cargo || 'administrador';
        }
        
        console.log('✅ Interfaz actualizada');
    }

    // ========== MANEJO DE FOTOS ==========
    function setupPhotoHandlers() {
        // Foto de perfil
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

        // Logo de organización
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

    async function savePhotoToFirestore(imageBase64, type) {
        try {
            const updateData = type === 'profile' 
                ? { fotoUsuario: imageBase64 }
                : { fotoOrganizacion: imageBase64 };
            
            updateData.fechaActualizacion = new Date();
            
            const userRef = doc(db, "administradores", currentUser.uid);
            await updateDoc(userRef, updateData);
            
            // Actualizar datos locales
            if (type === 'profile') {
                userData.fotoUsuario = imageBase64;
            } else {
                userData.fotoOrganizacion = imageBase64;
            }
            
            return true;
        } catch (error) {
            console.error(`Error guardando ${type}:`, error);
            return false;
        }
    }

    // ========== MANEJO DE CONTRASEÑAS ==========
    function setupPasswordHandlers() {
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
    }

    async function changePassword() {
        if (!elements.currentPasswordInput.value || 
            !elements.newPasswordInput.value || 
            !elements.confirmPasswordInput.value) {
            return { success: false, message: 'Todos los campos de contraseña son obligatorios' };
        }
        
        if (elements.newPasswordInput.value !== elements.confirmPasswordInput.value) {
            return { success: false, message: 'Las nuevas contraseñas no coinciden' };
        }
        
        const passwordValidation = validatePassword(elements.newPasswordInput.value);
        if (!passwordValidation.isValid) {
            return { 
                success: false, 
                message: `La contraseña no cumple los requisitos: ${passwordValidation.errors.join(', ')}`
            };
        }
        
        try {
            // Reautenticar usuario
            const credential = EmailAuthProvider.credential(
                currentUser.email, 
                elements.currentPasswordInput.value
            );
            
            await reauthenticateWithCredential(currentUser, credential);
            
            // Cambiar contraseña
            await updatePassword(currentUser, elements.newPasswordInput.value);
            
            // Limpiar campos
            elements.currentPasswordInput.value = '';
            elements.newPasswordInput.value = '';
            elements.confirmPasswordInput.value = '';
            
            return { 
                success: true, 
                message: 'Contraseña cambiada exitosamente' 
            };
            
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            
            let message = 'Error al cambiar la contraseña';
            if (error.code === 'auth/wrong-password') {
                message = 'La contraseña actual es incorrecta';
            } else if (error.code === 'auth/weak-password') {
                message = 'La nueva contraseña es demasiado débil';
            } else if (error.code === 'auth/requires-recent-login') {
                message = 'Debes iniciar sesión nuevamente para cambiar la contraseña';
            }
            
            return { success: false, message: message };
        }
    }

    // ========== GUARDAR CAMBIOS ==========
    async function saveChanges() {
        clearMessages();
        
        let isValid = true;
        let messages = [];
        
        // Validar nombre
        if (!elements.fullNameInput.value.trim()) {
            isValid = false;
            messages.push('El nombre completo es obligatorio');
        }
        
        if (!isValid) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                html: messages.map(msg => `• ${msg}`).join('<br>'),
                confirmButtonColor: '#e74c3c'
            });
            return;
        }
        
        // Mostrar loader
        const swalInstance = Swal.fire({
            title: 'Guardando cambios...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            // Preparar datos a actualizar
            const updateData = {
                nombreCompleto: elements.fullNameInput.value.trim(),
                fechaActualizacion: new Date()
            };
            
            // Verificar si hay cambios en el nombre
            const hasNameChanged = elements.fullNameInput.value.trim() !== (originalData.nombreCompleto || '');
            
            // Cambiar contraseña si se proporcionó
            let passwordChanged = false;
            if (elements.currentPasswordInput.value || 
                elements.newPasswordInput.value || 
                elements.confirmPasswordInput.value) {
                
                const passwordResult = await changePassword();
                if (passwordResult.success) {
                    passwordChanged = true;
                    showMessage(elements.passwordMessage, 'success', passwordResult.message);
                } else {
                    await swalInstance.close();
                    showMessage(elements.passwordMessage, 'error', passwordResult.message);
                    return;
                }
            }
            
            // Guardar en Firestore si hay cambios
            if (hasNameChanged) {
                const userRef = doc(db, "administradores", currentUser.uid);
                await updateDoc(userRef, updateData);
                
                // Actualizar datos locales
                userData.nombreCompleto = updateData.nombreCompleto;
                originalData.nombreCompleto = updateData.nombreCompleto;
            }
            
            // Cerrar loader y mostrar éxito
            await swalInstance.close();
            
            let successMessage = 'Cambios guardados exitosamente';
            if (hasNameChanged && passwordChanged) {
                successMessage = 'Nombre y contraseña actualizados correctamente';
            } else if (hasNameChanged) {
                successMessage = 'Nombre actualizado correctamente';
            } else if (passwordChanged) {
                successMessage = 'Contraseña cambiada exitosamente';
            }
            
            await Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: successMessage,
                timer: 3000,
                showConfirmButton: false
            });
            
            showMessage(elements.mainMessage, 'success', successMessage);
            
        } catch (error) {
            console.error('Error guardando cambios:', error);
            await swalInstance.close();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al guardar los cambios',
                confirmButtonColor: '#e74c3c'
            });
        }
    }

    // ========== EVENTOS DEL MODAL ==========
    function setupModalHandlers() {
        elements.confirmChangeBtn.addEventListener('click', async () => {
            if (selectedFile) {
                const reader = new FileReader();
                
                reader.onload = async function(e) {
                    const imageBase64 = e.target.result;
                    
                    // Guardar en Firestore
                    const success = await savePhotoToFirestore(imageBase64, currentPhotoType);
                    
                    if (success) {
                        // Actualizar interfaz
                        if (currentPhotoType === 'profile') {
                            updatePhoto(elements.profileImage, elements.profilePlaceholder, imageBase64);
                            
                            Swal.fire({
                                icon: 'success',
                                title: '¡Foto actualizada!',
                                text: 'Tu foto de perfil se ha actualizado correctamente',
                                timer: 3000,
                                showConfirmButton: false
                            });
                        } else {
                            updatePhoto(elements.orgImage, elements.orgPlaceholder, imageBase64);
                            
                            Swal.fire({
                                icon: 'success',
                                title: '¡Logo actualizado!',
                                text: 'El logo de organización se ha actualizado correctamente',
                                timer: 3000,
                                showConfirmButton: false
                            });
                        }
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo guardar la imagen',
                            confirmButtonColor: '#e74c3c'
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
        });

        elements.photoModal.addEventListener('click', (e) => {
            if (e.target === elements.photoModal) {
                elements.photoModal.style.display = 'none';
                selectedFile = null;
                currentPhotoType = '';
            }
        });
    }

    // ========== EVENTOS DE BOTONES ==========
    function setupButtonHandlers() {
        // Guardar cambios
        elements.saveChangesBtn.addEventListener('click', saveChanges);
        
        // Cancelar
        elements.cancelBtn.addEventListener('click', () => {
            Swal.fire({
                title: '¿Cancelar cambios?',
                text: 'Se perderán los cambios no guardados',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
                }
            });
        });
        
        // Volver al dashboard
        elements.backToDashboard.addEventListener('click', () => {
            window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
        });
    }

    // ========== INICIALIZACIÓN ==========
    function initialize() {
        // Verificar autenticación
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                showMessage(elements.mainMessage, 'error', 'Debes iniciar sesión para acceder');
                setTimeout(() => {
                    window.location.href = '/users/visitors/login/login.html';
                }, 2000);
                return;
            }
            
            currentUser = user;
            console.log('✅ Usuario autenticado:', user.email);
            
            // Cargar datos del usuario
            await loadUserData(user.uid);
            
            // Configurar handlers
            setupPhotoHandlers();
            setupPasswordHandlers();
            setupModalHandlers();
            setupButtonHandlers();
            
            // Mostrar mensaje de bienvenida
            setTimeout(() => {
                showMessage(elements.mainMessage, 'info', 
                    'Puedes editar tu nombre, fotos y contraseña. Los campos bloqueados requieren permisos especiales.');
            }, 1000);
        });
    }

    // Iniciar
    initialize();
}