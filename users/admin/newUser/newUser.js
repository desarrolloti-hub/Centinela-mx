// ARCHIVO JS PARA CREAR COLABORADOR
// ==================== IMPORTS CORREGIDOS ====================
import { UserManager } from '/clases/user.js';
import { AreaManager } from '/clases/area.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initCollaboratorForm();
});

async function initCollaboratorForm() {
    
    // Obtener elementos del DOM
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    // Instanciar UserManager
    const userManager = new UserManager();

    try {
        // Esperar a que el usuario actual esté disponible
        await esperarUsuarioActual(userManager);
        
        // Cargar administrador actual
        const currentAdmin = await cargarAdministradorActual(userManager, elements);
        if (!currentAdmin) return;
        
        // Configurar interfaz con datos del admin
        actualizarInterfazConAdmin(elements, currentAdmin);
        
        // Cargar áreas desde Firebase usando AreaManager
        await cargarAreas(elements, currentAdmin);
        
        // Configurar handlers
        configurarHandlers(elements, userManager, currentAdmin);
                
    } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        mostrarErrorSistema(error.message);
    }
}

// ========== FUNCIONES DE UTILIDAD ==========

function obtenerElementosDOM() {
    try {
        return {
            // Fotos
            profileCircle: document.getElementById('profileCircle'),
            profilePlaceholder: document.getElementById('profilePlaceholder'),
            profileImage: document.getElementById('profileImage'),
            editProfileOverlay: document.getElementById('editProfileOverlay'),
            profileInput: document.getElementById('profile-input'),
            
            // Logo de organización (heredado)
            orgCircle: document.getElementById('orgCircle'),
            orgPlaceholder: document.getElementById('orgPlaceholder'),
            orgImage: document.getElementById('orgImage'),
            editOrgOverlay: document.getElementById('editOrgOverlay'),
            orgInfoText: document.getElementById('orgInfoText'),
            
            // Campos del formulario
            organization: document.getElementById('organization'),
            nombreCompleto: document.getElementById('nombreCompleto'),
            correoElectronico: document.getElementById('correoElectronico'),
            rol: document.getElementById('rol'),
            // SELECTORES
            areaSelect: document.getElementById('areaSelect'),
            cargoEnAreaSelect: document.getElementById('cargoEnAreaSelect'),
            
            contrasena: document.getElementById('contrasena'),
            confirmarContrasena: document.getElementById('confirmarContrasena'),
            
            // Botones y mensajes
            registerBtn: document.getElementById('registerBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            mainMessage: document.getElementById('mainMessage'),
            registerForm: document.getElementById('registerForm'),
            
            // Títulos
            adminNameSubtitle: document.getElementById('adminNameSubtitle'),
            formMainTitle: document.getElementById('formMainTitle'),
            formSubTitle: document.getElementById('formSubTitle'),
            
            // Toggle de contraseñas
            toggleContrasenaBtns: document.querySelectorAll('.toggle-contrasena')
        };
    } catch (error) {
        console.error('❌ Error obteniendo elementos DOM:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de configuración',
            text: 'No se pudieron cargar los elementos del formulario.',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        });
        return null;
    }
}

// Función para esperar que el usuario actual esté disponible
async function esperarUsuarioActual(userManager, maxAttempts = 15, delay = 500) {
    for (let i = 0; i < maxAttempts; i++) {
        if (userManager.currentUser) {
            return userManager.currentUser;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('No se pudo detectar el usuario actual después de ' + maxAttempts + ' intentos');
}

async function cargarAdministradorActual(userManager, elements) {
    try {
        // Mostrar loader
        Swal.fire({
            title: 'Cargando información...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container'
            }
        });
        
        // Obtener administrador actual desde UserManager
        const admin = userManager.currentUser;
        
        if (!admin) {
            throw new Error('No hay sesión activa de administrador');
        }
        
        if (admin.cargo !== 'administrador') {
            throw new Error('Solo los administradores pueden crear colaboradores');
        }
        
        // Verificar que tenga organización
        if (!admin.organizacion || !admin.organizacionCamelCase) {
            throw new Error('El administrador no tiene organización configurada');
        }
        
        Swal.close();
        return admin;
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error cargando administrador:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error de sesión',
            text: error.message,
            confirmButtonText: 'Ir al login',
            confirmButtonColor: 'var(--color-accent-primary, #c0c0c0)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        }).then(() => {
            window.location.href = '/users/visitors/login/login.html';
        });
        
        return null;
    }
}

