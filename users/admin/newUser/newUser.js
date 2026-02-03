// ARCHIVO JS PARA CREAR COLABORADOR - VERSIÓN COMPLETA Y CORREGIDA
// Hereda campos del administrador actual desde UserManager

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

function initCollaboratorForm() {
    console.log('Iniciando formulario de registro de colaborador...');
    
    // Verificar que todos los elementos del DOM existan
    const elements = {
        // Elementos del DOM según HTML actual
        // Foto de perfil
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
        nombreCompleto: document.getElementById('nombreCompleto'),
        correoElectronico: document.getElementById('correoElectronico'),
        rol: document.getElementById('rol'),
        contrasena: document.getElementById('contrasena'),
        confirmarContrasena: document.getElementById('confirmarContrasena'),
        
        // Otros elementos
        registerBtn: document.getElementById('registerBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        mainMessage: document.getElementById('mainMessage'),
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

    // ========== ACTUALIZAR INTERFAZ CON DATOS DEL ADMIN ==========
    async function updateAdminInfo(admin) {
        console.log('Actualizando interfaz con datos del administrador:', admin);
        
        // 1. Mostrar organización en el campo correspondiente
        if (elements.organization) {
            elements.organization.value = admin.organizacion;
            elements.organization.disabled = true; // Solo lectura
            elements.organization.style.background = 'var(--color-bg-tertiary)';
            elements.organization.style.color = 'var(--color-text-secondary)';
            elements.organization.style.cursor = 'not-allowed';
            
            // Añadir indicador visual
            const label = elements.organization.closest('.form-field-group').querySelector('.field-label');
            if (label) {
                const indicator = document.createElement('span');
                indicator.innerHTML = ' <span style="color: var(--color-accent-primary); font-size: 0.75rem;">(Heredado del administrador)</span>';
                label.appendChild(indicator);
            }
        }
        
        // 2. Mostrar logo de la organización si existe
        if (admin.fotoOrganizacion && elements.orgCircle && elements.orgPlaceholder && elements.orgImage) {
            try {
                console.log('Cargando logo de organización del administrador');
                
                // Ocultar placeholder
                elements.orgPlaceholder.style.display = 'none';
                
                // Mostrar imagen
                elements.orgImage.src = admin.fotoOrganizacion;
                elements.orgImage.style.display = 'block';
                
                // Cambiar texto informativo
                const orgInfo = document.querySelectorAll('.photo-section')[1]?.querySelector('.photo-info');
                if (orgInfo) {
                    orgInfo.textContent = 'Logo heredado del administrador. Los colaboradores verán este logo.';
                }
                
            } catch (error) {
                console.warn('No se pudo cargar el logo de la organización:', error);
            }
        }
        
        // 3. Actualizar títulos y textos informativos
        updateTitlesAndDescriptions(admin);
        
        // 4. Mostrar datos del admin en mensaje informativo
        showAdminInfoMessage(admin);
    }

    function updateTitlesAndDescriptions(admin) {
        // Actualizar título principal del panel derecho
        const mainTitle = document.querySelector('.edit-right-panel .edit-main-title');
        if (mainTitle) {
            mainTitle.textContent = `CREAR COLABORADOR PARA ${admin.organizacion.toUpperCase()}`;
        }
        
        // Actualizar subtítulo
        const subTitle = document.querySelector('.edit-right-panel .edit-sub-title');
        if (subTitle) {
            subTitle.textContent = `Completa los datos para crear un colaborador en ${admin.organizacion}`;
        }
        
        // Actualizar título del panel izquierdo
        const leftTitle = document.querySelector('.edit-left-panel .edit-main-title');
        if (leftTitle) {
            leftTitle.textContent = 'CREAR COLABORADOR';
        }
        
        // Actualizar subtítulo del panel izquierdo
        const leftSubTitle = document.querySelector('.edit-left-panel .edit-sub-title');
        if (leftSubTitle) {
            leftSubTitle.textContent = `Administrador: ${admin.nombreCompleto}`;
        }
        
        // Actualizar texto del botón de registro
        if (elements.registerBtn) {
            elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR COLABORADOR';
        }
    }

    function showAdminInfoMessage(admin) {
        if (elements.mainMessage) {
            const messageHTML = `
                <div style="background: var(--color-bg-tertiary); padding: 12px; border-radius: 4px; border-left: 4px solid var(--color-accent-primary);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <i class="fas fa-user-shield" style="color: var(--color-accent-primary);"></i>
                        <strong style="color: var(--color-text-primary);">Creando colaborador como administrador</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                        <div><strong>Administrador:</strong> ${admin.nombreCompleto}</div>
                        <div><strong>Organización:</strong> ${admin.organizacion}</div>
                        <div><strong>Plan:</strong> ${admin.plan.toUpperCase()}</div>
                        <div><strong>Tema:</strong> ${admin.theme}</div>
                    </div>
                    <div style="margin-top: 8px; padding: 8px; background: var(--color-bg-secondary); border-radius: 4px; font-size: 0.8rem;">
                        <i class="fas fa-info-circle" style="color: var(--color-accent-secondary); margin-right: 5px;"></i>
                        El colaborador heredará estos datos de la organización.
                    </div>
                </div>
            `;
            
            elements.mainMessage.innerHTML = messageHTML;
            elements.mainMessage.style.display = 'block';
        }
    }

    // ========== MANEJO DE IMÁGENES ==========
    function updateProfilePhoto(imageSrc) {
        if (imageSrc && elements.profileCircle && elements.profilePlaceholder && elements.profileImage) {
            // Ocultar placeholder
            elements.profilePlaceholder.style.display = 'none';
            
            // Mostrar imagen
            elements.profileImage.src = imageSrc;
            elements.profileImage.style.display = 'block';
            
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

    function removeProfilePhoto() {
        if (elements.profileCircle && elements.profilePlaceholder && elements.profileImage) {
            // Ocultar imagen
            elements.profileImage.style.display = 'none';
            elements.profileImage.src = '';
            
            // Mostrar placeholder
            elements.profilePlaceholder.style.display = 'flex';
            
            // Limpiar input de archivo
            if (elements.profileInput) {
                elements.profileInput.value = '';
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
    // Seleccionar foto de perfil
    if (elements.editProfileOverlay && elements.profileInput) {
        elements.editProfileOverlay.addEventListener('click', function() {
            elements.profileInput.click();
        });
        
        elements.profileCircle.addEventListener('click', function() {
            elements.profileInput.click();
        });
    }
    
    // Manejar selección de archivo de perfil
    if (elements.profileInput) {
        elements.profileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file && validateFile(file, 5)) { // 5MB máximo para foto de perfil
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
                            updateProfilePhoto(e.target.result);
                            selectedFile = file;
                        } else {
                            // Limpiar input
                            elements.profileInput.value = '';
                        }
                    });
                };
                
                reader.readAsDataURL(file);
            } else {
                // Limpiar input si no es válido
                elements.profileInput.value = '';
            }
        });
    }
    
    // Logo de organización (solo visualización, no se puede cambiar)
    if (elements.editOrgOverlay) {
        elements.editOrgOverlay.style.display = 'none'; // Ocultar botón de edición
    }

    // ========== MOSTRAR/OCULTAR CONTRASEÑA ==========
    document.querySelectorAll('.toggle-contrasena').forEach(button => {
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
            // ESPERAR a que UserManager cargue el usuario actual
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Obtener el administrador actual desde UserManager
            if (!userManager.currentUser) {
                // Intentar cargar desde localStorage como respaldo
                try {
                    const storedUser = JSON.parse(localStorage.getItem('centinela-currentUser'));
                    if (storedUser && storedUser.cargo === 'administrador') {
                        currentAdmin = storedUser;
                        console.log('Administrador cargado desde localStorage:', currentAdmin.email);
                        return currentAdmin;
                    }
                } catch (e) {
                    console.warn('No se pudo cargar usuario desde localStorage');
                }
                
                showErrorMessage('No hay sesión de administrador activa. Por favor, inicia sesión.');
                setTimeout(() => {
                    window.location.href = '/users/visitors/login/login.html';
                }, 3000);
                return null;
            }
            
            // Verificar que sea administrador
            if (userManager.currentUser.cargo !== 'administrador') {
                showErrorMessage('No tienes permisos de administrador para crear colaboradores.');
                setTimeout(() => {
                    window.location.href = '/users/colaborador/dashboard/dashboard.html';
                }, 3000);
                return null;
            }
            
            currentAdmin = userManager.currentUser;
            console.log('Administrador actual cargado desde UserManager:', {
                id: currentAdmin.id,
                nombre: currentAdmin.nombreCompleto,
                email: currentAdmin.correoElectronico,
                organizacion: currentAdmin.organizacion,
                organizacionCamelCase: currentAdmin.organizacionCamelCase,
                fotoOrganizacion: currentAdmin.fotoOrganizacion ? 'Sí' : 'No',
                theme: currentAdmin.theme,
                plan: currentAdmin.plan
            });
            
            // Actualizar la interfaz con los datos del admin
            updateAdminInfo(currentAdmin);
            
            return currentAdmin;
            
        } catch (error) {
            console.error('Error al cargar administrador:', error);
            showErrorMessage('Error al cargar datos del administrador: ' + error.message);
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
        
        // Mostrar confirmación final con datos del administrador
        const confirmResult = await Swal.fire({
            title: 'CREAR COLABORADOR',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <div style="background: var(--color-bg-secondary); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                        <p><strong>Administrador creador:</strong> ${currentAdmin.nombreCompleto}</p>
                        <p><strong>Organización:</strong> ${currentAdmin.organizacion}</p>
                    </div>
                    <p><strong>Nombre del colaborador:</strong> ${elements.nombreCompleto.value.trim()}</p>
                    <p><strong>Email:</strong> ${elements.correoElectronico.value.trim()}</p>
                    <p><strong>Rol:</strong> ${elements.rol ? elements.rol.options[elements.rol.selectedIndex].text : 'No especificado'}</p>
                    <p><strong>Plan heredado:</strong> ${currentAdmin.plan.toUpperCase()}</p>
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
            // Crear objeto de datos para el colaborador con campos heredados del admin
            const collaboratorData = {
                nombreCompleto: elements.nombreCompleto.value.trim(),
                correoElectronico: elements.correoElectronico.value.trim(),
                fotoUsuario: profileImageBase64,
                
                // Campos heredados del administrador
                organizacion: currentAdmin.organizacion,
                organizacionCamelCase: currentAdmin.organizacionCamelCase,
                fotoOrganizacion: currentAdmin.fotoOrganizacion,
                theme: currentAdmin.theme || 'light',
                plan: currentAdmin.plan || 'gratis',
                
                // Campos específicos del formulario
                rol: elements.rol ? elements.rol.value : 'colaborador',
                
                // Campos de sistema
                esSuperAdmin: false,
                esAdminOrganizacion: false,
                status: true,
                
                // Campos de trazabilidad
                creadoPor: currentAdmin.id,
                creadoPorEmail: currentAdmin.correoElectronico,
                creadoPorNombre: currentAdmin.nombreCompleto,
                fechaCreacion: new Date().toISOString(),
                
                // Permisos básicos para colaboradores
                permisosPersonalizados: {
                    leerPerfil: true,
                    leerOrganizacion: true,
                    actualizarPerfil: false,
                    crearContenido: false,
                    eliminarContenido: false
                }
            };
            
            console.log('Registrando colaborador con datos:', {
                nombre: collaboratorData.nombreCompleto,
                email: collaboratorData.correoElectronico,
                organizacion: collaboratorData.organizacion,
                tieneFotoUsuario: !!collaboratorData.fotoUsuario,
                tieneFotoOrganizacion: !!collaboratorData.fotoOrganizacion,
                theme: collaboratorData.theme,
                plan: collaboratorData.plan,
                creadoPor: collaboratorData.creadoPor
            });
            
            // Registrar colaborador usando UserManager
            const resultado = await userManager.createColaborador(
                collaboratorData,
                elements.contrasena.value,
                currentAdmin.id
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
                            <p><strong>Creado por:</strong> ${collaboratorData.creadoPorNombre}</p>
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
                                <i class="fas fa-lightbulb"></i> Información heredada del administrador:
                            </p>
                            <ul style="text-align: left; margin: 0; padding-left: 20px; color: #666;">
                                <li><strong>Organización:</strong> ${collaboratorData.organizacion}</li>
                                <li><strong>Plan:</strong> ${collaboratorData.plan.toUpperCase()}</li>
                                <li><strong>Tema:</strong> ${collaboratorData.theme}</li>
                                ${collaboratorData.fotoOrganizacion ? '<li><strong>Logo de organización:</strong> Heredado ✓</li>' : ''}
                            </ul>
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
                } else if (error.message.includes('Administrador no encontrado')) {
                    errorMessage = 'No se encontró el administrador creador. Por favor, inicia sesión nuevamente.';
                    errorTitle = 'Error de sesión';
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
        elements.rol.value = '';
        elements.contrasena.value = '';
        elements.confirmarContrasena.value = '';
        
        // Remover foto de perfil
        removeProfilePhoto();
        
        // Restablecer estilos de validación
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.style.borderColor = '';
            element.style.boxShadow = '';
        });
        
        // Rehabilitar botón
        if (elements.registerBtn) {
            elements.registerBtn.disabled = false;
            elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR COLABORADOR';
        }
        
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
            }
        });
    }
    
    console.log('Formulario de registro de colaborador inicializado correctamente');
}

export { initCollaboratorForm };