// ARCHIVO JS COMPLETO PARA CREAR COLABORADOR
// Basado en el código del administrador

// Importar las clases correctamente desde user.js
import { UserManager } from '/clases/user.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initCollaboratorForm();
});

function applySweetAlertStyles() {
    const style = document.createElement('style');
    style.textContent = /*css*/`
        /* Estilos personalizados para SweetAlert2 */
        .swal2-popup {
            background: var(--color-bg-tertiary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-medium) !important;
            box-shadow: var(--shadow-large) !important;
            backdrop-filter: blur(8px) !important;
            font-family: 'Rajdhani', sans-serif !important;
        }
        
        .swal2-title {
            color: var(--color-text-primary) !important;
            font-family: 'Orbitron', sans-serif !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
        }
        
        .swal2-html-container {
            color: var(--color-text-secondary) !important;
            font-size: 1rem !important;
        }
        
        .swal2-confirm {
            background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary)) !important;
            color: white !important;
            border: none !important;
            border-radius: var(--border-radius-small) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
            box-shadow: var(--shadow-small) !important;
        }
        
        .swal2-confirm:hover {
            background: linear-gradient(135deg, var(--color-accent-secondary), var(--color-accent-primary)) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal) !important;
        }
        
        .swal2-cancel {
            background: linear-gradient(135deg, var(--color-bg-tertiary), var(--color-text-secondary)) !important;
            color: var(--color-text-primary) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: var(--border-radius-small) !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important;
            font-family: 'Rajdhani', sans-serif !important;
            transition: var(--transition-default) !important;
            box-shadow: var(--shadow-small) !important;
        }
        
        .swal2-cancel:hover {
            background: linear-gradient(135deg, var(--color-text-secondary), var(--color-bg-tertiary)) !important;
            border-color: var(--color-accent-primary) !important;
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-normal) !important;
        }
    `;
    document.head.appendChild(style);
}

