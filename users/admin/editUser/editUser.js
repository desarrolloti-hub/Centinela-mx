// editUser.js - Editor de colaboradores (Versión limpia)
document.addEventListener('DOMContentLoaded', async function() {    
    try {
        // Importar el módulo UserManager
        const userModule = await import('/clases/user.js');
        const { UserManager } = userModule;
        
        // Instanciar UserManager
        const userManager = new UserManager();
        
        // Iniciar editor
        iniciarEditor(userManager);
        
    } catch (error) {
        console.error('❌ Error cargando módulos:', error);
        mostrarErrorConfiguracion(error);
    }
});

// ==================== VARIABLES GLOBALES ====================
let selectedFile = null;
let currentPhotoType = '';
let currentPhotoElements = null;

// ==================== FUNCIONES PRINCIPALES ====================

async function iniciarEditor(userManager) {    
    const collaboratorId = obtenerIdDesdeURL();
    if (!collaboratorId) return;
    
    const elements = obtenerElementosDOM();
    currentPhotoElements = elements;
    
    try {
        await cargarDatosColaborador(userManager, collaboratorId, elements);
        configurarHandlersBasicos(elements);
        configurarFotoPerfil(elements);
        configurarModal(elements, userManager);
        configurarGuardado(elements, userManager);
        configurarCambioPassword(elements, userManager);
        configurarEliminacion(elements, userManager);
        configurarSelectorStatus(elements);
                
    } catch (error) {
        console.error('❌ Error inicializando editor:', error);
        mostrarMensaje(elements.mainMessage, 'error', 
            'Error al cargar datos del colaborador: ' + error.message);
    }
}

// ========== FUNCIONES DE UTILIDAD ==========

function obtenerIdDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const collaboratorId = urlParams.get('id');
    
    if (!collaboratorId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se especificó el colaborador a editar',
            confirmButtonText: 'Volver',
            confirmButtonColor: 'var(--color-danger, #ef4444)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        }).then(() => {
            window.location.href = 'gestionColaboradores.html';
        });
        return null;
    }
    
    return collaboratorId;
}

function obtenerElementosDOM() {
    return {
        // Fotos (solo perfil editable, logo NO editable)
        profileCircle: document.getElementById('profileCircle'),
        profileImage: document.getElementById('profileImage'),
        profilePlaceholder: document.getElementById('profilePlaceholder'),
        editProfileOverlay: document.getElementById('editProfileOverlay'),
        profileInput: document.getElementById('profile-input'),
        
        // Logo de organización (NO EDITABLE)
        orgCircle: document.getElementById('orgCircle'),
        orgImage: document.getElementById('orgImage'),
        orgPlaceholder: document.getElementById('orgPlaceholder'),
        // Edit overlay para logo NO se usará
        
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
        statusInput: document.getElementById('status'),
        
        // Permisos
        permissionCheckboxes: document.querySelectorAll('input[name="permissions"]'),
        
        // Información del sistema
        authId: document.getElementById('authId'),
        creationDate: document.getElementById('creationDate'),
        creationTime: document.getElementById('creationTime'),
        lastUpdateDate: document.getElementById('lastUpdateDate'),
        lastUpdateTime: document.getElementById('lastUpdateTime'),
        lastLoginDate: document.getElementById('lastLoginDate'),
        lastLoginTime: document.getElementById('lastLoginTime'),
        
        // Botones y mensajes
        saveChangesBtn: document.getElementById('saveChangesBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        changePasswordBtn: document.getElementById('changePasswordBtn'),
        mainMessage: document.getElementById('mainMessage'),
        
        // Status selector
        statusOptions: document.querySelectorAll('.status-option')
    };
}

function mostrarErrorConfiguracion(error) {
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
        confirmButtonColor: 'var(--color-accent-primary, #c0c0c0)',
        customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm'
        },
        allowOutsideClick: false
    }).then(() => {
        window.location.href = 'gestionColaboradores.html';
    });
}

