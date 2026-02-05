// editAdmin.js - Editor de perfil para administradores (Versión con UserManager)
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
        // UserManager ya maneja la autenticación internamente
        if (!userManager.currentUser) {
            console.log('🔄 Esperando que UserManager cargue el usuario actual...');
            
            // Podemos esperar un momento o verificar periódicamente
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
                    
                    // Mostrar error y redirigir
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
            // Si ya está cargado, iniciar directamente
            iniciarEditor(userManager);
        }
        
    } catch (error) {
        console.error('❌ Error cargando módulos:', error);
        
        // Mostrar error amigable
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
    
    // Verificar si el usuario está autenticado a través de UserManager
    if (!userManager.currentUser) {
        console.warn('⚠️ Usuario no autenticado según UserManager');
        
        Swal.fire({
            icon: 'warning',
            title: 'Sesión expirada',
            text: 'Debes iniciar sesión para acceder al editor de perfil',
            timer: 3000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
        return;
    }
    
    // Obtener elementos del DOM
    const elements = getElements();
    
    // Variables de estado
    let selectedFile = null;
    let currentPhotoType = '';
    
    try {
        // Cargar datos del usuario usando UserManager
        await loadUserData(userManager, elements);
        
        // Configurar handlers básicos
        setupBasicHandlers(elements);
        
        // Configurar handlers de fotos
        setupPhotoHandlers(elements);
        setupModalHandlers(elements, userManager);
        
        // Configurar handler de guardado
        setupSaveHandler(elements, userManager);
        
        // Configurar handler para cambiar contraseña
        setupPasswordChangeHandler(elements, userManager);
        
        // Mostrar mensaje de bienvenida
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

async function loadUserData(userManager, elements) {
    console.log('📥 Cargando datos del usuario con UserManager');
    
    try {
        // Verificar que UserManager tenga el usuario actual
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
        
        // Actualizar interfaz
        updateUI(elements, user);
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        throw error;
    }
}

function updateUI(elements, user) {
    console.log('🎨 Actualizando interfaz...');
    
    // Datos personales
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
    
    // Fotos - Usar el método getFotoUrl() de la clase User
    if (user.fotoUsuario) {
        const profileUrl = user.getFotoUrl();
        if (elements.profileImage) {
            elements.profileImage.src = profileUrl;
            elements.profileImage.style.display = 'block';
            
            // Agregar manejador de error en caso de imagen rota
            elements.profileImage.onerror = function() {
                console.warn('⚠️ Error cargando imagen de perfil, usando placeholder');
                this.style.display = 'none';
                if (elements.profilePlaceholder) {
                    elements.profilePlaceholder.style.display = 'flex';
                }
            };
        }
        if (elements.profilePlaceholder) {
            elements.profilePlaceholder.style.display = 'none';
        }
    }
    
    if (user.fotoOrganizacion) {
        const orgUrl = user.fotoOrganizacion;
        if (elements.orgImage) {
            elements.orgImage.src = orgUrl;
            elements.orgImage.style.display = 'block';
            
            // Agregar manejador de error
            elements.orgImage.onerror = function() {
                console.warn('⚠️ Error cargando logo de organización');
                this.style.display = 'none';
                if (elements.orgPlaceholder) {
                    elements.orgPlaceholder.style.display = 'flex';
                }
            };
        }
        if (elements.orgPlaceholder) {
            elements.orgPlaceholder.style.display = 'none';
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
        }, 5000);
    }
}

// ========== HANDLERS BÁSICOS ==========

function setupBasicHandlers(elements) {
    // Botón cancelar
    if (elements.cancelBtn) {
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
    }
    
    // Volver al dashboard
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
            if (file) showPhotoModal(file, 'profile', elements);
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
            if (file) showPhotoModal(file, 'organization', elements);
            this.value = '';
        });
    }
}

function showPhotoModal(file, type, elements) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        if (elements.previewImage) elements.previewImage.src = e.target.result;
        currentPhotoType = type;
        selectedFile = file;
        
        if (elements.modalTitle) {
            elements.modalTitle.textContent = type === 'profile' 
                ? 'CAMBIAR FOTO DE PERFIL' 
                : 'CAMBIAR LOGO DE ORGANIZACIÓN';
        }
        
        if (elements.modalMessage) {
            elements.modalMessage.textContent = type === 'profile'
                ? '¿Deseas actualizar tu foto de perfil?'
                : '¿Deseas actualizar el logo de tu organización?';
        }
        
        if (elements.photoModal) elements.photoModal.style.display = 'flex';
    };
    
    reader.readAsDataURL(file);
}

