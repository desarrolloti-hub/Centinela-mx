// editAdmin.js - Editor de perfil para administradores
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 Editor de perfil cargado');
    
    try {
        console.log('🔍 Cargando Firebase desde /config/firebase-config.js');
        
        // IMPORTANTE: Usa la ruta correcta desde editAdmin.html
        const firebaseModule = await import('../../../config/firebase-config.js');
        console.log('✅ Firebase configurado correctamente');
        
        // Iniciar la aplicación
        initProfileEditor(firebaseModule.auth, firebaseModule.db);
        
    } catch (error) {
        console.error('❌ Error cargando Firebase:', error);
        
        // Mostrar error amigable
        Swal.fire({
            icon: 'error',
            title: 'Error de configuración',
            html: `
                <div style="text-align: left; font-size: 14px;">
                    <p><strong>No se pudo cargar la configuración de Firebase</strong></p>
                    <p>Error: ${error.message}</p>
                    <p>El archivo debe estar en: <code>/config/firebase-config.js</code></p>
                </div>
            `,
            confirmButtonText: 'Entendido',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = '/users/admin/dashAdmin/dashAdmin.html';
        });
    }
});

// ==================== EDITOR PRINCIPAL ====================

async function initProfileEditor(auth, db) {
    console.log('👨‍💼 Inicializando editor de perfil...');
    
    // Obtener elementos del DOM
    const elements = getElements();
    
    // Variables de estado
    let currentUser = null;
    let userData = {};
    let selectedFile = null;
    let currentPhotoType = '';
    
    // Configurar handlers básicos primero
    setupBasicHandlers(elements);
    
    // Verificar autenticación
    auth.onAuthStateChanged(async (user) => {
        console.log('🔐 Estado de autenticación:', user ? 'Autenticado' : 'No autenticado');
        
        if (!user) {
            console.warn('⚠️ Usuario no autenticado, redirigiendo...');
            
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
        
        currentUser = user;
        console.log('✅ Usuario autenticado:', user.email);
        
        try {
            // Cargar datos del usuario
            await loadUserData(user.uid, db, elements, userData);
            
            // Configurar handlers completos
            setupPhotoHandlers(elements);
            setupModalHandlers(elements, db, currentUser, userData);
            setupSaveHandler(elements, db, currentUser, userData);
            
            // Configurar handler para cambiar contraseña (POSICIÓN CORREGIDA)
            setupPasswordChangeHandler(elements, auth, currentUser);
            
            // Mostrar mensaje de bienvenida
            showMessage(elements.mainMessage, 'success', 
                `Editando perfil de: ${user.email}`);
                
        } catch (error) {
            console.error('❌ Error inicializando editor:', error);
            showMessage(elements.mainMessage, 'error', 
                'Error al cargar datos del usuario: ' + error.message);
        }
    });
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

async function loadUserData(userId, db, elements, userDataRef) {
    console.log('📥 Cargando datos del usuario:', userId);
    
    try {
        // Importar Firestore
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
        
        // Referencia al documento del administrador
        const userRef = doc(db, "administradores", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            // Asignar los datos al objeto userDataRef (que es userData del scope superior)
            Object.assign(userDataRef, userSnap.data());
            console.log('✅ Datos cargados:', userDataRef);
            
            // Actualizar interfaz
            updateUI(elements, userDataRef);
            
        } else {
            console.error('❌ Usuario no encontrado en Firestore');
            showMessage(elements.mainMessage, 'error', 
                'No se encontraron datos del usuario en la base de datos');
        }
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        throw error;
    }
}

function updateUI(elements, data) {
    console.log('🎨 Actualizando interfaz...');
    
    // Datos personales
    if (elements.fullName && data.nombreCompleto) {
        elements.fullName.value = data.nombreCompleto;
    }
    
    if (elements.email && data.correoElectronico) {
        elements.email.value = data.correoElectronico;
    }
    
    if (elements.organizationName && data.organizacion) {
        elements.organizationName.value = data.organizacion;
    }
    
    if (elements.position) {
        elements.position.value = data.cargo || 'Administrador';
    }
    
    // Fotos
    if (data.fotoUsuario) {
        const profileUrl = formatImageUrl(data.fotoUsuario);
        if (elements.profileImage) {
            elements.profileImage.src = profileUrl;
            elements.profileImage.style.display = 'block';
        }
        if (elements.profilePlaceholder) {
            elements.profilePlaceholder.style.display = 'none';
        }
    }
    
    if (data.fotoOrganizacion) {
        const orgUrl = formatImageUrl(data.fotoOrganizacion);
        if (elements.orgImage) {
            elements.orgImage.src = orgUrl;
            elements.orgImage.style.display = 'block';
        }
        if (elements.orgPlaceholder) {
            elements.orgPlaceholder.style.display = 'none';
        }
    }
    
    console.log('✅ Interfaz actualizada');
}

function formatImageUrl(imageData) {
    if (!imageData) return '';
    if (imageData.startsWith('http') || imageData.startsWith('data:')) return imageData;
    return `data:image/jpeg;base64,${imageData}`;
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
    // Mostrar/ocultar contraseña
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input && input.type === 'password') {
                input.type = 'text';
                if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else if (input) {
                input.type = 'password';
                if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
    
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

function setupModalHandlers(elements, db, currentUser, userData) {
    if (!elements.confirmChangeBtn || !elements.cancelChangeBtn) return;
    
    elements.confirmChangeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            const imageBase64 = e.target.result;
            
            try {
                // Guardar en Firebase
                const success = await savePhotoToFirestore(imageBase64, currentPhotoType, db, currentUser);
                
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
                        // Actualizar datos locales
                        if (userData) userData.fotoUsuario = imageBase64;
                    } else {
                        if (elements.orgImage) {
                            elements.orgImage.src = imageBase64;
                            elements.orgImage.style.display = 'block';
                        }
                        if (elements.orgPlaceholder) {
                            elements.orgPlaceholder.style.display = 'none';
                        }
                        // Actualizar datos locales
                        if (userData) userData.fotoOrganizacion = imageBase64;
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

async function savePhotoToFirestore(imageBase64, type, db, currentUser) {
    try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
        
        const updateData = type === 'profile' 
            ? { fotoUsuario: imageBase64 }
            : { fotoOrganizacion: imageBase64 };
        
        updateData.fechaActualizacion = new Date();
        
        const userRef = doc(db, "administradores", currentUser.uid);
        await updateDoc(userRef, updateData);
        
        console.log(`✅ ${type} guardado en Firestore`);
        return true;
    } catch (error) {
        console.error(`❌ Error guardando ${type}:`, error);
        throw error;
    }
}

// ========== HANDLER DE GUARDADO ==========

function setupSaveHandler(elements, db, currentUser, userData) {
    if (!elements.saveChangesBtn) return;
    
    elements.saveChangesBtn.addEventListener('click', async () => {
        // Validar nombre completo
        if (!elements.fullName || !elements.fullName.value.trim()) {
            showMessage(elements.mainMessage, 'error', 'El nombre completo es obligatorio');
            if (elements.fullName) elements.fullName.focus();
            return;
        }
        
        // Mostrar loader
        Swal.fire({
            title: 'Guardando cambios...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
            
            // Preparar datos a actualizar
            const updateData = {
                nombreCompleto: elements.fullName.value.trim(),
                fechaActualizacion: new Date()
            };
            
            // Guardar en Firestore
            const userRef = doc(db, "administradores", currentUser.uid);
            await updateDoc(userRef, updateData);
            
            // Actualizar datos locales
            if (userData) {
                userData.nombreCompleto = updateData.nombreCompleto;
            }
            
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

// ========== FUNCIÓN PARA CAMBIAR CONTRASEÑA (POSICIÓN CORREGIDA) ==========

function addPasswordButtonStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .btn-change-password {
            position: relative;
            overflow: hidden;
        }
        
        .btn-change-password:active {
            transform: translateY(1px);
        }
        
        .btn-change-password i {
            margin-right: 8px;
            transition: transform 0.3s ease;
        }
        
        .btn-change-password:hover i {
            transform: rotate(-10deg);
        }
    `;
    document.head.appendChild(style);
}

function setupPasswordChangeHandler(elements, auth, currentUser) {
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
                showPasswordResetConfirmation(auth, currentUser);
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

async function showPasswordResetConfirmation(auth, currentUser) {
    try {
        const userEmail = currentUser?.email;
        
        if (!userEmail) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo obtener el correo electrónico del usuario',
                confirmButtonText: 'ENTENDIDO'
            });
            return;
        }
        
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
                // Importar funciones de Firebase
                const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
                
                // CONFIGURACIÓN CRÍTICA - URL CORRECTA
                const actionCodeSettings = {
                    url: 'https://centinela-mx.web.app/verifyEmail.html',
                    handleCodeInApp: false
                };
                
                console.log('📧 Enviando correo de restablecimiento a:', userEmail);
                console.log('🔗 URL de redirección configurada:', actionCodeSettings.url);
                
                // Enviar correo con configuración personalizada
                await sendPasswordResetEmail(auth, userEmail, actionCodeSettings);
                
                // Cerrar loader
                Swal.close();
                
                // Mostrar éxito con instrucciones detalladas
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
                            
                            <div style="background: #fff3cd; border: 1px solid #ffecb5; border-radius: 8px; padding: 15px; margin-top: 20px;">
                                <h4 style="color: #856404; margin-bottom: 10px;">
                                    <i class="fas fa-exclamation-triangle"></i> NOTA IMPORTANTE
                                </h4>
                                <p style="color: #856404; margin: 0; font-size: 14px;">
                                    El enlace tendrá la forma:<br>
                                    <code style="font-size: 12px; background: #fff; padding: 5px; display: inline-block; margin-top: 5px;">
                                        https://centinela-mx.web.app/verifyEmail.html?mode=action&oobCode=XXXXXXXX
                                    </code>
                                </p>
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
                let errorDetails = '';
                
                switch(error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'Usuario no encontrado';
                        errorDetails = `No existe una cuenta con el correo: ${userEmail}`;
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Correo inválido';
                        errorDetails = 'El formato del correo electrónico no es válido';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Demasiados intentos';
                        errorDetails = 'Por seguridad, debes esperar antes de solicitar otro enlace';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Error de conexión';
                        errorDetails = 'Verifica tu conexión a internet e intenta nuevamente';
                        break;
                    case 'auth/argument-error':
                        errorMessage = 'Error en la configuración';
                        errorDetails = 'La URL de redirección puede ser inválida. Verifica la configuración en Firebase Console.';
                        break;
                    default:
                        errorMessage = 'Error del sistema';
                        errorDetails = `Código: ${error.code || 'N/A'} - Mensaje: ${error.message}`;
                }
                
                // Mostrar error detallado
                Swal.fire({
                    icon: 'error',
                    title: errorMessage,
                    html: `
                        <div style="text-align: left;">
                            <p>${errorDetails}</p>
                            <div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-top: 15px;">
                                <p style="color: #856404; margin: 0; font-size: 14px;">
                                    <i class="fas fa-lightbulb"></i> 
                                    <strong>Solución:</strong> 
                                    Verifica que en Firebase Console > Authentication > Templates > Password reset, 
                                    la URL personalizada sea:<br>
                                    <code style="display: block; background: #fff; padding: 5px; margin-top: 5px; border-radius: 4px; font-size: 12px;">
                                        https://centinela-mx.web.app/verifyEmail.html
                                    </code>
                                </p>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#d33',
                    allowOutsideClick: true
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

console.log('✅ editAdmin.js cargado');