async function cargarDatosColaborador(userManager, collaboratorId, elements) {    
    try {
        // Mostrar loader
        Swal.fire({
            title: 'Cargando datos...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container'
            }
        });
        
        // Obtener datos del colaborador
        const collaborator = await userManager.getUserById(collaboratorId);
        
        if (!collaborator) {
            Swal.close();
            throw new Error('Colaborador no encontrado');
        }
        
        // Verificar que sea un colaborador
        if (collaborator.cargo !== 'colaborador') {
            Swal.close();
            throw new Error('El usuario no es un colaborador');
        }
        
        // Guardar referencia global
        window.currentCollaborator = collaborator;
        
        // Actualizar interfaz
        actualizarInterfaz(elements, collaborator);
        
        // Deshabilitar edición del logo de organización
        deshabilitarLogoOrganizacion(elements);
        
        // Cerrar loader
        Swal.close();
        
        mostrarMensaje(elements.mainMessage, 'success', 
            `Editando colaborador: ${collaborator.nombreCompleto}`);
            
    } catch (error) {
        Swal.close();
        console.error('❌ Error cargando datos:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error al cargar',
            text: error.message,
            confirmButtonText: 'Volver',
            confirmButtonColor: 'var(--color-danger, #ef4444)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        }).then(() => {
            window.location.href = 'gestionColaboradores.html';
        });
        
        throw error;
    }
}

function deshabilitarLogoOrganizacion(elements) {
    // Agregar clase para deshabilitar la interacción
    if (elements.orgCircle) {
        elements.orgCircle.classList.add('org-disabled');
        elements.orgCircle.style.cursor = 'default';
        
        // Remover cualquier event listener que pudiera existir
        const newOrgCircle = elements.orgCircle.cloneNode(true);
        elements.orgCircle.parentNode.replaceChild(newOrgCircle, elements.orgCircle);
        
        // Actualizar referencia
        elements.orgCircle = newOrgCircle;
    }
    
    // Ocultar el overlay de edición si existe
    if (elements.editOrgOverlay) {
        elements.editOrgOverlay.style.display = 'none';
    }
}

function actualizarInterfaz(elements, collaborator) {    
    // Datos personales
    if (elements.fullName && collaborator.nombreCompleto) {
        elements.fullName.value = collaborator.nombreCompleto;
    }
    
    if (elements.email && collaborator.correoElectronico) {
        elements.email.value = collaborator.correoElectronico;
    }
    
    if (elements.organizationName && collaborator.organizacion) {
        elements.organizationName.value = collaborator.organizacion;
    }
    
    // Status
    let statusValue = 'active';
    if (collaborator.eliminado) {
        statusValue = 'inactive';
    } else if (collaborator.status === 'pending') {
        statusValue = 'pending';
    }
    
    if (elements.statusInput) {
        elements.statusInput.value = statusValue;
    }
    
    // Actualizar botones de status
    if (elements.statusOptions) {
        elements.statusOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-status') === statusValue) {
                option.classList.add('selected');
            }
        });
    }
    
    // Permisos
    if (collaborator.permisosPersonalizados && elements.permissionCheckboxes) {
        elements.permissionCheckboxes.forEach(checkbox => {
            const permiso = checkbox.value;
            checkbox.checked = collaborator.permisosPersonalizados[permiso] === true;
        });
    }
    
    // Foto de perfil - Usar el método getFotoUrl() de la clase User
    if (collaborator.fotoUsuario) {
        const profileUrl = collaborator.getFotoUrl();
        if (elements.profileImage) {
            elements.profileImage.src = profileUrl;
            elements.profileImage.style.display = 'block';
            
            // Agregar manejador de error
            elements.profileImage.onerror = function() {
                console.warn('⚠️ Error cargando imagen de perfil');
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
    
    // Logo de organización (solo visualización)
    if (collaborator.fotoOrganizacion) {
        const orgUrl = collaborator.fotoOrganizacion;
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
    
    // Información del sistema
    if (elements.authId) {
        elements.authId.textContent = collaborator.idAuth || collaborator.id || 'N/A';
    }
    
    // Formatear fechas
    const formatDate = (date) => {
        if (!date) return { date: 'N/A', time: '' };
        const d = date.toDate ? date.toDate() : new Date(date);
        return {
            date: d.toLocaleDateString('es-MX'),
            time: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        };
    };
    
    // Actualizar fechas
    const creationDate = formatDate(collaborator.fechaCreacion);
    if (elements.creationDate) elements.creationDate.textContent = creationDate.date;
    if (elements.creationTime) elements.creationTime.textContent = creationDate.time;
    
    const updateDate = formatDate(collaborator.fechaActualizacion);
    if (elements.lastUpdateDate) elements.lastUpdateDate.textContent = updateDate.date;
    if (elements.lastUpdateTime) elements.lastUpdateTime.textContent = updateDate.time;
    
    const loginDate = formatDate(collaborator.ultimoLogin);
    if (elements.lastLoginDate) elements.lastLoginDate.textContent = loginDate.date;
    if (elements.lastLoginTime) elements.lastLoginTime.textContent = loginDate.time;
    }

function mostrarMensaje(element, type, text) {
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

function configurarHandlersBasicos(elements) {
    // Botón cancelar
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => {
            Swal.fire({
                title: '¿Cancelar cambios?',
                text: 'Se perderán los cambios no guardados',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: 'var(--color-danger, #ef4444)',
                cancelButtonColor: 'var(--color-accent-primary, #3085d6)',
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm',
                    cancelButton: 'swal2-cancel'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = 'gestionColaboradores.html';
                }
            });
        });
    }
}

function configurarSelectorStatus(elements) {
    if (!elements.statusOptions || !elements.statusInput) return;
    
    elements.statusOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remover selección de todas las opciones
            elements.statusOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Seleccionar la opción clickeada
            this.classList.add('selected');
            
            // Actualizar campo oculto
            const statusValue = this.getAttribute('data-status');
            elements.statusInput.value = statusValue;            
        });
    });
}