function actualizarInterfazConAdmin(elements, admin) {
    // Actualizar campo de organización (solo lectura)
    if (elements.organization) {
        elements.organization.value = admin.organizacion;
        elements.organization.classList.add('readonly-field');
        
        // Añadir indicador visual
        const label = elements.organization.closest('.form-field-group')?.querySelector('.field-label');
        if (label) {
            const indicator = document.createElement('span');
            indicator.className = 'admin-indicator';
            indicator.textContent = ' (heredado)';
            indicator.style.color = 'var(--color-accent-primary)';
            indicator.style.fontSize = '0.75rem';
            label.appendChild(indicator);
        }
    }
    
    // Actualizar nombre del administrador en el subtítulo
    if (elements.adminNameSubtitle) {
        elements.adminNameSubtitle.textContent = `Administrador: ${admin.nombreCompleto} | ${admin.organizacion}`;
    }
    
    // Cargar logo de organización heredado
    if (admin.fotoOrganizacion && elements.orgCircle && elements.orgPlaceholder && elements.orgImage) {
        try {
            elements.orgPlaceholder.style.display = 'none';
            elements.orgImage.src = admin.fotoOrganizacion;
            elements.orgImage.style.display = 'block';
            
            // Deshabilitar interacción con el logo
            elements.orgCircle.classList.add('org-disabled');
            if (elements.editOrgOverlay) {
                elements.editOrgOverlay.style.display = 'none';
            }
            
            // Actualizar texto informativo
            if (elements.orgInfoText) {
                elements.orgInfoText.textContent = 'Logo heredado del administrador. Los colaboradores verán este logo.';
            }
            
        } catch (error) {
            console.warn('⚠️ No se pudo cargar el logo de organización:', error);
        }
    }
    
    // Actualizar títulos con información del admin
    if (elements.formMainTitle) {
        elements.formMainTitle.textContent = `CREAR COLABORADOR PARA ${admin.organizacion.toUpperCase()}`;
    }
    
    if (elements.formSubTitle) {
        elements.formSubTitle.textContent = `Completa los datos para crear un colaborador en ${admin.organizacion}`;
    }
    
    // Mostrar mensaje informativo
    mostrarMensajeInfoAdmin(elements.mainMessage, admin);
}

function mostrarMensajeInfoAdmin(element, admin) {
    if (!element) return;
    
    element.innerHTML = `
        <div class="message-container info" style="display: block;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fas fa-user-shield"></i>
                <strong>Creando colaborador como administrador</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                <div><strong>Administrador:</strong> ${admin.nombreCompleto}</div>
                <div><strong>Organización:</strong> ${admin.organizacion}</div>
                <div><strong>Plan:</strong> ${admin.plan ? admin.plan.toUpperCase() : 'GRATIS'}</div>
            </div>
            <div style="margin-top: 8px; padding: 8px; background: var(--color-bg-secondary); border-radius: 4px; font-size: 0.8rem;">
                <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                El colaborador heredará estos datos de la organización.
            </div>
        </div>
    `;
    element.style.display = 'block';
}

// ========== FUNCIONES PARA CARGAR ÁREAS Y CARGOS ==========

