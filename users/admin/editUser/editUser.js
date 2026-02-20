// editUser.js - Editor de colaboradores (VERSIÓN FINAL - TODO CON SWEETALERT2)
import { UserManager } from '/clases/user.js';
import { AreaManager } from '/clases/area.js';

document.addEventListener('DOMContentLoaded', async function() {    
    try {
        const userManager = new UserManager();
        
        // Esperar a que el usuario actual esté disponible
        await esperarUsuarioActual(userManager);
        
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

async function esperarUsuarioActual(userManager, maxAttempts = 15, delay = 500) {
    for (let i = 0; i < maxAttempts; i++) {
        if (userManager.currentUser) {
            return userManager.currentUser;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('No se pudo detectar el usuario actual');
}

async function iniciarEditor(userManager) {    
    const collaboratorId = obtenerIdDesdeURL();
    if (!collaboratorId) return;
    
    const elements = obtenerElementosDOM();
    currentPhotoElements = elements;
    
    try {
        await cargarDatosColaborador(userManager, collaboratorId, elements);
        configurarHandlersBasicos(elements);
        configurarFotoPerfil(elements);
        configurarGuardado(elements, userManager);
        configurarCambioPassword(elements, userManager);
        configurarEliminacion(elements, userManager);
        configurarSelectorStatus(elements);
        
        // Cargar áreas después de tener los datos del colaborador
        await cargarAreas(userManager, elements);
        
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
            confirmButtonText: 'Volver'
        }).then(() => {
            window.location.href = '/users/admin/managementUser/managementUser.html';
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
        
        // Formulario
        fullName: document.getElementById('fullName'),
        email: document.getElementById('email'),
        organizationName: document.getElementById('organizationName'),
        // SELECTORES
        areaSelect: document.getElementById('areaSelect'),
        cargoEnAreaSelect: document.getElementById('cargoEnAreaSelect'),
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
            <div>
                <p><strong>No se pudo cargar los módulos necesarios</strong></p>
                <p>Error: ${error.message}</p>
                <p>Verifica que los archivos existan en las rutas correctas:</p>
                <ul>
                    <li><code>/clases/user.js</code></li>
                    <li><code>/clases/area.js</code></li>
                </ul>
            </div>
        `,
        confirmButtonText: 'Entendido',
        allowOutsideClick: false
    }).then(() => {
        window.location.href = '/users/admin/managementUser/managementUser.html';
    });
}

async function cargarDatosColaborador(userManager, collaboratorId, elements) {    
    try {
        Swal.fire({
            title: 'Cargando datos...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const collaborator = await userManager.getUserById(collaboratorId);
        
        if (!collaborator) {
            Swal.close();
            throw new Error('Colaborador no encontrado');
        }
        
        if (!collaborator.esColaborador()) {
            Swal.close();
            throw new Error('El usuario no es un colaborador');
        }
        
        window.currentCollaborator = collaborator;
        
        actualizarInterfaz(elements, collaborator);
        deshabilitarLogoOrganizacion(elements);
        
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
            confirmButtonText: 'Volver'
        }).then(() => {
            window.location.href = '/users/admin/managementUser/managementUser.html';
        });
        
        throw error;
    }
}

function deshabilitarLogoOrganizacion(elements) {
    if (elements.orgCircle) {
        elements.orgCircle.classList.add('org-disabled');
        elements.orgCircle.style.cursor = 'default';
    }
}

function actualizarInterfaz(elements, collaborator) {    
    if (elements.fullName && collaborator.nombreCompleto) {
        elements.fullName.value = collaborator.nombreCompleto;
    }
    
    if (elements.email && collaborator.correoElectronico) {
        elements.email.value = collaborator.correoElectronico;
    }
    
    if (elements.organizationName && collaborator.organizacion) {
        elements.organizationName.value = collaborator.organizacion;
    }
    
    let statusValue = 'active';
    if (collaborator.eliminado) {
        statusValue = 'inactive';
    } else if (collaborator.status === 'pending') {
        statusValue = 'pending';
    } else if (!collaborator.status) {
        statusValue = 'inactive';
    }
    
    if (elements.statusInput) {
        elements.statusInput.value = statusValue;
    }
    
    if (elements.statusOptions) {
        elements.statusOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-status') === statusValue) {
                option.classList.add('selected');
            }
        });
    }
    
    if (collaborator.permisosPersonalizados && elements.permissionCheckboxes) {
        elements.permissionCheckboxes.forEach(checkbox => {
            const permiso = checkbox.value;
            checkbox.checked = collaborator.permisosPersonalizados[permiso] === true;
        });
    }
    
    // Foto de perfil
    if (collaborator.fotoUsuario) {
        const profileUrl = collaborator.getFotoUrl();
        if (elements.profileImage) {
            elements.profileImage.src = profileUrl;
            elements.profileImage.style.display = 'block';
            
            elements.profileImage.onerror = function() {
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
    
    // Logo de organización
    if (collaborator.fotoOrganizacion) {
        const orgUrl = collaborator.fotoOrganizacion;
        if (elements.orgImage) {
            elements.orgImage.src = orgUrl;
            elements.orgImage.style.display = 'block';
            
            elements.orgImage.onerror = function() {
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
    
    const formatDate = (date) => {
        if (!date) return { date: 'N/A', time: '' };
        const d = date.toDate ? date.toDate() : new Date(date);
        return {
            date: d.toLocaleDateString('es-MX'),
            time: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        };
    };
    
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
    
    if (type !== 'error') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// ========== FUNCIONES PARA CARGAR ÁREAS Y CARGOS ==========

async function cargarAreas(userManager, elements) {
    if (!elements.areaSelect) return;
    
    const collaborator = window.currentCollaborator;
    if (!collaborator) return;
    
    try {
        const areaManager = new AreaManager();
        const organizacionCamelCase = userManager.currentUser.organizacionCamelCase;
                
        elements.areaSelect.innerHTML = '<option value="">Cargando áreas...</option>';
        elements.areaSelect.disabled = true;
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Primero selecciona un área</option>';
        elements.cargoEnAreaSelect.disabled = true;
        
        const areas = await areaManager.getAreasByOrganizacion(organizacionCamelCase);
        
        elements.areaSelect._areasData = areas;
        
        if (areas.length === 0) {
            elements.areaSelect.innerHTML = '<option value="">No hay áreas disponibles</option>';
            elements.areaSelect.disabled = false;
            return;
        }
        
        let options = '<option value="">Selecciona un área</option>';
        areas.forEach(area => {
            options += `<option value="${area.id}">${area.nombreArea}</option>`;
        });
        elements.areaSelect.innerHTML = options;
        elements.areaSelect.disabled = false;
        
        if (collaborator.areaAsignadaId) {            
            const areaExiste = areas.some(a => a.id === collaborator.areaAsignadaId);
            
            if (areaExiste) {
                elements.areaSelect.value = collaborator.areaAsignadaId;
                
                const event = new Event('change', { bubbles: true });
                elements.areaSelect.dispatchEvent(event);
                
                const seleccionarCargo = () => {
                    if (collaborator.cargo && collaborator.cargo.id) {                        
                        const cargoSelect = elements.cargoEnAreaSelect;
                        const option = Array.from(cargoSelect.options).find(opt => opt.value === collaborator.cargo.id);
                        
                        if (option) {
                            cargoSelect.value = option.value;
                            return true;
                        }
                    }
                    
                    if (collaborator.cargo && collaborator.cargo.nombre) {
                        const optionPorNombre = Array.from(elements.cargoEnAreaSelect.options).find(
                            opt => opt.text === collaborator.cargo.nombre
                        );
                        
                        if (optionPorNombre) {
                            elements.cargoEnAreaSelect.value = optionPorNombre.value;
                            return true;
                        }
                    }
                    
                    return false;
                };
                
                setTimeout(seleccionarCargo, 300);
                setTimeout(seleccionarCargo, 600);
                setTimeout(seleccionarCargo, 1000);
            }
        }
        
    } catch (error) {
        console.error('❌ Error cargando áreas:', error);
        elements.areaSelect.innerHTML = '<option value="">Error al cargar áreas</option>';
        elements.areaSelect.disabled = false;
        
        Swal.fire({
            icon: 'warning',
            title: 'Error al cargar áreas',
            text: 'No se pudieron cargar las áreas. Puedes continuar editando pero no podrás cambiar el área.',
            confirmButtonText: 'ENTENDIDO'
        });
    }
}

function cargarCargosPorArea(elements) {
    if (!elements.areaSelect || !elements.cargoEnAreaSelect) return;
    
    const areaId = elements.areaSelect.value;
    const areas = elements.areaSelect._areasData || [];
    
    elements.cargoEnAreaSelect.innerHTML = '';
    elements.cargoEnAreaSelect.disabled = true;
    
    if (!areaId) {
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Primero selecciona un área</option>';
        return;
    }
    
    const areaSeleccionada = areas.find(a => a.id === areaId);
    
    if (!areaSeleccionada) {
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Área no encontrada</option>';
        return;
    }
    
    const cargos = areaSeleccionada.getCargosAsArray ? areaSeleccionada.getCargosAsArray() : [];
    
    if (cargos.length === 0) {
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Esta área no tiene cargos</option>';
    } else {
        let options = '<option value="">Selecciona un cargo</option>';
        cargos.forEach((cargo, index) => {
            const cargoId = cargo.id || `cargo_${index}`;
            options += `<option value="${cargoId}">${cargo.nombre || 'Cargo sin nombre'}</option>`;
            
            if (!elements.cargoEnAreaSelect._cargosData) {
                elements.cargoEnAreaSelect._cargosData = {};
            }
            elements.cargoEnAreaSelect._cargosData[cargoId] = cargo;
        });
        elements.cargoEnAreaSelect.innerHTML = options;
    }
    
    elements.cargoEnAreaSelect.disabled = false;
}

function configurarSelectoresAreaCargo(elements) {
    if (!elements.areaSelect || !elements.cargoEnAreaSelect) return;
    
    elements.areaSelect.addEventListener('change', () => {
        cargarCargosPorArea(elements);
    });
}

// ========== HANDLERS BÁSICOS ==========

function configurarHandlersBasicos(elements) {
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => {
            Swal.fire({
                title: '¿Cancelar cambios?',
                text: 'Se perderán los cambios no guardados',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'CONFIRMAR',
                cancelButtonText: 'CANCELAR'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/users/admin/managementUser/managementUser.html';
                }
            });
        });
    }
    
    configurarSelectoresAreaCargo(elements);
}

function configurarSelectorStatus(elements) {
    if (!elements.statusOptions || !elements.statusInput) return;
    
    elements.statusOptions.forEach(option => {
        option.addEventListener('click', function() {
            elements.statusOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            const statusValue = this.getAttribute('data-status');
            elements.statusInput.value = statusValue;            
        });
    });
}

// ========== HANDLER DE FOTO CON SWEETALERT2 ==========

function configurarFotoPerfil(elements) {
    if (!elements.profileCircle) return;
    
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
            if (file) mostrarModalFotoConSwal(file, elements);
            this.value = '';
        });
    }
}

function mostrarModalFotoConSwal(file, elements) {
    const maxSize = 5;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    
    if (!validTypes.includes(file.type)) {
        mostrarMensaje(elements.mainMessage, 'error', 'Formato no válido. Use JPG, PNG o GIF');
        return;
    }
    
    if (file.size > maxSize * 1024 * 1024) {
        mostrarMensaje(elements.mainMessage, 'error', `Archivo demasiado grande. Máximo: ${maxSize}MB`);
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageBase64 = e.target.result;
        
        Swal.fire({
            title: 'Cambiar foto de perfil',
            html: `
                <div style="text-align: center;">
                    <img src="${imageBase64}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-accent-primary); margin-bottom: 15px;">
                    <p>Tamaño: ${(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    <p>¿Deseas usar esta imagen?</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR',
            cancelButtonText: 'CANCELAR',
            reverseButtons: false
        }).then(async (result) => {
            if (result.isConfirmed) {
                await guardarFotoPerfil(imageBase64, elements);
            }
        });
    };
    
    reader.readAsDataURL(file);
}

async function guardarFotoPerfil(imageBase64, elements) {
    if (!window.currentCollaborator) return;
    
    Swal.fire({
        title: 'Guardando foto...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const collaborator = window.currentCollaborator;
        
        const success = await userManager.updateUser(
            collaborator.id,
            { fotoUsuario: imageBase64 },
            'colaborador',
            collaborator.organizacionCamelCase
        );
        
        if (success) {
            if (elements.profileImage) {
                elements.profileImage.src = imageBase64;
                elements.profileImage.style.display = 'block';
            }
            if (elements.profilePlaceholder) {
                elements.profilePlaceholder.style.display = 'none';
            }
            
            collaborator.fotoUsuario = imageBase64;
            
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Foto actualizada correctamente',
                timer: 3000,
                showConfirmButton: false
            });
        }
    } catch (error) {
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar la imagen: ' + error.message
        });
    }
}

// ========== HANDLER DE GUARDADO ==========

function configurarGuardado(elements, userManager) {
    if (!elements.saveChangesBtn || !window.currentCollaborator) return;
    
    elements.saveChangesBtn.addEventListener('click', async () => {
        if (!elements.fullName || !elements.fullName.value.trim()) {
            mostrarMensaje(elements.mainMessage, 'error', 'El nombre completo es obligatorio');
            if (elements.fullName) elements.fullName.focus();
            return;
        }
        
        if (!elements.areaSelect || !elements.areaSelect.value) {
            mostrarMensaje(elements.mainMessage, 'error', 'Debes seleccionar un área');
            if (elements.areaSelect) elements.areaSelect.focus();
            return;
        }
        
        if (!elements.cargoEnAreaSelect || !elements.cargoEnAreaSelect.value) {
            mostrarMensaje(elements.mainMessage, 'error', 'Debes seleccionar un cargo en el área');
            if (elements.cargoEnAreaSelect) elements.cargoEnAreaSelect.focus();
            return;
        }
        
        const collaborator = window.currentCollaborator;
        
        let areaNombre = 'No asignada';
        let cargoNombre = 'No asignado';
        let cargoDescripcion = '';
        let cargoObjeto = null;
        
        const areas = elements.areaSelect._areasData || [];
        const areaSeleccionada = areas.find(a => a.id === elements.areaSelect.value);
        if (areaSeleccionada) {
            areaNombre = areaSeleccionada.nombreArea;
        }
        
        const cargosData = elements.cargoEnAreaSelect._cargosData || {};
        const cargoSeleccionado = cargosData[elements.cargoEnAreaSelect.value];
        if (cargoSeleccionado) {
            cargoNombre = cargoSeleccionado.nombre || 'Cargo sin nombre';
            cargoDescripcion = cargoSeleccionado.descripcion || '';
            cargoObjeto = {
                id: cargoSeleccionado.id || elements.cargoEnAreaSelect.value,
                nombre: cargoNombre,
                descripcion: cargoDescripcion
            };
        }
        
        const result = await Swal.fire({
            title: '¿Guardar cambios?',
            html: `
                <div>
                    <p><strong>Nombre:</strong> ${elements.fullName.value}</p>
                    <p><strong>Área asignada:</strong> ${areaNombre}</p>
                    <p><strong>Cargo en el área:</strong> ${cargoNombre}</p>
                    <p><strong>Status:</strong> ${elements.statusInput.value === 'active' ? 'Activo' : elements.statusInput.value === 'inactive' ? 'Inactivo' : 'Pendiente'}</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'GUARDAR',
            cancelButtonText: 'CANCELAR'
        });
        
        if (!result.isConfirmed) return;
        
        Swal.fire({
            title: 'Guardando cambios...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const permisosPersonalizados = {};
            if (elements.permissionCheckboxes) {
                elements.permissionCheckboxes.forEach(checkbox => {
                    permisosPersonalizados[checkbox.value] = checkbox.checked;
                });
            }
            
            const updateData = {
                nombreCompleto: elements.fullName.value.trim(),
                status: elements.statusInput.value === 'active',
                cargo: cargoObjeto,
                areaAsignadaId: elements.areaSelect.value,
                permisosPersonalizados: permisosPersonalizados
            };
            
            await userManager.updateUser(
                collaborator.id,
                updateData,
                'colaborador',
                collaborator.organizacionCamelCase
            );
            
            Object.assign(collaborator, updateData);
            if (cargoObjeto) {
                collaborator.cargoAsignadoId = cargoObjeto.id;
                collaborator.cargoAsignadoNombre = cargoObjeto.nombre;
                collaborator.cargoAsignadoDescripcion = cargoObjeto.descripcion;
            }
            collaborator.areaAsignadaNombre = areaNombre;
            
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
            
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Datos actualizados correctamente',
                timer: 3000,
                showConfirmButton: false
            });
            
            mostrarMensaje(elements.mainMessage, 'success', 'Cambios guardados exitosamente');
            
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
        
        const result = await Swal.fire({
            title: '¿Enviar enlace para cambiar contraseña?',
            html: `
                <div>
                    <p><strong>Correo del colaborador:</strong> ${userEmail}</p>
                    <p><i class="fas fa-info-circle"></i> El enlace expirará en 1 hora.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ENVIAR ENLACE',
            cancelButtonText: 'CANCELAR',
            allowOutsideClick: false
        });
        
        if (!result.isConfirmed) return;
        
        Swal.fire({
            title: 'Enviando enlace...',
            text: 'Por favor espera mientras procesamos tu solicitud.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const firebaseModule = await import('/config/firebase-config.js');
            const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js");
            
            const actionCodeSettings = {
                url: window.location.origin + '/verifyEmail.html',
                handleCodeInApp: false
            };
            
            await sendPasswordResetEmail(firebaseModule.auth, userEmail, actionCodeSettings);
            
            Swal.close();
            
            await Swal.fire({
                icon: 'success',
                title: '¡Enlace enviado exitosamente!',
                html: `
                    <div>
                        <p><strong>Destinatario:</strong> ${userEmail}</p>
                        <p><strong>Válido por:</strong> 1 hora</p>
                        <p>El colaborador recibirá instrucciones para restablecer su contraseña.</p>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO',
                allowOutsideClick: false,
                showCloseButton: true
            });
            
        } catch (error) {
            Swal.close();
            
            console.error('❌ Error enviando correo:', error);
            
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
                    errorMessage = 'Error del sistema';
            }
            
            Swal.fire({
                icon: 'error',
                title: errorMessage,
                text: 'Por favor, intenta nuevamente más tarde.',
                confirmButtonText: 'ENTENDIDO'
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
        
        const result = await Swal.fire({
            title: '¿Inhabilitar colaborador?',
            html: `
                <div>
                    <p><strong>${fullName}</strong></p>
                    <p>${collaborator.correoElectronico}</p>
                    <p>¿Estás seguro de inhabilitar este colaborador?</p>
                    <p><i class="fas fa-exclamation-triangle"></i> Consecuencias:</p>
                    <ul>
                        <li>No podrá iniciar sesión</li>
                        <li>La información se conserva</li>
                        <li>Puede reactivarse después</li>
                    </ul>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'INHABILITAR',
            cancelButtonText: 'CANCELAR',
            showDenyButton: true,
            denyButtonText: 'SOLO DESACTIVAR'
        });
        
        if (result.isDenied) {
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
                showConfirmButton: false
            });
            
            return;
        }
        
        if (!result.isConfirmed) return;
        
        Swal.fire({
            title: 'Inhabilitando colaborador...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            await userManager.inactivarUsuario(
                collaborator.id,
                'colaborador',
                collaborator.organizacionCamelCase
            );
            
            elements.statusInput.value = 'inactive';
            elements.statusOptions.forEach(opt => {
                opt.classList.remove('selected');
                if (opt.getAttribute('data-status') === 'inactive') {
                    opt.classList.add('selected');
                }
            });
            
            collaborator.status = false;
            
            Swal.close();
            
            Swal.fire({
                icon: 'success',
                title: 'Colaborador inhabilitado',
                text: `${fullName} ha sido inhabilitado del sistema`,
                confirmButtonText: 'ENTENDIDO',
                timer: 3000
            });
            
            setTimeout(() => {
                window.location.href = '/users/admin/managementUser/managementUser.html';
            }, 3000);
            
        } catch (error) {
            Swal.close();
            console.error('❌ Error inhabilitando colaborador:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo inhabilitar el colaborador: ' + error.message,
                confirmButtonText: 'ENTENDIDO'
            });
        }
    });
}