// ========== HANDLERS DE FOTOS (SOLO PERFIL) ==========

function configurarFotoPerfil(elements) {
    if (!elements.profileCircle) return;
    
    // Solo configurar para foto de perfil
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
            if (file) mostrarModalFoto(file, 'profile', elements);
            this.value = '';
        });
    }
}

function mostrarModalFoto(file, type, elements) {
    // Solo permitir para foto de perfil
    if (type !== 'profile') return;
    
    // Validar archivo
    const maxSize = 5; // MB
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    
    if (!validTypes.includes(file.type)) {
        mostrarMensaje(elements.mainMessage, 'error', 
            'Formato no válido. Use JPG, PNG o GIF');
        return;
    }
    
    if (file.size > maxSize * 1024 * 1024) {
        mostrarMensaje(elements.mainMessage, 'error', 
            `Archivo demasiado grande. Máximo: ${maxSize}MB`);
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        if (elements.previewImage) elements.previewImage.src = e.target.result;
        
        // Actualizar variables globales
        currentPhotoType = type;
        selectedFile = file;
        
        if (elements.modalTitle) {
            elements.modalTitle.textContent = 'CAMBIAR FOTO DE PERFIL';
        }
        
        if (elements.modalMessage) {
            const fileSize = (file.size / (1024 * 1024)).toFixed(2);
            elements.modalMessage.textContent = 
                `Tamaño: ${fileSize} MB • ¿Deseas usar esta imagen?`;
        }
        
        if (elements.photoModal) elements.photoModal.style.display = 'flex';
    };
    
    reader.readAsDataURL(file);
}