async function cargarAreas(elements, admin) {
    if (!elements.areaSelect) return;
    
    try {
        // Usar AreaManager para obtener las áreas (igual que en editUser.js)
        const areaManager = new AreaManager();
        
        console.log('🔍 Cargando áreas para organización:', admin.organizacionCamelCase);
        
        elements.areaSelect.innerHTML = '<option value="">Cargando áreas...</option>';
        elements.areaSelect.disabled = true;
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Primero selecciona un área</option>';
        elements.cargoEnAreaSelect.disabled = true;
        
        const areas = await areaManager.getAreasByOrganizacion(admin.organizacionCamelCase);
        
        // Guardar las áreas en el elemento select para usarlas después
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
        
    } catch (error) {
        console.error('❌ Error cargando áreas:', error);
        elements.areaSelect.innerHTML = '<option value="">Error al cargar áreas</option>';
        elements.areaSelect.disabled = false;
        
        Swal.fire({
            icon: 'warning',
            title: 'Error al cargar áreas',
            text: 'No se pudieron cargar las áreas. Por favor, recarga la página.',
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
    
    // Resetear selector de cargos
    elements.cargoEnAreaSelect.innerHTML = '';
    elements.cargoEnAreaSelect.disabled = true;
    
    if (!areaId) {
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Primero selecciona un área</option>';
        return;
    }
    
    // Buscar el área seleccionada
    const areaSeleccionada = areas.find(a => a.id === areaId);
    
    if (!areaSeleccionada) {
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Área no encontrada</option>';
        return;
    }
    
    // Obtener cargos del área
    const cargos = areaSeleccionada.getCargosAsArray ? areaSeleccionada.getCargosAsArray() : [];
    
    if (cargos.length === 0) {
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Esta área no tiene cargos</option>';
    } else {
        let options = '<option value="">Selecciona un cargo</option>';
        cargos.forEach((cargo, index) => {
            // Usar el ID real del cargo si existe
            const cargoId = cargo.id || `cargo_${index}_${Date.now()}`;
            options += `<option value="${cargoId}">${cargo.nombre || 'Cargo sin nombre'}</option>`;
            
            // Guardar los datos del cargo en el option para recuperarlos después
            if (!elements.cargoEnAreaSelect._cargosData) {
                elements.cargoEnAreaSelect._cargosData = {};
            }
            elements.cargoEnAreaSelect._cargosData[cargoId] = cargo;
        });
        elements.cargoEnAreaSelect.innerHTML = options;
    }
    
    elements.cargoEnAreaSelect.disabled = false;
}

// ========== MANEJO DE IMÁGENES ==========

function configurarHandlers(elements, userManager, admin) {
    // Foto de perfil
    if (elements.editProfileOverlay && elements.profileInput) {
        elements.editProfileOverlay.addEventListener('click', () => elements.profileInput.click());
        elements.profileCircle.addEventListener('click', () => elements.profileInput.click());
        
        elements.profileInput.addEventListener('change', (e) => manejarSeleccionFoto(e, elements));
    }
    
    // Mostrar/ocultar contraseña
    if (elements.toggleContrasenaBtns) {
        elements.toggleContrasenaBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = this.querySelector('i');
                
                if (input && icon) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                }
            });
        });
    }
    
    // Evento para cuando cambia el área seleccionada
    if (elements.areaSelect) {
        elements.areaSelect.addEventListener('change', () => cargarCargosPorArea(elements));
    }
    
    // Validación en tiempo real
    configurarValidacionTiempoReal(elements);
    
    // Botón de registro
    if (elements.registerBtn) {
        elements.registerBtn.addEventListener('click', (e) => registrarColaborador(e, elements, userManager, admin));
    }
    
    // Botón cancelar
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => cancelarRegistro());
    }
}

function manejarSeleccionFoto(event, elements) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar archivo
    if (!validarArchivo(file, 5)) {
        elements.profileInput.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        Swal.fire({
            title: 'CONFIRMAR FOTO DE PERFIL',
            html: `
                <div style="text-align: center;">
                    <img src="${e.target.result}" 
                         style="width: 150px; height: 150px; border-radius: 50%; border: 4px solid var(--color-accent-primary); margin-bottom: 20px; object-fit: cover;">
                    <p>¿Deseas usar esta imagen como foto de perfil del colaborador?</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'SI, USAR ESTA FOTO',
            cancelButtonText: 'NO, CANCELAR',
            confirmButtonColor: 'var(--color-success, #28a745)',
            cancelButtonColor: 'var(--color-accent-primary, #3085d6)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                actualizarFotoPerfil(e.target.result, elements);
            } else {
                elements.profileInput.value = '';
            }
        });
    };
    
    reader.readAsDataURL(file);
}

function validarArchivo(file, maxSizeMB) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = maxSizeMB * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
        Swal.fire({
            icon: 'error',
            title: 'Formato no válido',
            text: 'Solo se permiten archivos JPG, PNG, GIF o WebP',
            confirmButtonText: 'ENTENDIDO',
            confirmButtonColor: 'var(--color-danger, #ef4444)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        });
        return false;
    }
    
    if (file.size > maxSize) {
        Swal.fire({
            icon: 'error',
            title: 'Archivo demasiado grande',
            text: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`,
            confirmButtonText: 'ENTENDIDO',
            confirmButtonColor: 'var(--color-danger, #ef4444)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        });
        return false;
    }
    
    return true;
}

function actualizarFotoPerfil(imageSrc, elements) {
    if (elements.profilePlaceholder && elements.profileImage) {
        elements.profilePlaceholder.style.display = 'none';
        elements.profileImage.src = imageSrc;
        elements.profileImage.style.display = 'block';
        
        Swal.fire({
            icon: 'success',
            title: '¡Foto cargada!',
            text: 'La foto de perfil se ha cargado correctamente',
            timer: 2000,
            showConfirmButton: false,
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                timerProgressBar: 'swal2-timer-progress-bar'
            }
        });
    }
}

