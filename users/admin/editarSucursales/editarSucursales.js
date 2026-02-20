// editarSucursales.js
import { SucursalManager, ESTADOS_MEXICO } from '/clases/sucursal.js';

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    await initEditarSucursalForm();
});

async function initEditarSucursalForm() {
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    const sucursalManager = new SucursalManager();

    try {
        const currentAdmin = await obtenerUsuarioActual();
        if (!currentAdmin) return;
        
        if (!currentAdmin.esAdministrador()) {
            throw new Error('Solo los administradores pueden editar sucursales');
        }
        
        // Obtener ID de la sucursal de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const sucursalId = urlParams.get('id');
        const orgFromUrl = urlParams.get('org');
        
        if (!sucursalId) {
            throw new Error('No se especificó la sucursal a editar');
        }
        
        // Validar que la organización coincida
        if (orgFromUrl && orgFromUrl !== currentAdmin.organizacionCamelCase) {
            throw new Error('No tienes permiso para editar esta sucursal');
        }
        
        await cargarRegiones(elements, currentAdmin);
        
        cargarEstados(elements);
        
        await cargarDatosSucursal(sucursalId, currentAdmin, elements, sucursalManager);
        
        configurarHandlers(elements, sucursalManager, currentAdmin, sucursalId);
        
    } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        mostrarErrorSistema(error.message);
        
        // Redirigir después de mostrar error
        setTimeout(() => {
            window.location.href = '/users/admin/sucursales/sucursales.html';
        }, 3000);
    }
}

