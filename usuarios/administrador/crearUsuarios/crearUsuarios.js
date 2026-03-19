// ARCHIVO JS PARA CREAR COLABORADOR - VERSIÓN CORREGIDA (SIN DOBLE SELECCIÓN)
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
        // Obtener usuario actual (temporal - será reemplazado por componente Auth)
        const usuarioActual = obtenerUsuarioActual();

        if (!usuarioActual) {
            console.warn('No hay información de usuario, usando valores por defecto');
            usuarioActual = {
                id: `usuario_${Date.now()}`,
                uid: `usuario_${Date.now()}`,
                nombreCompleto: 'Usuario',
                organizacion: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
                correoElectronico: 'usuario@ejemplo.com',
                fotoOrganizacion: null,
                plan: 'gratis'
            };
        }
        
        // Configurar interfaz con datos del usuario
        actualizarInterfazConUsuario(elements, usuarioActual);
        
        // Cargar áreas desde Firebase usando AreaManager
        await cargarAreas(elements, usuarioActual);
        
        // Configurar handlers
        configurarHandlers(elements, userManager, usuarioActual);
                
    } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        mostrarErrorSistema(error.message);
    }
}

// ========== OBTENER USUARIO ACTUAL (TEMP) ==========
function obtenerUsuarioActual() {
    // TODO: Reemplazar con llamado al componente Auth
    try {
        // Intentar obtener de localStorage primero
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
        if (adminInfo && Object.keys(adminInfo).length > 0) {
            return {
                id: adminInfo.id || adminInfo.uid || `admin_${Date.now()}`,
                uid: adminInfo.uid || adminInfo.id,
                nombreCompleto: adminInfo.nombreCompleto || 'Administrador',
                organizacion: adminInfo.organizacion || 'Mi Organización',
                organizacionCamelCase: adminInfo.organizacionCamelCase || generarCamelCase(adminInfo.organizacion),
                correoElectronico: adminInfo.correoElectronico || '',
                fotoOrganizacion: adminInfo.fotoOrganizacion || null,
                plan: adminInfo.plan || 'gratis'
            };
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData && Object.keys(userData).length > 0) {
            return {
                id: userData.uid || userData.id || `user_${Date.now()}`,
                uid: userData.uid || userData.id,
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                organizacion: userData.organizacion || userData.empresa || 'Mi Organización',
                organizacionCamelCase: userData.organizacionCamelCase || generarCamelCase(userData.organizacion || userData.empresa),
                correoElectronico: userData.correo || userData.email || '',
                fotoOrganizacion: userData.fotoOrganizacion || null,
                plan: userData.plan || 'gratis'
            };
        }

        // Si no hay datos, retornar null para usar valores por defecto
        return null;

    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}

function generarCamelCase(texto) {
    if (!texto || typeof texto !== 'string') return 'miOrganizacion';
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
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
            text: 'No se pudieron cargar los elementos del formulario.'
        });
        return null;
    }
}

function actualizarInterfazConUsuario(elements, usuario) {
    // Actualizar campo de organización (solo lectura)
    if (elements.organization) {
        elements.organization.value = usuario.organizacion;
        elements.organization.classList.add('readonly-field');
    }
    
    // Actualizar nombre del usuario en el subtítulo
    if (elements.adminNameSubtitle) {
        elements.adminNameSubtitle.textContent = `Usuario: ${usuario.nombreCompleto} | ${usuario.organizacion}`;
    }
    
    // Cargar logo de organización heredado
    if (usuario.fotoOrganizacion && elements.orgCircle && elements.orgPlaceholder && elements.orgImage) {
        try {
            elements.orgPlaceholder.style.display = 'none';
            elements.orgImage.src = usuario.fotoOrganizacion;
            elements.orgImage.style.display = 'block';
            
            // Deshabilitar interacción con el logo
            elements.orgCircle.classList.add('org-disabled');
            if (elements.editOrgOverlay) {
                elements.editOrgOverlay.style.display = 'none';
            }
            
            // Actualizar texto informativo
            if (elements.orgInfoText) {
                elements.orgInfoText.textContent = 'Logo heredado. Los colaboradores verán este logo.';
            }
            
        } catch (error) {
            console.warn('⚠️ No se pudo cargar el logo de organización:', error);
        }
    }
    
    // Actualizar títulos con información del usuario
    if (elements.formMainTitle) {
        elements.formMainTitle.textContent = `CREAR COLABORADOR PARA ${usuario.organizacion.toUpperCase()}`;
    }
    
    if (elements.formSubTitle) {
        elements.formSubTitle.textContent = `Completa los datos para crear un colaborador en ${usuario.organizacion}`;
    }
    
    // Mostrar mensaje informativo
    mostrarMensajeInfoUsuario(elements.mainMessage, usuario);
}