// ========== VALIDACIÓN ==========

function configurarValidacionTiempoReal(elements) {
    // Validar coincidencia de contraseñas
    if (elements.confirmarContrasena) {
        elements.confirmarContrasena.addEventListener('input', function() {
            if (elements.contrasena.value && this.value) {
                this.style.borderColor = elements.contrasena.value === this.value ? 'var(--color-success, #28a745)' : 'var(--color-danger, #dc3545)';
            } else {
                this.style.borderColor = '';
            }
        });
    }
    
    // Validar email
    if (elements.correoElectronico) {
        elements.correoElectronico.addEventListener('blur', function() {
            if (this.value) {
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
                this.style.borderColor = isValid ? 'var(--color-success, #28a745)' : 'var(--color-danger, #dc3545)';
            } else {
                this.style.borderColor = '';
            }
        });
    }
}

function validarFormulario(elements) {
    const errores = [];
    
    // Nombre completo
    if (!elements.nombreCompleto.value.trim()) {
        errores.push('El nombre completo es obligatorio');
    } else if (elements.nombreCompleto.value.trim().length < 5) {
        errores.push('El nombre completo debe tener al menos 5 caracteres');
    }
    
    // Email
    if (!elements.correoElectronico.value.trim()) {
        errores.push('El correo electrónico es obligatorio');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(elements.correoElectronico.value)) {
        errores.push('El correo electrónico no es válido');
    }
    
    // Contraseña
    if (!elements.contrasena.value) {
        errores.push('La contraseña es obligatoria');
    } else if (!validarContrasena(elements.contrasena.value)) {
        errores.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
    }
    
    // Confirmar contraseña
    if (!elements.confirmarContrasena.value) {
        errores.push('Debes confirmar la contraseña');
    } else if (elements.contrasena.value !== elements.confirmarContrasena.value) {
        errores.push('Las contraseñas no coinciden');
    }
    
    // Rol en el sistema
    if (elements.rol && !elements.rol.value) {
        errores.push('Debes seleccionar un rol en el sistema');
    }
    
    // Validar área seleccionada
    if (elements.areaSelect && !elements.areaSelect.value) {
        errores.push('Debes seleccionar un área');
    }
    
    // Validar cargo en el área seleccionado
    if (elements.cargoEnAreaSelect && !elements.cargoEnAreaSelect.value) {
        errores.push('Debes seleccionar un cargo en el área');
    }
    
    return errores;
}

