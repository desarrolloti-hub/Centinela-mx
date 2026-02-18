// editUser.js - Editor de colaboradores (VERSIÓN CORREGIDA)
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
        configurarModal(elements, userManager);
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
            confirmButtonText: 'Volver',
            confirmButtonColor: 'var(--color-danger, #ef4444)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
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
            <div style="text-align: left; font-size: 14px;">
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
        confirmButtonColor: 'var(--color-accent-primary, #c0c0c0)',
        customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm'
        },
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
            didOpen: () => Swal.showLoading(),
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container'
            }
        });
        
        const collaborator = await userManager.getUserById(collaboratorId);
        
        if (!collaborator) {
            Swal.close();
            throw new Error('Colaborador no encontrado');
        }
        
        // ✅ CORREGIDO: Verificar que sea colaborador por su rol, no por un campo 'cargo'
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
            confirmButtonText: 'Volver',
            confirmButtonColor: 'var(--color-danger, #ef4444)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
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
    
    if (elements.editOrgOverlay) {
        elements.editOrgOverlay.style.display = 'none';
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
    
    if (elements.authId) {
        elements.authId.textContent = collaborator.idAuth || collaborator.id || 'N/A';
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
        // Usar AreaManager para obtener las áreas
        const areaManager = new AreaManager();
        const organizacionCamelCase = userManager.currentUser.organizacionCamelCase; // Del ADMIN, no del colaborador
                
        elements.areaSelect.innerHTML = '<option value="">Cargando áreas...</option>';
        elements.areaSelect.disabled = true;
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Primero selecciona un área</option>';
        elements.cargoEnAreaSelect.disabled = true;
        
        const areas = await areaManager.getAreasByOrganizacion(organizacionCamelCase);
        
        // Guardar áreas para uso posterior
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
        
        // Cargar área y cargo actuales
        if (collaborator.areaAsignadaId) {            
            // Verificar que el área existe en la lista
            const areaExiste = areas.some(a => a.id === collaborator.areaAsignadaId);
            
            if (areaExiste) {
                // Seleccionar el área
                elements.areaSelect.value = collaborator.areaAsignadaId;
                
                // Disparar evento change para cargar los cargos
                const event = new Event('change', { bubbles: true });
                elements.areaSelect.dispatchEvent(event);
                
                // Función para seleccionar cargo
                const seleccionarCargo = () => {
                    // Usar el objeto `cargo` en lugar de los campos planos
                    if (collaborator.cargo && collaborator.cargo.id) {                        
                        const cargoSelect = elements.cargoEnAreaSelect;
                        // Buscar la opción cuyo valor (ID del cargo) coincida con el ID guardado
                        const option = Array.from(cargoSelect.options).find(opt => opt.value === collaborator.cargo.id);
                        
                        if (option) {
                            cargoSelect.value = option.value;
                            return true;
                        } else {
                            console.warn('⚠️ No se encontró el cargo con ID:', collaborator.cargo.id);
                        }
                    }
                    
                    // Fallback: buscar por nombre (por si acaso)
                    if (collaborator.cargo && collaborator.cargo.nombre) {
                        const optionPorNombre = Array.from(elements.cargoEnAreaSelect.options).find(
                            opt => opt.text === collaborator.cargo.nombre
                        );
                        
                        if (optionPorNombre) {
                            elements.cargoEnAreaSelect.value = optionPorNombre.value;
                            return true;
                        }
                    }
                    
                    console.warn('⚠️ No se encontró el cargo:', collaborator.cargo);
                    return false;
                };
                
                // Intentar seleccionar cargo múltiples veces
                setTimeout(seleccionarCargo, 300);
                setTimeout(seleccionarCargo, 600);
                setTimeout(seleccionarCargo, 1000);
                
            } else {
                console.warn('⚠️ El área asignada no existe en la base de datos:', collaborator.areaAsignadaId);
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
            confirmButtonText: 'ENTENDIDO',
            confirmButtonColor: 'var(--color-warning, #ffcc00)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
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
            // Usar el ID real del cargo si existe, o generar uno temporal
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

// ========== HANDLERS DE FOTOS ==========

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
            if (file) mostrarModalFoto(file, 'profile', elements);
            this.value = '';
        });
    }
}

function mostrarModalFoto(file, type, elements) {
    if (type !== 'profile') return;
    
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
        if (elements.previewImage) elements.previewImage.src = e.target.result;
        
        currentPhotoType = type;
        selectedFile = file;
        
        if (elements.modalTitle) {
            elements.modalTitle.textContent = 'CAMBIAR FOTO DE PERFIL';
        }
        
        if (elements.modalMessage) {
            const fileSize = (file.size / (1024 * 1024)).toFixed(2);
            elements.modalMessage.textContent = `Tamaño: ${fileSize} MB • ¿Deseas usar esta imagen?`;
        }
        
        if (elements.photoModal) elements.photoModal.style.display = 'flex';
    };
    
    reader.readAsDataURL(file);
}

function configurarModal(elements, userManager) {
    if (!elements.confirmChangeBtn || !elements.cancelChangeBtn) return;
    
    elements.confirmChangeBtn.addEventListener('click', async () => {
        if (!selectedFile || !window.currentCollaborator) return;
        
        if (currentPhotoType !== 'profile') return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            const imageBase64 = e.target.result;
            
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
        let cargoObjeto = null; // Para guardar el objeto completo del cargo
        
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
            // ✅ CORREGIDO: Guardar el objeto completo del cargo
            cargoObjeto = {
                id: cargoSeleccionado.id || elements.cargoEnAreaSelect.value,
                nombre: cargoNombre,
                descripcion: cargoDescripcion
            };
        }
        
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
                        <p><strong>Área asignada:</strong> ${areaNombre}</p>
                        <p><strong>Cargo en el área:</strong> ${cargoNombre}</p>
                        <p><strong>Status:</strong> ${elements.statusInput.value === 'active' ? 'Activo' : elements.statusInput.value === 'inactive' ? 'Inactivo' : 'Pendiente'}</p>
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
            const permisosPersonalizados = {};
            if (elements.permissionCheckboxes) {
                elements.permissionCheckboxes.forEach(checkbox => {
                    permisosPersonalizados[checkbox.value] = checkbox.checked;
                });
            }
            
            // ✅ CORREGIDO: Estructura de datos a actualizar - SIN CAMPOS PLANOS REDUNDANTES
            const updateData = {
                nombreCompleto: elements.fullName.value.trim(),
                status: elements.statusInput.value === 'active',
                // ✅ Guardar el objeto completo del cargo
                cargo: cargoObjeto,
                // ✅ Mantener SOLO el ID del área para poder seleccionarla después
                areaAsignadaId: elements.areaSelect.value,
                // ✅ Mantener los permisos
                permisosPersonalizados: permisosPersonalizados
            };
            
            // Llamar a updateUser con los datos limpios
            await userManager.updateUser(
                collaborator.id,
                updateData,
                'colaborador',
                collaborator.organizacionCamelCase
            );
            
            // Actualizar el objeto local del colaborador con los nuevos datos
            Object.assign(collaborator, updateData);
            // Asegurar que los campos derivados también se actualicen en el objeto local
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