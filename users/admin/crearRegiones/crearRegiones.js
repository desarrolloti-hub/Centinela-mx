// ARCHIVO JS PARA CREAR REGIÓN
// ==================== IMPORTS ====================
import { RegionManager } from '/clases/region.js';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initRegionForm();
});

async function initRegionForm() {
    
    // Obtener elementos del DOM
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    // Instanciar RegionManager
    const regionManager = new RegionManager();

    try {
        // Esperar a que auth esté listo y obtener el usuario actual
        const currentAdmin = await obtenerUsuarioActual();
        if (!currentAdmin) return;
        
        // Verificar que sea administrador
        if (!currentAdmin.esAdministrador()) {
            throw new Error('Solo los administradores pueden crear regiones');
        }
        
        // Configurar interfaz con datos del admin
        actualizarInterfazConAdmin(elements, currentAdmin);
        
        // Configurar handlers
        configurarHandlers(elements, regionManager, currentAdmin);
                
    } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        mostrarErrorSistema(error.message);
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
            
            // Botones
            registerBtn: document.getElementById('registerBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            mainMessage: document.getElementById('mainMessage'),
            
            // Títulos
            adminNameSubtitle: document.getElementById('adminNameSubtitle'),
            formMainTitle: document.getElementById('formMainTitle'),
            formSubTitle: document.getElementById('formSubTitle')
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

// Función para obtener el usuario actual desde el objeto global auth
async function obtenerUsuarioActual(maxAttempts = 15, delay = 500) {
    try {
        // Mostrar loader
        Swal.fire({
            title: 'Cargando información...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        // Esperar a que auth.currentUser esté disponible
        for (let i = 0; i < maxAttempts; i++) {
            if (window.userManager && window.userManager.currentUser) {
                const admin = window.userManager.currentUser;
                Swal.close();
                return admin;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        throw new Error('No se pudo detectar el usuario actual');
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error obteniendo usuario actual:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error de sesión',
            text: error.message,
            confirmButtonText: 'Ir al login'
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
        elements.organization.setAttribute('readonly', true);
    }
    
    // Actualizar nombre del administrador en el subtítulo
    if (elements.adminNameSubtitle) {
        elements.adminNameSubtitle.textContent = `Administrador: ${admin.nombreCompleto} | ${admin.organizacion}`;
    }
    
    // Actualizar títulos con información del admin
    if (elements.formMainTitle) {
        elements.formMainTitle.textContent = `CREAR REGIÓN PARA ${admin.organizacion.toUpperCase()}`;
    }
    
    // Mostrar mensaje informativo
    mostrarMensajeInfoAdmin(elements.mainMessage, admin);
}

function mostrarMensajeInfoAdmin(element, admin) {
    if (!element) return;
    
    element.innerHTML = `
        <div style="background: #e8f4fd; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fas fa-user-shield" style="color: #0A2540;"></i>
                <strong style="color: #0A2540;">Creando región como administrador</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                <div><strong>Administrador:</strong> ${admin.nombreCompleto}</div>
                <div><strong>Organización:</strong> ${admin.organizacion}</div>
            </div>
        </div>
    `;
}

// ========== CONFIGURAR HANDLERS ==========

function configurarHandlers(elements, regionManager, admin) {
    // Vista previa del color
    if (elements.colorRegion) {
        elements.colorRegion.addEventListener('input', function() {
            const colorDisplay = document.getElementById('colorDisplay');
            if (colorDisplay) {
                colorDisplay.style.backgroundColor = this.value;
            }
        });
    }
    
    // Botón de registro
    if (elements.registerBtn) {
        elements.registerBtn.addEventListener('click', (e) => registrarRegion(e, elements, regionManager, admin));
    }
    
    // Botón cancelar
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => cancelarRegistro());
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

// ========== REGISTRO DE REGIÓN ==========

async function registrarRegion(event, elements, regionManager, admin) {
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
    
    const nombreRegion = elements.nombreRegion.value.trim();
    const colorRegion = elements.colorRegion ? elements.colorRegion.value : '#0A2540';
    
    // Mostrar confirmación
    const confirmResult = await Swal.fire({
        title: 'Crear región',
        html: `
            <div style="text-align: left; padding: 10px 0;">
                <p><strong>Nombre:</strong> ${nombreRegion}</p>
                <p><strong>Color:</strong> 
                    <span style="display: inline-block; width: 20px; height: 20px; background: ${colorRegion}; border-radius: 4px; vertical-align: middle; margin-right: 5px;"></span>
                    ${colorRegion}
                </p>
                <p><strong>Organización:</strong> ${admin.organizacion}</p>
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
        title: 'Creando región...',
        text: 'Por favor espera...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const regionData = {
            nombre: nombreRegion,
            color: colorRegion,
            organizacion: admin.organizacion
        };
        
        // Crear región usando RegionManager (Firebase generará el ID)
        const resultado = await regionManager.createRegion(
            regionData,
            admin.organizacionCamelCase,
            {
                id: admin.id,
                email: admin.correoElectronico,
                nombre: admin.nombreCompleto
            }
        );
        
        // Mostrar éxito
        Swal.close();
        await mostrarExitoRegistro(regionData, resultado.id);
        
    } catch (error) {
        console.error('❌ Error creando región:', error);
        Swal.close();
        manejarErrorRegistro(error);
    }
}

async function mostrarExitoRegistro(regionData, regionId) {
    const result = await Swal.fire({
        icon: 'success',
        title: '¡Región creada!',
        html: `
            <div style="text-align: center;">
                <p><strong>Nombre:</strong> ${regionData.nombre}</p>
                <p><strong>Color:</strong> 
                    <span style="display: inline-block; width: 20px; height: 20px; background: ${regionData.color}; border-radius: 4px; vertical-align: middle; margin-right: 5px;"></span>
                    ${regionData.color}
                </p>
                <p><strong>Organización:</strong> ${regionData.organizacion}</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'CREAR OTRA',
        cancelButtonText: 'IR A REGIONES',
        allowOutsideClick: false
    });
    
    if (result.isConfirmed) {
        // Limpiar formulario para nueva región
        document.getElementById('nombreRegion').value = '';
        if (document.getElementById('colorRegion')) {
            document.getElementById('colorRegion').value = '#0A2540';
        }
        // Resetear vista previa del color si existe
        const colorDisplay = document.getElementById('colorDisplay');
        if (colorDisplay) {
            colorDisplay.style.backgroundColor = '#0A2540';
        }
    } else {
        window.location.href = '/users/admin/regiones/regiones.html';
    }
}

function manejarErrorRegistro(error) {
    let errorMessage = 'Ocurrió un error al crear la región';
    
    if (error.message) {
        errorMessage = error.message;
    }
    
    Swal.fire({
        icon: 'error',
        title: 'Error al crear región',
        text: errorMessage,
        confirmButtonText: 'ENTENDIDO'
    });
}

// ========== FUNCIONES AUXILIARES ==========

function cancelarRegistro() {
    Swal.fire({
        title: '¿Cancelar registro?',
        text: "Se perderán los datos ingresados",
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
    });
}

// ========== EXPORT ==========
export { initRegionForm };