function validarContrasena(password) {
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

// ========== REGISTRO DE COLABORADOR ==========

async function registrarColaborador(event, elements, userManager, admin) {
    event.preventDefault();
    
    // Validar formulario
    const errores = validarFormulario(elements);
    if (errores.length > 0) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            html: errores.map(msg => `• ${msg}`).join('<br>'),
            confirmButtonText: 'CORREGIR',
            confirmButtonColor: 'var(--color-danger, #ef4444)',
            customClass: {
                popup: 'swal2-popup',
                title: 'swal2-title',
                htmlContainer: 'swal2-html-container',
                confirmButton: 'swal2-confirm'
            }
        });
        return;
    }
    
    // Obtener datos del área y cargo seleccionados
    let areaNombre = 'No asignada';
    let cargoNombre = 'No asignado';
    let cargoDescripcion = '';
    
    if (elements.areaSelect && elements.areaSelect.value) {
        const areas = elements.areaSelect._areasData || [];
        const areaSeleccionada = areas.find(a => a.id === elements.areaSelect.value);
        if (areaSeleccionada) {
            areaNombre = areaSeleccionada.nombreArea;
        }
    }
    
    if (elements.cargoEnAreaSelect && elements.cargoEnAreaSelect.value) {
        const cargosData = elements.cargoEnAreaSelect._cargosData || {};
        const cargoSeleccionado = cargosData[elements.cargoEnAreaSelect.value];
        if (cargoSeleccionado) {
            cargoNombre = cargoSeleccionado.nombre || 'Cargo sin nombre';
            cargoDescripcion = cargoSeleccionado.descripcion || '';
        }
    }
    
    // Mostrar confirmación
    const confirmResult = await Swal.fire({
        title: 'CREAR COLABORADOR',
        html: `
            <div style="text-align: left; padding: 10px 0;">
                <div style="background: var(--color-bg-secondary); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                    <p><strong>Administrador creador:</strong> ${admin.nombreCompleto}</p>
                    <p><strong>Organización:</strong> ${admin.organizacion}</p>
                </div>
                <p><strong>Nombre:</strong> ${elements.nombreCompleto.value.trim()}</p>
                <p><strong>Email:</strong> ${elements.correoElectronico.value.trim()}</p>
                <p><strong>Rol en sistema:</strong> ${elements.rol ? elements.rol.options[elements.rol.selectedIndex].text : 'No especificado'}</p>
                <p><strong>Área asignada:</strong> ${areaNombre}</p>
                <p><strong>Cargo en el área:</strong> ${cargoNombre}</p>
                ${cargoDescripcion ? `<p><small>Descripción del cargo: ${cargoDescripcion}</small></p>` : ''}
                <p><strong>Plan heredado:</strong> ${admin.plan ? admin.plan.toUpperCase() : 'GRATIS'}</p>
                <p style="color: var(--color-warning, #ff9800); margin-top: 15px;">
                    <i class="fas fa-exclamation-triangle"></i> Se enviará un correo de verificación al colaborador.
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR REGISTRO',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: 'var(--color-success, #28a745)',
        cancelButtonColor: 'var(--color-accent-primary, #3085d6)',
        allowOutsideClick: false,
        customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel'
        }
    });
    
    if (!confirmResult.isConfirmed) return;
    
    // Mostrar loader
    Swal.fire({
        title: 'Creando colaborador...',
        html: 'Esto puede tomar unos segundos. Por favor espera...',
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
        // Preparar datos del colaborador
        const colaboradorData = {
            nombreCompleto: elements.nombreCompleto.value.trim(),
            correoElectronico: elements.correoElectronico.value.trim(),
            fotoUsuario: elements.profileImage.src || null,
            
            // Campos heredados del administrador
            organizacion: admin.organizacion,
            organizacionCamelCase: admin.organizacionCamelCase,
            fotoOrganizacion: admin.fotoOrganizacion,
            theme: admin.theme || 'light',
            plan: admin.plan || 'gratis',
            
            // Área y cargo asignados
            areaAsignadaId: elements.areaSelect ? elements.areaSelect.value : null,
            areaAsignadaNombre: areaNombre,
            cargoAsignadoId: elements.cargoEnAreaSelect ? elements.cargoEnAreaSelect.value : null,
            cargoAsignadoNombre: cargoNombre,
            cargoAsignadoDescripcion: cargoDescripcion,
            
            // Campos específicos
            rol: elements.rol ? elements.rol.value : 'colaborador',
            
            // Campos de sistema
            cargo: 'colaborador',
            status: true,
            
            // Campos de trazabilidad
            creadoPor: admin.id,
            creadoPorEmail: admin.correoElectronico,
            creadoPorNombre: admin.nombreCompleto,
            fechaCreacion: new Date(),
            
            // Permisos básicos
            permisosPersonalizados: {
                dashboard: true,
                verPerfil: true,
                verOrganizacion: true,
                actualizarPerfil: false,
                crearContenido: false
            }
        };
        
        // Crear colaborador usando UserManager
        const resultado = await userManager.createColaborador(
            colaboradorData,
            elements.contrasena.value,
            admin.id
        );
                
        // Mostrar éxito
        Swal.close();
        await mostrarExitoRegistro(colaboradorData);
        
    } catch (error) {
        console.error('❌ Error creando colaborador:', error);
        Swal.close();
        manejarErrorRegistro(error);
    }
}

async function mostrarExitoRegistro(colaboradorData) {
    const result = await Swal.fire({
        icon: 'success',
        title: '¡COLABORADOR CREADO!',
        html: `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 60px; color: var(--color-success, #28a745); margin-bottom: 20px;">
                    <i class="fas fa-user-check"></i>
                </div>
                <h3 style="color: var(--color-text-primary); margin-bottom: 15px;">
                    ¡Colaborador creado exitosamente!
                </h3>
                <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Nombre:</strong> ${colaboradorData.nombreCompleto}</p>
                    <p><strong>Email:</strong> ${colaboradorData.correoElectronico}</p>
                    <p><strong>Rol en sistema:</strong> ${colaboradorData.rol.toUpperCase()}</p>
                    <p><strong>Área asignada:</strong> ${colaboradorData.areaAsignadaNombre}</p>
                    <p><strong>Cargo:</strong> ${colaboradorData.cargoAsignadoNombre}</p>
                    <p><strong>Organización:</strong> ${colaboradorData.organizacion}</p>
                    <p><strong>Creado por:</strong> ${colaboradorData.creadoPorNombre}</p>
                </div>
                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <h4 style="color: #0a2540; margin-bottom: 10px;">
                        <i class="fas fa-envelope"></i> Verificación de Email
                    </h4>
                    <p style="color: #666; margin-bottom: 10px;">
                        Se ha enviado un correo de verificación a <strong>${colaboradorData.correoElectronico}</strong>
                    </p>
                    <p style="color: #666; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> El colaborador debe verificar su email antes de iniciar sesión
                    </p>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'CREAR OTRO COLABORADOR',
        cancelButtonText: 'IR AL PANEL DE CONTROL',
        confirmButtonColor: 'var(--color-success, #28a745)',
        cancelButtonColor: 'var(--color-accent-primary, #3085d6)',
        allowOutsideClick: false,
        customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm',
            cancelButton: 'swal2-cancel'
        }
    });
    
    if (result.isConfirmed) {
        // Recargar página para nuevo registro
        location.reload();
    } else {
        window.location.href = '/users/admin/managementUser/managementUser.html';
    }
}

