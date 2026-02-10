// editAdmin.js - Editor de perfil para administradores (Versión con UserManager)
// MODIFICADO: Todos los estilos de SweetAlert2 se manejan desde el CSS

// ==================== VARIABLES GLOBALES ====================
let selectedFile = null;
let currentPhotoType = '';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 Editor de perfil cargado - Versión con UserManager');
    
    try {
        console.log('🔍 Cargando módulos necesarios...');
        
        // Importar el módulo UserManager
        const userModule = await import('/clases/user.js');
        const { UserManager } = userModule;
        
        console.log('✅ Módulos cargados correctamente');
        
        // Instanciar UserManager
        const userManager = new UserManager();
        
        // Esperar a que UserManager cargue el usuario actual
        if (!userManager.currentUser) {
            console.log('🔄 Esperando que UserManager cargue el usuario actual...');
            
            const waitForUser = setInterval(() => {
                if (userManager.currentUser) {
                    clearInterval(waitForUser);
                    console.log('✅ Usuario cargado por UserManager:', userManager.currentUser.email);
                    iniciarEditor(userManager);
                }
            }, 500);
            
            // Timeout después de 5 segundos
            setTimeout(() => {
                if (!userManager.currentUser) {
                    clearInterval(waitForUser);
                    console.error('❌ Timeout esperando usuario');
                    
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de autenticación',
                        text: 'No se pudo cargar el usuario actual',
                        confirmButtonText: 'Ir al login'
                    }).then(() => {
                        window.location.href = '/users/visitors/login/login.html';
                    });
                }
            }, 5000);
        } else {
            iniciarEditor(userManager);
        }
        
    } catch (error) {
        console.error('❌ Error cargando módulos:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error de configuración',
            html: `
                <div style="text-align: left; font-size: 14px;">
                    <p><strong>No se pudo cargar los módulos necesarios</strong></p>
                    <p>Error: ${error.message}</p>
                    <p>Verifica que los archivos existan en las rutas correctas:</p>
                    <ul>
                        <li><code>/clases/user.js</code></li>
                    </ul>
                </div>
            `,
            confirmButtonText: 'Entendido',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
        });
    }
});

// ==================== FUNCIÓN PARA INICIAR EDITOR ====================