function configurarModal(elements, userManager) {
    if (!elements.confirmChangeBtn || !elements.cancelChangeBtn) return;
    
    elements.confirmChangeBtn.addEventListener('click', async () => {
        if (!selectedFile || !window.currentCollaborator) return;
        
        // Solo permitir foto de perfil
        if (currentPhotoType !== 'profile') return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            const imageBase64 = e.target.result;
            
            try {
                const collaborator = window.currentCollaborator;
                
                // Actualizar solo foto de perfil usando UserManager
                const success = await userManager.updateUser(
                    collaborator.id,
                    { fotoUsuario: imageBase64 },
                    'colaborador',
                    collaborator.organizacionCamelCase
                );
                
                if (success) {
                    // Actualizar interfaz
                    if (elements.profileImage) {
                        elements.profileImage.src = imageBase64;
                        elements.profileImage.style.display = 'block';
                    }
                    if (elements.profilePlaceholder) {
                        elements.profilePlaceholder.style.display = 'none';
                    }
                    
                    // Actualizar objeto en memoria
                    collaborator.fotoUsuario = imageBase64;
                    
                    Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: 'Foto actualizada correctamente',
                        timer: 3000,
                        showConfirmButton: false,
                        customClass: {
                            popup: 'swal2-popup',
                            title: 'swal2-title',
                            htmlContainer: 'swal2-html-container',
                            timerProgressBar: 'swal2-timer-progress-bar'
                        }
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo guardar la imagen: ' + error.message,
                    confirmButtonColor: 'var(--color-danger, #ef4444)',
                    customClass: {
                        popup: 'swal2-popup',
                        title: 'swal2-title',
                        htmlContainer: 'swal2-html-container',
                        confirmButton: 'swal2-confirm'
                    }
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

function configurarGuardado(elements, userManager) {
    if (!elements.saveChangesBtn || !window.currentCollaborator) return;
    
    elements.saveChangesBtn.addEventListener('click', async () => {
        // Validar nombre completo
        if (!elements.fullName || !elements.fullName.value.trim()) {
            mostrarMensaje(elements.mainMessage, 'error', 'El nombre completo es obligatorio');
            if (elements.fullName) elements.fullName.focus();
            return;
        }
        
        const collaborator = window.currentCollaborator;
        
        // Mostrar confirmación
        const result = await Swal.fire({
            title: '¿Guardar cambios?',
            html: `
                <div style="text-align: center; padding: 10px 0;">
                    <div style="font-size: 60px; color: var(--color-success, #4CAF50); margin-bottom: 15px;">
                        <i class="fas fa-save"></i>
                    </div>
                    <p style="color: var(--color-text-secondary); margin-bottom: 15px;">
                        Se actualizarán los datos del colaborador:
                    </p>
                    <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Nombre:</strong> ${elements.fullName.value}</p>
                        <p><strong>Status:</strong> ${elements.statusInput.value === 'active' ? 'Activo' : 'Inactivo'}</p>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'GUARDAR',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: 'var(--color-success, #4CAF50)',
            cancelButtonColor: 'var(--color-danger, #ef4444)',
            reverseButtons: true,
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
            }
        });
        
        if (!result.isConfirmed) return;
        
        // Mostrar loader
        Swal.fire({
            title: 'Guardando cambios...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container'
            }
        });
        
        try {
            // Obtener permisos seleccionados
            const permisosPersonalizados = {};
            if (elements.permissionCheckboxes) {
                elements.permissionCheckboxes.forEach(checkbox => {
                    permisosPersonalizados[checkbox.value] = checkbox.checked;
                });
            }
            
            // Preparar datos a actualizar
            const updateData = {
                nombreCompleto: elements.fullName.value.trim(),
                status: elements.statusInput.value === 'active',
                permisosPersonalizados: permisosPersonalizados
            };
            
            // Actualizar usando UserManager
            await userManager.updateUser(
                collaborator.id,
                updateData,
                'colaborador',
                collaborator.organizacionCamelCase
            );
            
            // Actualizar el objeto en memoria
            Object.assign(collaborator, updateData);
            
            // Actualizar timestamp
            const now = new Date();
            if (elements.lastUpdateDate) {
                elements.lastUpdateDate.textContent = now.toLocaleDateString('es-MX');
            }
            if (elements.lastUpdateTime) {
                elements.lastUpdateTime.textContent = now.toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            
            // Mostrar éxito
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Datos actualizados correctamente',
                timer: 3000,
                showConfirmButton: false,
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    timerProgressBar: 'swal2-timer-progress-bar'
                }
            });
            
            mostrarMensaje(elements.mainMessage, 'success', 'Cambios guardados exitosamente');
            
        } catch (error) {
            console.error('❌ Error guardando cambios:', error);
            Swal.close();
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron guardar los cambios: ' + error.message,
                confirmButtonColor: 'var(--color-danger, #ef4444)',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm'
                }
            });
        }
    });
}

// ========== HANDLER PARA CAMBIAR CONTRASEÑA ==========

function configurarCambioPassword(elements, userManager) {
    if (!elements.changePasswordBtn) return;
    
    elements.changePasswordBtn.addEventListener('click', async () => {
        if (!window.currentCollaborator) {
            mostrarMensaje(elements.mainMessage, 'error', 'No hay colaborador cargado');
            return;
        }
        
        const collaborator = window.currentCollaborator;
        const userEmail = collaborator.correoElectronico;
        
        if (!userEmail) {
            mostrarMensaje(elements.mainMessage, 'error', 'No se encontró el correo del colaborador');
            return;
        }
        
        // Mostrar confirmación
        const result = await Swal.fire({
            title: '¿ENVIAR ENLACE PARA CAMBIAR CONTRASEÑA?',
            html: `
                <div style="text-align: center; padding: 10px 0;">
                    <div style="font-size: 60px; color: var(--color-warning, #ff9800); margin-bottom: 15px;">
                        <i class="fas fa-key"></i>
                    </div>
                    <p style="color: var(--color-text-secondary); margin-bottom: 15px;">
                        Se enviará un enlace de restablecimiento al correo del colaborador.
                    </p>
                    <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Correo del colaborador:</strong></p>
                        <p style="color: var(--color-accent-primary); font-weight: bold;">
                            ${userEmail}
                        </p>
                    </div>
                    <div style="background: rgba(255, 193, 7, 0.1); padding: 10px; border-radius: 6px; margin: 10px 0;">
                        <p style="color: var(--color-warning, #856404); font-size: 14px; margin: 0;">
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
            confirmButtonColor: 'var(--color-warning, #d33)',
            cancelButtonColor: 'var(--color-accent-primary, #3085d6)',
            reverseButtons: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
            }
        });
        
        if (!result.isConfirmed) return;
        
        // Mostrar loader
        Swal.fire({
            title: 'Enviando enlace...',
            html: 'Por favor espera mientras procesamos tu solicitud.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading(),
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container'
            }
        });
        
        try {
            // Importar auth de Firebase
            const firebaseModule = await import('/config/firebase-config.js');
            const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
            
            const actionCodeSettings = {
                url: 'https://centinela-mx.web.app/verifyEmail.html',
                handleCodeInApp: false
            };
            
            await sendPasswordResetEmail(firebaseModule.auth, userEmail, actionCodeSettings);
            
            // Cerrar loader
            Swal.close();
            
            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡ENLACE ENVIADO EXITOSAMENTE!',
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 60px; color: var(--color-success, #28a745); margin-bottom: 20px;">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        
                        <h3 style="color: var(--color-text-primary); margin-bottom: 15px;">
                            Correo enviado correctamente
                        </h3>
                        
                        <div style="background: rgba(46, 204, 113, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>📨 Destinatario:</strong> ${userEmail}</p>
                            <p><strong>⏱️ Válido por:</strong> 1 hora</p>
                        </div>
                        
                        <div style="background: rgba(40, 167, 69, 0.1); border: 1px solid rgba(40, 167, 69, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0;">
                            <h4 style="color: var(--color-success, #155724); margin-bottom: 10px;">
                                <i class="fas fa-check"></i> ¿Qué hacer ahora?
                            </h4>
                            <p style="color: var(--color-text-secondary); margin: 0;">
                                El colaborador recibirá un correo con instrucciones para restablecer su contraseña.
                            </p>
                        </div>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: 'var(--color-success, #28a745)',
                allowOutsideClick: false,
                showCloseButton: true,
                width: '600px',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm',
                    closeButton: 'swal2-close'
                }
            });
            
        } catch (error) {
            // Cerrar loader
            Swal.close();
            
            console.error('❌ Error enviando correo:', error);
            
            // Manejar errores específicos
            let errorMessage = 'Ocurrió un error al enviar el correo';
            
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
                confirmButtonColor: 'var(--color-danger, #ef4444)',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm'
                }
            });
        }
    });
}

