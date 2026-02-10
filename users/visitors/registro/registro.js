// ARCHIVO JS PARA REGISTRO DE ADMINISTRADOR

// Importar las clases correctamente desde user.js
import { UserManager } from '/clases/user.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initRegistrationForm();
});

async function initRegistrationForm() {
    console.log('🚀 Iniciando formulario de registro de administrador...');
    
    // Obtener elementos del DOM
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    // Instanciar UserManager
    const userManager = new UserManager();
    console.log('✅ UserManager inicializado');
    
    // Configurar handlers
    configurarHandlers(elements, userManager);
    
    // Mostrar mensaje inicial
    mostrarMensajeInicial(elements.mainMessage);
    
    console.log('✅ Formulario de administrador inicializado correctamente');
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
            
            // Logo de organización
            orgCircle: document.getElementById('orgCircle'),
            orgPlaceholder: document.getElementById('orgPlaceholder'),
            orgImage: document.getElementById('orgImage'),
            editOrgOverlay: document.getElementById('editOrgOverlay'),
            orgInput: document.getElementById('org-input'),
            
            // Campos del formulario
            organization: document.getElementById('organization'),
            fullName: document.getElementById('fullName'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirmPassword'),
            
            // Botones y mensajes
            registerBtn: document.getElementById('registerBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            mainMessage: document.getElementById('mainMessage'),
            registerForm: document.getElementById('registerForm'),
            
            // Toggle de contraseñas
            togglePasswordBtns: document.querySelectorAll('.toggle-password'),
            
            // Modal
            photoModal: document.getElementById('photoModal'),
            previewImage: document.getElementById('previewImage'),
            modalTitle: document.getElementById('modalTitle'),
            modalMessage: document.getElementById('modalMessage'),
            confirmChangeBtn: document.getElementById('confirmChangeBtn'),
            cancelChangeBtn: document.getElementById('cancelChangeBtn')
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

function mostrarMensajeInicial(element) {
    if (!element) return;
    
    element.innerHTML = `
        <div class="message-container info" style="display: block;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fas fa-user-shield"></i>
                <strong>REGISTRO DE ADMINISTRADOR</strong>
            </div>
            <p>Completa todos los campos para crear una nueva cuenta de administrador para tu organización.</p>
            <div style="margin-top: 8px; padding: 8px; background: var(--color-bg-secondary); border-radius: 4px; font-size: 0.85rem;">
                <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                Una vez registrado, podrás crear colaboradores para tu organización.
            </div>
        </div>
    `;
    element.style.display = 'block';
}

// ========== MANEJO DE IMÁGENES ==========

function configurarHandlers(elements, userManager) {
    // Foto de perfil
    if (elements.editProfileOverlay && elements.profileInput) {
        elements.editProfileOverlay.addEventListener('click', () => elements.profileInput.click());
        elements.profileCircle.addEventListener('click', () => elements.profileInput.click());
        
        elements.profileInput.addEventListener('change', (e) => manejarSeleccionFoto(e, elements, 'profile'));
    }
    
    // Logo de organización
    if (elements.editOrgOverlay && elements.orgInput) {
        elements.editOrgOverlay.addEventListener('click', () => elements.orgInput.click());
        elements.orgCircle.addEventListener('click', () => elements.orgInput.click());
        
        elements.orgInput.addEventListener('change', (e) => manejarSeleccionFoto(e, elements, 'organization'));
    }
    
    // Mostrar/ocultar contraseña
    if (elements.togglePasswordBtns) {
        elements.togglePasswordBtns.forEach(btn => {
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
    
    // Validación en tiempo real
    configurarValidacionTiempoReal(elements);
    
    // Botón de registro
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', (e) => registrarAdministrador(e, elements, userManager));
    }
    
    // Botón cancelar
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => cancelarRegistro());
    }
    
    // Modal de confirmación de foto
    if (elements.confirmChangeBtn && elements.cancelChangeBtn && elements.photoModal) {
        elements.confirmChangeBtn.addEventListener('click', () => confirmarCambioFoto(elements));
        elements.cancelChangeBtn.addEventListener('click', () => cancelarCambioFoto(elements));
        
        elements.photoModal.addEventListener('click', (e) => {
            if (e.target === elements.photoModal) {
                cancelarCambioFoto(elements);
            }
        });
    }
}

// Variables para manejo de imágenes
let selectedFile = null;
let currentPhotoType = '';
let profileImageBase64 = null;
let orgImageBase64 = null;

function manejarSeleccionFoto(event, elements, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar archivo
    const maxSizeMB = type === 'profile' ? 5 : 10;
    if (!validarArchivo(file, maxSizeMB)) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Mostrar preview en modal
        if (elements.previewImage) {
            elements.previewImage.src = e.target.result;
        }
        
        // Configurar modal según tipo
        if (elements.modalTitle) {
            elements.modalTitle.textContent = type === 'profile' 
                ? 'CAMBIAR FOTO DE PERFIL' 
                : 'CAMBIAR LOGO DE ORGANIZACIÓN';
        }
        
        if (elements.modalMessage) {
            elements.modalMessage.textContent = type === 'profile'
                ? '¿Deseas usar esta imagen como tu foto de perfil?'
                : '¿Deseas usar esta imagen como logo de tu organización?';
        }
        
        // Mostrar modal
        if (elements.photoModal) {
            elements.photoModal.style.display = 'flex';
        }
        
        selectedFile = file;
        currentPhotoType = type;
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

function confirmarCambioFoto(elements) {
    if (!selectedFile || !currentPhotoType) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (currentPhotoType === 'profile') {
            // Actualizar foto de perfil
            if (elements.profilePlaceholder && elements.profileImage) {
                elements.profilePlaceholder.style.display = 'none';
                elements.profileImage.src = e.target.result;
                elements.profileImage.style.display = 'block';
                profileImageBase64 = e.target.result;
                
                Swal.fire({
                    icon: 'success',
                    title: '¡Foto guardada!',
                    text: 'Tu foto de perfil se ha guardado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } else {
            // Actualizar logo de organización
            if (elements.orgPlaceholder && elements.orgImage) {
                elements.orgPlaceholder.style.display = 'none';
                elements.orgImage.src = e.target.result;
                elements.orgImage.style.display = 'block';
                orgImageBase64 = e.target.result;
                
                Swal.fire({
                    icon: 'success',
                    title: '¡Logo guardada!',
                    text: 'El logo de organización se ha guardado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        }
        
        // Limpiar y cerrar
        limpiarModal(elements);
    };
    
    reader.readAsDataURL(selectedFile);
}

function cancelarCambioFoto(elements) {
    limpiarModal(elements);
}

function limpiarModal(elements) {
    if (elements.photoModal) {
        elements.photoModal.style.display = 'none';
    }
    
    // Limpiar inputs de archivo
    if (elements.profileInput) elements.profileInput.value = '';
    if (elements.orgInput) elements.orgInput.value = '';
    
    selectedFile = null;
    currentPhotoType = '';
}

// ========== VALIDACIÓN ==========

function configurarValidacionTiempoReal(elements) {
    // Validar coincidencia de contraseñas
    if (elements.confirmPassword) {
        elements.confirmPassword.addEventListener('input', function() {
            if (elements.password.value && this.value) {
                this.style.borderColor = elements.password.value === this.value ? '#28a745' : '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }
    
    // Validar email
    if (elements.email) {
        elements.email.addEventListener('blur', function() {
            if (this.value) {
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
                this.style.borderColor = isValid ? '#28a745' : '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }
    
    // Validar organización en tiempo real
    if (elements.organization) {
        elements.organization.addEventListener('blur', function() {
            if (this.value && this.value.trim().length >= 3) {
                this.style.borderColor = '#28a745';
            } else if (this.value) {
                this.style.borderColor = '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }
}

function validarFormulario(elements) {
    const errores = [];
    
    // Organización (con validación de nombre)
    if (!elements.organization.value.trim()) {
        errores.push('El nombre de la organización es obligatorio');
    } else if (elements.organization.value.trim().length < 3) {
        errores.push('El nombre de la organización debe tener al menos 3 caracteres');
    }
    
    // Nombre completo
    if (!elements.fullName.value.trim()) {
        errores.push('El nombre completo es obligatorio');
    } else if (elements.fullName.value.trim().length < 5) {
        errores.push('El nombre completo debe tener al menos 5 caracteres');
    }
    
    // Email
    if (!elements.email.value.trim()) {
        errores.push('El correo electrónico es obligatorio');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(elements.email.value)) {
        errores.push('El correo electrónico no es válido');
    }
    
    // Contraseña
    if (!elements.password.value) {
        errores.push('La contraseña es obligatoria');
    } else if (!validarContrasena(elements.password.value)) {
        errores.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
    }
    
    // Confirmar contraseña
    if (!elements.confirmPassword.value) {
        errores.push('Debes confirmar la contraseña');
    } else if (elements.password.value !== elements.confirmPassword.value) {
        errores.push('Las contraseñas no coinciden');
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

function convertToCamelCase(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

// ========== VALIDACIÓN DE ORGANIZACIÓN EXISTENTE ==========

async function verificarOrganizacionExistente(nombreOrganizacion, userManager) {
    try {
        console.log('🔍 Verificando si la organización ya existe:', nombreOrganizacion);
        
        // Convertir a diferentes formatos para comparación
        const nombreNormalizado = nombreOrganizacion.toLowerCase().trim();
        const nombreCamelCase = convertToCamelCase(nombreOrganizacion);
        
        // Obtener todas las organizaciones usando el método existente en UserManager
        const organizaciones = await userManager.getTodasLasOrganizaciones();
        
        // Buscar si alguna organización coincide con el nombre
        for (const organizacion of organizaciones) {
            // Comparar nombre normalizado (case-insensitive)
            if (organizacion.nombre.toLowerCase() === nombreNormalizado) {
                console.log('❌ Organización encontrada:', organizacion.nombre);
                return true;
            }
            
            // También verificar camelCase
            if (organizacion.camelCase === nombreCamelCase) {
                console.log('❌ Organización encontrada (camelCase):', nombreCamelCase);
                return true;
            }
        }
        
        console.log('✅ Organización disponible');
        return false;
        
    } catch (error) {
        console.error('❌ Error verificando organización:', error);
        
        // Si hay error de Firebase (conexión, permisos, etc.)
        if (error.code === 'permission-denied' || error.code === 'unavailable') {
            console.warn('⚠️ Error de acceso a Firestore. Continuando con validación básica...');
            
            // Mostrar advertencia al usuario
            await Swal.fire({
                icon: 'warning',
                title: 'Advertencia de conexión',
                html: `
                    <div style="text-align: left;">
                        <p>No se pudo verificar completamente si la organización ya existe.</p>
                        <p style="color: #ff9800; margin-top: 10px;">
                            <i class="fas fa-exclamation-triangle"></i> El sistema continuará con el registro.
                        </p>
                        <p style="font-size: 0.9rem; margin-top: 10px;">
                            Si la organización ya existe, el sistema lo detectará durante el proceso de registro.
                        </p>
                    </div>
                `,
                confirmButtonText: 'CONTINUAR',
                confirmButtonColor: '#3085d6'
            });
            
            // Permitir el registro - Firebase Auth detectará duplicados durante el proceso
            return false;
        }
        
        // Para otros errores, permitir el registro y confiar en que Firebase Auth lo manejará
        return false;
    }
}

// ========== REGISTRO DE ADMINISTRADOR ==========

async function registrarAdministrador(event, elements, userManager) {
    event.preventDefault();
    
    // Deshabilitar botón para evitar doble clic
    if (elements.registerBtn) {
        elements.registerBtn.disabled = true;
        elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }
    
    // Validar formulario
    const errores = validarFormulario(elements);
    if (errores.length > 0) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            html: errores.map(msg => `• ${msg}`).join('<br>'),
            confirmButtonText: 'CORREGIR'
        });
        
        // Rehabilitar botón
        if (elements.registerBtn) {
            elements.registerBtn.disabled = false;
            elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
        }
        return;
    }
    
    const nombreOrganizacion = elements.organization.value.trim();
    
    try {
        // Verificar si la organización ya existe (con loader)
        Swal.fire({
            title: 'Verificando organización...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const organizacionExiste = await verificarOrganizacionExistente(nombreOrganizacion, userManager);
        
        Swal.close();
        
        if (organizacionExiste) {
            Swal.fire({
                icon: 'error',
                title: 'Organización ya registrada',
                html: `
                    <div style="text-align: left;">
                        <p>La organización <strong>"${nombreOrganizacion}"</strong> ya está registrada en el sistema.</p>
                        <p style="color: #ff9800; margin-top: 10px;">
                            <i class="fas fa-exclamation-triangle"></i> Por favor, utiliza un nombre diferente para tu organización.
                        </p>
                        <div style="background: var(--color-bg-secondary); padding: 10px; border-radius: 5px; margin-top: 15px;">
                            <p style="font-size: 0.9rem;"><strong>Tip:</strong> Puedes añadir tu nombre, apellido o ubicación para hacerlo único.</p>
                            <p style="font-size: 0.9rem;">Ejemplo: "${nombreOrganizacion} México", "${nombreOrganizacion} Tech", etc.</p>
                        </div>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: '#d33'
            });
            
            // Resaltar campo de organización
            if (elements.organization) {
                elements.organization.style.borderColor = '#dc3545';
                elements.organization.focus();
            }
            
            // Rehabilitar botón
            if (elements.registerBtn) {
                elements.registerBtn.disabled = false;
                elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
            }
            return;
        }
        
        // Mostrar confirmación final
        const confirmResult = await Swal.fire({
            title: 'CREAR CUENTA DE ADMINISTRADOR',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <div style="background: var(--color-bg-secondary); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                        <p><strong>Organización:</strong> ${nombreOrganizacion}</p>
                        <p><strong>Nombre:</strong> ${elements.fullName.value.trim()}</p>
                        <p><strong>Email:</strong> ${elements.email.value.trim()}</p>
                        <p><strong>Tipo de cuenta:</strong> SUPER ADMINISTRADOR</p>
                    </div>
                    <p style="color: #ff9800; margin-top: 15px;">
                        <i class="fas fa-exclamation-triangle"></i> Se enviará un correo de verificación a tu email.
                    </p>
                    <div style="background: #43474a; padding: 10px; border-radius: 5px; margin-top: 15px;">
                        <p style="font-size: 0.9rem;"><strong>Importante:</strong> Serás el administrador principal de esta organización y podrás crear colaboradores.</p>
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR REGISTRO',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#3085d6',
            allowOutsideClick: false
        });
        
        if (!confirmResult.isConfirmed) {
            // Rehabilitar botón si cancela
            if (elements.registerBtn) {
                elements.registerBtn.disabled = false;
                elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
            }
            return;
        }
        
        // Mostrar loader de creación
        Swal.fire({
            title: 'Creando cuenta de administrador...',
            html: 'Esto puede tomar unos segundos. Por favor espera...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Crear objeto de datos para el administrador
        const organizacionCamelCase = convertToCamelCase(nombreOrganizacion);
        
        const adminData = {
            organizacion: nombreOrganizacion,
            organizacionCamelCase: organizacionCamelCase,
            nombreCompleto: elements.fullName.value.trim(),
            correoElectronico: elements.email.value.trim(),
            fotoUsuario: profileImageBase64,
            fotoOrganizacion: orgImageBase64,
            cargo: 'administrador',
            status: true,
            theme: 'Predeterminado',
            plan: 'gratis',
            fechaCreacion: new Date()
        };
        
        console.log('📝 Datos del administrador a crear:', {
            organizacion: adminData.organizacion,
            nombre: adminData.nombreCompleto,
            email: adminData.correoElectronico,
            camelCase: adminData.organizacionCamelCase
        });
        
        // Registrar administrador usando UserManager
        const resultado = await userManager.createAdministrador(
            adminData,
            elements.password.value
        );
        
        console.log('✅ Administrador creado exitosamente:', resultado);
        
        // Cerrar loader
        Swal.close();
        
        // Mostrar éxito con instrucciones
        await mostrarExitoRegistro(adminData);
        
    } catch (error) {
        console.error('❌ Error creando administrador:', error);
        Swal.close();
        manejarErrorRegistro(error);
        
        // Rehabilitar botón
        if (elements.registerBtn) {
            elements.registerBtn.disabled = false;
            elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
        }
    }
}

async function mostrarExitoRegistro(adminData) {
    const result = await Swal.fire({
        icon: 'success',
        title: '¡REGISTRO EXITOSO!',
        html: `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 60px; color: #28a745; margin-bottom: 20px;">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h3 style="color: var(--color-text-primary); margin-bottom: 15px;">
                    ¡Cuenta creada exitosamente!
                </h3>
                <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Organización:</strong> ${adminData.organizacion}</p>
                    <p><strong>Administrador:</strong> ${adminData.nombreCompleto}</p>
                    <p><strong>Email:</strong> ${adminData.correoElectronico}</p>
                    <p><strong>Rol:</strong> SUPER ADMINISTRADOR</p>
                    <p><strong>Plan:</strong> ${adminData.plan.toUpperCase()}</p>
                </div>
                <div style="background: #fde8e8; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <h4 style="color: #0a2540; margin-bottom: 10px;">
                        <i class="fas fa-envelope"></i> Verificación de Email
                    </h4>
                    <p style="color: #666; margin-bottom: 10px;">
                        Se ha enviado un correo de verificación a <strong>${adminData.correoElectronico}</strong>
                    </p>
                    <p style="color: #666; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Debes verificar tu email antes de iniciar sesión
                    </p>
                </div>
                </div>
            </div>
        `,
        confirmButtonText: 'IR AL INICIO DE SESIÓN',
        confirmButtonColor: '#28a745',
        allowOutsideClick: false
    }).then(() => {
        // Redirigir al login
        window.location.href = '/users/visitors/login/login.html';
    });
}

function manejarErrorRegistro(error) {
    let errorMessage = 'Ocurrió un error al crear la cuenta de administrador';
    let errorTitle = 'Error al crear cuenta';
    let errorDetails = error.message || '';
    
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
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
                errorTitle = 'Demasiados intentos';
                break;
            default:
                if (error.message) {
                    // Errores personalizados
                    if (error.message.includes('organización') || error.message.includes('Organización')) {
                        errorMessage = error.message;
                        errorTitle = 'Error de organización';
                    } else if (error.message.includes('Firestore')) {
                        errorMessage = 'Error en la base de datos: ' + error.message;
                        errorTitle = 'Error de base de datos';
                    }
                }
        }
    } else if (error.message) {
        // Errores personalizados
        if (error.message.includes('organización') || error.message.includes('Organización')) {
            errorMessage = error.message;
            errorTitle = 'Error de organización';
        } else if (error.message.includes('Ya existe')) {
            errorMessage = error.message;
            errorTitle = 'Registro duplicado';
        } else if (error.message.includes('Límite')) {
            errorMessage = error.message;
            errorTitle = 'Límite alcanzado';
        }
    }
    
    Swal.fire({
        icon: 'error',
        title: errorTitle,
        html: `
            <div style="text-align: left;">
                <p>${errorMessage}</p>
                ${errorDetails ? `<p style="color: #666; font-size: 0.9rem; margin-top: 10px;"><strong>Detalles:</strong> ${errorDetails}</p>` : ''}
                <p style="color: #ff9800; margin-top: 15px; font-size: 0.9rem;">
                    <i class="fas fa-exclamation-triangle"></i> Si el problema persiste, contacta al soporte técnico.
                </p>
            </div>
        `,
        confirmButtonText: 'ENTENDIDO',
        confirmButtonColor: '#d33',
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
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No, continuar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/users/visitors/login/login.html';
        }
    });
}

// ========== EXPORT ==========
export { initRegistrationForm };