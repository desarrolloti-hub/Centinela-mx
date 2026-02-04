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
    let userData = {}; // AQUÍ LO DECLARAMOS
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
            // Cargar datos del usuario - PASA userData COMO PARÁMETRO
            await loadUserData(user.uid, db, elements, userData);
            
            // Configurar handlers completos
            setupPhotoHandlers(elements);
            setupModalHandlers(elements, db, currentUser, userData);
            setupSaveHandler(elements, db, currentUser, userData);
            
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
        currentPassword: document.getElementById('currentPassword'),
        newPassword: document.getElementById('newPassword'),
        confirmPassword: document.getElementById('confirmPassword'),
        
        // Botones y mensajes
        saveChangesBtn: document.getElementById('saveChangesBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        backToDashboard: document.getElementById('backToDashboard'),
        mainMessage: document.getElementById('mainMessage'),
        passwordMessage: document.getElementById('passwordMessage')
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

console.log('✅ editAdmin.js cargado');