// ==================== IMPORTS ====================
import { RegionManager } from '/clases/region.js';
// Eliminada la importación de UserManager

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initEditRegionForm();
});

async function initEditRegionForm() {
    
    // Obtener elementos del DOM
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    // Instanciar solo RegionManager
    const regionManager = new RegionManager();

    try {
        // Obtener ID de la región de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const regionId = urlParams.get('id');
        const orgCamelCase = urlParams.get('org');
        
        if (!regionId || !orgCamelCase) {
            throw new Error('No se especificó la región a editar');
        }
        
        // Obtener usuario actual desde el objeto global window.userManager
        const admin = await obtenerUsuarioActual();
        
        if (!admin) {
            throw new Error('No hay sesión activa de administrador');
        }
        
        if (!admin.esAdministrador()) {
            throw new Error('Solo los administradores pueden editar regiones');
        }
        
        // Verificar que la organización coincida
        if (admin.organizacionCamelCase !== orgCamelCase) {
            throw new Error('No tienes permisos para editar esta región');
        }
        
        // Cargar datos de la región
        await loadRegionData(regionId, orgCamelCase, elements, regionManager, admin);
        
        // Configurar handlers
        configurarHandlers(elements, regionManager, admin);
        
    } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        mostrarErrorSistema(error.message);
    }
}