function setupModalHandlers(elements, userManager) {
    if (!elements.confirmChangeBtn || !elements.cancelChangeBtn) return;
    
    elements.confirmChangeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            const imageBase64 = e.target.result;
            
            try {
                // Determinar el campo a actualizar
                const fieldToUpdate = currentPhotoType === 'profile' 
                    ? { fotoUsuario: imageBase64 }
                    : { fotoOrganizacion: imageBase64 };
                
                // Obtener usuario actual
                const currentUser = userManager.currentUser;
                if (!currentUser) {
                    throw new Error('No hay usuario autenticado');
                }
                
                // Actualizar usando UserManager
                const success = await userManager.updateUser(
                    currentUser.id,
                    fieldToUpdate,
                    currentUser.cargo,
                    currentUser.organizacionCamelCase
                );
                
                if (success) {
                    // Actualizar interfaz
                    if (currentPhotoType === 'profile') {
                        if (elements.profileImage) {
                            elements.profileImage.src = imageBase64;
                            elements.profileImage.style.display = 'block';
                        }
                        if (elements.profilePlaceholder) {
                            elements.profilePlaceholder.style.display = 'none';
                        }
                        
                        // Actualizar el objeto user en memoria
                        currentUser.fotoUsuario = imageBase64;
                    } else {
                        if (elements.orgImage) {
                            elements.orgImage.src = imageBase64;
                            elements.orgImage.style.display = 'block';
                        }
                        if (elements.orgPlaceholder) {
                            elements.orgPlaceholder.style.display = 'none';
                        }
                        
                        // Actualizar el objeto user en memoria
                        currentUser.fotoOrganizacion = imageBase64;
                    }
                    
                    Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: currentPhotoType === 'profile' 
                            ? 'Foto de perfil actualizada' 
                            : 'Logo de organización actualizado',
                        timer: 3000,
                        showConfirmButton: false
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo guardar la imagen: ' + error.message
                });
            }
            
            if (elements.photoModal) elements.photoModal.style.display = 'none';
            selectedFile = null;
            currentPhotoType = '';
        };
        
        reader.readAsDataURL(selectedFile);
    });
    
    elements.cancelChangeBtn.addEventListener('click', () => {
        if (elements.photoModal) elements.photoModal.style.display = 'none';
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

// ========== HANDLER DE GUARDADO ==========

function setupSaveHandler(elements, userManager) {
    if (!elements.saveChangesBtn) return;
    
    elements.saveChangesBtn.addEventListener('click', async () => {
        // Validar nombre completo
        if (!elements.fullName || !elements.fullName.value.trim()) {
            showMessage(elements.mainMessage, 'error', 'El nombre completo es obligatorio');
            if (elements.fullName) elements.fullName.focus();
            return;
        }
        
        // Obtener usuario actual
        const currentUser = userManager.currentUser;
        if (!currentUser) {
            showMessage(elements.mainMessage, 'error', 'No hay usuario autenticado');
            return;
        }
        
        // Mostrar loader
        Swal.fire({
            title: 'Guardando cambios...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            // Preparar datos a actualizar
            const updateData = {
                nombreCompleto: elements.fullName.value.trim()
            };
            
            // Actualizar usando UserManager
            await userManager.updateUser(
                currentUser.id,
                updateData,
                currentUser.cargo,
                currentUser.organizacionCamelCase
            );
            
            // Actualizar el objeto user en memoria
            currentUser.nombreCompleto = updateData.nombreCompleto;
            
            // Mostrar éxito
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Datos actualizados correctamente',
                timer: 3000,
                showConfirmButton: false
            });
            
            showMessage(elements.mainMessage, 'success', 'Cambios guardados exitosamente');
            
        } catch (error) {
            console.error('❌ Error guardando cambios:', error);
            Swal.close();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron guardar los cambios: ' + error.message
            });
        }
    });
}

// ========== FUNCIÓN PARA CAMBIAR CONTRASEÑA ==========