async function iniciarEditor(userManager) {
    console.log('👨‍💼 Iniciando editor de perfil...');
    
    // Resetear variables globales
    selectedFile = null;
    currentPhotoType = '';
    
    if (!userManager.currentUser) {
        console.warn('⚠️ Usuario no autenticado según UserManager');
        
        Swal.fire({
            icon: 'warning',
            title: 'Sesión expirada',
            text: 'Debes iniciar sesión para acceder al editor de perfil',
            timer: 4000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
        return;
    }
    
    // Obtener elementos del DOM
    const elements = getElements();
    
    try {
        await loadUserData(userManager, elements);
        setupBasicHandlers(elements);
        setupPhotoHandlers(elements);
        setupModalHandlers(elements, userManager);
        setupSaveHandler(elements, userManager);
        setupPasswordChangeHandler(elements, userManager);
        
        showMessage(elements.mainMessage, 'success', 
            `Editando perfil de: ${userManager.currentUser.email}`);
            
        console.log('✅ Editor de perfil inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando editor:', error);
        showMessage(elements.mainMessage, 'error', 
            'Error al cargar datos del usuario: ' + error.message);
    }
}

// ========== FUNCIONES DE UTILIDAD ==========

function getElements() {
    return {
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
        fullName: document.getElementById('fullName'),
        email: document.getElementById('email'),
        organizationName: document.getElementById('organizationName'),
        position: document.getElementById('position'),
        
        // Botones y mensajes
        saveChangesBtn: document.getElementById('saveChangesBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        backToDashboard: document.getElementById('backToDashboard'),
        mainMessage: document.getElementById('mainMessage')
    };
}

function validateAndDebugFile(file, type, elements) {
    console.log('🔍 Validando archivo:', {
        nombre: file.name,
        tipo: file.type,
        tamaño: Math.round(file.size/1024) + 'KB',
        tipoSeleccionado: type
    });
    
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showMessage(elements.mainMessage, 'error', 
            `Tipo de archivo no válido. Usa: JPEG, PNG, GIF o WEBP`);
        return false;
    }
    
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        showMessage(elements.mainMessage, 'error', 
            `La imagen es muy grande (${Math.round(file.size/1024)}KB). Máximo: 2MB`);
        return false;
    }
    
    if (!elements.photoModal) {
        console.error('❌ Elemento photoModal no encontrado');
        showMessage(elements.mainMessage, 'error', 'Error: No se encontró el modal de confirmación');
        return false;
    }
    
    if (!elements.previewImage) {
        console.error('❌ Elemento previewImage no encontrado');
        return false;
    }
    
    return true;
}

// ========== FUNCIÓN PARA VALIDAR NOMBRE (SOLO LETRAS) ==========

function validarNombreSoloLetras(nombre) {
    // Permite letras, espacios, tildes y letras ñ
    const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    return regex.test(nombre);
}

function mostrarErrorNombre(elements) {
    showMessage(elements.mainMessage, 'error', 
        'El nombre solo puede contener letras y espacios. No se permiten números ni caracteres especiales.');
    
    if (elements.fullName) {
        elements.fullName.style.borderColor = '#F44336';
        elements.fullName.style.boxShadow = '0 0 0 2px rgba(244, 67, 54, 0.2)';
        elements.fullName.focus();
        
        // Remover el estilo después de 3 segundos
        setTimeout(() => {
            elements.fullName.style.borderColor = '';
            elements.fullName.style.boxShadow = '';
        }, 3000);
    }
}

async function loadUserData(userManager, elements) {
    console.log('📥 Cargando datos del usuario con UserManager');
    
    try {
        if (!userManager.currentUser) {
            console.error('❌ No hay usuario actual en UserManager');
            throw new Error('No hay usuario autenticado');
        }
        
        const user = userManager.currentUser;
        
        console.log('✅ Usuario cargado por UserManager:', {
            id: user.id,
            nombre: user.nombreCompleto,
            cargo: user.cargo,
            organizacion: user.organizacion,
            email: user.correoElectronico
        });
        
        updateUI(elements, user);
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        throw error;
    }
}

function updateUI(elements, user) {
    console.log('🎨 Actualizando interfaz...');
    
    if (elements.fullName && user.nombreCompleto) {
        elements.fullName.value = user.nombreCompleto;
    }
    
    if (elements.email && user.correoElectronico) {
        elements.email.value = user.correoElectronico;
    }
    
    if (elements.organizationName && user.organizacion) {
        elements.organizationName.value = user.organizacion;
    }
    
    if (elements.position) {
        elements.position.value = user.cargo || 'Administrador';
    }
    
    // ==================== FOTO DE PERFIL ====================
    if (user.fotoUsuario && user.fotoUsuario.trim() !== '') {
        const profileUrl = user.getFotoUrl ? user.getFotoUrl() : user.fotoUsuario;
        console.log('📸 Cargando foto de perfil existente');
        
        if (elements.profileImage) {
            elements.profileImage.src = profileUrl;
            elements.profileImage.style.display = 'block';
            
            if (elements.profilePlaceholder) {
                elements.profilePlaceholder.style.display = 'none';
            }
            
            elements.profileImage.onload = function() {
                console.log('✅ Imagen de perfil cargada');
            };
            
            elements.profileImage.onerror = function() {
                console.warn('⚠️ Error cargando imagen de perfil');
                this.style.display = 'none';
                if (elements.profilePlaceholder) {
                    elements.profilePlaceholder.style.display = 'flex';
                }
            };
        }
    } else {
        console.log('ℹ️ No hay foto de usuario, mostrando placeholder');
        if (elements.profilePlaceholder) {
            elements.profilePlaceholder.style.display = 'flex';
        }
        if (elements.profileImage) {
            elements.profileImage.style.display = 'none';
        }
    }
    
    // ==================== LOGO DE ORGANIZACIÓN ====================
    if (user.fotoOrganizacion && user.fotoOrganizacion.trim() !== '') {
        const orgUrl = user.fotoOrganizacion;
        console.log('🏢 Cargando logo de organización');
        
        if (elements.orgImage) {
            elements.orgImage.src = orgUrl;
            elements.orgImage.style.display = 'block';
            
            if (elements.orgPlaceholder) {
                elements.orgPlaceholder.style.display = 'none';
            }
            
            elements.orgImage.onload = function() {
                console.log('✅ Logo de organización cargado');
            };
            
            elements.orgImage.onerror = function() {
                console.warn('⚠️ Error cargando logo de organización');
                this.style.display = 'none';
                if (elements.orgPlaceholder) {
                    elements.orgPlaceholder.style.display = 'flex';
                }
            };
        }
    } else {
        console.log('ℹ️ No hay logo de organización');
        if (elements.orgPlaceholder) {
            elements.orgPlaceholder.style.display = 'flex';
        }
        if (elements.orgImage) {
            elements.orgImage.style.display = 'none';
        }
    }
    
    console.log('✅ Interfaz actualizada');
}

function showMessage(element, type, text) {
    if (!element) return;
    
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-triangle'
    };
    
    element.className = `message-container ${type}`;
    element.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span>${text}</span>
        </div>
    `;
    element.style.display = 'block';
    
    // Auto-ocultar mensajes no críticos
    if (type !== 'error') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 7000);
    }
}

// ========== HANDLERS BÁSICOS ==========

function setupBasicHandlers(elements) {
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => {
            Swal.fire({
                title: '¿Cancelar cambios?',
                text: 'Se perderán los cambios no guardados',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
                }
            });
        });
    }
    
    if (elements.backToDashboard) {
        elements.backToDashboard.addEventListener('click', () => {
            window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
        });
    }
}

// ========== HANDLERS DE FOTOS ==========

function setupPhotoHandlers(elements) {
    if (!elements.profileCircle || !elements.orgCircle) return;
    
    // Foto de perfil
    elements.profileCircle.addEventListener('click', () => {
        if (elements.profileInput) elements.profileInput.click();
    });
    
    if (elements.editProfileOverlay) {
        elements.editProfileOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            if (elements.profileInput) elements.profileInput.click();
        });
    }
    
    if (elements.profileInput) {
        elements.profileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (validateAndDebugFile(file, 'profile', elements)) {
                    showPhotoModal(file, 'profile', elements);
                }
            }
            this.value = '';
        });
    }
    
    // Logo de organización
    elements.orgCircle.addEventListener('click', () => {
        if (elements.orgInput) elements.orgInput.click();
    });
    
    if (elements.editOrgOverlay) {
        elements.editOrgOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            if (elements.orgInput) elements.orgInput.click();
        });
    }
    
    if (elements.orgInput) {
        elements.orgInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (validateAndDebugFile(file, 'organization', elements)) {
                    showPhotoModal(file, 'organization', elements);
                }
            }
            this.value = '';
        });
    }
}

function showPhotoModal(file, type, elements) {
    console.log('📸 Mostrando modal para imagen:', type);
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        if (elements.previewImage) elements.previewImage.src = e.target.result;
        
        selectedFile = file;
        currentPhotoType = type;
        
        if (elements.modalTitle) {
            elements.modalTitle.textContent = type === 'profile' 
                ? 'CAMBIAR FOTO DE PERFIL' 
                : 'CAMBIAR LOGO DE ORGANIZACIÓN';
        }
        
        if (elements.modalMessage) {
            const fileSizeKB = Math.round(file.size / 1024);
            elements.modalMessage.textContent = type === 'profile'
                ? `¿Deseas actualizar tu foto de perfil? (${fileSizeKB} KB)`
                : `¿Deseas actualizar el logo de tu organización? (${fileSizeKB} KB)`;
        }
        
        if (elements.photoModal) {
            elements.photoModal.style.display = 'flex';
        }
    };
    
    reader.readAsDataURL(file);
}

function setupModalHandlers(elements, userManager) {
    if (!elements.confirmChangeBtn || !elements.cancelChangeBtn) {
        console.error('❌ Elementos del modal no encontrados');
        return;
    }
    
    elements.confirmChangeBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            console.warn('⚠️ No hay archivo seleccionado');
            Swal.fire({
                icon: 'warning',
                title: 'Sin archivo',
                text: 'No hay ninguna imagen seleccionada',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        
        Swal.fire({
            title: 'Procesando imagen...',
            html: 'Por favor espera mientras cargamos tu imagen',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            const imageBase64 = await readFileAsDataURL(selectedFile);
            
            const fieldToUpdate = currentPhotoType === 'profile' 
                ? { fotoUsuario: imageBase64 }
                : { fotoOrganizacion: imageBase64 };
            
            const currentUser = userManager.currentUser;
            if (!currentUser) {
                throw new Error('No hay usuario autenticado');
            }
            
            const success = await userManager.updateUser(
                currentUser.id,
                fieldToUpdate,
                currentUser.cargo,
                currentUser.organizacionCamelCase
            );
            
            if (success) {
                Swal.close();
                
                if (currentPhotoType === 'profile') {
                    if (elements.profileImage) {
                        elements.profileImage.src = imageBase64;
                        elements.profileImage.style.display = 'block';
                        
                        if (elements.profilePlaceholder) {
                            elements.profilePlaceholder.style.display = 'none';
                        }
                    }
                    currentUser.fotoUsuario = imageBase64;
                } else {
                    if (elements.orgImage) {
                        elements.orgImage.src = imageBase64;
                        elements.orgImage.style.display = 'block';
                        
                        if (elements.orgPlaceholder) {
                            elements.orgPlaceholder.style.display = 'none';
                        }
                    }
                    currentUser.fotoOrganizacion = imageBase64;
                }
                
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: currentPhotoType === 'profile' 
                        ? 'Foto de perfil actualizada' 
                        : 'Logo de organización actualizado',
                    timer: 5000,
                    showConfirmButton: false
                });
                
                console.log('✅ Imagen actualizada exitosamente');
            } else {
                throw new Error('No se pudo actualizar en la base de datos');
            }
        } catch (error) {
            console.error('❌ Error actualizando imagen:', error);
            Swal.close();
            
            let errorMessage = 'No se pudo guardar la imagen: ' + error.message;
            
            if (error.message.includes('permission') || error.message.includes('permiso')) {
                errorMessage = 'No tienes permisos para actualizar la imagen';
            } else if (error.message.includes('network') || error.message.includes('conexión')) {
                errorMessage = 'Error de conexión. Verifica tu internet';
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonText: 'Entendido'
            });
        } finally {
            if (elements.photoModal) {
                elements.photoModal.style.display = 'none';
            }
            selectedFile = null;
            currentPhotoType = '';
        }
    });
    
    elements.cancelChangeBtn.addEventListener('click', () => {
        if (elements.photoModal) {
            elements.photoModal.style.display = 'none';
        }
        selectedFile = null;
        currentPhotoType = '';
    });
    
    if (elements.photoModal) {
        elements.photoModal.addEventListener('click', (e) => {
            if (e.target === elements.photoModal) {
                elements.photoModal.style.display = 'none';
                selectedFile = null;
                currentPhotoType = '';
            }
        });
    }
}

// Función auxiliar para leer archivo como Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
    });
}

// ========== HANDLER DE GUARDADO MODIFICADO ==========

function setupSaveHandler(elements, userManager) {
    if (!elements.saveChangesBtn) return;
    
    elements.saveChangesBtn.addEventListener('click', async () => {
        // Validar que el campo no esté vacío
        if (!elements.fullName || !elements.fullName.value.trim()) {
            showMessage(elements.mainMessage, 'error', 'El nombre completo es obligatorio');
            if (elements.fullName) elements.fullName.focus();
            return;
        }
        
        // Validar que solo contenga letras
        const nombre = elements.fullName.value.trim();
        if (!validarNombreSoloLetras(nombre)) {
            mostrarErrorNombre(elements);
            return;
        }
        
        // Si el nombre es válido, proceder con el guardado...
        const currentUser = userManager.currentUser;
        if (!currentUser) {
            showMessage(elements.mainMessage, 'error', 'No hay usuario autenticado');
            return;
        }
        
        Swal.fire({
            title: 'Guardando cambios...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            const updateData = {
                nombreCompleto: nombre
            };
            
            await userManager.updateUser(
                currentUser.id,
                updateData,
                currentUser.cargo,
                currentUser.organizacionCamelCase
            );
            
            currentUser.nombreCompleto = updateData.nombreCompleto;
            
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Datos actualizados correctamente',
                timer: 5000,
                showConfirmButton: false
            });
            
            showMessage(elements.mainMessage, 'success', 'Cambios guardados exitosamente');
            
        } catch (error) {
            console.error('❌ Error guardando cambios:', error);
            Swal.close();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron guardar los cambios: ' + error.message,
                confirmButtonText: 'Entendido'
            });
        }
    });
    
    // Agregar validación en tiempo real
    if (elements.fullName) {
        elements.fullName.addEventListener('input', function() {
            const nombre = this.value.trim();
            
            // Limpiar estilo si es válido
            if (validarNombreSoloLetras(nombre) || nombre === '') {
                this.style.borderColor = '';
                this.style.boxShadow = '';
                
                // Ocultar mensaje de error si está visible
                if (elements.mainMessage && 
                    elements.mainMessage.textContent.includes('solo puede contener letras')) {
                    elements.mainMessage.style.display = 'none';
                }
            }
        });
        
        // También validar al perder el foco
        elements.fullName.addEventListener('blur', function() {
            const nombre = this.value.trim();
            if (nombre && !validarNombreSoloLetras(nombre)) {
                mostrarErrorNombre(elements);
            }
        });
    }
}

// ========== FUNCIÓN PARA CAMBIAR CONTRASEÑA ==========

function setupPasswordChangeHandler(elements, userManager) {
    if (!document.getElementById('changePasswordBtn')) {
        const permissionsNote = document.querySelector('.permissions-note');
        
        if (permissionsNote) {
            const passwordSection = document.createElement('div');
            passwordSection.className = 'password-section-simple';
            
            const changePasswordBtn = document.createElement('button');
            changePasswordBtn.id = 'changePasswordBtn';
            changePasswordBtn.type = 'button';
            changePasswordBtn.className = 'btn-change-password';
            changePasswordBtn.innerHTML = `
                <i class="fas fa-key"></i> CAMBIAR CONTRASEÑA
            `;
            
            changePasswordBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = 'var(--shadow-normal)';
            });
            
            changePasswordBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'var(--shadow-small)';
            });
            
            const description = document.createElement('p');
            description.className = 'password-change-info';
            description.textContent = 'Se te enviará un enlace seguro a tu correo electrónico para restablecer tu contraseña.';
            
            changePasswordBtn.addEventListener('click', () => {
                showPasswordResetConfirmation(userManager);
            });
            
            passwordSection.appendChild(changePasswordBtn);
            passwordSection.appendChild(description);
            
            permissionsNote.parentNode.insertBefore(passwordSection, permissionsNote.nextSibling);
            
            console.log('✅ Botón de cambiar contraseña agregado');
        } else {
            console.warn('⚠️ No se encontró la nota de permisos');
        }
    }
}

// ========== FUNCIÓN ACTUALIZADA PARA CAMBIAR CONTRASEÑA ==========

async function showPasswordResetConfirmation(userManager) {
    try {
        const currentUser = userManager.currentUser;
        if (!currentUser || !currentUser.correoElectronico) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo obtener el correo electrónico del usuario',
                confirmButtonText: 'ENTENDIDO'
            });
            return;
        }
        
        const userEmail = currentUser.correoElectronico;
        
        const result = await Swal.fire({
            title: '¿CAMBIAR CONTRASEÑA?',
            html: `
                <div style="text-align: center; padding: 10px 0;">
                    <div style="font-size: 60px; margin-bottom: 15px;">
                        <i class="fas fa-key"></i>
                    </div>
                    <p style="margin-bottom: 15px;">
                        Se enviará un enlace de restablecimiento a tu correo electrónico.
                    </p>
                    <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Correo asociado:</strong></p>
                        <p style="font-weight: bold;">
                            ${userEmail}
                        </p>
                    </div>
                    <div style="padding: 10px; border-radius: 6px; margin: 10px 0;">
                        <p style="font-size: 14px; margin: 0;">
                            <i class="fas fa-info-circle"></i> 
                            El enlace expirará en 1 hora.
                        </p>
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ENVIAR ENLACE',
            cancelButtonText: 'CANCELAR',
            reverseButtons: true,
            allowOutsideClick: false,
            backdrop: true,
            timer: 6000
        });
        
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Enviando enlace...',
                html: 'Por favor espera mientras procesamos tu solicitud.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                const firebaseModule = await import('/config/firebase-config.js');
                const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
                
                const actionCodeSettings = {
                    url: 'https://centinela-mx.web.app/verifyEmail.html',
                    handleCodeInApp: false
                };
                
                console.log('📧 Enviando correo de restablecimiento a:', userEmail);
                await sendPasswordResetEmail(firebaseModule.auth, userEmail, actionCodeSettings);
                
                Swal.close();
                
                await Swal.fire({
                    icon: 'success',
                    title: '¡ENLACE ENVIADO EXITOSAMENTE!',
                    html: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 60px; margin-bottom: 20px;">
                                <i class="fas fa-paper-plane"></i>
                            </div>
                            
                            <h3 style="margin-bottom: 15px;">
                                Correo enviado correctamente
                            </h3>
                            
                            <div style="background: var(--color-bg-secondary); padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>📨 Destinatario:</strong> ${userEmail}</p>
                                <p><strong>⏱️ Válido por:</strong> 1 hora</p>
                                <p><strong>🔗 Redirigirá a:</strong> verifyEmail.html</p>
                            </div>
                            
                            <div style="padding: 15px; margin: 20px 0;">
                                <h4 style="margin-bottom: 10px;">
                                    <i class="fas fa-check"></i> ¿Qué hacer ahora?
                                </h4>
                                <ol style="text-align: left; margin: 0; padding-left: 20px;">
                                    <li><strong>Abre tu correo</strong> (revisa spam si no lo ves)</li>
                                    <li><strong>Haz clic en el enlace</strong> "Restablecer contraseña"</li>
                                    <li><strong>Ingresa tu nueva contraseña</strong> (2 veces para confirmar)</li>
                                    <li><strong>Haz clic en "CAMBIAR CONTRASEÑA"</strong></li>
                                    <li><strong>Inicia sesión</strong> con tu nueva contraseña</li>
                                </ol>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'ENTENDIDO, REVISARÉ MI CORREO',
                    allowOutsideClick: false,
                    showCloseButton: true,
                    width: '650px',
                    timer: 8000
                });
                
            } catch (error) {
                Swal.close();
                console.error('❌ Error enviando correo:', error);
                
                let errorMessage = 'Ocurrió un error al enviar el correo de restablecimiento';
                
                switch(error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'Usuario no encontrado';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Correo inválido';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Demasiados intentos';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Error de conexión';
                        break;
                    default:
                        errorMessage = 'Error del sistema: ' + (error.message || 'Desconocido');
                }
                
                Swal.fire({
                    icon: 'error',
                    title: errorMessage,
                    text: 'Por favor, intenta nuevamente más tarde.',
                    confirmButtonText: 'ENTENDIDO'
                });
            }
        }
        
    } catch (error) {
        console.error('Error en showPasswordResetConfirmation:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error inesperado',
            text: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
            confirmButtonText: 'ENTENDIDO'
        });
    }
}

console.log('✅ editAdmin.js cargado - Todos los estilos de SweetAlert2 en CSS');