function manejarErrorRegistro(error) {
    let errorMessage = 'Ocurrió un error al crear el colaborador';
    let errorTitle = 'Error al crear colaborador';
    
    // Manejar errores específicos
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
            default:
                if (error.message.includes('Firestore')) {
                    errorMessage = 'Error en la base de datos: ' + error.message;
                    errorTitle = 'Error de base de datos';
                }
        }
    } else if (error.message) {
        if (error.message.includes('El correo electrónico ya está registrado')) {
            errorMessage = error.message;
            errorTitle = 'Email duplicado';
        } else if (error.message.includes('Límite de colaboradores alcanzado')) {
            errorMessage = error.message;
            errorTitle = 'Límite alcanzado';
        } else if (error.message.includes('No tienes permisos')) {
            errorMessage = error.message;
            errorTitle = 'Permisos insuficientes';
        }
    }
    
    Swal.fire({
        icon: 'error',
        title: errorTitle,
        html: `
            <div style="text-align: left;">
                <p>${errorMessage}</p>
                <p style="color: var(--color-warning, #ff9800); margin-top: 15px; font-size: 0.9rem;">
                    <i class="fas fa-exclamation-triangle"></i> Si el problema persiste, contacta al soporte técnico.
                </p>
            </div>
        `,
        confirmButtonText: 'ENTENDIDO',
        confirmButtonColor: 'var(--color-danger, #ef4444)',
        allowOutsideClick: true,
        customClass: {
            popup: 'swal2-popup',
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm'
        }
    });
}

// ========== FUNCIONES AUXILIARES ==========

function cancelarRegistro() {
    Swal.fire({
        title: '¿Cancelar registro?',
        text: "Se perderán todos los datos ingresados",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No, continuar',
        confirmButtonColor: 'var(--color-danger, #ef4444)',
        cancelButtonColor: 'var(--color-accent-primary, #3085d6)',
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
}

function mostrarErrorSistema(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error del sistema',
        text: mensaje || 'Ha ocurrido un error inesperado',
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

// ========== EXPORT ==========
export { initCollaboratorForm };