function initCollaboratorForm() {
    console.log('Iniciando formulario de registro de colaborador...');
    
    // Verificar que todos los elementos del DOM existan
    const elements = {
        // Foto de perfil
        logoPreview: document.getElementById('logoPreview'),
        logoPlaceholder: document.getElementById('logoPlaceholder'),
        fotoPerfil: document.getElementById('fotoPerfil'),
        logoSelectBtn: document.getElementById('logoSelectBtn'),
        logoRemoveBtn: document.getElementById('logoRemoveBtn'),
        
        // Campos del formulario
        nombreCompleto: document.getElementById('nombreCompleto'),
        correoElectronico: document.getElementById('correoElectronico'),
        contrasena: document.getElementById('contrasena'),
        confirmarContrasena: document.getElementById('confirmarContrasena'),
        rol: document.getElementById('rol'),
        departamento: document.getElementById('departamento'),
        fechaIngreso: document.getElementById('fechaIngreso'),
        telefono: document.getElementById('telefono'),
        direccion: document.getElementById('direccion'),
        habilidades: document.getElementById('habilidades'),
        observaciones: document.getElementById('observaciones'),
        
        // Botones
        registerBtn: document.getElementById('registerBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        
        // Mensajes
        mainMessage: document.getElementById('mainMessage'),
        
        // Formulario
        registerForm: document.getElementById('registerForm')
    };

    // Verificar elementos críticos
    const elementosCriticos = ['nombreCompleto', 'correoElectronico', 'contrasena', 'confirmarContrasena', 'registerForm'];
    for (const elemento of elementosCriticos) {
        if (!elements[elemento]) {
            console.error(`Elemento crítico no encontrado: ${elemento}`);
            showErrorMessage(`Error: No se encontró el elemento ${elemento}. Contacta al administrador.`);
            return;
        }
    }

    // Instancia del UserManager
    const userManager = new UserManager();
    console.log('UserManager inicializado para registro de colaborador');
    
    // Variables para imagen
    let selectedFile = null;
    let profileImageBase64 = null;
    let currentAdmin = null;

    // ========== FUNCIONES DE UTILIDAD ==========
    function showMessage(element, type, text) {
        if (!element) return;
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        const colors = {
            'success': '#4CAF50',
            'error': '#F44336',
            'warning': '#FF9800',
            'info': '#2196F3'
        };
        
        element.innerHTML = `
            <div class="message-${type}" style="
                background: ${colors[type]}15;
                border-left: 4px solid ${colors[type]};
                padding: 12px 16px;
                border-radius: 4px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease;
            ">
                <i class="fas ${icons[type]}" style="color: ${colors[type]};"></i>
                <span style="color: var(--color-text-primary);">${text}</span>
            </div>
        `;
        element.style.display = 'block';
        
        // Auto-ocultar mensajes después de 5 segundos (excepto errores)
        if (type !== 'error') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    function showErrorMessage(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonText: 'ENTENDIDO',
            confirmButtonColor: '#d33'
        });
    }

    // ========== FUNCIONES DE VALIDACIÓN ==========
    function validateFile(file, maxSizeMB = 2) {
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

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validatePassword(password) {
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

    // ========== MANEJO DE IMÁGENES ==========
    function updatePhoto(previewElement, placeholderElement, imageSrc) {
        if (imageSrc && previewElement && placeholderElement) {
            // Remover imagen anterior si existe
            const existingImg = previewElement.querySelector('img');
            if (existingImg) {
                existingImg.remove();
            }
            
            // Crear nueva imagen
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = 'Foto de perfil';
            img.style.display = 'block';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            
            // Agregar la imagen al círculo
            previewElement.appendChild(img);
            
            // Ocultar placeholder
            placeholderElement.style.display = 'none';
            
            // Mostrar botón de remover
            if (elements.logoRemoveBtn) {
                elements.logoRemoveBtn.style.display = 'flex';
            }
            
            // Cambiar texto del botón de selección
            if (elements.logoSelectBtn) {
                elements.logoSelectBtn.innerHTML = '<i class="fas fa-sync-alt"></i> CAMBIAR FOTO';
            }
            
            // Almacenar referencia de la imagen
            profileImageBase64 = imageSrc;
            
            // Mostrar confirmación
            Swal.fire({
                icon: 'success',
                title: '¡Foto cargada!',
                text: 'La foto de perfil se ha cargado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        }
    }

    function removePhoto() {
        if (elements.logoPreview && elements.logoPlaceholder) {
            // Remover la imagen
            const img = elements.logoPreview.querySelector('img');
            if (img) {
                img.remove();
            }
            
            // Mostrar placeholder
            elements.logoPlaceholder.style.display = 'flex';
            
            // Ocultar botón de remover
            if (elements.logoRemoveBtn) {
                elements.logoRemoveBtn.style.display = 'none';
            }
            
            // Restaurar texto del botón de selección
            if (elements.logoSelectBtn) {
                elements.logoSelectBtn.innerHTML = '<i class="fas fa-upload"></i> SELECCIONAR FOTO';
            }
            
            // Limpiar input de archivo
            if (elements.fotoPerfil) {
                elements.fotoPerfil.value = '';
            }
            
            // Limpiar referencia
            profileImageBase64 = null;
            selectedFile = null;
            
            // Mostrar confirmación
            Swal.fire({
                icon: 'info',
                title: 'Foto removida',
                text: 'La foto de perfil ha sido removida',
                timer: 2000,
                showConfirmButton: false
            });
        }
    }

    // ========== EVENTOS DE IMÁGENES ==========
    // Seleccionar foto
    if (elements.logoSelectBtn && elements.fotoPerfil) {
        elements.logoSelectBtn.addEventListener('click', function() {
            elements.fotoPerfil.click();
        });
    }
    
    // Manejar selección de archivo
    if (elements.fotoPerfil) {
        elements.fotoPerfil.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file && validateFile(file, 2)) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Preguntar confirmación al usuario
                    Swal.fire({
                        title: 'CONFIRMAR FOTO DE PERFIL',
                        html: `
                            <div style="text-align: center;">
                                <img src="${e.target.result}" 
                                     style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 15px 0; border: 3px solid var(--color-accent-primary);">
                                <p>¿Deseas usar esta imagen como foto de perfil del colaborador?</p>
                            </div>
                        `,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'SI, USAR ESTA FOTO',
                        cancelButtonText: 'NO, CANCELAR',
                        confirmButtonColor: '#28a745',
                        cancelButtonColor: '#d33'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            updatePhoto(elements.logoPreview, elements.logoPlaceholder, e.target.result);
                            selectedFile = file;
                        } else {
                            // Limpiar input
                            elements.fotoPerfil.value = '';
                        }
                    });
                };
                
                reader.readAsDataURL(file);
            } else {
                // Limpiar input si no es válido
                elements.fotoPerfil.value = '';
            }
        });
    }
    
    // Remover foto
    if (elements.logoRemoveBtn) {
        elements.logoRemoveBtn.addEventListener('click', function() {
            Swal.fire({
                title: '¿Remover foto de perfil?',
                text: 'La foto actual será eliminada',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'SI, REMOVER',
                cancelButtonText: 'CANCELAR',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6'
            }).then((result) => {
                if (result.isConfirmed) {
                    removePhoto();
                }
            });
        });
    }

    // ========== MOSTRAR/OCULTAR CONTRASEÑA ==========
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
        });
    });

    // ========== OBTENER ADMINISTRADOR ACTUAL ==========
    async function loadCurrentAdmin() {
        try {
            // Obtener el administrador actual de localStorage
            const adminData = JSON.parse(localStorage.getItem('currentUser'));
            
            if (!adminData) {
                showErrorMessage('No hay sesión de administrador activa. Por favor, inicia sesión.');
                setTimeout(() => {
                    window.location.href = '/users/visitors/login/login.html';
                }, 3000);
                return null;
            }
            
            currentAdmin = adminData;
            console.log('Administrador actual cargado:', currentAdmin.email);
            return adminData;
        } catch (error) {
            console.error('Error al cargar administrador:', error);
            showErrorMessage('Error al cargar datos del administrador');
            return null;
        }
    }

    // ========== REGISTRO DE COLABORADOR ==========
    async function registerCollaborator(event) {
        event.preventDefault();
        console.log('Formulario de registro de colaborador enviado');
        
        // Deshabilitar botón de registro para evitar doble envío
        if (elements.registerBtn) {
            elements.registerBtn.disabled = true;
            elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }
        
        // Validar que haya un administrador logueado
        if (!currentAdmin) {
            const adminLoaded = await loadCurrentAdmin();
            if (!adminLoaded) {
                if (elements.registerBtn) {
                    elements.registerBtn.disabled = false;
                    elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR COLABORADOR';
                }
                return;
            }
        }
        
        // Validaciones básicas
        let isValid = true;
        let messages = [];
        
        // Validar nombre completo
        if (!elements.nombreCompleto.value.trim()) {
            isValid = false;
            messages.push('El nombre completo es obligatorio');
        } else if (elements.nombreCompleto.value.trim().length < 5) {
            isValid = false;
            messages.push('El nombre completo debe tener al menos 5 caracteres');
        }
        
        // Validar email
        if (!elements.correoElectronico.value.trim()) {
            isValid = false;
            messages.push('El correo electrónico es obligatorio');
        } else if (!validateEmail(elements.correoElectronico.value)) {
            isValid = false;
            messages.push('El correo electrónico no es válido');
        }
        
        // Validar contraseña
        if (!elements.contrasena.value) {
            isValid = false;
            messages.push('La contraseña es obligatoria');
        } else if (!validatePassword(elements.contrasena.value)) {
            isValid = false;
            messages.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
        }
        
        // Validar confirmación de contraseña
        if (!elements.confirmarContrasena.value) {
            isValid = false;
            messages.push('Debes confirmar la contraseña');
        } else if (elements.contrasena.value !== elements.confirmarContrasena.value) {
            isValid = false;
            messages.push('Las contraseñas no coinciden');
        }
        
        // Validar rol
        if (elements.rol && !elements.rol.value) {
            isValid = false;
            messages.push('Debes seleccionar un rol');
        }
        
        // Validar fecha de ingreso
        if (elements.fechaIngreso && !elements.fechaIngreso.value) {
            isValid = false;
            messages.push('La fecha de ingreso es obligatoria');
        }
        
        if (!isValid) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                html: messages.map(msg => `• ${msg}`).join('<br>'),
                confirmButtonText: 'CORREGIR'
            });
            
            // Rehabilitar botón
            if (elements.registerBtn) {
                elements.registerBtn.disabled = false;
                elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR COLABORADOR';
            }
            return;
        }
        
        // Mostrar confirmación final
        const confirmResult = await Swal.fire({
            title: 'CREAR COLABORADOR',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <p><strong>Nombre:</strong> ${elements.nombreCompleto.value.trim()}</p>
                    <p><strong>Email:</strong> ${elements.correoElectronico.value.trim()}</p>
                    <p><strong>Rol:</strong> ${elements.rol ? elements.rol.options[elements.rol.selectedIndex].text : 'No especificado'}</p>
                    <p><strong>Organización:</strong> ${currentAdmin.organizacion || 'No especificada'}</p>
                    <p style="color: #ff9800; margin-top: 15px;">
                        <i class="fas fa-exclamation-triangle"></i> Se enviará un correo de verificación al colaborador.
                    </p>
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
                elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR COLABORADOR';
            }
            return;
        }
        
        // Mostrar loader
        Swal.fire({
            title: 'Creando colaborador...',
            html: 'Esto puede tomar unos segundos. Por favor espera...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            // Crear objeto de datos para el colaborador
            const collaboratorData = {
                nombreCompleto: elements.nombreCompleto.value.trim(),
                correoElectronico: elements.correoElectronico.value.trim(),
                fotoUsuario: profileImageBase64,
                rol: elements.rol ? elements.rol.value : 'colaborador',
                departamento: elements.departamento ? elements.departamento.value : '',
                fechaIngreso: elements.fechaIngreso ? elements.fechaIngreso.value : '',
                telefono: elements.telefono ? elements.telefono.value : '',
                direccion: elements.direccion ? elements.direccion.value : '',
                habilidades: elements.habilidades ? elements.habilidades.value : '',
                observaciones: elements.observaciones ? elements.observaciones.value : '',
                esSuperAdmin: false,
                esAdminOrganizacion: false,
                status: true,
                theme: 'light',
                plan: 'gratis',
                organizacion: currentAdmin.organizacion,
                organizacionCamelCase: currentAdmin.organizacionCamelCase,
                creadoPor: currentAdmin.uid,
                creadoPorEmail: currentAdmin.email,
                fechaCreacion: new Date().toISOString()
            };
            
            console.log('Registrando colaborador con datos:', {
                nombre: collaboratorData.nombreCompleto,
                email: collaboratorData.correoElectronico,
                organizacion: collaboratorData.organizacion,
                tieneFotoUsuario: !!collaboratorData.fotoUsuario,
                rol: collaboratorData.rol
            });
            
            // Registrar colaborador usando UserManager
            const resultado = await userManager.createColaborador(
                collaboratorData,
                elements.contrasena.value,
                currentAdmin
            );
            
            console.log('Colaborador creado exitosamente:', resultado);
            
            // Cerrar loader
            Swal.close();
            
            // Mostrar éxito con instrucciones
            await Swal.fire({
                icon: 'success',
                title: '¡COLABORADOR CREADO!',
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 60px; color: #28a745; margin-bottom: 20px;">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <h3 style="color: var(--color-text-primary); margin-bottom: 15px;">
                            ¡Colaborador creado exitosamente!
                        </h3>
                        <div style="background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p><strong>Nombre:</strong> ${collaboratorData.nombreCompleto}</p>
                            <p><strong>Email:</strong> ${collaboratorData.correoElectronico}</p>
                            <p><strong>Rol:</strong> ${collaboratorData.rol.toUpperCase()}</p>
                            <p><strong>Organización:</strong> ${collaboratorData.organizacion}</p>
                        </div>
                        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <h4 style="color: #0a2540; margin-bottom: 10px;">
                                <i class="fas fa-envelope"></i> Verificación de Email
                            </h4>
                            <p style="color: #666; margin-bottom: 10px;">
                                Se ha enviado un correo de verificación a <strong>${collaboratorData.correoElectronico}</strong>
                            </p>
                            <p style="color: #666; font-size: 0.9rem;">
                                <i class="fas fa-info-circle"></i> El colaborador debe verificar su email antes de iniciar sesión
                            </p>
                        </div>
                        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <p style="color: #0a2540; font-weight: bold; margin-bottom: 10px;">
                                <i class="fas fa-lightbulb"></i> Instrucciones para el colaborador:
                            </p>
                            <ol style="text-align: left; margin: 0; padding-left: 20px; color: #666;">
                                <li>Revisar su bandeja de entrada (y carpeta de spam)</li>
                                <li>Hacer clic en el enlace de verificación del correo</li>
                                <li>Iniciar sesión con sus credenciales</li>
                                <li>Completar su perfil si es necesario</li>
                            </ol>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'CREAR OTRO COLABORADOR',
                cancelButtonText: 'IR AL PANEL DE CONTROL',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#3085d6',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    // Limpiar formulario para nuevo registro
                    resetForm();
                    // Rehabilitar botón
                    if (elements.registerBtn) {
                        elements.registerBtn.disabled = false;
                        elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR COLABORADOR';
                    }
                } else {
                    // Redirigir al panel de control
                    window.location.href = '/users/admin/dashboard/dashboard.html';
                }
            });
            
        } catch (error) {
            // Cerrar loader
            Swal.close();
            
            // Rehabilitar botón
            if (elements.registerBtn) {
                elements.registerBtn.disabled = false;
                elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR COLABORADOR';
            }
            
            // Mostrar error específico
            console.error('Error en registro de colaborador:', error);
            
            let errorMessage = 'Ocurrió un error al crear el colaborador';
            let errorDetails = error.message || '';
            let errorTitle = 'Error al crear colaborador';
            
            // Manejar errores específicos de Firebase
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
                        // Si es un error personalizado de nuestra lógica
                        if (error.message.includes('El correo electrónico ya está registrado')) {
                            errorMessage = error.message;
                            errorTitle = 'Email duplicado';
                        } else if (error.message.includes('Límite de colaboradores alcanzado')) {
                            errorMessage = error.message;
                            errorTitle = 'Límite alcanzado';
                        } else if (error.message.includes('Firestore')) {
                            errorMessage = 'Error en la base de datos: ' + error.message;
                            errorTitle = 'Error de base de datos';
                        }
                }
            } else if (error.message) {
                // Errores personalizados de nuestra lógica
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
    }

    // ========== RESET FORMULARIO ==========
    function resetForm() {
        // Limpiar campos
        elements.nombreCompleto.value = '';
        elements.correoElectronico.value = '';
        elements.contrasena.value = '';
        elements.confirmarContrasena.value = '';
        
        if (elements.rol) elements.rol.value = '';
        if (elements.departamento) elements.departamento.value = '';
        if (elements.fechaIngreso) elements.fechaIngreso.value = '';
        if (elements.telefono) elements.telefono.value = '';
        if (elements.direccion) elements.direccion.value = '';
        if (elements.habilidades) elements.habilidades.value = '';
        if (elements.observaciones) elements.observaciones.value = '';
        
        // Remover foto
        removePhoto();
        
        // Restablecer estilos de validación
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.style.borderColor = '';
            element.style.boxShadow = '';
        });
        
        // Mostrar mensaje de éxito
        if (elements.mainMessage) {
            showMessage(elements.mainMessage, 'success', 'Formulario limpiado. Puedes crear otro colaborador.');
        }
        
        console.log('Formulario reiniciado para nuevo colaborador');
    }

    // ========== CANCELAR REGISTRO ==========
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', async () => {
            const confirmResult = await Swal.fire({
                title: '¿Cancelar registro?',
                text: "Se perderán todos los datos ingresados",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6'
            });
            
            if (confirmResult.isConfirmed) {
                window.location.href = '/users/admin/dashboard/dashboard.html';
            }
        });
    }

    // ========== VALIDACIÓN EN TIEMPO REAL ==========
    // Validar contraseñas coincidan
    if (elements.contrasena && elements.confirmarContrasena) {
        elements.confirmarContrasena.addEventListener('input', function() {
            if (elements.contrasena.value && this.value) {
                if (elements.contrasena.value !== this.value) {
                    this.style.borderColor = '#dc3545';
                    this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
                } else {
                    this.style.borderColor = '#28a745';
                    this.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
                }
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
    }
    
    // Validar email
    if (elements.correoElectronico) {
        elements.correoElectronico.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                this.style.borderColor = '#dc3545';
                this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            } else if (this.value) {
                this.style.borderColor = '#28a745';
                this.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
    }
    
    // Validar fortaleza de contraseña
    if (elements.contrasena) {
        elements.contrasena.addEventListener('input', function() {
            if (this.value) {
                if (!validatePassword(this.value)) {
                    this.style.borderColor = '#ff9800';
                    this.style.boxShadow = '0 0 0 0.2rem rgba(255, 152, 0, 0.25)';
                } else {
                    this.style.borderColor = '#28a745';
                    this.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
                }
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
    }

    // ========== INICIALIZACIÓN DEL FORMULARIO ==========
    if (elements.registerForm) {
        // Cargar administrador actual primero
        loadCurrentAdmin().then(admin => {
            if (admin) {
                console.log('Formulario listo para crear colaboradores');
                
                // Configurar evento submit
                elements.registerForm.addEventListener('submit', registerCollaborator);
                
                // Establecer fecha actual por defecto
                if (elements.fechaIngreso) {
                    const today = new Date().toISOString().split('T')[0];
                    elements.fechaIngreso.value = today;
                    elements.fechaIngreso.max = today; // No permitir fechas futuras
                }
                
                // Mensaje inicial
                setTimeout(() => {
                    if (elements.mainMessage) {
                        showMessage(elements.mainMessage, 'info', 
                            `REGISTRO DE COLABORADOR para ${admin.organizacion}. Completa los campos obligatorios para agregar un nuevo colaborador a tu organización.`);
                    }
                }, 1000);
            }
        });
    }
    
    // Aplicar estilos SweetAlert
    applySweetAlertStyles();
    
    console.log('Formulario de registro de colaborador inicializado correctamente');
}

export { initCollaboratorForm };