// ========== FUNCIÓN PARA OBTENER USUARIO ACTUAL ==========
async function obtenerUsuarioActual(maxAttempts = 30, delay = 500) {
    try {
        // Mostrar loader
        Swal.fire({
            title: 'Verificando sesión...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // Esperar a que window.userManager.currentUser esté disponible
        for (let i = 0; i < maxAttempts; i++) {
            if (window.userManager && window.userManager.currentUser) {
                const admin = window.userManager.currentUser;
                Swal.close();
                return admin;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        Swal.close();
        throw new Error('No se pudo detectar el usuario actual');
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error obteniendo usuario actual:', error);
        return null;
    }
}

// ========== FUNCIONES DE UTILIDAD ==========

function obtenerElementosDOM() {
    try {
        return {
            // Campos del formulario
            organization: document.getElementById('organization'),
            nombreRegion: document.getElementById('nombreRegion'),
            colorRegion: document.getElementById('colorRegion'),
            regionId: document.getElementById('regionId'),
            organizacionCamelCase: document.getElementById('organizacionCamelCase'),
            
            // Botones
            updateBtn: document.getElementById('updateBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            
            // Títulos
            formMainTitle: document.getElementById('formMainTitle'),
            
            // Display de color
            colorDisplay: document.getElementById('colorDisplay')
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

async function loadRegionData(regionId, orgCamelCase, elements, regionManager, admin) {
    try {
        // Mostrar loader
        Swal.fire({
            title: 'Cargando datos...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // Obtener región por ID
        const region = await regionManager.getRegionById(regionId, orgCamelCase);
        
        if (!region) {
            throw new Error('Región no encontrada');
        }
        
        // Llenar formulario con los datos
        elements.regionId.value = region.id;
        elements.organizacionCamelCase.value = orgCamelCase;
        elements.organization.value = region.organizacion || admin.organizacion;
        elements.nombreRegion.value = region.nombre || '';
        elements.colorRegion.value = region.color || '#0A2540';
        
        // Actualizar display de color si existe
        if (elements.colorDisplay) {
            elements.colorDisplay.style.backgroundColor = region.color || '#0A2540';
        }
        
        // Guardar valores originales para detectar cambios
        elements.nombreRegion.defaultValue = region.nombre || '';
        elements.colorRegion.defaultValue = region.color || '#0A2540';
        
        // Actualizar título
        if (elements.formMainTitle) {
            elements.formMainTitle.textContent = `EDITAR REGIÓN: ${region.nombre}`;
        }
        
        Swal.close();
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error cargando región:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo cargar la región'
        }).then(() => {
            window.location.href = '/users/admin/regiones/regiones.html';
        });
    }
}

// ========== CONFIGURAR HANDLERS ==========

function configurarHandlers(elements, regionManager, admin) {
    // Vista previa del color
    if (elements.colorRegion) {
        elements.colorRegion.addEventListener('input', function() {
            if (elements.colorDisplay) {
                elements.colorDisplay.style.backgroundColor = this.value;
            }
        });
    }
    
    // Botón de actualización
    if (elements.updateBtn) {
        elements.updateBtn.addEventListener('click', (e) => actualizarRegion(e, elements, regionManager, admin));
    }
    
    // Botón cancelar
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => cancelarEdicion());
    }
}

// ========== VALIDACIÓN ==========

function validarFormulario(elements) {
    const errores = [];
    
    // Nombre de la región
    if (!elements.nombreRegion || !elements.nombreRegion.value.trim()) {
        errores.push('El nombre de la región es obligatorio');
    } else if (elements.nombreRegion.value.trim().length < 3) {
        errores.push('El nombre de la región debe tener al menos 3 caracteres');
    } else if (elements.nombreRegion.value.trim().length > 50) {
        errores.push('El nombre de la región no puede exceder los 50 caracteres');
    }
    
    return errores;
}

// ========== ACTUALIZAR REGIÓN ==========

async function actualizarRegion(event, elements, regionManager, admin) {
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
    
    const regionId = elements.regionId.value;
    const orgCamelCase = elements.organizacionCamelCase.value;
    const nombreOriginal = elements.nombreRegion.defaultValue;
    const nombreNuevo = elements.nombreRegion.value.trim();
    const colorOriginal = elements.colorRegion.defaultValue;
    const colorNuevo = elements.colorRegion.value;
    
    // Verificar si hubo cambios
    if (nombreNuevo === nombreOriginal && colorNuevo === colorOriginal) {
        Swal.fire({
            icon: 'info',
            title: 'Sin cambios',
            text: 'No se detectaron cambios en la región',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    // Mostrar confirmación
    const confirmResult = await Swal.fire({
        title: 'Actualizar región',
        html: `
            <div style="text-align: left; padding: 10px 0;">
                <p><strong>Nombre:</strong> ${nombreNuevo}</p>
                <p><strong>Color:</strong> 
                    <span style="display: inline-block; width: 20px; height: 20px; background: ${colorNuevo}; border-radius: 4px; vertical-align: middle; margin-right: 5px;"></span>
                    ${colorNuevo}
                </p>
                <p><strong>Organización:</strong> ${admin.organizacion}</p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ACTUALIZAR',
        cancelButtonText: 'CANCELAR',
        allowOutsideClick: false
    });
    
    if (!confirmResult.isConfirmed) return;
    
    // Mostrar loader
    Swal.fire({
        title: 'Actualizando región...',
        text: 'Por favor espera...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const regionData = {};
        
        if (nombreNuevo !== nombreOriginal) {
            regionData.nombre = nombreNuevo;
        }
        
        if (colorNuevo !== colorOriginal) {
            regionData.color = colorNuevo;
        }
        
        // Actualizar región usando RegionManager
        await regionManager.updateRegion(
            regionId,
            regionData,
            orgCamelCase,
            admin.id
        );
        
        // Mostrar éxito
        Swal.close();
        await mostrarExitoActualizacion({
            nombre: nombreNuevo,
            color: colorNuevo
        });
        
    } catch (error) {
        console.error('❌ Error actualizando región:', error);
        Swal.close();
        manejarErrorActualizacion(error);
    }
}

async function mostrarExitoActualizacion(regionData) {
    const result = await Swal.fire({
        icon: 'success',
        title: '¡Región actualizada!',
        html: `
            <div style="text-align: center;">
                <p><strong>Nombre:</strong> ${regionData.nombre}</p>
                <p><strong>Color:</strong> 
                    <span style="display: inline-block; width: 20px; height: 20px; background: ${regionData.color}; border-radius: 4px; vertical-align: middle; margin-right: 5px;"></span>
                    ${regionData.color}
                </p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'EDITAR OTRA',
        cancelButtonText: 'IR A REGIONES',
        allowOutsideClick: false
    });
    
    if (result.isConfirmed) {
        window.location.href = '/users/admin/regiones/crearRegiones.html';
    } else {
        window.location.href = '/users/admin/regiones/regiones.html';
    }
}

function manejarErrorActualizacion(error) {
    let errorMessage = 'Ocurrió un error al actualizar la región';
    
    if (error.message) {
        errorMessage = error.message;
    }
    
    Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: errorMessage,
        confirmButtonText: 'ENTENDIDO'
    });
}

// ========== FUNCIONES AUXILIARES ==========

function cancelarEdicion() {
    Swal.fire({
        title: '¿Cancelar edición?',
        text: "Los cambios no guardados se perderán",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR',
        cancelButtonText: 'CANCELAR'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/users/admin/regiones/regiones.html';
        }
    });
}

function mostrarErrorSistema(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error del sistema',
        text: mensaje || 'Ha ocurrido un error inesperado',
        confirmButtonText: 'ENTENDIDO'
    }).then(() => {
        window.location.href = '/users/admin/regiones/regiones.html';
    });
}