// ========== HANDLER DE ELIMINACIÓN ==========

function configurarEliminacion(elements, userManager) {
    if (!elements.deleteBtn) return;
    
    elements.deleteBtn.addEventListener('click', async () => {
        if (!window.currentCollaborator) {
            mostrarMensaje(elements.mainMessage, 'error', 'No hay colaborador cargado');
            return;
        }
        
        const collaborator = window.currentCollaborator;
        const fullName = elements.fullName.value || collaborator.nombreCompleto;
        
        // Mostrar confirmación de eliminación
        const result = await Swal.fire({
            title: '¿INHABILITAR COLABORADOR?',
            html: `
                <div style="text-align: center; padding: 10px 0;">
                    <div style="font-size: 60px; color: var(--color-danger, #e74c3c); margin-bottom: 15px;">
                        <i class="fas fa-user-slash"></i>
                    </div>
                    <h3 style="color: var(--color-text-primary); margin: 10px 0;">${fullName}</h3>
                    <p style="color: var(--color-text-secondary); margin: 0;">${collaborator.correoElectronico}</p>
                </div>
                
                <p style="text-align: center; font-size: 1.1rem; margin: 20px 0;">
                    ¿Estás seguro de <strong style="color: var(--color-danger, #e74c3c);">inhabilitar</strong> 
                    este colaborador?
                </p>
                
                <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid var(--color-danger, #e74c3c);">
                    <p style="margin: 0 0 5px 0; color: var(--color-danger, #e74c3c); font-size: 0.9rem;">
                        <i class="fas fa-exclamation-triangle"></i> CONSECUENCIAS
                    </p>
                    <ul style="margin: 0; color: var(--color-text-secondary); font-size: 0.9rem; padding-left: 20px;">
                        <li>No podrá iniciar sesión en el sistema</li>
                        <li>Su información se mantiene en la base de datos</li>
                        <li>Puede ser reactivado posteriormente</li>
                    </ul>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'INHABILITAR',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: 'var(--color-danger, #e74c3c)',
            cancelButtonColor: 'var(--color-accent-primary, #3085d6)',
            reverseButtons: true,
            showDenyButton: true,
            denyButtonText: 'SOLO DESACTIVAR',
            denyButtonColor: 'var(--color-active, #95a5a6)',
            width: '600px',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel',
                denyButton: 'swal2-deny'
            }
        });
        
        if (result.isDenied) {
            // Solo cambiar status a inactivo
            elements.statusInput.value = 'inactive';
            elements.statusOptions.forEach(opt => {
                opt.classList.remove('selected');
                if (opt.getAttribute('data-status') === 'inactive') {
                    opt.classList.add('selected');
                }
            });
            
            Swal.fire({
                icon: 'info',
                title: 'Status cambiado',
                text: 'El colaborador ha sido marcado como inactivo. Recuerda guardar los cambios.',
                timer: 3000,
                showConfirmButton: false,
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    timerProgressBar: 'swal2-timer-progress-bar'
                }
            });
            
            return;
        }
        
        if (!result.isConfirmed) return;
        
        // Mostrar loader
        Swal.fire({
            title: 'Inhabilitando colaborador...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container'
            }
        });
        
        try {
            // Inhabilitar usando UserManager
            await userManager.inhabilitarUsuario(
                collaborator.id,
                'colaborador',
                collaborator.organizacionCamelCase,
                'Inhabilitado por administrador'
            );
            
            // Actualizar interfaz
            elements.statusInput.value = 'inactive';
            elements.statusOptions.forEach(opt => {
                opt.classList.remove('selected');
                if (opt.getAttribute('data-status') === 'inactive') {
                    opt.classList.add('selected');
                }
            });
            
            // Actualizar objeto en memoria
            collaborator.eliminado = true;
            
            // Mostrar éxito
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '✅ COLABORADOR INHABILITADO',
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 60px; color: var(--color-active, #95a5a6); margin-bottom: 20px;">
                            <i class="fas fa-ban"></i>
                        </div>
                        <p style="color: var(--color-text-primary); margin: 10px 0; font-weight: 500;">${fullName}</p>
                        <p style="color: var(--color-text-secondary); margin: 5px 0;">
                            ha sido inhabilitado del sistema
                        </p>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: 'var(--color-active, #95a5a6)',
                timer: 3000,
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm',
                    timerProgressBar: 'swal2-timer-progress-bar'
                }
            });
            
            // Redirigir después de 3 segundos
            setTimeout(() => {
                window.location.href = 'gestionColaboradores.html';
            }, 3000);
            
        } catch (error) {
            Swal.close();
            console.error('❌ Error inhabilitando colaborador:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo inhabilitar el colaborador: ' + error.message,
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: 'var(--color-danger, #ef4444)',
                customClass: {
                    popup: 'swal2-popup',
                    title: 'swal2-title',
                    htmlContainer: 'swal2-html-container',
                    confirmButton: 'swal2-confirm'
                }
            });
        }
    });
}