function setupPasswordChangeHandler(elements, userManager) {
    // Solo crear el botón si no existe
    if (!document.getElementById('changePasswordBtn')) {
        // Buscar el contenedor correcto para insertar el botón
        const permissionsNote = document.querySelector('.permissions-note');
        
        if (permissionsNote) {
            // Crear contenedor para el botón de cambiar contraseña
            const passwordSection = document.createElement('div');
            passwordSection.className = 'password-section-simple';
            passwordSection.style.cssText = `
                background: var(--color-bg-primary);
                padding: 1.2rem;
                border-radius: var(--border-radius-medium);
                margin: 1.5rem 0;
                border: 1px solid var(--color-border-light);
                text-align: center;
            `;
            
            // Crear botón
            const changePasswordBtn = document.createElement('button');
            changePasswordBtn.id = 'changePasswordBtn';
            changePasswordBtn.type = 'button';
            changePasswordBtn.className = 'btn-change-password';
            changePasswordBtn.innerHTML = `
                <i class="fas fa-key"></i> CAMBIAR CONTRASEÑA
            `;
            changePasswordBtn.style.cssText = `
                background: linear-gradient(135deg, var(--color-accent-secondary), var(--color-accent-primary));
                color: white;
                border: none;
                border-radius: var(--border-radius-small);
                padding: 12px 24px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                font-family: 'Rajdhani', sans-serif;
                transition: var(--transition-default);
                cursor: pointer;
                width: 100%;
                max-width: 300px;
                margin-top: 10px;
                box-shadow: var(--shadow-small);
                display: inline-block;
            `;
            
            // Crear descripción
            const description = document.createElement('p');
            description.className = 'password-change-info';
            description.textContent = 'Se te enviará un enlace seguro a tu correo electrónico para restablecer tu contraseña.';
            description.style.cssText = `
                color: var(--color-text-secondary);
                font-size: 0.75rem;
                line-height: 1.4;
                margin: 10px 0 0 0;
            `;
            
            // Agregar eventos hover al botón
            changePasswordBtn.addEventListener('mouseenter', function() {
                this.style.background = 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))';
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = 'var(--shadow-normal)';
            });
            
            changePasswordBtn.addEventListener('mouseleave', function() {
                this.style.background = 'linear-gradient(135deg, var(--color-accent-secondary), var(--color-accent-primary))';
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'var(--shadow-small)';
            });
            
            // Agregar evento click
            changePasswordBtn.addEventListener('click', () => {
                showPasswordResetConfirmation(userManager);
            });
            
            // Agregar elementos al contenedor
            passwordSection.appendChild(changePasswordBtn);
            passwordSection.appendChild(description);
            
            // Insertar después de la nota de permisos
            permissionsNote.parentNode.insertBefore(passwordSection, permissionsNote.nextSibling);
            
            console.log('✅ Botón de cambiar contraseña agregado en posición correcta');
        } else {
            console.warn('⚠️ No se encontró la nota de permisos para insertar el botón');
        }
    }
}

// ========== FUNCIÓN ACTUALIZADA PARA CAMBIAR CONTRASEÑA ==========

async function showPasswordResetConfirmation(userManager) {
    try {
        // Obtener usuario actual desde UserManager
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
        
        // Mostrar confirmación
        const result = await Swal.fire({
            title: '¿CAMBIAR CONTRASEÑA?',
            html: `
                <div style="text-align: center; padding: 10px 0;">
                    <div style="font-size: 60px; color: #ff9800; margin-bottom: 15px;">
                        <i class="fas fa-key"></i>
                    </div>
                    <p style="color: var(--color-text-secondary); margin-bottom: 15px;">
                        Se enviará un enlace de restablecimiento a tu correo electrónico.
                    </p>
                    <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Correo asociado:</strong></p>
                        <p style="color: var(--color-accent-primary); font-weight: bold;">
                            ${userEmail}
                        </p>
                    </div>
                    <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0;">
                        <p style="color: #856404; font-size: 14px; margin: 0;">
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
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            reverseButtons: true,
            allowOutsideClick: false,
            backdrop: true
        });
        
        if (result.isConfirmed) {
            // Mostrar loader
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
                // Aquí deberías tener un método en UserManager para enviar el correo de restablecimiento
                // Por ahora, asumimos que UserManager puede acceder al auth necesario
                
                // IMPORTANTE: Necesitas agregar un método sendPasswordResetEmail a UserManager
                // o importar directamente el auth de firebase-config.js
                
                // Opción 1: Si UserManager tiene acceso a auth
                // await userManager.sendPasswordResetEmail(userEmail);
                
                // Opción 2: Importar auth directamente (temporalmente)
                const firebaseModule = await import('/config/firebase-config.js');
                const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
                
                const actionCodeSettings = {
                    url: 'https://centinela-mx.web.app/verifyEmail.html',
                    handleCodeInApp: false
                };
                
                console.log('📧 Enviando correo de restablecimiento a:', userEmail);
                await sendPasswordResetEmail(firebaseModule.auth, userEmail, actionCodeSettings);
                
                // Cerrar loader
                Swal.close();
                
                // Mostrar éxito
                await Swal.fire({
                    icon: 'success',
                    title: '¡ENLACE ENVIADO EXITOSAMENTE!',
                    html: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 60px; color: #28a745; margin-bottom: 20px;">
                                <i class="fas fa-paper-plane"></i>
                            </div>
                            
                            <h3 style="color: var(--color-text-primary); margin-bottom: 15px;">
                                Correo enviado correctamente
                            </h3>
                            
                            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>📨 Destinatario:</strong> ${userEmail}</p>
                                <p><strong>⏱️ Válido por:</strong> 1 hora</p>
                                <p><strong>🔗 Redirigirá a:</strong> verifyEmail.html</p>
                            </div>
                            
                            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                <h4 style="color: #155724; margin-bottom: 10px;">
                                    <i class="fas fa-check"></i> ¿Qué hacer ahora?
                                </h4>
                                <ol style="text-align: left; margin: 0; padding-left: 20px; color: #0c5460;">
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
                    confirmButtonColor: '#28a745',
                    allowOutsideClick: false,
                    showCloseButton: true,
                    width: '650px'
                });
                
            } catch (error) {
                // Cerrar loader
                Swal.close();
                
                console.error('❌ Error enviando correo:', error);
                
                // Manejar errores específicos
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
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#d33'
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

console.log('✅ editAdmin.js cargado con UserManager - Sin autenticación directa');