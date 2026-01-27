/**
 * LOGO UPLOAD FUNCTIONALITY
 * Archivo para manejar la subida del logo de empresa
 * Integración con formulario de registro de Centinela
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM que necesitamos
    const logoPreview = document.getElementById('logoPreview');
    const logoPlaceholder = document.getElementById('logoPlaceholder');
    const logoFileInput = document.getElementById('companyLogo');
    const logoSelectBtn = document.getElementById('logoSelectBtn');
    const logoRemoveBtn = document.getElementById('logoRemoveBtn');
    
    // Variables para almacenar la imagen seleccionada
    let selectedLogo = null;
    
    // ============================================
    // 1. FUNCIÓN PARA SELECCIONAR UNA IMAGEN
    // ============================================
    logoSelectBtn.addEventListener('click', function() {
        // Simular clic en el input de archivo (que está oculto)
        logoFileInput.click();
    });
    
    // ============================================
    // 2. FUNCIÓN PARA MANEJAR LA SELECCIÓN DE ARCHIVO
    // ============================================
    logoFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        
        // Si no hay archivo seleccionado, salir
        if (!file) return;
        
        // Validar que sea una imagen
        if (!file.type.match('image.*')) {
            showAlert('Por favor, selecciona solo archivos de imagen (JPG, PNG, etc.)', 'error');
            return;
        }
        
        // Validar tamaño máximo (2MB)
        if (file.size > 2 * 1024 * 1024) { // 2MB en bytes
            showAlert('La imagen es demasiado grande. Máximo permitido: 2MB', 'error');
            return;
        }
        
        // Crear un lector de archivos para previsualizar
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Ocultar el placeholder
            logoPlaceholder.style.display = 'none';
            
            // Remover imagen anterior si existe
            const existingImg = logoPreview.querySelector('img');
            if (existingImg) {
                existingImg.remove();
            }
            
            // Crear nueva imagen
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Logo de la empresa';
            img.style.display = 'block'; // Mostrar la imagen
            
            // Agregar la imagen al círculo
            logoPreview.appendChild(img);
            
            // Mostrar el botón para remover
            logoRemoveBtn.style.display = 'flex';
            
            // Cambiar texto del botón de selección
            logoSelectBtn.innerHTML = '<i class="fas fa-sync-alt"></i> CAMBIAR LOGO';
            
            // Almacenar referencia de la imagen
            selectedLogo = file;
            
            // Mostrar confirmación
            showAlert('Logo cargado correctamente', 'success');
        };
        
        // Leer el archivo como Data URL (para previsualización)
        reader.readAsDataURL(file);
    });
    
    // ============================================
    // 3. FUNCIÓN PARA REMOVER LA IMAGEN
    // ============================================
    logoRemoveBtn.addEventListener('click', function() {
        // Remover la imagen del círculo
        const img = logoPreview.querySelector('img');
        if (img) {
            img.remove();
        }
        
        // Mostrar el placeholder nuevamente
        logoPlaceholder.style.display = 'flex';
        
        // Ocultar el botón de remover
        logoRemoveBtn.style.display = 'none';
        
        // Restaurar texto del botón de selección
        logoSelectBtn.innerHTML = '<i class="fas fa-upload"></i> SELECCIONAR LOGO';
        
        // Limpiar el input de archivo
        logoFileInput.value = '';
        
        // Limpiar referencia de la imagen
        selectedLogo = null;
        
        // Mostrar confirmación
        showAlert('Logo removido', 'info');
    });
    
    // ============================================
    // 4. FUNCIÓN PARA MOSTRAR ALERTAS TEMPORALES
    // ============================================
    function showAlert(message, type = 'info') {
        // Colores según el tipo de alerta
        const colors = {
            'success': '#2ecc71',
            'error': '#e74c3c',
            'info': '#3498db',
            'warning': '#f39c12'
        };
        
        // Crear elemento de alerta
        const alertDiv = document.createElement('div');
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            font-size: 13px;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Agregar al documento
        document.body.appendChild(alertDiv);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 300);
        }, 3000);
    }
    
    // ============================================
    // 5. AGREGAR ESTILOS PARA ANIMACIONES
    // ============================================
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // ============================================
    // 6. INTEGRACIÓN CON EL FORMULARIO PRINCIPAL
    // ============================================
    // Obtener el formulario de registro
    const registerForm = document.querySelector('.register-form-container');
    
    // Si existe el formulario, agregar validación personalizada
    if (registerForm) {
        // Modificar el envío del formulario para incluir el logo
        registerForm.addEventListener('submit', function(event) {
            // Aquí puedes agregar validaciones adicionales si lo necesitas
            
            // Ejemplo: Hacer el logo obligatorio (descomenta si lo quieres)
            /*
            if (!selectedLogo) {
                event.preventDefault();
                showAlert('Por favor, selecciona un logo para tu empresa', 'error');
                return false;
            }
            */
            
            // Si todo está bien, el formulario se envía normalmente
            // Para enviar el logo junto con los otros datos, necesitarás
            // usar FormData en tu backend
        });
    }
    
    // ============================================
    // 7. FUNCIÓN PARA OBTENER LOS DATOS DEL LOGO
    // ============================================
    // Esta función puede ser llamada desde otros scripts
    window.getLogoData = function() {
        if (!selectedLogo) return null;
        
        return {
            file: selectedLogo,
            preview: logoPreview.querySelector('img')?.src || null,
            name: selectedLogo.name,
            size: selectedLogo.size,
            type: selectedLogo.type
        };
    };
    
    // ============================================
    // 8. FUNCIÓN PARA RESTAURAR LOGO DESDE DATOS
    // ============================================
    // En caso de que quieras cargar un logo previamente guardado
    window.restoreLogo = function(imageDataUrl) {
        if (!imageDataUrl) return;
        
        // Ocultar placeholder
        logoPlaceholder.style.display = 'none';
        
        // Remover imagen anterior si existe
        const existingImg = logoPreview.querySelector('img');
        if (existingImg) {
            existingImg.remove();
        }
        
        // Crear nueva imagen
        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.alt = 'Logo de la empresa';
        img.style.display = 'block';
        
        // Agregar la imagen al círculo
        logoPreview.appendChild(img);
        
        // Mostrar el botón para remover
        logoRemoveBtn.style.display = 'flex';
        
        // Cambiar texto del botón de selección
        logoSelectBtn.innerHTML = '<i class="fas fa-sync-alt"></i> CAMBIAR LOGO';
        
        // Nota: No podemos restaurar el archivo File original
        // Solo la previsualización
        selectedLogo = { isRestored: true, dataUrl: imageDataUrl };
    };
});