function obtenerElementosDOM() {
    try {
        return {
            sucursalId: document.getElementById('sucursalId'),
            organizacionCamelCase: document.getElementById('organizacionCamelCase'),
            
            nombreSucursal: document.getElementById('nombreSucursal'),
            tipoSucursal: document.getElementById('tipoSucursal'),
            
            regionSucursal: document.getElementById('regionSucursal'),
            zonaSucursal: document.getElementById('zonaSucursal'),
            estadoSucursal: document.getElementById('estadoSucursal'),
            ciudadSucursal: document.getElementById('ciudadSucursal'),
            direccionSucursal: document.getElementById('direccionSucursal'),
            
            contactoSucursal: document.getElementById('contactoSucursal'),
            
            latitudSucursal: document.getElementById('latitudSucursal'),
            longitudSucursal: document.getElementById('longitudSucursal'),
            
            actualizarBtn: document.getElementById('actualizarSucursalBtn'),
            cancelarBtn: document.getElementById('cancelarBtn')
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

async function obtenerUsuarioActual(maxAttempts = 15, delay = 500) {
    try {
        Swal.fire({
            title: 'Cargando información...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
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

async function cargarRegiones(elements, admin) {
    try {
        const { RegionManager } = await import('/clases/region.js');
        const regionManager = new RegionManager();
        
        const regiones = await regionManager.getRegionesByOrganizacion(admin.organizacionCamelCase);
        
        const select = elements.regionSucursal;
        select.innerHTML = '<option value="">-- Seleccione una región --</option>';
        
        if (regiones.length === 0) {
            select.innerHTML = '<option value="">-- No hay regiones disponibles --</option>';
            return;
        }
        
        regiones.forEach(region => {
            const option = document.createElement('option');
            option.value = region.id;
            option.textContent = region.nombre;
            option.setAttribute('data-region-nombre', region.nombre);
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando regiones:', error);
        elements.regionSucursal.innerHTML = '<option value="">-- Error cargando regiones --</option>';
    }
}

function cargarEstados(elements) {
    const select = elements.estadoSucursal;
    select.innerHTML = '<option value="">-- Seleccione un estado --</option>';
    
    ESTADOS_MEXICO.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado;
        option.textContent = estado;
        select.appendChild(option);
    });
}

async function cargarDatosSucursal(sucursalId, admin, elements, sucursalManager) {
    try {
        Swal.fire({
            title: 'Cargando datos de la sucursal...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const sucursal = await sucursalManager.getSucursalById(sucursalId, admin.organizacionCamelCase);
        
        if (!sucursal) {
            throw new Error('No se encontró la sucursal especificada');
        }
        
        // Llenar campos del formulario
        elements.sucursalId.value = sucursal.id;
        elements.organizacionCamelCase.value = sucursal.organizacionCamelCase;
        
        elements.nombreSucursal.value = sucursal.nombre || '';
        elements.tipoSucursal.value = sucursal.tipo || '';
        
        // Seleccionar región
        if (sucursal.ubicacion?.regionId && elements.regionSucursal) {
            // Esperar a que las regiones estén cargadas
            setTimeout(() => {
                elements.regionSucursal.value = sucursal.ubicacion.regionId;
            }, 500);
        }
        
        elements.zonaSucursal.value = sucursal.ubicacion?.zona || '';
        
        // Seleccionar estado
        if (sucursal.ubicacion?.estado && elements.estadoSucursal) {
            elements.estadoSucursal.value = sucursal.ubicacion.estado;
        }
        
        elements.ciudadSucursal.value = sucursal.ubicacion?.ciudad || '';
        elements.direccionSucursal.value = sucursal.ubicacion?.direccion || '';
        elements.contactoSucursal.value = sucursal.contacto || '';
        elements.latitudSucursal.value = sucursal.coordenadas?.latitud || '';
        elements.longitudSucursal.value = sucursal.coordenadas?.longitud || '';
        
        Swal.close();
        
    } catch (error) {
        Swal.close();
        console.error('Error cargando datos de sucursal:', error);
        throw error;
    }
}

function configurarHandlers(elements, sucursalManager, admin, sucursalId) {
    if (elements.actualizarBtn) {
        elements.actualizarBtn.addEventListener('click', (e) => actualizarSucursal(e, elements, sucursalManager, admin, sucursalId));
    }
    
    if (elements.cancelarBtn) {
        elements.cancelarBtn.addEventListener('click', () => cancelarEdicion());
    }
}

function validarFormulario(elements) {
    const errores = [];
    
    if (!elements.nombreSucursal.value.trim()) {
        errores.push('El nombre de la sucursal es obligatorio');
    }
    
    if (!elements.tipoSucursal.value.trim()) {
        errores.push('El tipo de sucursal es obligatorio');
    }
    
    if (!elements.regionSucursal.value) {
        errores.push('Debe seleccionar una región');
    }
    
    if (!elements.estadoSucursal.value) {
        errores.push('Debe seleccionar un estado');
    }
    
    if (!elements.ciudadSucursal.value.trim()) {
        errores.push('La ciudad es obligatoria');
    }
    
    if (!elements.direccionSucursal.value.trim()) {
        errores.push('La dirección es obligatoria');
    }
    
    if (!elements.latitudSucursal.value.trim()) {
        errores.push('La latitud es obligatoria');
    }
    
    if (!elements.longitudSucursal.value.trim()) {
        errores.push('La longitud es obligatoria');
    }
    
    // El teléfono es opcional, pero si se proporciona, validar formato
    if (elements.contactoSucursal.value.trim()) {
        const telefono = elements.contactoSucursal.value.replace(/\D/g, '');
        if (telefono.length < 10) {
            errores.push('El teléfono debe tener al menos 10 dígitos');
        }
    }
    
    return errores;
}

async function actualizarSucursal(event, elements, sucursalManager, admin, sucursalId) {
    event.preventDefault();
    
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
    
    const regionSelect = elements.regionSucursal;
    const regionOption = regionSelect.options[regionSelect.selectedIndex];
    const regionNombre = regionOption.getAttribute('data-region-nombre') || regionOption.textContent;
    
    const confirmResult = await Swal.fire({
        title: 'Actualizar sucursal',
        html: `
            <div style="text-align: left;">
                <p><strong>Nombre:</strong> ${elements.nombreSucursal.value.trim()}</p>
                <p><strong>Tipo:</strong> ${elements.tipoSucursal.value.trim()}</p>
                <p><strong>Región:</strong> ${regionNombre}</p>
                <p><strong>Estado:</strong> ${elements.estadoSucursal.value}</p>
                <p><strong>Ciudad:</strong> ${elements.ciudadSucursal.value.trim()}</p>
                <p><strong>Dirección:</strong> ${elements.direccionSucursal.value.trim()}</p>
                <p><strong>Contacto:</strong> ${elements.contactoSucursal.value.trim() || 'No especificado'}</p>
                <p><strong>Coordenadas:</strong> ${elements.latitudSucursal.value.trim()}, ${elements.longitudSucursal.value.trim()}</p>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR',
        cancelButtonText: 'CANCELAR',
        allowOutsideClick: false
    });
    
    if (!confirmResult.isConfirmed) return;
    
    Swal.fire({
        title: 'Actualizando sucursal...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const sucursalData = {
            nombre: elements.nombreSucursal.value.trim(),
            tipo: elements.tipoSucursal.value.trim(),
            ubicacion: {
                region: regionNombre,
                regionId: elements.regionSucursal.value,
                regionNombre: regionNombre,
                zona: elements.zonaSucursal.value.trim(),
                estado: elements.estadoSucursal.value,
                ciudad: elements.ciudadSucursal.value.trim(),
                direccion: elements.direccionSucursal.value.trim()
            },
            contacto: elements.contactoSucursal.value.trim(),
            coordenadas: {
                latitud: elements.latitudSucursal.value.trim(),
                longitud: elements.longitudSucursal.value.trim()
            }
        };
        
        const sucursalActualizada = await sucursalManager.actualizarSucursal(
            sucursalId, 
            sucursalData, 
            admin.id, 
            admin.organizacionCamelCase
        );
        
        Swal.close();
        await mostrarExitoActualizacion(sucursalActualizada);
        
    } catch (error) {
        console.error('❌ Error actualizando sucursal:', error);
        Swal.close();
        manejarErrorActualizacion(error);
    }
}

async function mostrarExitoActualizacion(sucursal) {
    const contactoMostrar = sucursal.getContactoFormateado ? 
        sucursal.getContactoFormateado() : 
        (sucursal.contacto || 'No especificado');
    
    const ubicacionCompleta = sucursal.getUbicacionCompleta ? 
        sucursal.getUbicacionCompleta() : 
        'No disponible';
    
    await Swal.fire({
        icon: 'success',
        title: '¡Sucursal actualizada!',
        html: `
            <div>
                <p><strong>Nombre:</strong> ${sucursal.nombre}</p>
                <p><strong>Tipo:</strong> ${sucursal.tipo}</p>
                <p><strong>Ubicación:</strong> ${ubicacionCompleta}</p>
                <p><strong>Contacto:</strong> ${contactoMostrar}</p>
            </div>
        `,
        confirmButtonText: 'IR A SUCURSALES'
    }).then(() => {
        window.location.href = '/users/admin/sucursales/sucursales.html';
    });
}

function manejarErrorActualizacion(error) {
    let errorMessage = 'Ocurrió un error al actualizar la sucursal';
    
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
            window.location.href = '/users/admin/sucursales/sucursales.html';
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

export { initEditarSucursalForm };