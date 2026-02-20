// crearSucursales.js - VERSIÓN COMPLETA Y CORREGIDA (Teléfono opcional)
import { SucursalManager, ESTADOS_MEXICO } from '/clases/sucursal.js';

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    await initSucursalForm();
});

async function initSucursalForm() {
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    const sucursalManager = new SucursalManager();

    try {
        const currentAdmin = await obtenerUsuarioActual();
        if (!currentAdmin) return;
        
        if (!currentAdmin.esAdministrador()) {
            throw new Error('Solo los administradores pueden crear sucursales');
        }
        
        actualizarInterfazConAdmin(elements, currentAdmin);
        
        await cargarRegiones(elements, currentAdmin);
        
        cargarEstados(elements);
        
        configurarHandlers(elements, sucursalManager, currentAdmin);
        
    } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        mostrarErrorSistema(error.message);
    }
}

function obtenerElementosDOM() {
    try {
        return {
            organization: document.getElementById('organization'),
            
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
            
            crearBtn: document.getElementById('crearSucursalBtn'),
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

function actualizarInterfazConAdmin(elements, admin) {
    if (elements.organization) {
        elements.organization.value = admin.organizacion;
    }
}

async function cargarRegiones(elements, admin) {
    try {
        // Importar dinámicamente RegionManager solo cuando sea necesario
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

function configurarHandlers(elements, sucursalManager, admin) {
    if (elements.crearBtn) {
        elements.crearBtn.addEventListener('click', (e) => crearSucursal(e, elements, sucursalManager, admin));
    }
    
    if (elements.cancelarBtn) {
        elements.cancelarBtn.addEventListener('click', () => cancelarRegistro());
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

async function crearSucursal(event, elements, sucursalManager, admin) {
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
        title: 'Crear sucursal',
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
        title: 'Creando sucursal...',
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
        
        const nuevaSucursal = await sucursalManager.crearSucursal(sucursalData, window.userManager);
        
        Swal.close();
        await mostrarExitoRegistro(nuevaSucursal);
        
    } catch (error) {
        console.error('❌ Error creando sucursal:', error);
        Swal.close();
        manejarErrorRegistro(error);
    }
}

async function mostrarExitoRegistro(sucursal) {
    const contactoMostrar = sucursal.getContactoFormateado() || 'No especificado';
    
    const result = await Swal.fire({
        icon: 'success',
        title: '¡Sucursal creada!',
        html: `
            <div>
                <p><strong>Nombre:</strong> ${sucursal.nombre}</p>
                <p><strong>Tipo:</strong> ${sucursal.tipo}</p>
                <p><strong>Ubicación:</strong> ${sucursal.getUbicacionCompleta()}</p>
                <p><strong>Contacto:</strong> ${contactoMostrar}</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'CREAR OTRA',
        cancelButtonText: 'IR A SUCURSALES',
        allowOutsideClick: false
    });
    
    if (result.isConfirmed) {
        document.getElementById('sucursalForm').reset();
        if (document.getElementById('regionSucursal')) {
            document.getElementById('regionSucursal').selectedIndex = 0;
        }
        if (document.getElementById('estadoSucursal')) {
            document.getElementById('estadoSucursal').selectedIndex = 0;
        }
    } else {
        window.location.href = '/users/admin/sucursales/sucursales.html';
    }
}

function manejarErrorRegistro(error) {
    let errorMessage = 'Ocurrió un error al crear la sucursal';
    
    if (error.message) {
        errorMessage = error.message;
    }
    
    Swal.fire({
        icon: 'error',
        title: 'Error al crear sucursal',
        text: errorMessage,
        confirmButtonText: 'ENTENDIDO'
    });
}

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

export { initSucursalForm };