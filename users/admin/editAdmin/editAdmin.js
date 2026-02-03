// =============================================
// EDITADOR DE PERFIL - JavaScript Actualizado
// =============================================

// Importar las clases necesarias
import { UserManager } from '/clases/user.js';

// Variables globales
let userManager = null;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Edit Admin cargado');
    
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initEditProfile();
});

function initEditProfile() {
    console.log('Iniciando editor de perfil...');
    
    // Instanciar UserManager
    userManager = new UserManager();
    console.log('UserManager inicializado');
    
    // Cargar datos del usuario actual
    loadCurrentUserData();
    
    // Inicializar eventos
    initializePhotoEvents();
    handleBackNavigation();
    handleSaveChanges();
    handleCancel();
    
    // Botón para solicitar cambio de contraseña
    const requestPasswordChangeBtn = document.getElementById('requestPasswordChangeBtn');
    if (requestPasswordChangeBtn) {
        requestPasswordChangeBtn.addEventListener('click', handlePasswordChangeRequest);
    }
    
    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Aplicar estilos SweetAlert
    applySweetAlertStyles();
    
    console.log('Editor de perfil inicializado correctamente');
}

// ========== FUNCIÓN PARA CAMBIO DE CONTRASEÑA ==========
async function handlePasswordChangeRequest() {
    console.log('🔐 Iniciando solicitud de cambio de contraseña');
    
    try {
        // Obtener el email del usuario actual
        const userEmail = document.getElementById('email').value;
        
        if (!userEmail) {
            showMessage('error', 'No se encontró tu correo electrónico.', 'passwordMessage');
            return;
        }
        
        console.log('📧 Email del usuario:', userEmail);
        
        // Mostrar confirmación con SweetAlert
        const confirmResult = await Swal.fire({
            title: '¿Cambiar contraseña?',
            html: `
                <div style="text-align: left; padding: 10px;">
                    <p>Se enviará un enlace seguro para restablecer tu contraseña al siguiente correo:</p>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        <strong>${userEmail}</strong>
                    </div>
                    <div style="background: #e8f4fd; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <p style="margin: 0; font-size: 0.9rem;">
                            <i class="fas fa-info-circle"></i> El enlace tiene una validez de 24 horas.
                        </p>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#556b2f',
            cancelButtonColor: '#666',
            confirmButtonText: 'Enviar correo',
            cancelButtonText: 'Cancelar',
            backdrop: true,
            allowOutsideClick: false,
            width: 500
        });
        
        if (confirmResult.isConfirmed) {
            // Mostrar loader
            Swal.fire({
                title: 'Enviando correo...',
                text: 'Generando enlace seguro de restablecimiento...',
                icon: 'info',
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                // IMPORTANTE: Usar el mismo método que funciona en registro.js
                console.log('🚀 Enviando solicitud de restablecimiento de contraseña...');
                
                // Método 1: Usar Firebase Auth directamente (como en registro.js)
                await sendPasswordResetEmail(userEmail);
                
                // Mostrar éxito
                Swal.fire({
                    icon: 'success',
                    title: '¡Correo enviado!',
                    html: `
                        <div style="text-align: left; padding: 10px;">
                            <p>Se ha enviado un enlace seguro para restablecer tu contraseña a:</p>
                            <div style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0;">
                                <strong>${userEmail}</strong>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px;">
                                <h4 style="color: #0a2540; margin-bottom: 10px;">
                                    <i class="fas fa-clipboard-list"></i> Sigue estos pasos:
                                </h4>
                                <ol style="margin-left: 20px; color: #666;">
                                    <li>Revisa tu bandeja de entrada en <strong>${userEmail}</strong></li>
                                    <li>Busca el correo "Restablecer contraseña de Centinela"</li>
                                    <li>Haz clic en el enlace "Restablecer contraseña"</li>
                                    <li>Sigue las instrucciones para crear tu nueva contraseña</li>
                                    <li>Inicia sesión con tu nueva contraseña</li>
                                </ol>
                            </div>
                            <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 15px;">
                                <p style="margin: 0; color: #856404;">
                                    <i class="fas fa-exclamation-triangle"></i> 
                                    <strong>Importante:</strong> Si no ves el correo, revisa la carpeta de spam o correo no deseado.
                                </p>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#556b2f',
                    width: 550,
                    backdrop: true
                });
                
                console.log('✅ Correo de restablecimiento enviado exitosamente');
                
            } catch (error) {
                console.error('❌ Error al enviar correo:', error);
                
                Swal.close();
                
                // Mostrar error específico
                let errorTitle = 'Error al enviar correo';
                let errorMessage = 'No se pudo enviar el correo de restablecimiento.';
                let errorDetails = error.message || '';
                
                // Manejar errores específicos de Firebase
                if (error.code) {
                    switch(error.code) {
                        case 'auth/user-not-found':
                            errorTitle = 'Usuario no encontrado';
                            errorMessage = `No se encontró una cuenta con el correo: ${userEmail}`;
                            break;
                        case 'auth/invalid-email':
                            errorTitle = 'Correo inválido';
                            errorMessage = 'El formato del correo electrónico no es válido.';
                            break;
                        case 'auth/too-many-requests':
                            errorTitle = 'Demasiados intentos';
                            errorMessage = 'Has intentado demasiadas veces. Espera unos minutos antes de intentar de nuevo.';
                            break;
                        case 'auth/operation-not-allowed':
                            errorTitle = 'Operación no permitida';
                            errorMessage = 'El restablecimiento de contraseña por correo no está habilitado.';
                            errorDetails = 'Contacta al administrador para habilitar esta función.';
                            break;
                        case 'auth/network-request-failed':
                            errorTitle = 'Error de conexión';
                            errorMessage = 'No hay conexión a internet. Verifica tu conexión y vuelve a intentar.';
                            break;
                    }
                }
                
                await Swal.fire({
                    icon: 'error',
                    title: errorTitle,
                    html: `
                        <div style="text-align: left; padding: 10px;">
                            <p>${errorMessage}</p>
                            ${errorDetails ? `<p style="color: #666; font-size: 0.9rem; margin-top: 10px;"><strong>Detalles:</strong> ${errorDetails}</p>` : ''}
                            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 15px;">
                                <p style="margin: 0; font-size: 0.9rem; color: #666;">
                                    <i class="fas fa-lightbulb"></i> 
                                    <strong>Solución:</strong> Verifica que el correo esté correcto o intenta más tarde.
                                </p>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#556b2f',
                    allowOutsideClick: true
                });
            }
        }
        
    } catch (error) {
        console.error('Error en la solicitud:', error);
        showMessage('error', 'Error al procesar la solicitud.', 'passwordMessage');
    }
}

// ========== FUNCIÓN PARA ENVIAR CORREO DE RESTABLECIMIENTO ==========
async function sendPasswordResetEmail(email) {
    console.log('🔐 Enviando correo de restablecimiento a:', email);
    
    try {
        // Importar Firebase Auth dinámicamente
        const { auth } = await import('/config/firebase-config.js');
        const { sendPasswordResetEmail: firebaseSendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js');
        
        // Configurar la URL de redirección (DEBE SER LA MISMA QUE EN REGISTRO.JS)
        const actionCodeSettings = {
            url: `${window.location.origin}/users/verify-email.html?mode=resetPassword`,
            handleCodeInApp: true  // Esto es importante para que funcione
        };
        
        console.log('🔗 URL de redirección:', actionCodeSettings.url);
        
        // Enviar el correo usando Firebase Auth
        await firebaseSendPasswordResetEmail(auth, email, actionCodeSettings);
        
        console.log('✅ Solicitud de restablecimiento enviada correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error en sendPasswordResetEmail:', error);
        throw error; // Re-lanzar el error para manejarlo arriba
    }
}

// ========== FUNCIONES EXISTENTES ==========

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

function showMessage(type, text, containerId = 'mainMessage') {
    const container = document.getElementById(containerId);
    if (container) {
        container.textContent = text;
        container.className = `message-container ${type}`;
        container.style.display = 'block';
        
        setTimeout(() => {
            container.style.display = 'none';
        }, 5000);
    }
}

function loadCurrentUserData() {
    try {
        // Aquí deberías cargar los datos reales del usuario logueado
        // Por ahora, datos de ejemplo
        const currentUser = {
            fullName: 'Administrador Principal',
            email: 'admin@centinela.com', // CAMBIAR POR EL EMAIL REAL
            organizationName: 'Centinela Security',
            position: 'Administrador'
        };
        
        document.getElementById('fullName').value = currentUser.fullName;
        document.getElementById('email').value = currentUser.email;
        document.getElementById('organizationName').value = currentUser.organizationName;
        document.getElementById('position').value = currentUser.position;
        
        console.log('📊 Datos del usuario cargados:', currentUser);
        
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        showMessage('error', 'Error al cargar los datos del usuario.', 'mainMessage');
    }
}

function handlePhotoUpload(photoType) {
    const inputId = photoType === 'profile' ? 'profile-input' : 'org-input';
    const input = document.getElementById(inputId);
    
    if (input) {
        input.click();
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validar tamaño máximo
            const maxSize = photoType === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.size > maxSize) {
                const maxSizeMB = photoType === 'profile' ? 5 : 10;
                Swal.fire({
                    title: 'Archivo demasiado grande',
                    text: `El archivo no debe superar ${maxSizeMB}MB`,
                    icon: 'error',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#556b2f'
                });
                return;
            }
            
            // Validar tipo de archivo
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                Swal.fire({
                    title: 'Formato no válido',
                    text: 'Solo se permiten imágenes JPG, PNG o GIF',
                    icon: 'error',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#556b2f'
                });
                return;
            }
            
            // Mostrar vista previa
            const reader = new FileReader();
            reader.onload = function(event) {
                const previewImage = document.getElementById('previewImage');
                const modalTitle = document.getElementById('modalTitle');
                
                previewImage.src = event.target.result;
                modalTitle.textContent = photoType === 'profile' ? 'CAMBIAR FOTO DE PERFIL' : 'CAMBIAR LOGO';
                
                const modal = document.getElementById('photoModal');
                modal.style.display = 'flex';
                
                const confirmBtn = document.getElementById('confirmChangeBtn');
                const cancelBtn = document.getElementById('cancelChangeBtn');
                
                confirmBtn.onclick = function() {
                    const imageId = photoType === 'profile' ? 'profileImage' : 'orgImage';
                    const placeholderId = photoType === 'profile' ? 'profilePlaceholder' : 'orgPlaceholder';
                    
                    const image = document.getElementById(imageId);
                    const placeholder = document.getElementById(placeholderId);
                    
                    image.src = event.target.result;
                    image.style.display = 'block';
                    placeholder.style.display = 'none';
                    
                    modal.style.display = 'none';
                    showMessage('success', 'Foto actualizada correctamente.', 'mainMessage');
                };
                
                cancelBtn.onclick = function() {
                    modal.style.display = 'none';
                    input.value = '';
                };
            };
            
            reader.readAsDataURL(file);
        };
    }
}

function handleBackNavigation() {
    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = '/admin/dashboard/dashboard.html';
        });
    }
}

function handleSaveChanges() {
    const saveBtn = document.getElementById('saveChangesBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            try {
                const fullName = document.getElementById('fullName').value.trim();
                if (!fullName) {
                    showMessage('error', 'El nombre completo es requerido.', 'mainMessage');
                    return;
                }
                
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GUARDANDO...';
                saveBtn.disabled = true;
                
                // Aquí iría la lógica real para guardar cambios
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                showMessage('success', 'Cambios guardados correctamente.', 'mainMessage');
                
                saveBtn.innerHTML = '<i class="fas fa-save"></i> GUARDAR CAMBIOS';
                saveBtn.disabled = false;
                
            } catch (error) {
                console.error('Error al guardar cambios:', error);
                showMessage('error', 'Error al guardar los cambios.', 'mainMessage');
                
                saveBtn.innerHTML = '<i class="fas fa-save"></i> GUARDAR CAMBIOS';
                saveBtn.disabled = false;
            }
        });
    }
}

function handleCancel() {
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            Swal.fire({
                title: '¿Descartar cambios?',
                text: 'Se perderán todos los cambios no guardados.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#556b2f',
                cancelButtonColor: '#666',
                confirmButtonText: 'Sí, descartar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    loadCurrentUserData();
                    showMessage('info', 'Cambios descartados.', 'mainMessage');
                }
            });
        });
    }
}

function initializePhotoEvents() {
    const profileCircle = document.getElementById('profileCircle');
    const editProfileOverlay = document.getElementById('editProfileOverlay');
    
    if (profileCircle) {
        profileCircle.addEventListener('click', () => handlePhotoUpload('profile'));
    }
    
    if (editProfileOverlay) {
        editProfileOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            handlePhotoUpload('profile');
        });
    }
    
    const orgCircle = document.getElementById('orgCircle');
    const editOrgOverlay = document.getElementById('editOrgOverlay');
    
    if (orgCircle) {
        orgCircle.addEventListener('click', () => handlePhotoUpload('org'));
    }
    
    if (editOrgOverlay) {
        editOrgOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            handlePhotoUpload('org');
        });
    }
}

// Exportar funciones si es necesario
export { initEditProfile, handlePasswordChangeRequest };