function mostrarMensajeInfoUsuario(element, usuario) {
    if (!element) return;
    
    element.innerHTML = `
        <div class="message-container info" style="display: block;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fas fa-user"></i>
                <strong>Creando colaborador</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                <div><strong>Usuario:</strong> ${usuario.nombreCompleto}</div>
                <div><strong>Organización:</strong> ${usuario.organizacion}</div>
                <div><strong>Plan:</strong> ${usuario.plan ? usuario.plan.toUpperCase() : 'GRATIS'}</div>
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

async function cargarAreas(elements, usuario) {
    if (!elements.areaSelect) return;
    
    try {
        const areaManager = new AreaManager();
        
        console.log('🔍 Cargando áreas para organización:', usuario.organizacionCamelCase);
        
        elements.areaSelect.innerHTML = '<option value="">Cargando áreas...</option>';
        elements.areaSelect.disabled = true;
        elements.cargoEnAreaSelect.innerHTML = '<option value="">Primero selecciona un área</option>';
        elements.cargoEnAreaSelect.disabled = true;
        
        const areas = await areaManager.getAreasByOrganizacion(usuario.organizacionCamelCase);
        
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
            text: 'No se pudieron cargar las áreas. Puedes continuar sin asignar área.',
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
            const cargoId = cargo.id || `cargo_${index}_${Date.now()}`;
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

// ========== MANEJO DE IMÁGENES CON SWEETALERT2 ==========

function configurarHandlers(elements, userManager, usuario) {
    // Foto de perfil
    if (elements.editProfileOverlay && elements.profileInput) {
        elements.editProfileOverlay.addEventListener('click', () => elements.profileInput.click());
        elements.profileCircle.addEventListener('click', () => elements.profileInput.click());
        
        // IMPORTANTE: No limpiar el input aquí, solo cuando se abre
        elements.profileInput.addEventListener('click', function(e) {
            // Detener propagación para evitar eventos múltiples
            e.stopPropagation();
            // Limpiar solo cuando se abre el selector
            this.value = '';
        });
        
        // Usar { once: false } pero asegurar que no se acumulen eventos
        elements.profileInput.removeEventListener('change', manejarCambioFoto);
        elements.profileInput.addEventListener('change', function(e) {
            manejarCambioFoto(e, elements);
        });
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
        elements.registerBtn.addEventListener('click', (e) => registrarColaborador(e, elements, userManager, usuario));
    }
    
    // Botón cancelar
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => cancelarRegistro());
    }
}

// Variable para controlar que no se procese el mismo archivo múltiples veces
let procesandoFoto = false;

function manejarCambioFoto(event, elements) {
    // Prevenir procesamiento múltiple
    if (procesandoFoto) return;
    
    const file = event.target.files[0];
    if (!file) return;
    
    procesandoFoto = true;
    
    // Validar archivo
    if (!validarArchivo(file, 5)) {
        elements.profileInput.value = '';
        procesandoFoto = false;
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageBase64 = e.target.result;
        
        Swal.fire({
            title: 'Confirmar foto de perfil',
            html: `
                <div style="text-align: center;">
                    <img src="${imageBase64}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-accent-primary); margin-bottom: 15px;">
                    <p>¿Deseas usar esta imagen como foto de perfil del colaborador?</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR',
            cancelButtonText: 'CANCELAR'
        }).then((result) => {
            if (result.isConfirmed) {
                actualizarFotoPerfil(imageBase64, elements);
            }
            // SIEMPRE limpiar el input y resetear la bandera
            elements.profileInput.value = '';
            procesandoFoto = false;
        }).catch(() => {
            // En caso de error, también limpiar
            elements.profileInput.value = '';
            procesandoFoto = false;
        });
    };
    
    reader.onerror = function() {
        elements.profileInput.value = '';
        procesandoFoto = false;
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo leer el archivo'
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
            confirmButtonText: 'ENTENDIDO'
        });
        return false;
    }
    
    if (file.size > maxSize) {
        Swal.fire({
            icon: 'error',
            title: 'Archivo demasiado grande',
            text: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`,
            confirmButtonText: 'ENTENDIDO'
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
            showConfirmButton: false
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
    
    // Validar rol en el sistema
    if (elements.rol && !elements.rol.value) {
        errores.push('Debes seleccionar un rol en el sistema');
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

async function registrarColaborador(event, elements, userManager, usuario) {
    event.preventDefault();
    
    // Validar formulario
    const errores = validarFormulario(elements);
    if (errores.length > 0) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            html: errores.map(msg => `• ${msg}`).join('<br>'),
            confirmButtonText: 'CORREGIR'
        });
        return;
    }
    
    // Obtener datos del área y cargo seleccionados (si existen)
    let areaNombre = 'No asignada';
    let cargoNombre = 'No asignado';
    let cargoDescripcion = '';
    let cargoObjeto = null;
    let areaId = null;
    
    if (elements.areaSelect && elements.areaSelect.value) {
        areaId = elements.areaSelect.value;
        const areas = elements.areaSelect._areasData || [];
        const areaSeleccionada = areas.find(a => a.id === areaId);
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
            cargoObjeto = {
                id: cargoSeleccionado.id || elements.cargoEnAreaSelect.value,
                nombre: cargoNombre,
                descripcion: cargoDescripcion
            };
        }
    }
    
    // Mostrar confirmación
    const confirmResult = await Swal.fire({
        title: 'Crear colaborador',
        html: `
            <div style="text-align: left; padding: 10px 0;">
                <p><strong>Nombre:</strong> ${elements.nombreCompleto.value.trim()}</p>
                <p><strong>Email:</strong> ${elements.correoElectronico.value.trim()}</p>
                <p><strong>Rol en sistema:</strong> ${elements.rol ? elements.rol.options[elements.rol.selectedIndex].text : 'No especificado'}</p>
                <p><strong>Área asignada:</strong> ${areaNombre}</p>
                <p><strong>Cargo en el área:</strong> ${cargoNombre}</p>
                <p style="color: var(--color-warning, #ff9800); margin-top: 15px;">
                    <i class="fas fa-exclamation-triangle"></i> Se enviará un correo de verificación al colaborador.
                </p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR',
        cancelButtonText: 'CANCELAR',
        allowOutsideClick: false
    });
    
    if (!confirmResult.isConfirmed) return;
    
    // Mostrar loader
    Swal.fire({
        title: 'Creando colaborador...',
        text: 'Esto puede tomar unos segundos. Por favor espera...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const colaboradorData = {
            nombreCompleto: elements.nombreCompleto.value.trim(),
            correoElectronico: elements.correoElectronico.value.trim(),
            fotoUsuario: elements.profileImage.src || null,
            
            // Campos heredados del usuario
            organizacion: usuario.organizacion,
            organizacionCamelCase: usuario.organizacionCamelCase,
            fotoOrganizacion: usuario.fotoOrganizacion,
            theme: usuario.theme || 'light',
            plan: usuario.plan || 'gratis',
            
            // Usar el objeto cargo para la información del puesto
            cargo: cargoObjeto,
            
            // Solo el ID del área, no el nombre
            areaAsignadaId: areaId,
            
            // El campo rol es para el nivel de acceso
            rol: elements.rol ? elements.rol.value : 'colaborador',
            
            // Campos de sistema
            status: true,
            
            // Campos de trazabilidad
            creadoPor: usuario.id,
            creadoPorEmail: usuario.correoElectronico,
            creadoPorNombre: usuario.nombreCompleto,
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
            usuario.id
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
        title: '¡Colaborador creado!',
        html: `
            <div style="text-align: center;">
                <p><strong>Nombre:</strong> ${colaboradorData.nombreCompleto}</p>
                <p><strong>Email:</strong> ${colaboradorData.correoElectronico}</p>
                <p><strong>Organización:</strong> ${colaboradorData.organizacion}</p>
                <p style="margin-top: 15px;"><i class="fas fa-envelope"></i> Se ha enviado un correo de verificación</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'CREAR OTRO',
        cancelButtonText: 'IR AL PANEL',
        allowOutsideClick: false
    });
    
    if (result.isConfirmed) {
        // Recargar página para nuevo registro
        location.reload();
    } else {
        window.location.href = '../usuarios/usuarios.html';
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
                if (error.message && error.message.includes('Firestore')) {
                    errorMessage = 'Error en la base de datos';
                    errorTitle = 'Error de base de datos';
                }
        }
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    Swal.fire({
        icon: 'error',
        title: errorTitle,
        html: `
            <div>
                <p>${errorMessage}</p>
                <p style="color: var(--color-warning, #ff9800); margin-top: 15px; font-size: 0.9rem;">
                    <i class="fas fa-exclamation-triangle"></i> Si el problema persiste, contacta al soporte técnico.
                </p>
            </div>
        `,
        confirmButtonText: 'ENTENDIDO',
        allowOutsideClick: true
    });
}

// ========== FUNCIONES AUXILIARES ==========

function cancelarRegistro() {
    Swal.fire({
        title: '¿Cancelar registro?',
        text: "Se perderán todos los datos ingresados",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR',
        cancelButtonText: 'CANCELAR'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '../usuarios/usuarios.html';
        }
    });
}

// ========== EXPORT ==========
export { initCollaboratorForm };